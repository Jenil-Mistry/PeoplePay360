"use server";

import { db } from "@/lib/db";
import { attendance, employees, workingSchedules, workingScheduleLines } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canAccessModule } from "@/lib/rbac";
import { getAuthenticatedUser, requireReadAccess } from "./auth-helpers";
import { hasWriteAccess, hasReadAccess } from "@/lib/rbac";

export async function getAttendanceRecords(filters?: {
  employeeId?: number | string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const user = await requireReadAccess("attendance_own");
    const canViewAll = canAccessModule(user.role, "attendance_all");

    let resolvedEmpId: number | undefined;
    if (filters?.employeeId) {
      if (typeof filters.employeeId === "number") {
        resolvedEmpId = filters.employeeId;
      } else {
        const [emp] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.empId, filters.employeeId));
        resolvedEmpId =
          emp?.id || parseInt(filters.employeeId.replace(/\D/g, ""), 10);
      }
    }

    const conditions = [];

    if (resolvedEmpId) {
      conditions.push(eq(attendance.employeeId, resolvedEmpId));
    } else if (!canViewAll) {
      conditions.push(eq(attendance.employeeId, user.employeeDbId));
    }
    
    // RBAC Enforce
    if (!canViewAll && resolvedEmpId && resolvedEmpId !== user.employeeDbId) {
      throw new Error("Forbidden: Insufficient permissions");
    }
    if (filters?.date) {
      conditions.push(eq(attendance.date, filters.date));
    }
    if (filters?.startDate) {
      conditions.push(gte(attendance.date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(attendance.date, filters.endDate));
    }

    // --- AUTO-CHECKOUT SWEEP ---
    try {
      const staleRecords = await db
        .select({ id: attendance.id, checkIn: attendance.checkIn })
        .from(attendance)
        .where(isNull(attendance.checkOut));
        
      const nowTs = Date.now();
      for (const record of staleRecords) {
        if (record.checkIn) {
          const inDate = record.checkIn instanceof Date ? record.checkIn : new Date(record.checkIn);
          if (nowTs - inDate.getTime() > 12 * 60 * 60 * 1000) {
            const outDate = new Date(inDate.getTime() + 12 * 60 * 60 * 1000);
            await db.update(attendance).set({
              checkOut: outDate,
              workedHours: "12.00",
              isOvertime: true,
              notes: "Auto-checked out after 12 hours maximum shift.",
            }).where(eq(attendance.id, record.id));
          }
        }
      }
    } catch (e) {
      console.error("Auto-checkout sweep failed:", e);
    }

    const query = db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        employeeName: employees.name,
        empId: employees.empId,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workedHours: attendance.workedHours,
        status: attendance.status,
        isOvertime: attendance.isOvertime,
        isManualCorrection: attendance.isManualCorrection,
        correctedBy: attendance.correctedBy,
        notes: attendance.notes,
        createdAt: attendance.createdAt,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .orderBy(desc(attendance.date), desc(attendance.id));

    let totalCount = 0;
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(attendance);
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [{ count }] = await countQuery;
    totalCount = Number(count);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const limit = filters?.limit || 50;
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    query.limit(limit).offset(offset);

    const data = await query;
    return { data, total: totalCount, page, limit };
  } catch (error) {
    console.error("Failed to get attendance records:", error);
    throw new Error("Unable to fetch attendance records.");
  }
}

