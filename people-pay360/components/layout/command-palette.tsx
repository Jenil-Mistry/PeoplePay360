"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  FileText,
  Clock,
  CalendarDays,
  Banknote,
  BarChart3,
  Layers,
  Settings2,
  FileCheck,
  ArrowRight,
  Sparkles,
  X,
  CornerDownLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Pages" | "Employees" | "Contracts" | "Payruns" | "Quick Actions";
  icon: React.ElementType;
  badge?: string;
  href: string;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { employees, contracts, payruns } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMac(typeof window !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
  }, []);

  // Autofocus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Static Navigation Pages
  const pages: CommandItem[] = useMemo(
    () => [
      {
        id: "nav-dashboard",
        title: "Payroll & Operations Dashboard",
        subtitle: "Real-time KPIs, attendance health, department payroll",
        category: "Pages",
        icon: BarChart3,
        href: "/dashboard",
        keywords: "dashboard home kpis metrics analytics stats",
      },
      {
        id: "nav-employees",
        title: "Employee Directory",
        subtitle: "Manage staff, bank account validation, profiles",
        category: "Pages",
        icon: Users,
        href: "/employees",
        keywords: "employees staff workers people team members",
      },
      {
        id: "nav-contracts",
        title: "Tiered Contracts",
        subtitle: "Contract lifecycles, monthly wages, salary structures",
        category: "Pages",
        icon: FileText,
        href: "/contracts",
        keywords: "contracts employment agreements wage salary draft active",
      },
      {
        id: "nav-attendance",
        title: "Attendance & Shifts",
        subtitle: "Daily punches, overtime, biometric verification",
        category: "Pages",
        icon: Clock,
        href: "/attendance",
        keywords: "attendance shifts hours punches check-in overtime present late",
      },
      {
        id: "nav-timeoff-requests",
        title: "Time Off Requests",
        subtitle: "Submit, approve, and refuse leave applications",
        category: "Pages",
        icon: CalendarDays,
        href: "/time-off/requests",
        keywords: "leave time off requests vacation sick days holiday absent",
      },
      {
        id: "nav-timeoff-allocations",
        title: "Leave Allocations",
        subtitle: "Annual entitlements, balances, and used days ledger",
        category: "Pages",
        icon: CalendarDays,
        href: "/time-off/allocations",
        keywords: "allocations entitlements balances days ledger credits",
      },
      {
        id: "nav-timeoff-types",
        title: "Time Off Types",
        subtitle: "Configure paid leave, sick leave, and casual leave policies",
        category: "Pages",
        icon: Settings2,
        href: "/time-off/types",
        keywords: "leave types policy configuration paid sick casual",
      },
      {
        id: "nav-payruns",
        title: "Payrun Batches",
        subtitle: "Batch execution, payroll computation, bank disbursement",
        category: "Pages",
        icon: Banknote,
        href: "/payroll/payruns",
        keywords: "payrun payroll batch salary computation payslips",
      },
      {
        id: "nav-payslips",
        title: "Payslip Ledger",
        subtitle: "View and print verified employee payslips",
        category: "Pages",
        icon: FileCheck,
        href: "/payroll/payslips",
        keywords: "payslips salary slips receipts deduction gross net",
      },
      {
        id: "nav-structures",
        title: "Salary Structures",
        subtitle: "Compensation rules groupings and templates",
        category: "Pages",
        icon: Layers,
        href: "/payroll/structures",
        keywords: "structures salary templates compensation brackets",
      },
      {
        id: "nav-rules",
        title: "Salary Rules",
        subtitle: "Allowance formulas, PF, PT, deductions sequence",
        category: "Pages",
        icon: Settings2,
        href: "/payroll/rules",
        keywords: "rules formulas hra basic pf pt tax deductions allowances",
      },
      {
        id: "nav-reports",
        title: "Payroll Reports",
        subtitle: "Cost breakdown, compliance exports, department summary",
        category: "Pages",
        icon: BarChart3,
        href: "/reports",
        keywords: "reports export compliance csv pdf analytics summary audit",
      },
    ],
    []
  );

  // Dynamic search items from store
  const allItems = useMemo<CommandItem[]>(() => {
    const employeeItems: CommandItem[] = employees.map((emp) => ({
      id: `emp-${emp.id}`,
      title: emp.name,
      subtitle: `${emp.jobPosition} • ${emp.department} • ${emp.workEmail}`,
      category: "Employees",
      icon: Users,
      badge: emp.department,
      href: `/employees`,
      keywords: `${emp.name} ${emp.workEmail} ${emp.department} ${emp.jobPosition}`,
    }));

    const contractItems: CommandItem[] = contracts.map((c) => ({
      id: `contract-${c.id}`,
      title: `${c.refCode} — ${c.employeeName}`,
      subtitle: `Status: ${c.status} • Wage: ${formatCurrency(c.wage)} / mo`,
      category: "Contracts",
      icon: FileText,
      badge: c.status,
      href: `/contracts`,
      keywords: `${c.refCode} ${c.employeeName} ${c.status} ${c.wage}`,
    }));

    const payrunItems: CommandItem[] = payruns.map((pr) => ({
      id: `payrun-${pr.id}`,
      title: pr.name,
      subtitle: `Period: ${pr.periodStart} to ${pr.periodEnd} • Net: ${formatCurrency(pr.totalNet)}`,
      category: "Payruns",
      icon: Banknote,
      badge: pr.status,
      href: `/payroll/payruns/${pr.id}`,
      keywords: `${pr.name} ${pr.status} ${pr.periodStart} ${pr.periodEnd}`,
    }));

    const quickActions: CommandItem[] = [
      {
        id: "action-new-payrun",
        title: "Launch New Payrun",
        subtitle: "Start a 2-step automated payroll batch wizard",
        category: "Quick Actions",
        icon: Sparkles,
        href: "/payroll/payruns",
        keywords: "create run payrun batch start execute wizard",
      },
      {
        id: "action-new-timeoff",
        title: "Request Time Off",
        subtitle: "Submit a new employee leave request",
        category: "Quick Actions",
        icon: CalendarDays,
        href: "/time-off/requests",
        keywords: "request leave apply time off vacation",
      },
    ];

    return [...pages, ...employeeItems, ...contractItems, ...payrunItems, ...quickActions];
  }, [pages, employees, contracts, payruns]);

  // Filtered items based on search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Default: show pages and quick actions
      return allItems.filter((i) => i.category === "Pages" || i.category === "Quick Actions");
    }

    const q = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.keywords && item.keywords.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleSelect = (item: CommandItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette Modal */}
      <div
        className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3 bg-muted/20">
          <Search className="size-4.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees, contracts, payruns, pages..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-border/40 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No matching results</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching by employee name, ID, contract, period, or page title.
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="pt-1.5 first:pt-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  {category}
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {items.map((item) => {
                    const currentIndex = filteredItems.findIndex((i) => i.id === item.id);
                    const isSelected = currentIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-foreground hover:bg-muted/70"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "p-2 rounded-lg shrink-0",
                              isSelected
                                ? "bg-primary-foreground/15 text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold truncate flex items-center gap-2">
                              <span>{item.title}</span>
                              {item.badge && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] py-0 px-1.5 h-4 border",
                                    isSelected
                                      ? "border-primary-foreground/30 text-primary-foreground"
                                      : "border-border text-muted-foreground"
                                  )}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.subtitle && (
                              <p
                                className={cn(
                                  "text-[11px] truncate mt-0.5",
                                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 ml-2">
                          {isSelected && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-primary-foreground/90">
                              <span>Go</span>
                              <CornerDownLeft className="size-3" />
                            </span>
                          )}
                          {!isSelected && (
                            <ArrowRight className="size-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[9px]">↑</kbd>
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[9px]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[9px]">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span>Shortcut:</span>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-semibold text-foreground">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
