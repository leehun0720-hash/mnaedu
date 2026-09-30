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

/**
 * 공개 조건 — 발행했고, 비밀글이 아닌 것.
 *
 * 「자주 묻는 질문」으로 세운 것은 게시판에서 뺀다. 같은 글이 위아래에
 * 두 번 서면 읽는 사람이 어느 쪽을 봐야 할지 모른다.
 */
function openFilter() {
  return and(eq(qna.published, true), eq(qna.secret, false), eq(qna.faq, false));
}

/** 자주 묻는 질문 — 회장이 직접 올리고 세운 것 */
export type PublicFaq = { id: number; question: string; answer: string };

export async function getPublicFaqs(limit = 30): Promise<PublicFaq[]> {
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      .select({ id: qna.id, title: qna.title, answer: qna.answer, body: qna.body })
      .from(qna)
      .where(and(eq(qna.published, true), eq(qna.faq, true)))
      // 올린 차례대로 — 자주 묻는 질문은 최신 글 목록이 아니라 읽어 내려가는 차례다
      .orderBy(qna.createdAt)
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      question: r.title,
      // 답을 아직 안 적으셨으면 질문에 적어 두신 내용을 대신 세운다
      answer: (r.answer ?? "").trim() || r.body,
    }));
  } catch (err) {
    console.error("[qna] faq list failed:", err);
    return [];
  }
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

/**
 * 회장이 직접 올리는 Q&A.
 *
 * 회장 지시(2026-09-30): 자주 묻는 질문을 관리자 화면에서 직접 올릴 수 있게.
 * 방문자가 보낸 질문과 같은 표에 담되, 이름을 회사 이름으로 두고 처음부터
 * 발행 상태로 세운다 — 회장이 스스로 묻고 답하는 글을 검토 대기에 둘 이유가 없다.
 */
export async function createAdminQna(input: {
  title: string;
  body: string;
  answer: string | null;
  faq: boolean;
}): Promise<number | null> {
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .insert(qna)
    .values({
      name: "㈜프론티어 M&A",
      email: null,
      title: input.title,
      body: input.body,
      answer: input.answer,
      answeredAt: input.answer ? new Date() : null,
      secret: false,
      faq: input.faq,
      published: true,
    })
    .returning({ id: qna.id });
  return row?.id ?? null;
}

/**
 * 코드에 박혀 있던 자주 묻는 질문을 표로 옮긴다.
 *
 * 옮겨 두어야 회장이 고치고 지우실 수 있다. 이미 자주 묻는 질문이 하나라도
 * 있으면 아무 일도 하지 않는다 — 누르실 때마다 같은 글이 쌓이면 안 된다.
 */
export async function importDefaultFaqs(
  defaults: readonly { q: string; a: string }[]
): Promise<number> {
  if (!isDbConfigured()) return 0;

  /**
   * 이미 들어와 있는 질문은 건너뛴다.
   *
   * 전에는 자주 묻는 질문이 하나라도 있으면 통째로 멈췄다. 그러면 회장이
   * 직접 한 건 올리신 뒤에는 이 단추가 영영 아무 일도 하지 않는다. 제목으로
   * 견주어 없는 것만 채우면, 몇 번을 누르셔도 같은 글이 쌓이지 않는다.
   */
  const have = await getDb().select({ title: qna.title }).from(qna).where(eq(qna.faq, true));
  const known = new Set(have.map((r) => r.title.trim()));
  const missing = defaults.filter((d) => !known.has(d.q.trim()));

  const now = new Date();
  const rows = missing.map((d) => ({
    name: "㈜프론티어 M&A",
    email: null,
    title: d.q,
    body: d.q,
    answer: d.a,
    answeredAt: now,
    secret: false,
    faq: true,
    published: true,
  }));
  if (rows.length === 0) return 0;
  await getDb().insert(qna).values(rows);
  return rows.length;
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
  faq: boolean;
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
  if (state === "faq") filters.push(eq(qna.faq, true));
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
      faq: r.faq,
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

export type QnaPatch = { answer?: string | null; published?: boolean; secret?: boolean; faq?: boolean };

export async function updateQna(id: number, patch: QnaPatch): Promise<{ ok: boolean; error?: string }> {
  const set: {
    answer?: string | null;
    answeredAt?: Date | null;
    published?: boolean;
    secret?: boolean;
    faq?: boolean;
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
  if (patch.faq !== undefined) {
    set.faq = patch.faq;
    // 자주 묻는 질문은 누구나 보는 자리다 — 비밀글이면서 거기 설 수는 없다
    if (patch.faq) set.secret = false;
  }

  const [row] = await getDb().update(qna).set(set).where(eq(qna.id, id)).returning({ id: qna.id });
  return { ok: Boolean(row) };
}

export async function deleteQna(id: number): Promise<void> {
  await getDb().delete(qna).where(eq(qna.id, id));
}
