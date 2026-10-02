import "server-only";

import { and, count, desc, eq, gte, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { qna } from "@/db/schema";
import { FAQS } from "@/lib/company";
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

/**
 * 자주 묻는 질문 — 게시판 한 줄.
 *
 * 회장 지시(2026-10-02): 새로 올리면 전에 있던 질문이 사라지고 하나만 남는다.
 * 전에 한 질문도 계속 남아 게시판 형태로 있게 하라.
 *
 * 사라진 까닭: 처음 여섯 질문은 코드에만 있고 표에는 없었다. 화면은 「표에
 * 하나도 없으면 코드의 여섯을, 하나라도 있으면 표의 것만」 세웠으므로, 회장이
 * 첫 글을 올리신 순간 여섯이 자리를 내주었다. 이제 여섯을 표에 한 번 넣어 두고
 * (ensureDefaultFaqs), 화면은 언제나 표만 읽는다. 올리실수록 쌓인다.
 */
export type PublicFaq = {
  id: number;
  /** 게시판 번호 — 오래된 것이 1번 */
  no: number;
  question: string;
  answer: string;
  /** 올린 날 (YYYY-MM-DD). 코드의 여섯으로 물러났을 때만 비어 있다 */
  postedOn: string | null;
};

export type FaqBoard = { rows: PublicFaq[]; total: number };

/**
 * 표 안의 표시 — 사람이 쓴 글이 아니라 앱이 남기는 기록.
 *
 * 처음 여섯을 넣었다는 사실을 따로 적어 둔다. 여섯 가운데 무엇이 남았는지로
 * 짐작하면, 회장이 여섯을 모두 지우신 뒤 다음 글을 올릴 때 여섯이 되살아난다.
 * 지우신 것은 지운 것이어야 한다. 이 행은 발행하지 않고 비밀글로 두며, 관리자
 * 목록에서도 뺀다 — 어느 화면에도 서지 않는다.
 */
const SYSTEM_NAME = "__system__";
const SEED_MARK = "faq-defaults-seeded";
/** 두 요청이 동시에 넣으려 할 때 하나만 들어가게 하는 자물쇠 번호 */
const SEED_LOCK = 72_001;

function notSystem(): SQL {
  return ne(qna.name, SYSTEM_NAME);
}

/** 이 인스턴스에서 이미 확인했으면 다시 묻지 않는다 */
let defaultsSettled = false;

/**
 * 처음 여섯 질문을 표에 한 번 넣는다. 넣은 건수를 돌려준다.
 *
 * - 이미 넣었으면(표시가 있으면) 아무것도 하지 않는다.
 * - 회장이 예전에 「가져오기」를 누르셔서 여섯 가운데 하나라도 표에 있으면,
 *   더 넣지 않고 표시만 남긴다 — 그 뒤에 지우신 것을 되살리지 않기 위해서다.
 * - 날짜는 표에 있는 가장 오래된 자주 묻는 질문보다 앞에 둔다. 게시판은 최신
 *   글이 위에 서므로, 회장이 올리신 글이 여섯 위에 선다.
 */
export async function ensureDefaultFaqs(defaults: readonly { q: string; a: string }[] = FAQS): Promise<number> {
  if (defaultsSettled || !isDbConfigured()) return 0;
  const added = await getDb().transaction(async (tx) => {
    // 표가 잠겨 있으면 기다리지 않는다 — 다음 요청이 다시 해 본다
    await tx.execute(sql`set local lock_timeout = '2s'`);
    await tx.execute(sql`select pg_advisory_xact_lock(${SEED_LOCK})`);

    const [mark] = await tx
      .select({ id: qna.id })
      .from(qna)
      .where(and(eq(qna.name, SYSTEM_NAME), eq(qna.title, SEED_MARK)))
      .limit(1);
    if (mark) return 0;

    const have = await tx
      .select({ title: qna.title, createdAt: qna.createdAt })
      .from(qna)
      .where(and(eq(qna.faq, true), notSystem()));
    const known = new Set(have.map((r) => r.title.trim()));
    const alreadyImported = defaults.some((d) => known.has(d.q.trim()));

    const rows = [];
    if (!alreadyImported) {
      const earliest = have.reduce((min, r) => Math.min(min, r.createdAt.getTime()), Date.now());
      // 1분 간격으로 처음 차례 그대로 — 첫 질문이 가장 오래된 글이 된다
      const at = (i: number) => new Date(earliest - (defaults.length - i) * 60_000);
      rows.push(
        ...defaults.map((d, i) => ({
          name: "㈜프론티어 M&A",
          email: null,
          title: d.q,
          body: d.q,
          answer: d.a,
          answeredAt: at(i),
          secret: false,
          faq: true,
          published: true,
          createdAt: at(i),
          updatedAt: at(i),
        }))
      );
    }
    rows.push({
      name: SYSTEM_NAME,
      email: null,
      title: SEED_MARK,
      body: "처음 여섯 자주 묻는 질문을 넣은 기록입니다. 지우지 마십시오.",
      answer: null,
      answeredAt: null,
      secret: true,
      faq: false,
      published: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await tx.insert(qna).values(rows);
    return rows.length - 1;
  });
  defaultsSettled = true;
  return added;
}

function faqFilter() {
  return and(eq(qna.published, true), eq(qna.faq, true), notSystem());
}

/**
 * 자주 묻는 질문 게시판 한 면 — 최신 글이 위.
 *
 * 읽지 못하면 null 을 돌려준다. 빈 목록(회장이 모두 지우신 것)과 읽기
 * 실패를 구분해야 화면이 각각 맞는 말을 한다.
 */
export async function getFaqBoard(limit = 10, offset = 0): Promise<FaqBoard | null> {
  if (!isDbConfigured()) return null;
  try {
    await ensureDefaultFaqs();
  } catch (err) {
    // 넣지 못해도 읽기는 한다 — 다음 요청이 다시 넣어 본다
    console.error("[qna] faq seed failed:", err);
  }
  try {
    const db = getDb();
    const [rows, [totals]] = await Promise.all([
      db
        .select({
          id: qna.id,
          title: qna.title,
          answer: qna.answer,
          body: qna.body,
          createdAt: qna.createdAt,
        })
        .from(qna)
        .where(faqFilter())
        .orderBy(desc(qna.createdAt), desc(qna.id))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(qna).where(faqFilter()),
    ]);
    const total = totals?.value ?? 0;
    return {
      total,
      rows: rows.map((r, i) => ({
        id: r.id,
        no: total - offset - i,
        question: r.title,
        // 답을 아직 안 적으셨으면 질문에 적어 두신 내용을 대신 세운다
        answer: (r.answer ?? "").trim() || r.body,
        postedOn: r.createdAt.toISOString().slice(0, 10),
      })),
    };
  } catch (err) {
    console.error("[qna] faq list failed:", err);
    return null;
  }
}

/** 표를 읽지 못할 때 세우는 처음 여섯 — 번호만 매기고 날짜는 없다 */
export function fallbackFaqBoard(limit = 10, offset = 0): FaqBoard {
  const total = FAQS.length;
  // 게시판처럼 최신이 위 — 코드의 마지막 질문이 맨 위에 선다
  const ordered = FAQS.map((f, i) => ({ f, no: i + 1 })).reverse();
  return {
    total,
    rows: ordered.slice(offset, offset + limit).map(({ f, no }) => ({
      id: -no,
      no,
      question: f.q,
      answer: f.a,
      postedOn: null,
    })),
  };
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
 * 처음 여섯 질문 가운데 지우신 것을 되살린다 — 관리자의 「되살리기」 단추.
 *
 * 처음 한 번 넣는 일은 ensureDefaultFaqs 가 스스로 한다(2026-10-02). 이 함수는
 * 회장이 지우신 것을 다시 원하실 때만 쓴다. 되살린 글은 오늘 날짜로 선다.
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
  const have = await getDb()
    .select({ title: qna.title })
    .from(qna)
    .where(and(eq(qna.faq, true), notSystem()));
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
  // 앱이 남긴 표시 행은 어느 목록에도 서지 않는다
  const filters: SQL[] = [notSystem()];
  if (q) {
    const like = `%${q}%`;
    const match = or(ilike(qna.title, like), ilike(qna.body, like), ilike(qna.name, like));
    if (match) filters.push(match);
  }
  if (state === "waiting") filters.push(sqlNoAnswer());
  if (state === "hidden") filters.push(eq(qna.published, false));
  if (state === "secret") filters.push(eq(qna.secret, true));
  if (state === "faq") filters.push(eq(qna.faq, true));
  const where = and(...filters);

  const [rows, [totals], [waitingRow], [hiddenRow]] = await Promise.all([
    db
      .select()
      .from(qna)
      .where(where)
      .orderBy(desc(qna.createdAt))
      .limit(QNA_PAGE_SIZE)
      .offset((page - 1) * QNA_PAGE_SIZE),
    db.select({ value: count() }).from(qna).where(where),
    db.select({ value: count() }).from(qna).where(and(sqlNoAnswer(), notSystem())),
    db.select({ value: count() }).from(qna).where(and(eq(qna.published, false), notSystem())),
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

  const [row] = await getDb()
    .update(qna)
    .set(set)
    .where(and(eq(qna.id, id), notSystem()))
    .returning({ id: qna.id });
  return { ok: Boolean(row) };
}

export async function deleteQna(id: number): Promise<void> {
  await getDb().delete(qna).where(and(eq(qna.id, id), notSystem()));
}
