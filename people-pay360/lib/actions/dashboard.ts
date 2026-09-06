"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  contracts,
  attendance,
  timeOffRequests,
  payruns,
  payslips,
} from "@/lib/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { requireReadAccess } from "./auth-helpers";
import { canAccessModule } from "@/lib/rbac";

export async function getDashboardMetrics(filters?: {
  departmentName?: string;
  employeeType?: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN" | "All Types" | string;
  payrunName?: string;
}) {
  try {
    const user = await requireReadAccess("dashboard");
    const canViewAll = canAccessModule(user.role, "employees");

    // Resolve department ID from name if provided
    let resolvedDepartmentId: number | undefined;
    if (filters?.departmentName && filters.departmentName !== "All Departments") {
      const [dept] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.name, filters.departmentName));
      if (dept) resolvedDepartmentId = dept.id;
    }

    // Resolve payrun ID from name if provided
    let resolvedPayrunId: number | undefined;
    if (filters?.payrunName) {
      const [pr] = await db
        .select({ id: payruns.id })
        .from(payruns)
        .where(eq(payruns.name, filters.payrunName));
      if (pr) resolvedPayrunId = pr.id;
    }

    // 1. Resolve filtered employees
    const empConditions = [];
    if (!canViewAll) {
      empConditions.push(eq(employees.id, user.employeeDbId));
    }
    if (resolvedDepartmentId) {
      empConditions.push(eq(employees.departmentId, resolvedDepartmentId));
    }
    
    // Map UI types to DB types
    if (filters?.employeeType && filters.employeeType !== "All Types") {
      const typeMap: Record<string, any> = {
        "Full-Time": "FULL_TIME",
        "Contractor": "CONTRACTOR",
        "Part-Time": "PART_TIME"
      };
      const dbType = typeMap[filters.employeeType] || filters.employeeType;
      empConditions.push(eq(employees.employeeType, dbType));
    }

    const filteredEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        departmentId: employees.departmentId,
        employeeType: employees.employeeType,
        bankAccountNumber: employees.bankAccountNumber,
      })
      .from(employees)
      .where(empConditions.length > 0 ? and(...empConditions) : undefined);

    const empIds = filteredEmployees.map((e) => e.id);

    // 2. Payslip & Payroll Aggregations
    let allPayslips = await db
      .select({
        id: payslips.id,
        payrunId: payslips.payrunId,
        employeeId: payslips.employeeId,
        netSalary: payslips.netSalary,
        status: payslips.status,
        hasWarnings: payslips.hasWarnings,
      })
      .from(payslips);

    if (empIds.length > 0) {
      allPayslips = allPayslips.filter((p) => empIds.includes(p.employeeId));
    } else if (filteredEmployees.length === 0 && (resolvedDepartmentId || filters?.employeeType && filters.employeeType !== "All Types")) {
      // If filters yield no employees, there are no payslips
      allPayslips = [];
    }
    
    if (resolvedPayrunId) {
      allPayslips = allPayslips.filter((p) => p.payrunId === resolvedPayrunId);
    }

    const totalNetSalaryPaid = allPayslips
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + parseFloat(p.netSalary), 0);

    const payslipsGenerated = allPayslips.length;
    const averageSalary =
      payslipsGenerated > 0
        ? Math.round(totalNetSalaryPaid / payslipsGenerated)
        : 0;

    // 3. Approved Time Off Days
    const leaveRequests = await db
      .select({
        requestedUnits: timeOffRequests.requestedUnits,
        status: timeOffRequests.status,
        employeeId: timeOffRequests.employeeId,
      })
      .from(timeOffRequests);

    const approvedLeaves = leaveRequests
      .filter(
        (r) =>
          r.status === "APPROVED" &&
          (empIds.length > 0 ? empIds.includes(r.employeeId) : true),
      )
      .reduce((sum, r) => sum + parseFloat(r.requestedUnits.toString()), 0);

    const pendingApprovalsCount = leaveRequests.filter(
      (r) => r.status === "DRAFT",
    ).length;

    // 4. Attendance Health
    const attRecords = await db
      .select({ status: attendance.status, employeeId: attendance.employeeId })
      .from(attendance);
    const filteredAtt = attRecords.filter(
      (a) => (empIds.length > 0 ? empIds.includes(a.employeeId) : true),
    );
    const presentCount = filteredAtt.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE",
    ).length;
    const attendanceHealth =
      filteredAtt.length > 0
        ? Math.round((presentCount / filteredAtt.length) * 100)
        : 100;

    // 5. Department Payroll Expenditure Breakdown
    const allDepartments = await db.select().from(departments);
    const deptBreakdown = allDepartments.map((dept) => {
      const deptEmployees = filteredEmployees.filter(
        (e) => e.departmentId === dept.id,
      );
      const deptPayslips = allPayslips.filter((p) =>
        deptEmployees.some((e) => e.id === p.employeeId),
      );
      const totalSalary = deptPayslips.reduce(
        (sum, p) => sum + parseFloat(p.netSalary),
        0,
      );

      return {
        id: dept.id,
        name: dept.name,
        headcount: deptEmployees.length,
        totalSalary,
      };
    });

    // 6. Monthly Net Salary Trends
    const allRuns = await db.select().from(payruns).orderBy(payruns.startDate);
    const monthlyTrends = allRuns.map((r) => {
      const runSlips = allPayslips.filter((p) => p.payrunId === r.id);
      const totalNet = runSlips.reduce(
        (sum, p) => sum + parseFloat(p.netSalary),
        0,
      );
      return {
        month: r.name,
        totalNet,
      };
    });

    return {
      kpis: {
        totalNetSalaryPaid,
        payslipsGenerated,
        averageSalary,
        approvedTimeOffDays: approvedLeaves,
        attendanceHealth,
      },
      deptBreakdown,
      monthlyTrends,
      totalEmployees: filteredEmployees.length,
    };
  } catch (error) {
    console.error("Failed to get dashboard metrics:", error);
    throw new Error("Unable to fetch dashboard metrics.");
  }
}
