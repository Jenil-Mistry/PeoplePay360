"use server";

import { db } from "@/lib/db";
import {
  payruns,
  payslips,
  payslipLines,
  payslipWarnings,
  salaryStructures,
  salaryRules,
  employees,
  contracts,
  departments,
  attendance,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeEmployeePayroll } from "@/lib/payroll-server-engine";
import { getActiveContractForPeriod } from "./contracts";
import { requireWriteAccess, requireReadAccess } from "./auth-helpers";
import { canAccessModule } from "@/lib/rbac";

export async function getSalaryStructures() {
  try {
    await requireReadAccess("payroll_structures_rules");
    const structures = await db.select().from(salaryStructures);
    const rules = await db.select().from(salaryRules);

    return structures.map((s) => ({
      ...s,
      rulesCount: rules.filter((r) => r.structureId === s.id).length,
    }));
  } catch (error) {
    console.error("Failed to get salary structures:", error);
    throw new Error("Unable to fetch salary structures.");
  }
}

export async function createSalaryStructure(data: {
  name: string;
  notes?: string;
}) {
  try {
    await requireWriteAccess("payroll_structures_rules");
    const [struct] = await db
      .insert(salaryStructures)
      .values({
        name: data.name,
        isActive: true,
      })
      .returning();

    try {
      revalidatePath("/payroll/structures");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, structure: struct };
  } catch (error: any) {
    console.error("Failed to create salary structure:", error);
    return {
      success: false,
      error: error.message || "Failed to create structure",
    };
  }
}

export async function getSalaryRules(structureId?: number | string) {
  try {
    await requireReadAccess("payroll_structures_rules");
    const rawId =
      typeof structureId === "string"
        ? parseInt(structureId.replace(/\D/g, ""), 10)
        : structureId;
    const query = db.select().from(salaryRules).orderBy(salaryRules.sequence);
    if (rawId) {
      return await query.where(eq(salaryRules.structureId, rawId));
    }
    return await query;
  } catch (error) {
    console.error("Failed to get salary rules:", error);
    throw new Error("Unable to fetch salary rules.");
  }
}

export async function createSalaryRule(data: {
  structureId?: number | string;
  name: string;
  code: string;
  category:
    | "BASIC"
    | "ALLOWANCE"
    | "GROSS"
    | "DEDUCTION"
    | "NET"
    | "Basic"
    | "Allowance"
    | "Gross"
    | "Deduction"
    | "Net";
  sequence: number;
  computationType:
    | "FIXED"
    | "PERCENTAGE"
    | "FORMULA"
    | "fixed"
    | "percentage"
    | "formula";
  amount?: number | string;
  fixedAmount?: number;
  percentage?: number | string;
  baseCode?: string;
  formula?: string;
}) {
  try {
    await requireWriteAccess("payroll_structures_rules");
    let resolvedStructId = 1;
    if (data.structureId) {
      resolvedStructId =
        typeof data.structureId === "number"
          ? data.structureId
          : parseInt(data.structureId.replace(/\D/g, ""), 10) || 1;
    }

    const catMap: Record<
      string,
      "BASIC" | "ALLOWANCE" | "GROSS" | "DEDUCTION" | "NET"
    > = {
      Basic: "BASIC",
      BASIC: "BASIC",
      Allowance: "ALLOWANCE",
      ALLOWANCE: "ALLOWANCE",
      Gross: "GROSS",
      GROSS: "GROSS",
      Deduction: "DEDUCTION",
      DEDUCTION: "DEDUCTION",
      Net: "NET",
      NET: "NET",
    };
    const dbCat = catMap[data.category] || "ALLOWANCE";

    const compMap: Record<string, "FIXED" | "PERCENTAGE" | "FORMULA"> = {
      fixed: "FIXED",
      FIXED: "FIXED",
      percentage: "PERCENTAGE",
      PERCENTAGE: "PERCENTAGE",
      formula: "FORMULA",
      FORMULA: "FORMULA",
    };
    const dbComp = compMap[data.computationType] || "FIXED";

    const amountVal =
      data.fixedAmount !== undefined
        ? data.fixedAmount.toFixed(2)
        : data.amount !== undefined
          ? typeof data.amount === "number"
            ? data.amount.toFixed(2)
            : String(data.amount)
          : null;
    const pctVal =
      data.percentage !== undefined
        ? typeof data.percentage === "number"
          ? data.percentage.toFixed(2)
          : String(data.percentage)
        : null;

    const [rule] = await db
      .insert(salaryRules)
      .values({
        structureId: resolvedStructId,
        name: data.name,
        code: data.code.toUpperCase(),
        category: dbCat,
        sequence: data.sequence,
        computationType: dbComp,
        amount: amountVal,
        percentage: pctVal,
        baseCode: data.baseCode || null,
        formula: data.formula || null,
        isActive: true,
      })
      .returning();

    try {
      revalidatePath("/payroll/rules");
      revalidatePath("/payroll/structures");
    } catch {}

    return { success: true, rule };
  } catch (error: any) {
    console.error("Failed to create salary rule:", error);
    return { success: false, error: error.message || "Failed to create rule" };
  }
}

