import { db } from "./index";
import {
  departments,
  workingSchedules,
  workingScheduleLines,
  salaryStructures,
  salaryRules,
  timeOffTypes,
  employees,
  contracts,
} from "./schema";

async function seed() {
  console.log("🌱 Starting PeoplePay360 database seed...");

  // 1. Departments
  console.log("Seeding departments...");
  const deptList = [
    { name: "Finance" },
    { name: "Engineering" },
    { name: "HR" },
    { name: "Sales" },
    { name: "Operations" },
    { name: "Management" },
  ];
  const insertedDepts = await db
    .insert(departments)
    .values(deptList)
    .onConflictDoNothing({ target: departments.name })
    .returning();

  const allDepts = await db.select().from(departments);
  const deptMap = new Map(allDepts.map((d) => [d.name, d.id]));

  // 2. Working Schedule
  console.log("Seeding working schedules...");
  const existingSchedules = await db.select().from(workingSchedules);
  let scheduleId: number;

  if (existingSchedules.length === 0) {
    const [standardSched] = await db
      .insert(workingSchedules)
      .values({
        name: "Standard 40 Hours / Week",
        type: "STANDARD",
        totalWeeklyHours: "40.00",
        isActive: true,
      })
      .returning();
    scheduleId = standardSched.id;

    // Schedule lines (Mon - Fri)
    const days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI"> = ["MON", "TUE", "WED", "THU", "FRI"];
    for (const day of days) {
      await db.insert(workingScheduleLines).values({
        scheduleId,
        dayOfWeek: day,
        startTime: "09:00:00",
        endTime: "18:00:00",
        breakMinutes: 60,
      });
    }
  } else {
    scheduleId = existingSchedules[0].id;
  }

  // 3. Salary Structures
  console.log("Seeding salary structures & rules...");
  const existingStructures = await db.select().from(salaryStructures);
  let regularStructId: number;
  let execStructId: number;

  if (existingStructures.length === 0) {
    const [regStruct] = await db
      .insert(salaryStructures)
      .values({ name: "Regular Salary Structure", isActive: true })
      .returning();
    const [execStruct] = await db
      .insert(salaryStructures)
      .values({ name: "Executive & Bonus Structure", isActive: true })
      .returning();

    regularStructId = regStruct.id;
    execStructId = execStruct.id;

    // Rules for regular structure
    const regularRules = [
      {
        structureId: regularStructId,
        name: "Basic Salary",
        code: "BASIC",
        category: "BASIC" as const,
        sequence: 10,
        computationType: "PERCENTAGE" as const,
        percentage: "50.00",
      },
      {
        structureId: regularStructId,
        name: "House Rent Allowance",
        code: "HRA",
        category: "ALLOWANCE" as const,
        sequence: 20,
        computationType: "PERCENTAGE" as const,
        percentage: "25.00",
      },
      {
        structureId: regularStructId,
        name: "Standard Allowance",
        code: "STD",
        category: "ALLOWANCE" as const,
        sequence: 30,
        computationType: "FIXED" as const,
        amount: "10000.00",
      },
      {
        structureId: regularStructId,
        name: "Gross Salary",
        code: "GROSS",
        category: "GROSS" as const,
        sequence: 50,
        computationType: "FORMULA" as const,
        formula: "BASIC + HRA + STD",
      },
      {
        structureId: regularStructId,
        name: "Provident Fund",
        code: "PF",
        category: "DEDUCTION" as const,
        sequence: 60,
        computationType: "FIXED" as const,
        amount: "3000.00",
      },
      {
        structureId: regularStructId,
        name: "Professional Tax",
        code: "PT",
        category: "DEDUCTION" as const,
        sequence: 70,
        computationType: "FIXED" as const,
        amount: "2000.00",
      },
      {
        structureId: regularStructId,
        name: "Net Salary",
        code: "NET",
        category: "NET" as const,
        sequence: 80,
        computationType: "FORMULA" as const,
        formula: "GROSS - PF - PT",
      },
    ];

    for (const rule of regularRules) {
      await db.insert(salaryRules).values(rule);
    }

    // Rules for executive structure (with bonus)
    const execRules = [
      ...regularRules.slice(0, 3).map((r) => ({ ...r, structureId: execStructId })),
      {
        structureId: execStructId,
        name: "Performance Bonus",
        code: "BONUS",
        category: "ALLOWANCE" as const,
        sequence: 40,
        computationType: "FIXED" as const,
        amount: "15000.00",
      },
      ...regularRules.slice(3).map((r) => ({ ...r, structureId: execStructId })),
    ];

    for (const rule of execRules) {
      await db.insert(salaryRules).values(rule);
    }
  } else {
    regularStructId = existingStructures[0].id;
    execStructId = existingStructures[1]?.id || regularStructId;
  }

  // 4. Time Off Types
  console.log("Seeding time off types...");
  await db
    .insert(timeOffTypes)
    .values([
      { name: "Paid Time Off", unit: "DAYS", requiresAllocation: true, includeInPayroll: true },
      { name: "Sick Leave", unit: "DAYS", requiresAllocation: true, includeInPayroll: true },
      { name: "Comp Off", unit: "DAYS", requiresAllocation: false, includeInPayroll: true },
    ])
    .onConflictDoNothing({ target: timeOffTypes.name });

  // 5. Employees
  console.log("Seeding sample employees...");
  const sampleEmployees = [
    {
      empId: "EMP-001",
      name: "Aarav Mehta",
      email: "aarav@oxp.com",
      role: "PAYROLL_USER" as const,
      departmentId: deptMap.get("Finance") || allDepts[0].id,
      jobPosition: "Payroll Specialist",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "5010023458921",
      bankName: "HDFC Bank",
      wage: "85000.00",
      structId: regularStructId,
    },
    {
      empId: "EMP-002",
      name: "Sara Khan",
      email: "sara@oxp.com",
      role: "HR_MANAGER" as const,
      departmentId: deptMap.get("HR") || allDepts[0].id,
      jobPosition: "HR Officer",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "001205001289",
      bankName: "ICICI Bank",
      wage: "95000.00",
      structId: regularStructId,
    },
    {
      empId: "EMP-003",
      name: "John Dsouza",
      email: "john@oxp.com",
      role: "EMPLOYEE" as const,
      departmentId: deptMap.get("Engineering") || allDepts[0].id,
      jobPosition: "Lead Developer",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "201994829104",
      bankName: "State Bank of India",
      wage: "140000.00",
      structId: execStructId,
    },
    {
      empId: "EMP-004",
      name: "Neha Patel",
      email: "neha@oxp.com",
      role: "EMPLOYEE" as const,
      departmentId: deptMap.get("HR") || allDepts[0].id,
      jobPosition: "Technical Recruiter",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "9120100482918",
      bankName: "Axis Bank",
      wage: "72000.00",
      structId: regularStructId,
    },
    {
      empId: "EMP-005",
      name: "Vikram Singh",
      email: "vikram@oxp.com",
      role: "PAYROLL_MANAGER" as const,
      departmentId: deptMap.get("Finance") || allDepts[0].id,
      jobPosition: "Payroll Operations Manager",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "5010098472911",
      bankName: "HDFC Bank",
      wage: "135000.00",
      structId: execStructId,
    },
    {
      empId: "ADM-001",
      name: "Priya Nair",
      email: "admin@oxp.com",
      role: "ADMIN" as const,
      departmentId: deptMap.get("Management") || allDepts[0].id,
      jobPosition: "System Administrator & HR Director",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "001205991823",
      bankName: "ICICI Bank",
      wage: "175000.00",
      structId: execStructId,
    },
  ];

  for (const emp of sampleEmployees) {
    const [newEmp] = await db
      .insert(employees)
      .values({
        empId: emp.empId,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        departmentId: emp.departmentId,
        jobPosition: emp.jobPosition,
        employeeType: emp.employeeType,
        workingScheduleId: emp.workingScheduleId,
        bankAccountNumber: emp.bankAccountNumber,
        bankName: emp.bankName,
      })
      .onConflictDoNothing({ target: employees.empId })
      .returning();

    if (newEmp) {
      // Contract
      await db.insert(contracts).values({
        employeeId: newEmp.id,
        name: `${newEmp.name} - 2026 Contract`,
        departmentId: emp.departmentId,
        jobPosition: emp.jobPosition,
        workingScheduleId: emp.workingScheduleId,
        startDate: "2026-01-01",
        wage: emp.wage,
        status: "ACTIVE",
        salaryStructureId: emp.structId,
      });
    }
  }

  console.log("✅ Seed completed successfully! Neon DB is initialized.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
