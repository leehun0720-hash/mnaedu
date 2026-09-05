import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { documents } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { COURSES } from "@/lib/questions";
import {
  DOCUMENT_KINDS,
  MAX_FILE_BYTES,
  formatSize,
  isAllowedFile,
  mimeFor,
  safeFileName,
} from "@/lib/documents";

export const dynamic = "force-dynamic";
// 파일이 붙는 요청이라 기본 시간으로는 모자랄 수 있다
export const maxDuration = 60;

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

/** 목록 — 본문(content)은 절대 싣지 않는다 */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const rows = await getDb()
    .select({
      id: documents.id,
      title: documents.title,
      summary: documents.summary,
      track: documents.track,
      kind: documents.kind,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      published: documents.published,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({ documents: rows });
}

/** 새 자료 올리기 — multipart/form-data */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "파일을 선택해 주십시오." }, { status: 400 });
  }

  const fileName = safeFileName(file.name);
  if (!isAllowedFile(fileName)) {
    return NextResponse.json(
      { error: "워드(.doc·.docx) · PDF · 한글(.hwp·.hwpx) 파일만 올릴 수 있습니다." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `파일이 너무 큽니다. ${formatSize(MAX_FILE_BYTES)}까지 올릴 수 있습니다.` },
      { status: 413 }
    );
  }

  const title = String(form.get("title") ?? "").trim() || fileName;
  const summary = String(form.get("summary") ?? "").trim() || null;
  const kindInput = String(form.get("kind") ?? "");
  const kind = (DOCUMENT_KINDS as readonly string[]).includes(kindInput) ? kindInput : "자료";
  const trackInput = String(form.get("track") ?? "");
  const track = COURSES.some((c) => c.slug === trackInput) ? trackInput : null;
  const published = String(form.get("published") ?? "") === "true";

  const content = Buffer.from(await file.arrayBuffer()).toString("base64");

  const [row] = await getDb()
    .insert(documents)
    .values({
      title: title.slice(0, 200),
      summary: summary?.slice(0, 500) ?? null,
      track,
      kind,
      fileName,
      mimeType: mimeFor(fileName),
      fileSize: file.size,
      content,
      published,
    })
    .returning({ id: documents.id, title: documents.title });

  return NextResponse.json({ document: row }, { status: 201 });
}

/** 제목·설명·분류·발행 여부 수정 (파일 교체는 새로 올린다) */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "제목을 입력해 주십시오." }, { status: 400 });

  const kindInput = String(body.kind ?? "");
  const trackInput = String(body.track ?? "");

  const [row] = await getDb()
    .update(documents)
    .set({
      title: title.slice(0, 200),
      summary: String(body.summary ?? "").trim().slice(0, 500) || null,
      kind: (DOCUMENT_KINDS as readonly string[]).includes(kindInput) ? kindInput : "자료",
      track: COURSES.some((c) => c.slug === trackInput) ? trackInput : null,
      published: Boolean(body.published),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id))
    .returning({ id: documents.id });

  if (!row) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
  }

  await getDb().delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}
