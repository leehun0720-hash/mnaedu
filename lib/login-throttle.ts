import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { adminLoginAttempts } from "@/db/schema";

/**
 * 관리자 로그인 무차별 대입 차단.
 *
 * 비밀번호 하나가 공개 URL을 지키므로 두드려 볼 값어치가 있다. 응답을 1초
 * 늦추는 것만으로는 막히지 않는다 — 서버리스는 요청마다 다른 인스턴스라
 * 동시에 백 번 두드리면 총 1초다. 그래서 실패 횟수를 DB에 모아 센다.
 *
 * DB가 없으면(초기 설정 전) 차단은 못 하지만 로그인 자체도 의미가 없으므로
 * 그냥 통과시킨다 — 여기서 던지면 화면이 죽는다.
 */

/** 이 횟수를 넘기면 잠근다 */
const MAX_FAILS = 10;
/** 실패 누적을 세는 창 (분) — 이 시간이 지나면 처음부터 다시 센다 */
const WINDOW_MIN = 15;
/** 잠기는 시간 (분) */
const BLOCK_MIN = 30;

/** 프록시 뒤에서 요청 출처를 읽는다. 못 읽으면 하나로 묶어 센다. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

/** 지금 잠겨 있으면 남은 초를 준다 */
export async function blockedFor(ip: string): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const [row] = await getDb()
      .select()
      .from(adminLoginAttempts)
      .where(eq(adminLoginAttempts.ip, ip))
      .limit(1);
    if (!row?.blockedUntil) return 0;
    const left = row.blockedUntil.getTime() - Date.now();
    return left > 0 ? Math.ceil(left / 1000) : 0;
  } catch (err) {
    console.error("[login] throttle read failed:", err);
    return 0;
  }
}

export async function recordFailure(ip: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    // 창이 지났으면 1부터 다시, 아니면 누적. 한도를 넘는 순간 잠근다.
    await getDb()
      .insert(adminLoginAttempts)
      .values({ ip, fails: 1, firstFailAt: new Date() })
      .onConflictDoUpdate({
        target: adminLoginAttempts.ip,
        set: {
          fails: sql`case
            when ${adminLoginAttempts.firstFailAt} < now() - interval '${sql.raw(String(WINDOW_MIN))} minutes'
            then 1
            else ${adminLoginAttempts.fails} + 1
          end`,
          firstFailAt: sql`case
            when ${adminLoginAttempts.firstFailAt} < now() - interval '${sql.raw(String(WINDOW_MIN))} minutes'
            then now()
            else ${adminLoginAttempts.firstFailAt}
          end`,
          blockedUntil: sql`case
            when ${adminLoginAttempts.fails} + 1 >= ${MAX_FAILS}
            then now() + interval '${sql.raw(String(BLOCK_MIN))} minutes'
            else ${adminLoginAttempts.blockedUntil}
          end`,
        },
      });
  } catch (err) {
    console.error("[login] throttle write failed:", err);
  }
}

/** 성공하면 기록을 지운다 — 정상 사용자가 다음에 벌을 받지 않도록 */
export async function clearFailures(ip: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await getDb().delete(adminLoginAttempts).where(eq(adminLoginAttempts.ip, ip));
  } catch (err) {
    console.error("[login] throttle clear failed:", err);
  }
}
