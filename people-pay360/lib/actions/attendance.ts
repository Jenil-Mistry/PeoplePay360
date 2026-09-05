"use server";

import { db } from "@/lib/db";
import { attendance, employees, workingSchedules } from "@/lib/db/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAttendanceRecords(filters?: {
  employeeId?: number | string;
  date?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    let resolvedEmpId: number | undefined;
    if (filters?.employeeId) {
      if (typeof filters.employeeId === "number") {
        resolvedEmpId = filters.employeeId;
      } else {
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.empId, filters.employeeId));
        resolvedEmpId = emp?.id || parseInt(filters.employeeId.replace(/\D/g, ""), 10);
      }
    }

    const conditions = [];

    if (resolvedEmpId) {
      conditions.push(eq(attendance.employeeId, resolvedEmpId));
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

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
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
  status?: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY" | "Present" | "Late" | "Absent";
  isManualEdit?: boolean;
  notes?: string;
}) {
  try {
    let resolvedEmpId: number;
    if (typeof data.employeeId === "number") {
      resolvedEmpId = data.employeeId;
    } else {
      const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.empId, data.employeeId));
      resolvedEmpId = emp?.id || parseInt(data.employeeId.replace(/\D/g, ""), 10) || 1;
    }

    // Parse checkIn and checkOut
    let inDate: Date | null = null;
    let outDate: Date | null = null;

    if (data.checkIn) {
      if (data.checkIn instanceof Date) {
        inDate = data.checkIn;
      } else if (data.checkIn.includes(":")) {
        inDate = new Date(`${data.date}T${data.checkIn.length === 5 ? data.checkIn + ":00" : data.checkIn}Z`);
      } else {
        inDate = new Date(data.checkIn);
      }
    }

    if (data.checkOut) {
      if (data.checkOut instanceof Date) {
        outDate = data.checkOut;
      } else if (data.checkOut.includes(":")) {
        outDate = new Date(`${data.date}T${data.checkOut.length === 5 ? data.checkOut + ":00" : data.checkOut}Z`);
      } else {
        outDate = new Date(data.checkOut);
      }
    }

    let workedHours = data.workedHours ? (typeof data.workedHours === "number" ? data.workedHours.toFixed(2) : String(data.workedHours)) : "0.00";
    let isOvertime = false;

    if (inDate && outDate) {
      const diffMs = outDate.getTime() - inDate.getTime();
      const hours = Math.max(0, diffMs / (1000 * 60 * 60));
      workedHours = hours.toFixed(2);
      if (hours > 8) isOvertime = true;
    }

    const statusMap: Record<string, "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY"> = {
      Present: "PRESENT",
      PRESENT: "PRESENT",
      Late: "LATE",
      LATE: "LATE",
      Absent: "ABSENT",
      ABSENT: "ABSENT",
    };
    const dbStatus = (data.status ? statusMap[data.status] : "PRESENT") || "PRESENT";

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
    return { success: false, error: error.message || "Failed to log attendance" };
  }
}

export async function correctAttendance(
  id: number | string,
  data: {
    checkIn?: Date | string;
    checkOut?: Date | string;
    workedHours?: number | string;
    status?: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "HALF_DAY" | "Present" | "Late" | "Absent";
    notes?: string;
    correctedBy?: number;
  }
) {
  try {
    const rawId = typeof id === "string" ? parseInt(id.replace(/\D/g, ""), 10) : id;

    const updates: Record<string, any> = {
      isManualCorrection: true,
    };

    if (data.checkIn) {
      updates.checkIn = data.checkIn instanceof Date ? data.checkIn : new Date(data.checkIn);
    }
    if (data.checkOut) {
      updates.checkOut = data.checkOut instanceof Date ? data.checkOut : new Date(data.checkOut);
    }
    if (data.workedHours !== undefined) {
      updates.workedHours = typeof data.workedHours === "number" ? data.workedHours.toFixed(2) : String(data.workedHours);
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
    return { success: false, error: error.message || "Failed to correct attendance" };
  }
}

export async function getAttendanceHealthMetrics(startDate?: string, endDate?: string) {
  try {
    const conditions = [];
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

    const attendanceRate = counts.TOTAL > 0 ? Math.round(((counts.PRESENT + counts.LATE) / counts.TOTAL) * 100) : 100;

    return { counts, attendanceRate };
  } catch (error) {
    console.error("Failed to get attendance health metrics:", error);
    return { counts: { PRESENT: 0, LATE: 0, ABSENT: 0, ON_LEAVE: 0, HALF_DAY: 0, TOTAL: 0 }, attendanceRate: 100 };
  }
}
