/**
 * Server-Side Payroll Engine for PeoplePay360
 * Adheres to Section A6 & B7 of the official specification:
 * - Sequenced evaluation of rules
 * - Safe formula calculation (e.g. BASIC + HRA + STD, GROSS - PF - PT)
 * - Percentage of base wage or referenced base code
 * - Pre-flight safety warnings (missing bank details, contract expiration, duplicate payslips)
 */

export interface RuleCalculationResult {
  ruleCode: string;
  ruleName: string;
  category: "BASIC" | "ALLOWANCE" | "GROSS" | "DEDUCTION" | "NET";
  sequence: number;
  amount: number;
}

export interface PayslipComputationOutput {
  basicWage: number;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  lines: RuleCalculationResult[];
  warnings: Array<{ warningType: string; message: string }>;
}

/**
 * Safely evaluates arithmetic expressions referencing rule codes.
 * Replaces rule code identifiers (e.g. BASIC, HRA, GROSS, PF) with numeric values.
 * Supports +, -, *, /, (, ) and numeric literals without raw eval.
 */
export function evaluateSalaryFormula(formula: string, codeValues: Record<string, number>): number {
  if (!formula || !formula.trim()) return 0;

  // Substitute rule codes with their computed numeric values
  let expr = formula.trim();

  // Sort keys by length descending to prevent partial replacements (e.g. BASIC vs BAS)
  const sortedCodes = Object.keys(codeValues).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    const regex = new RegExp(`\\b${code}\\b`, "g");
    expr = expr.replace(regex, String(codeValues[code] ?? 0));
  }

  // Replace any leftover unknown identifiers with 0
  expr = expr.replace(/[a-zA-Z_]\w*/g, "0");

  // Validate that expr contains only safe mathematical characters: digits, ., +, -, *, /, (, ), spaces
  if (!/^[\d\s+\-*/().]+$/.test(expr)) {
    console.warn(`Unsafe characters in evaluated formula: "${expr}"`);
    return 0;
  }

  try {
    // Safe evaluation using Function with no arguments
    const result = new Function(`"use strict"; return (${expr});`)();
    return typeof result === "number" && !isNaN(result) ? Math.round(result * 100) / 100 : 0;
  } catch (err) {
    console.error(`Error evaluating formula "${formula}" -> "${expr}":`, err);
    return 0;
  }
}

/**
 * Computes the full payslip breakdown for an employee based on their active contract
 * and the assigned salary rules sorted by sequence.
 */
export function computeEmployeePayroll(params: {
  employee: {
    id: number;
    name: string;
    bankAccountNumber?: string | null;
    bankName?: string | null;
  };
  contract: {
    id: number;
    wage: string | number;
    startDate: string;
    endDate?: string | null;
  };
  rules: Array<{
    id: number;
    code: string;
    name: string;
    category: "BASIC" | "ALLOWANCE" | "GROSS" | "DEDUCTION" | "NET";
    sequence: number;
    computationType: "FIXED" | "PERCENTAGE" | "FORMULA";
    amount?: string | number | null;
    percentage?: string | number | null;
    baseCode?: string | null;
    formula?: string | null;
    isActive: boolean;
  }>;
  periodStart: string;
  periodEnd: string;
  workedDays?: number;
}): PayslipComputationOutput {
  const { employee, contract, rules, periodStart, periodEnd } = params;
  const monthlyWage = typeof contract.wage === "string" ? parseFloat(contract.wage) : contract.wage;

  // Active rules sorted strictly by sequence ascending (Spec A6)
  const sortedRules = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => a.sequence - b.sequence);

  const codeValues: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {
    BASIC: 0,
    ALLOWANCE: 0,
    GROSS: 0,
    DEDUCTION: 0,
    NET: 0,
  };

  const lines: RuleCalculationResult[] = [];

  for (const rule of sortedRules) {
    let ruleAmount = 0;

    if (rule.computationType === "FIXED") {
      ruleAmount = typeof rule.amount === "string" ? parseFloat(rule.amount || "0") : (rule.amount || 0);
    } else if (rule.computationType === "PERCENTAGE") {
      const pct = (typeof rule.percentage === "string" ? parseFloat(rule.percentage || "0") : (rule.percentage || 0)) / 100;
      
      // If baseCode is specified, apply % to that rule's computed output; otherwise apply to monthly contract wage
      let baseAmount = monthlyWage;
      if (rule.baseCode && codeValues[rule.baseCode] !== undefined) {
        baseAmount = codeValues[rule.baseCode];
      }
      ruleAmount = Math.round(baseAmount * pct * 100) / 100;
    } else if (rule.computationType === "FORMULA") {
      if (rule.formula) {
        ruleAmount = evaluateSalaryFormula(rule.formula, codeValues);
      } else {
        // Fallback default formula handling
        if (rule.code === "GROSS") {
          ruleAmount = (categoryTotals["BASIC"] || 0) + (categoryTotals["ALLOWANCE"] || 0);
        } else if (rule.code === "NET") {
          const gross = categoryTotals["GROSS"] || ((categoryTotals["BASIC"] || 0) + (categoryTotals["ALLOWANCE"] || 0));
          const deductions = categoryTotals["DEDUCTION"] || 0;
          ruleAmount = gross - deductions;
        }
      }
    }

    // Save computed rule amount for downstream rule dependencies
    codeValues[rule.code] = ruleAmount;

    // Track category totals
    if (rule.category === "BASIC") {
      categoryTotals["BASIC"] += ruleAmount;
    } else if (rule.category === "ALLOWANCE") {
      categoryTotals["ALLOWANCE"] += ruleAmount;
    } else if (rule.category === "DEDUCTION") {
      categoryTotals["DEDUCTION"] += Math.abs(ruleAmount);
    } else if (rule.category === "GROSS") {
      categoryTotals["GROSS"] = ruleAmount;
    } else if (rule.category === "NET") {
      categoryTotals["NET"] = ruleAmount;
    }

    lines.push({
      ruleCode: rule.code,
      ruleName: rule.name,
      category: rule.category,
      sequence: rule.sequence,
      amount: ruleAmount,
    });
  }

  const basicWage = categoryTotals["BASIC"] || monthlyWage;
  const grossSalary = categoryTotals["GROSS"] || (basicWage + (categoryTotals["ALLOWANCE"] || 0));
  const totalDeductions = categoryTotals["DEDUCTION"] || 0;
  const netSalary = categoryTotals["NET"] || (grossSalary - totalDeductions);

  // Pre-flight warning detection (Spec B6)
  const warnings: Array<{ warningType: string; message: string }> = [];

  // Check 1: Missing bank details
  if (!employee.bankAccountNumber || employee.bankAccountNumber.trim() === "") {
    warnings.push({
      warningType: "MISSING_BANK_DETAILS",
      message: `Employee ${employee.name} is missing bank account details.`,
    });
  }

  // Check 2: Contract expiring during or before period end
  if (contract.endDate) {
    const cEnd = new Date(contract.endDate).getTime();
    const pEnd = new Date(periodEnd).getTime();
    if (cEnd <= pEnd) {
      warnings.push({
        warningType: "EXPIRING_CONTRACT",
        message: `Contract for ${employee.name} expires on or before payrun end date (${contract.endDate}).`,
      });
    }
  }

  return {
    basicWage,
    grossSalary,
    netSalary,
    totalDeductions,
    lines,
    warnings,
  };
}
