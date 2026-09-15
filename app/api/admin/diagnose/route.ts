import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { runQuery } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * 데이터베이스 진단 — 관리자 화면이 스스로 무엇이 막혔는지 말하게 한다.
 *
 * 회원 목록이 "12초 안에 답하지 않았다"를 세 번 되풀이했다. 그때마다 밖에서
 * 짐작만 할 수 있었다. 이 경로는 짐작을 없앤다: 표에 손이 닿는지, 무엇이
 * 붙들고 있는지, 열이 제 모양인지를 그 자리에서 재어 사람 말로 돌려준다.
 *
 * 모든 조회에 짧은 시한을 둔다. 진단 자체가 갇히면 아무 소용이 없다.
 */
type Session = {
  pid: number;
  state: string | null;
  age: number | null;
  query: string | null;
  blocked: boolean;
  wait: string | null;
};

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "데이터베이스가 연결되지 않았습니다." }, { status: 503 });

  const db = getDb();
  const findings: string[] = [];
  let healthy = true;

  // 1) 데이터베이스에 손이 닿는가
  const t0 = Date.now();
  const ping = await runQuery(db.execute(sql`select 1`), "연결 확인", 5_000);
  if (!ping.ok) {
    return NextResponse.json({
      healthy: false,
      findings: ["데이터베이스 자체에 닿지 않습니다. Supabase 프로젝트가 멈춰 있거나 재시작 중일 수 있습니다."],
      sessions: [],
    });
  }
  findings.push(`데이터베이스 연결: 정상 (${Date.now() - t0}ms)`);

  // 2) 회원 표의 열이 제 모양인가
  const cols = await runQuery(
    db.execute(sql`select column_name from information_schema.columns where table_name = 'members'`),
    "열 확인",
    5_000
  );
  const names = cols.ok ? (cols.value as unknown as { column_name: string }[]).map((r) => r.column_name) : [];
  if (cols.ok && !names.includes("note")) {
    healthy = false;
    findings.push("회원 표에 note(메모) 열이 아직 없습니다 → 아래 「메모 열 만들기」를 누르십시오.");
  } else if (cols.ok) {
    findings.push("회원 표 열: 정상 (note 있음)");
  }

  // 3) 회원 표를 실제로 읽을 수 있는가 — 짧게 기다린다
  const t1 = Date.now();
  const count = await runQuery(db.execute(sql`select count(*)::int as n from members`), "회원 표 읽기", 4_000);
  if (count.ok) {
    const n = (count.value as unknown as { n: number }[])[0]?.n ?? 0;
    findings.push(`회원 표 읽기: 정상 (${Date.now() - t1}ms, ${n}명)`);
  } else {
    healthy = false;
    findings.push("회원 표 읽기: 4초 안에 답하지 않았습니다 → 아래 접속 중 무언가가 표를 붙들고 있습니다.");
  }

  // 4) 무엇이 표를 붙들고 있는가
  const act = await runQuery(
    db.execute(sql`
      select pid,
             state,
             extract(epoch from (now() - xact_start))::int as age,
             left(query, 90) as query,
             cardinality(pg_blocking_pids(pid)) > 0 as blocked,
             wait_event_type as wait
      from pg_stat_activity
      where datname = current_database()
        and pid <> pg_backend_pid()
        and state <> 'idle'
      order by xact_start nulls last
    `),
    "접속 확인",
    5_000
  );
  const sessions: Session[] = act.ok ? (act.value as unknown as Session[]) : [];
  const stuck = sessions.filter(
    (s) => s.state === "idle in transaction" || (s.age !== null && s.age > 30)
  );
  if (stuck.length) {
    healthy = false;
    findings.push(
      `표를 붙들고 있거나 30초 넘게 멈춘 접속이 ${stuck.length}개 있습니다 → 아래 「잠금 풀기」를 누르십시오.`
    );
  } else if (act.ok) {
    findings.push("멈춘 접속: 없음");
  }

  return NextResponse.json({ healthy, findings, sessions, hasNote: names.includes("note") });
}

/**
 * 고치기 — 두 가지만 한다.
 *   unlock: 놀고 있거나 30초 넘게 멈춘 접속을 끊는다 (앱의 정상 요청은 1초 안에 끝나므로 걸리지 않는다)
 *   note:   메모 열을 만든다 (잠금 시한을 두어, 못 잡으면 5초 만에 분명히 실패한다)
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "데이터베이스가 연결되지 않았습니다." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const db = getDb();

  if (body.action === "unlock") {
    const out = await runQuery(
      db.execute(sql`
        select pg_terminate_backend(pid) as ok, left(query, 60) as query
        from pg_stat_activity
        where datname = current_database()
          and pid <> pg_backend_pid()
          and (state = 'idle in transaction'
               or (state = 'active' and xact_start < now() - interval '30 seconds'))
      `),
      "잠금 풀기",
      8_000
    );
    if (!out.ok) return out.response;
    const rows = out.value as unknown as { ok: boolean; query: string }[];
    return NextResponse.json({
      ok: true,
      terminated: rows.length,
      message: rows.length ? `접속 ${rows.length}개를 끊었습니다. 「진단」을 다시 눌러 확인하십시오.` : "끊을 접속이 없었습니다.",
    });
  }

  if (body.action === "note") {
    // 트랜잭션 하나로 묶는다. 풀러(Supavisor)는 문장마다 다른 연결을 줄 수
    // 있어, 따로 보낸 SET 은 ALTER 에 닿지 않는다. 트랜잭션은 한 연결에 붙는다.
    const out = await runQuery(
      db.transaction(async (tx) => {
        await tx.execute(sql`set local lock_timeout = '5s'`);
        await tx.execute(sql`alter table "members" add column if not exists "note" text`);
      }),
      "메모 열 만들기",
      10_000
    );
    if (!out.ok) return out.response;
    return NextResponse.json({ ok: true, message: "메모 열을 만들었습니다. 「진단」을 다시 눌러 확인하십시오." });
  }

  return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
}
