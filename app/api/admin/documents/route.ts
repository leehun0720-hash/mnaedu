import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { documents } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/auth";
import { verifySession } from "@/lib/admin-auth";
import { COURSES, normalizeStage } from "@/lib/questions";
import {
  DOCUMENT_KINDS,
  MAX_FILE_BYTES,
  TEXT_MIME,
  formatSize,
  isAllowedFile,
  isTextDocument,
  mimeFor,
  safeFileName,
} from "@/lib/documents";
import { readJsonBody, runQuery } from "@/lib/admin-api";
import { sanitizeHtml, textLength } from "@/lib/rich-text";

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

const LIST = {
  id: documents.id,
  title: documents.title,
  summary: documents.summary,
  track: documents.track,
  stage: documents.stage,
  kind: documents.kind,
  fileName: documents.fileName,
  fileSize: documents.fileSize,
  mimeType: documents.mimeType,
  published: documents.published,
  createdAt: documents.createdAt,
} as const;

/**
 * 목록 — 본문(content)은 싣지 않는다.
 * ?id= 를 주면 그 한 건을 본문까지 준다 — 붙여넣은 글을 고칠 때 쓴다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (Number.isInteger(id) && id > 0) {
    const one = await runQuery(
      getDb().select({ ...LIST, content: documents.content }).from(documents).where(eq(documents.id, id)).limit(1),
      "자료 한 건"
    );
    if (!one.ok) return one.response;
    const row = one.value[0];
    if (!row) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    const { content, ...rest } = row;
    // 파일 자료의 본문(base64)은 화면에 줄 이유가 없다 — 글일 때만 싣는다
    return NextResponse.json({ document: { ...rest, body: isTextDocument(row.mimeType) ? content : "" } });
  }

  const out = await runQuery(getDb().select(LIST).from(documents).orderBy(desc(documents.createdAt)), "자료 목록");
  if (!out.ok) return out.response;
  return NextResponse.json({ documents: out.value });
}

type TextPayload = {
  id?: number;
  title?: string;
  body?: string;
  summary?: string;
  track?: string;
  stage?: string;
  kind?: string;
  published?: boolean;
};

/**
 * 붙여넣은 글을 검사한다. 조용히 뭉개는 것보다 되돌려 주는 편이 낫다.
 *
 * 분야는 반드시 있어야 한다 — 회장 지시: "해당 자료실에 올린 자료는 해당 섹션의
 * 자료로 올라가야 한다." 분야 없는 자료는 어느 화면에도 서지 못한다.
 */
function validateText(input: TextPayload, { requireBody }: { requireBody: boolean }) {
  const title = (input.title ?? "").trim();
  if (title.length < 2) return { error: "제목을 입력해 주십시오." as const };
  if (title.length > 200) return { error: "제목이 너무 깁니다." as const };

  const track = (input.track ?? "").trim();
  if (!COURSES.some((c) => c.slug === track)) {
    return { error: "분야를 선택해 주십시오. 자료는 그 분야 화면에 올라갑니다." as const };
  }

  // 편집기가 내놓는 HTML 은 여기서 거른다 — 허락한 서식만 남는다
  const body = sanitizeHtml((input.body ?? "").replace(/\r\n/g, "\n").trim());
  if (requireBody && textLength(body) < 20) {
    return { error: "본문이 너무 짧습니다. 자료 전문을 붙여넣어 주십시오." as const };
  }

  const kindInput = String(input.kind ?? "");
  return {
    value: {
      title,
      body,
      summary: (input.summary ?? "").trim().slice(0, 500) || null,
      track,
      stage: normalizeStage(input.stage),
      kind: (DOCUMENT_KINDS as readonly string[]).includes(kindInput) ? kindInput : "자료",
      published: Boolean(input.published),
    },
  };
}

/**
 * 새 자료 올리기.
 *
 * JSON 이면 붙여넣은 글(기본), multipart 면 파일이다. 파일 길은 예전에 올린
 * 자료를 위해 남겨 두었을 뿐, 관리자 화면은 글만 올린다.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await readJsonBody<TextPayload>(request);
    if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
    const parsed = validateText(body, { requireBody: true });
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const v = parsed.value;

    const out = await runQuery(
      getDb()
        .insert(documents)
        .values({
          title: v.title,
          summary: v.summary,
          track: v.track,
          stage: v.stage,
          kind: v.kind,
          fileName: `${safeFileName(v.title)}.txt`,
          mimeType: TEXT_MIME,
          fileSize: Buffer.byteLength(v.body, "utf8"),
          content: v.body,
          published: v.published,
        })
        .returning({ id: documents.id, title: documents.title }),
      "자료 저장"
    );
    if (!out.ok) return out.response;
    return NextResponse.json({ document: out.value[0] }, { status: 201 });
  }

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
  const stage = normalizeStage(String(form.get("stage") ?? ""));
  const published = String(form.get("published") ?? "") === "true";
  const content = Buffer.from(await file.arrayBuffer()).toString("base64");

  const out = await runQuery(
    getDb()
      .insert(documents)
      .values({
        title: title.slice(0, 200),
        summary: summary?.slice(0, 500) ?? null,
        track,
        stage,
        kind,
        fileName,
        mimeType: mimeFor(fileName),
        fileSize: file.size,
        content,
        published,
      })
      .returning({ id: documents.id, title: documents.title }),
    "자료 저장"
  );
  if (!out.ok) return out.response;
  return NextResponse.json({ document: out.value[0] }, { status: 201 });
}

/**
 * 수정. 제목·설명·분야·단계·구분·발행 여부를 고치고, 본문(body)이 오면 글도 바꾼다.
 * 파일로 올린 자료의 본문은 여기서 바꾸지 않는다 — 그건 다른 파일이다.
 */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const body = await readJsonBody<TextPayload>(request);
  if (!body) return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
  }

  const hasBody = typeof body.body === "string" && body.body.trim().length > 0;
  const parsed = validateText(body, { requireBody: hasBody });
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  const out = await runQuery(
    getDb()
      .update(documents)
      .set({
        title: v.title,
        summary: v.summary,
        track: v.track,
        stage: v.stage,
        kind: v.kind,
        published: v.published,
        updatedAt: new Date(),
        ...(hasBody
          ? {
              content: v.body,
              mimeType: TEXT_MIME,
              fileName: `${safeFileName(v.title)}.txt`,
              fileSize: Buffer.byteLength(v.body, "utf8"),
            }
          : {}),
      })
      .where(eq(documents.id, id))
      .returning({ id: documents.id }),
    "자료 수정"
  );
  if (!out.ok) return out.response;
  if (!out.value[0]) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
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

  const out = await runQuery(getDb().delete(documents).where(eq(documents.id, id)), "자료 삭제");
  if (!out.ok) return out.response;
  return NextResponse.json({ ok: true });
}
