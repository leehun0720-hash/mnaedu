/**
 * Member authentication — separate from the admin account in every way: its
 * own cookie, its own secret, its own verification path. A member session can
 * never be mistaken for an admin session, and vice versa.
 *
 * The repository is public, so MEMBER_SESSION_SECRET lives only in the Vercel
 * project settings. Passwords are stored as PBKDF2-SHA256 derivations through
 * Web Crypto, which needs no dependency and runs in every Next.js runtime.
 */

export const MEMBER_COOKIE = "fma_member";
const SESSION_DAYS = 30;
export const MEMBER_SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

/** OWASP-range work factor that still keeps a serverless login responsive. */
const PBKDF2_ITERATIONS = 210_000;

export function isMemberAuthConfigured(): boolean {
  return Boolean(process.env.MEMBER_SESSION_SECRET);
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

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const byte of view) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return b64(bits);
}

/** Returns `pbkdf2$iterations$salt$hash` — everything needed to verify later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 1000) return false;
  try {
    return timingSafeEqual(hash, await derive(password, fromB64(salt), rounds));
  } catch {
    return false;
  }
}

async function sign(payload: string): Promise<string> {
  const secret = process.env.MEMBER_SESSION_SECRET;
  if (!secret) throw new Error("MEMBER_SESSION_SECRET is not set");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return b64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

/**
 * Token is `memberId.expiry.signature`. Both the id and the expiry sit inside
 * the signed payload, so neither can be edited in the browser.
 */
export async function createMemberSession(memberId: number): Promise<string> {
  const expiry = Date.now() + MEMBER_SESSION_MAX_AGE * 1000;
  const payload = `${memberId}.${expiry}`;
  return `${payload}.${await sign(payload)}`;
}

/** Returns the member id the token vouches for, or null if it vouches for nothing. */
export async function readMemberSession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  const [id, expiry, signature] = token.split(".");
  if (!id || !expiry || !signature) return null;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(expiry)) return null;
  if (Number(expiry) < Date.now()) return null;
  try {
    if (!timingSafeEqual(signature, await sign(`${id}.${expiry}`))) return null;
    return Number(id);
  } catch {
    return null;
  }
}

export function memberCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${MEMBER_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  // Localhost is plain http, so Secure would stop the cookie being set at all
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/** Rules kept in one place so signup and any future password change agree. */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (password.length > 200) return "비밀번호가 너무 깁니다.";
  return null;
}
