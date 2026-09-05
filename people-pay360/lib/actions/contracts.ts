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

export async function getContracts(filters?: {
  employeeId?: number | string;
  status?: "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  departmentId?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const canViewAll = canAccessModule(session.user.role, "contracts");
    const canViewOwn = canAccessModule(session.user.role, "contracts_own");

    if (!canViewAll && !canViewOwn) {
      throw new Error("Forbidden: Insufficient permissions");
    }

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
      conditions.push(eq(contracts.employeeId, session.user.employeeDbId));
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
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const canViewAll = canAccessModule(session.user.role, "contracts");
    const canViewOwn = canAccessModule(session.user.role, "contracts_own");

    if (
      !canViewAll &&
      (!canViewOwn || session.user.employeeDbId !== employeeId)
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
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!canAccessModule(session.user.role, "contracts")) {
      throw new Error(
        "Forbidden: Insufficient permissions to create contracts",
      );
    }

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
      return { success: false, error: "Cannot create an employment contract for an ADMIN user." };
    }

    // 2. Resolve structure ID
    let resolvedStructId = 1;
    const rawStruct = data.salaryStructureId || data.structureId;
    if (typeof rawStruct === "number") {
      resolvedStructId = rawStruct;
    } else if (rawStruct) {
      resolvedStructId = parseInt(rawStruct.replace(/\D/g, ""), 10) || 1;
    }

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
        await db
          .update(contracts)
          .set({ status: "EXPIRED", endDate: data.startDate })
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
        departmentId: data.departmentId || empRecord?.departmentId || 1,
        jobPosition: data.jobPosition || empRecord?.jobPosition || "Specialist",
        workingScheduleId:
          data.workingScheduleId || empRecord?.workingScheduleId || 1,
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
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!canAccessModule(session.user.role, "contracts")) {
      throw new Error(
        "Forbidden: Insufficient permissions to modify contracts",
      );
    }

    const rawId =
      typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const updates: Record<string, any> = {};
    if (data.name || data.refCode) updates.name = data.refCode || data.name;
    if (data.departmentId) updates.departmentId = data.departmentId;
    if (data.jobPosition) updates.jobPosition = data.jobPosition;
    if (data.workingScheduleId)
      updates.workingScheduleId = data.workingScheduleId;
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
      updates.salaryStructureId =
        typeof rawStruct === "number"
          ? rawStruct
          : parseInt(rawStruct!.replace(/\D/g, ""), 10) || 1;
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
