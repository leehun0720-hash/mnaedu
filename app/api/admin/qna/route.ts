import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { readJsonBody, runQuery, storageFailure } from "@/lib/admin-api";
import { createAdminQna, deleteQna, ensureDefaultFaqs, importDefaultFaqs, listQna, updateQna } from "@/lib/qna-db";
import { FAQS } from "@/lib/company";
import { QNA_LIMITS, validateAnswer } from "@/lib/qna";

/**
 * Q&A 관리 — 관리자 전용.
 *
 * 이 문 뒤에는 질문자의 이름과 이메일, 그리고 비밀글이 있다. 세션 확인을
 * 통과하지 못하면 어떤 형태로도 한 글자가 나가지 않는다.
 */

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

function guardStorage() {
  if (isDbConfigured()) return null;
  return NextResponse.json(
    { error: "데이터베이스가 연결되지 않았습니다. SUPABASE.md의 절차로 연결해 주십시오." },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const state = (params.get("state") ?? "").trim();
  const page = Math.max(1, Number(params.get("page")) || 1);

  // 처음 여섯 질문이 아직 표에 없으면 넣어 둔다 — 목록에서 고치고 지우실 수 있게
  await ensureDefaultFaqs().catch((err) => console.error("[admin] faq seed failed:", err));
  const listed = await runQuery(listQna(q, state, page), "Q&A 목록");
  if (!listed.ok) return listed.response;
  return NextResponse.json(listed.value);
}

type NewQna = { title?: string; body?: string; answer?: string; faq?: boolean; action?: string };

/**
 * 회장이 직접 올리는 Q&A, 그리고 지운 처음 질문 되살리기.
 *
 * 방문자가 쓰는 /api/qna 와 문이 다르다. 이쪽은 세션을 통과해야 하고,
 * 처음부터 발행 상태로 선다.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const body = await readJsonBody<NewQna>(request);
  if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });

  if (body.action === "import-faqs") {
    try {
      const added = await importDefaultFaqs(FAQS);
      return NextResponse.json({
        ok: true,
        added,
        message: added
          ? `처음 질문 ${added}건을 되살렸습니다. 오늘 날짜로 맨 위에 섭니다.`
          : "되살릴 것이 없습니다 — 처음 여섯 질문이 모두 그대로 있습니다.",
      });
    } catch (err) {
      return storageFailure(err, "faq import");
    }
  }

  const title = (body.title ?? "").trim();
  if (title.length < 4) return NextResponse.json({ error: "질문을 네 글자 이상 적어 주십시오." }, { status: 400 });
  if (title.length > QNA_LIMITS.title) return NextResponse.json({ error: "질문이 너무 깁니다." }, { status: 400 });

  const parsedAnswer = validateAnswer(body.answer ?? "");
  if ("error" in parsedAnswer) return NextResponse.json({ error: parsedAnswer.error }, { status: 400 });
  if (!parsedAnswer.value) return NextResponse.json({ error: "답변을 적어 주십시오." }, { status: 400 });

  // 본문을 따로 적지 않으셨으면 질문을 그대로 둔다 — 빈 본문은 화면에서 어색하다
  const text = (body.body ?? "").trim() || title;
  if (text.length > QNA_LIMITS.body) return NextResponse.json({ error: "내용이 너무 깁니다." }, { status: 400 });

  try {
    // 첫 글을 올리시는 순간 처음 여섯이 자리를 내주던 일을 막는다 — 먼저 넣어 두고 올린다
    await ensureDefaultFaqs().catch((err) => console.error("[admin] faq seed failed:", err));
    const id = await createAdminQna({
      title,
      body: text,
      answer: parsedAnswer.value,
      faq: Boolean(body.faq),
    });
    if (!id) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 503 });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return storageFailure(err, "qna insert (admin)");
  }
}

type Patch = { id?: number; answer?: string | null; published?: boolean; secret?: boolean; faq?: boolean };

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const body = await readJsonBody<Patch>(request);
  if (!body?.id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    const result = await updateQna(body.id, {
      answer: body.answer,
      published: body.published,
      secret: body.secret,
      faq: body.faq,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    if (!result.ok) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailure(err, "qna update");
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    await deleteQna(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailure(err, "qna delete");
  }
}
