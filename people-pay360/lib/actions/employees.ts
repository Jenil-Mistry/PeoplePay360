"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  contracts,
  attendance,
  timeOffRequests,
  timeOffAllocations,
  workingSchedules,
  salaryStructures,
} from "@/lib/db/schema";
import { eq, and, like, or, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/rbac";
import { requireReadAccess, requireWriteAccess } from "./auth-helpers";

export async function getEmployees(filters?: {
  departmentId?: number;
  employeeType?: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
  search?: string;
}) {
  try {
    const user = await requireReadAccess("employees");
    
    // For "employees_own" we'll filter in the query if they don't have global access
    const canViewAll = canAccessModule(user.role, "employees");

    const conditions = [];

    if (!canViewAll) {
      conditions.push(eq(employees.id, user.employeeDbId));
    }

    if (filters?.departmentId) {
      conditions.push(eq(employees.departmentId, filters.departmentId));
    }
    if (filters?.employeeType) {
      conditions.push(eq(employees.employeeType, filters.employeeType));
    }
    if (filters?.search && filters.search.trim() !== "") {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`lower(${employees.name})`, q),
          like(sql`lower(${employees.email})`, q),
          like(sql`lower(${employees.empId})`, q),
          like(sql`lower(${employees.jobPosition})`, q),
        ),
      );
    }

    const query = db
      .select({
        id: employees.id,
        empId: employees.empId,
        name: employees.name,
        email: employees.email,
        role: employees.role,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        jobPosition: employees.jobPosition,
        managerId: employees.managerId,
        employeeType: employees.employeeType,
        workingScheduleId: employees.workingScheduleId,
        scheduleName: workingSchedules.name,
        bankAccountNumber: employees.bankAccountNumber,
        bankName: employees.bankName,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        workingSchedules,
        eq(employees.workingScheduleId, workingSchedules.id),
      )
      .orderBy(desc(employees.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  } catch (error) {
    console.error("Failed to get employees:", error);
    throw new Error("Unable to fetch employees.");
  }
}

export async function getEmployeeById(id: number | string) {
  try {
    const user = await requireReadAccess("employees");

    // Check basic access
    const canViewAll = canAccessModule(user.role, "employees");
    const canViewOwn = canAccessModule(user.role, "employees_own");

    let condition;
    if (!canViewAll) {
      // Must only query their own ID
      condition = eq(employees.id, user.employeeDbId);
      // Validate that the requested ID matches their own
      if (typeof id === "number" && id !== user.employeeDbId) {
        throw new Error("Forbidden: Insufficient permissions");
      }
      if (typeof id === "string" && id !== user.id && parseInt(id.replace(/\D/g, ""), 10) !== user.employeeDbId) {
        throw new Error("Forbidden: Insufficient permissions");
      }
    } else {
      if (typeof id === "number") {
        condition = eq(employees.id, id);
      } else {
        const parsed = parseInt(id.replace(/\D/g, ""), 10);
        condition = or(
          eq(employees.empId, id),
          !isNaN(parsed) ? eq(employees.id, parsed) : undefined,
        );
      }
    }

    const [emp] = await db
      .select({
        id: employees.id,
        empId: employees.empId,
        name: employees.name,
        email: employees.email,
        role: employees.role,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        jobPosition: employees.jobPosition,
        managerId: employees.managerId,
        employeeType: employees.employeeType,
        workingScheduleId: employees.workingScheduleId,
        scheduleName: workingSchedules.name,
        bankAccountNumber: employees.bankAccountNumber,
        bankName: employees.bankName,
        isActive: employees.isActive,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        workingSchedules,
        eq(employees.workingScheduleId, workingSchedules.id),
      )
      .where(condition);

    return emp || null;
  } catch (error) {
    console.error(`Failed to get employee ${id}:`, error);
    throw new Error("Unable to fetch employee details.");
  }
}

export async function getEmployeeSmartCounts(employeeId: number | string) {
  try {
    const user = await requireReadAccess("employees");
    const canViewAll = canAccessModule(user.role, "employees");

    let numericId: number;
    if (!canViewAll) {
      numericId = user.employeeDbId;
      if (typeof employeeId === "number" && employeeId !== user.employeeDbId) {
        throw new Error("Forbidden: Insufficient permissions");
      }
      if (typeof employeeId === "string" && employeeId !== user.id && parseInt(employeeId.replace(/\D/g, ""), 10) !== user.employeeDbId) {
        throw new Error("Forbidden: Insufficient permissions");
      }
    } else {
      if (typeof employeeId === "number") {
        numericId = employeeId;
      } else {
        const [emp] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, employeeId));
        numericId = emp?.id || parseInt(employeeId.replace(/\D/g, ""), 10) || 1;
      }
    }

    const [contractCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(contracts)
      .where(eq(contracts.employeeId, numericId));

    const [attendanceCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(attendance)
      .where(eq(attendance.employeeId, numericId));

    const [timeOffCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(timeOffRequests)
      .where(eq(timeOffRequests.employeeId, numericId));

    const [allocationCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(timeOffAllocations)
      .where(eq(timeOffAllocations.employeeId, numericId));

    return {
      contractsCount: contractCount?.count || 0,
      attendanceCount: attendanceCount?.count || 0,
      timeOffCount: timeOffCount?.count || 0,
      allocationCount: allocationCount?.count || 0,
    };
  } catch (error) {
    console.error(
      `Failed to get smart counts for employee ${employeeId}:`,
      error,
    );
    return {
      contractsCount: 0,
      attendanceCount: 0,
      timeOffCount: 0,
      allocationCount: 0,
    };
  }
}

export async function createEmployee(data: {
  empId?: string;
  name: string;
  email?: string;
  workEmail?: string;
  role?:
    | "EMPLOYEE"
    | "HR_MANAGER"
    | "PAYROLL_USER"
    | "PAYROLL_MANAGER"
    | "ADMIN";
  departmentId?: number;
  department?: string;
  jobPosition: string;
  managerId?: number | string;
  employeeType?: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
  workingScheduleId?: number;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
}) {
  try {
    const user = await requireWriteAccess("employees");

    if (data.role && user.role !== "ADMIN") {
      throw new Error("Forbidden: Only ADMIN can assign roles.");
    }

    const allDepts = await db.select().from(departments);
    let resolvedDeptId = data.departmentId;

    if (!resolvedDeptId && data.department) {
      const match = allDepts.find(
        (d) => d.name.toLowerCase() === data.department?.toLowerCase(),
      );
      resolvedDeptId = match ? match.id : undefined;
    }

    if (!resolvedDeptId) {
      throw new Error("Validation Error: Department is required and must be valid.");
    }

    const allSchedules = await db.select().from(workingSchedules);
    let resolvedScheduleId = data.workingScheduleId;
    if (!resolvedScheduleId || !allSchedules.some(s => s.id === resolvedScheduleId)) {
      resolvedScheduleId = allSchedules[0]?.id || 1;
    }

    const email =
      data.workEmail ||
      data.email ||
      `${data.name.toLowerCase().replace(/\s+/g, ".")}@oxp.com`;
    const empId = data.empId || `EMP-${Date.now().toString().slice(-4)}`;

    const bankAccountNumber =
      data.bankDetails?.accountNumber || data.bankAccountNumber || null;
    const bankName =
      data.bankDetails?.bankName ||
      data.bankName ||
      (bankAccountNumber ? "HDFC Bank" : null);

    let resolvedMgrId: number | null = null;
    if (data.managerId) {
      if (typeof data.managerId === "number") resolvedMgrId = data.managerId;
      else {
        const [mgr] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, data.managerId));
        resolvedMgrId =
          mgr?.id || parseInt(data.managerId.replace(/\D/g, ""), 10) || null;
      }
    }

    const [newEmployee] = await db
      .insert(employees)
      .values({
        empId,
        name: data.name,
        email,
        role: data.role || "EMPLOYEE",
        departmentId: resolvedDeptId,
        jobPosition: data.jobPosition || "Specialist",
        managerId: resolvedMgrId,
        employeeType: data.employeeType || "FULL_TIME",
        workingScheduleId: resolvedScheduleId,
        bankAccountNumber,
        bankName,
        isActive: true,
      })
      .returning();

    try {
      revalidatePath("/employees");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, employee: newEmployee };
  } catch (error: any) {
    console.error("Failed to create employee:", error);
    return {
      success: false,
      error: error.message || "Failed to create employee",
    };
  }
}

export async function updateEmployee(
  id: number | string,
  data: Partial<{
    name: string;
    email: string;
    workEmail: string;
    role:
      | "EMPLOYEE"
      | "HR_MANAGER"
      | "PAYROLL_USER"
      | "PAYROLL_MANAGER"
      | "ADMIN";
    departmentId: number;
    department: string;
    jobPosition: string;
    managerId?: number | string;
    employeeType: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
    workingScheduleId?: number;
    bankAccountNumber: string;
    bankName: string;
    bankDetails: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
    };
    status: "Active" | "Inactive";
    isActive: boolean;
  }>,
) {
  try {
    const user = await requireWriteAccess("employees");

    if (data.role && user.role !== "ADMIN") {
      throw new Error("Forbidden: Only ADMIN can update roles.");
    }

    let condition;
    if (typeof id === "number") {
      condition = eq(employees.id, id);
    } else {
      const parsed = parseInt(id.replace(/\D/g, ""), 10);
      condition = or(
        eq(employees.empId, id),
        !isNaN(parsed) ? eq(employees.id, parsed) : undefined,
      );
    }

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (data.name) updates.name = data.name;
    if (data.workEmail || data.email)
      updates.email = data.workEmail || data.email;
    if (data.role) updates.role = data.role;
    if (data.jobPosition) updates.jobPosition = data.jobPosition;
    if (data.employeeType) updates.employeeType = data.employeeType;
    if (data.status) updates.isActive = data.status === "Active";
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    if (data.managerId !== undefined) {
      if (typeof data.managerId === "number") {
        updates.managerId = data.managerId;
      } else if (data.managerId) {
        const [mgr] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, data.managerId));
        updates.managerId =
          mgr?.id || parseInt(data.managerId.replace(/\D/g, ""), 10) || null;
      } else {
        updates.managerId = null;
      }
    }

    if (data.department) {
      const allDepts = await db.select().from(departments);
      const match = allDepts.find(
        (d) => d.name.toLowerCase() === data.department?.toLowerCase(),
      );
      if (match) {
        updates.departmentId = match.id;
      } else {
        throw new Error("Validation Error: Department does not exist.");
      }
    } else if (data.departmentId !== undefined) {
      const [dept] = await db.select().from(departments).where(eq(departments.id, data.departmentId));
      if (!dept) throw new Error("Validation Error: Department does not exist.");
      updates.departmentId = data.departmentId;
    }

    if (data.workingScheduleId !== undefined) {
      const [sched] = await db.select().from(workingSchedules).where(eq(workingSchedules.id, data.workingScheduleId));
      if (!sched) throw new Error("Validation Error: Working schedule does not exist.");
      updates.workingScheduleId = data.workingScheduleId;
    }

    if (data.bankDetails) {
      updates.bankAccountNumber = data.bankDetails.accountNumber || null;
      updates.bankName = data.bankDetails.bankName || null;
    } else {
      if (data.bankAccountNumber !== undefined)
        updates.bankAccountNumber = data.bankAccountNumber || null;
      if (data.bankName !== undefined) updates.bankName = data.bankName || null;
    }

    const [updated] = await db
      .update(employees)
      .set(updates)
      .where(condition)
      .returning();

    try {
      revalidatePath("/employees");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, employee: updated };
  } catch (error: any) {
    console.error(`Failed to update employee ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to update employee",
    };
  }
}

export async function deleteEmployee(id: number | string) {
  try {
    const user = await requireWriteAccess("employees");

    let condition;
    if (typeof id === "number") {
      condition = eq(employees.id, id);
    } else {
      const parsed = parseInt(id.replace(/\D/g, ""), 10);
      condition = or(
        eq(employees.empId, id),
        !isNaN(parsed) ? eq(employees.id, parsed) : undefined,
      );
    }

    // Soft-delete by setting isActive to false to protect payroll history (Spec A1)
    const [updated] = await db
      .update(employees)
      .set({ isActive: false, updatedAt: new Date() })
      .where(condition)
      .returning();

    try {
      revalidatePath("/employees");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, employee: updated };
  } catch (error: any) {
    console.error(`Failed to delete employee ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to delete employee",
    };
  }
}
