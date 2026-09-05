"use client";

import React, { useState, useEffect } from "react";
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from "@/lib/actions/schedules";
import { Clock, Plus, Edit, Trash2, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Schedule = any; // We'll infer from server response
const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("STANDARD");
  const [isActive, setIsActive] = useState(true);
  const [lines, setLines] = useState<any[]>([]);

  const { toast } = useToast();

  const loadSchedules = async () => {
    try {
      setIsLoading(true);
      const data = await getSchedules();
      setSchedules(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleOpenModal = (sched?: Schedule) => {
    if (sched) {
      setEditingSchedule(sched);
      setName(sched.name);
      setType(sched.type);
      setIsActive(sched.isActive);
      setLines(sched.lines || []);
    } else {
      setEditingSchedule(null);
      setName("");
      setType("STANDARD");
      setIsActive(true);
      // Default standard week
      setLines([
        { dayOfWeek: "MON", startTime: "09:00", endTime: "17:00", breakMinutes: 60 },
        { dayOfWeek: "TUE", startTime: "09:00", endTime: "17:00", breakMinutes: 60 },
        { dayOfWeek: "WED", startTime: "09:00", endTime: "17:00", breakMinutes: 60 },
        { dayOfWeek: "THU", startTime: "09:00", endTime: "17:00", breakMinutes: 60 },
        { dayOfWeek: "FRI", startTime: "09:00", endTime: "17:00", breakMinutes: 60 },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", type: "error" });
      return;
    }
    if (lines.length === 0) {
      toast({ title: "Validation Error", description: "At least one schedule line is required.", type: "error" });
      return;
    }

    try {
      let res;
      if (editingSchedule) {
        res = await updateSchedule(editingSchedule.id, { name, type, isActive, lines });
      } else {
        res = await createSchedule({ name, type, isActive, lines });
      }

      if (res.success) {
        toast({ title: "Success", description: "Schedule saved successfully.", type: "success" });
        setIsModalOpen(false);
        loadSchedules();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this schedule?")) return;
    try {
      const res = await deleteSchedule(id);
      if (res.success) {
        toast({ title: "Success", description: "Schedule deactivated.", type: "success" });
        loadSchedules();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { dayOfWeek: "MON", startTime: "09:00", endTime: "17:00", breakMinutes: 60 }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Working Schedules
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Configure default and shift-based weekly hours for attendance and payroll computation.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Create Schedule
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((sched) => (
            <div key={sched.id} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{sched.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs font-mono">{sched.type}</Badge>
                    {!sched.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(sched)}>
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => handleDelete(sched.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Weekly Hours
                  </div>
                  <span className="font-bold font-mono text-primary text-lg">{sched.totalWeeklyHours}h</span>
                </div>
                
                <div className="text-xs text-muted-foreground px-1 space-y-1 mt-4 border-t border-border/50 pt-3">
                  <p className="font-semibold text-foreground mb-2">Schedule Lines:</p>
                  {sched.lines?.map((line: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-0.5">
                      <span className="font-medium text-muted-foreground w-8">{line.dayOfWeek}</span>
                      <span>{line.startTime} - {line.endTime}</span>
                      <span className="text-muted-foreground">{line.breakMinutes}m break</span>
                    </div>
                  ))}
                  {(!sched.lines || sched.lines.length === 0) && (
                    <p className="text-muted-foreground italic flex items-center gap-1"><AlertCircle className="h-3 w-3" /> No lines configured</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Edit Working Schedule" : "Create Working Schedule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Schedule Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard 40h" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={type} 
                  onChange={e => setType(e.target.value)}
                >
                  <option value="STANDARD">Standard</option>
                  <option value="SHIFT">Shift</option>
                  <option value="FLEXIBLE">Flexible</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-gray-300 text-primary" />
              <label htmlFor="isActive" className="text-sm font-medium">Active Schedule</label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Schedule Lines</h4>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add Day
                </Button>
              </div>
              
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Day</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Start</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">End</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Break (min)</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="bg-card hover:bg-muted/50">
                        <td className="px-3 py-2">
                          <select 
                            className="w-full rounded border-input bg-transparent px-2 py-1"
                            value={line.dayOfWeek}
                            onChange={(e) => handleLineChange(idx, "dayOfWeek", e.target.value)}
                          >
                            {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            type="time" 
                            className="h-8" 
                            value={line.startTime} 
                            onChange={(e) => handleLineChange(idx, "startTime", e.target.value)} 
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            type="time" 
                            className="h-8" 
                            value={line.endTime} 
                            onChange={(e) => handleLineChange(idx, "endTime", e.target.value)} 
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input 
                            type="number" 
                            className="h-8 w-20" 
                            value={line.breakMinutes} 
                            onChange={(e) => handleLineChange(idx, "breakMinutes", Number(e.target.value))} 
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeLine(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No schedule lines. Add at least one day.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-primary">Save Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
