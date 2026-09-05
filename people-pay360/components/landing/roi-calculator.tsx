"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrendingUp, Clock, ShieldCheck, ArrowRight, IndianRupee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoiCalculator() {
  const [employeeCount, setEmployeeCount] = useState(50);

  // Dynamic calculations based on employee count
  const hoursSavedPerMonth = Math.round(employeeCount * 0.65);
  const annualRupeeSavings = Math.round(hoursSavedPerMonth * 650 * 12);
  const turnaroundDaysBefore = employeeCount > 100 ? 4 : employeeCount > 30 ? 3 : 2;

  return (
    <section id="roi" className="py-24 bg-muted/20 border-y border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
            Quantifiable Impact
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Calculate How Much Time Your Team Saves
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Eliminating fragmented spreadsheets and manual payroll cross-checks immediately frees
            up dozens of operational hours every single pay cycle.
          </p>
        </div>

        <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl space-y-8">
          {/* Slider Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                How many employees does your organization pay?
              </span>
              <span className="text-2xl font-black font-mono text-primary bg-primary/10 px-4 py-1 rounded-xl">
                {employeeCount} Staff
              </span>
            </div>

            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Number(e.target.value))}
              className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />

            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>10 Employees</span>
              <span>100 Employees</span>
              <span>250 Employees</span>
              <span>500+ Employees</span>
            </div>
          </div>

          {/* Metric Outputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Clock className="size-4 text-primary" />
                <span>Admin Hours Saved</span>
              </div>
              <div className="text-3xl font-black font-mono text-foreground">
                ~{hoursSavedPerMonth} hrs
              </div>
              <p className="text-[11px] text-muted-foreground">Every single month on payroll verification</p>
            </div>

            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <IndianRupee className="size-4" />
                <span>Annual Cost Equivalent</span>
              </div>
              <div className="text-3xl font-black font-mono text-primary">
                ₹{annualRupeeSavings.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] text-muted-foreground">Reclaimed in productive HRBP bandwidth</p>
            </div>

            <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="size-4 text-emerald-500" />
                <span>Cycle Turnaround</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-600">
                15 Mins
              </div>
              <p className="text-[11px] text-muted-foreground">
                Reduced from {turnaroundDaysBefore} days to a single morning
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              <span>Includes 2-step payrun verification, automated attendance, and payslip PDF generation.</span>
            </div>
            <Link href="/dashboard">
              <Button size="sm" className="bg-primary text-primary-foreground font-bold text-xs whitespace-nowrap">
                Test With Live Dashboard <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
