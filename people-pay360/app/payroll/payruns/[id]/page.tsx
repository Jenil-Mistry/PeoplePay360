"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Calculator,
  CheckCircle2,
  Send,
  Printer,
  AlertTriangle,
  ArrowLeft,
  Users,
  Building,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatCurrency, formatCompactCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function PayrunProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { payruns, payslips, updatePayrunStatus, recomputePayrun } = useAppStore();
  const { toast } = useToast();

  const payrun = payruns.find((p) => p.id === resolvedParams.id);
  const batchPayslips = payslips.filter((ps) => ps.payrunId === resolvedParams.id);

  if (!payrun) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold">Payrun Not Found</h2>
        <Link href="/payroll/payruns">
          <Button variant="outline">Back to Payruns</Button>
        </Link>
      </div>
    );
  }

  const handleCompute = () => {
    recomputePayrun(payrun.id);
    toast({
      title: "Salaries Computed",
      description: `Recomputed salary rules for ${batchPayslips.length} employee payslips.`,
      type: "success",
    });
  };

  const handleValidate = () => {
    updatePayrunStatus(payrun.id, "Validated");
    toast({
      title: "Batch Validated",
      description: "Payrun marked as Validated. Ready for disbursement.",
      type: "success",
    });
  };

  const handleMarkPaid = () => {
    updatePayrunStatus(payrun.id, "Paid");
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
    toast({
      title: "Payroll Disbursed!",
      description: `Payrun ${payrun.name} marked as PAID.`,
      type: "success",
    });
  };

  const handleSendPayslips = () => {
    toast({
      title: "Bulk Distribution Started",
      description: `Queued digital payslip emails for ${batchPayslips.length} employees.`,
      type: "info",
    });
  };

  const totalGross = batchPayslips.reduce((acc, ps) => acc + ps.gross, 0);
  const totalNet = batchPayslips.reduce((acc, ps) => acc + ps.net, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back and Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/payroll/payruns" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="size-3" />
          <span>Payruns</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">{payrun.name}</span>
      </div>

      {/* Main High-Stakes Action Header Bar (Matches Excalidraw Screen 4) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{payrun.name}</h1>
            <Badge
              variant={payrun.status === "Paid" ? "success" : payrun.status === "Validated" ? "outline" : "secondary"}
              className="text-xs"
            >
              {payrun.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>Structure: <strong>{payrun.structureName}</strong></span>
            <span>•</span>
            <span className="font-mono">Period: {formatDate(payrun.periodStart)} — {formatDate(payrun.periodEnd)}</span>
          </p>
        </div>

        {/* Action Buttons: COMPUTE, VALIDATE, MARK PAID, SEND PAYSLIPS */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCompute} className="font-semibold">
            <Calculator className="size-3.5" />
            COMPUTE
          </Button>

          {payrun.status === "Draft" && (
            <Button variant="outline" size="sm" onClick={handleValidate} className="font-semibold">
              <CheckCircle2 className="size-3.5" />
              VALIDATE
            </Button>
          )}

          {payrun.status !== "Paid" && (
            <Button
              size="sm"
              onClick={handleMarkPaid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <DollarSign className="size-3.5" />
              MARK PAID
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSendPayslips}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <Send className="size-3.5" />
            SEND PAYSLIPS
          </Button>
        </div>
      </div>

      {/* Warnings Banner Card if any warnings exist (Matches Excalidraw Screen 4) */}
      {payrun.warnings && payrun.warnings.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Compliance & Validation Warnings Prior to Finalization
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {payrun.warnings.map((w, i) => (
                  <Badge key={i} variant="warning" className="text-xs">
                    {w}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Gross</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-foreground">{formatCurrency(totalGross)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Net Payable</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalNet)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Employee Payslips</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-foreground">{batchPayslips.length} Generated</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary List of Payslips in this Payrun (Matches Excalidraw Screen 4 Table) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Payslips in this Payrun</h2>
          <span className="text-xs text-muted-foreground font-mono">{batchPayslips.length} items</span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Employee</th>
                <th className="py-3 px-4 text-left">Department</th>
                <th className="py-3 px-4 text-center">Worked Days</th>
                <th className="py-3 px-4 text-right">Basic</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-right">Net</th>
                <th className="py-3 px-4 text-center">Warning</th>
                <th className="py-3 px-4 text-center">PDF</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batchPayslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-foreground">{ps.employeeName}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{ps.department}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium">{ps.workedDays}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                    {formatCurrency(ps.basic)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-foreground">
                    {formatCurrency(ps.gross)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                    {formatCurrency(ps.net)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {ps.warnings && ps.warnings.length > 0 ? (
                      <Badge variant="warning" className="text-[10px]">
                        {ps.warnings[0]}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link href={`/payroll/payslips?id=${encodeURIComponent(ps.id)}`}>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer">
                        <Printer className="size-3" />
                        <span>Print</span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href={`/payroll/payslips?id=${encodeURIComponent(ps.id)}`}>
                      <span className="text-primary hover:underline font-semibold">Inspect</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