export async function logAttendance(data: {
  employeeId: number | string;
  date: string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  workedHours?: number | string;
  status?:
    | "PRESENT"
    | "LATE"
    | "ABSENT"
    | "ON_LEAVE"
    | "HALF_DAY"
    | "Present"
    | "Late"
    | "Absent";
  isManualEdit?: boolean;
  notes?: string;
}) {
  try {
    const currentUser = await getAuthenticatedUser();

    let resolvedEmpId: number;
    if (typeof data.employeeId === "number") {
      resolvedEmpId = data.employeeId;
    } else {
      const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.empId, data.employeeId));
      if (!emp) return { success: false, error: "Employee not found" };
      resolvedEmpId = emp.id;
    }

    // Enforce self-only for non-HR/Admin users
    if (resolvedEmpId !== currentUser.employeeDbId && !hasWriteAccess(currentUser.role, "attendance_correct_others")) {
      return { success: false, error: "You can only record your own attendance." };
    }

    // Parse checkIn and checkOut
    let inDate: Date | null = null;
    let outDate: Date | null = null;

    if (data.checkIn) {
      if (data.checkIn instanceof Date) {
        inDate = data.checkIn;
      } else if (data.checkIn.includes(":")) {
        inDate = new Date(
          `${data.date}T${data.checkIn.length === 5 ? data.checkIn + ":00" : data.checkIn}`,
        );
      } else {
        inDate = new Date(data.checkIn);
      }
    }

    if (data.checkOut) {
      if (data.checkOut instanceof Date) {
        outDate = data.checkOut;
      } else if (data.checkOut.includes(":")) {
        outDate = new Date(
          `${data.date}T${data.checkOut.length === 5 ? data.checkOut + ":00" : data.checkOut}`,
        );
      } else {
        outDate = new Date(data.checkOut);
      }
    }

    let workedHours = data.workedHours
      ? typeof data.workedHours === "number"
        ? data.workedHours.toFixed(2)
        : String(data.workedHours)
      : "0.00";
    let isOvertime = false;

    if (inDate && outDate) {
      const diffMs = outDate.getTime() - inDate.getTime();
      const hours = Math.max(0, diffMs / (1000 * 60 * 60));
      workedHours = hours.toFixed(2);
      if (hours > 8) isOvertime = true;
    }

    // Resolve scheduled start time from the employee's working schedule
    let scheduledStartMinutes = 9 * 60; // default 09:00
    const [empRecord] = await db.select({ workingScheduleId: employees.workingScheduleId }).from(employees).where(eq(employees.id, resolvedEmpId));
    if (empRecord?.workingScheduleId) {
      const dayOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(data.date).getDay()];
      const [scheduleLine] = await db
        .select({ startTime: workingScheduleLines.startTime })
        .from(workingScheduleLines)
        .where(and(eq(workingScheduleLines.scheduleId, empRecord.workingScheduleId), eq(workingScheduleLines.dayOfWeek, dayOfWeek as any)))
        .limit(1);
      if (scheduleLine?.startTime) {
        const [sh, sm] = scheduleLine.startTime.split(":").map(Number);
        if (!isNaN(sh) && !isNaN(sm)) scheduledStartMinutes = sh * 60 + sm;
      }
    }

    // Auto-calculate status from checkIn time against scheduled shift start (+10m tolerance)
    let dbStatus: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY" = "PRESENT";
    if (data.checkIn) {
      const timeStr =
        typeof data.checkIn === "string" && data.checkIn.includes(":")
          ? data.checkIn
          : inDate
            ? `${String(inDate.getHours()).padStart(2, "0")}:${String(inDate.getMinutes()).padStart(2, "0")}`
            : "09:00";
      const [inH, inM] = timeStr.split(":").map(Number);
      if (!isNaN(inH) && !isNaN(inM)) {
        const diffMinutes = (inH * 60 + inM) - scheduledStartMinutes;
        dbStatus = diffMinutes > 10 ? "LATE" : "PRESENT";
      }
    } else {
      dbStatus = "ABSENT";
    }

    const statusMap: Record<
      string,
      "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY"
    > = {
      Present: "PRESENT",
      PRESENT: "PRESENT",
      Late: "LATE",
      LATE: "LATE",
      Absent: "ABSENT",
      ABSENT: "ABSENT",
    };
    if (data.status && statusMap[data.status]) {
      dbStatus = statusMap[data.status];
    }

    // 1. Check if record for (employee, date) already exists
    const existingRecords = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, resolvedEmpId),
          eq(attendance.date, data.date),
        ),
      );

    if (existingRecords.length > 0) {
      const primary = existingRecords[0];

      // Purge any accidental duplicates from past operations
      if (existingRecords.length > 1) {
        for (let i = 1; i < existingRecords.length; i++) {
          await db
            .delete(attendance)
            .where(eq(attendance.id, existingRecords[i].id));
        }
      }

      const [updated] = await db
        .update(attendance)
        .set({
          checkIn: inDate || primary.checkIn,
          checkOut: outDate || primary.checkOut,
          workedHours:
            inDate && outDate
              ? workedHours
              : data.workedHours
                ? typeof data.workedHours === "number"
                  ? data.workedHours.toFixed(2)
                  : String(data.workedHours)
                : primary.workedHours,
          status: dbStatus,
          isOvertime,
          isManualCorrection: data.isManualEdit ?? primary.isManualCorrection,
          notes: data.notes || primary.notes,
        })
        .where(eq(attendance.id, primary.id))
        .returning();

      try {
        revalidatePath("/attendance");
        revalidatePath("/dashboard");
      } catch {}

      return { success: true, record: updated };
    }

    const [record] = await db
      .insert(attendance)
      .values({
        employeeId: resolvedEmpId,
        date: data.date,
        checkIn: inDate,
        checkOut: outDate,
        workedHours,
        status: dbStatus,
        isOvertime,
        isManualCorrection: data.isManualEdit || false,
        notes: data.notes,
      })
      .returning();

    try {
      revalidatePath("/attendance");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, record };
  } catch (error: any) {
    console.error("Failed to log attendance:", error);
    return {
      success: false,
      error: error.message || "Failed to log attendance",
    };
  }
}

