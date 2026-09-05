"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
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
import { computePayslipForEmployee, getActiveContractForPeriod } from "./payroll-engine";

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

  // Mutations
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

const INITIAL_SCHEDULES: WorkingSchedule[] = [
  {
    id: "SCH-1",
    name: "Standard 40 Hours / Week",
    weeklyHours: 40,
    days: [
      { day: "Monday", startTime: "09:00", endTime: "18:00", breakHours: 1 },
      { day: "Tuesday", startTime: "09:00", endTime: "18:00", breakHours: 1 },
      { day: "Wednesday", startTime: "09:00", endTime: "18:00", breakHours: 1 },
      { day: "Thursday", startTime: "09:00", endTime: "18:00", breakHours: 1 },
      { day: "Friday", startTime: "09:00", endTime: "18:00", breakHours: 1 },
    ],
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Aarav Mehta",
    workEmail: "aarav@oxp.com",
    phone: "+91 98765 43210",
    jobPosition: "Payroll Specialist",
    department: "Finance",
    managerName: "Priya Nair",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Mumbai",
    bankDetails: {
      bankName: "HDFC Bank",
      accountNumber: "5010023458921",
      ifscCode: "HDFC0000123",
    },
  },
  {
    id: "EMP-002",
    name: "Sara Khan",
    workEmail: "sara@oxp.com",
    phone: "+91 98765 43211",
    jobPosition: "HR Officer",
    department: "HR",
    managerName: "Aarav Mehta",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Mumbai",
    bankDetails: {
      bankName: "ICICI Bank",
      accountNumber: "001205001289",
      ifscCode: "ICIC0000012",
    },
  },
  {
    id: "EMP-003",
    name: "John Dsouza",
    workEmail: "john@oxp.com",
    phone: "+91 98765 43212",
    jobPosition: "Lead Developer",
    department: "Engineering",
    managerName: "Vikram Singh",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Bengaluru",
    bankDetails: {
      bankName: "State Bank of India",
      accountNumber: "201994829104",
      ifscCode: "SBIN0001423",
    },
  },
  {
    id: "EMP-004",
    name: "Neha Patel",
    workEmail: "neha@oxp.com",
    phone: "+91 98765 43213",
    jobPosition: "Technical Recruiter",
    department: "HR",
    managerName: "Sara Khan",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Mumbai",
    bankDetails: {
      bankName: "Axis Bank",
      accountNumber: "9120100482918",
      ifscCode: "UTIB0000145",
    },
  },
  {
    id: "EMP-005",
    name: "Maria Sharan",
    workEmail: "maria@oxp.com",
    phone: "+91 98765 43214",
    jobPosition: "Operations Manager",
    department: "Operations",
    managerName: "Priya Nair",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Delhi",
    // Intentionally missing bankDetails to trigger "A/C Missing" warning!
  },
  {
    id: "EMP-006",
    name: "Rian Mander",
    workEmail: "rian@oxp.com",
    phone: "+91 98765 43215",
    jobPosition: "Enterprise Sales Lead",
    department: "Sales",
    managerName: "Adain Sanan",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Mumbai",
    // Intentionally missing bankDetails to trigger "A/C Missing" warning!
  },
  {
    id: "EMP-007",
    name: "Senaj Sharan",
    workEmail: "senaj@oxp.com",
    phone: "+91 98765 43216",
    jobPosition: "Frontend Architect",
    department: "Engineering",
    managerName: "John Dsouza",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Bengaluru",
    bankDetails: {
      bankName: "HDFC Bank",
      accountNumber: "5010049281940",
      ifscCode: "HDFC0000123",
    },
  },
  {
    id: "EMP-008",
    name: "Brindy Murtah",
    workEmail: "brindy@oxp.com",
    phone: "+91 98765 43217",
    jobPosition: "Product Analyst",
    department: "Management",
    managerName: "Vikram Singh",
    scheduleId: "SCH-1",
    status: "Active",
    company: "PeoplePay360 Technologies Pvt Ltd",
    workLocation: "Mumbai",
    bankDetails: {
      bankName: "Kotak Mahindra Bank",
      accountNumber: "4810294821",
      ifscCode: "KKBK0000452",
    },
  },
];

