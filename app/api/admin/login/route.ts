import { NextResponse } from "next/server";
import {
  createSession,
  isAuthConfigured,
  sessionCookie,
  verifyPassword,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { blockedFor, clearFailures, clientIp, recordFailure } from "@/lib/login-throttle";

export const dynamic = "force-dynamic";

/**
 * 관리자 로그인.
 *
 * 비밀번호 하나가 공개 URL을 지키므로 두드려 볼 값어치가 있다. 방어는 두
 * 가지다 — 실패를 DB에 세어 일정 횟수를 넘기면 잠그고(lib/login-throttle),
 * 실패 응답은 언제나 같은 문구를 돌려준다. "설정되지 않았다"와 "틀렸다"를
 * 구분해 주면 계정이 아직 비어 있다는 사실이 새어 나간다.
 */
const WRONG = { error: "비밀번호가 올바르지 않습니다." };

export async function POST(request: Request) {
  const ip = clientIp(request);

  const wait = await blockedFor(ip);
  if (wait > 0) {
    return NextResponse.json(
      { error: `로그인 시도가 많아 잠시 잠겼습니다. ${Math.ceil(wait / 60)}분 뒤에 다시 시도해 주십시오.` },
      { status: 429, headers: { "Retry-After": String(wait) } }
    );
  }

  if (!isAuthConfigured()) {
    // 미설정 상태를 알려 주지 않는다 — 화면 쪽에서 별도로 안내한다
    await recordFailure(ip);
    return NextResponse.json(WRONG, { status: 401 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    await recordFailure(ip);
    return NextResponse.json(WRONG, { status: 401 });
  }

  await clearFailures(ip);
  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookie(token, SESSION_MAX_AGE));
  return res;
}
