"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  Search,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  UserCheck,
  Edit3,
  LogIn,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading attendance ledger...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}

function AttendanceContent() {
  const searchParams = useSearchParams();
  const filterEmployee = searchParams.get("employee");

  const { attendance, employees, addAttendance, updateAttendance } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState(filterEmployee || "");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({});

  const filteredAttendance = useMemo(() => {
    return attendance.filter((rec) => {
      const matchesSearch =
        rec.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.date.includes(searchQuery);
      const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
      const matchesToday = !todayOnly || rec.date === "2026-09-02";
      return matchesSearch && matchesStatus && matchesToday;
    });
  }, [attendance, searchQuery, statusFilter, todayOnly]);

  const handleOpenRecord = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setFormData(rec);
    setIsCreate(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({
      employeeId: employees[0]?.id || "",
      employeeName: employees[0]?.name || "",
      date: new Date().toISOString().split("T")[0],
      checkIn: "09:00",
      checkOut: "18:00",
      workedHours: 9.0,
      overtimeHours: 0.0,
      status: "Present",
      isManualEdit: true,
      notes: "Manual attendance punch entry.",
    });
    setIsCreate(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const emp = employees.find((e) => e.id === formData.employeeId);
    const empName = emp ? emp.name : formData.employeeName || "";

    // Auto-calculate worked hours from checkIn and checkOut
    let worked = formData.workedHours || 8.0;
    if (formData.checkIn && formData.checkOut) {
      const [inH, inM] = formData.checkIn.split(":").map(Number);
      const [outH, outM] = formData.checkOut.split(":").map(Number);
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - 60; // minus 1 hr break
      if (totalMinutes > 0) {
        worked = Number((totalMinutes / 60).toFixed(2));
      }
    }

    if (isCreate) {
      addAttendance({
        ...formData,
        employeeName: empName,
        workedHours: worked,
        isManualEdit: true,
      } as Omit<AttendanceRecord, "id">);
      toast({ title: "Punch Recorded", description: `Attendance logged for ${empName}.`, type: "success" });
    } else if (selectedRecord) {
      updateAttendance(selectedRecord.id, {
        ...formData,
        employeeName: empName,
        workedHours: worked,
        isManualEdit: true,
      });
      toast({ title: "Attendance Corrected", description: "Audit logged for manual edit.", type: "success" });
    }

    setIsModalOpen(false);
  };

  // Quick Check In demo trigger
  const handleQuickPunch = () => {
    const defaultEmp = employees[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    addAttendance({
      employeeId: defaultEmp.id,
      employeeName: defaultEmp.name,
      date: new Date().toISOString().split("T")[0],
      checkIn: timeStr,
      workedHours: 0,
      overtimeHours: 0,
      status: "Present",
      isManualEdit: false,
      notes: "Quick check-in punch recorded.",
    });

    toast({
      title: "Check-in Successful!",
      description: `${defaultEmp.name} punched in at ${timeStr}.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance & Timesheets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time presence tracking, punch exception verification, and manual attendance correction audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleQuickPunch} className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
            <LogIn className="size-4" />
            <span>Quick Check-In</span>
          </Button>

          <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
            <Plus className="size-4" />
            <span>RECORD PUNCH</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attendance by employee or date..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <Button
            size="sm"
            variant={todayOnly ? "default" : "outline"}
            onClick={() => setTodayOnly(!todayOnly)}
            className="text-xs"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {["All", "Present", "Late", "Absent"].map((st) => (
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

      {/* Attendance Table (Matches Excalidraw Screen 2) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-center">Check In</th>
              <th className="py-3 px-4 text-center">Check Out</th>
              <th className="py-3 px-4 text-right">Worked Hours</th>
              <th className="py-3 px-4 text-right">Overtime</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Type</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAttendance.map((rec) => (
              <tr
                key={rec.id}
                onClick={() => handleOpenRecord(rec)}
                className="hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-mono text-muted-foreground">{formatDate(rec.date)}</td>
                <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                  {rec.employeeName}
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                  {rec.checkIn || "—"}
                </td>
                <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                  {rec.checkOut || "—"}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                  {rec.workedHours > 0 ? `${rec.workedHours} hrs` : "0.00"}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                  {rec.overtimeHours > 0 ? (
                    <span className="text-emerald-600 font-bold">+{rec.overtimeHours}h</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Badge
                    variant={rec.status === "Present" ? "success" : rec.status === "Late" ? "warning" : "destructive"}
                    className="text-[10px]"
                  >
                    {rec.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-center">
                  {rec.isManualEdit ? (
                    <span className="text-[10px] text-amber-600 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Edited
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Punch</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="text-primary hover:underline font-semibold">Audit</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attendance Form & Correction Modal (Matches Excalidraw Screen 2 Form) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isCreate ? "New Attendance Entry" : `Attendance / ${selectedRecord?.employeeName}`}
              </DialogTitle>
              {formData.status && (
                <Badge variant={formData.status === "Present" ? "success" : formData.status === "Late" ? "warning" : "destructive"}>
                  {formData.status}
                </Badge>
              )}
            </div>
            <DialogDescription>
              System-generated from punch clocks or manually corrected by authorized HR payroll personnel.
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
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Date</label>
              <Input
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Check In Time</label>
                <Input
                  type="time"
                  value={formData.checkIn || ""}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Check Out Time</label>
                <Input
                  type="time"
                  value={formData.checkOut || ""}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Overtime (Hours)</label>
                <Input
                  type="number"
                  step="0.25"
                  value={formData.overtimeHours ?? 0}
                  onChange={(e) => setFormData({ ...formData, overtimeHours: Number(e.target.value) })}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Audit Notes / Correction Reason</label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="e.g. Traffic delay, missed badge punch, work from home..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">
              {isCreate ? "Record Punch" : "Save Manual Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
