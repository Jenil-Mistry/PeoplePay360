import { db } from "./index";
import {
  departments,
  workingSchedules,
  workingScheduleLines,
  salaryStructures,
  salaryRules,
  timeOffTypes,
  timeOffAllocations,
  timeOffRequests,
  employees,
  contracts,
  attendance,
  payruns,
  payslips,
  payslipLines,
  payslipWarnings,
} from "./schema";
import { computeEmployeePayroll } from "../payroll-server-engine";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting PeoplePay360 full database seed...");

  // 1. Departments
  console.log("1. Seeding departments...");
  const deptList = [
    { name: "Finance" },
    { name: "Engineering" },
    { name: "HR" },
    { name: "Sales" },
    { name: "Operations" },
    { name: "Management" },
  ];
  await db
    .insert(departments)
    .values(deptList)
    .onConflictDoNothing({ target: departments.name });

  const allDepts = await db.select().from(departments);
  const deptMap = new Map(allDepts.map((d) => [d.name, d.id]));

  // 2. Working Schedule
  console.log("2. Seeding working schedules...");
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

  // 3. Salary Structures & Rules
  console.log("3. Seeding salary structures & rules...");
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
        baseCode: "WAGE",
      },
      {
        structureId: regularStructId,
        name: "House Rent Allowance",
        code: "HRA",
        category: "ALLOWANCE" as const,
        sequence: 20,
        computationType: "PERCENTAGE" as const,
        percentage: "25.00",
        baseCode: "BASIC",
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
      {
        structureId: execStructId,
        name: "Gross Salary",
        code: "GROSS",
        category: "GROSS" as const,
        sequence: 50,
        computationType: "FORMULA" as const,
        formula: "BASIC + HRA + STD + BONUS",
      },
      ...regularRules.slice(4).map((r) => ({ ...r, structureId: execStructId })),
    ];

    for (const rule of execRules) {
      await db.insert(salaryRules).values(rule);
    }
  } else {
    regularStructId = existingStructures[0].id;
    execStructId = existingStructures[1]?.id || regularStructId;
  }

  // 4. Time Off Types
  console.log("4. Seeding time off types...");
  await db
    .insert(timeOffTypes)
    .values([
      { name: "Paid Time Off", unit: "DAYS", requiresAllocation: true, includeInPayroll: true },
      { name: "Sick Leave", unit: "DAYS", requiresAllocation: true, includeInPayroll: true },
      { name: "Comp Off", unit: "DAYS", requiresAllocation: false, includeInPayroll: true },
    ])
    .onConflictDoNothing({ target: timeOffTypes.name });

  const allTimeOffTypes = await db.select().from(timeOffTypes);
  const ptoType = allTimeOffTypes.find((t) => t.name === "Paid Time Off") || allTimeOffTypes[0];
  const sickType = allTimeOffTypes.find((t) => t.name === "Sick Leave") || allTimeOffTypes[1] || allTimeOffTypes[0];

  // 5. Employees
  console.log("5. Seeding sample employees...");
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
      contractEnd: null,
      rawPassword: "Payroll@2026!",
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
      contractEnd: null,
      rawPassword: "Hr@2026!",
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
      contractEnd: null,
      rawPassword: "Dev@2026!",
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
      contractEnd: null,
      rawPassword: "Recruit@2026!",
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
      contractEnd: null,
      rawPassword: "Manager@2026!",
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
      contractEnd: null,
      rawPassword: "Admin@2026!",
    },
    {
      empId: "EMP-006",
      name: "Karan Verma",
      email: "karan@oxp.com",
      role: "EMPLOYEE" as const,
      departmentId: deptMap.get("Engineering") || allDepts[0].id,
      jobPosition: "Junior Frontend Engineer",
      employeeType: "FULL_TIME" as const,
      workingScheduleId: scheduleId,
      bankAccountNumber: "230983977",
      bankName: "HDFC Bank",
      wage: "55000.00",
      structId: regularStructId,
      contractEnd: "2026-03-31", // Triggers EXPIRING_CONTRACT preflight warning
      rawPassword: "Frontend@2026!",
    },
  ];

  for (const emp of sampleEmployees) {
    let [existing] = await db.select().from(employees).where(eq(employees.empId, emp.empId));
    if (!existing) {
      const passwordHash = await bcrypt.hash(emp.rawPassword, 12);
      [existing] = await db
        .insert(employees)
        .values({
          empId: emp.empId,
          name: emp.name,
          email: emp.email,
          passwordHash,
          role: emp.role,
          departmentId: emp.departmentId,
          jobPosition: emp.jobPosition,
          employeeType: emp.employeeType,
          workingScheduleId: emp.workingScheduleId,
          bankAccountNumber: emp.bankAccountNumber,
          bankName: emp.bankName,
        })
        .returning();
      console.log(`Created ${emp.name} (${emp.email}) with password: ${emp.rawPassword}`);
    } else {
      // Update existing employees with the new password
      const passwordHash = await bcrypt.hash(emp.rawPassword, 12);
      await db
        .update(employees)
        .set({ passwordHash })
        .where(eq(employees.id, existing.id));
      console.log(`Updated ${emp.name} (${emp.email}) with password: ${emp.rawPassword}`);
    }

    if (existing) {
      const [existingContract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.employeeId, existing.id));

      if (!existingContract) {
        await db.insert(contracts).values({
          employeeId: existing.id,
          name: `CON/2026/${String(existing.id).padStart(4, "0")}`,
          departmentId: emp.departmentId,
          jobPosition: emp.jobPosition,
          workingScheduleId: emp.workingScheduleId,
          startDate: "2026-01-01",
          endDate: emp.contractEnd,
          wage: emp.wage,
          status: "ACTIVE",
          salaryStructureId: emp.structId,
        });
      }
    }
  }

  const allEmployees = await db.select().from(employees);
  const allContracts = await db.select().from(contracts);

  // 6. Time Off Allocations & Requests
  console.log("6. Seeding leave allocations and sample requests...");
  const existingAllocations = await db.select().from(timeOffAllocations);
  if (existingAllocations.length === 0) {
    for (const emp of allEmployees) {
      // PTO Allocation
      const [ptoAlc] = await db
        .insert(timeOffAllocations)
        .values({
          employeeId: emp.id,
          timeOffTypeId: ptoType.id,
          allocatedUnits: "18.00",
          usedUnits: emp.empId === "EMP-002" ? "2.00" : "0.00",
          status: "APPROVED",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
        })
        .returning();

      // Sick Leave Allocation
      await db.insert(timeOffAllocations).values({
        employeeId: emp.id,
        timeOffTypeId: sickType.id,
        allocatedUnits: "12.00",
        usedUnits: emp.empId === "EMP-004" ? "1.00" : "0.00",
        status: "APPROVED",
        validFrom: "2026-01-01",
        validTo: "2026-12-31",
      });

      // Sample request for Sara Khan (Approved)
      if (emp.empId === "EMP-002") {
        await db.insert(timeOffRequests).values({
          employeeId: emp.id,
          timeOffTypeId: ptoType.id,
          allocationId: ptoAlc.id,
          startDate: "2026-02-12",
          endDate: "2026-02-13",
          requestedUnits: "2.00",
          status: "APPROVED",
          notes: "Annual family retreat",
        });
      }

      // Sample request for Neha Patel (Draft / To Approve)
      if (emp.empId === "EMP-004") {
        await db.insert(timeOffRequests).values({
          employeeId: emp.id,
          timeOffTypeId: sickType.id,
          startDate: "2026-03-10",
          endDate: "2026-03-10",
          requestedUnits: "1.00",
          status: "DRAFT",
          notes: "Doctor consultation",
        });
      }
    }
  }

  // 7. Attendance Records
  console.log("7. Seeding sample attendance logs...");
  const existingAttendance = await db.select().from(attendance);
  if (existingAttendance.length === 0) {
    const dates = ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    for (const d of dates) {
      for (const emp of allEmployees) {
        // John Dsouza on 2026-03-05 has a missing checkout to demonstrate health alert
        if (emp.empId === "EMP-003" && d === "2026-03-05") {
          await db.insert(attendance).values({
            employeeId: emp.id,
            date: d,
            checkIn: new Date(`${d}T09:05:00Z`),
            checkOut: null,
            workedHours: null,
            status: "PRESENT",
            notes: "Pending evening badge punch",
          });
        } else {
          const isOvertime = emp.empId === "EMP-003" && d === "2026-03-04";
          const worked = isOvertime ? "9.50" : "8.50";
          const checkOutTime = isOvertime ? "19:30:00Z" : "18:30:00Z";

          await db.insert(attendance).values({
            employeeId: emp.id,
            date: d,
            checkIn: new Date(`${d}T09:00:00Z`),
            checkOut: new Date(`${d}T${checkOutTime}`),
            workedHours: worked,
            status: "PRESENT",
            isOvertime,
            notes: isOvertime ? "Q1 Release Sprint Deploy" : undefined,
          });
        }
      }
    }
  }

  // 8. Payruns & Computed Payslips
  console.log("8. Seeding payrun batches & computed payslips...");
  const existingPayruns = await db.select().from(payruns);

  if (existingPayruns.length === 0) {
    const allRules = await db.select().from(salaryRules).orderBy(salaryRules.sequence);

    const payrunSeeds = [
      {
        name: "January 2026 Regular Batch",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        structureId: regularStructId,
        status: "PAID" as const,
        computedAt: new Date("2026-01-28T10:00:00Z"),
        validatedAt: new Date("2026-01-29T14:30:00Z"),
        paidAt: new Date("2026-01-31T18:00:00Z"),
      },
      {
        name: "February 2026 Regular Batch",
        startDate: "2026-02-01",
        endDate: "2026-02-28",
        structureId: regularStructId,
        status: "VALIDATED" as const,
        computedAt: new Date("2026-02-26T10:00:00Z"),
        validatedAt: new Date("2026-02-27T16:00:00Z"),
        paidAt: null,
      },
      {
        name: "March 2026 Regular Batch",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        structureId: regularStructId,
        status: "DRAFT" as const,
        computedAt: new Date("2026-03-05T09:00:00Z"),
        validatedAt: null,
        paidAt: null,
      },
    ];

    for (const prData of payrunSeeds) {
      const [insertedPayrun] = await db.insert(payruns).values(prData).returning();

      for (const emp of allEmployees) {
        const contract = allContracts.find((c) => c.employeeId === emp.id && c.status === "ACTIVE");
        if (!contract) continue;

        const rulesForContract = allRules.filter((r) => r.structureId === contract.salaryStructureId);

        // Run calculation engine
        const comp = computeEmployeePayroll({
          employee: {
            id: emp.id,
            name: emp.name,
            bankAccountNumber: emp.bankAccountNumber,
            bankName: emp.bankName,
          },
          contract: {
            id: contract.id,
            wage: contract.wage,
            startDate: contract.startDate,
            endDate: contract.endDate,
          },
          rules: rulesForContract,
          periodStart: insertedPayrun.startDate,
          periodEnd: insertedPayrun.endDate,
          workedDays: 22,
        });

        // Insert Payslip
        const [insertedSlip] = await db
          .insert(payslips)
          .values({
            payrunId: insertedPayrun.id,
            employeeId: emp.id,
            contractId: contract.id,
            structureId: contract.salaryStructureId,
            workedDays: "22.00",
            basicWage: comp.basicWage.toFixed(2),
            grossSalary: comp.grossSalary.toFixed(2),
            netSalary: comp.netSalary.toFixed(2),
            hasWarnings: comp.warnings.length > 0,
            status: insertedPayrun.status,
            emailSentAt: insertedPayrun.status === "PAID" ? new Date("2026-01-31T18:30:00Z") : null,
          })
          .returning();

        // Insert Payslip Line Items
        for (const line of comp.lines) {
          await db.insert(payslipLines).values({
            payslipId: insertedSlip.id,
            sequence: line.sequence,
            ruleCode: line.ruleCode,
            ruleName: line.ruleName,
            category: line.category,
            amount: line.amount.toFixed(2),
          });
        }

        // Insert Payslip Warnings
        for (const w of comp.warnings) {
          await db.insert(payslipWarnings).values({
            payslipId: insertedSlip.id,
            warningType: w.warningType,
            message: w.message,
          });
        }
      }
    }
  }

  console.log("✅ Seed completed successfully! Neon DB is fully initialized with live records.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
