import "server-only";

import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { adminCredentials } from "@/db/schema";
import { withDeadline } from "@/lib/deadline";
import { hashPassword } from "@/lib/password-hash";

/**
 * 관리자 비밀번호 저장소.
 *
 * 바뀐 적이 없으면 환경변수가 기준이고, 한 번이라도 바꾸셨으면 이곳의 해시가
 * 기준이 된다. 그래서 지금까지 쓰시던 비밀번호로도 그대로 들어오실 수 있고,
 * 바꾸신 다음부터는 새 비밀번호만 통한다.
 */

const ROW_ID = 1;

export type Stored = { hash: string; updatedAt: Date } | null;

/**
 * 읽어 본 결과.
 *
 * "바꾸신 적이 없다"(read: true, stored: null)와 "읽지 못했다"(read: false)는
 * 다르다. 둘을 뭉뚱그리면 데이터베이스가 잠깐 흔들린 사이에 세션 세대가 "0"으로
 * 보이고, 그러면 이미 들어와 계신 회장이 그 자리에서 문 밖으로 밀려난다.
 */
export type Lookup = { read: boolean; stored: Stored };

/**
 * 세션을 확인할 때마다 읽으므로 아주 잠깐 들고 있는다.
 * 오래 들고 있으면 비밀번호를 바꿔도 옛 세션이 남고, 아예 안 들고 있으면
 * 화면을 열 때마다 데이터베이스를 두드린다. 그 사이를 15초로 잡았다.
 */
const CACHE_MS = 15_000;

/**
 * 실패도 잠깐은 기억한다. 표가 아직 없는 동안(setup.sql 미실행) 기억하지
 * 않으면 관리자 화면의 요청마다 실패할 조회를 한 번씩 더 하게 된다.
 * 다만 성공보다 짧게 잡는다 — 데이터베이스가 돌아오면 곧 알아채야 한다.
 */
const FAILURE_CACHE_MS = 5_000;

/**
 * 이 조회는 관리자 요청이 모두 지나는 길목이다. 오래 붙들면 화면이 멎으므로
 * 시한을 둔다. 넘기면 '읽지 못했다'로 물러나고, 그때는 환경변수가 기준이 된다.
 */
const DEADLINE_MS = 2_500;

let cache: { at: number; value: Lookup } | null = null;

function fresh(): Lookup | null {
  if (!cache) return null;
  const ttl = cache.value.read ? CACHE_MS : FAILURE_CACHE_MS;
  return Date.now() - cache.at < ttl ? cache.value : null;
}

async function query(): Promise<Lookup> {
  try {
    const [row] = await getDb()
      .select({ hash: adminCredentials.passwordHash, updatedAt: adminCredentials.updatedAt })
      .from(adminCredentials)
      .where(eq(adminCredentials.id, ROW_ID))
      .limit(1);
    return { read: true, stored: row ? { hash: row.hash, updatedAt: row.updatedAt } : null };
  } catch (err) {
    // 표가 아직 없을 수 있다(setup.sql 미실행) — 그때는 환경변수로 들어오신다
    console.error("[admin] password lookup failed:", err);
    return { read: false, stored: null };
  }
}

export async function lookupStored(): Promise<Lookup> {
  // 데이터베이스 자체가 없는 배포에서는 '바꾼 적이 없다'가 맞는 답이다
  if (!isDbConfigured()) return { read: true, stored: null };

  const hit = fresh();
  if (hit) return hit;

  const value = await withDeadline<Lookup>(
    query(),
    DEADLINE_MS,
    { read: false, stored: null },
    "admin password lookup"
  );
  cache = { at: Date.now(), value };
  return value;
}

/**
 * 세션에 새겨 두는 값 — 비밀번호가 바뀌면 달라져, 옛 세션이 한꺼번에 끊긴다.
 * 기준을 읽지 못했으면 null이다. 모르는 것을 "0"이라고 단정하면 멀쩡한 세션이
 * 끊기므로, 부르는 쪽이 그 확인만 건너뛰게 한다.
 */
export async function credentialVersion(): Promise<string | null> {
  const { read, stored } = await lookupStored();
  if (!read) return null;
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
  cache = { at: Date.now(), value: { read: true, stored: { hash, updatedAt: now } } };
}
