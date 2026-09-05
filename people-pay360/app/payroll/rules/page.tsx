"use client";

import React, { useState } from "react";
import {
  ListOrdered,
  Search,
  Plus,
  Code,
  Percent,
  DollarSign,
  Calculator,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SalaryRule, RuleCategory, ComputationType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function SalaryRulesPage() {
  const { salaryRules, addSalaryRule, updateSalaryRule } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRule, setSelectedRule] = useState<SalaryRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<SalaryRule>>({});

  const filteredRules = salaryRules
    .filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.sequence - b.sequence);

  const handleOpenRule = (r: SalaryRule) => {
    setSelectedRule(r);
    setFormData(r);
    setIsCreate(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRule(null);
    setFormData({
      name: "",
      code: "ALLOW",
      category: "Allowance",
      sequence: (salaryRules.length + 1) * 10,
      computationType: "fixed",
      fixedAmount: 5000,
    });
    setIsCreate(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast({ title: "Incomplete Rule", description: "Name and code are required.", type: "error" });
      return;
    }

    if (isCreate) {
      addSalaryRule(formData as Omit<SalaryRule, "id">);
      toast({ title: "Rule Created", description: `${formData.name} added to calculation registry.`, type: "success" });
    } else if (selectedRule) {
      updateSalaryRule(selectedRule.id, formData);
      toast({ title: "Rule Updated", description: "Calculation attributes saved.", type: "success" });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Salary Computation Rules</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rules drive automated payslip lines. <strong>Rule order matters</strong>: rules are executed in sequence so totals can build upon previous values.
          </p>
        </div>

        <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
          <Plus className="size-4" />
          <span>NEW SALARY RULE</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules (BASIC, HRA, GROSS)..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Rules Table (Matches Excalidraw Screen 5) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-center w-20">Sequence</th>
              <th className="py-3 px-4 text-left">Rule Name</th>
              <th className="py-3 px-4 text-center">Code</th>
              <th className="py-3 px-4 text-left">Category</th>
              <th className="py-3 px-4 text-left">Computation Method</th>
              <th className="py-3 px-4 text-right">Parameter Value</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRules.map((r) => (
              <tr
                key={r.id}
                onClick={() => handleOpenRule(r)}
                className="hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 text-center font-mono font-bold text-primary">{r.sequence}</td>
                <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-primary transition-colors">
                  {r.name}
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-muted-foreground">{r.code}</td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant={
                      r.category === "Basic"
                        ? "default"
                        : r.category === "Allowance"
                        ? "outline"
                        : r.category === "Deduction"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {r.category}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-muted-foreground capitalize">
                  {r.computationType === "percentage"
                    ? "Percentage of Wage"
                    : r.computationType === "fixed"
                    ? "Fixed Amount"
                    : "Formula / Python Expression"}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                  {r.computationType === "percentage"
                    ? `${r.percentage}%`
                    : r.computationType === "fixed"
                    ? `₹${r.fixedAmount}`
                    : "result = ..."}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="text-primary hover:underline font-semibold">Configure</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Salary Rule Configuration Modal (Matches Excalidraw Screen 5 Rule Form) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{isCreate ? "New Salary Rule" : `Salary Rule / ${selectedRule?.name}`}</DialogTitle>
              {formData.code && <Badge variant="outline" className="font-mono">{formData.code}</Badge>}
            </div>
            <DialogDescription>
              A Salary Rule needs a clear computation method and category because these drive the lines displayed on the final payslip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Rule Name</label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Basic Salary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Code</label>
                <Input
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BASIC"
                  className="font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Sequence (10..100)</label>
                <Input
                  type="number"
                  value={formData.sequence || 10}
                  onChange={(e) => setFormData({ ...formData, sequence: Number(e.target.value) })}
                  className="font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as RuleCategory })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm"
                >
                  <option value="Basic">Basic</option>
                  <option value="Allowance">Allowance</option>
                  <option value="Gross">Gross</option>
                  <option value="Deduction">Deduction</option>
                  <option value="Net">Net</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Computation Method</label>
              <select
                value={formData.computationType}
                onChange={(e) => setFormData({ ...formData, computationType: e.target.value as ComputationType })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm"
              >
                <option value="percentage">Percentage of Wage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="formula">Python Formula / Expression</option>
              </select>
            </div>

            {formData.computationType === "percentage" && (
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Percentage of Wage (%)</label>
                <Input
                  type="number"
                  value={formData.percentage || 50}
                  onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
                  className="font-mono font-bold"
                />
              </div>
            )}

            {formData.computationType === "fixed" && (
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Fixed Amount (₹)</label>
                <Input
                  type="number"
                  value={formData.fixedAmount || 0}
                  onChange={(e) => setFormData({ ...formData, fixedAmount: Number(e.target.value) })}
                  className="font-mono font-bold"
                />
              </div>
            )}

            {formData.computationType === "formula" && (
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Example Expression</label>
                <Input
                  value={formData.formula || "result = categories['BASIC'] + categories['HRA']"}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
