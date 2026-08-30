import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

const PAGE_SIZE = 20;

/**
 * 회원 관리 — 등급(무료/유료)과 포인트를 회장이 직접 조정한다.
 *
 * 결제 연결 전까지 유료 전환은 수동이므로(보고서 9장), 그 조작을 SQL이 아니라
 * 관리자 화면에서 하도록 열어 둔다. 회원이 늘어도 화면이 감당하도록 이름·이메일
 * 검색과 등급 필터로 좁혀서 한 페이지씩 보낸다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ members: [], total: 0, page: 1, freeCount: 0, paidCount: 0 });
  }

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const tier = params.get("tier") ?? ""; // free | paid
  const page = Math.max(1, Number(params.get("page")) || 1);

  const filters: SQL[] = [];
  // 이름을 안 넣은 회원이 많으므로 이메일과 이름을 함께 훑는다
  if (q) filters.push(sql`(${members.email} ILIKE ${`%${q}%`} OR ${members.name} ILIKE ${`%${q}%`})`);
  if (tier === "free" || tier === "paid") filters.push(eq(members.tier, tier));
  const where = filters.length ? and(...filters) : undefined;

  const db = getDb();
  const [rows, [totals], [free], [paid]] = await Promise.all([
    db
      .select({
        id: members.id,
        email: members.email,
        name: members.name,
        tier: members.tier,
        points: members.points,
        clearedLevel: members.clearedLevel,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(where)
      .orderBy(desc(members.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(members).where(where),
    db.select({ value: count() }).from(members).where(eq(members.tier, "free")),
    db.select({ value: count() }).from(members).where(eq(members.tier, "paid")),
  ]);

  return NextResponse.json({
    members: rows,
    total: totals?.value ?? 0,
    page,
    pageSize: PAGE_SIZE,
    freeCount: free?.value ?? 0,
    paidCount: paid?.value ?? 0,
  });
}

/** 등급·포인트 수정 — {id, tier?, points?} */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });

  let id: number;
  let tier: string | undefined;
  let points: number | undefined;
  try {
    const json = (await request.json()) as { id?: unknown; tier?: unknown; points?: unknown };
    id = Number(json.id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("bad id");
    if (json.tier != null) {
      tier = String(json.tier);
      if (tier !== "free" && tier !== "paid") throw new Error("bad tier");
    }
    if (json.points != null) {
      points = Math.round(Number(json.points));
      if (!Number.isFinite(points) || points < 0 || points > 1_000_000) throw new Error("bad points");
    }
  } catch {
    return NextResponse.json({ error: "등급은 무료/유료, 포인트는 0 이상이어야 합니다." }, { status: 400 });
  }

  if (tier === undefined && points === undefined) {
    return NextResponse.json({ error: "바꿀 항목이 없습니다." }, { status: 400 });
  }

  const [row] = await getDb()
    .update(members)
    .set({
      ...(tier !== undefined ? { tier } : {}),
      ...(points !== undefined ? { points } : {}),
      updatedAt: new Date(),
    })
    .where(eq(members.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