export async function updateSalaryRule(
  id: number | string,
  data: Partial<{
    name: string;
    code: string;
    category:
      | "BASIC"
      | "ALLOWANCE"
      | "GROSS"
      | "DEDUCTION"
      | "NET"
      | "Basic"
      | "Allowance"
      | "Gross"
      | "Deduction"
      | "Net";
    sequence: number;
    computationType:
      | "FIXED"
      | "PERCENTAGE"
      | "FORMULA"
      | "fixed"
      | "percentage"
      | "formula";
    amount: number | string;
    fixedAmount: number;
    percentage: number | string;
    baseCode: string;
    formula: string;
    isActive: boolean;
  }>,
) {
  try {
    await requireWriteAccess("payroll_structures_rules");
    const rawId =
      typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const updates: Record<string, any> = {};
    if (data.name) updates.name = data.name;
    if (data.code) updates.code = data.code.toUpperCase();
    if (data.sequence !== undefined) updates.sequence = data.sequence;
    if (data.baseCode !== undefined) updates.baseCode = data.baseCode || null;
    if (data.formula !== undefined) updates.formula = data.formula || null;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    if (data.category) {
      const catMap: Record<string, any> = {
        Basic: "BASIC",
        BASIC: "BASIC",
        Allowance: "ALLOWANCE",
        ALLOWANCE: "ALLOWANCE",
        Gross: "GROSS",
        GROSS: "GROSS",
        Deduction: "DEDUCTION",
        DEDUCTION: "DEDUCTION",
        Net: "NET",
        NET: "NET",
      };
      updates.category = catMap[data.category] || "ALLOWANCE";
    }

    if (data.computationType) {
      const compMap: Record<string, any> = {
        fixed: "FIXED",
        FIXED: "FIXED",
        percentage: "PERCENTAGE",
        PERCENTAGE: "PERCENTAGE",
        formula: "FORMULA",
        FORMULA: "FORMULA",
      };
      updates.computationType = compMap[data.computationType] || "FIXED";
    }

    if (data.fixedAmount !== undefined)
      updates.amount = data.fixedAmount.toFixed(2);
    else if (data.amount !== undefined)
      updates.amount =
        typeof data.amount === "number"
          ? data.amount.toFixed(2)
          : String(data.amount);

    if (data.percentage !== undefined)
      updates.percentage =
        typeof data.percentage === "number"
          ? data.percentage.toFixed(2)
          : String(data.percentage);

    const [updated] = await db
      .update(salaryRules)
      .set(updates)
      .where(eq(salaryRules.id, rawId))
      .returning();

    try {
      revalidatePath("/payroll/rules");
      revalidatePath("/payroll/structures");
    } catch {}

    return { success: true, rule: updated };
  } catch (error: any) {
    console.error(`Failed to update salary rule ${id}:`, error);
    return { success: false, error: error.message || "Failed to update rule" };
  }
}

/**
 * Step 2 of Payrun Wizard: Filters employees with active running contracts during the period (Spec B5)
 */
