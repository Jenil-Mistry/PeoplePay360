import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

// Establish the HTTP connection to Neon
const sql = neon(process.env.DATABASE_URL);

// Initialize Drizzle with the schema for relational queries
export const db = drizzle(sql, { schema }); 