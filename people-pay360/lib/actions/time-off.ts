"use server";

import { db } from "@/lib/db";
import {
  timeOffTypes,
  timeOffAllocations,
  timeOffRequests,
  employees,
  workingScheduleLines,
} from "@/lib/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireReadAccess, requireWriteAccess } from "./auth-helpers";
import { hasWriteAccess, hasReadAccess, canApproveTimeOff } from "@/lib/rbac";

export async function getTimeOffTypes() {
  try {
    return await db
      .select()
      .from(timeOffTypes)
      .where(eq(timeOffTypes.isActive, true));
  } catch (error) {
    console.error("Failed to get time off types:", error);
    throw new Error("Unable to fetch time off policies.");
  }
}

export async function createTimeOffType(data: {
  name: string;
  unit: "DAYS" | "HOURS";
  requiresAllocation: boolean;
  includeInPayroll: boolean;
}) {
  try {
    await requireWriteAccess("time_off_types");

    const [newType] = await db
      .insert(timeOffTypes)
      .values({
        name: data.name,
        unit: data.unit,
        requiresAllocation: data.requiresAllocation,
        includeInPayroll: data.includeInPayroll,
        isActive: true,
      })
      .returning();

    try {
      revalidatePath("/time-off/types");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, record: newType };
  } catch (error: any) {
    console.error("Failed to create time off type:", error);
    return { success: false, error: error.message || "Failed to create policy." };
  }
}

export async function updateTimeOffType(id: number | string, data: {
  name?: string;
  unit?: "DAYS" | "HOURS";
  requiresAllocation?: boolean;
  includeInPayroll?: boolean;
}) {
  try {
    await requireWriteAccess("time_off_types");

    const rawId = typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const [updated] = await db
      .update(timeOffTypes)
      .set(data)
      .where(eq(timeOffTypes.id, rawId))
      .returning();

    try {
      revalidatePath("/time-off/types");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, record: updated };
  } catch (error: any) {
    console.error("Failed to update time off type:", error);
    return { success: false, error: error.message || "Failed to update policy." };
  }
}

export async function deleteTimeOffType(id: number | string) {
  try {
    await requireWriteAccess("time_off_types");

    const rawId = typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    // Soft delete
    const [deleted] = await db
      .update(timeOffTypes)
      .set({ isActive: false })
      .where(eq(timeOffTypes.id, rawId))
      .returning();

    try {
      revalidatePath("/time-off/types");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, record: deleted };
  } catch (error: any) {
    console.error("Failed to delete time off type:", error);
    return { success: false, error: error.message || "Failed to delete policy." };
  }
}

export async function getTimeOffAllocations(employeeId?: number | string) {
  try {
    const currentUser = await requireReadAccess("time_off_own");
    
    let resolvedEmpId: number | undefined;
    if (employeeId) {
      if (typeof employeeId === "number") {
        resolvedEmpId = employeeId;
      } else {
        const [emp] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, employeeId));
        resolvedEmpId = emp?.id || parseInt(employeeId.replace(/\D/g, ""), 10);
      }
    }

    // RBAC: Users without global read access can only see their own allocations
    if (!hasReadAccess(currentUser.role, "time_off_allocations")) {
      resolvedEmpId = currentUser.employeeDbId;
    }

    const query = db
      .select({
        id: timeOffAllocations.id,
        employeeId: timeOffAllocations.employeeId,
        employeeName: employees.name,
        empId: employees.empId,
        timeOffTypeId: timeOffAllocations.timeOffTypeId,
        timeOffTypeName: timeOffTypes.name,
        unit: timeOffTypes.unit,
        allocatedUnits: timeOffAllocations.allocatedUnits,
        usedUnits: timeOffAllocations.usedUnits,
        status: timeOffAllocations.status,
        validFrom: timeOffAllocations.validFrom,
        validTo: timeOffAllocations.validTo,
        approvedBy: timeOffAllocations.approvedBy,
        approvedAt: timeOffAllocations.approvedAt,
      })
      .from(timeOffAllocations)
      .leftJoin(employees, eq(timeOffAllocations.employeeId, employees.id))
      .leftJoin(
        timeOffTypes,
        eq(timeOffAllocations.timeOffTypeId, timeOffTypes.id),
      )
      .orderBy(desc(timeOffAllocations.validFrom));

    if (resolvedEmpId) {
      return await query.where(
        eq(timeOffAllocations.employeeId, resolvedEmpId),
      );
    }

    return await query;
  } catch (error) {
    console.error("Failed to get time off allocations:", error);
    throw new Error("Unable to fetch allocations.");
  }
}