export async function getEligibleEmployeesForPayrun(
  periodStart: string,
  periodEnd: string,
) {
  try {
    await requireReadAccess("payroll_create_compute");
    const eligible = await db
      .select({
        id: employees.id,
        empId: employees.empId,
        name: employees.name,
        email: employees.email,
        departmentName: departments.name,
        jobPosition: employees.jobPosition,
        contractId: contracts.id,
        wage: contracts.wage,
        structureId: contracts.salaryStructureId,
        structureName: salaryStructures.name,
        bankAccountNumber: employees.bankAccountNumber,
      })
      .from(employees)
      .innerJoin(contracts, eq(employees.id, contracts.employeeId))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(
        salaryStructures,
        eq(contracts.salaryStructureId, salaryStructures.id),
      )
      .where(
        and(
          eq(contracts.status, "ACTIVE"),
          sql`${contracts.startDate} <= ${periodEnd}`,
          sql`(${contracts.endDate} IS NULL OR ${contracts.endDate} >= ${periodStart})`,
        ),
      );

    return eligible;
  } catch (error) {
    console.error("Failed to get eligible employees:", error);
    throw new Error("Unable to fetch eligible employees.");
  }
}

export async function createPayrunBatch(data: {
  name: string;
  startDate?: string;
  endDate?: string;
  periodStart?: string;
  periodEnd?: string;
  structureId?: number | string;
  employeeIds?: Array<number | string>;
  selectedEmployeeIds?: Array<number | string>;
}) {
  try {
    await requireWriteAccess("payroll_create_compute");
    const startDate =
      data.periodStart ||
      data.startDate ||
      new Date().toISOString().split("T")[0];
    const endDate =
      data.periodEnd || data.endDate || new Date().toISOString().split("T")[0];

    let resolvedStructId = 1;
    if (data.structureId) {
      resolvedStructId =
        typeof data.structureId === "number"
          ? data.structureId
          : parseInt(data.structureId.replace(/\D/g, ""), 10) || 1;
    }

    const rawEmpIds = data.selectedEmployeeIds || data.employeeIds || [];
    const resolvedEmpIds: number[] = [];

    for (const item of rawEmpIds) {
      if (typeof item === "number") {
        resolvedEmpIds.push(item);
      } else {
        const [found] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, item));
        const numId = found?.id || parseInt(item.replace(/\D/g, ""), 10);
        if (numId) resolvedEmpIds.push(numId);
      }
    }

    // Initialize Payrun in DRAFT (Spec B5)
    const [payrun] = await db
      .insert(payruns)
      .values({
        name: data.name,
        startDate,
        endDate,
        structureId: resolvedStructId,
        status: "DRAFT",
      })
      .returning();

    // Automatically compute the batch payslips
    await computePayrunBatch(payrun.id, resolvedEmpIds);

    try {
      revalidatePath("/payroll/payruns");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, payrunId: payrun.id, payrun };
  } catch (error: any) {
    console.error("Failed to create payrun batch:", error);
    return {
      success: false,
      error: error.message || "Failed to create payrun",
    };
  }
}

