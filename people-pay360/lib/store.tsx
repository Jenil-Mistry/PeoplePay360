"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Employee,
  Contract,
  WorkingSchedule,
  AttendanceRecord,
  AttendanceStatus,
  TimeOffType,
  LeaveAllocation,
  TimeOffRequest,
  SalaryStructure,
  SalaryRule,
  Payrun,
  Payslip,
} from "./types";
import { getInitialAppState } from "./actions/sync";
import {
  createEmployee as createEmployeeAction,
  updateEmployee as updateEmployeeAction,
  deleteEmployee as deleteEmployeeAction,
} from "./actions/employees";
import {
  createContract as createContractAction,
  updateContract as updateContractAction,
} from "./actions/contracts";
import {
  logAttendance as logAttendanceAction,
  correctAttendance as correctAttendanceAction,
  recordCheckIn as recordCheckInAction,
  recordCheckOut as recordCheckOutAction,
} from "./actions/attendance";
import {
  createTimeOffRequest as createTimeOffRequestAction,
  approveTimeOffRequest as approveTimeOffRequestAction,
  refuseTimeOffRequest as refuseTimeOffRequestAction,
  createTimeOffAllocation as createTimeOffAllocationAction,
} from "./actions/time-off";
import {
  createPayrunBatch as createPayrunBatchAction,
  computePayrunBatch as computePayrunBatchAction,
  validatePayrun as validatePayrunAction,
  markPayrunPaid as markPayrunPaidAction,
  createSalaryStructure as createSalaryStructureAction,
  createSalaryRule as createSalaryRuleAction,
  updateSalaryRule as updateSalaryRuleAction,
} from "./actions/payroll";