export async function createTimeOffAllocation(data: {
  employeeId: number | string;
  timeOffTypeId?: number | string;
  typeId?: string;
  allocatedUnits?: string | number;
  allocatedDays?: number;
  validFrom?: string;
  validTo?: string;
  validityYear?: string;
  approvedBy?: number;
}) {
  try {
    const currentUser = await requireWriteAccess("time_off_allocations");

    let resolvedEmpId: number;
    if (typeof data.employeeId === "number") {
      resolvedEmpId = data.employeeId;
    } else {
      const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.empId, data.employeeId));
      if (!emp) return { success: false, error: "Employee not found" };
      resolvedEmpId = emp.id;
    }

    let resolvedTypeId = 1;
    const rawType = data.timeOffTypeId || data.typeId;
    if (typeof rawType === "number") {
      resolvedTypeId = rawType;
    } else if (rawType) {
      resolvedTypeId = parseInt(rawType.replace(/\D/g, ""), 10) || 1;
    }

    const units =
      data.allocatedDays !== undefined
        ? data.allocatedDays.toFixed(2)
        : typeof data.allocatedUnits === "number"
          ? data.allocatedUnits.toFixed(2)
          : data.allocatedUnits || "15.00";
    const year = data.validityYear || new Date().getFullYear().toString();
    const validFrom = data.validFrom || `${year}-01-01`;
    const validTo = data.validTo || `${year}-12-31`;

    const [newAlloc] = await db
      .insert(timeOffAllocations)
      .values({
        employeeId: resolvedEmpId,
        timeOffTypeId: resolvedTypeId,
        allocatedUnits: units,
        usedUnits: "0.00",
        status: "APPROVED",
        validFrom,
        validTo,
      })
      .returning();

    try {
      revalidatePath("/time-off/allocations");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, allocation: newAlloc };
  } catch (error: any) {
    console.error("Failed to create allocation:", error);
    return {
      success: false,
      error: error.message || "Failed to grant allocation",
    };
  }
}

export async function getTimeOffRequests(filters?: {
  employeeId?: number | string;
  status?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}) {
  try {
    const currentUser = await requireReadAccess("time_off_own");
    
    let resolvedEmpId: number | undefined;
    if (filters?.employeeId) {
      if (typeof filters.employeeId === "number") {
        resolvedEmpId = filters.employeeId;
      } else {
        const [emp] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, filters.employeeId));
        resolvedEmpId =
          emp?.id || parseInt(filters.employeeId.replace(/\D/g, ""), 10);
      }
    }
    
    // RBAC: Users without global read access can only see their own requests
    if (!hasReadAccess(currentUser.role, "time_off_approve")) {
      resolvedEmpId = currentUser.employeeDbId;
    }

    const conditions = [];

    if (resolvedEmpId) {
      conditions.push(eq(timeOffRequests.employeeId, resolvedEmpId));
    }
    if (filters?.status) {
      conditions.push(eq(timeOffRequests.status, filters.status));
    }

    const query = db
      .select({
        id: timeOffRequests.id,
        employeeId: timeOffRequests.employeeId,
        employeeName: employees.name,
        empId: employees.empId,
        timeOffTypeId: timeOffRequests.timeOffTypeId,
        timeOffTypeName: timeOffTypes.name,
        startDate: timeOffRequests.startDate,
        endDate: timeOffRequests.endDate,
        requestedUnits: timeOffRequests.requestedUnits,
        status: timeOffRequests.status,
        allocationId: timeOffRequests.allocationId,
        approvedBy: timeOffRequests.approvedBy,
        approvedByName: employees.name,
        approvedAt: timeOffRequests.approvedAt,
        notes: timeOffRequests.notes,
      })
      .from(timeOffRequests)
      .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .leftJoin(
        timeOffTypes,
        eq(timeOffRequests.timeOffTypeId, timeOffTypes.id),
      )
      .orderBy(desc(timeOffRequests.startDate));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  } catch (error) {
    console.error("Failed to get time off requests:", error);
    throw new Error("Unable to fetch leave requests.");
  }
}

