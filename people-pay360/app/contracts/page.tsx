"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  Plus,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Contract, ContractStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading contracts...</div>}>
      <ContractsContent />
    </Suspense>
  );
}

function ContractsContent() {
  const searchParams = useSearchParams();
  const filterEmployee = searchParams.get("employee");

  const { contracts, employees, salaryStructures, addContract, updateContract } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState(filterEmployee || "");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Contract>>({});

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        c.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.refCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const handleOpenContract = (c: Contract) => {
    setSelectedContract(c);
    setFormData(c);
    setIsCreate(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedContract(null);
    setFormData({
      employeeId: employees[0]?.id || "",
      employeeName: employees[0]?.name || "",
      refCode: `CON/2026/00${contracts.length + 10}`,
      startDate: new Date().toISOString().split("T")[0],
      wage: 80000,
      structureId: salaryStructures[0]?.id || "",
      status: "Running",
      notes: "Period running contract for employee.",
    });
    setIsCreate(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.refCode || !formData.wage) {
      toast({ title: "Validation Error", description: "Reference code and wage are required.", type: "error" });
      return;
    }

    const emp = employees.find((e) => e.id === formData.employeeId);
    const empName = emp ? emp.name : formData.employeeName || "";

    if (isCreate) {
      addContract({
        ...formData,
        employeeName: empName,
      } as Omit<Contract, "id">);
      toast({ title: "Contract Created", description: `${formData.refCode} initialized.`, type: "success" });
    } else if (selectedContract) {
      updateContract(selectedContract.id, {
        ...formData,
        employeeName: empName,
      });
      toast({ title: "Contract Updated", description: "Contract terms saved.", type: "success" });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contract Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maintain complete contract history. Active <strong>Running</strong> contracts directly drive payroll computation.
          </p>
        </div>

        <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
          <Plus className="size-4" />
          <span>NEW CONTRACT</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contracts (CON/...) or employee..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          {["All", "Running", "Expired", "Draft"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table (Matches Excalidraw Screen 1) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Contract Ref</th>
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-left">Start Date</th>
              <th className="py-3 px-4 text-left">End Date</th>
              <th className="py-3 px-4 text-right">Wage / Month</th>
              <th className="py-3 px-4 text-left">Salary Structure</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredContracts.map((c) => {
              const struct = salaryStructures.find((s) => s.id === c.structureId);
              return (
                <tr
                  key={c.id}
                  onClick={() => handleOpenContract(c)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                    {c.refCode}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{c.employeeName}</td>
                  <td className="py-3.5 px-4 text-muted-foreground font-mono">{formatDate(c.startDate)}</td>
                  <td className="py-3.5 px-4 text-muted-foreground font-mono">{formatDate(c.endDate || "")}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                    {formatCurrency(c.wage)}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{struct?.name || "Regular Salary"}</td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge
                      variant={c.status === "Running" ? "success" : c.status === "Expired" ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-primary hover:underline font-semibold">View</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contract Detail & Edit Modal (Matches Excalidraw Screen 1 Form) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg" onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{isCreate ? "New Contract" : `Contract / ${selectedContract?.refCode}`}</DialogTitle>
              {formData.status && (
                <Badge variant={formData.status === "Running" ? "success" : "secondary"}>
                  {formData.status}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {formData.status === "Running"
                ? "This running contract is the source for payroll calculation in the active period."
                : "Historical employment contract record."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Employee</label>
              <select
                disabled={!isCreate}
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm disabled:opacity-60"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department} • {emp.jobPosition})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Contract Reference Code</label>
                <Input
                  value={formData.refCode || ""}
                  onChange={(e) => setFormData({ ...formData, refCode: e.target.value })}
                  placeholder="CON/2026/0042"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Monthly Wage (₹)</label>
                <Input
                  type="number"
                  value={formData.wage || ""}
                  onChange={(e) => setFormData({ ...formData, wage: Number(e.target.value) })}
                  placeholder="85000"
                  className="font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">End Date (Leave blank if ongoing)</label>
                <Input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Salary Structure</label>
                <select
                  value={formData.structureId}
                  onChange={(e) => setFormData({ ...formData, structureId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm"
                >
                  {salaryStructures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Contract Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ContractStatus })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm"
                >
                  <option value="Running">Running (Active Payroll Source)</option>
                  <option value="Expired">Expired</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Contract Notes & Provisions</label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Employment terms, department, standard allowances..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">
              Save Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
