import { NextResponse } from "next/server";
import { isDbConfigured } from "@/db";
import { createInquiry, inquiredTooOften } from "@/lib/inquiries-db";
import { readJsonBody, storageFailure } from "@/lib/admin-api";
import { validateInquiry, type InquiryInput } from "@/lib/inquiry";

/**
 * 상담 신청 접수.
 *
 * 공개된 자리다 — 로그인도 회원도 필요 없다. 나가는 것은 접수 번호뿐이다.
 * 다른 신청도, 회장 메모도 이 응답에 실리지 않는다.
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "지금은 온라인 접수를 받을 수 없습니다. 전화나 이메일로 연락해 주십시오." },
      { status: 503 }
    );
  }

  const body = await readJsonBody<InquiryInput>(request);
  if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });

  const parsed = validateInquiry(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (await inquiredTooOften(parsed.value.email)) {
    return NextResponse.json(
      { error: "짧은 시간에 여러 건이 접수되었습니다. 잠시 후 다시 보내 주십시오." },
      { status: 429 }
    );
  }

  try {
    const id = await createInquiry(parsed.value);
    if (!id) {
      return NextResponse.json({ error: "접수에 실패했습니다. 잠시 후 다시 시도해 주십시오." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return storageFailure(err, "inquiry insert");
  }
}
