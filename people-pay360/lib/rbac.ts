/**
 * PeoplePay360 — Role-Based Access Control (RBAC) Configuration
 *
 * Central permissions matrix mapping Module × Operation × Role → Permission Level.
 * Roles:  EMPLOYEE | HR_MANAGER | PAYROLL_USER | PAYROLL_MANAGER | ADMIN
 *
 * Updated per user feedback:
 *   - Only ADMIN can create new accounts (no open signup)
 *   - Password: 8+ chars, 1 uppercase, 1 number, 1 special character
 */

export type UserRole =
  | "EMPLOYEE"
  | "HR_MANAGER"
  | "PAYROLL_USER"
  | "PAYROLL_MANAGER"
  | "ADMIN";

export type PermissionLevel = "READ" | "WRITE" | "NONE";

export type RbacModule =
  | "dashboard"
  | "employees"
  | "employees_own"
  | "contracts"
  | "contracts_own"
  | "attendance_own"
  | "attendance_all"
  | "attendance_correct_others"
  | "time_off_own"
  | "time_off_approve"
  | "time_off_allocations"
  | "time_off_types"
  | "payroll_view"
  | "payroll_own_payslip"
  | "payroll_create_compute"
  | "payroll_validate_paid"
  | "payroll_structures_rules"
  | "reports"
  | "admin_create_accounts";

/**
 * Master permissions matrix.
 * Key structure: `${module}` → { ROLE → PERMISSION }
 */
const PERMISSIONS: Record<RbacModule, Record<UserRole, PermissionLevel>> = {
  // ── Dashboard ────────────────────────
  dashboard: {
    EMPLOYEE: "READ",
    HR_MANAGER: "READ",
    PAYROLL_USER: "READ",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },

  // ── Employees ────────────────────────
  employees: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "NONE",
    ADMIN: "WRITE",
  },
  employees_own: {
    EMPLOYEE: "READ",
    HR_MANAGER: "READ",
    PAYROLL_USER: "READ",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },

  // ── Contracts ────────────────────────
  contracts: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "WRITE",
    ADMIN: "WRITE",
  },
  contracts_own: {
    EMPLOYEE: "READ",
    HR_MANAGER: "READ",
    PAYROLL_USER: "READ",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },

  // ── Attendance ───────────────────────
  attendance_own: {
    EMPLOYEE: "WRITE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "WRITE",
    PAYROLL_MANAGER: "WRITE",
    ADMIN: "WRITE",
  },
  attendance_all: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "READ",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },
  attendance_correct_others: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "NONE",
    ADMIN: "WRITE",
  },

  // ── Time Off ─────────────────────────
  time_off_own: {
    EMPLOYEE: "WRITE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "WRITE",
    PAYROLL_MANAGER: "WRITE",
    ADMIN: "WRITE",
  },
  time_off_approve: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "NONE",
    ADMIN: "WRITE",
  },
  time_off_allocations: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "NONE",
    ADMIN: "WRITE",
  },
  time_off_types: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "WRITE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "NONE",
    ADMIN: "WRITE",
  },

  // ── Payroll ──────────────────────────
  payroll_view: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "NONE",
    PAYROLL_USER: "READ",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },
  payroll_own_payslip: {
    EMPLOYEE: "READ",
    HR_MANAGER: "READ",
    PAYROLL_USER: "READ",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },
  payroll_create_compute: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "NONE",
    PAYROLL_USER: "WRITE",
    PAYROLL_MANAGER: "WRITE",
    ADMIN: "WRITE",
  },
  payroll_validate_paid: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "NONE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "WRITE",
    ADMIN: "WRITE",
  },
  payroll_structures_rules: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "NONE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "WRITE",
    ADMIN: "WRITE",
  },

  // ── Reports ──────────────────────────
  reports: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "NONE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "READ",
    ADMIN: "READ",
  },

  // ── Admin ────────────────────────────
  admin_create_accounts: {
    EMPLOYEE: "NONE",
    HR_MANAGER: "NONE",
    PAYROLL_USER: "NONE",
    PAYROLL_MANAGER: "NONE",
    ADMIN: "WRITE",
  },
};

/* ── Public API ─────────────────────────────────────────────── */

/** Check if a role has any access (READ or WRITE) to a module */
export function canAccessModule(
  role: UserRole | string,
  module: RbacModule
): boolean {
  const perm = PERMISSIONS[module]?.[role as UserRole];
  return perm === "READ" || perm === "WRITE";
}

/** Get the exact permission level for a role × module */
export function getPermissionLevel(
  role: UserRole | string,
  module: RbacModule
): PermissionLevel {
  return PERMISSIONS[module]?.[role as UserRole] ?? "NONE";
}

/** Shorthand: does the role have WRITE access to the module? */
export function hasWriteAccess(
  role: UserRole | string,
  module: RbacModule
): boolean {
  return PERMISSIONS[module]?.[role as UserRole] === "WRITE";
}

/** Shorthand: does the role have at least READ access? */
export function hasReadAccess(
  role: UserRole | string,
  module: RbacModule
): boolean {
  const perm = PERMISSIONS[module]?.[role as UserRole];
  return perm === "READ" || perm === "WRITE";
}

/* ── Sidebar Navigation Helpers ─────────────────────────────── */

/** Which top-level sidebar modules should be visible for a role? */
export function getVisibleSidebarModules(role: UserRole | string) {
  return {
    dashboard: canAccessModule(role, "dashboard"),
    employees: canAccessModule(role, "employees"),
    contracts: canAccessModule(role, "contracts"),
    attendance: true, // Everyone can see attendance (own)
    timeOff: true, // Everyone can submit requests
    timeOffAllocations: canAccessModule(role, "time_off_allocations"),
    timeOffTypes: canAccessModule(role, "time_off_types"),
    payroll: canAccessModule(role, "payroll_view"),
    payrollStructures: canAccessModule(role, "payroll_structures_rules"),
    reports: canAccessModule(role, "reports"),
  };
}

/* ── Password Validation ────────────────────────────────────── */

/**
 * Password policy: 8+ characters, 1 uppercase, 1 number, 1 special character
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least 1 uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least 1 number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least 1 special character");
  }

  return { valid: errors.length === 0, errors };
}
