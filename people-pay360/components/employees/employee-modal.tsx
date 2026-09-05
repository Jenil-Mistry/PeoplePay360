"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  FileText,
  Clock,
  CalendarDays,
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  UserCheck,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Employee } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface EmployeeModalProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreate?: boolean;
}

export function EmployeeModal({ employee, open, onOpenChange, isCreate = false }: EmployeeModalProps) {
  const { updateEmployee, addEmployee, getEmployeeSmartCounts } = useAppStore();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(isCreate);
  const [formData, setFormData] = useState<Partial<Employee>>(
    employee || {
      name: "",
      workEmail: "",
      phone: "",
      jobPosition: "",
      department: "Engineering",
      company: "PeoplePay360 Technologies Pvt Ltd",
      workLocation: "Mumbai",
      status: "Active",
      scheduleId: "SCH-1",
      bankDetails: {
        bankName: "HDFC Bank",
        accountNumber: "",
        ifscCode: "HDFC0000123",
      },
    }
  );

  React.useEffect(() => {
    if (employee) {
      setFormData(employee);
      setIsEditing(isCreate);
    }
  }, [employee, isCreate]);

  if (!open) return null;

  const smartCounts = employee ? getEmployeeSmartCounts(employee.id) : { contractsCount: 0, attendanceCount: 0, timeOffCount: 0 };

  const handleSave = () => {
    if (!formData.name || !formData.workEmail) {
      toast({ title: "Validation Error", description: "Name and work email are required.", type: "error" });
      return;
    }

    if (isCreate) {
      addEmployee(formData as Omit<Employee, "id">);
      toast({ title: "Employee Created", description: `${formData.name} added successfully.`, type: "success" });
    } else if (employee) {
      updateEmployee(employee.id, formData);
      toast({ title: "Employee Updated", description: "Profile saved successfully.", type: "success" });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onClose={() => onOpenChange(false)}>
        {/* Header with Title and Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {isCreate ? "New Employee Record" : employee?.name}
              </h2>
              <Badge variant={formData.status === "Active" ? "success" : "secondary"}>
                ● {formData.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formData.jobPosition || "Position pending"} • {formData.department}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isCreate && (
              <Button
                variant={isEditing ? "outline" : "secondary"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            )}
            {isEditing && (
              <Button size="sm" onClick={handleSave} className="bg-primary text-primary-foreground">
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Smart Buttons Row (as strictly required by Excalidraw & PDF Section B2) */}
        {!isCreate && employee && (
          <div className="flex flex-wrap items-center gap-2 py-3 border-b border-border bg-muted/20 -mx-6 px-6">
            <Link href={`/contracts?employee=${encodeURIComponent(employee.name)}`}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted transition-colors cursor-pointer text-xs group">
                <FileText className="size-4 text-primary" />
                <span className="font-semibold text-foreground">Contracts</span>
                <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center font-mono">
                  {smartCounts.contractsCount}
                </span>
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link href={`/attendance?employee=${encodeURIComponent(employee.name)}`}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted transition-colors cursor-pointer text-xs group">
                <Clock className="size-4 text-emerald-600" />
                <span className="font-semibold text-foreground">Attendance</span>
                <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[11px] flex items-center justify-center font-mono">
                  {smartCounts.attendanceCount}
                </span>
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link href={`/time-off/requests?employee=${encodeURIComponent(employee.name)}`}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-muted transition-colors cursor-pointer text-xs group">
                <CalendarDays className="size-4 text-blue-600" />
                <span className="font-semibold text-foreground">Time Off</span>
                <span className="size-5 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[11px] flex items-center justify-center font-mono">
                  {smartCounts.timeOffCount}
                </span>
                <ExternalLink className="size-3 text-muted-foreground group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        )}

        {/* Tabbed Profile Content: Work Information & Private Information */}
        <div className="mt-4">
          <Tabs defaultValue="work">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="work">Work Information</TabsTrigger>
              <TabsTrigger value="private">Private & Bank Details</TabsTrigger>
            </TabsList>

            {/* Tab 1: Work Information */}
            <TabsContent value="work" className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aarav Mehta"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Job Position</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.jobPosition || ""}
                    onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })}
                    placeholder="e.g. Payroll Specialist"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Department</label>
                  <select
                    disabled={!isEditing}
                    value={formData.department || "Engineering"}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm disabled:opacity-50"
                  >
                    <option value="Finance">Finance</option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                    <option value="Management">Management</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Manager</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.managerName || ""}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="e.g. Priya Nair"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Working Schedule</label>
                  <Input disabled value="Standard 40 Hours / Week" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Work Location</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.workLocation || ""}
                    onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                    placeholder="e.g. Mumbai"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Private Information & Bank Account */}
            <TabsContent value="private" className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Work Email</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.workEmail || ""}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    placeholder="name@oxp.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Bank Name</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.bankDetails?.bankName || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: e.target.value, accountNumber: formData.bankDetails?.accountNumber || "", ifscCode: formData.bankDetails?.ifscCode || "" },
                      })
                    }
                    placeholder="e.g. HDFC Bank"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Bank Account Number</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.bankDetails?.accountNumber || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: formData.bankDetails?.bankName || "", accountNumber: e.target.value, ifscCode: formData.bankDetails?.ifscCode || "" },
                      })
                    }
                    placeholder="5010023458921"
                    className={!formData.bankDetails?.accountNumber ? "border-amber-500/50 bg-amber-50/10" : ""}
                  />
                  {!formData.bankDetails?.accountNumber && (
                    <p className="text-[10px] text-amber-600 font-medium">Missing bank details triggers Payrun warnings!</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">IFSC Code</label>
                  <Input
                    disabled={!isEditing}
                    value={formData.bankDetails?.ifscCode || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankName: formData.bankDetails?.bankName || "", accountNumber: formData.bankDetails?.accountNumber || "", ifscCode: e.target.value },
                      })
                    }
                    placeholder="HDFC0000123"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
