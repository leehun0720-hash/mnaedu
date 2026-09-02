import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { articles } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { COURSES } from "@/lib/questions";
import { uniqueSlug } from "@/lib/articles";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

function guardStorage() {
  if (isDbConfigured()) return null;
  return NextResponse.json(
    { error: "데이터베이스가 연결되지 않았습니다. SUPABASE.md를 참고해 주세요." },
    { status: 503 }
  );
}

type Payload = {
  id?: number;
  title?: string;
  lede?: string;
  body?: string;
  source?: string;
  publishedOn?: string;
  track?: string;
  published?: boolean;
};

/** 조용히 뭉개는 것보다 되돌려 주는 편이 낫다 */
function validate(input: Payload) {
  const title = (input.title ?? "").trim();
  if (title.length < 2) return { error: "제목을 입력해 주세요." as const };
  if (title.length > 200) return { error: "제목이 너무 깁니다." as const };

  const body = (input.body ?? "").replace(/\r\n/g, "\n").trim();
  if (body.length < 50) return { error: "본문이 너무 짧습니다. 칼럼 전문을 붙여넣어 주세요." as const };

  const track = (input.track ?? "").trim();
  if (track && !COURSES.some((c) => c.slug === track)) {
    return { error: "분야를 다시 선택해 주세요." as const };
  }

  let publishedOn: Date | null = null;
  const raw = (input.publishedOn ?? "").trim();
  if (raw) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return { error: "게재일 형식을 확인해 주세요." as const };
    publishedOn = parsed;
  }

  return {
    value: {
      title,
      lede: (input.lede ?? "").trim() || null,
      body,
      source: (input.source ?? "").trim() || null,
      track: track || null,
      publishedOn,
      published: Boolean(input.published),
    },
  };
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  // 수정하려면 본문이 필요하다. 목록에는 본문을 싣지 않으므로 한 건만 따로 준다.
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (id) {
    const [one] = await getDb().select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!one) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ article: one });
  }

  const rows = await getDb()
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      lede: articles.lede,
      source: articles.source,
      track: articles.track,
      publishedOn: articles.publishedOn,
      published: articles.published,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .orderBy(desc(articles.publishedOn), desc(articles.createdAt));

  return NextResponse.json({ articles: rows });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const parsed = validate((await request.json()) as Payload);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const slug = await uniqueSlug(parsed.value.title);
  const [row] = await getDb()
    .insert(articles)
    .values({ ...parsed.value, slug })
    .returning({ id: articles.id, slug: articles.slug });

  return NextResponse.json({ article: row }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const input = (await request.json()) as Payload;
  if (!input.id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  const parsed = validate(input);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // slug는 고치지 않는다 — 주소가 바뀌면 이미 걸린 링크와 검색 색인이 끊긴다
  const [row] = await getDb()
    .update(articles)
    .set({ ...parsed.value, updatedAt: new Date() })
    .where(eq(articles.id, input.id))
    .returning({ id: articles.id, slug: articles.slug });

  if (!row) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ article: row });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  await getDb().delete(articles).where(eq(articles.id, id));
  return NextResponse.json({ ok: true });
}
