import { Employee, Contract, SalaryStructure, SalaryRule, Payslip, PayslipLineItem, Payrun } from "./types";

export function getActiveContractForPeriod(
  employeeId: string,
  contracts: Contract[],
  periodStart: string,
  periodEnd: string
): Contract | undefined {
  const pStart = new Date(periodStart).getTime();
  const pEnd = new Date(periodEnd).getTime();

  return contracts.find((c) => {
    if (c.employeeId !== employeeId) return false;
    if (c.status !== "Running") return false;
    const cStart = new Date(c.startDate).getTime();
    const cEnd = c.endDate ? new Date(c.endDate).getTime() : Infinity;
    return cStart <= pEnd && cEnd >= pStart;
  });
}

export function computePayslipForEmployee(params: {
  employee: Employee;
  contract: Contract;
  structure: SalaryStructure;
  rules: SalaryRule[];
  payrun: Pick<Payrun, "id" | "name" | "periodStart" | "periodEnd" | "status">;
  workedDays?: number;
}): Payslip {
  const { employee, contract, structure, rules, payrun, workedDays = 22 } = params;

  // Filter rules assigned to this structure and sort by sequence ascending
  const activeRules = rules
    .filter((r) => structure.ruleIds.includes(r.id))
    .sort((a, b) => a.sequence - b.sequence);

  const categoryTotals: Record<string, number> = {
    Basic: 0,
    Allowance: 0,
    Deduction: 0,
    Gross: 0,
    Net: 0,
  };

  const lineItems: PayslipLineItem[] = [];

  for (const rule of activeRules) {
    let amount = 0;

    if (rule.computationType === "percentage") {
      const pct = (rule.percentage || 0) / 100;
      amount = Math.round(contract.wage * pct);
    } else if (rule.computationType === "fixed") {
      amount = rule.fixedAmount || 0;
    } else if (rule.computationType === "formula") {
      if (rule.code === "GROSS") {
        amount = (categoryTotals["Basic"] || 0) + (categoryTotals["Allowance"] || 0);
      } else if (rule.code === "NET") {
        const gross = categoryTotals["Gross"] || ((categoryTotals["Basic"] || 0) + (categoryTotals["Allowance"] || 0));
        const deductions = categoryTotals["Deduction"] || 0;
        amount = gross - deductions;
      }
    }

    if (rule.category === "Deduction" && amount > 0) {
      // Record as negative in line item for deductions
      amount = -Math.abs(amount);
    }

    if (rule.category === "Deduction") {
      categoryTotals["Deduction"] += Math.abs(amount);
    } else if (rule.category === "Basic" || rule.category === "Allowance") {
      categoryTotals[rule.category] += amount;
    } else if (rule.category === "Gross") {
      categoryTotals["Gross"] = amount;
    } else if (rule.category === "Net") {
      categoryTotals["Net"] = amount;
    }

    lineItems.push({
      ruleId: rule.id,
      ruleName: rule.name,
      code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      amount,
    });
  }

  const basic = categoryTotals["Basic"] || 0;
  const gross = categoryTotals["Gross"] || (basic + categoryTotals["Allowance"]);
  const deductions = categoryTotals["Deduction"] || 0;
  const net = categoryTotals["Net"] || (gross - deductions);

  // Check warnings
  const warnings: string[] = [];
  if (!employee.bankDetails?.accountNumber) {
    warnings.push("A/C Missing");
  }

  return {
    id: `PS-${payrun.id}-${employee.id}`,
    payrunId: payrun.id,
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    jobPosition: employee.jobPosition,
    period: payrun.name,
    periodStart: payrun.periodStart,
    periodEnd: payrun.periodEnd,
    workedDays,
    contractRef: contract.refCode,
    structureName: structure.name,
    status: payrun.status,
    lineItems,
    basic,
    gross,
    deductions,
    net,
    warnings,
  };
}

export function detectPayrunWarnings(params: {
  employees: Employee[];
  selectedEmployeeIds: string[];
  contracts: Contract[];
  periodStart: string;
  periodEnd: string;
}): string[] {
  const warnings: string[] = [];

  const missingBankCount = params.selectedEmployeeIds.filter((empId) => {
    const emp = params.employees.find((e) => e.id === empId);
    return !emp?.bankDetails?.accountNumber;
  }).length;

  if (missingBankCount > 0) {
    warnings.push(`${missingBankCount} employee${missingBankCount > 1 ? "s" : ""} missing bank account`);
  }

  const pEnd = new Date(params.periodEnd).getTime();
  const expiringCount = params.contracts.filter((c) => {
    if (c.status !== "Running" || !c.endDate) return false;
    const cEnd = new Date(c.endDate).getTime();
    return cEnd <= pEnd;
  }).length;

  if (expiringCount > 0) {
    warnings.push(`${expiringCount} contract${expiringCount > 1 ? "s" : ""} expiring this period`);
  }

  return warnings;
}
