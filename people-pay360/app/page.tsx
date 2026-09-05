"use client";

import React from "react";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { BentoFeatures } from "@/components/landing/bento-features";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Sticky Glassmorphic Navbar */}
      <LandingNavbar />

      <main className="space-y-4">
        {/* Hero Section with Interactive Product Showcase */}
        <LandingHero />

        {/* Architectural Contrast: Disconnected Spreadsheets vs Synchronized OS */}
        <ComparisonSection />

        {/* Bento Grid: 5 Core Precision Capabilities */}
        <BentoFeatures />

        {/* Interactive Workforce ROI & Time-Savings Calculator */}
        <RoiCalculator />

        {/* Customer Social Proof & Testimonials */}
        <TestimonialsSection />

        {/* High-Converting Pre-Footer CTA */}
        <CtaBanner />
      </main>

      {/* Multi-Column Enterprise Footer */}
      <LandingFooter />
    </div>
  );
}