export async function computePayrunBatch(
  payrunId: number | string,
  targetEmployeeIds?: Array<number | string>,
) {
  try {
    await requireWriteAccess("payroll_create_compute");
    const rawRunId =
      typeof payrunId === "string"
        ? parseInt(payrunId.replace(/\D/g, ""), 10)
        : payrunId;

    const [payrun] = await db
      .select()
      .from(payruns)
      .where(eq(payruns.id, rawRunId));
    if (!payrun) throw new Error("Payrun not found.");

    // Fetch rules for this payrun's structure
    const rules = await db
      .select()
      .from(salaryRules)
      .where(eq(salaryRules.structureId, payrun.structureId))
      .orderBy(salaryRules.sequence);

    // Resolve employee IDs
    let resolvedTargetIds: number[] | undefined;
    if (targetEmployeeIds && targetEmployeeIds.length > 0) {
      resolvedTargetIds = [];
      for (const item of targetEmployeeIds) {
        if (typeof item === "number") {
          resolvedTargetIds.push(item);
        } else {
          const [found] = await db
            .select({ id: employees.id })
            .from(employees)
            .where(eq(employees.empId, item));
          const numId = found?.id || parseInt(item.replace(/\D/g, ""), 10);
          if (numId) resolvedTargetIds.push(numId);
        }
      }
    }

    let empList;
    if (resolvedTargetIds && resolvedTargetIds.length > 0) {
      empList = await db
        .select()
        .from(employees)
        .where(inArray(employees.id, resolvedTargetIds));
    } else {
      const eligible = await getEligibleEmployeesForPayrun(payrun.startDate, payrun.endDate);
      if (eligible.length === 0) {
        return { success: false, error: "No eligible employees found for this payrun period. All employees must have active contracts covering the period." };
      }
      empList = await db.select().from(employees).where(inArray(employees.id, eligible.map((e) => e.id)));
    }

    // Clear any previous draft payslips for this payrun
    const existingPayslips = await db
      .select()
      .from(payslips)
      .where(eq(payslips.payrunId, rawRunId));
    for (const ps of existingPayslips) {
      await db.delete(payslipLines).where(eq(payslipLines.payslipId, ps.id));
      await db
        .delete(payslipWarnings)
        .where(eq(payslipWarnings.payslipId, ps.id));
    }
    await db.delete(payslips).where(eq(payslips.payrunId, rawRunId));

    // Compute payslip for each employee
    for (const emp of empList) {
      const contract = await getActiveContractForPeriod(
        emp.id,
        payrun.startDate,
        payrun.endDate,
      );
      if (!contract) continue;

      const contractRules = await db
        .select()
        .from(salaryRules)
        .where(eq(salaryRules.structureId, contract.salaryStructureId))
        .orderBy(salaryRules.sequence);

      const rulesToUse = contractRules.length > 0 ? contractRules : rules;

      // Calculate actual worked days from attendance records for the payrun period
      const attRecords = await db
        .select({ status: attendance.status })
        .from(attendance)
        .where(
          and(
            eq(attendance.employeeId, emp.id),
            gte(attendance.date, payrun.startDate),
            lte(attendance.date, payrun.endDate),
            sql`${attendance.status} IN ('PRESENT', 'LATE', 'HALF_DAY')`
          )
        );
      // Count HALF_DAY as 0.5, PRESENT/LATE as 1
      let workedDays = 0;
      for (const rec of attRecords) {
        workedDays += rec.status === "HALF_DAY" ? 0.5 : 1;
      }
      // If no attendance records exist yet, fall back to calendar-based estimate
      if (workedDays === 0) {
        const start = new Date(payrun.startDate);
        const end = new Date(payrun.endDate);
        let weekdays = 0;
        const d = new Date(start);
        while (d <= end) {
          const day = d.getDay();
          if (day !== 0 && day !== 6) weekdays++;
          d.setDate(d.getDate() + 1);
        }
        workedDays = weekdays;
      }

      const computation = computeEmployeePayroll({
        employee: {
          id: emp.id,
          name: emp.name,
          bankAccountNumber: emp.bankAccountNumber,
          bankName: emp.bankName,
        },
        contract: {
          id: contract.id,
          wage: contract.wage,
          startDate: contract.startDate,
          endDate: contract.endDate,
        },
        rules: rulesToUse,
        periodStart: payrun.startDate,
        periodEnd: payrun.endDate,
        workedDays,
      });

      const [newPayslip] = await db
        .insert(payslips)
        .values({
          payrunId: rawRunId,
          employeeId: emp.id,
          contractId: contract.id,
          structureId: contract.salaryStructureId,
          workedDays: workedDays.toFixed(2),
          basicWage: computation.basicWage.toFixed(2),
          grossSalary: computation.grossSalary.toFixed(2),
          netSalary: computation.netSalary.toFixed(2),
          hasWarnings: computation.warnings.length > 0,
          status: "COMPUTED",
        })
        .returning();

      for (const line of computation.lines) {
        await db.insert(payslipLines).values({
          payslipId: newPayslip.id,
          sequence: line.sequence,
          ruleCode: line.ruleCode,
          ruleName: line.ruleName,
          category: line.category,
          amount: line.amount.toFixed(2),
        });
      }

      for (const w of computation.warnings) {
        await db.insert(payslipWarnings).values({
          payslipId: newPayslip.id,
          warningType: w.warningType,
          message: w.message,
        });
      }
    }

    await db
      .update(payruns)
      .set({ status: "COMPUTED", computedAt: new Date() })
      .where(eq(payruns.id, rawRunId));

    try {
      revalidatePath(`/payroll/payruns/${rawRunId}`);
      revalidatePath("/payroll/payruns");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to compute payrun ${payrunId}:`, error);
    return { success: false, error: error.message || "Computation failed" };
  }
}

export async function validatePayrun(payrunId: number | string) {
  try {
    await requireWriteAccess("payroll_validate_paid");

    const rawId = typeof payrunId === "string" ? parseInt(payrunId.replace(/\D/g, ""), 10) : payrunId;

    // Enforce lifecycle: only COMPUTED payrun can be validated
    const [payrun] = await db.select({ status: payruns.status }).from(payruns).where(eq(payruns.id, rawId));
    if (!payrun) return { success: false, error: "Payrun not found." };
    if (payrun.status !== "COMPUTED") {
      return { success: false, error: `Cannot validate: payrun is in '${payrun.status}' status. Must be COMPUTED first.` };
    }

    await db
      .update(payruns)
      .set({ status: "VALIDATED", validatedAt: new Date() })
      .where(eq(payruns.id, rawId));

    await db
      .update(payslips)
      .set({ status: "VALIDATED" })
      .where(eq(payslips.payrunId, rawId));

    try {
      revalidatePath(`/payroll/payruns/${rawId}`);
      revalidatePath("/payroll/payruns");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to validate payrun ${payrunId}:`, error);
    return { success: false, error: error.message || "Validation failed" };
  }
}

