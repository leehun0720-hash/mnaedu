import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

/**
 * The database is optional on purpose.
 *
 * The site is live, and it was live before any database existed. Nothing here
 * may throw at import time or during a build that has no connection string —
 * callers ask `isDbConfigured()` first and fall back to the seed questions.
 * The moment POSTGRES_URL is present the same code path starts using it.
 */
export function isDbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!isDbConfigured()) {
    throw new Error(
      "POSTGRES_URL is not set. Create a Postgres store in the Vercel dashboard (Storage → Create Database); Vercel injects the connection string automatically."
    );
  }
  if (!cached) cached = drizzle(sql, { schema });
  return cached;
}
