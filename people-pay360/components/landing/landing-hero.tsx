"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InteractiveShowcase } from "./interactive-showcase";

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Gradients & Mesh */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex justify-center">
        <div className="w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl -translate-y-12" />
        <div className="w-[500px] h-[300px] bg-secondary/10 rounded-full blur-3xl translate-x-48 translate-y-16" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">

        {/* Hero Headline */}
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Run HR, Contracts, Time Off, and Payroll on{" "}
            <span className="text-primary decoration-primary/30 decoration-wavy decoration-2">
              One Synchronized Engine.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Eliminate payroll calculation errors and manual CSV exports. PeoplePay360 unifies
            employee master records, attendance punches, multi-tier contracts, and mathematical salary
            rules into an automated real-time operating system.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md px-7 rounded-2xl h-12 flex items-center gap-2 transition-transform active:scale-95"
            >
              <span>Launch Live App</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>

          <a href="#comparison">
            <Button
              variant="outline"
              size="lg"
              className="border-border hover:bg-muted/80 text-foreground font-semibold text-sm px-6 rounded-2xl h-12"
            >
              Why PeoplePay360 vs Disconnected Tools
            </Button>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>99.98% Calculation Accuracy</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Zap className="size-4 text-primary" />
            <span>15-Minute Payrun Batches</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="size-4 text-blue-500" />
            <span>SOC 2 & Statutory Audit Ready</span>
          </div>
        </div>

        {/* Interactive Showcase Section */}
        <div className="pt-10">
          <InteractiveShowcase />
        </div>
      </div>
    </section>
  );
}
