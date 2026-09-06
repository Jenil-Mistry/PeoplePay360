"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  Printer,
  Calendar,
  Download,
  Building,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Mail,
  Send,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAppStore } from "@/lib/store";
import { Payslip } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { sendSinglePayslipEmail, sendPayslipsBulk } from "@/lib/actions/payroll";

export default function PayslipsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading payslips...</div>}>
      <PayslipsContent />
    </Suspense>
  );
}

function PayslipsContent() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");

  const { payslips, payruns, currentUser, refreshData } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [selectedBulkPayrunId, setSelectedBulkPayrunId] = useState<string>("");

  const canSendPayslips = currentUser.role === "ADMIN" || currentUser.role === "HR_MANAGER";

  // Auto-open target payslip if requested in URL
  useEffect(() => {
    if (targetId) {
      const found = payslips.find((p) => p.id === targetId);
      if (found) {
        setSelectedPayslip(found);
        setIsModalOpen(true);
      }
    }
  }, [targetId, payslips]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter((ps) => {
      const matchesSearch =
        ps.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ps.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPeriod = selectedPeriod === "All" || ps.period === selectedPeriod;
      return matchesSearch && matchesPeriod;
    });
  }, [payslips, searchQuery, selectedPeriod]);

  const handleOpenPayslip = (ps: Payslip) => {
    setSelectedPayslip(ps);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    if (selectedPayslip) {
      const numericId = selectedPayslip.id.replace(/\D/g, "");
      window.open(`/api/payslips/${numericId || selectedPayslip.id}/pdf`, "_blank");
    }
  };

  const handleSendModalEmail = async () => {
    if (!selectedPayslip) return;
    try {
      setIsSendingEmail(true);
      const numericId = selectedPayslip.id.replace(/\D/g, "");
      const res = await sendSinglePayslipEmail(numericId || selectedPayslip.id);
      if (res.success) {
        toast({
          title: "Payslip Emailed!",
          description: `Official PDF payslip has been emailed to ${selectedPayslip.employeeName}.`,
          type: "success",
        });
        await refreshData();
      } else {
        toast({
          title: "Delivery Failed",
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
      setIsSendingEmail(false);
    }
  };

  const handleConfirmBulkSend = async () => {
    const targetPayrun = selectedBulkPayrunId
      ? payruns.find((p) => p.id === selectedBulkPayrunId)
      : selectedPeriod !== "All"
      ? payruns.find((p) => p.name === selectedPeriod)
      : payruns.find((p) => p.status === "Paid") || payruns[0];

    if (!targetPayrun) {
      toast({
        title: "No Payrun Batch Found",
        description: "Please select a payrun batch to send payslips for.",
        type: "warning",
      });
      return;
    }

    if (targetPayrun.status !== "Paid") {
      toast({
        title: "Salary Not Credited",
        description: `Payrun "${targetPayrun.name}" is in '${targetPayrun.status}' status. Salary must be marked as PAID before sending payslips.`,
        type: "warning",
      });
      return;
    }

    try {
      setIsSendingBulk(true);
      const res = await sendPayslipsBulk(targetPayrun.id);
      if (res.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
        toast({
          title: "Payslips Distributed via Email!",
          description: `Generated PDFs and emailed payslips to ${res.countSent} credited employees in ${targetPayrun.name}.`,
          type: "success",
        });
        setIsBulkModalOpen(false);
        await refreshData();
      } else {
        toast({
          title: "Failed to Send Payslips",
          description: res.error || "Error distributing payslips.",
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Payslips</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit itemized salary computations, verify sequential deduction rules, and generate official printable PDF payslips.
          </p>
        </div>
        {canSendPayslips && (
          <Button
            size="sm"
            onClick={() => {
              if (selectedPeriod !== "All") {
                const match = payruns.find((p) => p.name === selectedPeriod);
                if (match) setSelectedBulkPayrunId(match.id);
              }
              setIsBulkModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs gap-1.5 shrink-0"
          >
            <Send className="size-3.5" />
            <span>Send Credited Payslips</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payslips by employee, department..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 py-1 text-xs text-foreground focus:outline-none"
          >
            <option value="All">All Payroll Periods</option>
            {payruns.map((pr) => (
              <option key={pr.id} value={pr.name}>
                {pr.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payslips Table (Matches Excalidraw Screen 4/5) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-left">Period</th>
              <th className="py-3 px-4 text-left">Structure</th>
              <th className="py-3 px-4 text-center">Worked Days</th>
              <th className="py-3 px-4 text-right">Basic</th>
              <th className="py-3 px-4 text-right">Gross</th>
              <th className="py-3 px-4 text-right">Deductions</th>
              <th className="py-3 px-4 text-right">Net Salary</th>
              <th className="py-3 px-4 text-center">Delivery</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredPayslips.map((ps) => {
              const numericSlipId = ps.id.replace(/\D/g, "");
              return (
                <tr
                  key={ps.id}
                  onClick={() => handleOpenPayslip(ps)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-primary transition-colors">
                    {ps.employeeName}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground font-mono">{ps.period}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{ps.structureName}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium">{ps.workedDays}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">{formatCurrency(ps.basic)}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-foreground">{formatCurrency(ps.gross)}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-600">
                    {ps.deductions > 0 ? `-${formatCurrency(ps.deductions)}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">{formatCurrency(ps.net)}</td>
                  <td className="py-3.5 px-4 text-center">
                    {ps.emailSentAt ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle2 className="size-2.5" />
                        Sent
                      </Badge>
                    ) : ps.status === "Paid" ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                        Pending
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">Uncredited</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge
                      variant={ps.status === "Paid" ? "success" : ps.status === "Validated" ? "outline" : "secondary"}
                      className="text-[10px]"
                    >
                      {ps.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <span
                        onClick={() => handleOpenPayslip(ps)}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Inspect
                      </span>
                      {ps.status === "Paid" && (
                        <a
                          href={`/api/payslips/${numericSlipId || ps.id}/pdf?download=pdf`}
                          download
                          className="text-emerald-600 hover:underline font-semibold"
                          title="Download PDF document"
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DETAILED PAYSLIP & SALARY COMPUTATION MODAL (Strictly matches Excalidraw Screen 5) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl" onClose={() => setIsModalOpen(false)}>
          {selectedPayslip && (
            <div className="space-y-5" id="printable-payslip">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Payslip / {selectedPayslip.employeeName} / {selectedPayslip.period}
                    </h2>
                    <Badge variant={selectedPayslip.status === "Paid" ? "success" : "outline"}>
                      {selectedPayslip.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Detailed salary computation driven by active contract and assigned rules.
                  </p>
                </div>

                {selectedPayslip.status === "Paid" && (
                  <Button size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground font-semibold no-print">
                    <Printer className="size-3.5 mr-2" />
                    PRINT PAYSLIP
                  </Button>
                )}
              </div>

              {/* Identification Badges Summary Bar (Matches Excalidraw Screen 5) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Employee</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedPayslip.employeeName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Pay Run</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedPayslip.period}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Structure</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedPayslip.structureName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Worked Days</span>
                  <p className="font-bold text-foreground mt-0.5 font-mono">{selectedPayslip.workedDays} Days</p>
                </div>
              </div>

              {/* Salary Computation Table (Matches Excalidraw Screen 5 Breakdown Table) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Salary Computation Breakdown
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Sequence Order Respected
                  </span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 border-b border-border font-semibold text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Salary Rule</th>
                        <th className="py-2.5 px-4 text-center">Code</th>
                        <th className="py-2.5 px-4 text-left">Category</th>
                        <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedPayslip.lineItems.map((item) => {
                        const isDeduction = item.category === "Deduction";
                        const isTotal = item.category === "Gross" || item.category === "Net";

                        return (
                          <tr
                            key={item.ruleId}
                            className={
                              item.category === "Net"
                                ? "bg-primary/10 font-bold"
                                : item.category === "Gross"
                                ? "bg-muted/40 font-bold"
                                : "hover:bg-muted/20"
                            }
                          >
                            <td className="py-2.5 px-4 font-semibold text-foreground">{item.ruleName}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-muted-foreground font-bold">
                              {item.code}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge
                                variant={
                                  item.category === "Basic"
                                    ? "default"
                                    : item.category === "Allowance"
                                    ? "outline"
                                    : item.category === "Deduction"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[9px] py-0 px-2"
                              >
                                {item.category}
                              </Badge>
                            </td>
                            <td
                              className={`py-2.5 px-4 text-right font-mono text-xs ${
                                item.category === "Net"
                                  ? "text-primary text-sm font-black"
                                  : isDeduction
                                  ? "text-rose-600 font-bold"
                                  : "text-foreground font-semibold"
                              }`}
                            >
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Payable Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div>
                  <span className="text-xs uppercase font-bold text-muted-foreground">Final Net Salary</span>
                  <p className="text-xs text-muted-foreground">Computed using active Running Contract</p>
                </div>
                <div className="text-2xl font-black font-mono text-primary">
                  {formatCurrency(selectedPayslip.net)}
                </div>
              </div>

              <DialogFooter className="no-print flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
                {selectedPayslip.status === "Paid" && (
                  <a
                    href={`/api/payslips/${selectedPayslip.id.replace(/\D/g, "") || selectedPayslip.id}/pdf?download=pdf`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <Download className="size-3.5" />
                    <span>Download PDF</span>
                  </a>
                )}
                <Button size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground">
                  <Printer className="size-3.5" />
                  Print Official Document
                </Button>
                {canSendPayslips && selectedPayslip.status === "Paid" && (
                  <Button
                    size="sm"
                    onClick={handleSendModalEmail}
                    disabled={isSendingEmail}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="size-3.5" />
                        <span>Send via Email (PDF)</span>
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Send Payslips Dialog (Admin & HR Manager privilege) */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsBulkModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              <span>Send Credited Payslips via Email</span>
            </DialogTitle>
            <DialogDescription>
              Dispatches official PDF payslips to all employees whose salary is credited.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Payroll Batch:</label>
              <select
                value={
                  selectedBulkPayrunId ||
                  (selectedPeriod !== "All"
                    ? payruns.find((p) => p.name === selectedPeriod)?.id || ""
                    : payruns.find((p) => p.status === "Paid")?.id || payruns[0]?.id || "")
                }
                onChange={(e) => setSelectedBulkPayrunId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
              >
                {payruns.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} ({pr.status}) — {pr.totalEmployees} Employees
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Batch:</span>
                <span className="font-semibold text-foreground">
                  {payruns.find((p) => p.id === (selectedBulkPayrunId || payruns[0]?.id))?.name || "Selected Batch"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Requirement:</span>
                <Badge variant="success" className="text-[10px]">SALARY CREDITED (PAID)</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attachment:</span>
                <span className="font-semibold text-foreground">Generated PDF Salary Payslip</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-300">
              <CheckCircle2 className="size-4 shrink-0 text-blue-500 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Official PDF payslips will be generated dynamically and emailed to all employees in the selected batch whose salary has been credited.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(false)} disabled={isSendingBulk}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmBulkSend} disabled={isSendingBulk} className="gap-1.5 font-semibold">
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
    </div>
  );
}
