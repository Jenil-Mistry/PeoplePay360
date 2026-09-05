"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordWithToken } from "@/lib/actions/auth-actions";
import { validatePassword } from "@/lib/rbac";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing password reset token.");
    }
  }, [token]);

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
    if (!token) return;

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
      const result = await resetPasswordWithToken({
        token,
        newPassword,
      });

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setSuccess("Password has been reset successfully. You can now sign in.");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors([]);
      
      setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-lg p-8 shadow-xl">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Set your new password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300">
            {success} Redirecting to sign in...
          </div>
        )}

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
              disabled={!token || !!success}
              className="w-full h-10 px-3 pr-10 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={!token || !!success}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
            disabled={!token || !!success}
            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-red-500 mt-1">
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !token || !!success}
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
              <span>Set New Password</span>
            </>
          )}
        </button>
      </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
