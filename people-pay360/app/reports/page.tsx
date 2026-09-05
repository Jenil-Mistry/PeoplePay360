"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  DollarSign,
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
    toast({
      title: "Export Generated",
      description: `Exported ${runPayslips.length} records to CSV format.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
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

      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border">
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

      {/* 4 Statutory Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Gross Payroll</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-foreground">{formatCurrency(totalGross)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total PF Deductions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-foreground">{formatCurrency(totalPF)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Provident Fund 12%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Professional Tax (PT)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-foreground">{formatCurrency(totalPT)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">State Statutory Tax</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Disbursed Net Pay</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalNet)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Disbursement Schedule Register */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Bank Disbursement Schedule Register</CardTitle>
              <CardDescription>Direct deposit bank accounts and batch disbursement reconciliation</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">{activeRun?.name}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-y border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-4 text-left">Employee Name</th>
                  <th className="py-2.5 px-4 text-left">Bank Name</th>
                  <th className="py-2.5 px-4 text-left">Account Number</th>
                  <th className="py-2.5 px-4 text-left">IFSC Code</th>
                  <th className="py-2.5 px-4 text-right">Net Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runPayslips.map((ps) => {
                  const emp = employees.find((e) => e.id === ps.employeeId);
                  const hasBank = !!emp?.bankDetails?.accountNumber;

                  return (
                    <tr key={ps.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-bold text-foreground">{ps.employeeName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{emp?.bankDetails?.bankName || "—"}</td>
                      <td className="py-3 px-4 font-mono">
                        {hasBank ? (
                          <span className="font-semibold text-foreground">{emp?.bankDetails?.accountNumber}</span>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">A/C Missing</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{emp?.bankDetails?.ifscCode || "—"}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCurrency(ps.net)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={hasBank ? "success" : "destructive"} className="text-[10px]">
                          {hasBank ? "Ready" : "Blocked"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