const INITIAL_RULES: SalaryRule[] = [
  {
    id: "RULE-10",
    name: "Basic Salary",
    code: "BASIC",
    category: "Basic",
    sequence: 10,
    computationType: "percentage",
    percentage: 50,
  },
  {
    id: "RULE-20",
    name: "House Rent Allowance",
    code: "HRA",
    category: "Allowance",
    sequence: 20,
    computationType: "percentage",
    percentage: 25,
  },
  {
    id: "RULE-30",
    name: "Standard Allowance",
    code: "STD",
    category: "Allowance",
    sequence: 30,
    computationType: "fixed",
    fixedAmount: 10000,
  },
  {
    id: "RULE-40",
    name: "Performance Bonus",
    code: "BONUS",
    category: "Allowance",
    sequence: 40,
    computationType: "fixed",
    fixedAmount: 5000,
  },
  {
    id: "RULE-50",
    name: "Gross Salary",
    code: "GROSS",
    category: "Gross",
    sequence: 50,
    computationType: "formula",
  },
  {
    id: "RULE-60",
    name: "Provident Fund",
    code: "PF",
    category: "Deduction",
    sequence: 60,
    computationType: "fixed",
    fixedAmount: 3000,
  },
  {
    id: "RULE-70",
    name: "Professional Tax",
    code: "PT",
    category: "Deduction",
    sequence: 70,
    computationType: "fixed",
    fixedAmount: 2000,
  },
  {
    id: "RULE-80",
    name: "Net Salary",
    code: "NET",
    category: "Net",
    sequence: 80,
    computationType: "formula",
  },
];

const INITIAL_STRUCTURES: SalaryStructure[] = [
  {
    id: "STR-1",
    name: "Regular Salary",
    structureType: "Employee Salary",
    ruleIds: ["RULE-10", "RULE-20", "RULE-30", "RULE-50", "RULE-60", "RULE-70", "RULE-80"],
    notes: "Default standard Indian salary structure with PF and Professional Tax.",
  },
  {
    id: "STR-2",
    name: "Executive & Bonus Salary",
    structureType: "Employee Salary",
    ruleIds: ["RULE-10", "RULE-20", "RULE-30", "RULE-40", "RULE-50", "RULE-60", "RULE-70", "RULE-80"],
    notes: "Executive grade with performance bonus included.",
  },
];

