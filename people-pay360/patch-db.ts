import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const client = await pool.connect();
  try {
    console.log("Updating REFUSED to REJECTED...");
    await client.query(`ALTER TYPE time_off_status ADD VALUE IF NOT EXISTS 'PENDING'`);
    await client.query(`ALTER TYPE time_off_status ADD VALUE IF NOT EXISTS 'REJECTED'`);
    await client.query(`ALTER TYPE time_off_status ADD VALUE IF NOT EXISTS 'CANCELLED'`);
    
    await client.query(`UPDATE time_off_requests SET status = 'REJECTED' WHERE status::text = 'REFUSED'`);
    await client.query(`UPDATE time_off_allocations SET status = 'REJECTED' WHERE status::text = 'REFUSED'`);
    
    console.log("Success!");
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
