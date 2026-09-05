"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  CalendarCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BentoFeatures() {
  return (
    <section id="platform" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
          Engineered for Enterprise Precision
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Every Module Built to Eliminate Human Error
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          From contractual allowances to statutory tax deductions and time off balances, our engine
          guarantees mathematical consistency from the punch clock to the payslip.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Large Bento: Salary Rule Sequencing (Span 2 Columns) */}
        <div className="md:col-span-2 rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between group hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                Order-Preserving Math Engine
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">Sequence: 1 → N</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Mathematical Salary Rule Sequencing
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rules execute in strict numerical order. Allowances dependent on Basic Salary (like
              HRA) calculate automatically, and statutory deductions compute only after gross wage is
              accurately established.
            </p>
          </div>

          {/* Sequence Visualizer */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5">
            {[
              { seq: 1, name: "Basic Salary", code: "BASIC", type: "Base", val: "$42,500.00" },
              { seq: 2, name: "House Rent Allowance", code: "HRA", type: "Allowance (50%)", val: "+$21,250.00" },
              { seq: 3, name: "Standard Allowance", code: "STD", type: "Allowance", val: "+$10,000.00" },
              { seq: 4, name: "Provident Fund", code: "PF", type: "Deduction", val: "-$3,000.00" },
              { seq: 5, name: "Net Salary Output", code: "NET", type: "Final Remuneration", val: "$68,750.00" },
            ].map((rule) => (
              <div
                key={rule.seq}
                className="flex items-center justify-between p-2 rounded-xl bg-card border border-border text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center font-mono">
                    {rule.seq}
                  </span>
                  <span className="font-semibold text-foreground">{rule.name}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                    {rule.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{rule.type}</span>
                  <span className="font-mono font-bold text-foreground">{rule.val}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">Configurable via Salary Structures UI</span>
            <Link href="/payroll/rules" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              Explore Rules Engine <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Bento 2: 2-Step Payrun Wizard */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between group hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-mono">
              Pre-Flight Safety
            </Badge>
            <h3 className="text-xl font-bold text-foreground">
              2-Step Payrun Wizard
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Catches missing bank accounts, expired contracts, and duplicate claims before you sign
              off on payroll disbursements.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4 text-amber-500" />
              <span>Pre-Disbursement Audit</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Active contracts matched (8 of 8)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>2 employees missing account number</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Worked days verified with attendance</span>
              </div>
            </div>
          </div>

          <Link href="/payroll/payruns" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Test Payrun Wizard <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Bento 3: Live Attendance Punches */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between group hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-mono">
              Real-Time Tracking
            </Badge>
            <h3 className="text-xl font-bold text-foreground">
              Attendance & Quick Punches
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Biometric check-in and one-click quick punches log presence and calculate overtime
              ledger directly into pay periods.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Today's Presence Health</span>
              <span className="font-bold font-mono text-emerald-600">94.2%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "94%" }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>94 Present</span>
              <span>18 Late</span>
              <span>9 Absent</span>
            </div>
          </div>

          <Link href="/attendance" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Open Attendance Ledger <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Bento 4: Leave Accrual Deduction */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between group hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-mono">
              Leave Accruals
            </Badge>
            <h3 className="text-xl font-bold text-foreground">
              Time Off Balance Deduction
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Leave requests automatically validate against employee entitlement balances. Once
              approved, days decrement with zero manual bookkeeping.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Annual Paid Leave</span>
              <span className="font-mono text-primary font-bold">16 / 24 Left</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "66%" }} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Syncs with payrun calendar days to compute paid vs unpaid days.
            </p>
          </div>

          <Link href="/time-off/allocations" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Manage Allocations <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Bento 5: Print-Ready Payslips */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between group hover:border-primary/40 transition-colors">
          <div className="space-y-3">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
              Audit-Ready Output
            </Badge>
            <h3 className="text-xl font-bold text-foreground">
              Instant Print & PDF Payslips
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate formatted, print-optimized salary slips showing exact computation breakdowns,
              employee bank details, and statutory deductions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
              <Printer className="size-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-foreground">Print-Optimized Engine</div>
              <p className="text-[11px] text-muted-foreground">Clean formatting with zero web UI clutter.</p>
            </div>
          </div>

          <Link href="/payroll/payslips" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Browse Payslips Ledger <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
