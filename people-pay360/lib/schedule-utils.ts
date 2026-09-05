import { WorkingSchedule, WorkingScheduleLine } from "@/lib/types";

/**
 * Calculates total weekly hours from an array of schedule lines.
 */
export function calculateWeeklyHours(lines: Pick<WorkingScheduleLine, "startTime" | "endTime" | "breakMinutes">[]): number {
  let totalMinutes = 0;

  for (const line of lines) {
    if (!line.startTime || !line.endTime) continue;
    const [startH, startM] = line.startTime.split(":").map(Number);
    const [endH, endM] = line.endTime.split(":").map(Number);

    let diff = (endH * 60 + endM) - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // handle overnight shifts if any

    const actualWorked = Math.max(0, diff - (line.breakMinutes || 0));
    totalMinutes += actualWorked;
  }

  return Number((totalMinutes / 60).toFixed(2));
}
