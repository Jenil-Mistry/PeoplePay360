"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

export const AVAILABLE_USERS: ActiveUser[] = [
  { id: "ADM-001", name: "Priya Nair", email: "admin@oxp.com", role: "ADMIN", jobPosition: "System Administrator & HR Director", avatarInitials: "PN" },
  { id: "EMP-005", name: "Vikram Singh", email: "vikram@oxp.com", role: "PAYROLL_MANAGER", jobPosition: "Payroll Operations Manager", avatarInitials: "VS" },
  { id: "EMP-001", name: "Aarav Mehta", email: "aarav@oxp.com", role: "PAYROLL_USER", jobPosition: "Payroll Specialist", avatarInitials: "AM" },
  { id: "EMP-002", name: "Sara Khan", email: "sara@oxp.com", role: "HR_MANAGER", jobPosition: "HR Officer", avatarInitials: "SK" },
  { id: "EMP-003", name: "John Dsouza", email: "john@oxp.com", role: "EMPLOYEE", jobPosition: "Lead Developer", avatarInitials: "JD" },
];

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

  // Active User / RBAC Context (Spec Section 3)
  currentUser: ActiveUser;
  setCurrentUser: (user: ActiveUser) => void;

  // Database Refresh
  refreshData: () => Promise<void>;

  // Mutations directly connected to Neon DB
  addEmployee: (emp: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addContract: (c: Omit<Contract, "id">) => Contract;
  updateContract: (id: string, c: Partial<Contract>) => void;

  addAttendance: (rec: Omit<AttendanceRecord, "id">) => AttendanceRecord;
  updateAttendance: (id: string, rec: Partial<AttendanceRecord>) => void;

  addTimeOffRequest: (req: Omit<TimeOffRequest, "id">) => TimeOffRequest;
  updateTimeOffRequestStatus: (id: string, status: "Approved" | "Refused") => void;

  addLeaveAllocation: (alloc: Omit<LeaveAllocation, "id">) => LeaveAllocation;

  createPayrunBatch: (params: {
    name: string;
    structureId: string;
    periodStart: string;
    periodEnd: string;
    selectedEmployeeIds: string[];
  }) => Payrun;
  updatePayrunStatus: (id: string, status: "Draft" | "Validated" | "Paid") => void;
  recomputePayrun: (id: string) => void;

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
  const [currentUser, setCurrentUser] = useState<ActiveUser>(AVAILABLE_USERS[0]);
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
    setIsLoading(true);
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
  const addContract = (data: Omit<Contract, "id">) => {
    const tempId = `CON-${Date.now().toString().slice(-4)}`;
    const optimisticContract: Contract = { ...data, id: tempId };
    setContracts((prev) => [optimisticContract, ...prev]);

    createContractAction({
      employeeId: data.employeeId,
      refCode: data.refCode,
      startDate: data.startDate,
      endDate: data.endDate,
      wage: data.wage,
      status: data.status,
      structureId: data.structureId,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB contract creation failed:", err));

    return optimisticContract;
  };

  const updateContract = (id: string, update: Partial<Contract>) => {
    setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));

    updateContractAction(id, update)
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB contract update failed:", err));
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

  const updateTimeOffRequestStatus = (id: string, status: "Approved" | "Refused") => {
    setTimeOffRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

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
  const createPayrunBatch = (params: {
    name: string;
    structureId: string;
    periodStart: string;
    periodEnd: string;
    selectedEmployeeIds: string[];
  }) => {
    const tempId = `PR-${Date.now().toString().slice(-4)}`;
    const optimisticPayrun: Payrun = {
      id: tempId,
      name: params.name,
      structureId: params.structureId,
      structureName: "Salary Structure",
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      status: "Draft",
      employeeIds: params.selectedEmployeeIds,
      totalEmployees: params.selectedEmployeeIds.length,
      totalNet: 0,
      warnings: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setPayruns((prev) => [optimisticPayrun, ...prev]);

    createPayrunBatchAction({
      name: params.name,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      structureId: params.structureId,
      selectedEmployeeIds: params.selectedEmployeeIds,
    })
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB payrun batch creation failed:", err));

    return optimisticPayrun;
  };

  const updatePayrunStatus = (id: string, status: "Draft" | "Validated" | "Paid") => {
    setPayruns((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

    const action =
      status === "Validated"
        ? validatePayrunAction(id)
        : status === "Paid"
        ? markPayrunPaidAction(id)
        : Promise.resolve({ success: true });

    action
      .then(() => refreshData())
      .catch((err) => console.error(`Neon DB payrun status update to ${status} failed:`, err));
  };

  const recomputePayrun = (id: string) => {
    computePayrunBatchAction(id)
      .then(() => refreshData())
      .catch((err) => console.error("Neon DB payrun recomputation failed:", err));
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
        setCurrentUser,
        refreshData,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addContract,
        updateContract,
        addAttendance,
        updateAttendance,
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