const INITIAL_CONTRACTS: Contract[] = [
  {
    id: "CON-01",
    employeeId: "EMP-001",
    employeeName: "Aarav Mehta",
    refCode: "CON/2026/0042",
    startDate: "2026-01-01",
    wage: 85000,
    structureId: "STR-1",
    status: "Running",
    notes: "Active running contract for 2026 payroll.",
  },
  {
    id: "CON-01-HIST",
    employeeId: "EMP-001",
    employeeName: "Aarav Mehta",
    refCode: "CON/2025/0018",
    startDate: "2025-07-01",
    endDate: "2025-12-31",
    wage: 78000,
    structureId: "STR-1",
    status: "Expired",
    notes: "Historical contract for 2025.",
  },
  {
    id: "CON-02",
    employeeId: "EMP-002",
    employeeName: "Sara Khan",
    refCode: "CON/2026/0031",
    startDate: "2026-01-01",
    wage: 95000,
    structureId: "STR-1",
    status: "Running",
  },
  {
    id: "CON-03",
    employeeId: "EMP-003",
    employeeName: "John Dsouza",
    refCode: "CON/2026/0055",
    startDate: "2026-01-01",
    wage: 140000,
    structureId: "STR-2",
    status: "Running",
  },
  {
    id: "CON-04",
    employeeId: "EMP-004",
    employeeName: "Neha Patel",
    refCode: "CON/2026/0022",
    startDate: "2026-01-01",
    wage: 72000,
    structureId: "STR-1",
    status: "Running",
  },
  {
    id: "CON-05",
    employeeId: "EMP-005",
    employeeName: "Maria Sharan",
    refCode: "CON/2026/0088",
    startDate: "2026-01-01",
    wage: 90000,
    structureId: "STR-1",
    status: "Running",
  },
  {
    id: "CON-06",
    employeeId: "EMP-006",
    employeeName: "Rian Mander",
    refCode: "CON/2026/0091",
    startDate: "2026-01-01",
    wage: 95000,
    structureId: "STR-1",
    status: "Running",
  },
  {
    id: "CON-07",
    employeeId: "EMP-007",
    employeeName: "Senaj Sharan",
    refCode: "CON/2026/0104",
    startDate: "2026-01-01",
    wage: 125000,
    structureId: "STR-2",
    status: "Running",
  },
  {
    id: "CON-08",
    employeeId: "EMP-008",
    employeeName: "Brindy Murtah",
    refCode: "CON/2026/0112",
    startDate: "2026-01-01",
    wage: 80000,
    structureId: "STR-1",
    status: "Running",
  },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: "ATT-1",
    employeeId: "EMP-001",
    employeeName: "Aarav Mehta",
    date: "2026-09-02",
    checkIn: "09:05",
    checkOut: "18:10",
    workedHours: 9.08,
    overtimeHours: 0.5,
    status: "Present",
    isManualEdit: false,
    notes: "On-time arrival",
  },
  {
    id: "ATT-2",
    employeeId: "EMP-001",
    employeeName: "Aarav Mehta",
    date: "2026-09-01",
    checkIn: "09:15",
    checkOut: "18:02",
    workedHours: 8.78,
    overtimeHours: 0.0,
    status: "Present",
    isManualEdit: false,
  },
  {
    id: "ATT-3",
    employeeId: "EMP-002",
    employeeName: "Sara Khan",
    date: "2026-09-02",
    checkIn: "09:32",
    checkOut: "17:58",
    workedHours: 8.43,
    overtimeHours: 0.0,
    status: "Late",
    isManualEdit: false,
    notes: "Traffic delay on Western Express Highway",
  },
  {
    id: "ATT-4",
    employeeId: "EMP-003",
    employeeName: "John Dsouza",
    date: "2026-09-02",
    checkIn: "09:00",
    checkOut: "18:30",
    workedHours: 9.5,
    overtimeHours: 0.75,
    status: "Present",
    isManualEdit: false,
  },
  {
    id: "ATT-5",
    employeeId: "EMP-005",
    employeeName: "Maria Sharan",
    date: "2026-09-02",
    checkIn: "00:00",
    checkOut: "00:00",
    workedHours: 0.0,
    overtimeHours: 0.0,
    status: "Absent",
    isManualEdit: true,
    notes: "Unplanned leave",
  },
];

const INITIAL_TIME_OFF_TYPES: TimeOffType[] = [
  {
    id: "TYPE-PTO",
    name: "Paid Time Off",
    unit: "Days",
    requiresAllocation: true,
    approvalLevel: "Manager",
    color: "#3b82f6", // Blue
    notes: "Standard annual leave balance granted at start of policy year.",
  },
  {
    id: "TYPE-SICK",
    name: "Sick Leave",
    unit: "Days",
    requiresAllocation: true,
    approvalLevel: "HR Officer",
    color: "#ef4444", // Red
    notes: "Paid medical and sick leave.",
  },
  {
    id: "TYPE-COMP",
    name: "Comp Off",
    unit: "Days",
    requiresAllocation: false,
    approvalLevel: "Manager",
    color: "#f59e0b", // Orange
    notes: "Compensatory off for weekend or holiday work.",
  },
];

