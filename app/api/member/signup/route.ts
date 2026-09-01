import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members } from "@/db/schema";
import {
  createMemberSession,
  hashPassword,
  isMemberAuthConfigured,
  memberCookie,
  validateEmail,
  validatePassword,
  MEMBER_SESSION_MAX_AGE,
} from "@/lib/member-auth";

/** Registration is free. It exists to know who is reading, not to charge. */
export async function POST(request: Request) {
  if (!isDbConfigured() || !isMemberAuthConfigured()) {
    return NextResponse.json(
      { error: "회원 기능이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 }
    );
  }

  let email = "";
  let password = "";
  let name = "";
  let company: string | null = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    password = typeof body.password === "string" ? body.password : "";
    name = typeof body.name === "string" ? body.name.trim() : "";
    const org = typeof body.company === "string" ? body.company.trim() : "";
    company = org ? org.slice(0, 120) : null;
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }
  if (!validateEmail(email)) {
    return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  }
  const passwordProblem = validatePassword(password);
  if (passwordProblem) {
    return NextResponse.json({ error: passwordProblem }, { status: 400 });
  }

  try {
    const db = getDb();
    const existing = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다. 로그인해 주세요." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(members)
      .values({ email, passwordHash, name, company })
      .returning({ id: members.id, name: members.name });

    const token = await createMemberSession(created.id);
    const res = NextResponse.json({ ok: true, name: created.name });
    res.headers.set("Set-Cookie", memberCookie(token, MEMBER_SESSION_MAX_AGE));
    return res;
  } catch (err) {
    // The unique index is the real guard; a race lands here
    const message = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(message)) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다. 로그인해 주세요." },
        { status: 409 }
      );
    }
    console.error("[member/signup]", err);
    return NextResponse.json({ error: "가입 처리 중 문제가 발생했습니다." }, { status: 500 });
  }
}
