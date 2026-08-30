/**
 * Admin authentication: one account, credentials supplied entirely by the
 * environment. This repository is public, so nothing secret may ever be
 * written here — ADMIN_PASSWORD and ADMIN_SESSION_SECRET live in the Vercel
 * project settings only.
 */

export const SESSION_COOKIE = "fma_admin";
const SESSION_HOURS = 8;

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

/** Comparison that does not leak the answer through how long it takes. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Fold the length difference in rather than returning early on it
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

function b64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

/** Token is `expiry.signature`; the expiry is inside the signed payload. */
export async function createSession(): Promise<string> {
  const expiry = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  return `${expiry}.${await sign(expiry)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature) return false;
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  try {
    return timingSafeEqual(signature, await sign(expiry));
  } catch {
    return false;
  }
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  // Localhost is plain http, so Secure would stop the cookie being set at all
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export const SESSION_MAX_AGE = SESSION_HOURS * 60 * 60;
