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

import { auth } from "@/lib/auth";

export async function getDashboardMetrics(filters?: {
  departmentId?: number;
  employeeType?: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN";
  payrunId?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    // 1. Resolve filtered employees
    const empConditions = [];
    if (filters?.departmentId) {
      empConditions.push(eq(employees.departmentId, filters.departmentId));
    }
    if (filters?.employeeType) {
      empConditions.push(eq(employees.employeeType, filters.employeeType));
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
    }
    if (filters?.payrunId) {
      allPayslips = allPayslips.filter((p) => p.payrunId === filters.payrunId);
    }

    const totalNetSalaryPaid = allPayslips
      .filter((p) => p.status === "PAID" || p.status === "VALIDATED")
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
          (empIds.length === 0 || empIds.includes(r.employeeId)),
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
      (a) => empIds.length === 0 || empIds.includes(a.employeeId),
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

    // 7. Operational Alerts
    const alerts: string[] = [];
    const missingBank = filteredEmployees.filter(
      (e) => !e.bankAccountNumber || e.bankAccountNumber.trim() === "",
    );
    if (missingBank.length > 0) {
      alerts.push(
        `${missingBank.length} employees missing bank account details`,
      );
    }
    if (pendingApprovalsCount > 0) {
      alerts.push(
        `${pendingApprovalsCount} time off requests awaiting manager approval`,
      );
    }
    const warningSlips = allPayslips.filter((p) => p.hasWarnings).length;
    if (warningSlips > 0) {
      alerts.push(`${warningSlips} payslips flagged with pre-flight warnings`);
    }

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
      alerts,
      totalEmployees: filteredEmployees.length,
    };
  } catch (error) {
    console.error("Failed to get dashboard metrics:", error);
    throw new Error("Unable to fetch dashboard metrics.");
  }
}
