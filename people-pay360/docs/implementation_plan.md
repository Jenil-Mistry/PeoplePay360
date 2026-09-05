# PeoplePay360 Implementation Plan

## 1. Establish shared authorization and live-data rules

- Add centralized server-side permission checks for:
  - Attendance viewing and self check-in/out.
  - Time-off request creation and approval.
  - Contract creation.
  - Payroll creation, computation, validation, and payment.
  - Payslip printing.
  - Report export.
- Do not rely only on hidden/disabled UI controls.
- Remove fallback IDs such as employee `1` and approver `1`.
- Return structured authorization and validation errors to the UI.
- Add database transactions for time-off approval, allocation deduction, and payroll state transitions.

## 2. Dashboard metrics and operational alerts

### ✅ Phase 2: Live Dashboard Telemetry
- [x] Create `lib/actions/dashboard.ts` (if missing) and implement `getDashboardMetrics()`.
- [x] Wire up Dashboard KPI cards to actual `payslips` sum totals instead of `642500` fallback.
- [x] Wire up Dashboard Attendance Overview to real `attendance` DB counts instead of `94/18/9`.
- [x] Wire up Dashboard Department Breakdown to actual payroll data.
- [x] Drop pseudo-calculations and `+8.5%` hardcoded trends if no historical data exists.

### Files

- `app/dashboard/page.tsx`
- `lib/actions/dashboard.ts`
- `components/layout/app-shell.tsx`
- `lib/store.tsx`

### Implementation

- Remove all hardcoded dashboard values:
  - Salary fallback values.
  - Department payroll map.
  - Monthly trend data.
  - Hardcoded attendance counts.
  - Hardcoded missing checkout/manual edit/overtime values.
  - Fake contract-expiry and payslip-draft alerts.
- Use live database-derived metrics for:
  - Approved time-off days.
  - Attendance health.
  - Present, late, absent, missing checkout, manual correction, overtime, and coverage counts.
  - Department salary totals.
  - Monthly payroll trends.
- Correct metric semantics:
  - “Paid salary” should include only `PAID` payslips.
  - Metrics should respect the selected payrun, department, and employee type filters.
  - Attendance should use a clearly defined period rather than all historical records.
- Create a shared typed `OperationalAlert` model containing:
  - Alert type.
  - Severity.
  - Message.
  - Related record/entity ID.
  - Link target.
  - Created/observed timestamp.
- Generate alerts only from actual records, such as:
  - Employees missing bank information.
  - Pending time-off requests.
  - Payslips with warnings.
  - Attendance records missing checkout.
  - Manual attendance corrections.
  - Contracts expiring within the configured period.
  - Payroll batches blocked by validation issues.
- Use the same alert query for both the dashboard card and the notification bell.
- Add automatic refresh/polling for alerts and dashboard data, with refresh after every mutation.
- Display an accurate empty state when no alerts exist.

## 3. Notification tab

### ✅ Phase 3: Global Notification System
- [x] Extract `activePayrun.warnings` from the App Shell layout.
- [x] Create `lib/actions/alerts.ts` (`getOperationalAlerts`) unifying DB checks:
  - Missing bank details in `employees`.
  - Missing attendance checkouts.
  - Draft payslips pending approval.
- [x] Connect the App Shell bell icon to this live server action.

### File

- `components/layout/app-shell.tsx`

### Implementation

- Show:
  - Alert severity.
  - Alert category.
  - Human-readable message.
  - Timestamp or “observed” state.
  - Link to the relevant dashboard/module record.
- Ensure the bell count reflects actual active alerts.
- Prevent duplicate alerts by using a deterministic alert key.
- If read/unread behavior is required, add a persisted notifications/read-state table; otherwise keep alerts derived from current data.

## 4. Attendance access and functionality

### Files

- `app/attendance/page.tsx`
- `lib/actions/attendance.ts`
- `lib/store.tsx`
- `lib/rbac.ts`
- `lib/types.ts`

### Implementation

- Enforce self-only check-in and check-out:
  - The current user may punch only their own attendance.
  - Remove the employee selector from the live punch controls.
  - Remove row-level check-out actions for other employees.
- All users with attendance access may view records according to their permissions.
- Make other employees’ attendance view-only for hr and admin only .
- Disable or remove manual edit/create controls for users without explicit correction permission.
- Decide and enforce whether HR/Admin corrections remain available as a separate restricted workflow; they must not be exposed as normal check-in controls.
- Add authorization checks inside all attendance server actions.
- Remove hardcoded date exceptions such as `2026-09-02`.
- Use the employee’s actual working schedule instead of a page-local hardcoded `09:00` wherever possible.
- Ensure status, worked hours, overtime, and checkout values are calculated server-side.
- Add a unique database constraint for one attendance record per employee per day.
- Fix attendance type definitions so database statuses such as `ON_LEAVE` and `HALF_DAY` are represented consistently.
- Verify:
  - Self check-in.
  - Self check-out.
  - Duplicate punches.
  - Unauthorized employee punching.
  - View-only access.
  - Missing checkout alerts.
  - Manual correction audit behavior.

