import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * 회원 관리 — 등급(무료/유료)과 포인트를 회장이 직접 조정한다.
 *
 * 결제 연결 전까지 유료 전환은 수동이므로(보고서 9장), 그 조작을 SQL이 아니라
 * 관리자 화면에서 하도록 열어 둔다. 테스트 계정의 등급을 바꿔 가며 무료/유료
 * 화면을 비교하는 용도로도 쓴다.
 */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ members: [] });

  const rows = await getDb()
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
    .orderBy(desc(members.createdAt))
    .limit(200);

  return NextResponse.json({ members: rows });
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
