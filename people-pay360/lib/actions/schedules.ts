"use server";

import { db } from "@/lib/db";
import { workingSchedules, workingScheduleLines, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireWriteAccess, requireReadAccess } from "./auth-helpers";
import { calculateWeeklyHours } from "@/lib/schedule-utils";

export async function getSchedules() {
  try {
    await requireReadAccess("employees"); // Schedules are managed under employees module
    const schedules = await db.select().from(workingSchedules);
    const lines = await db.select().from(workingScheduleLines);

    // Group lines by schedule ID
    return schedules.map(sched => ({
      ...sched,
      lines: lines.filter(l => l.scheduleId === sched.id)
    }));
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    throw new Error("Unable to fetch schedules.");
  }
}

export async function createSchedule(data: {
  name: string;
  type: string;
  isActive?: boolean;
  lines: {
    dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
    startTime: string;
    endTime: string;
    breakMinutes: number;
  }[];
}) {
  try {
    await requireWriteAccess("employees");

    // 1. Calculate total weekly hours
    const totalWeeklyHours = calculateWeeklyHours(data.lines);

    // 2. Insert Schedule
    const [newSchedule] = await db.insert(workingSchedules).values({
      name: data.name,
      type: data.type,
      isActive: data.isActive !== false,
      totalWeeklyHours: totalWeeklyHours.toFixed(2),
    }).returning();

    // 3. Insert Lines
    if (data.lines.length > 0) {
      await db.insert(workingScheduleLines).values(
        data.lines.map(line => ({
          scheduleId: newSchedule.id,
          ...line
        }))
      );
    }

    revalidatePath("/schedules");
    revalidatePath("/employees");
    return { success: true, scheduleId: newSchedule.id };
  } catch (error: any) {
    console.error("Failed to create schedule:", error);
    return { success: false, error: error.message || "Failed to create schedule" };
  }
}

export async function updateSchedule(id: number, data: {
  name?: string;
  type?: string;
  isActive?: boolean;
  lines?: {
    id?: number;
    dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
    startTime: string;
    endTime: string;
    breakMinutes: number;
  }[];
}) {
  try {
    await requireWriteAccess("employees");

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.type) updates.type = data.type;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    if (data.lines) {
      const totalWeeklyHours = calculateWeeklyHours(data.lines);
      updates.totalWeeklyHours = totalWeeklyHours.toFixed(2);
      
      // Update lines: delete existing and re-insert to simplify
      await db.delete(workingScheduleLines).where(eq(workingScheduleLines.scheduleId, id));
      
      if (data.lines.length > 0) {
        await db.insert(workingScheduleLines).values(
          data.lines.map(line => ({
            scheduleId: id,
            dayOfWeek: line.dayOfWeek,
            startTime: line.startTime,
            endTime: line.endTime,
            breakMinutes: line.breakMinutes,
          }))
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(workingSchedules).set(updates).where(eq(workingSchedules.id, id));
    }

    revalidatePath("/schedules");
    revalidatePath("/employees");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update schedule:", error);
    return { success: false, error: error.message || "Failed to update schedule" };
  }
}

export async function deleteSchedule(id: number) {
  try {
    await requireWriteAccess("employees");

    // Check if in use
    const users = await db.select({ id: employees.id }).from(employees).where(eq(employees.workingScheduleId, id));
    if (users.length > 0) {
      return { success: false, error: "Cannot delete schedule as it is currently assigned to one or more employees." };
    }

    await db.update(workingSchedules).set({ isActive: false }).where(eq(workingSchedules.id, id));

    revalidatePath("/schedules");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete schedule:", error);
    return { success: false, error: error.message || "Failed to delete schedule" };
  }
}