## 5. Contract creation employee search

### ✅ Phase 5: Contracts Admin Exclusion
- [x] Update the Contracts UI dropdown / DB query to filter out `ADMIN` roles.
- [x] Enforce constraint: Admin users cannot have standard employment contracts or be included in payroll runs.

### Files

- `app/contracts/page.tsx`
- `lib/actions/contracts.ts`
- `lib/store.tsx`

### Implementation

- Replace the employee `<select>` with a searchable employee combobox.
- Exclude users whose role is `ADMIN` from contract candidates.
- Apply the exclusion both:
  - In the UI employee search list.
  - In `createContract` server-side validation.
- Use only active, non-admin employees unless historical contracts require inactive employees.
- Validate that the selected employee exists and is eligible before insertion.
- Preserve existing employee search/filter behavior for the contracts table.
- Add tests for:
  - Admin excluded from search.
  - Direct server submission for an admin rejected.
  - Valid employee contract creation.
  - Duplicate active-contract handling.

## 6. Time-off request completion and date calculation

### Files

- `app/time-off/requests/page.tsx`
- `app/time-off/types/page.tsx`
- `lib/actions/time-off.ts`
- `lib/actions/sync.ts`
- `lib/store.tsx`
- `lib/rbac.ts`

### Implementation

- Make leave type selection part of every new request.
- Display the selected leave type consistently in the request list, detail form, and balance calculations.
- Automatically calculate requested days from start and end dates:
  - Inclusive calendar-day calculation by default.
  - Reject end dates before start dates.
  - Keep the duration field read-only.
  - Support unit-aware behavior for `DAYS` versus `HOURS`.
- Recalculate immediately whenever either date changes.
- Recalculate again on the server before saving; never trust the client-provided duration.
- Prevent employees and non-HR/non-admin users from approving or refusing requests.
- Update the UI so only HR and Admin see approval controls.
- Add server-side role validation to both approve and refuse actions.
- Correct the mapped approval text currently represented as “Manager”; it should reflect HR/Admin approval.
- Use a transaction when approving:
  - Lock/read the request.
  - Validate it is still pending.
  - Find and validate the allocation.
  - Ensure sufficient balance.
  - Increment used units.
  - Update request status and approver.
- Prevent duplicate approval deductions.
- Add validation for overlapping requests and insufficient leave balances where applicable.
- Complete the leave-types page with real create/update functionality if the page is expected to manage types, including:
  - Name.
  - Unit.
  - Allocation requirement.
  - Payroll inclusion.
  - Active status.

## 7. Payroll payrun backend verification and completion

### ✅ Phase 7: Backend Payroll Verification
- [x] Update `lib/actions/payroll.ts` > `computeEmployeePayroll`.
- [x] Remove the hardcoded `workedDays: 22` default and replace with actual `attendance` DB lookups for the period.
- [x] Add status transition guards: A payrun cannot be `PAID` unless it was previously `VALIDATED`.
- [x] Remove fallback logic that processes all employees if no eligible employees are found.

### Files

- `app/payroll/payruns/page.tsx`
- `app/payroll/payruns/[id]/page.tsx`
- `lib/actions/payroll.ts`
- `lib/store.tsx`
- `lib/payroll-server-engine.ts`
- `lib/db/schema.ts`

### Implementation

- Keep payruns fully database-backed; the current server actions already persist payruns and payslips, but the client currently performs optimistic updates without awaiting or surfacing failures.
- Refactor store mutations to:
  - Await server responses.
  - Show success/error states.
  - Refresh only after successful mutations.
  - Roll back optimistic state on failure.
- Add authorization checks to every payroll mutation.
- Validate payrun lifecycle transitions:
  - `DRAFT → COMPUTED → VALIDATED → PAID`.
  - Reject invalid transitions.
  - Prevent recomputation after validation/payment unless explicitly supported.
- Use database transactions for payrun computation:
  - Create/update payrun.
  - Delete/rebuild draft payslips and lines.
  - Insert warnings.
  - Set computed status.
