"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Globe, CheckCircle2 } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/60 pt-16 pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand & Description */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
                P
              </div>
              <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1">
                PeoplePay<span className="text-primary font-black">360</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              The unified workforce operating system combining employee records, smart contracts,
              biometric attendance, leave accruals, and mathematical payroll execution on one real-time
              platform.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>SOC 2 Type II Certified</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="size-3.5 text-primary" />
                <span>End-to-End Encryption</span>
              </div>
            </div>
          </div>

          {/* Column 1: Core Platform */}
          <div className="space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-foreground font-mono">
              Workforce OS
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Operational Dashboard
                </Link>
              </li>
              <li>
                <Link href="/employees" className="hover:text-foreground transition-colors">
                  Employee Directory
                </Link>
              </li>
              <li>
                <Link href="/contracts" className="hover:text-foreground transition-colors">
                  Contract Management
                </Link>
              </li>
              <li>
                <Link href="/attendance" className="hover:text-foreground transition-colors">
                  Attendance Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Payroll Engine */}
          <div className="space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-foreground font-mono">
              Payroll Engine
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/payroll/payruns" className="hover:text-foreground transition-colors">
                  Payrun Batches & Wizard
                </Link>
              </li>
              <li>
                <Link href="/payroll/payslips" className="hover:text-foreground transition-colors">
                  Employee Payslips
                </Link>
              </li>
              <li>
                <Link href="/payroll/structures" className="hover:text-foreground transition-colors">
                  Salary Structures
                </Link>
              </li>
              <li>
                <Link href="/payroll/rules" className="hover:text-foreground transition-colors">
                  Mathematical Rules
                </Link>
              </li>
              <li>
                <Link href="/reports" className="hover:text-foreground transition-colors">
                  Statutory Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Leave & Time */}
          <div className="space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-foreground font-mono">
              Time Off
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/time-off/requests" className="hover:text-foreground transition-colors">
                  Leave Requests
                </Link>
              </li>
              <li>
                <Link href="/time-off/allocations" className="hover:text-foreground transition-colors">
                  Balance Allocations
                </Link>
              </li>
              <li>
                <Link href="/time-off/types" className="hover:text-foreground transition-colors">
                  Leave Categories
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
          <div>
            © {new Date().getFullYear()} PeoplePay360 Inc. All rights reserved. Precision Payroll Architecture.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Live Demo App
            </Link>
            <a href="#platform" className="hover:text-foreground transition-colors">
              Platform
            </a>
            <a href="#comparison" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#roi" className="hover:text-foreground transition-colors">
              ROI
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
