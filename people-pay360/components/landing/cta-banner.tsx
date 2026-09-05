"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-amber-700 p-8 sm:p-14 text-white overflow-hidden shadow-2xl">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 size-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 size-80 rounded-full bg-black/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            <span>Ready for Next-Generation Payroll?</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Stop Wrestling With Spreadsheets. Run PeoplePay360 Today.
          </h2>

          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl">
            Experience the peace of mind that comes with unified employee contracts, automatic
            attendance sync, and zero-error payrun execution.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-bold text-sm h-12 px-7 rounded-2xl shadow-lg flex items-center justify-center gap-2"
              >
                <span>Launch Operational Live App</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>

            <Link href="/payroll/payruns">
              <Button
                variant="outline"
                size="lg"
                className="border-white/40 text-white hover:bg-white/15 font-semibold text-sm h-12 px-6 rounded-2xl bg-transparent"
              >
                Explore Active Payruns
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-4 text-xs text-white/80 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>Full Interactive Features</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>No Sign-Up Required for Demo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" />
              <span>Audit Ready & SOC2 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
