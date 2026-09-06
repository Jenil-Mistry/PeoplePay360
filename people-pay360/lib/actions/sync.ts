"use server";

import { db } from "@/lib/db";
import {
  employees,
  departments,
  contracts,
  workingSchedules,
  workingScheduleLines,
  attendance,
  timeOffTypes,
  timeOffAllocations,
  timeOffRequests,
  salaryStructures,
  salaryRules,
  payruns,
  payslips,
  payslipLines,
  payslipWarnings,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  Employee,
  Contract,
  WorkingSchedule,
  AttendanceRecord,
  TimeOffType,
  LeaveAllocation,
  TimeOffRequest,
  SalaryStructure,
  SalaryRule,
  Payrun,
  Payslip,
  PayslipLineItem,
} from "@/lib/types";

import { getAuthenticatedUser } from "./auth-helpers";
import { canAccessModule } from "@/lib/rbac";

/**
 * Loads the complete, live system state from Neon Database
 * formatted for the PeoplePay360 application context.
 */
export async function getInitialAppState(): Promise<{
  employees: Employee[];
  contracts: Contract[];
  schedules: WorkingSchedule[];
  attendance: AttendanceRecord[];
  timeOffTypes: TimeOffType[];
  allocations: LeaveAllocation[];
  timeOffRequests: TimeOffRequest[];
  salaryStructures: SalaryStructure[];
  salaryRules: SalaryRule[];
  payruns: Payrun[];
  payslips: Payslip[];
}> {
  try {
    const user = await getAuthenticatedUser();
    const canViewAll = canAccessModule(user.role, "employees");
    const myId = user.employeeDbId;

    const [
      dbDepts,
      dbEmps,
      dbContracts,
      dbScheds,
      dbLines,
      dbAtt,
      dbTypes,
      dbAllocations,
      dbRequests,
      dbStructures,
      dbRules,
      dbPayruns,
      dbPayslips,
      dbSlipLines,
      dbWarnings,
    ] = await Promise.all([
      db.select().from(departments),
      db.select().from(employees).where(canViewAll ? undefined : eq(employees.id, myId)),
      db.select().from(contracts).where(canViewAll ? undefined : eq(contracts.employeeId, myId)),
      db.select().from(workingSchedules),
      db.select().from(workingScheduleLines),
      db.select().from(attendance).where(canViewAll ? undefined : eq(attendance.employeeId, myId)).orderBy(desc(attendance.date)),
      db.select().from(timeOffTypes),
      db.select().from(timeOffAllocations).where(canViewAll ? undefined : eq(timeOffAllocations.employeeId, myId)),
      db.select().from(timeOffRequests).where(canViewAll ? undefined : eq(timeOffRequests.employeeId, myId)),
      db.select().from(salaryStructures),
      db.select().from(salaryRules).orderBy(salaryRules.sequence),
      db.select().from(payruns).orderBy(desc(payruns.startDate)),
      db.select().from(payslips).where(canViewAll ? undefined : eq(payslips.employeeId, myId)),
      db.select().from(payslipLines),
      db.select().from(payslipWarnings),
    ]);

    const deptMap = new Map(dbDepts.map((d) => [d.id, d.name]));
    const empMap = new Map(dbEmps.map((e) => [e.id, e]));
    const structMap = new Map(dbStructures.map((s) => [s.id, s.name]));
    const typeMap = new Map(dbTypes.map((t) => [t.id, t.name]));

    // 1. Map Employees
    const mappedEmployees: Employee[] = dbEmps.map((e) => {
      const manager = e.managerId ? empMap.get(e.managerId) : undefined;
      return {
        id: e.empId || `EMP-${e.id}`,
        name: e.name,
        workEmail: e.email,
        phone: "+91 98765 43210",
        jobPosition: e.jobPosition,
        department: (deptMap.get(e.departmentId) || "Operations") as any,
        managerId: manager ? manager.empId || `EMP-${manager.id}` : undefined,
        managerName: manager ? manager.name : undefined,
        scheduleId: `SCH-${e.workingScheduleId || 1}`,
        role: e.role,
        status: e.isActive ? "Active" : "Inactive",
        company: "PeoplePay360 Technologies Pvt Ltd",
        workLocation: "Mumbai",
        bankDetails: e.bankAccountNumber
          ? {
              bankName: e.bankName || "HDFC Bank",
              accountNumber: e.bankAccountNumber,
              ifscCode: "HDFC0000123",
            }
          : undefined,
      };
    });

    // 2. Map Contracts
    const mappedContracts: Contract[] = dbContracts.map((c) => {
      const emp = empMap.get(c.employeeId);
      return {
        id: `CON-${c.id}`,
        employeeId: emp ? emp.empId || `EMP-${emp.id}` : `EMP-${c.employeeId}`,
        employeeName: emp ? emp.name : "Employee",
        refCode: c.name.startsWith("CON/") ? c.name : `CON/2026/00${c.id}`,
        startDate: c.startDate,
        endDate: c.endDate || undefined,
        wage: parseFloat(c.wage),
        structureId: `STR-${c.salaryStructureId}`,
        status:
          c.status === "ACTIVE"
            ? "Running"
            : c.status === "EXPIRED"
              ? "Expired"
              : "Draft",
        notes: "Synchronized from Neon Database.",
      };
    });

    // 3. Map Schedules
    const dayNameMap: Record<string, any> = {
      MON: "Monday",
      TUE: "Tuesday",
      WED: "Wednesday",
      THU: "Thursday",
      FRI: "Friday",
      SAT: "Saturday",
      SUN: "Sunday",
    };

    const mappedSchedules: WorkingSchedule[] = dbScheds.map((s) => {
      const lines = dbLines.filter((l) => l.scheduleId === s.id);
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        totalWeeklyHours: s.totalWeeklyHours,
        isActive: s.isActive,
        lines: lines.map((l) => ({
          id: l.id,
          scheduleId: l.scheduleId,
          dayOfWeek: l.dayOfWeek,
          startTime: l.startTime.slice(0, 5),
          endTime: l.endTime.slice(0, 5),
          breakMinutes: l.breakMinutes,
        })),
      };
    });

    // 4. Map Attendance
    const statusMap: Record<string, any> = {
      PRESENT: "Present",
      LATE: "Late",
      ABSENT: "Absent",
      ON_LEAVE: "Absent",
      HALF_DAY: "Present",
    };

    const seenAttKeys = new Set<string>();
    const mappedAttendance: AttendanceRecord[] = [];

    // Sort descending by id so newest record per (employee, date) is retained
    const sortedAtt = [...dbAtt].sort((x, y) => y.id - x.id);

    for (const a of sortedAtt) {
      const key = `${a.employeeId}-${a.date}`;
      if (seenAttKeys.has(key)) continue;
      seenAttKeys.add(key);

      const emp = empMap.get(a.employeeId);

      const formatTime = (val: any) => {
        if (!val) return undefined;
        if (typeof val === "string") {
          const m = val.match(/(\d{2}):(\d{2})/);
          if (m) return `${m[1]}:${m[2]}`;
        }
        const d = new Date(val);
        return isNaN(d.getTime())
          ? undefined
          : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      };

      mappedAttendance.push({
        id: `ATT-${a.id}`,
        employeeId: emp ? emp.empId || `EMP-${emp.id}` : `EMP-${a.employeeId}`,
        employeeName: emp ? emp.name : "Employee",
        date: a.date,
        checkIn: formatTime(a.checkIn) || "09:00",
        checkOut: formatTime(a.checkOut),
        workedHours: parseFloat(a.workedHours || "0.00"),
        overtimeHours:
          parseFloat(a.workedHours || "0") > 8.0
            ? Number((parseFloat(a.workedHours || "0") - 8.0).toFixed(2))
            : 0.0,
        status: (() => {
          const inTime = formatTime(a.checkIn);
          if (!inTime) return "Absent";
          const [inH, inM] = inTime.split(":").map(Number);
          if (isNaN(inH) || isNaN(inM)) return statusMap[a.status] || "Present";
          const diffMinutes = inH * 60 + inM - 9 * 60;
          return diffMinutes > 10 ? "Late" : "Present";
        })(),
        isManualEdit: a.isManualCorrection,
        notes: a.notes || undefined,
      });
    }

    // 5. Map Time Off Types
    const mappedTypes: TimeOffType[] = dbTypes.map((t) => ({
      id: `TYPE-${t.id}`,
      name: t.name,
      unit: t.unit === "DAYS" ? "Days" : "Hours",
      requiresAllocation: t.requiresAllocation,
      approvalLevel: "Manager",
      color: t.name.includes("Sick")
        ? "#ef4444"
        : t.name.includes("Comp")
          ? "#f59e0b"
          : "#3b82f6",
      notes: "Policy rules configured in Neon DB.",
    }));

    // 6. Map Allocations
    const mappedAllocations: LeaveAllocation[] = dbAllocations.map((al) => {
      const emp = empMap.get(al.employeeId);
      const allocated = parseFloat(al.allocatedUnits);
      const used = parseFloat(al.usedUnits);
      return {
        id: `ALC-${al.id}`,
        employeeId: emp ? emp.empId || `EMP-${emp.id}` : `EMP-${al.employeeId}`,
        employeeName: emp ? emp.name : "Employee",
        typeId: `TYPE-${al.timeOffTypeId}`,
        typeName: typeMap.get(al.timeOffTypeId) || "Paid Time Off",
        allocatedDays: allocated,
        takenDays: used,
        remainingDays: Math.max(0, allocated - used),
        approver: "HR Manager",
        validityYear: al.validFrom.slice(0, 4),
        status:
          al.status === "APPROVED"
            ? "Approved"
            : al.status === "REJECTED"
              ? "Refused"
              : "To Approve",
      };
    });

    // 7. Map Time Off Requests
    const mappedRequests: TimeOffRequest[] = dbRequests.map((r) => {
      const emp = empMap.get(r.employeeId);
      return {
        id: `REQ-${r.id}`,
        employeeId: emp ? emp.empId || `EMP-${emp.id}` : `EMP-${r.employeeId}`,
        employeeName: emp ? emp.name : "Employee",
        typeId: `TYPE-${r.timeOffTypeId}`,
        typeName: typeMap.get(r.timeOffTypeId) || "Paid Time Off",
        startDate: r.startDate,
        endDate: r.endDate,
        durationDays: parseFloat(r.requestedUnits),
        status:
          r.status === "APPROVED"
            ? "Approved"
            : r.status === "REJECTED"
              ? "Rejected"
              : r.status === "CANCELLED"
                ? "Cancelled"
                : r.status === "DRAFT"
                  ? "Draft"
                  : "Pending",
        reason: r.notes || "Personal Leave",
        allocationId: r.allocationId ? `ALC-${r.allocationId}` : undefined,
      };
    });

    // 8. Map Salary Structures
    const mappedStructures: SalaryStructure[] = dbStructures.map((s) => {
      const structRules = dbRules.filter((r) => r.structureId === s.id);
      return {
        id: `STR-${s.id}`,
        name: s.name,
        structureType: "Employee Salary",
        ruleIds: structRules.map((r) => `RULE-${r.id}`),
        notes: "Configured salary rule package.",
      };
    });

    // 9. Map Salary Rules
    const catMap: Record<string, any> = {
      BASIC: "Basic",
      ALLOWANCE: "Allowance",
      GROSS: "Gross",
      DEDUCTION: "Deduction",
      NET: "Net",
    };

    const compMap: Record<string, any> = {
      PERCENTAGE: "percentage",
      FIXED: "fixed",
      FORMULA: "formula",
    };

    const mappedRules: SalaryRule[] = dbRules.map((r) => ({
      id: `RULE-${r.id}`,
      name: r.name,
      code: r.code,
      category: catMap[r.category] || "Allowance",
      sequence: r.sequence,
      computationType: compMap[r.computationType] || "fixed",
      percentage: r.percentage ? parseFloat(r.percentage) : undefined,
      fixedAmount: r.amount ? parseFloat(r.amount) : undefined,
      formula: r.formula || undefined,
    }));

    // 10. Map Payruns
    const mappedPayruns: Payrun[] = dbPayruns.map((pr) => {
      const slips = dbPayslips.filter((p) => p.payrunId === pr.id);
      const totalNet = slips.reduce(
        (sum, p) => sum + parseFloat(p.netSalary),
        0,
      );
      const runStatus: "Draft" | "Validated" | "Paid" =
        pr.status === "PAID"
          ? "Paid"
          : pr.status === "VALIDATED"
            ? "Validated"
            : "Draft";

      const slipIds = slips.map((s) => s.id);
      const warnings =
        runStatus === "Paid" || runStatus === "Validated"
          ? []
          : Array.from(
              new Set(
                dbWarnings
                  .filter((w) => slipIds.includes(w.payslipId))
                  .map((w) => w.message)
              )
            );

      return {
        id: `PR-${pr.id}`,
        name: pr.name,
        structureId: `STR-${pr.structureId}`,
        structureName: structMap.get(pr.structureId) || "Standard Structure",
        periodStart: pr.startDate,
        periodEnd: pr.endDate,
        status: runStatus,
        employeeIds: slips.map((p) => {
          const emp = empMap.get(p.employeeId);
          return emp ? emp.empId || `EMP-${emp.id}` : `EMP-${p.employeeId}`;
        }),
        totalEmployees: slips.length,
        totalNet,
        warnings,
        createdAt: pr.createdAt
          ? pr.createdAt.toISOString().slice(0, 10)
          : "2026-02-01",
        paidAt: pr.paidAt ? pr.paidAt.toISOString().slice(0, 10) : undefined,
      };
    });

    // 11. Map Payslips
    const mappedPayslips: Payslip[] = dbPayslips.map((ps) => {
      const emp = empMap.get(ps.employeeId);
      const pr = dbPayruns.find((r) => r.id === ps.payrunId);
      const lines = dbSlipLines.filter((l) => l.payslipId === ps.id);
      const warns = dbWarnings.filter((w) => w.payslipId === ps.id);

      const mappedLines: PayslipLineItem[] = lines.map((l) => ({
        ruleId: `RULE-${l.id}`,
        ruleName: l.ruleName,
        code: l.ruleCode,
        category: catMap[l.category] || "Allowance",
        sequence: l.sequence,
        amount: parseFloat(l.amount),
      }));

      const slipStatus: "Draft" | "Validated" | "Paid" =
        ps.status === "PAID"
          ? "Paid"
          : ps.status === "VALIDATED"
            ? "Validated"
            : "Draft";

      const basicWage = parseFloat(ps.basicWage);
      const grossSalary = parseFloat(ps.grossSalary);
      const netSalary = parseFloat(ps.netSalary);
      const deductions = grossSalary - netSalary;

      return {
        id: `PS-${ps.id}`,
        payrunId: `PR-${ps.payrunId}`,
        employeeId: emp ? emp.empId || `EMP-${emp.id}` : `EMP-${ps.employeeId}`,
        employeeName: emp ? emp.name : "Employee",
        department: emp
          ? deptMap.get(emp.departmentId) || "Operations"
          : "Operations",
        jobPosition: emp ? emp.jobPosition : "Specialist",
        period: pr ? pr.name : "Monthly",
        periodStart: pr ? pr.startDate : "2026-01-01",
        periodEnd: pr ? pr.endDate : "2026-01-31",
        workedDays: parseFloat(ps.workedDays),
        contractRef: `CON/2026/00${ps.contractId}`,
        structureName: structMap.get(ps.structureId) || "Standard Structure",
        status: slipStatus,
        lineItems: mappedLines,
        basic: basicWage,
        gross: grossSalary,
        deductions,
        net: netSalary,
        warnings: warns.map((w) => w.message),
        email: emp ? emp.email : "",
        emailSentAt: ps.emailSentAt ? ps.emailSentAt.toISOString() : null,
      };
    });

    return {
      employees: mappedEmployees,
      contracts: mappedContracts,
      schedules: mappedSchedules,
      attendance: mappedAttendance,
      timeOffTypes: mappedTypes,
      allocations: mappedAllocations,
      timeOffRequests: mappedRequests,
      salaryStructures: mappedStructures,
      salaryRules: mappedRules,
      payruns: mappedPayruns,
      payslips: mappedPayslips,
    };
  } catch (error) {
    console.error("Failed to load initial app state from Neon DB:", error);
    throw new Error("Failed to load database state.");
  }
}
