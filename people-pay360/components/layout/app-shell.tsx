"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  CalendarDays,
  Banknote,
  BarChart3,
  ChevronDown,
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { payruns } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Auto-expand submenus if current path matches
  useEffect(() => {
    if (pathname.startsWith("/time-off")) setTimeOffOpen(true);
    if (pathname.startsWith("/payroll")) setPayrollOpen(true);
  }, [pathname]);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  // Collect active warnings across payruns
  const allWarnings = payruns.flatMap((p) => p.warnings || []);

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "Employees",
      href: "/employees",
      icon: Users,
      active: pathname.startsWith("/employees"),
    },
    {
      label: "Contracts",
      href: "/contracts",
      icon: FileText,
      active: pathname.startsWith("/contracts"),
    },
    {
      label: "Attendance",
      href: "/attendance",
      icon: Clock,
      active: pathname.startsWith("/attendance"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="size-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
              P
            </div>
            <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1">
              PeoplePay<span className="text-primary font-black">360</span>
            </span>
          </Link>

          <Badge variant="outline" className="hidden lg:inline-flex ml-2 gap-1 font-mono text-[11px] bg-muted/50">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            February 2026 • Validated
          </Badge>
        </div>

        {/* Global Search & Action Area */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block w-52 md:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employees, contracts... (⌘K)"
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Notifications / Alerts Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setAlertsOpen(!alertsOpen)}
              className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Operational Alerts"
            >
              <Bell className="size-4" />
              {allWarnings.length > 0 && (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 ring-2 ring-card" />
              )}
            </button>

            {alertsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-4 shadow-xl z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <span>Operational Alerts</span>
                  </div>
                  <Badge variant="warning">{allWarnings.length} Issues</Badge>
                </div>
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {allWarnings.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">All systems clear! No payroll warnings.</p>
                  ) : (
                    allWarnings.map((warn, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                        <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{warn}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="size-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-primary font-bold text-xs flex items-center justify-center">
              AM
            </div>
            <div className="hidden xl:block text-left text-xs leading-tight">
              <p className="font-semibold text-foreground">Aarav Mehta</p>
              <p className="text-[10px] text-muted-foreground">HR Payroll Manager</p>
            </div>
          </div>
        </div>
      </header>

      {/* Body container with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Desktop */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 select-none",
            sidebarOpen ? "w-60" : "w-16"
          )}
        >
          <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    item.active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <Icon className="size-4 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}

            {/* Time Off Accordion */}
            <div className="pt-2">
              <button
                onClick={() => setTimeOffOpen(!timeOffOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                  pathname.startsWith("/time-off") && "text-foreground font-semibold"
                )}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-4 shrink-0" />
                  {sidebarOpen && <span>Time Off</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown className={cn("size-3.5 transition-transform", timeOffOpen && "rotate-180")} />
                )}
              </button>

              {timeOffOpen && sidebarOpen && (
                <div className="pl-9 pr-2 py-1 space-y-1">
                  <Link
                    href="/time-off/requests"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname === "/time-off/requests"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Requests
                  </Link>
                  <Link
                    href="/time-off/allocations"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname === "/time-off/allocations"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Allocations
                  </Link>
                  <Link
                    href="/time-off/types"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname === "/time-off/types"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Time Off Types
                  </Link>
                </div>
              )}
            </div>

            {/* Payroll Accordion */}
            <div className="pt-1">
              <button
                onClick={() => setPayrollOpen(!payrollOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                  pathname.startsWith("/payroll") && "text-foreground font-semibold"
                )}
              >
                <div className="flex items-center gap-3">
                  <Banknote className="size-4 shrink-0" />
                  {sidebarOpen && <span>Payroll</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown className={cn("size-3.5 transition-transform", payrollOpen && "rotate-180")} />
                )}
              </button>

              {payrollOpen && sidebarOpen && (
                <div className="pl-9 pr-2 py-1 space-y-1">
                  <Link
                    href="/payroll/payruns"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname.startsWith("/payroll/payruns")
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Payruns
                  </Link>
                  <Link
                    href="/payroll/payslips"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname === "/payroll/payslips"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Payslips
                  </Link>
                  <Link
                    href="/payroll/structures"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname === "/payroll/structures"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Salary Structures
                  </Link>
                  <Link
                    href="/payroll/rules"
                    className={cn(
                      "block px-2.5 py-1.5 rounded-md text-xs transition-colors",
                      pathname === "/payroll/rules"
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    Salary Rules
                  </Link>
                </div>
              )}
            </div>

            {/* Reports */}
            <Link
              href="/reports"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                pathname === "/reports"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Reports & Analytics"
            >
              <BarChart3 className="size-4 shrink-0" />
              {sidebarOpen && <span>Reports</span>}
            </Link>
          </div>

          {/* Quick System Status Card at bottom */}
          {sidebarOpen && (
            <div className="p-3 m-2 rounded-xl bg-muted/50 border border-border/80 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                <Sparkles className="size-3.5 text-primary" />
                <span>Operational Status</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Active payrun February 2026 validated. 8 payslips ready for disbursement.
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/95 p-6 md:hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="font-bold text-base">Navigation</div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <Link onClick={() => setMobileMenuOpen(false)} href="/" className="px-3 py-2 rounded-md hover:bg-muted">Dashboard</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/employees" className="px-3 py-2 rounded-md hover:bg-muted">Employees</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/contracts" className="px-3 py-2 rounded-md hover:bg-muted">Contracts</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/attendance" className="px-3 py-2 rounded-md hover:bg-muted">Attendance</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/time-off/requests" className="px-3 py-2 rounded-md hover:bg-muted">Time Off Requests</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/time-off/allocations" className="px-3 py-2 rounded-md hover:bg-muted">Time Off Allocations</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/payroll/payruns" className="px-3 py-2 rounded-md hover:bg-muted">Payruns</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/payroll/payslips" className="px-3 py-2 rounded-md hover:bg-muted">Payslips</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/payroll/structures" className="px-3 py-2 rounded-md hover:bg-muted">Salary Structures</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/payroll/rules" className="px-3 py-2 rounded-md hover:bg-muted">Salary Rules</Link>
                <Link onClick={() => setMobileMenuOpen(false)} href="/reports" className="px-3 py-2 rounded-md hover:bg-muted">Reports</Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
