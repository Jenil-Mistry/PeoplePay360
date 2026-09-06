"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-lg p-8 shadow-xl text-center">
      <div className="flex justify-center mb-4">
        <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldAlert className="size-6 text-red-600 dark:text-red-400" />
        </div>
      </div>
      
      <h1 className="text-xl font-bold text-foreground mb-2">Reset Disabled</h1>
      
      <p className="text-sm text-muted-foreground mb-6">
        Self-service password reset is disabled for security reasons. 
        Please contact your System Administrator to reset your password.
      </p>

      <div className="pt-4 border-t border-border">
        <Link
          href="/sign-in"
          className="text-sm text-primary hover:text-primary/80 font-bold transition-colors inline-block"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
