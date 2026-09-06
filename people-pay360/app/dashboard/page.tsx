"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  IndianRupee,
  FileCheck,
  TrendingUp,
  CalendarCheck,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardMetrics } from "@/lib/actions/dashboard";
import { getOperationalAlerts, type OperationalAlert } from "@/lib/actions/alerts";

export default function DashboardPage() {
  const { payruns, payslips, employees, attendance, timeOffRequests, allocations } = useAppStore();

  const [selectedPeriod, setSelectedPeriod] = useState("February 2026");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [selectedEmpType, setSelectedEmpType] = useState("All Types");

  // Server-derived dashboard state
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboardMetrics>> | null>(null);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch live dashboard metrics from server
  const refreshMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const [metricsResult, alertsResult] = await Promise.all([
        getDashboardMetrics({
          payrunName: selectedPeriod,
          departmentName: selectedDept,
          employeeType: selectedEmpType,
        }),
        getOperationalAlerts(),
      ]);
      setMetrics(metricsResult);
      setAlerts(alertsResult);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, [selectedPeriod, selectedDept, selectedEmpType]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  // Active Payrun
  const activePayrun = useMemo(() => {
    return payruns.find((p) => p.name === selectedPeriod) || payruns[1] || payruns[0];
  }, [payruns, selectedPeriod]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((ps) => {
      if (activePayrun && ps.payrunId !== activePayrun.id) return false;
      if (selectedDept !== "All Departments" && ps.department !== selectedDept) return false;
      return true;
    });
  }, [payslips, activePayrun, selectedDept]);

  // Use server-derived KPIs when available, fallback to client computation
  const totalNetSalary = metrics?.kpis.totalNetSalaryPaid ?? filteredPayslips.reduce((acc, ps) => acc + ps.net, 0);
  const payslipsCount = metrics?.kpis.payslipsGenerated ?? filteredPayslips.length;
  const avgSalary = metrics?.kpis.averageSalary ?? (payslipsCount > 0 ? Math.round(totalNetSalary / payslipsCount) : 0);
  const approvedTimeOffDays = metrics?.kpis.approvedTimeOffDays ?? 0;
  const attendanceHealth = metrics?.kpis.attendanceHealth ?? 0;

  // Department payroll breakdown — from live server data
  const departmentBreakdown = useMemo(() => {
    if (metrics?.deptBreakdown) {
      return metrics.deptBreakdown.map((d) => [d.name, { count: d.headcount, totalWage: d.totalSalary }] as [string, { count: number; totalWage: number }]);
    }
    // No fallback to hardcoded values — show empty until data loads
    return [] as [string, { count: number; totalWage: number }][];
  }, [metrics]);

  // Monthly trends — from live server data
  const monthlyTrends = useMemo(() => {
    if (metrics?.monthlyTrends && metrics.monthlyTrends.length > 0) {
      const maxNet = Math.max(...metrics.monthlyTrends.map((t) => t.totalNet), 1);
      return metrics.monthlyTrends.map((t) => ({
        month: t.month.length > 3 ? t.month.slice(0, 3) : t.month,
        amount: t.totalNet,
        height: Math.round((t.totalNet / maxNet) * 95),
      }));
    }
    return [];
  }, [metrics]);

  // Operational alerts — from live server data
  const operationalAlerts = alerts;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header with Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Payroll & Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time synchronization across Employees, Contracts, Attendance, Time Off, and Payruns.
          </p>
        </div>

        {/* Filters Bar & Action */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto shrink-0 pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 text-xs shadow-2xs shrink-0">
            <Filter className="size-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer text-xs"
            >
              {payruns.map((pr) => (
                <option key={pr.id} value={pr.name}>
                  {pr.name} ({pr.status})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs shadow-2xs shrink-0">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              <option value="All Departments">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Operations">Operations</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          <div className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs shadow-2xs shrink-0">
            <select
              value={selectedEmpType}
              onChange={(e) => setSelectedEmpType(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
            >
              <option value="All Types">All Staff Types</option>
              <option value="Full-Time">Full-Time Staff</option>
              <option value="Contractor">Contractors</option>
            </select>
          </div>

          <Link href="/payroll/payruns" className="shrink-0">
            <Button size="sm" className="bg-primary text-primary-foreground font-medium shrink-0 whitespace-nowrap h-8">
              Go to Payrun
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 KPI Metric Cards (As required by PDF Section A7 & Excalidraw Section 6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Net Salary */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Net Salary Paid</CardTitle>
            <IndianRupee className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight text-foreground font-mono">
              {formatCompactCurrency(totalNetSalary)}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-0.5 mt-1">
              <span>Across {payslipsCount > 0 ? "active" : "all"} payruns</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Payslips Generated */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Payslips Generated</CardTitle>
            <FileCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight text-foreground font-mono">{payslipsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activePayrun?.status === "Paid" ? "100% disbursed" : "Validated & pending transfer"}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Avg Salary */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Salary / Emp</CardTitle>
            <Users className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight text-foreground font-mono">
              {formatCurrency(avgSalary)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Based on current active payrun</p>
          </CardContent>
        </Card>

        {/* Card 4: Approved Time Off */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Approved Time Off</CardTitle>
            <CalendarCheck className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight text-foreground font-mono">{approvedTimeOffDays} Days</div>
            <p className="text-[11px] text-muted-foreground mt-1">Across active pay cycle</p>
          </CardContent>
        </Card>

        {/* Card 5: Attendance Health */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Attendance Health</CardTitle>
            <Activity className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight text-foreground font-mono">{attendanceHealth}%</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Present / on-time punches</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Analytical Visualizations & Operational Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Charts and Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Salary Cost by Department */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Salary Cost by Department</CardTitle>
                <CardDescription>Source: Period payslips matched with employee department</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedPeriod}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5 pt-2">
                {departmentBreakdown.map(([dept, data]) => {
                  const maxWage = 300000;
                  const percentage = Math.min(100, Math.round((data.totalWage / maxWage) * 100));
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {dept} <span className="text-muted-foreground">({data.count} staff)</span>
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatCurrency(data.totalWage)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Net Salary Trend Line Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Monthly Net Salary Trend</CardTitle>
                <CardDescription>Historical Payrun execution totals over the past 6 months</CardDescription>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Payrun History</span>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                  No payrun history available yet
                </div>
              ) : (
              <div className={`grid gap-2 pt-4 items-end h-40`} style={{ gridTemplateColumns: `repeat(${Math.min(monthlyTrends.length, 12)}, 1fr)` }}>
                {monthlyTrends.map((item) => (
                  <div key={item.month} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                      {formatCompactCurrency(item.amount)}
                    </span>
                    <div
                      className="w-full bg-primary/20 hover:bg-primary rounded-t-md transition-all duration-200"
                      style={{ height: `${item.height}%` }}
                    />
                    <span className="text-xs text-muted-foreground font-medium">{item.month}</span>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payslips Quick Ledger Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Payslips — {selectedPeriod}</CardTitle>
                <CardDescription>Live payroll status for active period employees</CardDescription>
              </div>
              <Link href="/payroll/payslips">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  View All Payslips <ArrowRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-y border-border text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Employee</th>
                      <th className="py-2.5 px-4 text-left">Department</th>
                      <th className="py-2.5 px-4 text-left">Status</th>
                      <th className="py-2.5 px-4 text-right">Net Salary</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayslips.slice(0, 5).map((ps) => (
                      <tr key={ps.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">{ps.employeeName}</td>
                        <td className="py-3 px-4 text-muted-foreground">{ps.department}</td>
                        <td className="py-3 px-4">
                          {ps.warnings && ps.warnings.length > 0 ? (
                            <Badge variant="warning" className="text-[10px]">
                              {ps.warnings[0]}
                            </Badge>
                          ) : ps.status === "Paid" ? (
                            <Badge variant="success" className="text-[10px]">
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Validated
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                          {formatCurrency(ps.net)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href="/payroll/payslips">
                            <span className="text-primary hover:underline font-medium">View</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Attendance Health & Leave Math */}
        <div className="space-y-6">
          {/* Attendance Overview (Matches Excalidraw & PDF) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Attendance Overview</CardTitle>
                <Link href="/attendance">
                  <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    Ledger <ArrowUpRight className="size-3" />
                  </span>
                </Link>
              </div>
              <CardDescription>Daily presence, overtime, and punch health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50">
                  <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{attendance.filter((a) => a.status === "Present").length}</span>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Present</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50">
                  <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">{attendance.filter((a) => a.status === "Late").length}</span>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Late</p>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50">
                  <span className="text-lg font-bold font-mono text-rose-700 dark:text-rose-400">{attendance.filter((a) => a.status === "Absent").length}</span>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Absent</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Missing check-outs</span>
                  <span className="font-mono font-medium text-foreground">{attendance.filter((a) => !a.checkOut && a.checkIn).length} records</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Manual attendance edits</span>
                  <span className="font-mono font-medium text-foreground">{attendance.filter((a) => a.isManualEdit).length} audited</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total overtime hours</span>
                  <span className="font-mono font-semibold text-emerald-600">{attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0).toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Attendance coverage</span>
                  <span className="font-mono font-bold text-foreground">{attendanceHealth}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Off Balance Overview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Time Off Overview</CardTitle>
                <Link href="/time-off/allocations">
                  <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    Balances <ArrowUpRight className="size-3" />
                  </span>
                </Link>
              </div>
              <CardDescription>Allocated vs taken balance consumption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {allocations.slice(0, 3).map((alc) => (
                <div key={alc.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
                  <div className="flex justify-between items-center font-medium text-foreground">
                    <span>{alc.employeeName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {alc.typeName}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                    <span>Allocated: {alc.allocatedDays}d</span>
                    <span>Taken: {alc.takenDays}d</span>
                    <span className="font-bold text-primary">Left: {alc.remainingDays}d</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
