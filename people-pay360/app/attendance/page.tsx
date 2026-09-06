"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
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
  Timer,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { hasWriteAccess } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

// Export moved to bottom

function AttendanceContent() {
  const searchParams = useSearchParams();
  const filterEmployee = searchParams.get("employee");

  const {
    attendance,
    employees,
    addAttendance,
    updateAttendance,
    checkInEmployee,
    checkOutEmployee,
    currentUser,
  } = useAppStore();
  const { toast } = useToast();

  // Live System Clock ticking every second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Configurable Scheduled Shift Start Time (default 09:00 AM)
  const [scheduledShiftTime, setScheduledShiftTime] = useState<string>("09:00");

  // Today's ISO date string (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // RBAC: Can this user manage other employees' attendance?
  const canManageOthers = hasWriteAccess(currentUser.role, "attendance_correct_others");

  // Find the employee record matching the currently logged-in user
  const currentUserEmployee = useMemo(() => {
    return employees.find((e) => e.id === currentUser.id || e.workEmail === currentUser.email);
  }, [employees, currentUser]);

  // Active Employee selected for Live Punch Bar
  const [activePunchEmpId, setActivePunchEmpId] = useState<string>("");

  useEffect(() => {
    if (employees.length > 0) {
      if (canManageOthers) {
        // HR/Admin: default to own employee but allow changing
        if (!activePunchEmpId) {
          const match = employees.find((e) => e.id === currentUser.id || e.workEmail === currentUser.email);
          setActivePunchEmpId(match ? match.id : employees[0].id);
        }
      } else {
        // Regular employees: always locked to their own record
        const match = employees.find((e) => e.id === currentUser.id || e.workEmail === currentUser.email);
        if (match) {
          setActivePunchEmpId(match.id);
        }
      }
    }
  }, [employees, currentUser, activePunchEmpId, canManageOthers]);

  // Today's attendance record for the active punch employee
  const activeEmpRecordToday = useMemo(() => {
    return attendance.find(
      (a) => a.employeeId === activePunchEmpId && (a.date === todayStr || a.date === "2026-09-02")
    );
  }, [attendance, activePunchEmpId, todayStr]);

  const [searchQuery, setSearchQuery] = useState(filterEmployee || "");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // Form State for modal
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({});

  /**
   * Computes human-readable tolerance window (e.g. 08:50 – 09:10 for 09:00)
   */
  const getToleranceWindow = (shiftTime: string = "09:00") => {
    const [h, m] = shiftTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "08:50 – 09:10";
    const startMins = h * 60 + m - 10;
    const endMins = h * 60 + m + 10;
    const formatHmM = (mins: number) => {
      const normalized = (mins + 1440) % 1440;
      const hours = Math.floor(normalized / 60);
      const minutes = normalized % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    };
    return `${formatHmM(startMins)} – ${formatHmM(endMins)}`;
  };

  /**
   * Evaluates check-in time against scheduled start.
   * Allowed tolerance window: ±10 minutes (e.g. 08:50 to 09:10 for 09:00).
   * - checkIn <= shift + 10 mins: Present (On time or early)
   * - checkIn > shift + 10 mins: Late
   */
  const evaluateCheckInTolerance = (
    checkInTimeStr?: string | null,
    scheduledTimeStr: string = scheduledShiftTime
  ) => {
    if (!checkInTimeStr || !checkInTimeStr.trim()) {
      return {
        status: "Absent" as AttendanceStatus,
        label: "No Punch",
        isWithin: false,
        diff: 0,
      };
    }
    const [inH, inM] = checkInTimeStr.split(":").map(Number);
    const [schH, schM] = scheduledTimeStr.split(":").map(Number);
    if (isNaN(inH) || isNaN(inM)) {
      return {
        status: "Present" as AttendanceStatus,
        label: "On Time",
        isWithin: true,
        diff: 0,
      };
    }

    const diffMinutes = inH * 60 + inM - (schH * 60 + schM);

    if (diffMinutes > 10) {
      return {
        status: "Late" as AttendanceStatus,
        label: `+${diffMinutes}m Late`,
        isWithin: false,
        diff: diffMinutes,
      };
    }
    if (diffMinutes < -10) {
      return {
        status: "Present" as AttendanceStatus,
        label: `${Math.abs(diffMinutes)}m Early`,
        isWithin: true,
        diff: diffMinutes,
      };
    }
    return {
      status: "Present" as AttendanceStatus,
      label: "On Time (±10m)",
      isWithin: true,
      diff: diffMinutes,
    };
  };

  /**
   * Helper to compute worked hours and overtime between in & out times.
   */
  const calculateHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return { workedHours: 0, overtimeHours: 0 };
    const [inH, inM] = inTime.split(":").map(Number);
    const [outH, outM] = outTime.split(":").map(Number);
    let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight shift handling
    const hours = Math.max(0, diffMinutes / 60);
    const worked = Number(hours.toFixed(2));
    const ot = worked > 8.0 ? Number((worked - 8.0).toFixed(2)) : 0;
    return { workedHours: worked, overtimeHours: ot };
  };

  const filteredAttendance = useMemo(() => {
    return attendance.filter((rec) => {
      const tol = evaluateCheckInTolerance(rec.checkIn, scheduledShiftTime);
      const effectiveStatus: AttendanceStatus = rec.checkIn ? tol.status : (rec.status || "Absent");
      const matchesSearch =
        rec.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.date.includes(searchQuery);
      const matchesStatus = statusFilter === "All" || effectiveStatus === statusFilter;
      const matchesToday = !todayOnly || rec.date === todayStr || rec.date === "2026-09-02";
      return matchesSearch && matchesStatus && matchesToday;
    });
  }, [attendance, searchQuery, statusFilter, todayOnly, todayStr, scheduledShiftTime]);

  const [page, setPage] = useState(1);
  const limit = 15;
  const total = filteredAttendance.length;
  const isLoading = false; // Always false since data is from store
  const paginatedAttendance = filteredAttendance.slice((page - 1) * limit, page * limit);

  const handleOpenRecord = (rec: AttendanceRecord) => {
    const tol = evaluateCheckInTolerance(rec.checkIn, scheduledShiftTime);
    setSelectedRecord(rec);
    setFormData({
      ...rec,
      status: rec.checkIn ? tol.status : rec.status,
    });
    setIsCreate(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    // For regular employees, default to their own record; for HR/Admin, allow choosing
    const defaultEmp = canManageOthers ? employees[0] : currentUserEmployee || employees[0];
    const nowStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(
      currentTime.getMinutes()
    ).padStart(2, "0")}`;
    const tol = evaluateCheckInTolerance(nowStr, scheduledShiftTime);

    setSelectedRecord(null);
    setFormData({
      employeeId: defaultEmp?.id || "",
      employeeName: defaultEmp?.name || "",
      date: todayStr,
      checkIn: nowStr,
      checkOut: "",
      workedHours: 0.0,
      overtimeHours: 0.0,
      status: tol.status,
      isManualEdit: true,
      notes: "Manual attendance punch entry.",
    });
    setIsCreate(true);
    setIsModalOpen(true);
  };

  // Live Quick Check In from Top Bar
  const handleLiveCheckIn = () => {
    const emp = employees.find((e) => e.id === activePunchEmpId);
    if (!emp) return;

    const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(
      currentTime.getMinutes()
    ).padStart(2, "0")}`;
    const tol = evaluateCheckInTolerance(timeStr, scheduledShiftTime);

    checkInEmployee({
      employeeId: emp.id,
      employeeName: emp.name,
      date: todayStr,
      checkInTime: timeStr,
      scheduledTime: scheduledShiftTime,
      status: tol.status,
      notes: `Punch at ${timeStr}. ${tol.label} against ${scheduledShiftTime} shift.`,
    });

    if (tol.status === "Present") {
      toast({
        title: "Check-in Successful!",
        description: `${emp.name} punched in at ${timeStr}. Status: Present (${tol.label}).`,
        type: "success",
      });
    } else {
      toast({
        title: "Late Check-in Recorded!",
        description: `${emp.name} punched in at ${timeStr}. Status: Late (${tol.label}).`,
        type: "warning",
      });
    }
  };

  // Live Quick Check Out from Top Bar
  const handleLiveCheckOut = () => {
    const emp = employees.find((e) => e.id === activePunchEmpId);
    if (!emp) return;

    const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(
      currentTime.getMinutes()
    ).padStart(2, "0")}`;

    const updated = checkOutEmployee({
      employeeId: emp.id,
      date: todayStr,
      checkOutTime: timeStr,
    });

    if (updated) {
      toast({
        title: "Check-out Recorded!",
        description: `${emp.name} punched out at ${timeStr}. Total worked: ${updated.workedHours} hrs (${updated.overtimeHours > 0 ? `+${updated.overtimeHours}h OT` : "Regular"}).`,
        type: "success",
      });
    } else {
      toast({
        title: "No Check-in Found",
        description: `Please punch in before checking out.`,
        type: "error",
      });
    }
  };

  // 1-Click Check Out directly from any row in the attendance table
  const handleRowCheckOut = (rec: AttendanceRecord) => {
    // Only allow checkout for own records (or if user has attendance_correct_others permission)
    const isOwnRecord = currentUserEmployee && rec.employeeId === currentUserEmployee.id;
    if (!isOwnRecord && !canManageOthers) {
      toast({
        title: "Permission Denied",
        description: "You can only check out your own attendance.",
        type: "error",
      });
      return;
    }

    const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(
      currentTime.getMinutes()
    ).padStart(2, "0")}`;

    const updated = checkOutEmployee({
      recordId: rec.id,
      checkOutTime: timeStr,
      notes: `Checked out via ledger at ${timeStr}.`,
    });

    if (updated) {
      toast({
        title: "Shift Completed!",
        description: `${rec.employeeName} checked out at ${timeStr}. Worked: ${updated.workedHours} hrs.`,
        type: "success",
      });
    }
  };

  // Modal Save Handler
  const handleSave = () => {
    const emp = employees.find((e) => e.id === formData.employeeId);
    const empName = emp ? emp.name : formData.employeeName || "";

    // Dynamically re-evaluate status from check-in time
    const tol = evaluateCheckInTolerance(formData.checkIn || "", scheduledShiftTime);
    const resolvedStatus: AttendanceStatus = formData.checkIn ? (formData.status || tol.status) : "Absent";

    let worked = formData.workedHours ?? 0;
    let ot = formData.overtimeHours ?? 0;

    if (formData.checkIn && formData.checkOut) {
      const calc = calculateHours(formData.checkIn, formData.checkOut);
      worked = calc.workedHours;
      ot = calc.overtimeHours;
    }

    if (isCreate) {
      addAttendance({
        ...formData,
        employeeName: empName,
        workedHours: worked,
        overtimeHours: ot,
        status: resolvedStatus,
        isManualEdit: true,
      } as Omit<AttendanceRecord, "id">);
      toast({
        title: "Punch Recorded",
        description: `Attendance logged for ${empName} (${resolvedStatus}, ${worked} hrs).`,
        type: "success",
      });
    } else if (selectedRecord) {
      updateAttendance(selectedRecord.id, {
        ...formData,
        employeeName: empName,
        workedHours: worked,
        overtimeHours: ot,
        status: resolvedStatus,
        isManualEdit: true,
      });
      toast({
        title: "Attendance Corrected",
        description: `Audit saved. Status: ${resolvedStatus}, Worked: ${worked} hrs.`,
        type: "success",
      });
    }

    setIsModalOpen(false);
  };

  // Modal Live Updates on CheckIn - dynamically flips status between Present and Late
  const handleModalCheckInChange = (newInTime: string) => {
    const tol = evaluateCheckInTolerance(newInTime, scheduledShiftTime);
    const hours = calculateHours(newInTime, formData.checkOut || "");

    setFormData((prev) => ({
      ...prev,
      checkIn: newInTime,
      workedHours: hours.workedHours || prev.workedHours,
      overtimeHours: hours.overtimeHours,
      status: tol.status, // Auto-update status according to check-in
    }));
  };

  // Modal Live Updates on CheckOut
  const handleModalCheckOutChange = (newOutTime: string) => {
    const hours = calculateHours(formData.checkIn || "", newOutTime);
    setFormData((prev) => ({
      ...prev,
      checkOut: newOutTime,
      workedHours: hours.workedHours,
      overtimeHours: hours.overtimeHours,
    }));
  };

  const setModalCheckInToNow = () => {
    const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(
      currentTime.getMinutes()
    ).padStart(2, "0")}`;
    handleModalCheckInChange(timeStr);
  };

  const setModalCheckOutToNow = () => {
    const timeStr = `${String(currentTime.getHours()).padStart(2, "0")}:${String(
      currentTime.getMinutes()
    ).padStart(2, "0")}`;
    handleModalCheckOutChange(timeStr);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Attendance & Timesheets
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time presence tracking, automated status derivation, and ±10 min tolerance window enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
            <Plus className="size-4" />
            <span>RECORD MANUAL PUNCH</span>
          </Button>
        </div>
      </div>

      {/* Live Punch & Shift Tracker Widget */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/20 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Live System Clock & Configurable Shift Policy */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                System Clock
              </span>
              <span className="text-sm font-extrabold font-mono text-foreground px-2.5 py-0.5 rounded-md bg-muted border border-border/80 tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                {currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Clock className="size-3.5 text-primary" />
                <span>Shift Start:</span>
                <input
                  type="time"
                  value={scheduledShiftTime}
                  onChange={(e) => setScheduledShiftTime(e.target.value || "09:00")}
                  className="h-6 px-1.5 py-0.5 rounded border border-border bg-background font-mono text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  title="Adjust scheduled shift start time to test different punch windows"
                />
              </div>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Allowed Window:
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">
                  {getToleranceWindow(scheduledShiftTime)} (±10 mins)
                </span>
              </span>
            </div>
          </div>

          {/* Right: Active Employee Selector & Dynamic Punch Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-semibold hidden sm:inline">
                Employee:
              </label>
              {canManageOthers ? (
                /* HR/Admin: full dropdown to manage any employee */
                <select
                  value={activePunchEmpId}
                  onChange={(e) => setActivePunchEmpId(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.jobPosition})
                    </option>
                  ))}
                </select>
              ) : (
                /* Regular employees: locked to their own identity */
                <div className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-xs font-semibold flex items-center gap-2 text-foreground">
                  <UserCheck className="size-3.5 text-primary" />
                  {currentUserEmployee ? `${currentUserEmployee.name} (${currentUserEmployee.jobPosition})` : currentUser.name}
                </div>
              )}
            </div>

            {/* Smart Check-In / Check-Out Controls */}
            {activeEmpRecordToday ? (
              activeEmpRecordToday.checkOut ? (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs px-3 py-1.5 font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Shift Done ({activeEmpRecordToday.workedHours} hrs)
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLiveCheckOut}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Update checkout punch with current time"
                  >
                    Re-punch Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 animate-pulse"
                  >
                    <Timer className="size-3.5" />
                    On Duty (In: {activeEmpRecordToday.checkIn})
                  </Badge>
                  <Button
                    size="sm"
                    onClick={handleLiveCheckOut}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs px-4 h-9 flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <LogOut className="size-4" />
                    <span>CHECK OUT NOW</span>
                  </Button>
                </div>
              )
            ) : (
              <Button
                size="sm"
                onClick={handleLiveCheckIn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs px-4 h-9 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <LogIn className="size-4" />
                <span>CHECK IN NOW</span>
              </Button>
            )}
          </div>
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

      {/* Attendance Table */}
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
              <th className="py-3 px-4 text-center">Tolerance Check</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedAttendance.map((rec) => {
              const tol = evaluateCheckInTolerance(rec.checkIn, scheduledShiftTime);
              // Dynamic status strictly derived from checkIn
              const effectiveStatus: AttendanceStatus = rec.checkIn ? tol.status : (rec.status || "Absent");

              return (
                <tr
                  key={rec.id}
                  onClick={() => handleOpenRecord(rec)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-mono text-muted-foreground">
                    {formatDate(rec.date)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                    {rec.employeeName}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                    {rec.checkIn || "—"}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-medium">
                    {rec.checkOut ? (
                      <span className="text-foreground">{rec.checkOut}</span>
                    ) : (
                      /* Only show Check Out button for own records or HR/Admin */
                      (canManageOthers || (currentUserEmployee && rec.employeeId === currentUserEmployee.id)) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowCheckOut(rec);
                          }}
                          className="border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[10px] h-6 px-2 font-bold"
                        >
                          <LogOut className="size-3 mr-1" />
                          Check Out
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                    {rec.workedHours > 0 ? `${rec.workedHours.toFixed(2)} hrs` : "0.00"}
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
                      variant={
                        effectiveStatus === "Present"
                          ? "success"
                          : effectiveStatus === "Late"
                          ? "warning"
                          : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {effectiveStatus}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        effectiveStatus === "Present"
                          ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
                          : effectiveStatus === "Late"
                          ? "text-amber-700 bg-amber-500/10 dark:text-amber-400"
                          : "text-rose-700 bg-rose-500/10 dark:text-rose-400"
                      }`}
                    >
                      {tol.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRecord(rec);
                      }}
                      className="text-primary hover:underline font-semibold text-xs cursor-pointer"
                    >
                      {(canManageOthers || (currentUserEmployee && rec.employeeId === currentUserEmployee.id)) ? "Audit" : "View"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isLoading && total > limit && (
        <div className="border-t border-border p-4 flex items-center justify-between bg-card text-xs mt-4 rounded-xl border shadow-xs">
          <span className="text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>Next</Button>
          </div>
        </div>
      )}

      {/* Attendance Form & Correction Modal */}
      {(() => {
        // Determine if this modal should be read-only
        const isModalReadOnly = !isCreate && !canManageOthers;
        return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isCreate ? "New Attendance Entry" : isModalReadOnly ? `Attendance / ${selectedRecord?.employeeName} (View Only)` : `Attendance / ${selectedRecord?.employeeName}`}
              </DialogTitle>
              {formData.status && (
                <Badge
                  variant={
                    formData.status === "Present"
                      ? "success"
                      : formData.status === "Late"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {formData.status}
                </Badge>
              )}
            </div>
            {isModalReadOnly && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>You are viewing an attendance record. Only HR Managers and Admins can edit past records.</span>
              </div>
            )}
            <DialogDescription>
              {isModalReadOnly ? "This record is read-only." : `Status dynamically updates according to check-in time against the ${scheduledShiftTime} shift window.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Employee</label>
              <select
                disabled={!isCreate || !canManageOthers}
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm disabled:opacity-60"
              >
                {(canManageOthers ? employees : employees.filter((emp) => emp.id === currentUserEmployee?.id)).map((emp) => (
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
                disabled={isModalReadOnly}
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            {/* Check In / Check Out Grid with "Now" shortcuts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-muted-foreground">Check In</label>
                  {!isModalReadOnly && (
                    <button
                      type="button"
                      onClick={setModalCheckInToNow}
                      className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                    >
                      Set to Now
                    </button>
                  )}
                </div>
                <Input
                  type="time"
                  disabled={isModalReadOnly}
                  value={formData.checkIn || ""}
                  onChange={(e) => handleModalCheckInChange(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-muted-foreground">Check Out</label>
                  {!isModalReadOnly && (
                    <button
                      type="button"
                      onClick={setModalCheckOutToNow}
                      className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                    >
                      Set to Now
                    </button>
                  )}
                </div>
                <Input
                  type="time"
                  disabled={isModalReadOnly}
                  value={formData.checkOut || ""}
                  onChange={(e) => handleModalCheckOutChange(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Live Tolerance Check Indicator */}
            {formData.checkIn && (
              <div className="p-2.5 rounded-lg border border-border bg-muted/40 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Allowed Grace Window:</span>
                  <span className="font-mono font-bold text-foreground">
                    {getToleranceWindow(scheduledShiftTime)}
                  </span>
                </div>
                {(() => {
                  const tol = evaluateCheckInTolerance(formData.checkIn, scheduledShiftTime);
                  return (
                    <div
                      className={`text-[11px] font-medium flex items-center gap-1.5 ${
                        tol.status === "Present"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {tol.status === "Present" ? (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="size-3.5 shrink-0" />
                      )}
                      <span>
                        Status: <strong>{tol.status}</strong> ({tol.label})
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Calculated Work Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Calculated Worked (Hours)</label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={isModalReadOnly}
                  value={formData.workedHours ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, workedHours: Number(e.target.value) })
                  }
                  className="font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Overtime (Hours)</label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={isModalReadOnly}
                  value={formData.overtimeHours ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, overtimeHours: Number(e.target.value) })
                  }
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Status (Derived from Check-in)</label>
              <select
                disabled={isModalReadOnly}
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as AttendanceStatus })
                }
                className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm font-medium disabled:opacity-60"
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">
                Audit Notes / Reason
              </label>
              <textarea
                disabled={isModalReadOnly}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                placeholder="e.g. System clock punch, traffic delay, approved overtime..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              {isModalReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isModalReadOnly && (
              <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground font-bold">
                {isCreate ? "Record Punch" : "Save Manual Edit"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
        );
      })()}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading attendance ledger...
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
