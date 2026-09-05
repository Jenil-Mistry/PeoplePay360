# PeoplePay360 — Backend Architecture & Engineering Guide

Welcome to the **PeoplePay360** backend documentation. This document provides a complete walkthrough of the server-side architecture, relational database model, payroll execution engine, server actions, and data-flow patterns used throughout the application.

---

## Table of Contents
1. [High-Level Architecture & Tech Stack](#1-high-level-architecture--tech-stack)
2. [Data Architecture & Schema Diagram](#2-data-architecture--schema-diagram)
3. [Database Schema Breakdown](#3-database-schema-breakdown)
4. [The Core Backend Engines](#4-the-core-backend-engines)
   - [The Payroll Computation Engine](#the-payroll-computation-engine)
   - [The Contract State Machine](#the-contract-state-machine)
   - [Time-Off & Leave Allocation Engine](#time-off--leave-allocation-engine)
5. [Server Actions API Layer (`lib/actions/`)](#5-server-actions-api-layer-libactions)
6. [Frontend-to-Backend State Synchronization](#6-frontend-to-backend-state-synchronization)
7. [Database Commands & Migration Workflow](#7-database-commands--migration-workflow)
8. [System Invariants & Safety Audits](#8-system-invariants--safety-audits)

---

## 1. High-Level Architecture & Tech Stack

PeoplePay360 implements a modern, type-safe, serverless backend using Next.js App Router and PostgreSQL:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Client Components                │
│         (Interactive Showcase, Dashboard, Wizards)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ RPC Invocation (Server Actions)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server Actions                   │
│             `"use server"` in `lib/actions/*.ts`            │
│    (Validation, Transaction Boundaries, Cache Revalidation) │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Payroll Server Engine      │ │       Drizzle ORM          │
│ `lib/payroll-server-engine.ts│ │ `drizzle-orm/neon-http`    │
│  (Formula AST, Rule Order)   │ │  Type-safe SQL queries     │
└──────────────────────────────┘ └─────────────┬──────────────┘
                                              │ HTTP Connection Pooling
                                              ▼
                               ┌──────────────────────────────┐
                               │       Neon PostgreSQL        │
                               │  Serverless Cloud Database   │
                               └──────────────────────────────┘
```

### Technology Highlights:
* **Framework**: [Next.js 16 App Router](https://nextjs.org) with React 19 Server Actions.
* **Database**: [Neon Serverless PostgreSQL](https://neon.tech) over `@neondatabase/serverless` (HTTP connection pooling for instant, cold-start-free queries).
* **ORM**: [Drizzle ORM](https://orm.drizzle.team) (`drizzle-orm` + `drizzle-kit`) for end-to-end TypeScript type inference.
* **Database Driver**: [lib/db/index.ts](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/db/index.ts) initializes the unified `db` client with strict relational schemas.
* **API Pattern**: Direct Server Actions (`"use server"`) instead of traditional REST/GraphQL routes. This eliminates boilerplate and guarantees end-to-end compile-time type safety.

---

## 2. Data Architecture & Schema Diagram

The database is normalized across **6 distinct enterprise domains**:

```mermaid
erDiagram
    DEPARTMENTS ||--o{ EMPLOYEES : "belongs to"
    DEPARTMENTS ||--o{ CONTRACTS : "assigned to"
    WORKING_SCHEDULES ||--o{ WORKING_SCHEDULE_LINES : "defines shifts"
    WORKING_SCHEDULES ||--o{ EMPLOYEES : "follows"
    WORKING_SCHEDULES ||--o{ CONTRACTS : "stipulates"
    
    EMPLOYEES ||--o{ EMPLOYEES : "manages (managerId)"
    EMPLOYEES ||--o{ CONTRACTS : "has"
    EMPLOYEES ||--o{ ATTENDANCE : "logs"
    EMPLOYEES ||--o{ TIME_OFF_ALLOCATIONS : "holds balance"
    EMPLOYEES ||--o{ TIME_OFF_REQUESTS : "submits"
    EMPLOYEES ||--o{ PAYSLIPS : "receives"

    TIME_OFF_TYPES ||--o{ TIME_OFF_ALLOCATIONS : "allocates"
    TIME_OFF_TYPES ||--o{ TIME_OFF_REQUESTS : "draws from"
    TIME_OFF_ALLOCATIONS ||--o{ TIME_OFF_REQUESTS : "balances"

    SALARY_STRUCTURES ||--o{ SALARY_RULES : "contains sequenced"
    SALARY_STRUCTURES ||--o{ CONTRACTS : "assigned structure"
    SALARY_STRUCTURES ||--o{ PAYRUNS : "executes batch"
    
    PAYRUNS ||--o{ PAYSLIPS : "generates"
    CONTRACTS ||--o{ PAYSLIPS : "derives salary from"
    PAYSLIPS ||--o{ PAYSLIP_LINES : "itemizes breakdown"
    PAYSLIPS ||--o{ PAYSLIP_WARNINGS : "flags audit alerts"
```

---

## 3. Database Schema Breakdown

Defined in [lib/db/schema.ts](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/db/schema.ts):

### 🏢 1. Organizational Domain
* **`departments`**: Distinct corporate entities (e.g. *Engineering*, *Human Resources*, *Sales*). Prevents raw string duplication.
* **`working_schedules`**: Shift templates (e.g. *Standard 40h Workweek*, *Night Shift*). Tracks `totalWeeklyHours`.
* **`working_schedule_lines`**: Granular days (`MON` through `SUN`), start times, end times, and meal break deductions.

### 👤 2. Employee Master (`employees`)
* **Identifiers**: Internal `id` (Serial PK) and external `empId` (e.g. `EMP-001`, mapped to Auth identity).
* **Hierarchy**: Self-referencing `managerId` allows recursive org-chart traversal.
* **Banking & Compliance**: `bankAccountNumber` and `bankName` (vital for pre-flight payroll audits).
* **Role & Type**: `roleEnum` (`EMPLOYEE`, `HR_MANAGER`, `PAYROLL_USER`, `PAYROLL_MANAGER`, `ADMIN`) and `employeeTypeEnum` (`FULL_TIME`, `PART_TIME`, `CONTRACTOR`, `INTERN`).

### 📄 3. Historical Contract Management (`contracts`)
* **Historical Snapshotting**: Contracts store snapshots of `departmentId`, `jobPosition`, and `workingScheduleId` so past payroll records remain legally audit-proof even if an employee changes roles later.
* **Salary Specification**: `wage` (base monthly compensation) linked directly to a `salaryStructureId`.
* **Lifecycle**: `status` enum (`DRAFT`, `ACTIVE`, `EXPIRED`, `CANCELLED`).
* **Rule**: Exactly **one** `ACTIVE` open-ended contract per employee at a time.

### 🌴 4. Time Off & Attendance
* **`time_off_types`**: System leave policies (*Paid Annual Leave*, *Sick Leave*, *Unpaid Leave*), tracking unit (`DAYS` or `HOURS`), whether an allocation is required, and whether it affects payroll.
* **`time_off_allocations`**: Credits granted to an employee (`allocatedUnits`, `usedUnits`) with validity date boundaries. Requires manager approval (`status: APPROVED`).
* **`time_off_requests`**: Concrete leave requests that link directly to an allocation and deduct balance upon approval.
* **`attendance`**: Daily punch record storing `checkIn`, `checkOut`, `workedHours`, status (`PRESENT`, `LATE`, `ABSENT`, `ON_LEAVE`, `HALF_DAY`), overtime indicators, and manual supervisor correction tracking.

### 💰 5. Salary Structure & Rule Engine
* **`salary_structures`**: Grouping of rules (e.g. *"Full-Time Executive Structure"*).
* **`salary_rules`**:
  * `category`: `BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, or `NET`.
  * `sequence`: **Integer order of execution** (e.g. 100 for Basic, 200 for HRA, 300 for Gross, 400 for Tax, 500 for Net).
  * `computationType`:
    1. `FIXED`: Hardcoded numerical currency value (`amount`).
    2. `PERCENTAGE`: Percentage of base contract wage or a referenced rule (`baseCode`).
    3. `FORMULA`: Mathematical equation (e.g. `BASIC * 0.10 + HRA`).

### 📊 6. Payruns & Itemized Payslips
* **`payruns`**: Batch payroll executions for a calendar period (e.g. *"August 2026 Payroll"*).
  * Lifecycle: `DRAFT` ➔ `COMPUTED` ➔ `VALIDATED` ➔ `PAID`.
* **`payslips`**: Individual employee snapshot per payrun:
  * Records `workedDays`, `basicWage`, `grossSalary`, `netSalary`.
  * `hasWarnings`: Boolean flag for fast UI list filtering.
* **`payslip_lines`**: Itemized lines preserving execution sequence and calculation results.
* **`payslip_warnings`**: Audit flags (e.g., `MISSING_BANK_DETAILS`, `CONTRACT_EXPIRING_SOON`, `UNAPPROVED_LEAVE`).

---

## 4. The Core Backend Engines

### The Payroll Computation Engine
Located in [lib/payroll-server-engine.ts](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/payroll-server-engine.ts):

1. **Step 1: Rule Ordering by Sequence**  
   Salary rules are sorted strictly by `sequence ASC`. This ensures dependencies (like calculating `GROSS` before computing `TAX = GROSS * 0.15`) are always met.
2. **Step 2: AST / Arithmetic Formula Evaluation (`evaluateSalaryFormula`)**  
   * Replaces token identifiers (e.g. `BASIC`, `HRA`, `GROSS`) with already-computed numeric values.
   * Uses safe mathematical evaluation without arbitrary code execution:
   ```typescript
   // Validates allowed characters: digits, operators (+, -, *, /), parentheses, decimals
   if (!/^[\d\s+\-*/().]+$/.test(expr)) return 0;
   ```
3. **Step 3: Pre-Flight Safety Audit**  
   Before finalizing calculations, the engine runs heuristic sanity checks:
   * **Missing Bank Details**: Flags if `bankAccountNumber` is blank.
   * **Contract Expiry**: Flags if contract expires during or immediately around the payrun period.
   * **Gross vs Net Imbalance**: Flags if total deductions exceed gross earnings.

### The Contract State Machine
Located in [lib/actions/contracts.ts](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/contracts.ts):
* When activating a new contract (`updateContractStatus(id, "ACTIVE")`), the system automatically expires or cancels any existing active contracts for that employee to prevent double-billing.

### Time-Off & Leave Allocation Engine
Located in [lib/actions/time-off.ts](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/time-off.ts):
* When a manager calls `approveTimeOffRequest(requestId)`:
  1. Validates that the employee has sufficient unallocated balance in `time_off_allocations`.
  2. Increments `usedUnits` by the requested units.
  3. Transitions request status to `APPROVED`.
  4. Automatically informs the payroll computation to account for unpaid leave deductions if applicable.

---

## 5. Server Actions API Layer (`lib/actions/`)

PeoplePay360 uses Next.js **Server Actions** (`"use server"`). These functions can be imported and called directly from frontend React components like normal async JavaScript functions.

| Action File | Purpose & Key Exported Functions |
| :--- | :--- |
| [`lib/actions/payroll.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/payroll.ts) | • `createPayrun()` — Creates batch payrun in `DRAFT`<br>• `computePayrun(id)` — Executes the payroll engine across all eligible employees<br>• `validatePayrun(id)` — Locks numbers and approves for disbursement<br>• `markPayrunAsPaid(id)` — Marks transactions as completed<br>• `getPayslips()`, `getPayslipDetails()`, `sendPayslipsBulk()` |
| [`lib/actions/employees.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/employees.ts) | • `getEmployees()` — Fetches employees with department & manager joins<br>• `createEmployee()` / `updateEmployee()`<br>• `toggleEmployeeStatus()` — Soft-deactivates employee |
| [`lib/actions/contracts.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/contracts.ts) | • `getContracts()` — Filter contracts by employee, status, or department<br>• `createContract()` / `updateContract()`<br>• `updateContractStatus()` — Handles lifecycle transitions |
| [`lib/actions/attendance.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/attendance.ts) | • `recordCheckIn()` / `recordCheckOut()` — Live punch card tracking<br>• `recordManualAttendance()` — Supervisor overrides with audit log |
| [`lib/actions/time-off.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/time-off.ts) | • `getTimeOffRequests()` / `createTimeOffRequest()`<br>• `approveTimeOffRequest()` / `refuseTimeOffRequest()`<br>• `createTimeOffAllocation()` / `approveAllocation()` |
| [`lib/actions/dashboard.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/dashboard.ts) | • `getDashboardMetrics()` — Aggregates live headcounts, monthly payroll spending, attendance rate, and pending approval counters |
| [`lib/actions/sync.ts`](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/actions/sync.ts) | • `getInitialAppState()` — Single hydration call that bootstraps the entire application state on startup |

---

## 6. Frontend-to-Backend State Synchronization

To provide instantaneous, zero-latency interactions alongside database persistence:
1. **Initial Hydration**: When the client app mounts, [lib/store.tsx](file:///c:/Users/yg159/OneDrive/Desktop/Peoplepay360/people-pay360/lib/store.tsx) invokes `getInitialAppState()` from `lib/actions/sync.ts`.
2. **Optimistic Updates**: Client state updates immediately in React Context so UI clicks feel instantaneous.
3. **Database Write**: The corresponding Server Action writes to Neon PostgreSQL in the background.
4. **Cache Revalidation**: The Server Action calls `revalidatePath("/payroll/payruns")` ensuring server-side Next.js caches stay fresh.

---

## 7. Database Commands & Migration Workflow

The project uses `drizzle-kit` for schema migrations and prototyping. All commands are run from the `people-pay360` directory:

```bash
# Push schema changes directly to Neon Database without generating SQL migration files
npm run db:push

# Generate SQL migration scripts in lib/db/migrations
npm run db:generate

# Launch Drizzle Studio (web GUI for browsing tables and records)
npm run db:studio

# Seed the database with realistic enterprise data (Employees, Contracts, Rules, Payruns)
npm run db:seed
```

### Environment Configuration (`.env`)
The database connection string is configured via:
```env
DATABASE_URL=postgresql://user:password@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 8. System Invariants & Safety Audits

When modifying or extending the backend, ensure these fundamental invariants are maintained:

1. **Active Contract Exclusivity**: Never allow two contracts with `status = 'ACTIVE'` and `endDate = NULL` for the same `employee_id`.
2. **Attendance Uniqueness**: Only one attendance row per `(employee_id, date)`.
3. **Sequence Determinism**: Salary rules must always have positive unique sequence integers within their salary structure.
4. **Audit Immutability**: Once a Payrun is transitioned to `PAID`, its payslips, lines, and warning records must **never** be recomputed or mutated.
