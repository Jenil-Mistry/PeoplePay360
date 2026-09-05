"use client";

import React, { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth-actions";
import { validatePassword } from "@/lib/rbac";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
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

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.errors.join(". "));
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword({
        employeeEmail: email,
        newPassword,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setSuccess(
        "Password has been reset successfully. The employee can now sign in with the new password."
      );
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors([]);
      setIsLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Show reset form unconditionally
  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-lg p-8 shadow-xl">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Reset your password
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

        {/* Employee Email */}
        <div>
          <label
            htmlFor="reset-email"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Employee Email Address
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee@company.com"
            required
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        {/* New Password */}
        <div>
          <label
            htmlFor="reset-password"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
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
            htmlFor="reset-confirm"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
            Confirm New Password
          </label>
          <input
            id="reset-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            required
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {confirmPassword && newPassword !== confirmPassword && (
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
              <span>Resetting…</span>
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              <span>Reset Password</span>
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
