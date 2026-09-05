"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X,
  Users,
  FileText,
  Clock,
  CalendarCheck,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  const productModules = [
    {
      title: "Payroll Execution",
      desc: "2-Step Payrun wizard, automated formula rules & bank exports",
      href: "/payroll/payruns",
      icon: Banknote,
      tag: "Core Engine",
    },
    {
      title: "Employee Directory",
      desc: "Kanban records, bank validation & profile management",
      href: "/employees",
      icon: Users,
      tag: "Master Data",
    },
    {
      title: "Tiered Contracts",
      desc: "Salary structures, allowance & deduction assignments",
      href: "/contracts",
      icon: FileText,
      tag: "Contracts",
    },
    {
      title: "Attendance & Shifts",
      desc: "Biometric & quick punches with real-time presence health",
      href: "/attendance",
      icon: Clock,
      tag: "Real-Time",
    },
    {
      title: "Time Off & Accruals",
      desc: "Leave requests, balance deduction & entitlement tracking",
      href: "/time-off/requests",
      icon: CalendarCheck,
      tag: "Accruals",
    },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border/80 shadow-xs py-2.5"
          : "bg-transparent py-4 border-b border-border/40"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-foreground flex items-center gap-1 leading-none">
                PeoplePay<span className="text-primary font-black">360</span>
              </span>
              <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-mono font-semibold mt-0.5">
                Workforce OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Products Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => setProductsOpen(!productsOpen)}
              >
                <span>Products</span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    productsOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              {productsOpen && (
                <div className="absolute top-full left-0 w-80 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="rounded-2xl border border-border bg-card p-3 shadow-xl space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      Integrated Suite
                    </div>
                    {productModules.map((m) => {
                      const Icon = m.icon;
                      return (
                        <Link
                          key={m.title}
                          href={m.href}
                          className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/70 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 mt-0.5">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {m.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 h-4 border-primary/20 text-primary"
                              >
                                {m.tag}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                              {m.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <a
              href="#platform"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Platform
            </a>
            <a
              href="#comparison"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Comparison
            </a>
            <a
              href="#roi"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              ROI Calculator
            </a>
            <a
              href="#testimonials"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Customers
            </a>
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Link href="/dashboard" className="hidden sm:inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-border hover:bg-muted/80 text-foreground"
            >
              Sign In
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs px-4 rounded-xl flex items-center gap-1.5"
            >
              <span>Launch Live App</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-md px-4 py-4 space-y-3">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-foreground bg-primary/10 text-primary"
            >
              Dashboard (Live App)
            </Link>
            <a
              href="#platform"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Platform Overview
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Why PeoplePay360
            </a>
            <a
              href="#roi"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ROI Calculator
            </a>
          </div>

          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase font-mono px-3">
              Direct Module Navigation
            </div>
            <div className="grid grid-cols-2 gap-1 px-2 text-xs">
              <Link
                href="/employees"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                Employees
              </Link>
              <Link
                href="/contracts"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                Contracts
              </Link>
              <Link
                href="/attendance"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                Attendance
              </Link>
              <Link
                href="/payroll/payruns"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-muted"
              >
                Payruns
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