const INITIAL_ALLOCATIONS: LeaveAllocation[] = [
  {
    id: "ALC-1",
    employeeId: "EMP-001",
    employeeName: "Aarav Mehta",
    typeId: "TYPE-PTO",
    typeName: "Paid Time Off",
    allocatedDays: 20,
    takenDays: 8,
    remainingDays: 12,
    approver: "Priya Nair",
    validityYear: "2026",
    status: "Approved",
    description: "Annual leave balance granted at start of policy year.",
  },
  {
    id: "ALC-2",
    employeeId: "EMP-002",
    employeeName: "Sara Khan",
    typeId: "TYPE-PTO",
    typeName: "Paid Time Off",
    allocatedDays: 18,
    takenDays: 4,
    remainingDays: 14,
    approver: "Vikram Singh",
    validityYear: "2026",
    status: "Approved",
  },
  {
    id: "ALC-3",
    employeeId: "EMP-003",
    employeeName: "John Dsouza",
    typeId: "TYPE-PTO",
    typeName: "Paid Time Off",
    allocatedDays: 20,
    takenDays: 6,
    remainingDays: 14,
    approver: "Vikram Singh",
    validityYear: "2026",
    status: "Approved",
  },
];

const INITIAL_TIME_OFF_REQUESTS: TimeOffRequest[] = [
  {
    id: "REQ-1",
    employeeId: "EMP-001",
    employeeName: "Aarav Mehta",
    typeId: "TYPE-PTO",
    typeName: "Paid Time Off",
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    durationDays: 3,
    status: "Approved",
    reason: "Family vacation to Goa",
    allocationId: "ALC-1",
  },
  {
    id: "REQ-2",
    employeeId: "EMP-002",
    employeeName: "Sara Khan",
    typeId: "TYPE-SICK",
    typeName: "Sick Leave",
    startDate: "2026-09-18",
    endDate: "2026-09-18",
    durationDays: 1,
    status: "Approved",
    reason: "Doctor consultation and rest",
  },
  {
    id: "REQ-3",
    employeeId: "EMP-003",
    employeeName: "John Dsouza",
    typeId: "TYPE-COMP",
    typeName: "Comp Off",
    startDate: "2026-09-27",
    endDate: "2026-09-27",
    durationDays: 1,
    status: "To Approve",
    reason: "Worked on client production deployment over weekend",
  },
];

