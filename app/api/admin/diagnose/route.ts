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

/**
 * 살펴볼 표 — 화면에 쓰는 이름과 함께.
 *
 * 처음에는 회원 표만 보았다. 그런데 Q&A 표가 잠겼을 때(2026-10-02) 관리자 화면은
 * 「Q&A 목록이 12초 안에 답하지 않았다」고만 했고, 진단은 회원 표만 재고 「정상」이라
 * 했다. 어느 표든 잠길 수 있다 — 전부 잰다.
 */
const TABLES: readonly { name: string; label: string }[] = [
  { name: "members", label: "회원" },
  { name: "qna", label: "Q&A" },
  { name: "applications", label: "지원자" },
  { name: "questions", label: "문제" },
  { name: "documents", label: "업무정보실" },
  { name: "articles", label: "칼럼" },
];

type Holder = { pid: number; table: string; state: string | null; age: number | null; query: string | null };

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
      frozen: [],
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
    findings.push("회원 표에 note(메모) 열이 아직 없습니다 → 「메모 열 만들기」를 누르십시오.");
  }

  /**
   * 3) 표마다 읽어 본다 — 다만 잠금을 기다리지 않는다.
   *
   * 그냥 읽으면 잠긴 표 앞에서 진단까지 15초를 갇히고, 그동안 연결 하나를
   * 붙든다. 연결은 셋뿐이라 셋째 표쯤에서 「잠금 풀기」마저 들어갈 자리가
   * 없어진다. 그래서 1초 안에 자리를 못 잡으면 곧바로 「잠김」으로 친다.
   */
  const frozen: string[] = [];
  const readable: string[] = [];
  for (const t of TABLES) {
    const read = await runQuery(
      db.transaction(async (tx) => {
        await tx.execute(sql`set local lock_timeout = '1s'`);
        await tx.execute(sql`set local statement_timeout = '3s'`);
        const rows = await tx.execute(sql`select count(*)::int as n from ${sql.identifier(t.name)}`);
        return (rows as unknown as { n: number }[])[0]?.n ?? 0;
      }),
      `${t.label} 표 읽기`,
      5_000
    );
    if (read.ok) {
      readable.push(`${t.label} ${read.value}`);
    } else {
      frozen.push(t.label);
    }
  }
  if (frozen.length) {
    healthy = false;
    findings.push(
      `잠겨서 읽히지 않는 표: ${frozen.join(", ")} → 다른 접속이 이 표를 붙들고 있습니다. 「잠금 풀기」를 누르십시오.`
    );
  } else {
    findings.push(`표 읽기: 모두 정상 (${readable.join(" · ")}건)`);
  }

  /**
   * 4) 누가 붙들고 있는가 — 표를 직접 건드리지 않고 잠금 목록에서 본다.
   *
   * 표를 독점한 접속과, 독점하려고 기다리며 줄 앞을 막은 접속(멈춘 ALTER)을
   * 함께 찾는다. 둘 다 그 뒤로 오는 평범한 조회를 줄 세운다. 그 뒤에 선
   * 평범한 조회는 피해자일 뿐이라 여기에 넣지 않는다 — 넣으면 회장 화면에
   * 범인과 피해자가 섞여 보인다.
   */
  const lockRows = await runQuery(
    db.execute(sql`
      select distinct a.pid,
             c.relname as "table",
             a.state,
             extract(epoch from (now() - coalesce(a.xact_start, a.query_start)))::int as age,
             left(a.query, 90) as query
      from pg_locks l
      join pg_class c on c.oid = l.relation and c.relkind in ('r', 'p')
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_stat_activity a on a.pid = l.pid
      where l.pid <> pg_backend_pid()
        and a.datname = current_database()
        and l.mode = 'AccessExclusiveLock'
      order by age desc nulls last
    `),
    "잠금 확인",
    5_000
  );
  const holders: Holder[] = lockRows.ok ? (lockRows.value as unknown as Holder[]) : [];
  if (holders.length) {
    healthy = false;
    const label = (name: string) => TABLES.find((t) => t.name === name)?.label ?? name;
    for (const h of holders) {
      findings.push(
        `${label(h.table)} 표를 붙든 접속: ${h.state ?? "?"} · ${h.age ?? 0}초째 — ${h.query ?? ""}`
      );
    }
  }

  // 5) 오래 멈추거나 열어 둔 채 노는 접속
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
        and backend_type = 'client backend'
        and state <> 'idle'
      order by xact_start nulls last
    `),
    "접속 확인",
    5_000
  );
  const sessions: Session[] = act.ok ? (act.value as unknown as Session[]) : [];
  const stuck = sessions.filter(
    (s) => (s.state ?? "").startsWith("idle in transaction") || (s.age !== null && s.age > 30)
  );
  if (stuck.length) {
    healthy = false;
    findings.push(
      `열어 둔 채 놀거나 30초 넘게 멈춘 접속이 ${stuck.length}개 있습니다 → 「잠금 풀기」를 누르십시오.`
    );
  } else if (act.ok && !holders.length) {
    findings.push("멈춘 접속: 없음");
  }

  return NextResponse.json({ healthy, findings, sessions, frozen, hasNote: names.includes("note") });
}

/**
 * 고치기 — 두 가지만 한다.
 *   unlock: 열어 둔 채 놀거나, 우리 표를 붙든 채 30초 넘게 멈춘 접속을 끊는다
 *   note:   메모 열을 만든다 (잠금 시한을 두어, 못 잡으면 5초 만에 분명히 실패한다)
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "데이터베이스가 연결되지 않았습니다." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const db = getDb();

  if (body.action === "unlock") {
    /**
     * 끊는 것은 둘뿐이다.
     *   - 트랜잭션을 연 채 10초 넘게 놀고 있는 접속 (SQL 편집기에서 끝나지 않은 것)
     *   - 우리 표에 손을 댄 채 30초 넘게 돌고 있는 접속 (멈춘 ALTER 등)
     *
     * 사람이 연 접속(client backend)만 본다. Supabase 가 스스로 돌리는 일꾼
     * (복제·예약 작업)은 건드리지 않는다. 앱의 정상 요청은 1초 안에 끝나고
     * 15초면 서버가 스스로 끊으므로, 위 조건에 걸리지 않는다.
     */
    const out = await runQuery(
      db.execute(sql`
        select pg_terminate_backend(a.pid) as ok, left(a.query, 60) as query
        from pg_stat_activity a
        where a.datname = current_database()
          and a.pid <> pg_backend_pid()
          and a.backend_type = 'client backend'
          and (
            (a.state like 'idle in transaction%' and a.state_change < now() - interval '10 seconds')
            or (
              a.state = 'active'
              and a.xact_start < now() - interval '30 seconds'
              and exists (
                select 1
                from pg_locks l
                join pg_class c on c.oid = l.relation
                join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                where l.pid = a.pid
              )
            )
          )
      `),
      "잠금 풀기",
      8_000
    );
    if (!out.ok) return out.response;
    const rows = out.value as unknown as { ok: boolean; query: string }[];
    return NextResponse.json({
      ok: true,
      terminated: rows.length,
      message: rows.length
        ? `접속 ${rows.length}개를 끊었습니다. 목록을 다시 불러왔습니다.`
        : "끊을 접속이 없었습니다. 붙든 접속이 아직 30초를 넘지 않았을 수 있습니다 — 잠시 뒤 다시 눌러 보십시오.",
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
