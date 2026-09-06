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
  IndianRupee,
  FileText,
  ExternalLink,
  Mail,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn, formatCurrency, formatCompactCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { sendPayslipsBulk, sendSinglePayslipEmail } from "@/lib/actions/payroll";

export default function PayrunProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { payruns, payslips, updatePayrunStatus, recomputePayrun, currentUser, refreshData } = useAppStore();
  const { toast } = useToast();

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [sendingSingleId, setSendingSingleId] = useState<string | null>(null);

  const payrun = payruns.find((p) => p.id === resolvedParams.id);
  const batchPayslips = payslips.filter((ps) => ps.payrunId === resolvedParams.id);

  const canSendPayslips = currentUser.role === "ADMIN" || currentUser.role === "HR_MANAGER";
  const isPaid = payrun?.status === "Paid";

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

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleCompute = async () => {
    setIsProcessingAction(true);
    try {
      const res = await recomputePayrun(payrun.id);
      if (res && !res.success) {
        toast({
          title: "Computation Failed",
          description: res.error || "Failed to recompute payrun batch.",
          type: "error",
        });
        return;
      }
      toast({
        title: "Salaries Computed",
        description: `Recomputed salary rules for employee payslips.`,
        type: "success",
      });
    } catch (err: any) {
      toast({
        title: "Computation Error",
        description: err.message || "An error occurred during computation.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleValidate = async () => {
    setIsProcessingAction(true);
    try {
      const res = await updatePayrunStatus(payrun.id, "Validated");
      if (res && !res.success) {
        toast({
          title: "Validation Failed",
          description: res.error || "Failed to validate payrun.",
          type: "error",
        });
        return;
      }
      toast({
        title: "Batch Validated",
        description: "Payrun marked as Validated. Ready for disbursement.",
        type: "success",
      });
    } catch (err: any) {
      toast({
        title: "Validation Error",
        description: err.message || "An error occurred during validation.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsProcessingAction(true);
    try {
      const res = await updatePayrunStatus(payrun.id, "Paid");
      if (res && !res.success) {
        toast({
          title: "Payment Update Failed",
          description: res.error || "Failed to mark payrun as paid.",
          type: "error",
        });
        return;
      }
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      toast({
        title: "Payroll Disbursed!",
        description: `Payrun ${payrun.name} marked as PAID. Employees are now eligible to receive payslips.`,
        type: "success",
      });
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An error occurred marking as paid.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenSendPayslips = () => {
    if (!canSendPayslips) {
      toast({
        title: "Access Restricted",
        description: "Only Admin and HR Manager have the privilege to send payslips.",
        type: "error",
      });
      return;
    }

    if (!isPaid) {
      toast({
        title: "Salary Not Credited",
        description: "Payslips can only be emailed after salary is credited (Payrun must be marked as PAID).",
        type: "warning",
      });
      return;
    }

    setIsSendModalOpen(true);
  };

  const handleConfirmSendBulk = async () => {
    try {
      setIsSendingBulk(true);
      const res = await sendPayslipsBulk(payrun.id);

      if (res.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 },
        });
        toast({
          title: "Payslips Distributed via Email!",
          description: `Successfully generated PDFs and emailed payslips to ${res.countSent} credited employees.`,
          type: "success",
        });
        setIsSendModalOpen(false);
        await refreshData();
      } else {
        toast({
          title: "Failed to Send Payslips",
          description: res.error || "An error occurred while generating or emailing payslips.",
          type: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to distribute payslips.",
        type: "error",
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

  const handleSendSingle = async (payslipId: string) => {
    try {
      setSendingSingleId(payslipId);
      const res = await sendSinglePayslipEmail(payslipId);
      if (res.success) {
        toast({
          title: "Payslip Emailed",
          description: "Official PDF payslip has been emailed to the employee.",
          type: "success",
        });
        await refreshData();
      } else {
        toast({
          title: "Email Failed",
          description: res.error || "Failed to send payslip email.",
          type: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send payslip email.",
        type: "error",
      });
    } finally {
      setSendingSingleId(null);
    }
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompute}
            disabled={isProcessingAction}
            className="font-semibold"
          >
            <Calculator className="size-3.5" />
            COMPUTE
          </Button>

          {payrun.status === "Draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={isProcessingAction}
              className="font-semibold"
            >
              <CheckCircle2 className="size-3.5" />
              VALIDATE
            </Button>
          )}

          {payrun.status !== "Paid" && (
            <Button
              size="sm"
              onClick={handleMarkPaid}
              disabled={isProcessingAction}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <IndianRupee className="size-3.5" />
              MARK PAID
            </Button>
          )}

          {canSendPayslips && (
            <Button
              size="sm"
              onClick={handleOpenSendPayslips}
              disabled={!isPaid}
              className={cn(
                "font-semibold shadow-xs transition-all",
                isPaid
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              )}
              title={
                !isPaid
                  ? "Payrun must be marked as PAID before distributing payslips"
                  : "Email official PDF payslips to all credited employees"
              }
            >
              <Send className="size-3.5" />
              SEND PAYSLIPS
            </Button>
          )}
        </div>
      </div>

      {/* Send Payslips Confirmation Modal (Admin & HR Manager privilege) */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsSendModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              <span>Email Payslips to Credited Employees</span>
            </DialogTitle>
            <DialogDescription>
              Generate and email official PDF payslips for this payrun batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payrun Batch:</span>
                <span className="font-semibold text-foreground">{payrun.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Employees:</span>
                <span className="font-semibold text-foreground font-mono">{batchPayslips.length} Employees</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disbursement Status:</span>
                <Badge variant="success" className="text-[10px]">SALARY CREDITED (PAID)</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document Format:</span>
                <span className="font-semibold text-foreground">Official PDF Attachment</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-300">
              <CheckCircle2 className="size-4 shrink-0 text-blue-500 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Official PDF payslips will be dynamically rendered and dispatched to all <strong>{batchPayslips.length}</strong> employees whose salary has been credited.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSendModalOpen(false)} disabled={isSendingBulk}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmSendBulk} disabled={isSendingBulk} className="gap-1.5 font-semibold">
              {isSendingBulk ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating & Sending...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Send to All Employees
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
                <th className="py-3 px-4 text-center">Delivery</th>
                <th className="py-3 px-4 text-center">PDF</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batchPayslips.map((ps) => {
                const numericSlipId = ps.id.replace(/\D/g, "");
                return (
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
                      {ps.emailSentAt ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <CheckCircle2 className="size-2.5" />
                          Sent
                        </Badge>
                      ) : isPaid ? (
                        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Pending
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-mono">Uncredited</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <Link href={`/payroll/payslips?id=${encodeURIComponent(ps.id)}`}>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer">
                            <Printer className="size-3" />
                            <span>Print</span>
                          </span>
                        </Link>
                        {isPaid && (
                          <a
                            href={`/api/payslips/${numericSlipId || ps.id}/pdf?download=pdf`}
                            download
                            className="text-[11px] font-semibold text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/payroll/payslips?id=${encodeURIComponent(ps.id)}`}>
                          <span className="text-primary hover:underline font-semibold">Inspect</span>
                        </Link>
                        {canSendPayslips && isPaid && (
                          <button
                            onClick={() => handleSendSingle(numericSlipId || ps.id)}
                            disabled={sendingSingleId === (numericSlipId || ps.id)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                            title="Email payslip to this employee"
                          >
                            {sendingSingleId === (numericSlipId || ps.id) ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Mail className="size-3" />
                            )}
                            <span>Email</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
