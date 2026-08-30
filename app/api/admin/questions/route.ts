import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, count, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { COURSES, FORMATS, LEVELS, normalizeLevel, normalizeTrack } from "@/lib/questions";

/** 한 화면에 올리는 문제 수. 문제은행이 커져도 목록은 이 크기로 유지된다. */
export const PAGE_SIZE = 20;

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

function guardStorage() {
  if (isDbConfigured()) return null;
  return NextResponse.json(
    { error: "데이터베이스가 연결되지 않았습니다. Vercel에서 Postgres를 생성해 주세요." },
    { status: 503 }
  );
}

type Payload = {
  id?: number;
  track?: string;
  level?: string;
  format?: string;
  prompt?: string;
  choices?: unknown;
  answer?: string;
  intent?: string;
  explanation?: string;
  published?: boolean;
};

/** Rejects rather than coerces: a silently mangled question is worse than an error. */
function validate(body: Payload) {
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 10) return { error: "문제 본문이 너무 짧습니다." as const };
  if (!COURSES.some((c) => c.slug === body.track)) return { error: "과정을 선택해 주세요." as const };
  if (!LEVELS.includes(body.level as never)) return { error: "난이도를 선택해 주세요." as const };
  if (!FORMATS.includes(body.format as never)) return { error: "유형을 선택해 주세요." as const };

  let choices: string[] | null = null;
  if (body.format === "객관식") {
    const list = Array.isArray(body.choices)
      ? body.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    if (list.length < 2) return { error: "객관식은 보기가 2개 이상이어야 합니다." as const };
    choices = list;
  }

  return {
    value: {
      track: body.track as string,
      level: body.level as string,
      format: body.format as string,
      prompt,
      choices,
      answer: (body.answer ?? "").trim() || null,
      intent: (body.intent ?? "").trim() || null,
      explanation: (body.explanation ?? "").trim() || null,
      published: Boolean(body.published),
    },
  };
}

/**
 * 문제 목록 — 검색·필터·페이지로 잘라서 준다.
 *
 * 58주제 × 5레벨이면 문제는 수백 건이 된다. 전부 한 번에 내려보내면 화면이
 * 느려지는 것을 넘어 회장이 원하는 문제를 찾지 못한다. 그래서 목록은 항상
 * 한 페이지 분량만 나가고, 대신 '어디가 비어 있는지'를 보여 주는 커버리지
 * 집계를 함께 준다 — 출제 계획은 목록이 아니라 이 빈칸을 보고 세운다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const track = params.get("track") ?? "";
  const level = params.get("level") ?? "";
  const state = params.get("state") ?? ""; // published | draft | incomplete
  const page = Math.max(1, Number(params.get("page")) || 1);

  const filters: SQL[] = [];
  if (q) filters.push(ilike(questions.prompt, `%${q}%`));
  if (track) filters.push(eq(questions.track, track));
  if (level) filters.push(eq(questions.level, level));
  if (state === "published") filters.push(eq(questions.published, true));
  if (state === "draft") filters.push(eq(questions.published, false));
  // 아직 손이 더 가야 하는 문제 — 정답이나 해설이 비어 있다
  if (state === "incomplete") {
    filters.push(
      sql`(${questions.answer} IS NULL OR ${questions.answer} = '' OR ${questions.explanation} IS NULL OR ${questions.explanation} = '')`
    );
  }
  const where = filters.length ? and(...filters) : undefined;

  const db = getDb();
  const [rows, [totals], coverageRows] = await Promise.all([
    db
      .select()
      .from(questions)
      .where(where)
      .orderBy(desc(questions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(questions).where(where),
    // 커버리지는 필터와 무관하게 전체 기준이어야 한다 — 빈칸을 찾는 지도이므로
    db
      .select({
        track: questions.track,
        level: questions.level,
        total: count(),
        published: sql<number>`count(*) filter (where ${questions.published})`,
      })
      .from(questions)
      .groupBy(questions.track, questions.level),
  ]);

  // 개편 전 슬러그·난이도로 저장된 행도 현행 분류의 칸에 얹는다
  const coverage: Record<string, { total: number; published: number }> = {};
  for (const r of coverageRows) {
    const key = `${normalizeTrack(r.track)}|${normalizeLevel(r.level)}`;
    const slot = (coverage[key] ??= { total: 0, published: 0 });
    slot.total += Number(r.total);
    slot.published += Number(r.published);
  }

  return NextResponse.json({
    questions: rows,
    total: totals?.value ?? 0,
    page,
    pageSize: PAGE_SIZE,
    coverage,
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const parsed = validate(await request.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const [row] = await getDb().insert(questions).values(parsed.value).returning();
  return NextResponse.json({ question: row }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const body = (await request.json()) as Payload;
  if (!body.id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  const parsed = validate(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const [row] = await getDb()
    .update(questions)
    .set({ ...parsed.value, updatedAt: new Date() })
    .where(eq(questions.id, body.id))
    .returning();

  if (!row) return NextResponse.json({ error: "찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ question: row });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  await getDb().delete(questions).where(eq(questions.id, id));
  return NextResponse.json({ ok: true });
}
