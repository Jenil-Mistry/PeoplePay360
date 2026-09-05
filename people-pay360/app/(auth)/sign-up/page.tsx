"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, Loader2, ShieldAlert } from "lucide-react";
import { signUpUser } from "@/lib/actions/auth-actions";
import { useSession } from "next-auth/react";
import { validatePassword } from "@/lib/rbac";

export default function SignUpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [jobPosition, setJobPosition] = useState("");
  const [role, setRole] = useState<
    "EMPLOYEE" | "HR_MANAGER" | "PAYROLL_USER" | "PAYROLL_MANAGER" | "ADMIN"
  >("EMPLOYEE");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const isAdmin = session?.user?.role === "ADMIN";
  const isLoadingSession = status === "loading";

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      const validation = validatePassword(value);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validations
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.errors.join(". "));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpUser({
        name,
        email,
        password,
        jobPosition: jobPosition || undefined,
        role,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setSuccess(
        `Account created successfully! Employee ID: ${result.empId}. The user can now sign in.`
      );
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setJobPosition("");
      setRole("EMPLOYEE");
      setPasswordErrors([]);
      setIsLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoadingSession) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-lg p-8 shadow-xl text-center">
        <Loader2 className="size-6 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground mt-3">Checking access…</p>
      </div>
    );
  }

  // Not admin — access denied
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-lg p-8 shadow-xl">
        <div className="text-center">
          <div className="size-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">
            Admin Access Required
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Only administrators can create new employee accounts. Please contact
            your system administrator to get access.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <Link
            href="/sign-in"
            className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Admin — show create account form
  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-lg p-8 shadow-xl">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">
          Create Employee Account
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Register a new employee in PeoplePay360
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        )}

        {/* Name */}
        <div>
          <label
            htmlFor="signup-name"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Full Name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Email Address
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee@company.com"
            required
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        {/* Job Position */}
        <div>
          <label
            htmlFor="signup-position"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Job Position
          </label>
          <input
            id="signup-position"
            type="text"
            value={jobPosition}
            onChange={(e) => setJobPosition(e.target.value)}
            placeholder="Software Engineer"
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        {/* Role */}
        <div>
          <label
            htmlFor="signup-role"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Role
          </label>
          <select
            id="signup-role"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="PAYROLL_USER">Payroll User</option>
            <option value="PAYROLL_MANAGER">Payroll Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
              required
              className="w-full h-10 px-3 pr-10 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {passwordErrors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {passwordErrors.map((err, i) => (
                <li
                  key={i}
                  className="text-[11px] text-amber-600 dark:text-amber-400"
                >
                  • {err}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="signup-confirm"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Confirm Password
          </label>
          <input
            id="signup-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] text-red-500 mt-1">
              Passwords do not match
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Creating Account…</span>
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border text-center">
        <Link
          href="/dashboard"
          className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
