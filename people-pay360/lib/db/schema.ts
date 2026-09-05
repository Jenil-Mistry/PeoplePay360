import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  time,
  pgEnum,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

/* ============================================================
   ENUMS
   ============================================================ */

export const roleEnum = pgEnum("user_role", [
  "EMPLOYEE",
  "HR_MANAGER",
  "PAYROLL_USER",
  "PAYROLL_MANAGER",
  "ADMIN",
]);

export const employeeTypeEnum = pgEnum("employee_type", [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "INTERN",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "DRAFT",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
]);

export const timeOffUnitEnum = pgEnum("time_off_unit", ["DAYS", "HOURS"]);

// Reused for both allocation approval and request approval workflows
export const timeOffStatusEnum = pgEnum("time_off_status", [
  "DRAFT",
  "APPROVED",
  "REFUSED",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "LATE",
  "ABSENT",
  "ON_LEAVE",
  "HALF_DAY",
]);

// Reused for both Payrun lifecycle and (per-employee) Payslip lifecycle
export const payrunStatusEnum = pgEnum("payrun_status", [
  "DRAFT",
  "COMPUTED",
  "VALIDATED",
  "PAID",
]);

export const ruleCategoryEnum = pgEnum("rule_category", [
  "BASIC",
  "ALLOWANCE",
  "GROSS",
  "DEDUCTION",
  "NET",
]);

// FORMULA added: spec explicitly requires fixed / percentage / formula
export const computationTypeEnum = pgEnum("computation_type", [
  "FIXED",
  "PERCENTAGE",
  "FORMULA",
]);

/* ============================================================
   A) LOOKUP / ORG DATA
   ============================================================ */

// Normalized so department names stay consistent across employees,
// contracts, and dashboard groupings (previously free-text varchar
// duplicated in two places with no shared source of truth).
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
});

/* ============================================================
   A3) Working Schedule Setup — entirely missing in original schema
   ============================================================ */

export const workingSchedules = pgTable("working_schedules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // e.g. "STANDARD", "SHIFT", "FLEXIBLE"
  // Derived/cached from workingScheduleLines — recompute in app logic
  // whenever lines change. Not directly user-editable.
  totalWeeklyHours: decimal("total_weekly_hours", {
    precision: 5,
    scale: 2,
  })
    .default("0.00")
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const workingScheduleLines = pgTable("working_schedule_lines", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id")
    .references(() => workingSchedules.id)
    .notNull(),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  breakMinutes: integer("break_minutes").default(0).notNull(),
});