- Ensure only eligible employees with active contracts are included.
- Validate selected employees against the actual eligible employee set.
- Return computation counts and warnings to the UI.
- Make bulk payslip sending return the actual number of affected payslips rather than always returning `1`.
- Add tests for:
  - Payrun creation.
  - Employee eligibility.
  - Payroll calculation persistence.
  - Recalculation.
  - Validation.
  - Payment.
  - Invalid state transitions.
  - Failed transactions.

## 8. Payslip printing

### ✅ Phase 8: Payslip Printing
- [x] Rewrite PDF route to enforce PAID status
- [x] Add auth check to PDF route
- [x] Stop using `window.print()` — open dedicated route

- `app/payroll/payslips/page.tsx`
- `app/api/payslips/[id]/pdf/route.ts`
- Optional shared print component under `components/payroll/`

### Implementation

- Stop calling `window.print()` on the full application page.
- Add a dedicated paid-payslip print flow:
  - Only `PAID` payslips show a print button.
  - Clicking print opens the dedicated payslip document route in a new tab/window.
  - The route contains only the payslip markup.
- Enforce `PAID` status in the server route.
- Enforce that the authenticated user is allowed to view the payslip.
- Keep navigation, sidebar, dialogs, and application chrome out of the print document.
- Add print CSS for:
  - A4 layout.
  - Page margins.
  - Single payslip document.
  - Hidden print controls.
  - Avoiding table/card splits.
- Escape all dynamic HTML values in the generated document.
- Verify both browser printing and “Save as PDF”.

## 9. Salary structures page redesign

### ✅ Phase 9: Salary Structures Redesign
- [x] Replace card grid with row-based table
- [x] Show inline expandable rules

- `app/payroll/structures/page.tsx`

### Implementation

- Replace the card grid and detail dialog with a row-based table matching the payslips presentation.
- Suggested columns:
  - Structure name.
  - Type.
  - Rule count.
  - Active employees.
  - Active status.
  - Actions.
- Show rules in an inline expandable table row or a dedicated non-overlay detail section.
- Preserve rule sequence ordering.
- Add clear links/actions to the salary rules page.
- Avoid modal/overlay behavior for viewing structure details.
- Ensure the employee count is derived from active contracts and not stale client state.
- Add loading, empty, and error states.

## 10. CSV export

### ✅ Phase 10: Export Functionality
- [x] Implement real CSV generation in Reports instead of a toast notification.
- [x] Include properly escaped CSV columns (commas inside text strings break naive implementations).
- [x] Add UTF-8 BOM headers so Excel opens the file correctly without mangling characters.

### Files

- `app/reports/page.tsx`
- Optional `lib/actions/reports.ts` or API route

### Implementation

- Export the selected payrun’s actual payslip data.
- Include columns such as:
  - Employee ID.
  - Employee name.
  - Department.
  - Payrun.
  - Period start/end.
  - Worked days.
  - Basic wage.
  - Gross salary.
  - Deductions.
  - Net salary.
  - Status.
  - Warning count.
- Use a deterministic filename containing the payrun and export date.
- Prefer server-side generation for authorization and consistent data; otherwise verify the client data is live and complete.
- Show a success message only after the download payload has been generated successfully.
- Add empty-state handling when no payslips exist.

## 11. Database and migration work

### ✅ Phase 11: Database Constraints & Indexes
- [x] Add unique constraint: one attendance per employee/date
- [x] Add unique constraint: one active open-ended contract per employee
- [x] Add unique constraint: unique rule code per structure
- [x] Add FK lookup indexes
- [x] Generate Drizzle migration

- Add missing indexes and constraints from `lib/db/schema.ts`.
- Add:
  - One attendance record per employee/date.
  - One active open-ended contract per employee.
  - Unique salary-rule code per structure.
  - Useful foreign-key lookup indexes.
- Add appropriate check constraints for salary rule computation fields.
- Generate and apply Drizzle migrations.
- Confirm seed data is used only as persisted test/demo data; no UI should invent additional fake metrics or alerts.

## 12. Verification checklist

### ✅ Phase 12: Build Verification
- [x] Run lint and TypeScript checks
- [x] Run production build

- Run lint, TypeScript checks, and production build.
- Test each role:
  - Employee.
  - HR Manager.
  - Payroll User.
  - Payroll Manager.
  - Admin.
- Verify database state after every mutation, including page refresh.
- Test alert changes after:
  - Adding bank details.
  - Creating/approving leave.
  - Adding attendance/checkouts.
  - Correcting attendance.
  - Computing/validating/paying payroll.
  - Updating contracts.
- Verify print output contains only the intended payslip.
- Verify unpaid payslips cannot be printed.
- Verify CSV downloads and opens correctly in Excel/Sheets.
