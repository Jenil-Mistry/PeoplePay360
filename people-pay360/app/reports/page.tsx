"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  Users,
  Building,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function ReportsPage() {
  const { payruns, payslips, employees } = useAppStore();
  const { toast } = useToast();

  const [selectedPayrunId, setSelectedPayrunId] = useState(payruns[1]?.id || payruns[0]?.id);

  const activeRun = payruns.find((p) => p.id === selectedPayrunId) || payruns[0];
  const runPayslips = payslips.filter((ps) => ps.payrunId === activeRun?.id);

  const totalGross = runPayslips.reduce((acc, ps) => acc + ps.gross, 0);
  const totalPF = runPayslips.reduce((acc, ps) => {
    const pfLine = ps.lineItems.find((l) => l.code === "PF");
    return acc + Math.abs(pfLine?.amount || 0);
  }, 0);
  const totalPT = runPayslips.reduce((acc, ps) => {
    const ptLine = ps.lineItems.find((l) => l.code === "PT");
    return acc + Math.abs(ptLine?.amount || 0);
  }, 0);
  const totalNet = runPayslips.reduce((acc, ps) => acc + ps.net, 0);

  const handleExportCSV = () => {
    if (runPayslips.length === 0) {
      toast({
        title: "No Data",
        description: "No payslips available for the selected payrun.",
        type: "error",
      });
      return;
    }

    // CSV escaping: wrap in quotes if contains comma, quote, or newline
    const escapeCSV = (val: string | number | undefined) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Payrun",
      "Period Start",
      "Period End",
      "Worked Days",
      "Basic Wage",
      "Gross Salary",
      "Deductions",
      "Net Salary",
      "Status",
      "Warning Count",
    ];

    const rows = runPayslips.map((ps) => [
      escapeCSV(ps.employeeId),
      escapeCSV(ps.employeeName),
      escapeCSV(ps.department),
      escapeCSV(activeRun?.name || ""),
      escapeCSV(ps.periodStart),
      escapeCSV(ps.periodEnd),
      escapeCSV(ps.workedDays),
      escapeCSV(ps.basic),
      escapeCSV(ps.gross),
      escapeCSV(ps.deductions),
      escapeCSV(ps.net),
      escapeCSV(ps.status),
      escapeCSV(ps.warnings?.length || 0),
    ]);

    // UTF-8 BOM for Excel compatibility
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // Deterministic filename: payrun name + export date
    const sanitizedName = (activeRun?.name || "payrun").replace(/[^a-zA-Z0-9]/g, "_");
    const exportDate = new Date().toISOString().split("T")[0];
    const filename = `PeoplePay360_${sanitizedName}_${exportDate}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Downloaded",
      description: `Exported ${runPayslips.length} payslip records to ${filename}.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 print:space-y-6 print:px-6 print:py-6">
      {/* Screen-Only Header with Action Buttons */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Statutory & Payroll Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aggregated payroll cost summaries, PF/PT statutory registers, and bank disbursement schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="text-xs">
            <FileSpreadsheet className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button size="sm" onClick={() => window.print()} className="bg-primary text-primary-foreground text-xs">
            <Printer className="size-3.5" />
            <span>Print Ledger</span>
          </Button>
        </div>
      </div>

      {/* Screen-Only Period Selector */}
      <div className="no-print flex items-center gap-2 bg-card p-3 rounded-xl border border-border">
        <span className="text-xs font-semibold text-muted-foreground">Select Payrun Batch:</span>
        <select
          value={selectedPayrunId}
          onChange={(e) => setSelectedPayrunId(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none"
        >
          {payruns.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name} ({pr.status}) — {pr.totalEmployees} employees
            </option>
          ))}
        </select>
      </div>

      {/* Official Corporate Print-Only Header (A4 Header) */}
      <div className="hidden print:block pb-5 border-b-2 border-black print-avoid-break">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded bg-black text-white font-black text-xl flex items-center justify-center font-mono">
              P
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-black uppercase">
                PeoplePay360 Technologies Pvt Ltd
              </h1>
              <p className="text-xs text-neutral-700 font-semibold">
                Corporate Statutory & Bank Disbursement Payroll Ledger
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-neutral-700 space-y-0.5">
            <p className="font-bold text-black uppercase">Official Statutory Record</p>
            <p>Report Ref: <span className="font-mono font-bold">LDR-{activeRun?.id || "2026"}</span></p>
            <p>Generated: <span className="font-mono">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></p>
          </div>
        </div>

        {/* Print Metadata Strip */}
        <div className="mt-4 pt-3 border-t border-neutral-300 grid grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase font-bold">Payrun Batch</span>
            <span className="font-bold text-black">{activeRun?.name}</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase font-bold">Status</span>
            <span className="font-bold text-black uppercase">{activeRun?.status}</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase font-bold">Total Staff Count</span>
            <span className="font-bold text-black font-mono">{runPayslips.length} Employees</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[9px] uppercase font-bold">Base Currency</span>
            <span className="font-bold text-black">INR (₹ Indian Rupee)</span>
          </div>
        </div>
      </div>

      {/* 4 Statutory Summary KPI Cards (Cleanly formatted on A4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4 print:gap-3 print-avoid-break">
        <Card className="print:border print:border-neutral-300 print:shadow-none print:bg-neutral-50/50">
          <CardHeader className="pb-1 p-4 print:p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground print:text-neutral-700">Total Gross Payroll</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 print:p-3 print:pt-0">
            <div className="text-xl font-bold font-mono text-foreground print:text-black print:text-base">{formatCurrency(totalGross)}</div>
            <p className="text-[10px] text-muted-foreground print:text-neutral-600 mt-0.5">Base + Allowances</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-neutral-300 print:shadow-none print:bg-neutral-50/50">
          <CardHeader className="pb-1 p-4 print:p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground print:text-neutral-700">Total PF Deductions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 print:p-3 print:pt-0">
            <div className="text-xl font-bold font-mono text-foreground print:text-black print:text-base">{formatCurrency(totalPF)}</div>
            <p className="text-[10px] text-muted-foreground print:text-neutral-600 mt-0.5">Provident Fund 12%</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-neutral-300 print:shadow-none print:bg-neutral-50/50">
          <CardHeader className="pb-1 p-4 print:p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground print:text-neutral-700">Professional Tax (PT)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 print:p-3 print:pt-0">
            <div className="text-xl font-bold font-mono text-foreground print:text-black print:text-base">{formatCurrency(totalPT)}</div>
            <p className="text-[10px] text-muted-foreground print:text-neutral-600 mt-0.5">State Statutory Tax</p>
          </CardContent>
        </Card>

        <Card className="print:border print:border-neutral-300 print:shadow-none print:bg-neutral-50/50">
          <CardHeader className="pb-1 p-4 print:p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground print:text-neutral-700">Disbursed Net Pay</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 print:p-3 print:pt-0">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 print:text-black print:text-base">
              {formatCurrency(totalNet)}
            </div>
            <p className="text-[10px] text-muted-foreground print:text-neutral-600 mt-0.5">Net Direct Deposit</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Disbursement Schedule Register Table */}
      <Card className="print:border print:border-neutral-300 print:shadow-none print:rounded-none">
        <CardHeader className="pb-3 print:p-4 print:border-b print:border-neutral-300">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold print:text-xs print:font-bold print:uppercase">
                Bank Disbursement Schedule Register
              </CardTitle>
              <CardDescription className="print:text-[10px] print:text-neutral-600">
                Direct deposit bank accounts and batch disbursement reconciliation
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono print:border-neutral-400 print:text-black">{activeRun?.name}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-xs print:text-[10px]">
              <thead className="bg-muted/50 border-y border-border text-muted-foreground font-semibold print:bg-neutral-100 print:text-black print:border-b-2 print:border-neutral-400">
                <tr>
                  <th className="py-2.5 px-4 print:py-2.5 print:px-3.5 text-left">Employee Name</th>
                  <th className="py-2.5 px-4 print:py-2.5 print:px-3.5 text-left">Bank Name</th>
                  <th className="py-2.5 px-4 print:py-2.5 print:px-3.5 text-left">Account Number</th>
                  <th className="py-2.5 px-4 print:py-2.5 print:px-3.5 text-left">IFSC Code</th>
                  <th className="py-2.5 px-4 print:py-2.5 print:px-3.5 text-right">Net Amount</th>
                  <th className="py-2.5 px-4 print:py-2.5 print:px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-neutral-300">
                {runPayslips.map((ps) => {
                  const emp = employees.find((e) => e.id === ps.employeeId);
                  const hasBank = !!emp?.bankDetails?.accountNumber;

                  return (
                    <tr key={ps.id} className="hover:bg-muted/20 print:border-b print:border-neutral-200">
                      <td className="py-3 px-4 print:py-2.5 print:px-3.5 font-bold text-foreground print:text-black">{ps.employeeName}</td>
                      <td className="py-3 px-4 print:py-2.5 print:px-3.5 text-muted-foreground print:text-neutral-800">{emp?.bankDetails?.bankName || "—"}</td>
                      <td className="py-3 px-4 print:py-2.5 print:px-3.5 font-mono">
                        {hasBank ? (
                          <span className="font-semibold text-foreground print:text-black">{emp?.bankDetails?.accountNumber}</span>
                        ) : (
                          <Badge variant="warning" className="text-[10px] print:border print:border-amber-600 print:text-amber-800 print:bg-transparent">
                            A/C Missing
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 print:py-2.5 print:px-3.5 font-mono text-muted-foreground print:text-neutral-800">{emp?.bankDetails?.ifscCode || "—"}</td>
                      <td className="py-3 px-4 print:py-2.5 print:px-3.5 text-right font-mono font-bold text-foreground print:text-black">
                        {formatCurrency(ps.net)}
                      </td>
                      <td className="py-3 px-4 print:py-2.5 print:px-3.5 text-center">
                        <Badge
                          variant={hasBank ? "success" : "destructive"}
                          className="text-[10px] print:border print:bg-transparent print:text-black print:font-semibold"
                        >
                          {hasBank ? "Ready" : "Blocked"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Table Total Summary Row */}
              <tfoot className="border-t-2 border-border print:border-black font-semibold bg-muted/30 print:bg-neutral-100">
                <tr>
                  <td colSpan={4} className="py-3 px-4 print:py-2.5 print:px-3.5 text-right font-bold uppercase print:text-black">
                    Total Disbursement ({runPayslips.length} Employees):
                  </td>
                  <td className="py-3 px-4 print:py-2.5 print:px-3.5 text-right font-mono font-black text-sm print:text-xs text-foreground print:text-black">
                    {formatCurrency(totalNet)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Official Sign-Off Block for Audit and Paper Records (A4 Footer) */}
      <div className="hidden print:block print-avoid-break pt-8 mt-8 border-t border-neutral-300">
        <div className="grid grid-cols-3 gap-8 text-center text-xs">
          <div className="space-y-10">
            <div className="h-8 border-b border-neutral-400"></div>
            <div>
              <p className="font-bold text-black text-xs">Prepared By</p>
              <p className="text-[10px] text-neutral-600">Payroll Specialist / Officer</p>
            </div>
          </div>
          <div className="space-y-10">
            <div className="h-8 border-b border-neutral-400"></div>
            <div>
              <p className="font-bold text-black text-xs">Verified & Audited By</p>
              <p className="text-[10px] text-neutral-600">Head of Human Resources</p>
            </div>
          </div>
          <div className="space-y-10">
            <div className="h-8 border-b border-neutral-400"></div>
            <div>
              <p className="font-bold text-black text-xs">Authorized Signatory</p>
              <p className="text-[10px] text-neutral-600">Director / CFO</p>
            </div>
          </div>
        </div>

        <p className="text-[9px] text-neutral-500 text-center mt-6">
          This document is an electronically generated statutory disbursement ledger created via PeoplePay360.
          All calculations are verified for compliance with Statutory Provident Fund (PF) and State Professional Tax (PT) rules.
        </p>
      </div>
    </div>
  );
}
