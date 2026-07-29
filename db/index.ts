import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Neon injects its connection string under different names depending on how
 * the integration was added, and Vercel's own Postgres used POSTGRES_URL.
 * Rather than depending on one of them, take whichever is present.
 *
 * The unpooled variants are listed last: pooled is the right default for
 * serverless, where every request may be a fresh connection.
 */
const URL_VARS = [
  "POSTGRES_URL",
  "DATABASE_URL",
  // Vercel's default prefix when the integration's prefix field is left blank
  "STORAGE_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function connectionString(): string | undefined {
  for (const name of URL_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

/**
 * The database is optional on purpose. The site was live before one existed,
 * so nothing here may throw at import time or during a build with no
 * connection string — callers ask this first and fall back to the seed
 * questions. The moment a URL is present the same code path starts using it.
 */
export function isDbConfigured(): boolean {
  return Boolean(connectionString());
}

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const url = connectionString();
  if (!url) {
    throw new Error(
      `No database connection string. Expected one of ${URL_VARS.join(", ")}. Create a Neon database from the Vercel dashboard (Storage → Create Database → Neon); it sets this automatically.`
    );
  }
  if (!cached) cached = drizzle(neon(url), { schema });
  return cached;
}