export async function correctAttendance(
  id: number | string,
  data: {
    checkIn?: Date | string;
    checkOut?: Date | string;
    workedHours?: number | string;
    status?:
      | "PRESENT"
      | "LATE"
      | "ABSENT"
      | "ON_LEAVE"
      | "HALF_DAY"
      | "Present"
      | "Late"
      | "Absent";
    notes?: string;
    correctedBy?: number;
  },
) {
  try {
    const currentUser = await getAuthenticatedUser();

    // Only HR and Admin can correct others' attendance
    if (!hasWriteAccess(currentUser.role, "attendance_correct_others")) {
      return { success: false, error: "Forbidden: Insufficient permissions to correct attendance." };
    }

    const rawId = typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const updates: Record<string, any> = {
      isManualCorrection: true,
      correctedBy: currentUser.employeeDbId,
    };

    if (data.checkIn) {
      updates.checkIn =
        data.checkIn instanceof Date ? data.checkIn : new Date(data.checkIn);
    }
    if (data.checkOut) {
      updates.checkOut =
        data.checkOut instanceof Date ? data.checkOut : new Date(data.checkOut);
    }
    if (data.workedHours !== undefined) {
      updates.workedHours =
        typeof data.workedHours === "number"
          ? data.workedHours.toFixed(2)
          : String(data.workedHours);
    }
    if (data.status) {
      const statusMap: Record<string, any> = {
        Present: "PRESENT",
        PRESENT: "PRESENT",
        Late: "LATE",
        LATE: "LATE",
        Absent: "ABSENT",
        ABSENT: "ABSENT",
      };
      updates.status = statusMap[data.status] || "PRESENT";
    }
    if (data.notes) updates.notes = data.notes;
    if (data.correctedBy) updates.correctedBy = data.correctedBy;

    const [updated] = await db
      .update(attendance)
      .set(updates)
      .where(eq(attendance.id, rawId))
      .returning();

    try {
      revalidatePath("/attendance");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, record: updated };
  } catch (error: any) {
    console.error(`Failed to correct attendance ${id}:`, error);
    return {
      success: false,
      error: error.message || "Failed to correct attendance",
    };
  }
}

export async function getAttendanceHealthMetrics(
  startDate?: string,
  endDate?: string,
) {
  try {
    const user = await requireReadAccess("attendance_own");
    const canViewAll = canAccessModule(user.role, "attendance_all");

    const conditions = [];
    if (!canViewAll) {
      conditions.push(eq(attendance.employeeId, user.employeeDbId));
    }
    if (startDate) conditions.push(gte(attendance.date, startDate));
    if (endDate) conditions.push(lte(attendance.date, endDate));

    const records = await db
      .select({ status: attendance.status })
      .from(attendance)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const counts = {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      ON_LEAVE: 0,
      HALF_DAY: 0,
      TOTAL: records.length,
    };

    for (const r of records) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }

    const attendanceRate =
      counts.TOTAL > 0
        ? Math.round(((counts.PRESENT + counts.LATE) / counts.TOTAL) * 100)
        : 100;

    return { counts, attendanceRate };
  } catch (error) {
    console.error("Failed to get attendance health metrics:", error);
    return {
      counts: {
        PRESENT: 0,
        LATE: 0,
        ABSENT: 0,
        ON_LEAVE: 0,
        HALF_DAY: 0,
        TOTAL: 0,
      },
      attendanceRate: 100,
    };
  }
}

