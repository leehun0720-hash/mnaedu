import "server-only";

import { inArray, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { adminLoginAttempts } from "@/db/schema";

/**
 * 관리자 로그인 무차별 대입 차단.
 *
 * 비밀번호 하나가 공개 URL을 지키므로 두드려 볼 값어치가 있다. 응답을 1초
 * 늦추는 것만으로는 막히지 않는다 — 서버리스는 요청마다 다른 인스턴스라
 * 동시에 백 번 두드리면 총 1초다. 그래서 실패 횟수를 DB에 모아 센다.
 *
 * ── 세는 단위가 둘인 이유 ──────────────────────────────────────────
 * 출처 IP별로만 세면 프록시나 봇넷으로 주소를 갈아 가며 두드리는 공격에는
 * 무력하다 — 시도마다 새 주소면 카운터가 매번 1에서 다시 시작한다. 그래서
 * 전체 실패도 함께 센다. 관리자는 한 사람뿐이라 전역 한도를 두어도 정상
 * 사용을 방해하지 않는다.
 *
 * 전역 잠금은 일부러 실패시켜 회장을 잠그는 방해(DoS)에 쓰일 수 있으므로,
 * 한도는 넉넉히 두고 잠기는 시간은 짧게 잡는다 — IP별 잠금(오래)과
 * 전역 잠금(짧게)의 역할이 다르다.
 */

/** IP별 — 이 횟수를 넘기면 오래 잠근다 */
const MAX_FAILS = 10;
const BLOCK_MIN = 30;

/** 전역 — 주소를 갈아 가며 두드리는 공격을 여기서 잡는다 */
const GLOBAL_KEY = "__global__";
const GLOBAL_MAX_FAILS = 30;
const GLOBAL_BLOCK_MIN = 5;

/** 실패 누적을 세는 창 (분) — 이 시간이 지나면 처음부터 다시 센다 */
const WINDOW_MIN = 15;

/** 프록시 뒤에서 요청 출처를 읽는다. 못 읽으면 하나로 묶어 센다. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  const ip = first || request.headers.get("x-real-ip") || "unknown";
  // 전역 카운터 자리를 IP가 차지하지 못하게 한다
  return ip === GLOBAL_KEY ? "unknown" : ip;
}

/** 지금 잠겨 있으면 남은 초를 준다 (IP별·전역 중 더 오래 남은 쪽) */
export async function blockedFor(ip: string): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const rows = await getDb()
      .select()
      .from(adminLoginAttempts)
      .where(inArray(adminLoginAttempts.ip, [ip, GLOBAL_KEY]));

    let left = 0;
    for (const row of rows) {
      if (!row.blockedUntil) continue;
      left = Math.max(left, row.blockedUntil.getTime() - Date.now());
    }
    return left > 0 ? Math.ceil(left / 1000) : 0;
  } catch (err) {
    console.error("[login] throttle read failed:", err);
    return 0;
  }
}

/**
 * 실패 한 건을 IP별과 전역 양쪽에 기록한다.
 *
 * 창이 지났으면 1부터 다시, 아니면 누적. 한도를 넘는 순간 잠근다. 계산을
 * 전부 SQL 안에서 하므로 동시에 들어온 시도가 서로의 증가분을 덮어쓰지
 * 않는다 — 읽고 쓰는 사이가 없다.
 */
async function bump(key: string, maxFails: number, blockMin: number): Promise<void> {
  await getDb()
    .insert(adminLoginAttempts)
    .values({ ip: key, fails: 1, firstFailAt: new Date() })
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
          when ${adminLoginAttempts.firstFailAt} >= now() - interval '${sql.raw(String(WINDOW_MIN))} minutes'
               and ${adminLoginAttempts.fails} + 1 >= ${maxFails}
          then now() + interval '${sql.raw(String(blockMin))} minutes'
          else ${adminLoginAttempts.blockedUntil}
        end`,
      },
    });
}

export async function recordFailure(ip: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await bump(ip, MAX_FAILS, BLOCK_MIN);
    await bump(GLOBAL_KEY, GLOBAL_MAX_FAILS, GLOBAL_BLOCK_MIN);
  } catch (err) {
    // DB가 흔들려도 로그인 화면 자체는 살아 있어야 한다
    console.error("[login] throttle write failed:", err);
  }
}

/**
 * 성공하면 기록을 지운다 — 정상 사용자가 다음에 벌을 받지 않도록.
 * 전역 카운터도 함께 지운다: 비밀번호를 아는 사람이 들어왔다면 그때까지의
 * 실패는 오타였다고 보는 편이 맞고, 그러지 않으면 회장이 자기 실패 때문에
 * 잠기는 일이 쌓인다.
 */
export async function clearFailures(ip: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await getDb()
      .delete(adminLoginAttempts)
      .where(inArray(adminLoginAttempts.ip, [ip, GLOBAL_KEY]));
  } catch (err) {
    console.error("[login] throttle clear failed:", err);
  }
}
