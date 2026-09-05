"use client";

import React, { useState } from "react";
import {
  Layers,
  Search,
  Plus,
  ArrowRight,
  ListOrdered,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SalaryStructure } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function SalaryStructuresPage() {
  const { salaryStructures, salaryRules, contracts } = useAppStore();

  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = (s: SalaryStructure) => {
    setSelectedStructure(s);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Salary Structures</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Salary structures group ordered collections of salary rules that dictate how payslips are computed for assigned employees.
          </p>
        </div>
      </div>

      {/* Structures Grid (Matches Excalidraw Screen 5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {salaryStructures.map((struct) => {
          const rulesInStruct = salaryRules.filter((r) => struct.ruleIds.includes(r.id));
          const empCount = contracts.filter((c) => c.structureId === struct.id && c.status === "Running").length;

          return (
            <div
              key={struct.id}
              onClick={() => handleOpen(struct)}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-48 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {struct.name}
                    <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {struct.structureType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {struct.notes || "Standard corporate salary structure rules."}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-mono">
                  <ListOrdered className="size-3.5" />
                  {rulesInStruct.length} rules
                </span>
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Users className="size-3.5 text-primary" />
                  {empCount} active contracts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Structure Detail Modal with Ordered Rules (Matches Excalidraw Screen 5) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl" onClose={() => setIsModalOpen(false)}>
          {selectedStructure && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedStructure.name}</DialogTitle>
                  <Badge variant="outline">{selectedStructure.structureType}</Badge>
                </div>
                <DialogDescription>
                  Rules in this structure are executed in strictly ordered sequence during payroll calculations.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Associated Salary Rules & Sequence
                </h4>

                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-center">Seq</th>
                        <th className="py-2.5 px-4 text-left">Rule Name</th>
                        <th className="py-2.5 px-4 text-center">Code</th>
                        <th className="py-2.5 px-4 text-left">Category</th>
                        <th className="py-2.5 px-4 text-left">Computation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {salaryRules
                        .filter((r) => selectedStructure.ruleIds.includes(r.id))
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((rule) => (
                          <tr key={rule.id} className="hover:bg-muted/20">
                            <td className="py-2 px-4 text-center font-mono font-bold text-primary">
                              {rule.sequence}
                            </td>
                            <td className="py-2 px-4 font-semibold text-foreground">{rule.name}</td>
                            <td className="py-2 px-4 text-center font-mono font-bold text-muted-foreground">
                              {rule.code}
                            </td>
                            <td className="py-2 px-4">
                              <Badge
                                variant={rule.category === "Deduction" ? "destructive" : "secondary"}
                                className="text-[9px]"
                              >
                                {rule.category}
                              </Badge>
                            </td>
                            <td className="py-2 px-4 text-muted-foreground capitalize">
                              {rule.computationType === "percentage"
                                ? `${rule.percentage}% of Wage`
                                : rule.computationType === "fixed"
                                ? `Fixed ₹${rule.fixedAmount}`
                                : "Formula Expression"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter>
                <Button size="sm" onClick={() => setIsModalOpen(false)} className="bg-primary text-primary-foreground">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
