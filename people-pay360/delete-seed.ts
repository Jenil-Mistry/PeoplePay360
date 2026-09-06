import { db } from "./lib/db";
import { employees, contracts, payslips, timeOffRequests, timeOffAllocations, attendance } from "./lib/db/schema";
import { like, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    console.log("Finding seeded employees (EMP-2000 and above)...");
    
    // Find all employees inserted by the script
    const seededEmployees = await db
      .select({ id: employees.id, empId: employees.empId })
      .from(employees)
      .where(like(employees.empId, 'EMP-20%'));
      
    if (seededEmployees.length === 0) {
      console.log("No seeded employees found to delete.");
      return;
    }
    
    const empIds = seededEmployees.map(e => e.id);
    console.log(`Found ${empIds.length} employees to delete.`);
    
    // Delete dependent records
    console.log("Deleting associated payslips...");
    await db.delete(payslips).where(inArray(payslips.employeeId, empIds));
    
    console.log("Deleting associated contracts...");
    await db.delete(contracts).where(inArray(contracts.employeeId, empIds));

    console.log("Deleting associated time-off requests & allocations...");
    await db.delete(timeOffRequests).where(inArray(timeOffRequests.employeeId, empIds));
    await db.delete(timeOffAllocations).where(inArray(timeOffAllocations.employeeId, empIds));

    console.log("Deleting associated attendance...");
    await db.delete(attendance).where(inArray(attendance.employeeId, empIds));
    
    console.log("Deleting the employees...");
    await db.delete(employees).where(inArray(employees.id, empIds));
    
    console.log("Cleanup complete!");
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

main();
