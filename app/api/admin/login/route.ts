import { NextResponse } from "next/server";
import {
  createSession,
  isAuthConfigured,
  sessionCookie,
  verifyPassword,
  SESSION_MAX_AGE,
} from "@/lib/auth";

/**
 * Deliberately slow and vague: one shared password on a public URL is worth
 * brute-forcing, so a wrong attempt costs a second and the response never
 * distinguishes "no password configured" from "wrong password".
 */
export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "관리자 계정이 아직 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookie(token, SESSION_MAX_AGE));
  return res;
}
