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

/**
 * 데이터베이스 오류를 화면이 읽을 수 있는 형태로 바꾼다.
 *
 * 이걸 두지 않으면 표가 없을 때 500 HTML 페이지가 나가고, 화면은 그것을
 * JSON 으로 읽다 실패해 아무 말도 못 한다 — 버튼을 눌러도 반응이 없는 것처럼
 * 보인다. 원인을 그대로 알려 주는 편이 낫다.
 */
function failed(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // 42P01 = 그런 표가 없음
  if (/relation .* does not exist|42P01/i.test(message)) {
    return NextResponse.json(
      {
        error:
          "칼럼 표가 아직 만들어지지 않았습니다. Supabase SQL 편집기에서 drizzle/0006_insights.sql 을 실행해 주십시오.",
      },
      { status: 503 }
    );
  }
  console.error("[admin/articles]", err);
  return NextResponse.json({ error: "저장 중 문제가 발생했습니다." }, { status: 500 });
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
  try {
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
  } catch (err) {
    return failed(err);
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const parsed = validate((await request.json()) as Payload);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const slug = await uniqueSlug(parsed.value.title);
    const [row] = await getDb()
      .insert(articles)
      .values({ ...parsed.value, slug })
      .returning({ id: articles.id, slug: articles.slug });

    return NextResponse.json({ article: row }, { status: 201 });
  } catch (err) {
    return failed(err);
  }
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
  try {
    const [row] = await getDb()
      .update(articles)
      .set({ ...parsed.value, updatedAt: new Date() })
      .where(eq(articles.id, input.id))
      .returning({ id: articles.id, slug: articles.slug });

    if (!row) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ article: row });
  } catch (err) {
    return failed(err);
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    await getDb().delete(articles).where(eq(articles.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failed(err);
  }
}
