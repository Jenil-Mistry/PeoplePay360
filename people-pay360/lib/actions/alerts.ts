"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  contracts,
  attendance,
  timeOffRequests,
  timeOffTypes,
  payruns,
  payslips,
  payslipWarnings,
} from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte, isNull } from "drizzle-orm";
import { getAuthenticatedUser } from "./auth-helpers";

/* ================================================================
   Shared Typed OperationalAlert Model (Plan Section 2)
   ================================================================ */

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertCategory =
  | "missing_bank_details"
  | "pending_time_off"
  | "payslip_warning"
  | "missing_checkout"
  | "manual_correction"
  | "expiring_contract"
  | "payroll_blocked";

export interface OperationalAlert {
  /** Deterministic key to prevent duplicates */
  key: string;
  type: AlertCategory;
  severity: AlertSeverity;
  message: string;
  /** Related record/entity ID */
  entityId?: number | string;
  /** Link target for the alert */
  linkTarget?: string;
  /** When the alert condition was observed */
  observedAt: string;
}

/**
 * Generate operational alerts from actual database records.
 * Used for both the dashboard card and the notification bell.
 */
export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const user = await getAuthenticatedUser();
  const alerts: OperationalAlert[] = [];
  const now = new Date().toISOString();

  // 1. Employees missing bank information
  const missingBank = await db
    .select({ id: employees.id, name: employees.name, empId: employees.empId })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        sql`(${employees.bankAccountNumber} IS NULL OR TRIM(${employees.bankAccountNumber}) = '')`
      )
    );

  for (const emp of missingBank) {
    alerts.push({
      key: `missing_bank_${emp.id}`,
      type: "missing_bank_details",
      severity: "warning",
      message: `${emp.name} is missing bank account details`,
      entityId: emp.id,
      linkTarget: "/employees",
      observedAt: now,
    });
  }

  // 2. Pending time-off requests (DRAFT status = awaiting approval)
  const pendingRequests = await db
    .select({
      id: timeOffRequests.id,
      employeeId: timeOffRequests.employeeId,
      employeeName: employees.name,
      typeName: timeOffTypes.name,
    })
    .from(timeOffRequests)
    .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
    .leftJoin(timeOffTypes, eq(timeOffRequests.timeOffTypeId, timeOffTypes.id))
    .where(eq(timeOffRequests.status, "DRAFT"));

  if (pendingRequests.length > 0) {
    alerts.push({
      key: `pending_time_off_${pendingRequests.length}`,
      type: "pending_time_off",
      severity: "info",
      message: `${pendingRequests.length} time off request${pendingRequests.length > 1 ? "s" : ""} awaiting approval`,
      linkTarget: "/time-off/requests",
      observedAt: now,
    });
  }

  // 3. Payslips with warnings
  const warningSlips = await db
    .select({
      payslipId: payslipWarnings.payslipId,
      warningType: payslipWarnings.warningType,
      message: payslipWarnings.message,
    })
    .from(payslipWarnings);

  const uniqueWarningPayslips = new Set(warningSlips.map((w) => w.payslipId));
  if (uniqueWarningPayslips.size > 0) {
    alerts.push({
      key: `payslip_warnings_${uniqueWarningPayslips.size}`,
      type: "payslip_warning",
      severity: "warning",
      message: `${uniqueWarningPayslips.size} payslip${uniqueWarningPayslips.size > 1 ? "s" : ""} flagged with pre-flight warnings`,
      linkTarget: "/payroll/payslips",
      observedAt: now,
    });
  }

  // 4. Attendance records missing checkout (today or recent)
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const missingCheckouts = await db
    .select({
      id: attendance.id,
      employeeName: employees.name,
      date: attendance.date,
    })
    .from(attendance)
    .leftJoin(employees, eq(attendance.employeeId, employees.id))
    .where(
      and(
        isNull(attendance.checkOut),
        gte(attendance.date, sevenDaysAgo),
        sql`${attendance.checkIn} IS NOT NULL`
      )
    );

  if (missingCheckouts.length > 0) {
    alerts.push({
      key: `missing_checkout_${missingCheckouts.length}`,
      type: "missing_checkout",
      severity: "warning",
      message: `${missingCheckouts.length} attendance record${missingCheckouts.length > 1 ? "s" : ""} missing checkout`,
      linkTarget: "/attendance",
      observedAt: now,
    });
  }

  // 5. Manual attendance corrections (recent)
  const manualCorrections = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(
      and(
        eq(attendance.isManualCorrection, true),
        gte(attendance.date, sevenDaysAgo)
      )
    );

  if (manualCorrections.length > 0) {
    alerts.push({
      key: `manual_corrections_${manualCorrections.length}`,
      type: "manual_correction",
      severity: "info",
      message: `${manualCorrections.length} manual attendance correction${manualCorrections.length > 1 ? "s" : ""} in the past 7 days`,
      linkTarget: "/attendance",
      observedAt: now,
    });
  }

  // 6. Contracts expiring within 30 days
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const expiringContracts = await db
    .select({
      id: contracts.id,
      employeeName: employees.name,
      endDate: contracts.endDate,
    })
    .from(contracts)
    .leftJoin(employees, eq(contracts.employeeId, employees.id))
    .where(
      and(
        eq(contracts.status, "ACTIVE"),
        sql`${contracts.endDate} IS NOT NULL`,
        lte(contracts.endDate, thirtyDaysOut),
        gte(contracts.endDate, today)
      )
    );

  if (expiringContracts.length > 0) {
    alerts.push({
      key: `expiring_contracts_${expiringContracts.length}`,
      type: "expiring_contract",
      severity: "warning",
      message: `${expiringContracts.length} contract${expiringContracts.length > 1 ? "s" : ""} expiring within 30 days`,
      linkTarget: "/contracts",
      observedAt: now,
    });
  }

  // 7. Payroll batches blocked by validation issues (DRAFT or COMPUTED with warnings)
  const blockedPayruns = await db
    .select({
      id: payruns.id,
      name: payruns.name,
      status: payruns.status,
    })
    .from(payruns)
    .where(
      sql`${payruns.status} IN ('DRAFT', 'COMPUTED')`
    );

  for (const pr of blockedPayruns) {
    const warningCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(payslipWarnings)
      .innerJoin(payslips, eq(payslipWarnings.payslipId, payslips.id))
      .where(eq(payslips.payrunId, pr.id));

    const count = warningCount[0]?.count ?? 0;
    if (count > 0) {
      alerts.push({
        key: `payroll_blocked_${pr.id}`,
        type: "payroll_blocked",
        severity: "critical",
        message: `Payrun "${pr.name}" has ${count} warning${count > 1 ? "s" : ""} blocking validation`,
        entityId: pr.id,
        linkTarget: `/payroll/payruns/${pr.id}`,
        observedAt: now,
      });
    }
  }

  return alerts;
}
