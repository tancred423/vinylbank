import { Application } from "oak";
import { mediaRouter } from "./routes/media.ts";
import { configRouter } from "./routes/config.ts";
import { uploadRouter } from "./routes/upload.ts";
import { getDb } from "./db/database.ts";
import { mediaTypes } from "./db/schema.ts";
import type { MySql2Database } from "drizzle-orm/mysql2";

const app = new Application();

// CORS middleware
app.use(async (ctx, next) => {
  const origin = Deno.env.get("CORS_ORIGIN") || "http://localhost:5173";
  ctx.response.headers.set("Access-Control-Allow-Origin", origin);
  ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  await next();
});

// Routes
app.use(mediaRouter.routes());
app.use(mediaRouter.allowedMethods());
app.use(configRouter.routes());
app.use(configRouter.allowedMethods());
app.use(uploadRouter.routes());
app.use(uploadRouter.allowedMethods());

// Health check
app.use((ctx) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = { status: "ok" };
  }
});

// Seed default media types
async function seedDefaultMediaTypes(db: MySql2Database) {
  const defaultTypes = ["CD", "DVD", "Bluray", "Vinyl"];

  for (const typeName of defaultTypes) {
    try {
      await db.insert(mediaTypes).values({ name: typeName }).onDuplicateKeyUpdate({
        set: { name: typeName },
      });
    } catch (_error) {
      // Ignore errors if type already exists
      console.log(`Media type ${typeName} already exists`);
    }
  }
  console.log("✓ Default media types seeded");
}

// Initialize database (wait a bit for MySQL to be ready)
let db;
let retries = 0;
const maxRetries = 30;
while (retries < maxRetries) {
  try {
    db = await getDb();
    console.log("Database connected");

    // Run migrations on startup
    try {
      // Run Drizzle migrations
      const { migrate } = await import("drizzle-orm/mysql2/migrator");
      const migrationsFolder = "/app/drizzle";
      console.log(`Running migrations with Drizzle from: ${migrationsFolder}`);
      await migrate(db, { migrationsFolder });
      console.log("✓ Migrations applied successfully with Drizzle");

      // Seed default media types after migrations
      await seedDefaultMediaTypes(db);
    } catch (migrationError) {
      const errorMessage = migrationError instanceof Error
        ? migrationError.message
        : String(migrationError);
      const errorStack = migrationError instanceof Error ? migrationError.stack : undefined;
      console.error("✗ Migration failed:", errorMessage);
      if (errorStack) {
        console.error("Stack:", errorStack);
      }
      // Don't continue if migrations fail - this is critical
      throw migrationError;
    }

    break;
  } catch (error) {
    retries++;
    if (retries >= maxRetries) {
      console.error("Failed to connect to database after", maxRetries, "retries");
      throw error;
    }
    console.log(`Waiting for database... (${retries}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

const port = parseInt(Deno.env.get("PORT") || "8000");
const hostname = "0.0.0.0";
console.log(`Server running on http://${hostname}:${port}`);
await app.listen({ port, hostname });