/**
 * High-level Check-In action.
 * Compares punch time against scheduled shift start (default 09:00).
 * Allowed window is +- 10 minutes:
 * - Within +- 10 mins (08:50 - 09:10): Status PRESENT
 * - After +10 mins (> 09:10): Status LATE
 */
export async function recordCheckIn(data: {
  employeeId: number | string;
  date?: string;
  checkInTime?: string;
  notes?: string;
}) {
  const dateStr = data.date || new Date().toISOString().split("T")[0];
  const now = new Date();
  const timeStr =
    data.checkInTime ||
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let scheduledStartMinutes = 9 * 60; // fallback only if no schedule exists
  const rawId = typeof data.employeeId === "number" ? data.employeeId : parseInt(data.employeeId.toString().replace(/\D/g, ""), 10);
  
  const [empRecord] = await db.select({ workingScheduleId: employees.workingScheduleId }).from(employees).where(eq(employees.id, rawId));
  
  if (empRecord?.workingScheduleId) {
    const dayOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(dateStr).getDay()];
    const [scheduleLine] = await db
      .select({ startTime: workingScheduleLines.startTime })
      .from(workingScheduleLines)
      .where(and(eq(workingScheduleLines.scheduleId, empRecord.workingScheduleId), eq(workingScheduleLines.dayOfWeek, dayOfWeek as any)))
      .limit(1);
    if (scheduleLine?.startTime) {
      const [sh, sm] = scheduleLine.startTime.split(":").map(Number);
      if (!isNaN(sh) && !isNaN(sm)) scheduledStartMinutes = sh * 60 + sm;
    }
  }

  // Calculate tolerance against scheduled time (+- 10 minutes)
  const [inH, inM] = timeStr.split(":").map(Number);
  const diffMinutes = inH * 60 + inM - scheduledStartMinutes;

  // Late if > +10 minutes
  let calculatedStatus: "PRESENT" | "LATE" = "PRESENT";
  let toleranceMessage = "Within allowed ±10 min tolerance window.";
  if (diffMinutes > 10) {
    calculatedStatus = "LATE";
    toleranceMessage = `Late by ${diffMinutes} mins (exceeds +10m grace period).`;
  } else if (diffMinutes < -10) {
    calculatedStatus = "PRESENT";
    toleranceMessage = `Early by ${Math.abs(diffMinutes)} mins.`;
  } else {
    calculatedStatus = "PRESENT";
    toleranceMessage = "On time (within allowed ±10 min tolerance window).";
  }

  const result = await logAttendance({
    employeeId: data.employeeId,
    date: dateStr,
    checkIn: timeStr,
    status: calculatedStatus,
    notes: data.notes || `Punch in at ${timeStr}. ${toleranceMessage}`,
    isManualEdit: false,
  });

  return {
    ...result,
    status: calculatedStatus,
    diffMinutes,
    toleranceMessage,
    timeStr,
  };
}

/**
 * High-level Check-Out action.
 * Updates checkout timestamp, calculates exact worked hours,
 * and sets overtime flag if workedHours > 8.0.
 */
