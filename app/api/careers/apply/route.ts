import { NextResponse } from "next/server";
import { isDbConfigured } from "@/db";
import { appliedRecently, createApplication } from "@/lib/applications";
import { readJsonBody, storageFailure } from "@/lib/admin-api";
import { validateApply, type ApplyInput } from "@/lib/recruit";

/**
 * 직원채용 지원 접수.
 *
 * 공개된 자리다 — 로그인도 회원도 필요 없다. 응시자가 문제를 풀고 이 문으로
 * 지원 의사를 보낸다.
 *
 * 나가는 것은 접수 번호뿐이다. 채점 결과도, 정답도, 다른 지원자의 흔적도
 * 이 응답에 실리지 않는다.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "지금은 접수를 받을 수 없습니다. 잠시 후 다시 시도해 주십시오." },
      { status: 503 }
    );
  }

  const body = await readJsonBody<ApplyInput>(request);
  if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });

  const parsed = validateApply(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (await appliedRecently(parsed.value.email)) {
    return NextResponse.json(
      { error: "같은 이메일로 이미 접수되었습니다. 수정이 필요하시면 문의로 알려 주십시오." },
      { status: 409 }
    );
  }

  try {
    const id = await createApplication(parsed.value);
    if (!id) {
      return NextResponse.json({ error: "접수에 실패했습니다. 잠시 후 다시 시도해 주십시오." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return storageFailure(err, "application insert");
  }
}
