import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, count, desc, sql, type SQL } from "drizzle-orm";
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
 * 회원 명단 — 보기 전용.
 *
 * 등급도 포인트도 없으므로 조정할 것이 없다. 이 화면의 쓸모는 하나 —
 * 정답과 해설을 누가 보고 있는지 아는 것이다. 그래서 목록과 검색만 둔다.
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
  // 이름을 안 넣은 회원이 많으므로 이메일과 이름을 함께 훑는다
  if (q) filters.push(sql`(${members.email} ILIKE ${`%${q}%`} OR ${members.name} ILIKE ${`%${q}%`})`);
  const where = filters.length ? and(...filters) : undefined;

  const db = getDb();
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: members.id,
        email: members.email,
        name: members.name,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(where)
      .orderBy(desc(members.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(members).where(where),
  ]);

  return NextResponse.json({
    members: rows,
    total: totals?.value ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
