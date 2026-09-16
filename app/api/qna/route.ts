import { NextResponse } from "next/server";
import { isDbConfigured } from "@/db";
import { askedTooOften, createQuestion } from "@/lib/qna-db";
import { readJsonBody, storageFailure } from "@/lib/admin-api";
import { validateQuestion, type QnaInput } from "@/lib/qna";

/**
 * Q&A 질문 접수.
 *
 * 공개된 자리다 — 로그인도 회원도 필요 없다. 다만 보낸 질문이 곧바로
 * 게시판에 서지는 않는다. 회장이 공개를 켜야 선다.
 *
 * 나가는 것은 접수 번호뿐이다. 다른 질문도, 이메일도 이 응답에 실리지 않는다.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "지금은 질문을 받을 수 없습니다. 잠시 후 다시 시도해 주십시오." },
      { status: 503 }
    );
  }

  const body = await readJsonBody<QnaInput>(request);
  if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });

  const parsed = validateQuestion(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (await askedTooOften(parsed.value.name)) {
    return NextResponse.json(
      { error: "짧은 시간에 여러 건이 접수되었습니다. 잠시 후 다시 보내 주십시오." },
      { status: 429 }
    );
  }

  try {
    const id = await createQuestion(parsed.value);
    if (!id) {
      return NextResponse.json({ error: "접수에 실패했습니다. 잠시 후 다시 시도해 주십시오." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, id, secret: parsed.value.secret }, { status: 201 });
  } catch (err) {
    return storageFailure(err, "qna insert");
  }
}
