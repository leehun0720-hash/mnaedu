import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { readJsonBody, runQuery } from "@/lib/admin-api";
import { canManageAccounts, deleteAuthUser } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export const PAGE_SIZE = 20;

/**
 * 회원 관리.
 *
 * 등급도 포인트도 결제도 없다. 그래서 여기서 하는 일은 넷뿐이다 — 누가 있는지
 * 찾고, 이름을 바로잡고, 회장만 보는 메모를 남기고, 명단에서 지우는 것.
 *
 * 신원 자체(비밀번호·이메일 인증)는 Supabase Auth가 쥐고 있으므로 여기서
 * 건드리지 않는다. 이 표는 "우리 쪽 명단"이고, 지운다는 것은 명단에서
 * 내린다는 뜻이지 계정을 없앤다는 뜻이 아니다 — 화면에서도 그렇게 말한다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ members: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  }

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const page = Math.max(1, Number(params.get("page")) || 1);

  const filters: SQL[] = [];
  // 이름을 안 넣은 회원이 많으므로 이메일·이름·메모를 함께 훑는다
  if (q) {
    filters.push(
      sql`(${members.email} ILIKE ${`%${q}%`} OR ${members.name} ILIKE ${`%${q}%`} OR ${members.note} ILIKE ${`%${q}%`})`
    );
  }
  const where = filters.length ? and(...filters) : undefined;

  const db = getDb();
  const out = await runQuery(
    Promise.all([
      db
        .select({
          id: members.id,
          email: members.email,
          name: members.name,
          note: members.note,
          createdAt: members.createdAt,
        })
        .from(members)
        .where(where)
        .orderBy(desc(members.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db.select({ value: count() }).from(members).where(where),
    ]),
    "회원 목록"
  );
  if (!out.ok) return out.response;
  const [rows, [totals]] = out.value;

  return NextResponse.json({
    members: rows,
    total: totals?.value ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

type Payload = { id?: number; name?: string; note?: string };

/** 이름 바로잡기와 메모 — 이메일은 신원이라 여기서 바꾸지 않는다 */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "데이터베이스가 연결되지 않았습니다." }, { status: 503 });
  }

  const body = await readJsonBody<Payload>(request);
  if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
  }

  const out = await runQuery(
    getDb()
      .update(members)
      .set({
        name: (body.name ?? "").trim().slice(0, 100) || null,
        note: (body.note ?? "").trim().slice(0, 500) || null,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id))
      .returning({ id: members.id }),
    "회원 수정"
  );
  if (!out.ok) return out.response;

  if (!out.value[0]) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/**
 * 회원을 지운다.
 *
 * 명단(우리 표)과 계정(Supabase Auth)은 다른 것이다. 관리 키가 설정돼 있으면
 * 둘 다 지운다 — 그래야 "지웠는데 로그인이 된다"는 일이 없다. 키가 없으면
 * 명단에서만 내리고, 응답에 그 사실(account: false)을 실어 화면이 그대로
 * 말하게 한다.
 *
 * 계정을 먼저 지운다. 명단만 지워 놓고 계정이 남으면 그분이 다시 들어오실 때
 * 명단에 새로 올라와, 지운 적이 없는 것처럼 보이기 때문이다.
 */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "데이터베이스가 연결되지 않았습니다." }, { status: 503 });
  }

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
  }

  const found = await runQuery(
    getDb().select({ authId: members.authId }).from(members).where(eq(members.id, id)).limit(1),
    "회원 확인"
  );
  if (!found.ok) return found.response;
  const authId = found.value[0]?.authId;
  if (!authId) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });

  const account = await deleteAuthUser(authId);

  const out = await runQuery(getDb().delete(members).where(eq(members.id, id)), "회원 삭제");
  if (!out.ok) return out.response;

  return NextResponse.json({
    ok: true,
    /** 참이면 계정까지 지웠다. 거짓이면 명단에서만 내렸다. */
    account,
    /** 계정까지 지울 수 있는 상태인가 — 화면이 안내 문구를 고르는 데 쓴다 */
    canManageAccounts: canManageAccounts(),
  });
}
