import { migrate } from "drizzle-orm/mysql2/migrator";
import { closeDb, getDb } from "./database.ts";

try {
  const db = await getDb();

  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations completed!");
} catch (error) {
  console.error("Migration failed:", error);
  Deno.exit(1);
} finally {
  await closeDb();
  Deno.exit(0);
}
