import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAnswers } from "@/lib/questions";
import { MEMBER_COOKIE, readMemberSession } from "@/lib/member-auth";

/**
 * The one place an answer leaves the server. Everything upstream of this —
 * the page payload, the question list — is answer-free by construction, so a
 * failure here withholds an answer rather than leaking one.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const memberId = await readMemberSession(jar.get(MEMBER_COOKIE)?.value);

  if (memberId === null) {
    return NextResponse.json(
      { error: "정답과 해설은 회원에게만 공개됩니다.", needsMember: true },
      { status: 401 }
    );
  }

  let ids: number[] = [];
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((v): v is number => typeof v === "number").slice(0, 50);
    }
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "문제를 지정해 주세요." }, { status: 400 });
  }

  try {
    return NextResponse.json({ answers: await getAnswers(ids) });
  } catch (err) {
    console.error("[answers]", err);
    return NextResponse.json({ error: "해설을 불러오지 못했습니다." }, { status: 500 });
  }
}
