import { Application } from "oak";
import { mediaRouter } from "./routes/media.ts";
import { configRouter } from "./routes/config.ts";
import { uploadRouter } from "./routes/upload.ts";
import { getDb } from "./db/database.ts";

const app = new Application();

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

app.use(mediaRouter.routes());
app.use(mediaRouter.allowedMethods());
app.use(configRouter.routes());
app.use(configRouter.allowedMethods());
app.use(uploadRouter.routes());
app.use(uploadRouter.allowedMethods());

app.use((ctx) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = { status: "ok" };
  }
});

let db;
let retries = 0;
const maxRetries = 30;
while (retries < maxRetries) {
  try {
    db = await getDb();
    console.log("Database connected");

    try {
      const { migrate } = await import("drizzle-orm/mysql2/migrator");
      const migrationsFolder = "/app/drizzle";
      console.log(`Running migrations with Drizzle from: ${migrationsFolder}`);
      await migrate(db, { migrationsFolder });
      console.log("✓ Migrations applied successfully with Drizzle");
    } catch (migrationError) {
      const errorMessage = migrationError instanceof Error
        ? migrationError.message
        : String(migrationError);
      const errorStack = migrationError instanceof Error ? migrationError.stack : undefined;
      console.error("✗ Migration failed:", errorMessage);
      if (errorStack) {
        console.error("Stack:", errorStack);
      }
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
