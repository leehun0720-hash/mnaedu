import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionCookie } from "@/lib/auth";
import { createSession, verifyPassword, verifySession } from "@/lib/admin-auth";
import { passwordChangedAt, setPassword } from "@/lib/admin-password";
import { checkNewPassword, passwordProblemMessage } from "@/lib/password-hash";

export const dynamic = "force-dynamic";

/**
 * 관리자 비밀번호 변경.
 *
 * 들어와 있다는 것만으로는 부족하다 — 자리를 비운 사이 열린 화면을 누군가
 * 만졌을 수 있으므로, 바꾸실 때 지금 비밀번호를 한 번 더 받는다.
 *
 * 바꾸고 나면 다른 곳에 남아 있던 세션은 모두 끊기고, 바꾸신 이 화면에만
 * 새 세션을 다시 내어 준다.
 */
async function requireAdmin(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const changedAt = await passwordChangedAt();
  return NextResponse.json({
    changedAt: changedAt ? changedAt.toISOString() : null,
    // 아직 바꾼 적이 없으면 배포 설정의 값으로 들어오고 계신 것이다
    usingEnv: changedAt === null,
  });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않아 비밀번호를 저장할 수 없습니다." },
      { status: 503 }
    );
  }

  let current = "";
  let next = "";
  try {
    const body = (await request.json()) as { current?: unknown; next?: unknown };
    current = typeof body?.current === "string" ? body.current : "";
    next = typeof body?.next === "string" ? body.next : "";
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!(await verifyPassword(current))) {
    return NextResponse.json({ error: "지금 쓰시는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const problem = checkNewPassword(next, current);
  if (problem) {
    return NextResponse.json({ error: passwordProblemMessage(problem) }, { status: 400 });
  }

  try {
    await setPassword(next);
  } catch (err) {
    console.error("[admin] password change failed:", err);
    return NextResponse.json(
      { error: "비밀번호를 저장하지 못했습니다. supabase/setup.sql을 실행했는지 확인해 주십시오." },
      { status: 500 }
    );
  }

  // 바꾸는 순간 예전 세션은 모두 무효가 된다 — 이 화면만 새로 발급받는다
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookie(await createSession(), SESSION_MAX_AGE));
  return res;
}