export async function recordCheckOut(data: {
  recordId?: number | string;
  employeeId?: number | string;
  date?: string;
  checkOutTime?: string;
  notes?: string;
}) {
  const currentUser = await getAuthenticatedUser();
  const dateStr = data.date || new Date().toISOString().split("T")[0];
  const now = new Date();
  const outTimeStr =
    data.checkOutTime ||
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Find record
  let targetId = data.recordId;
  if (!targetId && data.employeeId) {
    const res = await getAttendanceRecords({
      employeeId: data.employeeId,
      date: dateStr,
    });
    const records = res.data;
    if (records.length > 0) {
      targetId = records[0].id;
    }
  }

  if (!targetId) {
    return {
      success: false,
      error: "No active check-in found for this date. Please punch in first.",
    };
  }

  const rawId =
    typeof targetId === "string"
      ? parseInt(targetId.replace(/\D/g, ""), 10)
      : targetId;
  const [existing] = await db
    .select()
    .from(attendance)
    .where(eq(attendance.id, rawId));

  // Enforce self-only checkout for non-HR/Admin users
  if (existing && existing.employeeId !== currentUser.employeeDbId && !hasWriteAccess(currentUser.role, "attendance_correct_others")) {
    return { success: false, error: "You can only check out your own attendance." };
  }

  let workedHours = "0.00";
  let isOvertime = false;
  let finalOutDate: Date | null = null;
  if (existing?.checkIn) {
    let inH = 0,
      inM = 0;
    if (existing.checkIn instanceof Date) {
      inH = existing.checkIn.getHours();
      inM = existing.checkIn.getMinutes();
    } else if (typeof existing.checkIn === "string") {
      const m = (existing.checkIn as string).match(/(\d{2}):(\d{2})/);
      if (m) {
        inH = parseInt(m[1], 10);
        inM = parseInt(m[2], 10);
      }
    }
    const [outH, outM] = outTimeStr.split(":").map(Number);
    let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight shift
    
    // Cap shift at 12 hours (720 minutes)
    let capped = false;
    if (diffMinutes > 720) {
      diffMinutes = 720;
      capped = true;
    }
    
    // Fetch schedule for break deduction and overtime baseline
    let breakHours = 0;
    let expectedWorkedHours = 8;
    const [empRecord] = await db.select({ workingScheduleId: employees.workingScheduleId }).from(employees).where(eq(employees.id, existing.employeeId));
    if (empRecord?.workingScheduleId) {
      const dayOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(dateStr).getDay()];
      const [scheduleLine] = await db
        .select()
        .from(workingScheduleLines)
        .where(and(eq(workingScheduleLines.scheduleId, empRecord.workingScheduleId), eq(workingScheduleLines.dayOfWeek, dayOfWeek as any)))
        .limit(1);
      
      if (scheduleLine) {
        breakHours = scheduleLine.breakMinutes / 60;
        const [shH, shM] = scheduleLine.startTime.split(":").map(Number);
        const [ehH, ehM] = scheduleLine.endTime.split(":").map(Number);
        let shiftMins = (ehH * 60 + ehM) - (shH * 60 + shM);
        if (shiftMins < 0) shiftMins += 24 * 60;
        expectedWorkedHours = Math.max(0, (shiftMins / 60) - breakHours);
      }
    }

    const hours = Math.max(0, (diffMinutes / 60) - breakHours);
    workedHours = hours.toFixed(2);
    // Overtime is any time exceeding the expected work hours for that specific schedule day
    if (hours > expectedWorkedHours) isOvertime = true;

    if (capped) {
      if (existing.checkIn instanceof Date) {
        finalOutDate = new Date(existing.checkIn.getTime() + 12 * 60 * 60 * 1000);
      } else {
        const baseDate = new Date(`${dateStr}T${String(inH).padStart(2, "0")}:${String(inM).padStart(2, "0")}:00`);
        finalOutDate = new Date(baseDate.getTime() + 12 * 60 * 60 * 1000);
      }
    }
  }

  const outDate = finalOutDate || new Date(`${dateStr}T${outTimeStr}:00`);

  const [updated] = await db
    .update(attendance)
    .set({
      checkOut: outDate,
      workedHours,
      isOvertime,
      notes:
        data.notes ||
        existing?.notes ||
        `Checked out at ${outTimeStr}. Worked ${workedHours} hrs.`,
    })
    .where(eq(attendance.id, rawId))
    .returning();

  try {
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
  } catch {}

  return {
    success: true,
    record: updated,
    workedHours: parseFloat(workedHours),
    isOvertime,
    timeStr: outTimeStr,
  };
}
