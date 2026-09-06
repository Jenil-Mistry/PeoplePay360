"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  getTimeOffTypes, 
  createTimeOffType, 
  updateTimeOffType, 
  deleteTimeOffType 
} from "@/lib/actions/time-off";

type TimeOffType = any;

export default function TimeOffTypesPage() {
  const [timeOffTypes, setTimeOffTypes] = useState<TimeOffType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TimeOffType | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"DAYS" | "HOURS">("DAYS");
  const [requiresAllocation, setRequiresAllocation] = useState(true);
  const [includeInPayroll, setIncludeInPayroll] = useState(true);

  const { toast } = useToast();

  const loadTypes = async () => {
    try {
      setIsLoading(true);
      const data = await getTimeOffTypes();
      setTimeOffTypes(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleOpenModal = (t?: TimeOffType) => {
    if (t) {
      setEditingType(t);
      setName(t.name);
      setUnit(t.unit);
      setRequiresAllocation(t.requiresAllocation);
      setIncludeInPayroll(t.includeInPayroll);
    } else {
      setEditingType(null);
      setName("");
      setUnit("DAYS");
      setRequiresAllocation(true);
      setIncludeInPayroll(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", type: "error" });
      return;
    }

    try {
      let res;
      if (editingType) {
        res = await updateTimeOffType(editingType.id, {
          name,
          unit,
          requiresAllocation,
          includeInPayroll,
        });
      } else {
        res = await createTimeOffType({
          name,
          unit,
          requiresAllocation,
          includeInPayroll,
        });
      }

      if (res.success) {
        toast({ title: "Success", description: "Time-off type saved successfully.", type: "success" });
        setIsModalOpen(false);
        loadTypes();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this time-off type?")) return;
    try {
      const res = await deleteTimeOffType(id);
      if (res.success) {
        toast({ title: "Success", description: "Type deactivated.", type: "success" });
        loadTypes();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

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
        <Button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Create Type
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Type Name</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-center">Requires Allocation</th>
                <th className="py-3 px-4 text-left">Payroll Integration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {timeOffTypes.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-foreground">
                    {t.name}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">{t.unit}</td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={t.requiresAllocation ? "default" : "secondary"} className="text-[10px]">
                      {t.requiresAllocation ? "Required" : "No Allocation Needed"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground font-medium">
                    {t.includeInPayroll ? "Include in Payroll" : "Exclude from Payroll"}
                  </td>
                  <td className="py-3.5 px-4 text-right flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(t)}>
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {timeOffTypes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No time-off types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Time-Off Type" : "Create Time-Off Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Policy Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Annual Leave, Sick Leave" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={unit} 
                onChange={e => setUnit(e.target.value as "DAYS" | "HOURS")}
              >
                <option value="DAYS">Days</option>
                <option value="HOURS">Hours</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="reqAlloc" checked={requiresAllocation} onChange={e => setRequiresAllocation(e.target.checked)} className="rounded border-gray-300 text-primary" />
              <label htmlFor="reqAlloc" className="text-sm font-medium">Requires an active Allocation Balance</label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="incPayroll" checked={includeInPayroll} onChange={e => setIncludeInPayroll(e.target.checked)} className="rounded border-gray-300 text-primary" />
              <label htmlFor="incPayroll" className="text-sm font-medium">Include in Payroll Calculations</label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-primary">Save Policy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
