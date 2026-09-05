"use client";

import React, { useState } from "react";
import { Settings2, Plus, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { TimeOffType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TimeOffTypesPage() {
  const { timeOffTypes } = useAppStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Time Off Policy Types</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure leave policies, unit measures (Days/Hours), allocation constraints, and payroll work entry linkages.
          </p>
        </div>
      </div>

      {/* Types Table (Matches Excalidraw Screen 3) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Type Name</th>
              <th className="py-3 px-4 text-center">Unit</th>
              <th className="py-3 px-4 text-center">Requires Allocation</th>
              <th className="py-3 px-4 text-left">Approval Workflow</th>
              <th className="py-3 px-4 text-left">Payroll Integration</th>
              <th className="py-3 px-4 text-left">Policy Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {timeOffTypes.map((t) => (
              <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span>{t.name}</span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">{t.unit}</td>
                <td className="py-3.5 px-4 text-center">
                  <Badge variant={t.requiresAllocation ? "default" : "secondary"} className="text-[10px]">
                    {t.requiresAllocation ? "Required" : "No Allocation Needed"}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-foreground font-medium">{t.approvalLevel}</td>
                <td className="py-3.5 px-4 text-muted-foreground font-mono">Leave Work Entry</td>
                <td className="py-3.5 px-4 text-muted-foreground">{t.notes || "Standard corporate leave policy."}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
