import { db } from "./lib/db";
import { employees } from "./lib/db/schema";
import bcrypt from "bcryptjs";

async function run() {
  try {
    const email = "superadmin@oxp.com";
    const rawPassword = "SuperAdmin@2026!";
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    
    const [newAdmin] = await db.insert(employees).values({
      empId: `ADM-${Date.now().toString().slice(-4)}`,
      name: "Super Admin",
      email,
      passwordHash,
      role: "ADMIN",
      departmentId: 1,
      jobPosition: "System Administrator",
      employeeType: "FULL_TIME",
      workingScheduleId: 1,
      isActive: true,
    }).returning();
    
    console.log("✅ Successfully created new Admin account:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${rawPassword}`);
    console.log(`DB ID: ${newAdmin.id}`);
  } catch (error) {
    console.error("Failed to create admin:", error);
  }
}

run();
