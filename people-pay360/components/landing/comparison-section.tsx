"use client";

import React from "react";
import { XCircle, CheckCircle2, ArrowRight, Zap, RefreshCw, Layers } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ComparisonSection() {
  const comparisons = [
    {
      aspect: "Contract & Wage Updates",
      legacy: "Retroactive contract amendments require manual spreadsheet adjustments and re-auditing.",
      peoplePay: "Contract terms immediately update assigned salary structures with instant period recalculation.",
    },
    {
      aspect: "Attendance & Overtime Sync",
      legacy: "Manual CSV exports from biometric machines with frequent missing check-outs and errors.",
      peoplePay: "Direct attendance ledger with one-tap quick punch and automatic worked-day feeding.",
    },
    {
      aspect: "Time Off Deduction",
      legacy: "Uncoordinated email approvals leading to paid leave taken beyond allocated employee balances.",
      peoplePay: "Automated entitlement engine; approved leaves automatically deduct from balance & salary.",
    },
    {
      aspect: "Payrun Verification Speed",
      legacy: "3 to 4 days of manual formula checks, cross-department meetings, and VLOOKUP troubleshooting.",
      peoplePay: "15-minute 2-Step Batch Wizard with automated pre-flight warning detection.",
    },
    {
      aspect: "Audit & Statutory Transparency",
      legacy: "Opaque net numbers with little calculation trace, creating employee confusion and compliance risk.",
      peoplePay: "Transparent sequence breakdown table for every payslip with one-click print-ready formatting.",
    },
  ];

  return (
    <section id="comparison" className="py-24 bg-muted/20 border-y border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
            Architectural Advantage
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Why Fragmented Tools Fail When Payroll Is On the Line
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            When employee records, contracts, attendance clocks, and payroll live in separate
            silos, human errors multiply. PeoplePay360 binds every module into a unified data model.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Legacy Card */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <XCircle className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Disconnected Legacy Tools
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Multiple disconnected apps, spreadsheets, and CSV exports
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border/60 text-xs">
                {comparisons.map((c, i) => (
                  <div key={i} className="py-3.5 space-y-1">
                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wide">
                      {c.aspect}
                    </span>
                    <p className="text-rose-600/90 dark:text-rose-400 leading-relaxed flex items-start gap-2">
                      <XCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{c.legacy}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-xs text-rose-700 dark:text-rose-300 font-medium text-center">
              ⚠️ Result: High discrepancy rates, delayed disbursement, and audit headaches.
            </div>
          </div>

          {/* PeoplePay360 Card */}
          <div className="rounded-3xl border-2 border-primary/40 bg-card p-6 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-bl-2xl font-mono">
              Synchronized OS
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    PeoplePay360 Unified System
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Single source of employee truth running mathematical sequence rules
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border/60 text-xs">
                {comparisons.map((c, i) => (
                  <div key={i} className="py-3.5 space-y-1">
                    <span className="font-bold text-primary uppercase text-[10px] tracking-wide">
                      {c.aspect}
                    </span>
                    <p className="text-foreground font-medium leading-relaxed flex items-start gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{c.peoplePay}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-semibold text-primary">
                ✓ 99.98% Accuracy & 15-Minute Cycle Turnaround
              </div>
              <Link href="/dashboard">
                <Button size="sm" className="bg-primary text-primary-foreground font-bold text-xs">
                  Try Operational Live Demo <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