export async function markPayrunPaid(payrunId: number | string) {
  try {
    await requireWriteAccess("payroll_validate_paid");

    const rawId = typeof payrunId === "string" ? parseInt(payrunId.replace(/\D/g, ""), 10) : payrunId;

    // Enforce lifecycle: only VALIDATED payrun can be paid
    const [payrun] = await db.select({ status: payruns.status }).from(payruns).where(eq(payruns.id, rawId));
    if (!payrun) return { success: false, error: "Payrun not found." };
    if (payrun.status !== "VALIDATED") {
      return { success: false, error: `Cannot mark as paid: payrun is in '${payrun.status}' status. Must be VALIDATED first.` };
    }

    const paidAt = new Date();

    await db
      .update(payruns)
      .set({ status: "PAID", paidAt })
      .where(eq(payruns.id, rawId));

    await db
      .update(payslips)
      .set({ status: "PAID" })
      .where(eq(payslips.payrunId, rawId));

    try {
      revalidatePath(`/payroll/payruns/${rawId}`);
      revalidatePath("/payroll/payruns");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to mark payrun ${payrunId} paid:`, error);
    return { success: false, error: error.message || "Failed to mark paid" };
  }
}

export async function sendPayslipsBulk(payrunId: number | string) {
  try {
    await requireWriteAccess("payroll_validate_paid");
    const rawId =
      typeof payrunId === "string"
        ? parseInt(payrunId.replace(/\D/g, ""), 10)
        : payrunId;
    const sentAt = new Date();

    const result = await db
      .update(payslips)
      .set({ emailSentAt: sentAt })
      .where(eq(payslips.payrunId, rawId));

    // Count actual number of affected payslips
    const affectedSlips = await db
      .select({ id: payslips.id })
      .from(payslips)
      .where(and(eq(payslips.payrunId, rawId), sql`${payslips.emailSentAt} IS NOT NULL`));

    try {
      revalidatePath(`/payroll/payruns/${rawId}`);
    } catch {}

    return { success: true, countSent: affectedSlips.length };
  } catch (error: any) {
    console.error(`Failed to send payslips for payrun ${payrunId}:`, error);
    return {
      success: false,
      error: error.message || "Failed to send payslips",
    };
  }
}

export async function getPayruns() {
  try {
    await requireReadAccess("payroll_view");
    const runs = await db
      .select({
        id: payruns.id,
        name: payruns.name,
        startDate: payruns.startDate,
        endDate: payruns.endDate,
        structureId: payruns.structureId,
        structureName: salaryStructures.name,
        status: payruns.status,
        computedAt: payruns.computedAt,
        validatedAt: payruns.validatedAt,
        paidAt: payruns.paidAt,
        createdAt: payruns.createdAt,
      })
      .from(payruns)
      .leftJoin(salaryStructures, eq(payruns.structureId, salaryStructures.id))
      .orderBy(desc(payruns.startDate));

    const allPayslips = await db.select().from(payslips);

    return runs.map((r) => {
      const slips = allPayslips.filter((p) => p.payrunId === r.id);
      const totalNet = slips.reduce(
        (sum, p) => sum + parseFloat(p.netSalary),
        0,
      );
      const warningsCount = slips.filter((p) => p.hasWarnings).length;

      return {
        ...r,
        totalEmployees: slips.length,
        totalNet,
        warningsCount,
      };
    });
  } catch (error) {
    console.error("Failed to get payruns:", error);
    throw new Error("Unable to fetch payruns.");
  }
}

export async function getPayrunById(id: number | string) {
  try {
    await requireReadAccess("payroll_view");
    const rawId =
      typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const [run] = await db
      .select({
        id: payruns.id,
        name: payruns.name,
        startDate: payruns.startDate,
        endDate: payruns.endDate,
        structureId: payruns.structureId,
        structureName: salaryStructures.name,
        status: payruns.status,
        computedAt: payruns.computedAt,
        validatedAt: payruns.validatedAt,
        paidAt: payruns.paidAt,
        createdAt: payruns.createdAt,
      })
      .from(payruns)
      .leftJoin(salaryStructures, eq(payruns.structureId, salaryStructures.id))
      .where(eq(payruns.id, rawId));

    if (!run) return null;

    const slips = await db
      .select({
        id: payslips.id,
        employeeId: payslips.employeeId,
        employeeName: employees.name,
        departmentName: departments.name,
        jobPosition: employees.jobPosition,
        workedDays: payslips.workedDays,
        basicWage: payslips.basicWage,
        grossSalary: payslips.grossSalary,
        netSalary: payslips.netSalary,
        hasWarnings: payslips.hasWarnings,
        status: payslips.status,
        emailSentAt: payslips.emailSentAt,
      })
      .from(payslips)
      .leftJoin(employees, eq(payslips.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(payslips.payrunId, rawId));

    const totalNet = slips.reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

    return {
      ...run,
      totalEmployees: slips.length,
      totalNet,
      payslips: slips,
    };
  } catch (error) {
    console.error(`Failed to get payrun ${id}:`, error);
    throw new Error("Unable to fetch payrun details.");
  }
}

export async function getPayslipDetail(id: number | string) {
  try {
    const user = await requireReadAccess("payroll_own_payslip");
    const rawId =
      typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const [ps] = await db
      .select({
        id: payslips.id,
        payrunId: payslips.payrunId,
        payrunName: payruns.name,
        periodStart: payruns.startDate,
        periodEnd: payruns.endDate,
        employeeId: payslips.employeeId,
        employeeName: employees.name,
        empId: employees.empId,
        email: employees.email,
        bankName: employees.bankName,
        bankAccountNumber: employees.bankAccountNumber,
        departmentName: departments.name,
        jobPosition: employees.jobPosition,
        structureName: salaryStructures.name,
        contractRef: contracts.name,
        workedDays: payslips.workedDays,
        basicWage: payslips.basicWage,
        grossSalary: payslips.grossSalary,
        netSalary: payslips.netSalary,
        status: payslips.status,
        hasWarnings: payslips.hasWarnings,
        emailSentAt: payslips.emailSentAt,
      })
      .from(payslips)
      .leftJoin(payruns, eq(payslips.payrunId, payruns.id))
      .leftJoin(employees, eq(payslips.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(salaryStructures, eq(payslips.structureId, salaryStructures.id))
      .leftJoin(contracts, eq(payslips.contractId, contracts.id))
      .where(eq(payslips.id, rawId));

    if (!ps) return null;

    if (!canAccessModule(user.role, "payroll_view") && ps.employeeId !== user.employeeDbId) {
      throw new Error("Forbidden: Insufficient permissions");
    }

    const lines = await db
      .select()
      .from(payslipLines)
      .where(eq(payslipLines.payslipId, rawId))
      .orderBy(payslipLines.sequence);

    const warnings = await db
      .select()
      .from(payslipWarnings)
      .where(eq(payslipWarnings.payslipId, rawId));

    return {
      ...ps,
      lines,
      warnings,
    };
  } catch (error) {
    console.error(`Failed to get payslip ${id}:`, error);
    throw new Error("Unable to fetch payslip details.");
  }
}
