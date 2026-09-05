"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Users,
  FileText,
  Clock,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<
    "payroll" | "contracts" | "attendance" | "timeoff" | "employees"
  >("payroll");

  const tabs = [
    { id: "payroll", label: "Payroll Engine", icon: Banknote, tag: "2-Step Wizard" },
    { id: "contracts", label: "Smart Contracts", icon: FileText, tag: "Sequence Rules" },
    { id: "attendance", label: "Attendance & Shifts", icon: Clock, tag: "Live Punches" },
    { id: "timeoff", label: "Time Off & Accruals", icon: CalendarCheck, tag: "Auto-Deduct" },
    { id: "employees", label: "Employee Directory", icon: Users, tag: "Master Data" },
  ] as const;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tab Selectors */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                  : "bg-card/70 text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                  isActive
                    ? "bg-white/20 text-white font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Showcase Canvas */}
      <div className="mt-6 rounded-3xl border border-border/80 bg-card p-4 sm:p-8 shadow-2xl transition-all duration-300">
        {/* Tab 1: Payroll Engine */}
        {activeTab === "payroll" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                    Batch Engine Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">Cycle: Feb 01 — Feb 28, 2026</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  Automated 2-Step Payrun Execution
                </h3>
                <p className="text-xs text-muted-foreground">
                  Synchronizes employee contracts, attendance days, and time off deductions into
                  mathematical salary rules.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/payroll/payruns">
                  <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold">
                    Open Batch Wizard <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mock Payrun Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Total Batch Net Payout</span>
                <div className="text-2xl font-bold font-mono text-foreground">₹6,42,500.00</div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> 8 Employee Payslips Computed
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    Pre-Flight Safety Check
                  </span>
                  <AlertTriangle className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
                  2 Warnings
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Missing bank accounts caught before bank file transfer.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Processing Speed</span>
                <div className="text-2xl font-bold font-mono text-foreground">15 seconds</div>
                <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                  <Zap className="size-3.5" /> Formula calculation across all structures
                </span>
              </div>
            </div>

            {/* Sample Payslip Breakdown Row */}
            <div className="rounded-2xl border border-border overflow-hidden bg-background">
              <div className="p-3 bg-muted/50 font-semibold text-xs text-muted-foreground flex justify-between">
                <span>Sample Computation Breakdown</span>
                <span className="font-mono text-primary font-bold">Rule Sequence Execution: OK</span>
              </div>
              <div className="divide-y divide-border text-xs">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">Basic Salary</span>
                    <span className="ml-2 font-mono text-muted-foreground">Rule: BASIC</span>
                  </div>
                  <span className="font-mono font-bold">₹42,500.00</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">House Rent Allowance (50% Basic)</span>
                    <span className="ml-2 font-mono text-muted-foreground">Rule: HRA</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600">+₹21,250.00</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">Provident Fund Deduction</span>
                    <span className="ml-2 font-mono text-muted-foreground">Rule: PF</span>
                  </div>
                  <span className="font-mono font-bold text-rose-500">-₹3,000.00</span>
                </div>
                <div className="p-3 bg-primary/10 flex items-center justify-between font-bold">
                  <span className="text-foreground">Net Salary To Disburse</span>
                  <span className="font-mono text-primary text-sm">₹68,750.00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Smart Contracts */}
        {activeTab === "contracts" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                  Multi-Tier Contract Architecture
                </Badge>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  Assign Structures, Allowances, and Deductions
                </h3>
                <p className="text-xs text-muted-foreground">
                  Each employee contract binds to an active salary structure with full date range
                  validity and status tracking (Draft, Running, Expired).
                </p>
              </div>
              <Link href="/contracts">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold">
                  Explore Contracts <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground">Standard Staff Contract</div>
                  <Badge variant="success" className="text-[10px]">Running</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Attached to: <strong>Regular Salary Structure</strong>
                </p>
                <div className="space-y-2 text-xs pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Wage:</span>
                    <span className="font-mono font-bold">₹85,000 / mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allowances:</span>
                    <span className="font-mono text-emerald-600">HRA (50%), Conveyance (₹1,500)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deductions:</span>
                    <span className="font-mono text-rose-500">PF (₹3,000), Professional Tax (₹2,000)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-foreground">Executive Tier Contract</div>
                  <Badge variant="success" className="text-[10px]">Running</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Attached to: <strong>Executive Leadership Structure</strong>
                </p>
                <div className="space-y-2 text-xs pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Wage:</span>
                    <span className="font-mono font-bold">₹1,40,000 / mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allowances:</span>
                    <span className="font-mono text-emerald-600">Performance Bonus (15%), Medical</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deductions:</span>
                    <span className="font-mono text-rose-500">TDS / Higher Slab Withholding</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Attendance & Shifts */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                  Live Biometric & Quick Punch
                </Badge>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  Direct Presence Sync Into Payroll
                </h3>
                <p className="text-xs text-muted-foreground">
                  Eliminate time-theft and CSV imports. Attendance status feeds directly into worked days
                  and unpaid absence calculations.
                </p>
              </div>
              <Link href="/attendance">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold">
                  View Attendance Ledger <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-3xl font-bold font-mono text-emerald-600">94%</div>
                <span className="text-xs text-muted-foreground font-semibold">Present Today</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-3xl font-bold font-mono text-amber-600">18</div>
                <span className="text-xs text-muted-foreground font-semibold">Late Check-Ins</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-3xl font-bold font-mono text-blue-600">14.5h</div>
                <span className="text-xs text-muted-foreground font-semibold">Logged Overtime</span>
              </div>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                <div className="text-3xl font-bold font-mono text-foreground">0</div>
                <span className="text-xs text-muted-foreground font-semibold">Missing Punches</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Time Off & Accruals */}
        {activeTab === "timeoff" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                  Automated Balance Deduction
                </Badge>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  Leave Approvals Without Balance Discrepancies
                </h3>
                <p className="text-xs text-muted-foreground">
                  Submitting and approving time off automatically decrements available quota and informs
                  payrun worked-day counts.
                </p>
              </div>
              <Link href="/time-off/requests">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold">
                  Review Time Off <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: "Paid Time Off (PTO)", allocated: 24, taken: 8, remaining: 16 },
                { type: "Sick / Medical Leave", allocated: 12, taken: 2, remaining: 10 },
                { type: "Compensatory Off", allocated: 6, taken: 1, remaining: 5 },
              ].map((item) => (
                <div key={item.type} className="p-4 rounded-2xl border border-border bg-background space-y-3">
                  <div className="font-bold text-sm text-foreground">{item.type}</div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(item.taken / item.allocated) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Taken: {item.taken}d</span>
                    <span className="font-bold text-primary">Left: {item.remaining}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Employee Directory */}
        {activeTab === "employees" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                  Master Workforce Registry
                </Badge>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  Unified Employee Profiles & Banking Verification
                </h3>
                <p className="text-xs text-muted-foreground">
                  Kanban visual directory, department filters, and automated checks for missing bank
                  account details.
                </p>
              </div>
              <Link href="/employees">
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-bold">
                  Open Directory <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: "Aarav Mehta", role: "Principal Engineer", dept: "Engineering", bank: "Verified" },
                { name: "Neha Sharma", role: "HR Operations Lead", dept: "Human Resources", bank: "Verified" },
                { name: "Kunal Verma", role: "Financial Analyst", dept: "Finance", bank: "Verified" },
              ].map((emp) => (
                <div key={emp.name} className="p-4 rounded-2xl border border-border bg-background space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center font-mono text-xs">
                      {emp.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">{emp.name}</div>
                      <div className="text-[11px] text-muted-foreground">{emp.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border">
                    <Badge variant="outline" className="text-[10px]">{emp.dept}</Badge>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> {emp.bank}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
