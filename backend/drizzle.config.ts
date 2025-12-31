import type { Config } from "npm:drizzle-kit@latest";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: Deno.env.get("DB_HOST") || "mysql",
    user: Deno.env.get("DB_USER") || "vinylbank",
    password: Deno.env.get("DB_PASSWORD") || "vinylbank",
    database: Deno.env.get("DB_NAME") || "vinylbank",
    port: parseInt(Deno.env.get("DB_PORT") || "3306"),
  },
} satisfies Config;
