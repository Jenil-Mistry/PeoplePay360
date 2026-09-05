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
  Sparkles,
} from "lucide-react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    setIsDarkMode(document.documentElement.classList.contains("dark"));
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
      desc: "2-Step Payrun wizard & formula rules",
      href: "/payroll/payruns",
      icon: Banknote,
    },
    {
      title: "Employee Directory",
      desc: "Kanban records & banking validation",
      href: "/employees",
      icon: Users,
    },
    {
      title: "Tiered Contracts",
      desc: "Salary structures & allowance rules",
      href: "/contracts",
      icon: FileText,
    },
    {
      title: "Attendance & Shifts",
      desc: "Biometric & one-tap quick punches",
      href: "/attendance",
      icon: Clock,
    },
    {
      title: "Time Off & Accruals",
      desc: "Leave requests & auto balance deduction",
      href: "/time-off/requests",
      icon: CalendarCheck,
    },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-200 border-b ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-border/80 shadow-xs"
          : "bg-background/80 backdrop-blur-md border-border/40"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
        {/* Far Left: Circular Logo Mark + Brand Name */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-9 sm:size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm sm:text-base shadow-xs group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight text-foreground">
            PeoplePay<span className="text-primary font-black">360</span>
          </span>
        </Link>

        {/* Center: Horizontal Navigation Links naturally placed across navbar */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
          <a
            href="#platform"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            Platform
          </a>

          {/* Modules Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setModulesOpen(true)}
            onMouseLeave={() => setModulesOpen(false)}
          >
            <button
              onClick={() => setModulesOpen(!modulesOpen)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              <span>Modules</span>
              <ChevronDown
                className={`size-3 transition-transform duration-200 ${
                  modulesOpen ? "rotate-180 text-primary" : ""
                }`}
              />
            </button>

            {modulesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-72 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="rounded-2xl border border-border bg-card p-3 shadow-xl space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Core Platform Modules
                  </div>
                  {productModules.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Link
                        key={m.title}
                        href={m.href}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/70 transition-colors group"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">{m.title}</div>
                          <div className="text-[11px] text-muted-foreground leading-none mt-0.5">
                            {m.desc}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <a
            href="#comparison"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            Comparison
          </a>
          <a
            href="#roi"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            ROI
          </a>
          <a
            href="#testimonials"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            Customers
          </a>
        </nav>

        {/* Far Right: Theme Toggle + CTA Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={toggleTheme}
            className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <Link href="/dashboard">
            <button className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wide shadow-sm flex items-center gap-1.5 transition-all duration-150 active:scale-95 whitespace-nowrap">
              <span>Launch Live App</span>
              <ArrowRight className="size-3.5" />
            </button>
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Clean full-width accordion under header) */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-card/98 backdrop-blur-2xl px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-col gap-1">
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#platform"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              Platform
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              Comparison
            </a>
            <a
              href="#roi"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              ROI
            </a>
            <a
              href="#testimonials"
              onClick={() => setMobileOpen(false)}
              className="p-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            >
              Customers
            </a>
          </div>

          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase font-mono px-1 tracking-wider">
              Direct Module Links
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Link
                href="/employees"
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground font-medium"
              >
                Employees
              </Link>
              <Link
                href="/contracts"
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground font-medium"
              >
                Contracts
              </Link>
              <Link
                href="/attendance"
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground font-medium"
              >
                Attendance
              </Link>
              <Link
                href="/payroll/payruns"
                onClick={() => setMobileOpen(false)}
                className="p-2.5 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground font-medium"
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
