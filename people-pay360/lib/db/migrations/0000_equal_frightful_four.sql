CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'HALF_DAY');--> statement-breakpoint
CREATE TYPE "public"."computation_type" AS ENUM('FIXED', 'PERCENTAGE', 'FORMULA');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');--> statement-breakpoint
CREATE TYPE "public"."employee_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN');--> statement-breakpoint
CREATE TYPE "public"."payrun_status" AS ENUM('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('EMPLOYEE', 'HR_MANAGER', 'PAYROLL_USER', 'PAYROLL_MANAGER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."rule_category" AS ENUM('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET');--> statement-breakpoint
CREATE TYPE "public"."time_off_status" AS ENUM('DRAFT', 'APPROVED', 'REFUSED');--> statement-breakpoint
CREATE TYPE "public"."time_off_unit" AS ENUM('DAYS', 'HOURS');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"worked_hours" numeric(5, 2),
	"status" "attendance_status" DEFAULT 'PRESENT' NOT NULL,
	"is_overtime" boolean DEFAULT false NOT NULL,
	"is_manual_correction" boolean DEFAULT false NOT NULL,
	"corrected_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"department_id" integer NOT NULL,
	"job_position" varchar(40) NOT NULL,
	"working_schedule_id" integer,
	"start_date" date NOT NULL,
	"end_date" date,
	"wage" numeric(12, 2) NOT NULL,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" varchar(255) NOT NULL,
	"name" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"role" "user_role" DEFAULT 'EMPLOYEE' NOT NULL,
	"department_id" integer NOT NULL,
	"job_position" varchar(40) NOT NULL,
	"manager_id" integer,
	"employee_type" "employee_type" DEFAULT 'FULL_TIME' NOT NULL,
	"working_schedule_id" integer,
	"bank_account_number" varchar(30),
	"bank_name" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_emp_id_unique" UNIQUE("emp_id"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "payruns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"structure_id" integer NOT NULL,
	"status" "payrun_status" DEFAULT 'DRAFT' NOT NULL,
	"computed_at" timestamp,
	"validated_at" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslip_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"payslip_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"rule_code" varchar(50) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"category" "rule_category" NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslip_warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"payslip_id" integer NOT NULL,
	"warning_type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"payrun_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"contract_id" integer NOT NULL,
	"structure_id" integer NOT NULL,
	"worked_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"basic_wage" numeric(12, 2) NOT NULL,
	"gross_salary" numeric(12, 2) NOT NULL,
	"net_salary" numeric(12, 2) NOT NULL,
	"has_warnings" boolean DEFAULT false NOT NULL,
	"status" "payrun_status" DEFAULT 'DRAFT' NOT NULL,
	"email_sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "salary_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"structure_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"category" "rule_category" NOT NULL,
	"sequence" integer NOT NULL,
	"computation_type" "computation_type" NOT NULL,
	"amount" numeric(12, 2),
	"percentage" numeric(5, 2),
	"base_code" varchar(50),
	"formula" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "salary_rules_valid_computation" CHECK ((
    ("salary_rules"."computation_type" = 'FIXED' AND "salary_rules"."amount" IS NOT NULL)
    OR ("salary_rules"."computation_type" = 'PERCENTAGE' AND "salary_rules"."percentage" IS NOT NULL AND "salary_rules"."base_code" IS NOT NULL)
    OR ("salary_rules"."computation_type" = 'FORMULA' AND "salary_rules"."formula" IS NOT NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"time_off_type_id" integer NOT NULL,
	"allocated_units" numeric(5, 2) NOT NULL,
	"used_units" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" time_off_status DEFAULT 'DRAFT' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"time_off_type_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"requested_units" numeric(5, 2) NOT NULL,
	"status" time_off_status DEFAULT 'DRAFT' NOT NULL,
	"allocation_id" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "time_off_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"unit" time_off_unit DEFAULT 'DAYS' NOT NULL,
	"requires_allocation" boolean DEFAULT true NOT NULL,
	"include_in_payroll" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "time_off_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "working_schedule_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "working_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(30) NOT NULL,
	"total_weekly_hours" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_corrected_by_employees_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_working_schedule_id_working_schedules_id_fk" FOREIGN KEY ("working_schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_working_schedule_id_working_schedules_id_fk" FOREIGN KEY ("working_schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_warnings" ADD CONSTRAINT "payslip_warnings_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_time_off_type_id_time_off_types_id_fk" FOREIGN KEY ("time_off_type_id") REFERENCES "public"."time_off_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_time_off_type_id_time_off_types_id_fk" FOREIGN KEY ("time_off_type_id") REFERENCES "public"."time_off_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_allocation_id_time_off_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."time_off_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_schedule_lines" ADD CONSTRAINT "working_schedule_lines_schedule_id_working_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_employee_date_idx" ON "attendance" USING btree ("employee_id","date");--> statement-breakpoint
CREATE INDEX "contracts_employee_idx" ON "contracts" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_contract_per_employee" ON "contracts" USING btree ("employee_id") WHERE "contracts"."status" = 'ACTIVE' AND "contracts"."end_date" IS NULL;--> statement-breakpoint
CREATE INDEX "payslip_lines_payslip_idx" ON "payslip_lines" USING btree ("payslip_id");--> statement-breakpoint
CREATE INDEX "payslips_payrun_idx" ON "payslips" USING btree ("payrun_id");--> statement-breakpoint
CREATE INDEX "payslips_employee_idx" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_rules_structure_code_idx" ON "salary_rules" USING btree ("structure_id","code");--> statement-breakpoint
CREATE INDEX "time_off_allocations_employee_type_idx" ON "time_off_allocations" USING btree ("employee_id","time_off_type_id");--> statement-breakpoint
CREATE INDEX "time_off_requests_employee_status_idx" ON "time_off_requests" USING btree ("employee_id","status");