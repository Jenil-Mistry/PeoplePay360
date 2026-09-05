import React from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { employees, departments, workingSchedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { User, Mail, Briefcase, Building, Clock, CreditCard, Shield, Activity } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const [profile] = await db
    .select({
      empId: employees.empId,
      name: employees.name,
      email: employees.email,
      role: employees.role,
      jobPosition: employees.jobPosition,
      employeeType: employees.employeeType,
      bankAccountNumber: employees.bankAccountNumber,
      bankName: employees.bankName,
      isActive: employees.isActive,
      departmentName: departments.name,
      scheduleName: workingSchedules.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(workingSchedules, eq(employees.workingScheduleId, workingSchedules.id))
    .where(eq(employees.email, session.user.email!))
    .limit(1);

  if (!profile) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-muted-foreground">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Personal Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your personal information and account details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <div className="col-span-1">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col items-center text-center h-full">
            <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 text-3xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {profile.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{profile.jobPosition}</p>
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-6">
              <Shield className="size-3.5" />
              {profile.role.replace(/_/g, " ")}
            </div>

            <div className="w-full space-y-3 mt-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="size-3.5" /> Email</span>
                <span className="font-medium text-foreground truncate max-w-[120px]" title={profile.email}>{profile.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><User className="size-3.5" /> Employee ID</span>
                <span className="font-medium text-foreground">{profile.empId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="size-3.5" /> Status</span>
                {profile.isActive ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-medium">Inactive</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
              <Briefcase className="size-4 text-primary" /> Employment Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Department</p>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building className="size-4 text-muted-foreground" />
                  {profile.departmentName || "Not assigned"}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Employee Type</p>
                <p className="text-sm font-medium text-foreground">
                  {profile.employeeType.replace(/_/g, " ")}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Job Position</p>
                <p className="text-sm font-medium text-foreground">
                  {profile.jobPosition}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Working Schedule</p>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="size-4 text-muted-foreground" />
                  {profile.scheduleName || "Standard Schedule"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
              <CreditCard className="size-4 text-primary" /> Financial Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bank Name</p>
                <p className="text-sm font-medium text-foreground">
                  {profile.bankName || "Not provided"}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Account Number</p>
                <p className="text-sm font-medium text-foreground">
                  {profile.bankAccountNumber ? `•••• ${profile.bankAccountNumber.slice(-4)}` : "Not provided"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