export type UserRole = "EMPLOYEE" | "HR_MANAGER" | "PAYROLL_USER" | "PAYROLL_MANAGER" | "ADMIN";

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jobPosition: string;
  avatarInitials: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface AppState {
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
  isLoading: boolean;

  // Active User / RBAC Context (Session-based)
  currentUser: ActiveUser;

  // Database Refresh
  refreshData: () => Promise<void>;

  // Mutations directly connected to Neon DB
  addEmployee: (emp: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addContract: (c: Omit<Contract, "id"> & { workingScheduleId?: number }) => Promise<{ success: boolean; contract?: Contract; error?: string }>;
  updateContract: (id: string, c: Partial<Contract>) => Promise<{ success: boolean; error?: string }>;

  addAttendance: (rec: Omit<AttendanceRecord, "id">) => AttendanceRecord;
  updateAttendance: (id: string, rec: Partial<AttendanceRecord>) => void;
  checkInEmployee: (params: {
    employeeId: string;
    employeeName?: string;
    date?: string;
    checkInTime?: string;
    scheduledTime?: string;
    status?: AttendanceStatus;
    notes?: string;
  }) => AttendanceRecord;
  checkOutEmployee: (params: {
    recordId?: string;
    employeeId?: string;
    date?: string;
    checkOutTime?: string;
    notes?: string;
  }) => AttendanceRecord | null;

  addTimeOffRequest: (req: Omit<TimeOffRequest, "id">) => TimeOffRequest;
  updateTimeOffRequestStatus: (id: string, status: "Approved" | "Rejected" | "Cancelled") => void;

  addLeaveAllocation: (alloc: Omit<LeaveAllocation, "id">) => LeaveAllocation;

  createPayrunBatch: (params: {
    name: string;
    structureId: string;
    periodStart: string;
    periodEnd: string;
    selectedEmployeeIds: string[];
  }) => Promise<{ success: boolean; payrunId?: number | string; error?: string }>;
  updatePayrunStatus: (
    id: string,
    status: "Draft" | "Validated" | "Paid"
  ) => Promise<{ success: boolean; error?: string }>;
  recomputePayrun: (id: string) => Promise<{ success: boolean; error?: string }>;

  addSalaryStructure: (s: Omit<SalaryStructure, "id">) => SalaryStructure;
  addSalaryRule: (r: Omit<SalaryRule, "id">) => SalaryRule;
  updateSalaryRule: (id: string, r: Partial<SalaryRule>) => void;

  // Convenience queries
  getEmployeeSmartCounts: (employeeId: string) => {
    contractsCount: number;
    attendanceCount: number;
    timeOffCount: number;
  };
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // Derive currentUser from NextAuth session
  const currentUser: ActiveUser = useMemo(() => {
    if (session?.user) {
      return {
        id: (session.user as unknown as Record<string, unknown>).empId as string || session.user.id || "UNKNOWN",
        name: session.user.name || "User",
        email: session.user.email || "",
        role: ((session.user as unknown as Record<string, unknown>).role as UserRole) || "EMPLOYEE",
        jobPosition: ((session.user as unknown as Record<string, unknown>).jobPosition as string) || "Employee",
        avatarInitials: getInitials(session.user.name || "U"),
      };
    }
    // Fallback for unauthenticated / loading state
    return {
      id: "GUEST",
      name: "Guest",
      email: "",
      role: "EMPLOYEE" as UserRole,
      jobPosition: "",
      avatarInitials: "G",
    };
  }, [session]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [timeOffTypes, setTimeOffTypes] = useState<TimeOffType[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [salaryRules, setSalaryRules] = useState<SalaryRule[]>([]);
  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state directly from Neon PostgreSQL
  const refreshData = async () => {
    try {
      const live = await getInitialAppState();
      if (live.employees) setEmployees(live.employees);
      if (live.contracts) setContracts(live.contracts);
      if (live.schedules) setSchedules(live.schedules);
      if (live.attendance) setAttendance(live.attendance);
      if (live.timeOffTypes) setTimeOffTypes(live.timeOffTypes);
      if (live.allocations) setAllocations(live.allocations);
      if (live.timeOffRequests) setTimeOffRequests(live.timeOffRequests);
      if (live.salaryStructures) setSalaryStructures(live.salaryStructures);
      if (live.salaryRules) setSalaryRules(live.salaryRules);
      if (live.payruns) setPayruns(live.payruns);
      if (live.payslips) setPayslips(live.payslips);
    } catch (err) {
      console.error("Failed to load initial app state from Neon DB:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData().finally(() => setIsLoading(false));
  }, []);

  // 1. Employee Mutations -> Neon DB
  const addEmployee = (data: Omit<Employee, "id">) => {
    const tempId = `EMP-${Date.now().toString().slice(-4)}`;
    const optimisticEmp: Employee = { ...data, id: tempId };
    setEmployees((prev) => [optimisticEmp, ...prev]);

    createEmployeeAction({
      name: data.name,
      workEmail: data.workEmail,
      jobPosition: data.jobPosition,
      department: data.department,
      bankDetails: data.bankDetails,
      employeeType: "FULL_TIME",
      workingScheduleId: data.scheduleId ? parseInt(data.scheduleId.replace(/\D/g, ""), 10) : 1,
    })
      .then((res) => {
        if (res.success) {
          refreshData();
        }
      })
      .catch((err) => console.error("Neon DB employee creation failed:", err));

    return optimisticEmp;
  };

  const updateEmployee = (id: string, update: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));

    updateEmployeeAction(id, update)
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB employee update failed:", err));
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));

    deleteEmployeeAction(id)
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB employee delete failed:", err));
  };

  // 2. Contract Mutations -> Neon DB
  const addContract = async (
    data: Omit<Contract, "id"> & { workingScheduleId?: number }
  ): Promise<{ success: boolean; contract?: Contract; error?: string }> => {
    const tempId = `CON-${Date.now().toString().slice(-4)}`;
    const optimisticContract: Contract = { ...data, id: tempId };
    setContracts((prev) => [optimisticContract, ...prev]);

    try {
      const res = await createContractAction({
        employeeId: data.employeeId,
        refCode: data.refCode,
        startDate: data.startDate,
        endDate: data.endDate,
        wage: data.wage,
        status: data.status,
        structureId: data.structureId,
        workingScheduleId: data.workingScheduleId,
      });

      if (!res.success) {
        console.error("Neon DB contract creation failed:", res.error);
        setContracts((prev) => prev.filter((c) => c.id !== tempId));
        return { success: false, error: res.error || "Failed to create contract" };
      }

      await refreshData();
      return { success: true, contract: optimisticContract };
    } catch (err: any) {
      console.error("Neon DB contract creation failed:", err);
      setContracts((prev) => prev.filter((c) => c.id !== tempId));
      return { success: false, error: err.message || "Failed to create contract" };
    }
  };

  const updateContract = async (
    id: string,
    update: Partial<Contract>
  ): Promise<{ success: boolean; error?: string }> => {
    const previous = contracts;
    setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));

    try {
      const res = await updateContractAction(id, update);
      if (!res.success) {
        console.error("Neon DB contract update failed:", res.error);
        setContracts(previous);
        return { success: false, error: res.error || "Failed to update contract" };
      }
      await refreshData();
      return { success: true };
    } catch (err: any) {
      console.error("Neon DB contract update failed:", err);
      setContracts(previous);
      return { success: false, error: err.message || "Failed to update contract" };
    }
  };

  // 3. Attendance Mutations -> Neon DB
  const addAttendance = (data: Omit<AttendanceRecord, "id">) => {
    const tempId = `ATT-${Date.now().toString().slice(-4)}`;
    const optimisticAtt: AttendanceRecord = { ...data, id: tempId };
    setAttendance((prev) => [optimisticAtt, ...prev]);

    logAttendanceAction({
      employeeId: data.employeeId,
      date: data.date,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      workedHours: data.workedHours,
      status: data.status,
      isManualEdit: data.isManualEdit,
      notes: data.notes,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB attendance creation failed:", err));

    return optimisticAtt;
  };

  const updateAttendance = (id: string, update: Partial<AttendanceRecord>) => {
    setAttendance((prev) => prev.map((a) => (a.id === id ? { ...a, ...update, isManualEdit: true } : a)));

    correctAttendanceAction(id, {
      checkIn: update.checkIn,
      checkOut: update.checkOut,
      workedHours: update.workedHours,
      status: update.status,
      notes: update.notes,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB attendance correction failed:", err));
  };

  const checkInEmployee = (params: {
    employeeId: string;
    employeeName?: string;
    date?: string;
    checkInTime?: string;
    scheduledTime?: string;
    status?: AttendanceStatus;
    notes?: string;
  }) => {
    const today = params.date || new Date().toISOString().split("T")[0];
    const nowTime =
      params.checkInTime ||
      `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    const emp = employees.find((e) => e.id === params.employeeId);
    const empName = params.employeeName || (emp ? emp.name : "Employee");

    const existing = attendance.find((a) => a.employeeId === params.employeeId && a.date === today);
    if (existing) {
      updateAttendance(existing.id, {
        checkIn: nowTime,
        status: params.status || existing.status || "Present",
        notes: params.notes || "Check-in recorded.",
      });
      return existing;
    }

    const tempId = `ATT-${Date.now().toString().slice(-4)}`;
    const optimisticRecord: AttendanceRecord = {
      id: tempId,
      employeeId: params.employeeId,
      employeeName: empName,
      date: today,
      checkIn: nowTime,
      workedHours: 0,
      overtimeHours: 0,
      status: params.status || "Present",
      isManualEdit: false,
      notes: params.notes || "Live punch clock check-in.",
    };

    setAttendance((prev) => [
      optimisticRecord,
      ...prev.filter((a) => !(a.employeeId === params.employeeId && a.date === today)),
    ]);

    recordCheckInAction({
      employeeId: params.employeeId,
      date: today,
      checkInTime: nowTime,
      notes: params.notes,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Check-in action error:", err));

    return optimisticRecord;
  };

  const checkOutEmployee = (params: {
    recordId?: string;
    employeeId?: string;
    date?: string;
    checkOutTime?: string;
    notes?: string;
  }) => {
    const today = params.date || new Date().toISOString().split("T")[0];
    const nowTime =
      params.checkOutTime ||
      `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

    const record = params.recordId
      ? attendance.find((a) => a.id === params.recordId)
      : attendance.find((a) => a.employeeId === params.employeeId && a.date === today);

    if (!record) return null;

    let worked = 0;
    let ot = 0;
    if (record.checkIn) {
      const [inH, inM] = record.checkIn.split(":").map(Number);
      const [outH, outM] = nowTime.split(":").map(Number);
      let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      const hours = Math.max(0, diffMinutes / 60);
      worked = Number(hours.toFixed(2));
      ot = worked > 8.0 ? Number((worked - 8.0).toFixed(2)) : 0;
    }

    const updatedRecord: AttendanceRecord = {
      ...record,
      checkOut: nowTime,
      workedHours: worked,
      overtimeHours: ot,
      notes: params.notes || record.notes || `Checked out at ${nowTime}.`,
    };

    setAttendance((prev) => prev.map((a) => (a.id === record.id ? updatedRecord : a)));

    recordCheckOutAction({
      recordId: record.id.startsWith("ATT-") ? record.id.replace("ATT-", "") : record.id,
      employeeId: record.employeeId,
      date: record.date,
      checkOutTime: nowTime,
      notes: params.notes,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Check-out action error:", err));

    return updatedRecord;
  };

  // 4. Time Off Mutations -> Neon DB
  const addTimeOffRequest = (data: Omit<TimeOffRequest, "id">) => {
    const tempId = `REQ-${Date.now().toString().slice(-4)}`;
    const optimisticReq: TimeOffRequest = { ...data, id: tempId };
    setTimeOffRequests((prev) => [optimisticReq, ...prev]);

    createTimeOffRequestAction({
      employeeId: data.employeeId,
      typeId: data.typeId,
      startDate: data.startDate,
      endDate: data.endDate,
      durationDays: data.durationDays,
      reason: data.reason,
      allocationId: data.allocationId,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB time off request creation failed:", err));

    return optimisticReq;
  };

  const updateTimeOffRequestStatus = (id: string, status: "Approved" | "Rejected" | "Cancelled") => {
    setTimeOffRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

    // For now we map both Rejected and Cancelled to the refuse action, or skip if needed.
    // The spec requires 'refuseTimeOffRequestAction' to handle the DB update.
    const action = status === "Approved" ? approveTimeOffRequestAction(id) : refuseTimeOffRequestAction(id);
    action
      .then(() => refreshData())
      .catch((err) => console.error(`Neon DB time off status update to ${status} failed:`, err));
  };

  const addLeaveAllocation = (data: Omit<LeaveAllocation, "id">) => {
    const tempId = `ALC-${Date.now().toString().slice(-4)}`;
    const optimisticAlloc: LeaveAllocation = { ...data, id: tempId };
    setAllocations((prev) => [optimisticAlloc, ...prev]);

    createTimeOffAllocationAction({
      employeeId: data.employeeId,
      typeId: data.typeId,
      allocatedDays: data.allocatedDays,
      validityYear: data.validityYear,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB allocation creation failed:", err));

    return optimisticAlloc;
  };

  // 5. Payrun Batch Mutations -> Neon DB
  const createPayrunBatch = async (params: {
    name: string;
    structureId: string;
    periodStart: string;
    periodEnd: string;
    selectedEmployeeIds: string[];
  }): Promise<{ success: boolean; payrunId?: number | string; error?: string }> => {
    try {
      const res = await createPayrunBatchAction({
        name: params.name,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        structureId: params.structureId,
        selectedEmployeeIds: params.selectedEmployeeIds,
      });

      if (!res.success) {
        console.error("Neon DB payrun batch creation failed:", res.error);
        return { success: false, error: res.error || "Failed to create payrun batch" };
      }

      await refreshData();
      return { success: true, payrunId: res.payrunId };
    } catch (err: any) {
      console.error("Neon DB payrun batch creation failed:", err);
      return { success: false, error: err.message || "Failed to create payrun batch" };
    }
  };

  const updatePayrunStatus = async (
    id: string,
    status: "Draft" | "Validated" | "Paid"
  ): Promise<{ success: boolean; error?: string }> => {
    const previous = payruns;
    setPayruns((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

    try {
      const res =
        status === "Validated"
          ? await validatePayrunAction(id)
          : status === "Paid"
            ? await markPayrunPaidAction(id)
            : { success: true };

      if (!res.success) {
        console.error(`Neon DB payrun status update to ${status} failed:`, res.error);
        setPayruns(previous);
        return { success: false, error: res.error || `Failed to update status to ${status}` };
      }

      await refreshData();
      return { success: true };
    } catch (err: any) {
      console.error(`Neon DB payrun status update to ${status} failed:`, err);
      setPayruns(previous);
      return { success: false, error: err.message || `Failed to update status to ${status}` };
    }
  };

  const recomputePayrun = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await computePayrunBatchAction(id);
      if (!res.success) {
        console.error("Neon DB payrun recomputation failed:", res.error);
        return { success: false, error: res.error || "Failed to recompute payrun" };
      }

      await refreshData();
      return { success: true };
    } catch (err: any) {
      console.error("Neon DB payrun recomputation failed:", err);
      return { success: false, error: err.message || "Failed to recompute payrun" };
    }
  };

  // 6. Salary Structure & Rule Mutations -> Neon DB
  const addSalaryStructure = (data: Omit<SalaryStructure, "id">) => {
    const tempId = `STR-${Date.now().toString().slice(-4)}`;
    const optimisticStruct: SalaryStructure = { ...data, id: tempId };
    setSalaryStructures((prev) => [...prev, optimisticStruct]);

    createSalaryStructureAction({
      name: data.name,
      notes: data.notes,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB salary structure creation failed:", err));

    return optimisticStruct;
  };

  const addSalaryRule = (data: Omit<SalaryRule, "id">) => {
    const tempId = `RULE-${Date.now().toString().slice(-4)}`;
    const optimisticRule: SalaryRule = { ...data, id: tempId };
    setSalaryRules((prev) => [...prev, optimisticRule]);

    createSalaryRuleAction({
      name: data.name,
      code: data.code,
      category: data.category,
      sequence: data.sequence,
      computationType: data.computationType,
      fixedAmount: data.fixedAmount,
      percentage: data.percentage,
      formula: data.formula,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB salary rule creation failed:", err));

    return optimisticRule;
  };

  const updateSalaryRule = (id: string, update: Partial<SalaryRule>) => {
    setSalaryRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));

    updateSalaryRuleAction(id, update)
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB salary rule update failed:", err));
  };

  const getEmployeeSmartCounts = (employeeId: string) => {
    const empContracts = contracts.filter((c) => c.employeeId === employeeId);
    const empAttendance = attendance.filter((a) => a.employeeId === employeeId);
    const empTimeOff = timeOffRequests.filter((r) => r.employeeId === employeeId);

    return {
      contractsCount: empContracts.length,
      attendanceCount: empAttendance.length,
      timeOffCount: empTimeOff.length,
    };
  };

  return (
    <AppContext.Provider
      value={{
        employees,
        contracts,
        schedules,
        attendance,
        timeOffTypes,
        allocations,
        timeOffRequests,
        salaryStructures,
        salaryRules,
        payruns,
        payslips,
        isLoading,
        currentUser,
        refreshData,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addContract,
        updateContract,
        addAttendance,
        updateAttendance,
        checkInEmployee,
        checkOutEmployee,
        addTimeOffRequest,
        updateTimeOffRequestStatus,
        addLeaveAllocation,
        createPayrunBatch,
        updatePayrunStatus,
        recomputePayrun,
        addSalaryStructure,
        addSalaryRule,
        updateSalaryRule,
        getEmployeeSmartCounts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}
