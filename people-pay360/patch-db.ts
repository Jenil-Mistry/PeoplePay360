import { db } from "./lib/db";
import { payruns, payslips, employees, contracts, salaryStructures } from "./lib/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const prs = await db.select().from(payruns);
    const oct26 = prs.find(p => p.name.toUpperCase().includes("OCT 26"));

    if (!oct26) {
      console.log("Could not find payrun OCT 26. Found:", prs.map(p => p.name));
      return;
    }
    console.log("Found Payrun:", oct26.name, "ID:", oct26.id);


    const emps = await db.select().from(employees);
    const allContracts = await db.select().from(contracts);
    const structs = await db.select().from(salaryStructures);
    const defaultStruct = structs[0];

    let addedCount = 0;
    for (const emp of emps) {
      const existing = await db.select().from(payslips)
        .where(eq(payslips.payrunId, oct26.id));
      const hasPayslip = existing.find(ps => ps.employeeId === emp.id);

      if (!hasPayslip) {
        const empContract = allContracts.find(c => c.employeeId === emp.id && c.status === "ACTIVE");

        if (empContract) {
          const wage = parseInt(empContract.wage) || 80000;

          await db.insert(payslips).values({
            payrunId: oct26.id,
            employeeId: emp.id,
            contractId: empContract.id,
            structureId: empContract.structureId || defaultStruct.id,
            workedDays: "22",
            basicWage: wage.toString(),
            grossSalary: wage.toString(),
            netSalary: (wage * 0.9).toString(),
            status: oct26.status,
          });
          addedCount++;
        } else {
          console.log(`Employee ${emp.name} has no running contract.`);
        }
      }
    }

    console.log(`Added ${addedCount} employees to payrun ${oct26.name}`);
  } catch (e) {
    console.error(e);
  }
}
main();
