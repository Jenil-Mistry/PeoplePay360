export type EmployeeStatus = "Active" | "Inactive";

export interface Employee {
  id: string;
  name: string;
  avatar?: string;
  workEmail: string;
  privateEmail?: string;
  phone: string;
  jobPosition: string;
  department: "Finance" | "Engineering" | "HR" | "Sales" | "Operations" | "Management";
  managerId?: string;
  managerName?: string;
  scheduleId: string;
  status: EmployeeStatus;
  company: string;
  workLocation: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export type ContractStatus = "Running" | "Expired" | "Draft";

export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  refCode: string; // e.g. "CON/2026/0042"
  startDate: string;
  endDate?: string;
  wage: number; // Monthly wage
  structureId: string;
  status: ContractStatus;
  notes?: string;
}

export interface ScheduleDay {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
  breakHours: number; // e.g. 1
}

export interface WorkingSchedule {
  id: string;
  name: string;
  weeklyHours: number;
  days: ScheduleDay[];
}

export type AttendanceStatus = "Present" | "Late" | "Absent";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:mm
  checkOut?: string; // HH:mm
  workedHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  isManualEdit: boolean;
  notes?: string;
}

export interface TimeOffType {
  id: string;
  name: string; // e.g. "Paid Time Off", "Sick Leave", "Comp Off"
  unit: "Days" | "Hours";
  requiresAllocation: boolean;
  approvalLevel: "HR Officer" | "Manager" | "None";
  color: string;
  notes?: string;
}

export type AllocationStatus = "Approved" | "To Approve" | "Refused";

export interface LeaveAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  typeName: string;
  allocatedDays: number;
  takenDays: number;
  remainingDays: number;
  approver: string;
  validityYear: string; // e.g. "2026"
  status: AllocationStatus;
  description?: string;
}

export type RequestStatus = "To Approve" | "Approved" | "Refused";

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  typeId: string;
  typeName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: RequestStatus;
  reason: string;
  allocationId?: string;
}

export type RuleCategory = "Basic" | "Allowance" | "Deduction" | "Gross" | "Net";
export type ComputationType = "percentage" | "fixed" | "formula";

export interface SalaryRule {
  id: string;
  name: string;
  code: string; // e.g. "BASIC", "HRA", "GROSS", "PF", "PT", "NET"
  category: RuleCategory;
  sequence: number; // 10, 20, 30...
  computationType: ComputationType;
  percentage?: number; // e.g. 50 (50% of monthly wage)
  fixedAmount?: number;
  formula?: string; // e.g. "categories['BASIC'] + categories['HRA']"
  condition?: string;
}

export interface SalaryStructure {
  id: string;
  name: string; // e.g. "Regular Salary", "Intern Salary"
  structureType: "Employee Salary" | "Contractor" | "Intern";
  ruleIds: string[];
  notes?: string;
}

export type PayrunStatus = "Draft" | "Validated" | "Paid";

export interface Payrun {
  id: string;
  name: string; // e.g. "February 2026"
  structureId: string;
  structureName: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  status: PayrunStatus;
  employeeIds: string[];
  totalEmployees: number;
  totalNet: number;
  warnings: string[];
  createdAt: string;
  paidAt?: string;
}

export interface PayslipLineItem {
  ruleId: string;
  ruleName: string;
  code: string;
  category: RuleCategory;
  sequence: number;
  amount: number;
}

export interface Payslip {
  id: string;
  payrunId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  jobPosition: string;
  period: string; // e.g. "February 2026"
  periodStart: string;
  periodEnd: string;
  workedDays: number;
  contractRef: string;
  structureName: string;
  status: PayrunStatus;
  lineItems: PayslipLineItem[];
  basic: number;
  gross: number;
  deductions: number;
  net: number;
  warnings?: string[];
}
