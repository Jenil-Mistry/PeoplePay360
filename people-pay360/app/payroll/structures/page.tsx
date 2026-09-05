"use client";

import React, { useState } from "react";
import {
  Layers,
  Users,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SalaryStructure } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SalaryStructuresPage() {
  const { salaryStructures, salaryRules, contracts } = useAppStore();

  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);



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

      {/* Structures Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Structure Name</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-center">Rule Count</th>
              <th className="py-3 px-4 text-center">Active Contracts</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {salaryStructures.map((struct) => {
              const rulesInStruct = salaryRules.filter((r) => struct.ruleIds.includes(r.id));
              const empCount = contracts.filter((c) => c.structureId === struct.id && c.status === "Running").length;
              const isExpanded = selectedStructure?.id === struct.id;

              return (
                <React.Fragment key={struct.id}>
                  <tr
                    onClick={() => setSelectedStructure(isExpanded ? null : struct)}
                    className={`hover:bg-muted/40 transition-colors cursor-pointer group ${isExpanded ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-3.5 px-4 font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      <Layers className="size-4 text-muted-foreground" />
                      {struct.name}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {struct.structureType}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium">
                      {rulesInStruct.length}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="flex items-center justify-center gap-1 font-semibold text-foreground">
                        <Users className="size-3.5 text-primary" />
                        {empCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-primary">
                        {isExpanded ? "Hide Rules" : "View Rules"}
                      </Button>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="bg-muted/10 border-t-0">
                      <td colSpan={5} className="p-4 pt-2">
                        <div className="rounded-lg border border-border overflow-hidden bg-background">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/30 border-b border-border text-muted-foreground font-semibold">
                              <tr>
                                <th className="py-2.5 px-4 text-center w-12">Seq</th>
                                <th className="py-2.5 px-4 text-left">Rule Name</th>
                                <th className="py-2.5 px-4 text-center w-24">Code</th>
                                <th className="py-2.5 px-4 text-left w-28">Category</th>
                                <th className="py-2.5 px-4 text-left">Computation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {rulesInStruct
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
                              {rulesInStruct.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                                    No rules assigned to this structure.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