/* ============================================================
   1. Employee Master Table
   ============================================================ */

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  empId: varchar("emp_id", { length: 255 }).notNull().unique(), // Auth Provider Link
  name: varchar("name", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: roleEnum("role").default("EMPLOYEE").notNull(),
  departmentId: integer("department_id")
    .references(() => departments.id)
    .notNull(),
  jobPosition: varchar("job_position", { length: 40 }).notNull(),
  // Self-reference: Drizzle requires a callback with an explicit return
  // type here since the table is still being defined.
  managerId: integer("manager_id").references((): AnyPgColumn => employees.id),
  employeeType: employeeTypeEnum("employee_type")
    .default("FULL_TIME")
    .notNull(), // needed for Dashboard "Employee Type" filter
  workingScheduleId: integer("working_schedule_id").references(
    () => workingSchedules.id,
  ),
  bankAccountNumber: varchar("bank_account_number", { length: 30 }),
  bankName: varchar("bank_name", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ============================================================
   2. Historical Contract Management Table
   ============================================================ */

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Software Engineer - 2026 Contract"
  // Snapshotted here (not just on employees) because department/position
  // can change contract-to-contract and payroll must reflect the terms
  // that were active for the period — the spec calls this out explicitly.
  departmentId: integer("department_id")
    .references(() => departments.id)
    .notNull(),
  jobPosition: varchar("job_position", { length: 40 }).notNull(),
  workingScheduleId: integer("working_schedule_id").references(
    () => workingSchedules.id,
  ),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // NULL indicates ongoing active contract
  wage: decimal("wage", { precision: 12, scale: 2 }).notNull(), // Basic Monthly Salary
  status: contractStatusEnum("status").default("DRAFT").notNull(),
  salaryStructureId: integer("salary_structure_id")
    .references(() => salaryStructures.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   3. Time Off: Types, Allocations, Requests
   ============================================================ */

// Was missing entirely — leaveType was a bare varchar on both
// allocations and requests, with nowhere to define policy.
export const timeOffTypes = pgTable("time_off_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // "Paid Leave", "Sick Leave"
  unit: timeOffUnitEnum("unit").default("DAYS").notNull(),
  requiresAllocation: boolean("requires_allocation").default(true).notNull(),
  includeInPayroll: boolean("include_in_payroll").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const timeOffAllocations = pgTable("time_off_allocations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id)
    .notNull(),
  timeOffTypeId: integer("time_off_type_id")
    .references(() => timeOffTypes.id)
    .notNull(),
  allocatedUnits: decimal("allocated_units", {
    precision: 5,
    scale: 2,
  }).notNull(),
  usedUnits: decimal("used_units", { precision: 5, scale: 2 })
    .default("0.00")
    .notNull(),
  // Allocations require their own approval before the balance is usable —
  // this status was missing in the original (only requests had one).
  status: timeOffStatusEnum("status").default("DRAFT").notNull(),
  approvedBy: integer("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
});

export const timeOffRequests = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id)
    .notNull(),
  timeOffTypeId: integer("time_off_type_id")
    .references(() => timeOffTypes.id)
    .notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  requestedUnits: decimal("requested_units", {
    precision: 5,
    scale: 2,
  }).notNull(),
  status: timeOffStatusEnum("status").default("DRAFT").notNull(),
  // Which balance this request draws down — needed for audit trail of
  // "approved requests automatically deduct from assigned allocations".
  allocationId: integer("allocation_id").references(
    () => timeOffAllocations.id,
  ),
  approvedBy: integer("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
});

/* ============================================================
   4. Salary Rules & Engine Architecture
   ============================================================ */

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Regular Full-Time Structure"
  isActive: boolean("is_active").default(true).notNull(),
});

