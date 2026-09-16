import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { readJsonBody, runQuery, storageFailure } from "@/lib/admin-api";
import { deleteQna, listQna, updateQna } from "@/lib/qna-db";

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

  const listed = await runQuery(listQna(q, state, page), "Q&A 목록");
  if (!listed.ok) return listed.response;
  return NextResponse.json(listed.value);
}

type Patch = { id?: number; answer?: string | null; published?: boolean; secret?: boolean };

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
