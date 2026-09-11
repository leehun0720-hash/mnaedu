/**
 * 관리자 비밀번호 — 해시와 규칙.
 *
 * 저장소가 공개되어 있으므로 비밀번호는 코드에 둘 수 없고, 데이터베이스에도
 * 원문으로 두지 않는다. 되돌릴 수 없는 형태(PBKDF2)로 바꿔 담고, 맞는지만
 * 확인한다. 소금(salt)을 계정마다 새로 뽑으므로 같은 비밀번호라도 저장된
 * 값은 매번 다르다.
 *
 * 이 파일은 데이터베이스를 모른다 — 순수 계산만 두어 그대로 시험할 수 있게
 * 한다. 저장은 lib/admin-password.ts가 맡는다.
 */

import { timingSafeEqual } from "@/lib/timing-safe";

/** OWASP 권고치(2023) — 느릴수록 대입 공격이 비싸진다 */
const ITERATIONS = 210_000;
const KEY_BITS = 256;

/** 너무 짧은 비밀번호는 아무리 잘 담아도 뚫린다 */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** 저장 형태: `pbkdf2$반복수$소금$해시` — 나중에 반복수를 올려도 옛 값이 읽힌다 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function matchesHash(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = String(stored).split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 1000 || rounds > 5_000_000) return false;
  try {
    const derived = await derive(password, fromBase64(salt), rounds);
    return timingSafeEqual(toBase64(derived), hash);
  } catch {
    return false;
  }
}

export type PasswordProblem = "too-short" | "too-long" | "same-as-current" | "no-variety";

/**
 * 새 비밀번호 규칙 — 길이가 먼저다.
 *
 * 종류를 섞으라고 강요하면 「Password1!」 같은 값이 나온다. 길이를 충분히
 * 요구하고, 같은 글자만 반복하는 값만 막는다.
 */
export function checkNewPassword(next: string, current: string): PasswordProblem | null {
  if (next.length < MIN_PASSWORD_LENGTH) return "too-short";
  if (next.length > MAX_PASSWORD_LENGTH) return "too-long";
  if (next === current) return "same-as-current";
  if (new Set(next).size < 4) return "no-variety";
  return null;
}

export function passwordProblemMessage(problem: PasswordProblem): string {
  switch (problem) {
    case "too-short":
      return `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
    case "too-long":
      return `새 비밀번호는 ${MAX_PASSWORD_LENGTH}자를 넘을 수 없습니다.`;
    case "same-as-current":
      return "지금 쓰시는 비밀번호와 다른 값을 넣어 주십시오.";
    case "no-variety":
      return "같은 글자만 반복된 비밀번호는 쓸 수 없습니다.";
  }
}
