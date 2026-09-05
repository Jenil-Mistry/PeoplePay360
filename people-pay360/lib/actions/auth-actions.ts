"use server";

import { db } from "@/lib/db";
import { employees, departments, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signIn, auth } from "@/lib/auth";
import { validatePassword } from "@/lib/rbac";
import { AuthError } from "next-auth";

/* ── Sign Up (Admin-Only) ────────────────────────────────────── */

export async function signUpUser(data: {
  name: string;
  email: string;
  password: string;
  jobPosition?: string;
  departmentName?: string;
  role?:
    | "EMPLOYEE"
    | "HR_MANAGER"
    | "PAYROLL_USER"
    | "PAYROLL_MANAGER"
    | "ADMIN";
}) {
  try {
    // 1. Verify the caller is an authenticated ADMIN
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Only administrators can create new accounts." };
    }

    // 2. Validate password
    const validation = validatePassword(data.password);
    if (!validation.valid) {
      return { error: validation.errors.join(". ") };
    }

    // 3. Check if email already exists
    const [existing] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.email, data.email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return {
        error:
          "A user with this email already has an account. Please use the Sign In page instead.",
      };
    }

    // 4. Resolve department (default to first available)
    let departmentId: number;
    if (data.departmentName) {
      const [dept] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.name, data.departmentName))
        .limit(1);
      departmentId = dept?.id ?? 1;
    } else {
      const [firstDept] = await db
        .select({ id: departments.id })
        .from(departments)
        .limit(1);
      departmentId = firstDept?.id ?? 1;
    }

    // 5. Hash password and create employee
    const passwordHash = await bcrypt.hash(data.password, 12);
    const empId = `EMP-${Date.now().toString().slice(-6)}`;

    await db.insert(employees).values({
      empId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role ?? "EMPLOYEE",
      departmentId,
      jobPosition: data.jobPosition?.trim() || "Employee",
    });

    return { success: true, empId };
  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/* ── Sign In ─────────────────────────────────────────────────── */

export async function signInUser(data: { email: string; password: string }) {
  try {
    await signIn("credentials", {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Authentication failed. Please try again." };
      }
    }
    throw error;
  }
}

/* ── Forgot Password (Token-Based Email Recovery) ─────────────────────── */

import crypto from "crypto";

export async function requestPasswordReset(email: string) {
  try {
    const [employee] = await db
      .select({ id: employees.id, email: employees.email })
      .from(employees)
      .where(eq(employees.email, email.toLowerCase().trim()))
      .limit(1);

    if (!employee) {
      // Return success anyway to prevent email enumeration
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    await db.insert(passwordResetTokens).values({
      email: employee.email,
      token,
      expiresAt,
    });

    // In a real application, send the token via email here.
    // e.g., sendEmail(employee.email, `https://.../reset-password?token=${token}`)
    console.log(`[DEV MODE] Password reset token for ${employee.email}: ${token}`);

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function resetPasswordWithToken(data: {
  token: string;
  newPassword: string;
}) {
  try {
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, data.token))
      .limit(1);

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return { error: "Invalid or expired password reset token." };
    }

    const validation = validatePassword(data.newPassword);
    if (!validation.valid) {
      return { error: validation.errors.join(". ") };
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await db
      .update(employees)
      .set({ passwordHash })
      .where(eq(employees.email, resetRecord.email));

    // Delete token after successful use
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, data.token));

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/* ── Change Own Password ──────────────────────────────────── */

export async function changeOwnPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be logged in to change your password." };
    }

    // Validate new password
    const validation = validatePassword(data.newPassword);
    if (!validation.valid) {
      return { error: validation.errors.join(". ") };
    }

    // Get current employee
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.email, session.user.email!))
      .limit(1);

    if (!employee || !employee.passwordHash) {
      return { error: "Account not found." };
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      data.currentPassword,
      employee.passwordHash,
    );
    if (!isValid) {
      return { error: "Current password is incorrect." };
    }

    // Update password
    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await db
      .update(employees)
      .set({ passwordHash })
      .where(eq(employees.id, employee.id));

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
