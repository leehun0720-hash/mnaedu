import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { pointLedger } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * 한 회원의 포인트 내역.
 *
 * 잔액만으로는 "왜 이 숫자인가"에 답할 수 없다. 가입 축하·퀴즈 통과·해설
 * 열람·관리자 조정이 각각 언제 얼마였는지 여기서 확인한다 — 회원이 포인트를
 * 문의했을 때 근거가 되는 화면이다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ entries: [] });

  const memberId = Number(new URL(request.url).searchParams.get("memberId"));
  if (!Number.isInteger(memberId) || memberId <= 0) {
    return NextResponse.json({ error: "회원을 지정해 주십시오." }, { status: 400 });
  }

  const entries = await getDb()
    .select()
    .from(pointLedger)
    .where(eq(pointLedger.memberId, memberId))
    .orderBy(desc(pointLedger.createdAt))
    .limit(50);

  return NextResponse.json({ entries });
}
