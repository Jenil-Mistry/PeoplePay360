"use server";

import { db } from "@/lib/db";
import {
  contracts,
  employees,
  departments,
  salaryStructures,
  workingSchedules,
} from "@/lib/db/schema";
import { eq, and, lte, gte, or, isNull, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessModule } from "@/lib/rbac";
import { requireReadAccess, requireWriteAccess } from "./auth-helpers";

export async function getContracts(filters?: {
  employeeId?: number | string;
  status?: "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  departmentId?: number;
}) {
  try {
    const user = await requireReadAccess("contracts");
    const canViewAll = canAccessModule(user.role, "contracts");
    const canViewOwn = canAccessModule(user.role, "contracts_own");

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

    const conditions = [];
    if (resolvedEmpId) {
      conditions.push(eq(contracts.employeeId, resolvedEmpId));
    } else if (!canViewAll) {
      // Force own contracts only if no employeeId provided and can't view all
      conditions.push(eq(contracts.employeeId, user.employeeDbId));
    }
    if (filters?.status) conditions.push(eq(contracts.status, filters.status));
    if (filters?.departmentId)
      conditions.push(eq(contracts.departmentId, filters.departmentId));

    const query = db
      .select({
        id: contracts.id,
        name: contracts.name,
        employeeId: contracts.employeeId,
        employeeName: employees.name,
        empId: employees.empId,
        departmentId: contracts.departmentId,
        departmentName: departments.name,
        jobPosition: contracts.jobPosition,
        workingScheduleId: contracts.workingScheduleId,
        scheduleName: workingSchedules.name,
        salaryStructureId: contracts.salaryStructureId,
        structureName: salaryStructures.name,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        wage: contracts.wage,
        status: contracts.status,
        createdAt: contracts.createdAt,
      })
      .from(contracts)
      .leftJoin(employees, eq(contracts.employeeId, employees.id))
      .leftJoin(departments, eq(contracts.departmentId, departments.id))
      .leftJoin(
        salaryStructures,
        eq(contracts.salaryStructureId, salaryStructures.id),
      )
      .leftJoin(
        workingSchedules,
        eq(contracts.workingScheduleId, workingSchedules.id),
      )
      .orderBy(desc(contracts.id));

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  } catch (error) {
    console.error("Failed to get contracts:", error);
    throw new Error("Unable to fetch contracts.");
  }
}

export async function getActiveContractForPeriod(
  employeeId: number,
  periodStart: string,
  periodEnd: string,
) {
  try {
    const user = await requireReadAccess("contracts");

    const canViewAll = canAccessModule(user.role, "contracts");
    const canViewOwn = canAccessModule(user.role, "contracts_own");

    if (
      !canViewAll &&
      (!canViewOwn || user.employeeDbId !== employeeId)
    ) {
      throw new Error("Forbidden: Insufficient permissions");
    }

    const result = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.employeeId, employeeId),
          eq(contracts.status, "ACTIVE"),
          lte(contracts.startDate, periodEnd),
          or(isNull(contracts.endDate), gte(contracts.endDate, periodStart)),
        ),
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error(
      `Failed to get active contract for employee ${employeeId}:`,
      error,
    );
    return null;
  }
}

