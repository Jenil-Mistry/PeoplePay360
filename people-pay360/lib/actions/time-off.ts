"use server";

import { db } from "@/lib/db";
import {
  timeOffTypes,
  timeOffAllocations,
  timeOffRequests,
  employees,
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

    // Server-side date calculation: calculate days skipping weekends
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) {
      return { success: false, error: "End date cannot be before start date." };
    }
    let calculatedDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday(0) and Saturday(6)
        calculatedDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    calculatedDays = Math.max(1, calculatedDays);
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

    const [updatedReq] = await db
      .update(timeOffRequests)
      .set({
        status: "APPROVED",
        approvedBy: currentUser.employeeDbId,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(timeOffRequests.id, rawId),
          eq(timeOffRequests.status, "PENDING") // Prevent race condition: only approve if still pending
        )
      )
      .returning();

    if (!updatedReq) {
      return { success: false, error: "Request was already processed by another user." };
    }

    if (type?.requiresAllocation) {
      let targetAllocationId = req.allocationId;

      if (!targetAllocationId) {
        const [activeAlloc] = await db
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

      if (targetAllocationId) {
        const units = parseFloat(req.requestedUnits.toString());
        await db
          .update(timeOffAllocations)
          .set({
            usedUnits: sql`${timeOffAllocations.usedUnits} + ${units}`,
          })
          .where(eq(timeOffAllocations.id, targetAllocationId));
      }
    }

    try {
      revalidatePath("/time-off/requests");
      revalidatePath("/time-off/allocations");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, request: updatedReq };
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
      .where(eq(timeOffRequests.id, rawId))
      .returning();

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
