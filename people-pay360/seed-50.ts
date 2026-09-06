import { db } from "./lib/db";
import { employees, contracts, departments, salaryStructures, workingSchedules } from "./lib/db/schema";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function seed() {
  console.log("Starting seed of 50 employees...");

  const depts = await db.select().from(departments);
  const structs = await db.select().from(salaryStructures);
  const schedules = await db.select().from(workingSchedules);

  if (depts.length === 0 || structs.length === 0 || schedules.length === 0) {
    console.error("Missing baseline data (departments, structures, or schedules).");
    return;
  }

  const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Melissa", "George", "Deborah", "Timothy", "Stephanie", "Ronald", "Rebecca", "Edward", "Sharon", "Jason", "Laura", "Jeffrey", "Cynthia", "Ryan", "Kathleen", "Jacob", "Amy", "Gary", "Shirley", "Nicholas", "Angela", "Eric", "Helen", "Jonathan", "Anna", "Stephen", "Brenda", "Larry", "Pamela", "Justin", "Nicole"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"];
  const positions = ["Software Engineer", "HR Specialist", "Product Manager", "Data Analyst", "Sales Rep", "Marketing Exec", "Designer", "QA Tester", "Support Agent"];

  const insertedEmployees = [];

  for (let i = 0; i < 50; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@company.com`;
    const empIdStr = `EMP-${2000 + i}`;
    
    const dept = depts[Math.floor(Math.random() * depts.length)];
    const struct = structs[Math.floor(Math.random() * structs.length)];
    const sched = schedules[Math.floor(Math.random() * schedules.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];
    
    const [emp] = await db.insert(employees).values({
      empId: empIdStr,
      name,
      email,
      workEmail: email,
      workPhone: `+1 555 000 ${i.toString().padStart(4, '0')}`,
      departmentId: dept.id,
      jobPosition: position,
      role: "EMPLOYEE",
      employeeType: "FULL_TIME",
      workingScheduleId: sched.id,
      isActive: true,
      bankAccountNumber: `100200300${i}`,
      bankName: "Global Bank",
    }).returning();
    
    insertedEmployees.push({ emp, struct, sched, dept, position });
  }
  
  console.log(`Inserted ${insertedEmployees.length} employees. Creating contracts...`);

  for (const item of insertedEmployees) {
    const { emp, struct, sched, dept, position } = item;
    const wage = Math.floor(Math.random() * 80000) + 40000;
    
    await db.insert(contracts).values({
      employeeId: emp.id,
      name: `${position} Contract`,
      departmentId: dept.id,
      jobPosition: position,
      workingScheduleId: sched.id,
      startDate: new Date("2024-01-01").toISOString().split("T")[0],
      wage: wage.toString(),
      status: "ACTIVE",
      salaryStructureId: struct.id,
    });
  }

  console.log("Successfully seeded 50 employees and their contracts!");
}

seed().catch(console.error);
