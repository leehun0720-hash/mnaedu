/**
 * Admin authentication: one account.
 *
 * 이 저장소는 공개되어 있으므로 비밀번호는 여기 쓰이지 않는다.
 * ADMIN_PASSWORD와 ADMIN_SESSION_SECRET은 Vercel 설정에만 둔다.
 *
 * 환경변수는 처음 문을 여는 열쇠다. 회장이 화면에서 비밀번호를 바꾸시면
 * 그때부터는 데이터베이스에 담긴 해시가 기준이 된다.
 *
 * 이 파일에는 저장소를 건드리는 코드를 두지 않는다 — 서명과 규칙만 두어야
 * 그대로 시험할 수 있다. 저장소를 보는 쪽은 lib/admin-auth.ts가 맡는다.
 */

import { timingSafeEqual } from "@/lib/timing-safe";

export const SESSION_COOKIE = "fma_admin";
const SESSION_HOURS = 8;

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

/**
 * 배포 설정에 넣어 둔 비밀번호와 견준다 — 아직 바꾸신 적이 없을 때의 기준.
 *
 * 설정 쪽 값만 앞뒤 공백을 턴다. 붙여넣을 때 줄바꿈 한 칸이 딸려 들어가면
 * 맞는 비밀번호를 넣어도 계속 틀렸다고 나오는데, 눈에 보이지 않아 찾기가
 * 아주 어렵다(실제로 겪었다). 앞뒤가 공백인 비밀번호를 쓰실 일은 없다.
 *
 * 입력한 값은 털지 않는다 — "입력은 있는 그대로 본다"는 규칙은 그대로 둔다.
 */
export function verifyEnvPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim();
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

/**
 * 토큰은 `만료.세대.서명` 이며, 만료와 세대가 모두 서명 안에 들어간다.
 * 세대는 비밀번호를 바꾼 시각이라, 바꾸는 순간 옛 토큰의 세대가 어긋난다.
 */
export async function createSessionToken(version: string): Promise<string> {
  const expiry = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  const payload = `${expiry}.${version}`;
  return `${payload}.${await sign(payload)}`;
}

/**
 * 서명과 만료를 본다. expectedVersion을 주면 비밀번호 세대까지 맞는지 본다
 * (null이면 세대 확인을 건너뛴다 — 저장소를 읽지 못한 경우).
 */
export async function verifySessionToken(
  token: string | undefined,
  expectedVersion: string | null
): Promise<boolean> {
  if (!token) return false;
  const [expiry, version, signature] = token.split(".");
  if (!expiry || !version || !signature) return false;
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  try {
    if (!timingSafeEqual(signature, await sign(`${expiry}.${version}`))) return false;
  } catch {
    return false;
  }
  if (expectedVersion === null) return true;
  return timingSafeEqual(version, expectedVersion);
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
