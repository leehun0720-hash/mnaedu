import "server-only";

import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { adminCredentials } from "@/db/schema";
import { hashPassword, matchesHash } from "@/lib/password-hash";

/**
 * 관리자 비밀번호 저장소.
 *
 * 바뀐 적이 없으면 환경변수가 기준이고, 한 번이라도 바꾸셨으면 이곳의 해시가
 * 기준이 된다. 그래서 지금까지 쓰시던 비밀번호로도 그대로 들어오실 수 있고,
 * 바꾸신 다음부터는 새 비밀번호만 통한다.
 */

const ROW_ID = 1;

type Stored = { hash: string; updatedAt: Date } | null;

/**
 * 세션을 확인할 때마다 읽으므로 아주 잠깐 들고 있는다.
 * 오래 들고 있으면 비밀번호를 바꿔도 옛 세션이 남고, 아예 안 들고 있으면
 * 화면을 열 때마다 데이터베이스를 두드린다. 그 사이를 15초로 잡았다.
 */
const CACHE_MS = 15_000;
let cache: { at: number; value: Stored } | null = null;

export async function readStored(): Promise<Stored> {
  if (!isDbConfigured()) return null;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const [row] = await getDb()
      .select({ hash: adminCredentials.passwordHash, updatedAt: adminCredentials.updatedAt })
      .from(adminCredentials)
      .where(eq(adminCredentials.id, ROW_ID))
      .limit(1);
    const value = row ? { hash: row.hash, updatedAt: row.updatedAt } : null;
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    // 표가 아직 없을 수 있다(setup.sql 미실행) — 그때는 환경변수로 들어오신다
    console.error("[admin] password lookup failed:", err);
    return null;
  }
}

/**
 * 지금 유효한 비밀번호인가.
 * 바꾼 적이 있으면 저장된 해시만, 없으면 환경변수와 견준다.
 */
export async function passwordMatches(input: string): Promise<boolean> {
  const stored = await readStored();
  if (stored) return matchesHash(input, stored.hash);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const { timingSafeEqual } = await import("@/lib/timing-safe");
  return timingSafeEqual(input, expected);
}

/** 세션에 새겨 두는 값 — 비밀번호가 바뀌면 달라져, 옛 세션이 한꺼번에 끊긴다 */
export async function credentialVersion(): Promise<string> {
  const stored = await readStored();
  return stored ? String(stored.updatedAt.getTime()) : "0";
}

export async function setPassword(next: string): Promise<void> {
  const db = getDb();
  const hash = await hashPassword(next);
  const now = new Date();
  await db
    .insert(adminCredentials)
    .values({ id: ROW_ID, passwordHash: hash, updatedAt: now })
    .onConflictDoUpdate({
      target: adminCredentials.id,
      set: { passwordHash: hash, updatedAt: now },
    });
  // 방금 바꾼 값이 곧바로 기준이 되어야 한다
  cache = { at: Date.now(), value: { hash, updatedAt: now } };
}

/** 화면 안내용 — 바꾼 적이 있는지, 있다면 언제인지 */
export async function passwordChangedAt(): Promise<Date | null> {
  return (await readStored())?.updatedAt ?? null;
}