export const salaryRules = pgTable("salary_rules", {
  id: serial("id").primaryKey(),
  structureId: integer("structure_id")
    .references(() => salaryStructures.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(), // e.g., "BASIC", "HRA", "TAX"
  category: ruleCategoryEnum("category").notNull(),
  sequence: integer("sequence").notNull(), // CRITICAL: determines calculation order
  computationType: computationTypeEnum("computation_type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }), // used when FIXED
  percentage: decimal("percentage", { precision: 5, scale: 2 }), // used when PERCENTAGE
  baseCode: varchar("base_code", { length: 50 }), // referenced code for PERCENTAGE
  // Was entirely missing — spec explicitly requires formula-based rules
  // (e.g. "BASIC * 0.1 + HRA"). Evaluate with a safe expression parser
  // (e.g. mathjs), never a raw eval.
  formula: text("formula"),
  isActive: boolean("is_active").default(true).notNull(),
});

/* ============================================================
   5. Attendance — entirely missing in original schema
   ============================================================ */

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id)
    .notNull(),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"), // NULL == missing checkout, per dashboard spec
  workedHours: decimal("worked_hours", { precision: 5, scale: 2 }),
  status: attendanceStatusEnum("status").default("PRESENT").notNull(),
  isOvertime: boolean("is_overtime").default(false).notNull(),
  isManualCorrection: boolean("is_manual_correction").default(false).notNull(),
  correctedBy: integer("corrected_by").references(() => employees.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   6. Payrun Batch & Payslip Execution Tables
   ============================================================ */

export const payruns = pgTable("payruns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "August 2026 Payroll"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  structureId: integer("structure_id")
    .references(() => salaryStructures.id)
    .notNull(),
  status: payrunStatusEnum("status").default("DRAFT").notNull(),
  computedAt: timestamp("computed_at"),
  validatedAt: timestamp("validated_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payslips = pgTable("payslips", {
  id: serial("id").primaryKey(),
  payrunId: integer("payrun_id")
    .references(() => payruns.id)
    .notNull(),
  employeeId: integer("employee_id")
    .references(() => employees.id)
    .notNull(),
  contractId: integer("contract_id")
    .references(() => contracts.id)
    .notNull(),
  // Snapshot of the structure actually used (== payrun.structureId at
  // computation time) so this row stays self-describing for reporting
  // without an extra join, and stays historically accurate even if the
  // payrun record is later touched.
  structureId: integer("structure_id")
    .references(() => salaryStructures.id)
    .notNull(),
  // Missing in the original — spec explicitly lists "Worked Days" as a
  // key attribute shown on the payslip screen.
  workedDays: decimal("worked_days", { precision: 5, scale: 2 })
    .default("0.00")
    .notNull(),
  basicWage: decimal("basic_wage", { precision: 12, scale: 2 }).notNull(),
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),
  hasWarnings: boolean("has_warnings").default(false).notNull(), // fast list-view flag
  status: payrunStatusEnum("status").default("DRAFT").notNull(),
  emailSentAt: timestamp("email_sent_at"), // tracks bulk "Send Payslips" delivery
});

export const payslipLines = pgTable("payslip_lines", {
  id: serial("id").primaryKey(),
  payslipId: integer("payslip_id")
    .references(() => payslips.id)
    .notNull(),
  sequence: integer("sequence").notNull(), // preserves rule execution order for display
  ruleCode: varchar("rule_code", { length: 50 }).notNull(),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  category: ruleCategoryEnum("category").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

// Replaces the single warningMessage text field so multiple distinct
// issues (missing bank details, duplicate payslip, contract gap, etc.)
// can be surfaced and filtered individually, as the dashboard requires.
export const payslipWarnings = pgTable("payslip_warnings", {
  id: serial("id").primaryKey(),
  payslipId: integer("payslip_id")
    .references(() => payslips.id)
    .notNull(),
  warningType: varchar("warning_type", { length: 50 }).notNull(), // e.g. "MISSING_BANK_DETAILS"
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   RECOMMENDED INDEXES & CONSTRAINTS
   ------------------------------------------------------------
   Drizzle's index()/uniqueIndex() third-argument callback syntax has
   changed across versions (object-return vs array-return), so rather
   than guess wrong for your installed version, apply these as a
   migration once you've confirmed the syntax your version expects:

   -- one ACTIVE, open-ended contract per employee at a time
   CREATE UNIQUE INDEX one_active_contract_per_employee
     ON contracts (employee_id)
     WHERE status = 'ACTIVE' AND end_date IS NULL;

   -- one attendance record per employee per day
   CREATE UNIQUE INDEX one_attendance_per_employee_per_day
     ON attendance (employee_id, date);

   -- rule codes must be unique within a structure (baseCode depends on this)
   CREATE UNIQUE INDEX unique_rule_code_per_structure
     ON salary_rules (structure_id, code);

   -- common FK lookup paths
   CREATE INDEX ON contracts (employee_id);
   CREATE INDEX ON payslips (payrun_id);
   CREATE INDEX ON payslips (employee_id);
   CREATE INDEX ON payslip_lines (payslip_id);
   CREATE INDEX ON time_off_requests (employee_id, status);
   CREATE INDEX ON time_off_allocations (employee_id, time_off_type_id);

   Also worth a CHECK constraint (add via raw SQL or drizzle's check()
   if your version supports it) enforcing that salary_rules has amount
   set when computation_type = 'FIXED', percentage (+ base_code) set
   when 'PERCENTAGE', and formula set when 'FORMULA'.
   ============================================================ */
