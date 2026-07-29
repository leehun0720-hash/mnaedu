import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/db";
import { SESSION_COOKIE, isAuthConfigured, verifySession } from "@/lib/auth";
import AdminClient from "./admin-client";

// Never index the admin surface, and never serve it from a cache
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const authed = await verifySession(token);

  return (
    <AdminClient
      authed={authed}
      authConfigured={isAuthConfigured()}
      dbConfigured={isDbConfigured()}
    />
  );
}
