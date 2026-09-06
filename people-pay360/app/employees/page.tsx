"use client";

import React, { useState, useMemo } from "react";
import {
  LayoutGrid,
  List,
  Search,
  Plus,
  Mail,
  Building,
  Briefcase,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Employee } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeeModal } from "@/components/employees/employee-modal";
import { getEmployees } from "@/lib/actions/employees";

export default function EmployeesPage() {
  const { employees: globalEmployees } = useAppStore(); // Fallback/reference if needed
  const [serverEmployees, setServerEmployees] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const limit = 12; // Kanban looks good with 12 (3 rows of 4)

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  React.useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const deptMap: Record<string, number> = {
          "Engineering": 2,
          "HR": 3,
          "Sales": 4,
          "Management": 6,
        };

        const res = await getEmployees({
          page,
          limit,
          search: searchQuery,
          departmentId: selectedDept === "All" ? undefined : deptMap[selectedDept]
        });
        
        // Map backend objects to the expected frontend Employee format
        const mapped = res.data.map(emp => ({
          id: emp.id.toString(),
          name: emp.name,
          workEmail: emp.email,
          phone: "N/A",
          jobPosition: emp.jobPosition,
          department: emp.departmentName || "General",
          managerId: emp.managerId?.toString(),
          scheduleId: emp.workingScheduleId?.toString(),
          role: emp.role,
          status: emp.isActive ? "Active" : "Inactive",
          company: "PeoplePay360",
          workLocation: "Office",
          bankDetails: emp.bankAccountNumber ? { bankName: emp.bankName, accountNumber: emp.bankAccountNumber, ifscCode: "" } : undefined
        }));
        setServerEmployees(mapped);
        setTotal(res.total);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Add debounce for search query
    const timeoutId = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [page, limit, searchQuery, selectedDept]);

  const filteredEmployees = serverEmployees;

  const handleOpenEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsCreateMode(false);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedEmployee(null);
    setIsCreateMode(true);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central operational hub for workforce master data, contracts, attendance, and leave records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              <span>List</span>
            </button>
          </div>

          <Button size="sm" onClick={handleCreateNew} className="bg-primary text-primary-foreground">
            <Plus className="size-4" />
            <span>NEW</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search employees by name, role, email..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            {["All", "Engineering", "HR", "Sales", "Management"].map((dept) => (
              <button
                key={dept}
                onClick={() => { setSelectedDept(dept); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  selectedDept === dept
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban View (Matches Excalidraw Screen 1: AM Aarav Mehta, SK Sara Khan, etc.) */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
           <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => {
            const initials = emp.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase();

            return (
              <Card
                key={emp.id}
                onClick={() => handleOpenEmployee(emp)}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group bg-card"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="size-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 text-primary font-bold text-sm flex items-center justify-center font-mono">
                      {initials}
                    </div>
                    <Badge variant={emp.status === "Active" ? "success" : "secondary"} className="text-[10px]">
                      ● {emp.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase className="size-3 text-muted-foreground" />
                      {emp.jobPosition}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Building className="size-3 text-muted-foreground" />
                      {emp.department} • {emp.workLocation}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate text-[11px]">{emp.workEmail}</span>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View (Dense Enterprise Table) */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Employee</th>
                <th className="py-3 px-4 text-left">Work Email</th>
                <th className="py-3 px-4 text-left">Job Position</th>
                <th className="py-3 px-4 text-left">Department</th>
                <th className="py-3 px-4 text-left">Location</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => handleOpenEmployee(emp)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                        {emp.name[0]}
                      </div>
                      <span className="font-semibold text-foreground">{emp.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground font-mono">{emp.workEmail}</td>
                  <td className="py-3.5 px-4 font-medium text-foreground">{emp.jobPosition}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{emp.department}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{emp.workLocation}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={emp.status === "Active" ? "success" : "secondary"} className="text-[10px]">
                      {emp.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-primary hover:underline font-semibold text-xs">Open</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && total > limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Employee Modal (Hub) */}
      <EmployeeModal
        employee={selectedEmployee}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        isCreate={isCreateMode}
      />
    </div>
  );
}
