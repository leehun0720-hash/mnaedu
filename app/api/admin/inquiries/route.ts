import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { readJsonBody, runQuery, storageFailure } from "@/lib/admin-api";
import { countNewInquiries, deleteInquiry, listInquiries, updateInquiry } from "@/lib/inquiries-db";

/**
 * 상담 신청 관리 — 관리자 전용.
 *
 * 이 문 뒤에는 신청자의 성함·연락처·이메일과 거래 이야기가 있다. 세션 확인을
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

/** GET ?count=new 로 새 신청 건수만, 없으면 목록 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  if (params.get("count") === "new") {
    const counted = await runQuery(countNewInquiries(), "새 상담 신청");
    if (!counted.ok) return counted.response;
    return NextResponse.json({ fresh: counted.value });
  }

  const q = (params.get("q") ?? "").trim();
  const status = (params.get("status") ?? "").trim();
  const page = Math.max(1, Number(params.get("page")) || 1);

  const listed = await runQuery(listInquiries(q, status, page), "상담 신청 목록");
  if (!listed.ok) return listed.response;
  return NextResponse.json(listed.value);
}

type Patch = { id?: number; status?: string; memo?: string | null };

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const body = await readJsonBody<Patch>(request);
  if (!body?.id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    const result = await updateInquiry(body.id, { status: body.status, memo: body.memo });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    if (!result.ok) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailure(err, "inquiry update");
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    await deleteInquiry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailure(err, "inquiry delete");
  }
}
