import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env variable not set");
}

// Create the database connection
const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

export async function testDbConnection() {
  try {
    // Execute a simple query to test connection
    const result = await client`SELECT NOW()`;
    console.log("Database connection successful:", result);
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}