const INITIAL_PAYRUNS: Payrun[] = [
  {
    id: "PR-2026-01",
    name: "January 2026",
    structureId: "STR-1",
    structureName: "Regular Salary",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    status: "Paid",
    employeeIds: ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-007", "EMP-008"],
    totalEmployees: 6,
    totalNet: 485000,
    warnings: ["1 warning: Tax exemption unverified"],
    createdAt: "2026-01-28",
    paidAt: "2026-01-31",
  },
  {
    id: "PR-2026-02",
    name: "February 2026",
    structureId: "STR-1",
    structureName: "Regular Salary",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    status: "Validated",
    employeeIds: ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005", "EMP-006", "EMP-007", "EMP-008"],
    totalEmployees: 8,
    totalNet: 642500,
    warnings: ["2 employees missing bank account", "1 duplicate payslip warning"],
    createdAt: "2026-02-25",
  },
  {
    id: "PR-2026-03",
    name: "March 2026",
    structureId: "STR-1",
    structureName: "Regular Salary",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    status: "Draft",
    employeeIds: ["EMP-001", "EMP-002", "EMP-003"],
    totalEmployees: 3,
    totalNet: 245000,
    warnings: [],
    createdAt: "2026-03-01",
  },
];

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CONTRACTS);
  const [schedules] = useState<WorkingSchedule[]>(INITIAL_SCHEDULES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [timeOffTypes] = useState<TimeOffType[]>(INITIAL_TIME_OFF_TYPES);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>(INITIAL_ALLOCATIONS);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(INITIAL_TIME_OFF_REQUESTS);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(INITIAL_STRUCTURES);
  const [salaryRules, setSalaryRules] = useState<SalaryRule[]>(INITIAL_RULES);
  const [payruns, setPayruns] = useState<Payrun[]>(INITIAL_PAYRUNS);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  // Load state from localStorage on mount (if present)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pp360_store_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.employees) setEmployees(parsed.employees);
        if (parsed.contracts) setContracts(parsed.contracts);
        if (parsed.attendance) setAttendance(parsed.attendance);
        if (parsed.allocations) setAllocations(parsed.allocations);
        if (parsed.timeOffRequests) setTimeOffRequests(parsed.timeOffRequests);
        if (parsed.salaryStructures) setSalaryStructures(parsed.salaryStructures);
        if (parsed.salaryRules) setSalaryRules(parsed.salaryRules);
        if (parsed.payruns) setPayruns(parsed.payruns);
      }
    } catch {
      // Ignore fallback
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "pp360_store_v1",
        JSON.stringify({
          employees,
          contracts,
          attendance,
          allocations,
          timeOffRequests,
          salaryStructures,
          salaryRules,
          payruns,
        })
      );
    } catch {
      // Ignore
    }
  }, [employees, contracts, attendance, allocations, timeOffRequests, salaryStructures, salaryRules, payruns]);

  // Compute all payslips for existing payruns
  useEffect(() => {
    const computed: Payslip[] = [];
    for (const pr of payruns) {
      const structure = salaryStructures.find((s) => s.id === pr.structureId) || salaryStructures[0];
      for (const empId of pr.employeeIds) {
        const emp = employees.find((e) => e.id === empId);
        if (!emp) continue;
        const contract = getActiveContractForPeriod(emp.id, contracts, pr.periodStart, pr.periodEnd) || contracts.find(c => c.employeeId === emp.id) || {
          id: `CON-TEMP-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          refCode: "CON/2026/TEMP",
          startDate: pr.periodStart,
          wage: 75000,
          structureId: structure.id,
          status: "Running" as const,
        };

        const ps = computePayslipForEmployee({
          employee: emp,
          contract,
          structure,
          rules: salaryRules,
          payrun: pr,
          workedDays: 22,
        });
        computed.push(ps);
      }
    }
    setPayslips(computed);
  }, [payruns, employees, contracts, salaryStructures, salaryRules]);

  // Actions
  const addEmployee = (data: Omit<Employee, "id">) => {
    const newEmp: Employee = {
      ...data,
      id: `EMP-00${employees.length + 1}`,
    };
    setEmployees((prev) => [newEmp, ...prev]);
    return newEmp;
  };

  const updateEmployee = (id: string, update: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const addContract = (data: Omit<Contract, "id">) => {
    const newContract: Contract = {
      ...data,
      id: `CON-${Date.now()}`,
    };
    setContracts((prev) => [newContract, ...prev]);
    return newContract;
  };

  const updateContract = (id: string, update: Partial<Contract>) => {
    setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));
  };

  const addAttendance = (data: Omit<AttendanceRecord, "id">) => {
    const newAtt: AttendanceRecord = {
      ...data,
      id: `ATT-${Date.now()}`,
    };
    setAttendance((prev) => [newAtt, ...prev]);
    return newAtt;
  };

  const updateAttendance = (id: string, update: Partial<AttendanceRecord>) => {
    setAttendance((prev) => prev.map((a) => (a.id === id ? { ...a, ...update, isManualEdit: true } : a)));
  };

  const addTimeOffRequest = (data: Omit<TimeOffRequest, "id">) => {
    const newReq: TimeOffRequest = {
      ...data,
      id: `REQ-${Date.now()}`,
    };
    setTimeOffRequests((prev) => [newReq, ...prev]);
    return newReq;
  };

  const updateTimeOffRequestStatus = (id: string, status: "Approved" | "Refused") => {
    setTimeOffRequests((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, status } : r));
      const target = prev.find((r) => r.id === id);

      // If approved and has allocation, deduct from allocation balance
      if (status === "Approved" && target) {
        setAllocations((aPrev) =>
          aPrev.map((alc) => {
            if (alc.employeeId === target.employeeId && alc.typeId === target.typeId) {
              const newTaken = alc.takenDays + target.durationDays;
              const newRemaining = Math.max(0, alc.allocatedDays - newTaken);
              return { ...alc, takenDays: newTaken, remainingDays: newRemaining };
            }
            return alc;
          })
        );
      }

      return updated;
    });
  };

  const addLeaveAllocation = (data: Omit<LeaveAllocation, "id">) => {
    const newAlloc: LeaveAllocation = {
      ...data,
      id: `ALC-${Date.now()}`,
    };
    setAllocations((prev) => [newAlloc, ...prev]);
    return newAlloc;
  };

  const createPayrunBatch = (params: {
    name: string;
    structureId: string;
    periodStart: string;
    periodEnd: string;
    selectedEmployeeIds: string[];
  }) => {
    const struct = salaryStructures.find((s) => s.id === params.structureId) || salaryStructures[0];
    const missingBankCount = params.selectedEmployeeIds.filter((empId) => {
      const emp = employees.find((e) => e.id === empId);
      return !emp?.bankDetails?.accountNumber;
    }).length;

    const warnings: string[] = [];
    if (missingBankCount > 0) {
      warnings.push(`${missingBankCount} employee${missingBankCount > 1 ? "s" : ""} missing bank account`);
    }

    const newPayrun: Payrun = {
      id: `PR-${Date.now().toString().slice(-6)}`,
      name: params.name,
      structureId: struct.id,
      structureName: struct.name,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      status: "Draft",
      employeeIds: params.selectedEmployeeIds,
      totalEmployees: params.selectedEmployeeIds.length,
      totalNet: params.selectedEmployeeIds.length * 75000,
      warnings,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setPayruns((prev) => [newPayrun, ...prev]);
    return newPayrun;
  };

  const updatePayrunStatus = (id: string, status: "Draft" | "Validated" | "Paid") => {
    setPayruns((prev) =>
      prev.map((pr) =>
        pr.id === id
          ? {
              ...pr,
              status,
              paidAt: status === "Paid" ? new Date().toISOString().split("T")[0] : pr.paidAt,
            }
          : pr
      )
    );
  };

  const recomputePayrun = (id: string) => {
    const pr = payruns.find((p) => p.id === id);
    if (!pr) return;
    const structure = salaryStructures.find((s) => s.id === pr.structureId) || salaryStructures[0];
    let total = 0;
    for (const empId of pr.employeeIds) {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) continue;
      const contract = getActiveContractForPeriod(emp.id, contracts, pr.periodStart, pr.periodEnd) || contracts[0];
      const ps = computePayslipForEmployee({
        employee: emp,
        contract,
        structure,
        rules: salaryRules,
        payrun: pr,
      });
      total += ps.net;
    }
    setPayruns((prev) => prev.map((p) => (p.id === id ? { ...p, totalNet: total } : p)));
  };

  const addSalaryStructure = (data: Omit<SalaryStructure, "id">) => {
    const newStructure: SalaryStructure = {
      ...data,
      id: `STR-${Date.now()}`,
    };
    setSalaryStructures((prev) => [...prev, newStructure]);
    return newStructure;
  };

  const addSalaryRule = (data: Omit<SalaryRule, "id">) => {
    const newRule: SalaryRule = {
      ...data,
      id: `RULE-${Date.now()}`,
    };
    setSalaryRules((prev) => [...prev, newRule]);
    return newRule;
  };

  const updateSalaryRule = (id: string, update: Partial<SalaryRule>) => {
    setSalaryRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  };

  const getEmployeeSmartCounts = useMemo(() => {
    return (employeeId: string) => {
      const empContracts = contracts.filter((c) => c.employeeId === employeeId);
      const empAttendance = attendance.filter((a) => a.employeeId === employeeId);
      const empTimeOff = timeOffRequests.filter((r) => r.employeeId === employeeId);
      return {
        contractsCount: empContracts.length,
        attendanceCount: empAttendance.length,
        timeOffCount: empTimeOff.length,
      };
    };
  }, [contracts, attendance, timeOffRequests]);

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
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}
