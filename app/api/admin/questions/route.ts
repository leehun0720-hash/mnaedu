import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { COURSES, FORMATS, LEVELS } from "@/lib/questions";

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
      published: Boolean(body.published),
    },
  };
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const blocked = guardStorage();
  if (blocked) return blocked;

  const rows = await getDb().select().from(questions).orderBy(desc(questions.createdAt));
  return NextResponse.json({ questions: rows });
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
