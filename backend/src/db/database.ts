import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.ts";

const MAX_DB_RETRIES = parseInt(Deno.env.get("DB_CONNECT_RETRIES") || "30");
const DB_RETRY_DELAY_MS = parseInt(Deno.env.get("DB_CONNECT_RETRY_DELAY_MS") || "2000");

let db: ReturnType<typeof drizzle> | null = null;
let connection: mysql.Connection | null = null;

async function createConnectionWithRetry(): Promise<mysql.Connection> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < MAX_DB_RETRIES) {
    try {
      console.log(`[DB] Attempting connection (attempt ${attempt + 1}/${MAX_DB_RETRIES})`);
      return await mysql.createConnection({
        host: Deno.env.get("DB_HOST") || "mysql",
        user: Deno.env.get("DB_USER") || "vinylbank",
        password: Deno.env.get("DB_PASSWORD") || "vinylbank",
        database: Deno.env.get("DB_NAME") || "vinylbank",
        port: parseInt(Deno.env.get("DB_PORT") || "3306"),
      });
    } catch (error) {
      attempt++;
      lastError = error;
      if (attempt >= MAX_DB_RETRIES) {
        console.error("[DB] Exhausted connection retries");
        throw error;
      }

      const delayMs = DB_RETRY_DELAY_MS * Math.min(attempt, 5); // mild backoff
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[DB] Connection failed (${message}). Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function getDb() {
  if (!db) {
    connection = await createConnectionWithRetry();
    console.log("[DB] Connection established");
    db = drizzle(connection, { schema, mode: "default" });
  }
  return db;
}

export async function closeDb() {
  if (connection) {
    await connection.end();
    connection = null;
    db = null;
  }
}