export async function createTimeOffRequest(data: {
  employeeId: number | string;
  timeOffTypeId?: number | string;
  typeId?: string;
  startDate: string;
  endDate: string;
  requestedUnits?: string | number;
  durationDays?: number;
  notes?: string;
  reason?: string;
  allocationId?: number | string;
}) {
  try {
    const currentUser = await requireWriteAccess("time_off_own");

    let resolvedEmpId: number;
    if (typeof data.employeeId === "number") {
      resolvedEmpId = data.employeeId;
    } else {
      const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.empId, data.employeeId));
      if (!emp) return { success: false, error: "Employee not found" };
      resolvedEmpId = emp.id;
    }

    // Role check: Only HR/Admin can create requests for other employees
    if (resolvedEmpId !== currentUser.employeeDbId && currentUser.role !== "HR_MANAGER" && currentUser.role !== "ADMIN") {
      return { success: false, error: "You are not authorized to create requests for other employees." };
    }

    let resolvedTypeId = 1;
    const rawType = data.timeOffTypeId || data.typeId;
    if (typeof rawType === "number") {
      resolvedTypeId = rawType;
    } else if (rawType) {
      resolvedTypeId = parseInt(rawType.replace(/\D/g, ""), 10) || 1;
    }

    let resolvedAllocId: number | null = null;
    if (data.allocationId) {
      resolvedAllocId =
        typeof data.allocationId === "number"
          ? data.allocationId
          : parseInt(data.allocationId.replace(/\D/g, ""), 10) || null;
    }

    // Server-side date calculation: calculate days skipping off-days based on schedule
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      return { success: false, error: "End date cannot be before start date." };
    }

    // Block overlapping requests
    const overlapping = await db
      .select({ id: timeOffRequests.id })
      .from(timeOffRequests)
      .where(
        and(
          eq(timeOffRequests.employeeId, resolvedEmpId),
          inArray(timeOffRequests.status, ["PENDING", "APPROVED"]),
          sql`(${timeOffRequests.startDate} <= ${data.endDate} AND ${timeOffRequests.endDate} >= ${data.startDate})`
        )
      );
    if (overlapping.length > 0) {
      return { success: false, error: "You already have a pending or approved request during this period." };
    }

    const workingDays = new Set([1, 2, 3, 4, 5]); // Default Mon-Fri
    const [empRecord] = await db.select({ workingScheduleId: employees.workingScheduleId }).from(employees).where(eq(employees.id, resolvedEmpId));
    if (empRecord?.workingScheduleId) {
      const scheduleLines = await db.select().from(workingScheduleLines).where(eq(workingScheduleLines.scheduleId, empRecord.workingScheduleId));
      if (scheduleLines.length > 0) {
        workingDays.clear();
        const map = { "SUN": 0, "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6 };
        scheduleLines.forEach(line => {
          if (line.dayOfWeek in map) workingDays.add(map[line.dayOfWeek as keyof typeof map]);
        });
      }
    }

    let calculatedDays = 0;
    const current = new Date(start);
    while (current <= end) {
      if (workingDays.has(current.getDay())) {
        calculatedDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    calculatedDays = Math.max(1, calculatedDays); // If someone requests a weekend only, count as 1 to avoid 0 unit deduction
    const units = calculatedDays.toFixed(2);
    const notes = data.reason || data.notes || "Leave request";

    const [request] = await db
      .insert(timeOffRequests)
      .values({
        employeeId: resolvedEmpId,
        timeOffTypeId: resolvedTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        requestedUnits: units,
        status: "PENDING",
        allocationId: resolvedAllocId,
        notes,
      })
      .returning();

    try {
      revalidatePath("/time-off/requests");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, request };
  } catch (error: any) {
    console.error("Failed to create time off request:", error);
    return {
      success: false,
      error: error.message || "Failed to create leave request",
    };
  }
}

/**
 * Approves a Time Off Request and automatically decrements the employee's allocation balance (Spec A4 & B4).
 */
export async function approveTimeOffRequest(requestId: number | string) {
  try {
    // Require HR/Admin role to approve
    const currentUser = await requireWriteAccess("time_off_approve");

    const rawId = typeof requestId === "string" ? parseInt(requestId.replace(/\D/g, ""), 10) : requestId;

    const [req] = await db
      .select({
        id: timeOffRequests.id,
        employeeId: timeOffRequests.employeeId,
        timeOffTypeId: timeOffRequests.timeOffTypeId,
        requestedUnits: timeOffRequests.requestedUnits,
        allocationId: timeOffRequests.allocationId,
        status: timeOffRequests.status,
        requesterRole: employees.role,
      })
      .from(timeOffRequests)
      .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .where(eq(timeOffRequests.id, rawId));

    if (!req) return { success: false, error: "Leave request not found" };
    if (req.status === "APPROVED") return { success: true, message: "Request already approved" };
    if (req.status === "REJECTED") return { success: false, error: "Cannot approve a rejected request" };

    if (!canApproveTimeOff(currentUser.role, req.requesterRole || "EMPLOYEE", currentUser.employeeDbId === req.employeeId)) {
      return { success: false, error: "You are not authorized to approve this request." };
    }

    const [type] = await db
      .select()
      .from(timeOffTypes)
      .where(eq(timeOffTypes.id, req.timeOffTypeId));

    const result = await db.transaction(async (tx) => {
      let targetAllocationId = req.allocationId;

      if (type?.requiresAllocation) {
        if (!targetAllocationId) {
          const [activeAlloc] = await tx
            .select()
            .from(timeOffAllocations)
            .where(
              and(
                eq(timeOffAllocations.employeeId, req.employeeId),
                eq(timeOffAllocations.timeOffTypeId, req.timeOffTypeId),
                eq(timeOffAllocations.status, "APPROVED"),
              ),
            )
            .limit(1);

          targetAllocationId = activeAlloc?.id;
        }

        if (!targetAllocationId) {
          throw new Error("No active allocation found to deduct balance from.");
        }

        // Verify balance
        const [allocCheck] = await tx
          .select({ allocated: timeOffAllocations.allocatedUnits, used: timeOffAllocations.usedUnits })
          .from(timeOffAllocations)
          .where(eq(timeOffAllocations.id, targetAllocationId));
          
        const available = parseFloat(allocCheck.allocated.toString()) - parseFloat(allocCheck.used.toString());
        const needed = parseFloat(req.requestedUnits.toString());
        if (available < needed) {
          throw new Error(`Insufficient balance. Needed: ${needed}, Available: ${available}`);
        }

        await tx
          .update(timeOffAllocations)
          .set({
            usedUnits: sql`${timeOffAllocations.usedUnits} + ${needed}`,
          })
          .where(eq(timeOffAllocations.id, targetAllocationId));
      }

      const [updatedReq] = await tx
        .update(timeOffRequests)
        .set({
          status: "APPROVED",
          approvedBy: currentUser.employeeDbId,
          approvedAt: new Date(),
          allocationId: targetAllocationId,
        })
        .where(
          and(
            eq(timeOffRequests.id, rawId),
            eq(timeOffRequests.status, "PENDING") // Prevent race condition
          )
        )
        .returning();

      if (!updatedReq) {
        throw new Error("Request was already processed by another user.");
      }
      
      return updatedReq;
    });

    try {
      revalidatePath("/time-off/requests");
      revalidatePath("/time-off/allocations");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, request: result };
  } catch (error: any) {
    console.error(`Failed to approve leave request ${requestId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to approve request",
    };
  }
}

export async function refuseTimeOffRequest(requestId: number | string) {
  try {
    // Require HR/Admin role to refuse
    const currentUser = await requireWriteAccess("time_off_approve");

    const rawId = typeof requestId === "string" ? parseInt(requestId.replace(/\D/g, ""), 10) : requestId;

    const [req] = await db
      .select({
        employeeId: timeOffRequests.employeeId,
        requesterRole: employees.role,
      })
      .from(timeOffRequests)
      .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .where(eq(timeOffRequests.id, rawId));

    if (!req) return { success: false, error: "Leave request not found" };

    if (!canApproveTimeOff(currentUser.role, req.requesterRole || "EMPLOYEE", currentUser.employeeDbId === req.employeeId)) {
      return { success: false, error: "You are not authorized to refuse this request." };
    }

    const [updatedReq] = await db
      .update(timeOffRequests)
      .set({
        status: "REJECTED",
        approvedBy: currentUser.employeeDbId,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(timeOffRequests.id, rawId),
          eq(timeOffRequests.status, "PENDING")
        )
      )
      .returning();
      
    if (!updatedReq) {
      return { success: false, error: "Request is no longer pending or cannot be found." };
    }

    try {
      revalidatePath("/time-off/requests");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, request: updatedReq };
  } catch (error: any) {
    console.error(`Failed to refuse leave request ${requestId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to refuse request",
    };
  }
}
