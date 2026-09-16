import "server-only";

import { and, count, desc, eq, gte, ilike, isNull, or, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { qna } from "@/db/schema";
import { validateAnswer, type QnaValid } from "@/lib/qna";

/**
 * Q&A 게시판 — 조회와 저장.
 *
 * 이 파일의 규칙: 공개 화면으로 나가는 조회는 이메일 열을 아예 고르지 않는다.
 * 고른 뒤 지우는 것이 아니라, 처음부터 가져오지 않는다.
 */

/** 게시판 한 줄 — 이메일은 여기 없다 */
export type PublicQna = {
  id: number;
  no: number;
  name: string;
  title: string;
  body: string;
  answer: string | null;
  answeredOn: string | null;
  createdAt: string;
};

/** 공개 조건 — 발행했고, 비밀글이 아닌 것 */
function openFilter() {
  return and(eq(qna.published, true), eq(qna.secret, false));
}

export async function getPublicQna(limit = 10, offset = 0): Promise<PublicQna[]> {
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      .select({
        id: qna.id,
        name: qna.name,
        title: qna.title,
        body: qna.body,
        answer: qna.answer,
        answeredAt: qna.answeredAt,
        createdAt: qna.createdAt,
      })
      .from(qna)
      .where(openFilter())
      .orderBy(desc(qna.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map((r, i) => ({
      id: r.id,
      no: offset + i + 1,
      name: r.name,
      title: r.title,
      body: r.body,
      answer: r.answer,
      answeredOn: r.answeredAt ? r.answeredAt.toISOString().slice(0, 10) : null,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    }));
  } catch (err) {
    // 게시판이 비어 보이는 편이, 게시판 때문에 화면이 멎는 것보다 낫다
    console.error("[qna] public list failed:", err);
    return [];
  }
}

export async function countPublicQna(): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const [row] = await getDb().select({ value: count() }).from(qna).where(openFilter());
    return row?.value ?? 0;
  } catch (err) {
    console.error("[qna] public count failed:", err);
    return 0;
  }
}

/**
 * 같은 사람이 방금 또 보냈는지 본다. 손이 미끄러져 두 번 눌리는 일과
 * 장난으로 밀어 넣는 일을 함께 막는다. 한 시간에 세 건까지 받는다.
 */
export async function askedTooOften(name: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [row] = await getDb()
      .select({ value: count() })
      .from(qna)
      .where(and(eq(qna.name, name), gte(qna.createdAt, since)));
    return (row?.value ?? 0) >= 3;
  } catch (err) {
    console.error("[qna] rate check failed:", err);
    return false;
  }
}

/** 질문 한 건을 받는다 — 접수 번호를 돌려준다 */
export async function createQuestion(value: QnaValid): Promise<number | null> {
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .insert(qna)
    .values({
      name: value.name,
      email: value.email,
      title: value.title,
      body: value.body,
      secret: value.secret,
      published: false,
    })
    .returning({ id: qna.id });
  return row?.id ?? null;
}

/* ── 관리자 쪽 ───────────────────────────────────────────── */

export const QNA_PAGE_SIZE = 20;

export type AdminQnaRow = {
  id: number;
  name: string;
  email: string | null;
  title: string;
  body: string;
  answer: string | null;
  secret: boolean;
  published: boolean;
  createdAt: string;
};

export type AdminQnaList = {
  rows: AdminQnaRow[];
  total: number;
  page: number;
  pageSize: number;
  /** 답변대기 · 비공개 건수 — 남은 일의 지도 */
  waiting: number;
  hidden: number;
};

export async function listQna(q: string, state: string, page: number): Promise<AdminQnaList> {
  const db = getDb();
  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const match = or(ilike(qna.title, like), ilike(qna.body, like), ilike(qna.name, like));
    if (match) filters.push(match);
  }
  if (state === "waiting") filters.push(sqlNoAnswer());
  if (state === "hidden") filters.push(eq(qna.published, false));
  if (state === "secret") filters.push(eq(qna.secret, true));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totals], [waitingRow], [hiddenRow]] = await Promise.all([
    db
      .select()
      .from(qna)
      .where(where)
      .orderBy(desc(qna.createdAt))
      .limit(QNA_PAGE_SIZE)
      .offset((page - 1) * QNA_PAGE_SIZE),
    db.select({ value: count() }).from(qna).where(where),
    db.select({ value: count() }).from(qna).where(sqlNoAnswer()),
    db.select({ value: count() }).from(qna).where(eq(qna.published, false)),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      title: r.title,
      body: r.body,
      answer: r.answer,
      secret: r.secret,
      published: r.published,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    })),
    total: totals?.value ?? 0,
    page,
    pageSize: QNA_PAGE_SIZE,
    waiting: waitingRow?.value ?? 0,
    hidden: hiddenRow?.value ?? 0,
  };
}

/**
 * 답변이 아직 없는 것 — 비어 있거나 아예 없는 것 둘 다.
 *
 * eq(열, null) 로 쓰면 안 된다. SQL 에서 `= NULL` 은 참이 되는 법이 없어
 * 답변대기가 언제나 0건으로 나온다 — 화면은 멀쩡해 보이고 숫자만 틀린다.
 */
function sqlNoAnswer(): SQL {
  return or(isNull(qna.answer), eq(qna.answer, "")) as SQL;
}

export type QnaPatch = { answer?: string | null; published?: boolean; secret?: boolean };

export async function updateQna(id: number, patch: QnaPatch): Promise<{ ok: boolean; error?: string }> {
  const set: {
    answer?: string | null;
    answeredAt?: Date | null;
    published?: boolean;
    secret?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (patch.answer !== undefined) {
    const parsed = validateAnswer(patch.answer);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    set.answer = parsed.value;
    // 답을 지우면 답변한 날짜도 함께 지운다 — 답 없는 '답변완료'는 거짓말이다
    set.answeredAt = parsed.value ? new Date() : null;
  }
  if (patch.published !== undefined) set.published = patch.published;
  if (patch.secret !== undefined) set.secret = patch.secret;

  const [row] = await getDb().update(qna).set(set).where(eq(qna.id, id)).returning({ id: qna.id });
  return { ok: Boolean(row) };
}

export async function deleteQna(id: number): Promise<void> {
  await getDb().delete(qna).where(eq(qna.id, id));
}
