import { db } from "./lib/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`UPDATE salary_rules SET base_code = 'WAGE' WHERE computation_type = 'PERCENTAGE' AND code = 'BASIC';`);
  await db.execute(sql`UPDATE salary_rules SET base_code = 'BASIC' WHERE computation_type = 'PERCENTAGE' AND code = 'HRA';`);
  console.log("Updated DB");
  process.exit(0);
}

main();
