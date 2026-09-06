"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Payrun, PayrunStatus } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function PayrunsPage() {
  const router = useRouter();
  const { payruns, employees, salaryStructures, contracts, createPayrunBatch } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [isCreating, setIsCreating] = useState(false);

  // Wizard Step 1 Scope State
  const [scopeName, setScopeName] = useState("May 2026");
  const [scopeStructureId, setScopeStructureId] = useState(salaryStructures[0]?.id || "STR-1");
  const [scopeStart, setScopeStart] = useState("2026-05-01");
  const [scopeEnd, setScopeEnd] = useState("2026-05-31");

  // Wizard Step 2 Employee Selection State
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(employees.map((e) => e.id));
  const [empSearch, setEmpSearch] = useState("");

  const handleStartWizard = () => {
    setWizardStep(1);
    // Compute next available batch month dynamically so it never defaults to a colliding name
    const existingNames = new Set(payruns.map((p) => p.name.trim().toLowerCase()));
    const months = [
      { name: "January 2026", start: "2026-01-01", end: "2026-01-31" },
      { name: "February 2026", start: "2026-02-01", end: "2026-02-28" },
      { name: "March 2026", start: "2026-03-01", end: "2026-03-31" },
      { name: "April 2026", start: "2026-04-01", end: "2026-04-30" },
      { name: "May 2026", start: "2026-05-01", end: "2026-05-31" },
      { name: "June 2026", start: "2026-06-01", end: "2026-06-30" },
      { name: "July 2026", start: "2026-07-01", end: "2026-07-31" },
      { name: "August 2026", start: "2026-08-01", end: "2026-08-31" },
      { name: "September 2026", start: "2026-09-01", end: "2026-09-30" },
      { name: "October 2026", start: "2026-10-01", end: "2026-10-31" },
      { name: "November 2026", start: "2026-11-01", end: "2026-11-30" },
      { name: "December 2026", start: "2026-12-01", end: "2026-12-31" },
    ];

    const nextAvailable =
      months.find((m) => !existingNames.has(m.name.toLowerCase())) || {
        name: `Batch ${new Date().toLocaleString("en-US", { month: "short", year: "numeric" })} - ${Date.now().toString().slice(-4)}`,
        start: new Date().toISOString().slice(0, 8) + "01",
        end: new Date().toISOString().slice(0, 10),
      };

    setScopeName(nextAvailable.name);
    setScopeStart(nextAvailable.start);
    setScopeEnd(nextAvailable.end);
    setScopeStructureId(salaryStructures[0]?.id || "STR-1");
    
    const eligibleIds = employees
      .filter((emp) => contracts.some((c) => c.employeeId === emp.id && c.status === "Running"))
      .map((e) => e.id);
    setSelectedEmpIds(eligibleIds);
    setWizardOpen(true);
  };

  const handleContinueToStep2 = () => {
    if (!scopeName.trim() || !scopeStart || !scopeEnd) {
      toast({ title: "Scope Incomplete", description: "Please fill in period dates and payrun name.", type: "error" });
      return;
    }
    setWizardStep(2);
  };

  const handleToggleEmployee = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const eligibleIds = employees
      .filter((emp) => contracts.some((c) => c.employeeId === emp.id && c.status === "Running"))
      .map((e) => e.id);
    if (selectedEmpIds.length === eligibleIds.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(eligibleIds);
    }
  };

  const handleCreatePayrun = async () => {
    if (selectedEmpIds.length === 0) {
      toast({
        title: "No Staff Selected",
        description: "Please select at least 1 employee for this payrun batch.",
        type: "error",
      });
      return;
    }

    if (!scopeName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a valid payrun batch name.",
        type: "error",
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await createPayrunBatch({
        name: scopeName.trim(),
        structureId: scopeStructureId || salaryStructures[0]?.id || "STR-1",
        periodStart: scopeStart,
        periodEnd: scopeEnd,
        selectedEmployeeIds: selectedEmpIds,
      });

      if (!res.success) {
        toast({
          title: "Payrun Creation Failed",
          description: res.error || "Unable to create payrun in database.",
          type: "error",
        });
        return;
      }

      toast({
        title: "Payrun Initialized & Computed!",
        description: `Created batch '${scopeName.trim()}' with ${selectedEmpIds.length} employees.`,
        type: "success",
      });

      setWizardOpen(false);
      const targetId =
        typeof res.payrunId === "number" || !String(res.payrunId).startsWith("PR-")
          ? `PR-${res.payrunId}`
          : res.payrunId;
      router.push(`/payroll/payruns/${targetId}`);
    } catch (err: any) {
      toast({
        title: "Unexpected Error",
        description: err.message || "An unexpected error occurred.",
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredEmployeesForSelection = employees.filter((emp) =>
    emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    emp.jobPosition.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Payruns & Payroll Batches</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage period payroll batches, calculate payslips, review compliance warnings, and validate disbursements.
          </p>
        </div>

        <Button size="sm" onClick={handleStartWizard} className="bg-primary text-primary-foreground font-semibold">
          <Plus className="size-4" />
          <span>NEW PAYRUN</span>
        </Button>
      </div>

      {/* Payrun Cards Grid (Matches Excalidraw Screen 4: January 2026, February 2026, etc.) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {payruns.map((pr) => {
          const statusColors: Record<PayrunStatus, "success" | "outline" | "secondary"> = {
            Paid: "success",
            Validated: "outline",
            Draft: "secondary",
          };

          return (
            <Link key={pr.id} href={`/payroll/payruns/${pr.id}`}>
              <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-48 group">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {pr.name}
                      <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                    </h3>
                    <Badge variant={statusColors[pr.status]}>{pr.status}</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatDate(pr.periodStart)} — {formatDate(pr.periodEnd)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Structure: <span className="text-foreground font-medium">{pr.structureName}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5" />
                      {pr.totalEmployees} employees
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {formatCurrency(pr.totalNet)}
                    </span>
                  </div>

                  {pr.status === "Paid" ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      <span>Salaries Disbursed & Paid</span>
                    </div>
                  ) : pr.status === "Validated" ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      <span>Validated & Approved</span>
                    </div>
                  ) : pr.warnings && pr.warnings.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                      <span className="truncate">{pr.warnings.length} warning{pr.warnings.length > 1 ? "s" : ""}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      <span>Ready for validation</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* TWO-STEP PAYRUN CREATION WIZARD (Strictly required by PDF Section B5 & Excalidraw Screen 6) */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-xl" onClose={() => setWizardOpen(false)}>
          {/* Wizard Step 1: Payrun Scope */}
          {wizardStep === 1 ? (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Payrun Creation Wizard — Step 1 of 2</DialogTitle>
                  <Badge variant="outline">Scope Setup</Badge>
                </div>
                <DialogDescription>
                  Define the payrun period and assigned salary structure. Clicking <strong>Continue</strong> moves to employee selection without creating the record yet.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Payrun Batch Name</label>
                  <Input
                    value={scopeName}
                    onChange={(e) => setScopeName(e.target.value)}
                    placeholder="e.g. April 2026"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Salary Structure</label>
                  <select
                    value={scopeStructureId}
                    onChange={(e) => setScopeStructureId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm"
                  >
                    {salaryStructures.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.structureType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Period Start Date</label>
                    <Input
                      type="date"
                      value={scopeStart}
                      onChange={(e) => setScopeStart(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Period End Date</label>
                    <Input
                      type="date"
                      value={scopeEnd}
                      onChange={(e) => setScopeEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 text-[11px] text-muted-foreground">
                  💡 <strong>Participant Note</strong>: This popup collects the payrun scope only. Continue advances to employee selection.
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setWizardOpen(false)}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleContinueToStep2} className="bg-primary text-primary-foreground">
                  Continue
                  <ArrowRight className="size-3.5" />
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Wizard Step 2: Select Employee Records */
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Select Employee Records — Step 2 of 2</DialogTitle>
                  <Badge variant="outline">
                    {selectedEmpIds.length} of {employees.length} Selected
                  </Badge>
                </div>
                <DialogDescription>
                  Filter and check off the eligible employees included in this batch.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                {/* Search & Select All Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      placeholder="Search employees..."
                      className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
                    {selectedEmpIds.length === employees.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {/* Employee Checklist (Matches Excalidraw Screen 6) */}
                <div className="border border-border rounded-xl max-h-60 overflow-y-auto divide-y divide-border">
                  {filteredEmployeesForSelection.map((emp) => {
                    const isChecked = selectedEmpIds.includes(emp.id);
                    const contract = contracts.find((c) => c.employeeId === emp.id && c.status === "Running");
                    const wage = contract ? contract.wage : 75000;

                    return (
                      <div
                        key={emp.id}
                        onClick={() => handleToggleEmployee(emp.id)}
                        className={`flex items-center justify-between p-2.5 hover:bg-muted/40 cursor-pointer transition-colors ${
                          isChecked ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="size-4 rounded border-border text-primary cursor-pointer"
                          />
                          <div>
                            <p className="font-semibold text-foreground">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {emp.jobPosition} • 40 hours/week
                            </p>
                          </div>
                        </div>

                        <div className="text-right font-mono font-semibold text-foreground">
                          {formatCurrency(wage)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setWizardStep(1)}>
                  <ArrowLeft className="size-3.5" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreatePayrun}
                  disabled={isCreating}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      <span>Creating & Computing...</span>
                    </>
                  ) : (
                    <span>Create Payrun Batch</span>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