export async function createContract(data: {
  employeeId: number | string;
  name?: string;
  refCode?: string;
  departmentId?: number;
  jobPosition?: string;
  workingScheduleId?: number;
  startDate: string;
  endDate?: string | null;
  wage: string | number;
  status?:
    | "DRAFT"
    | "ACTIVE"
    | "EXPIRED"
    | "CANCELLED"
    | "Running"
    | "Draft"
    | "Expired";
  salaryStructureId?: number | string;
  structureId?: string;
}) {
  try {
    const user = await requireWriteAccess("contracts");

    // 1. Resolve employee DB ID
    let resolvedEmpId: number;
    let empRecord;
    if (typeof data.employeeId === "number") {
      resolvedEmpId = data.employeeId;
      [empRecord] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, resolvedEmpId));
    } else {
      [empRecord] = await db
        .select()
        .from(employees)
        .where(eq(employees.empId, data.employeeId));
      resolvedEmpId =
        empRecord?.id || parseInt(data.employeeId.replace(/\D/g, ""), 10) || 1;
    }

    if (empRecord?.role === "ADMIN") {
      throw new Error("Validation Error: Cannot create an employment contract for an ADMIN user.");
    }

    // 2. Resolve structure ID
    let resolvedStructId: number;
    const rawStruct = data.salaryStructureId || data.structureId;
    if (typeof rawStruct === "number") {
      resolvedStructId = rawStruct;
    } else if (rawStruct) {
      resolvedStructId = parseInt(rawStruct.replace(/\D/g, ""), 10);
    } else {
      throw new Error("Validation Error: Salary structure is required.");
    }
    const [structRecord] = await db.select().from(salaryStructures).where(eq(salaryStructures.id, resolvedStructId));
    if (!structRecord) throw new Error("Validation Error: Salary structure does not exist.");

    const finalDeptId = data.departmentId || empRecord?.departmentId;
    if (!finalDeptId) throw new Error("Validation Error: Department is required.");
    const [deptRecord] = await db.select().from(departments).where(eq(departments.id, finalDeptId));
    if (!deptRecord) throw new Error("Validation Error: Department does not exist.");

    const finalScheduleId = data.workingScheduleId || empRecord?.workingScheduleId;
    if (!finalScheduleId) throw new Error("Validation Error: Working schedule is required.");
    const [schedRecord] = await db.select().from(workingSchedules).where(eq(workingSchedules.id, finalScheduleId));
    if (!schedRecord) throw new Error("Validation Error: Working schedule does not exist.");

    // 3. Resolve status
    const statusMap: Record<
      string,
      "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED"
    > = {
      Running: "ACTIVE",
      ACTIVE: "ACTIVE",
      Draft: "DRAFT",
      DRAFT: "DRAFT",
      Expired: "EXPIRED",
      EXPIRED: "EXPIRED",
      Cancelled: "CANCELLED",
      CANCELLED: "CANCELLED",
    };
    const dbStatus =
      (data.status ? statusMap[data.status] : "ACTIVE") || "ACTIVE";

    // 4. Resolve name / refCode
    const contractName =
      data.refCode ||
      data.name ||
      `CON/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

    // 5. Check active contract exclusivity
    if (dbStatus === "ACTIVE" && !data.endDate) {
      const [existingActive] = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.employeeId, resolvedEmpId),
            eq(contracts.status, "ACTIVE"),
            isNull(contracts.endDate),
          ),
        );

      if (existingActive) {
        const newStartDate = new Date(data.startDate);
        const closedDate = new Date(newStartDate.getTime() - 24 * 60 * 60 * 1000);
        const closedDateStr = closedDate.toISOString().split("T")[0];
        
        await db
          .update(contracts)
          .set({ status: "EXPIRED", endDate: closedDateStr })
          .where(eq(contracts.id, existingActive.id));
      }
    }

    const wageStr =
      typeof data.wage === "number" ? data.wage.toFixed(2) : String(data.wage);

    const [newContract] = await db
      .insert(contracts)
      .values({
        employeeId: resolvedEmpId,
        name: contractName,
        departmentId: finalDeptId,
        jobPosition: data.jobPosition || empRecord?.jobPosition || "Specialist",
        workingScheduleId: finalScheduleId,
        startDate: data.startDate,
        endDate: data.endDate || null,
        wage: wageStr,
        status: dbStatus,
        salaryStructureId: resolvedStructId,
      })
      .returning();

    try {
      revalidatePath("/contracts");
      revalidatePath("/employees");
    } catch {}

    return { success: true, contract: newContract };
  } catch (error: any) {
    console.error("Failed to create contract:", error);
    return {
      success: false,
      error: error.message || "Failed to create contract",
    };
  }
}

export async function updateContract(
  id: number | string,
  data: Partial<{
    name: string;
    refCode: string;
    departmentId: number;
    jobPosition: string;
    workingScheduleId?: number;
    startDate: string;
    endDate?: string | null;
    wage: string | number;
    status:
      | "DRAFT"
      | "ACTIVE"
      | "EXPIRED"
      | "CANCELLED"
      | "Running"
      | "Draft"
      | "Expired";
    salaryStructureId: number | string;
    structureId: string;
  }>,
) {
  try {
    const user = await requireWriteAccess("contracts");

    const rawId =
      typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const updates: Record<string, any> = {};
    if (data.name || data.refCode) updates.name = data.refCode || data.name;
    if (data.departmentId !== undefined) {
      const [deptRecord] = await db.select().from(departments).where(eq(departments.id, data.departmentId));
      if (!deptRecord) throw new Error("Validation Error: Department does not exist.");
      updates.departmentId = data.departmentId;
    }
    if (data.jobPosition) updates.jobPosition = data.jobPosition;
    if (data.workingScheduleId !== undefined) {
      const [schedRecord] = await db.select().from(workingSchedules).where(eq(workingSchedules.id, data.workingScheduleId));
      if (!schedRecord) throw new Error("Validation Error: Working schedule does not exist.");
      updates.workingScheduleId = data.workingScheduleId;
    }
    if (data.startDate) updates.startDate = data.startDate;
    if (data.endDate !== undefined) updates.endDate = data.endDate;
    if (data.wage)
      updates.wage =
        typeof data.wage === "number"
          ? data.wage.toFixed(2)
          : String(data.wage);

    if (data.status) {
      const statusMap: Record<string, any> = {
        Running: "ACTIVE",
        ACTIVE: "ACTIVE",
        Draft: "DRAFT",
        DRAFT: "DRAFT",
        Expired: "EXPIRED",
        EXPIRED: "EXPIRED",
        Cancelled: "CANCELLED",
        CANCELLED: "CANCELLED",
      };
      updates.status = statusMap[data.status] || "ACTIVE";
    }

    if (data.salaryStructureId || data.structureId) {
      const rawStruct = data.salaryStructureId || data.structureId;
      const structId = typeof rawStruct === "number"
          ? rawStruct
          : parseInt(rawStruct!.replace(/\D/g, ""), 10);
      const [structRecord] = await db.select().from(salaryStructures).where(eq(salaryStructures.id, structId));
      if (!structRecord) throw new Error("Validation Error: Salary structure does not exist.");
      updates.salaryStructureId = structId;
    }

    const [updated] = await db
      .update(contracts)
      .set(updates)
      .where(eq(contracts.id, rawId))
      .returning();

    try {
      revalidatePath("/contracts");
      revalidatePath("/employees");
    } catch {}

    return { success: true, contract: updated };
  } catch (error: any) {
    console.error(`Failed to update contract ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to update contract",
    };
  }
}
