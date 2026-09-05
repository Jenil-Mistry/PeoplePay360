"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Search,
  Plus,
  CheckCircle2,
  PieChart,
  UserCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LeaveAllocation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function TimeOffAllocationsPage() {
  const { allocations, employees, timeOffTypes, addLeaveAllocation, currentUser } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAllocation, setSelectedAllocation] = useState<LeaveAllocation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<LeaveAllocation>>({});

  const canCreateAllocation = currentUser.role === "HR_MANAGER" || currentUser.role === "ADMIN";

  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      return (
        a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.typeName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [allocations, searchQuery]);

  const handleOpenAllocation = (a: LeaveAllocation) => {
    setSelectedAllocation(a);
    setFormData(a);
    setIsCreate(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedAllocation(null);
    setFormData({
      employeeId: employees[0]?.id || "",
      employeeName: employees[0]?.name || "",
      typeId: timeOffTypes[0]?.id || "",
      typeName: timeOffTypes[0]?.name || "",
      allocatedDays: 20,
      takenDays: 0,
      remainingDays: 20,
      approver: "Priya Nair",
      validityYear: "2026",
      status: "Approved",
      description: "Annual policy year balance grant.",
    });
    setIsCreate(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const emp = employees.find((e) => e.id === formData.employeeId);
    const type = timeOffTypes.find((t) => t.id === formData.typeId);
    const allocated = formData.allocatedDays || 0;
    const taken = formData.takenDays || 0;
    const remaining = Math.max(0, allocated - taken);

    if (isCreate) {
      addLeaveAllocation({
        ...formData,
        employeeName: emp?.name || "",
        typeName: type?.name || "",
        allocatedDays: allocated,
        takenDays: taken,
        remainingDays: remaining,
      } as Omit<LeaveAllocation, "id">);
      toast({ title: "Allocation Granted", description: `Leave balance added for ${emp?.name}.`, type: "success" });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Time Off Allocations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage employee annual leave balances and track balance consumption math: <strong>Allocated - Taken = Remaining</strong>.
          </p>
        </div>

        {canCreateAllocation && (
          <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
            <Plus className="size-4" />
            <span>NEW ALLOCATION</span>
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
            placeholder="Search allocations by employee or leave type..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Allocations Table (Matches Excalidraw Screen 3) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-left">Leave Type</th>
              <th className="py-3 px-4 text-right">Allocated</th>
              <th className="py-3 px-4 text-right">Taken</th>
              <th className="py-3 px-4 text-right">Remaining Balance</th>
              <th className="py-3 px-4 text-left">Approver</th>
              <th className="py-3 px-4 text-center">Validity</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAllocations.map((a) => (
              <tr
                key={a.id}
                onClick={() => handleOpenAllocation(a)}
                className="hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                  {a.employeeName}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant="outline" className="text-[10px]">
                    {a.typeName}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-medium text-foreground">
                  {a.allocatedDays} days
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                  {a.takenDays} days
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                  {a.remainingDays} days
                </td>
                <td className="py-3.5 px-4 text-muted-foreground">{a.approver}</td>
                <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">{a.validityYear}</td>
                <td className="py-3.5 px-4 text-center">
                  <Badge variant="success" className="text-[10px]">
                    {a.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="text-primary hover:underline font-semibold">View</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Allocation Detail Modal (Matches Excalidraw Screen 3 Allocation Form) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isCreate ? "Grant Leave Allocation" : `Allocation / ${selectedAllocation?.employeeName}`}
              </DialogTitle>
              {formData.status && <Badge variant="success">{formData.status}</Badge>}
            </div>
            <DialogDescription>
              Approved allocation creates available leave balance for the employee.
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
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Time Off Type</label>
              <select
                disabled={!isCreate}
                value={formData.typeId}
                onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm disabled:opacity-60"
              >
                {timeOffTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Allocated</span>
                <p className="text-lg font-bold font-mono text-foreground mt-0.5">{formData.allocatedDays || 0}d</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Taken</span>
                <p className="text-lg font-bold font-mono text-muted-foreground mt-0.5">{formData.takenDays || 0}d</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-primary">Remaining</span>
                <p className="text-lg font-bold font-mono text-primary mt-0.5">{formData.remainingDays || 0}d</p>
              </div>
            </div>

            {isCreate && (
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Grant Days</label>
                <Input
                  type="number"
                  value={formData.allocatedDays || 20}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allocatedDays: Number(e.target.value),
                      remainingDays: Number(e.target.value) - (formData.takenDays || 0),
                    })
                  }
                  className="font-mono font-bold"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Approver</label>
                <Input
                  value={formData.approver || "Priya Nair"}
                  onChange={(e) => setFormData({ ...formData, approver: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Validity Period</label>
                <Input
                  value={formData.validityYear || "2026"}
                  onChange={(e) => setFormData({ ...formData, validityYear: e.target.value })}
                  placeholder="2026"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Description</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Annual leave balance granted at start of policy year."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
            {isCreate && (
              <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">
                Grant Allocation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
