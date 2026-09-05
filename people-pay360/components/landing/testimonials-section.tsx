"use client";

import React from "react";
import { Star, Quote, CheckCircle2 } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Before PeoplePay360, our monthly payrun took three full days of double-checking Excel formulas, cross-referencing attendance CSVs, and chasing managers. Now our entire batch executes in 15 minutes with zero calculation discrepancies.",
      author: "Priya Sundaram",
      role: "VP of People Operations",
      company: "Apex Labs (180 Staff)",
      metrics: "92% faster payrun cycles",
    },
    {
      quote:
        "Having biometric attendance punches and time-off allocations automatically feed into the payroll calculation breakdown eliminated 100% of our employee salary dispute tickets.",
      author: "Marcus Vance",
      role: "Head of Finance & Operations",
      company: "Nimbus Retail Group (320 Staff)",
      metrics: "Zero payroll dispute tickets",
    },
    {
      quote:
        "The mathematical rule sequencing gave our statutory audit committee complete transparency into how every gross wage, allowance, and tax deduction is derived. The print-ready payslips are flawless.",
      author: "Elena Rostova",
      role: "Chief People Officer",
      company: "Veloce Financial Technologies",
      metrics: "100% audit compliance",
    },
  ];

  return (
    <section id="testimonials" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="text-xs font-bold font-mono text-primary uppercase tracking-wider">
          Trusted by Workforce Leaders
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Loved by HR, Finance, and Employees Alike
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          See why fast-growing companies trust PeoplePay360 to deliver timely, accurate, and
          stress-free payroll every single month.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, idx) => (
          <div
            key={idx}
            className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-500" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed italic">
                "{t.quote}"
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div>
                <div className="font-bold text-xs text-foreground">{t.author}</div>
                <div className="text-[11px] text-muted-foreground">{t.role}</div>
                <div className="text-[11px] font-semibold text-primary">{t.company}</div>
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">
                <CheckCircle2 className="size-3" />
                <span>{t.metrics}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
