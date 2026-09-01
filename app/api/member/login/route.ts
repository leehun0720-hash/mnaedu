import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members } from "@/db/schema";
import {
  createMemberSession,
  isMemberAuthConfigured,
  memberCookie,
  verifyPassword,
  MEMBER_SESSION_MAX_AGE,
} from "@/lib/member-auth";

export async function POST(request: Request) {
  if (!isDbConfigured() || !isMemberAuthConfigured()) {
    return NextResponse.json(
      { error: "회원 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 }
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as Record<string, unknown>;
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  // One message for both failures: telling them which half was wrong would
  // turn this endpoint into a way to find out who has an account here.
  const reject = () =>
    NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );

  if (!email || !password) return reject();

  try {
    const db = getDb();
    const [member] = await db
      .select({ id: members.id, name: members.name, passwordHash: members.passwordHash })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (!member || !(await verifyPassword(password, member.passwordHash))) {
      await new Promise((r) => setTimeout(r, 600));
      return reject();
    }

    await db
      .update(members)
      .set({ lastLoginAt: new Date() })
      .where(eq(members.id, member.id));

    const token = await createMemberSession(member.id);
    const res = NextResponse.json({ ok: true, name: member.name });
    res.headers.set("Set-Cookie", memberCookie(token, MEMBER_SESSION_MAX_AGE));
    return res;
  } catch (err) {
    console.error("[member/login]", err);
    return NextResponse.json({ error: "로그인 처리 중 문제가 발생했습니다." }, { status: 500 });
  }
}
