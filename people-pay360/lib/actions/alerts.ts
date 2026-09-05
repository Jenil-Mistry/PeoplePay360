"use server";

import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendance,
  contracts,
  employees,
  payslipWarnings,
  payslips,
  payruns,
  timeOffRequests,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/authz";
import { toDateString } from "@/lib/date-utils";

export type OperationalAlert = {
  id: string;
  type:
    | "BANK_DETAILS"
    | "TIME_OFF"
    | "PAYSLIP_WARNING"
    | "ATTENDANCE"
    | "CONTRACT"
    | "PAYROLL";
  severity: "critical" | "warning" | "info";
  message: string;
  entityId?: number;
  href: string;
  observedAt: string;
};

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const session = await requireAuth();
  const isEmployee = session.user.role === "EMPLOYEE";
  const employeeId = session.user.employeeDbId;
  const today = new Date();
  const nextThirtyDays = new Date(today);
  nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);
  const nextThirtyDaysString = toDateString(nextThirtyDays);

  const employeeScope = isEmployee ? eq(employees.id, employeeId) : undefined;
  const [
    missingBank,
    pendingLeave,
    warningRows,
    missingCheckout,
    manualEdits,
    expiringContracts,
    payrollWarnings,
  ] = await Promise.all([
    db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(
        and(
          employeeScope,
          eq(employees.isActive, true),
          or(
            isNull(employees.bankAccountNumber),
            eq(employees.bankAccountNumber, ""),
          ),
        ),
      ),
    db
      .select({
        id: timeOffRequests.id,
        employeeId: timeOffRequests.employeeId,
        name: employees.name,
        createdAt: timeOffRequests.startDate,
      })
      .from(timeOffRequests)
      .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .where(
        and(
          eq(timeOffRequests.status, "DRAFT"),
          isEmployee ? eq(timeOffRequests.employeeId, employeeId) : undefined,
        ),
      ),
    db
      .select({
        id: payslipWarnings.id,
        payslipId: payslipWarnings.payslipId,
        message: payslipWarnings.message,
        createdAt: payslipWarnings.createdAt,
      })
      .from(payslipWarnings)
      .leftJoin(payslips, eq(payslipWarnings.payslipId, payslips.id))
      .where(isEmployee ? eq(payslips.employeeId, employeeId) : undefined),
    db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        date: attendance.date,
        name: employees.name,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .where(
        and(
          isNull(attendance.checkOut),
          gte(
            attendance.date,
            toDateString(new Date(Date.now() - 7 * 86_400_000)),
          ),
          isEmployee ? eq(attendance.employeeId, employeeId) : undefined,
        ),
      ),
    db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        date: attendance.date,
        name: employees.name,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .where(
        and(
          eq(attendance.isManualCorrection, true),
          gte(
            attendance.date,
            toDateString(new Date(Date.now() - 30 * 86_400_000)),
          ),
          isEmployee ? eq(attendance.employeeId, employeeId) : undefined,
        ),
      ),
    db
      .select({
        id: contracts.id,
        employeeId: contracts.employeeId,
        name: employees.name,
        endDate: contracts.endDate,
      })
      .from(contracts)
      .leftJoin(employees, eq(contracts.employeeId, employees.id))
      .where(
        and(
          eq(contracts.status, "ACTIVE"),
          lte(contracts.endDate, nextThirtyDaysString),
          isEmployee ? eq(contracts.employeeId, employeeId) : undefined,
        ),
      ),
    db
      .select({ id: payruns.id, name: payruns.name, status: payruns.status })
      .from(payruns)
      .where(ne(payruns.status, "PAID")),
  ]);

  const alerts: OperationalAlert[] = [];
  const add = (alert: OperationalAlert) => alerts.push(alert);

  const missingBankCount = missingBank.length;
  if (missingBankCount > 0) {
    add({
      id: "bank-details",
      type: "BANK_DETAILS",
      severity: "warning",
      message: `${missingBankCount} active employee${missingBankCount === 1 ? " is" : "s are"} missing bank account details`,
      href: "/employees",
      observedAt: today.toISOString(),
    });
  }
  pendingLeave.forEach((request) =>
    add({
      id: `time-off-${request.id}`,
      type: "TIME_OFF",
      severity: "warning",
      message: `${request.name || "Employee"} has a time-off request awaiting HR/Admin approval`,
      entityId: request.id,
      href: `/time-off/requests?request=${request.id}`,
      observedAt: String(request.createdAt),
    }),
  );
  warningRows.forEach((warning) =>
    add({
      id: `payslip-warning-${warning.id}`,
      type: "PAYSLIP_WARNING",
      severity: "critical",
      message: warning.message,
      entityId: warning.payslipId,
      href: `/payroll/payslips?id=PS-${warning.payslipId}`,
      observedAt: warning.createdAt.toISOString(),
    }),
  );
  missingCheckout.forEach((record) =>
    add({
      id: `missing-checkout-${record.id}`,
      type: "ATTENDANCE",
      severity: "warning",
      message: `${record.name || "Employee"} is missing checkout for ${record.date}`,
      entityId: record.id,
      href: `/attendance?employee=${record.employeeId}`,
      observedAt: record.date,
    }),
  );
  manualEdits.forEach((record) =>
    add({
      id: `attendance-edit-${record.id}`,
      type: "ATTENDANCE",
      severity: "info",
      message: `${record.name || "Employee"} has a manually corrected attendance record for ${record.date}`,
      entityId: record.id,
      href: `/attendance?employee=${record.employeeId}`,
      observedAt: record.date,
    }),
  );
  expiringContracts.forEach((contract) =>
    add({
      id: `contract-expiry-${contract.id}`,
      type: "CONTRACT",
      severity: "warning",
      message: `${contract.name || "Employee"}'s contract expires on ${contract.endDate}`,
      entityId: contract.id,
      href: "/contracts",
      observedAt: String(contract.endDate),
    }),
  );
  payrollWarnings.forEach((run) =>
    add({
      id: `payrun-${run.id}`,
      type: "PAYROLL",
      severity: run.status === "DRAFT" ? "info" : "warning",
      message: `Payroll batch ${run.name} is ${run.status.toLowerCase()} and requires review`,
      entityId: run.id,
      href: `/payroll/payruns/${run.id}`,
      observedAt: today.toISOString(),
    }),
  );

  return alerts.slice(0, 100);
}
