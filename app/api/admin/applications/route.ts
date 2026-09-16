import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { readJsonBody, runQuery, storageFailure } from "@/lib/admin-api";
import {
  deleteApplication,
  getApplicationDetail,
  listApplications,
  updateApplication,
} from "@/lib/applications";

/**
 * 지원자 관리 — 관리자 전용.
 *
 * 이 문 뒤에는 응시자의 성함·이메일·연락처가 있다. 세션 확인을 통과하지
 * 못하면 어떤 형태로도 한 글자가 나가지 않는다.
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

/** GET ?id= 로 한 건, 없으면 목록 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  const id = Number(params.get("id"));

  if (id) {
    const found = await runQuery(getApplicationDetail(id), "지원서");
    if (!found.ok) return found.response;
    if (!found.value) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ application: found.value });
  }

  const q = (params.get("q") ?? "").trim();
  const status = (params.get("status") ?? "").trim();
  const page = Math.max(1, Number(params.get("page")) || 1);

  const listed = await runQuery(listApplications(q, status, page), "지원자 목록");
  if (!listed.ok) return listed.response;
  return NextResponse.json(listed.value);
}

type Patch = { id?: number; status?: string; score?: number | null; memo?: string | null };

/** 채점과 전형 상태를 고친다 */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const body = await readJsonBody<Patch>(request);
  if (!body?.id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    const ok = await updateApplication(body.id, {
      status: body.status,
      score: body.score,
      memo: body.memo,
    });
    if (!ok) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailure(err, "application update");
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    await deleteApplication(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return storageFailure(err, "application delete");
  }
}
