"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  UserCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { TimeOffRequest, RequestStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export default function TimeOffRequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading requests...</div>}>
      <TimeOffRequestsContent />
    </Suspense>
  );
}

function TimeOffRequestsContent() {
  const searchParams = useSearchParams();
  const filterEmployee = searchParams.get("employee");

  const { timeOffRequests, employees, timeOffTypes, allocations, addTimeOffRequest, updateTimeOffRequestStatus } = useAppStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState(filterEmployee || "");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreate, setIsCreate] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<TimeOffRequest>>({});

  const filteredRequests = useMemo(() => {
    return timeOffRequests.filter((r) => {
      const matchesSearch =
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.typeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [timeOffRequests, searchQuery, statusFilter]);

  const handleOpenRequest = (r: TimeOffRequest) => {
    setSelectedRequest(r);
    setFormData(r);
    setIsCreate(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRequest(null);
    setFormData({
      employeeId: employees[0]?.id || "",
      employeeName: employees[0]?.name || "",
      typeId: timeOffTypes[0]?.id || "",
      typeName: timeOffTypes[0]?.name || "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      durationDays: 1,
      status: "To Approve",
      reason: "",
    });
    setIsCreate(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const emp = employees.find((e) => e.id === formData.employeeId);
    const type = timeOffTypes.find((t) => t.id === formData.typeId);

    if (isCreate) {
      addTimeOffRequest({
        ...formData,
        employeeName: emp?.name || "",
        typeName: type?.name || "",
      } as Omit<TimeOffRequest, "id">);
      toast({ title: "Request Submitted", description: "Leave request submitted for approval.", type: "success" });
    }

    setIsModalOpen(false);
  };

  const handleApprove = (id: string) => {
    updateTimeOffRequestStatus(id, "Approved");
    toast({ title: "Request Approved", description: "Leave balance automatically deducted.", type: "success" });
    setIsModalOpen(false);
  };

  const handleRefuse = (id: string) => {
    updateTimeOffRequestStatus(id, "Refused");
    toast({ title: "Request Refused", description: "Time off rejected.", type: "error" });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Time Off Requests</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit, review, and approve employee leave requests. Approvals automatically reduce allocated balances.
          </p>
        </div>

        <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
          <Plus className="size-4" />
          <span>NEW REQUEST</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests by employee or leave type..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          {["All", "To Approve", "Approved", "Refused"].map((st) => (
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

      {/* Requests Table (Matches Excalidraw Screen 3) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
            <tr>
              <th className="py-3 px-4 text-left">Employee</th>
              <th className="py-3 px-4 text-left">Leave Type</th>
              <th className="py-3 px-4 text-left">Start Date</th>
              <th className="py-3 px-4 text-left">End Date</th>
              <th className="py-3 px-4 text-center">Duration</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRequests.map((r) => (
              <tr
                key={r.id}
                onClick={() => handleOpenRequest(r)}
                className="hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-primary transition-colors">
                  {r.employeeName}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant="outline" className="text-[10px]">
                    {r.typeName}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-muted-foreground font-mono">{formatDate(r.startDate)}</td>
                <td className="py-3.5 px-4 text-muted-foreground font-mono">{formatDate(r.endDate)}</td>
                <td className="py-3.5 px-4 text-center font-bold font-mono text-foreground">
                  {r.durationDays} {r.durationDays > 1 ? "Days" : "Day"}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <Badge
                    variant={r.status === "Approved" ? "success" : r.status === "To Approve" ? "warning" : "destructive"}
                    className="text-[10px]"
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="text-primary hover:underline font-semibold">Review</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Request Modal (Matches Excalidraw Screen 3 Form: Approve / Refuse) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setIsModalOpen(false)}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isCreate ? "New Time Off Request" : `Time Off Request / ${selectedRequest?.employeeName}`}
              </DialogTitle>
              {formData.status && (
                <Badge variant={formData.status === "Approved" ? "success" : formData.status === "To Approve" ? "warning" : "destructive"}>
                  {formData.status}
                </Badge>
              )}
            </div>
            <DialogDescription>
              Review leave details, allocation source, and approve or refuse this submission.
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
              <label className="font-semibold text-muted-foreground">Time Off Type</label>
              <select
                disabled={!isCreate}
                value={formData.typeId}
                onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm disabled:opacity-60"
              >
                {timeOffTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Start Date</label>
                <Input
                  disabled={!isCreate}
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">End Date</label>
                <Input
                  disabled={!isCreate}
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Duration (Days)</label>
              <Input
                disabled={!isCreate}
                type="number"
                value={formData.durationDays || 1}
                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                className="font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Reason for Leave</label>
              <textarea
                disabled={!isCreate}
                value={formData.reason || ""}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-75"
                placeholder="e.g. Family vacation, doctor appointment, personal errand..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {isCreate ? (
              <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground ml-auto">
                Submit Request
              </Button>
            ) : selectedRequest?.status === "To Approve" ? (
              <div className="flex items-center justify-between w-full">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRefuse(selectedRequest.id)}
                >
                  <XCircle className="size-4" />
                  Refuse
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => handleApprove(selectedRequest.id)}
                >
                  <CheckCircle2 className="size-4" />
                  Approve Request
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsModalOpen(false)} className="ml-auto">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
