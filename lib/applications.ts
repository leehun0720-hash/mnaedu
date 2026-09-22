import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, or, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { applications, questions } from "@/db/schema";
import {
  MAX_EXAM_QUESTIONS,
  RECRUIT_TRACK,
  normalizeStatus,
  type ApplyStatus,
  type ApplyValid,
} from "@/lib/recruit";
import { bodyToHtml, htmlToText } from "@/lib/rich-text";

/**
 * 직원채용 — 시험 문제 조회와 지원서 보관.
 *
 * 이 파일의 규칙은 하나다: 정답은 이 문을 통해 밖으로 나가지 않는다.
 * 응시 화면에 주는 값에는 answer·explanation·intent 열을 애초에 고르지
 * 않는다(선택 목록에서 빼는 것이지, 고른 뒤 지우는 것이 아니다).
 */

/** 응시 화면이 받는 문제 — 번호와 본문뿐이다 */
export type ExamQuestion = {
  id: number;
  no: number;
  /** 태그를 벗긴 글자 — 답안에 함께 담아 두는 사진이다 */
  prompt: string;
  /** 그릴 준비가 된 본문 */
  promptHtml: string;
};

/**
 * 채용 시험 문제.
 *
 * 발행한 것만, 채용 자리에 담긴 것만 나간다. 순서는 올린 차례대로다 —
 * 시험지는 최신 글 목록이 아니라 1번부터 읽어 내려가는 종이여야 한다.
 */
export async function getExamQuestions(limit = MAX_EXAM_QUESTIONS): Promise<ExamQuestion[]> {
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      // 정답·해설·의도는 고르지 않는다
      .select({ id: questions.id, prompt: questions.prompt })
      .from(questions)
      .where(and(eq(questions.published, true), eq(questions.track, RECRUIT_TRACK)))
      .orderBy(asc(questions.createdAt))
      .limit(limit);
    return rows.map((r, i) => ({
      id: r.id,
      no: i + 1,
      prompt: r.prompt,
      promptHtml: bodyToHtml(r.prompt),
    }));
  } catch (err) {
    console.error("[recruit] exam questions failed:", err);
    return [];
  }
}

/**
 * 같은 사람이 방금 또 보냈는지 본다.
 *
 * 공개된 자리에서 누구나 누를 수 있는 단추다. 손이 미끄러져 두 번 눌리는 일이
 * 가장 흔하고, 장난으로 수백 건을 밀어 넣는 일도 막아야 한다. 하루에 한 번이면
 * 진짜 지원자에게는 걸림돌이 아니고, 둘 다 걸러진다.
 */
export async function appliedRecently(email: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [row] = await getDb()
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.email, email), gte(applications.createdAt, since)))
      .limit(1);
    return Boolean(row);
  } catch (err) {
    // 확인에 실패했다고 지원을 막지는 않는다 — 접수가 먼저다
    console.error("[recruit] duplicate check failed:", err);
    return false;
  }
}

/** 지원서 한 건을 받는다 — 접수 번호를 돌려준다 */
export async function createApplication(value: ApplyValid): Promise<number | null> {
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .insert(applications)
    .values({
      name: value.name,
      email: value.email,
      phone: value.phone,
      kind: value.kind,
      note: value.note,
      answers: value.answers,
      status: "접수",
    })
    .returning({ id: applications.id });
  return row?.id ?? null;
}

/* ── 관리자 쪽 ───────────────────────────────────────────── */

export const APPLICATIONS_PAGE_SIZE = 20;

/** 목록에 필요한 것만 — 답안 본문은 상세를 열 때 간다 */
export type ApplicationRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  kind: string;
  status: string;
  score: number | null;
  answerCount: number;
  createdAt: string;
};

export type ApplicationList = {
  rows: ApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  /** 상태별 건수 — 어디에 손이 필요한지 한눈에 본다 */
  counts: Record<string, number>;
};

export async function listApplications(
  q: string,
  status: string,
  page: number
): Promise<ApplicationList> {
  const db = getDb();
  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const match = or(
      ilike(applications.name, like),
      ilike(applications.email, like),
      ilike(applications.phone, like)
    );
    if (match) filters.push(match);
  }
  if (status) filters.push(eq(applications.status, status));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totals], statusRows] = await Promise.all([
    db
      .select({
        id: applications.id,
        name: applications.name,
        email: applications.email,
        phone: applications.phone,
        kind: applications.kind,
        status: applications.status,
        score: applications.score,
        answers: applications.answers,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .where(where)
      .orderBy(desc(applications.createdAt))
      .limit(APPLICATIONS_PAGE_SIZE)
      .offset((page - 1) * APPLICATIONS_PAGE_SIZE),
    db.select({ value: count() }).from(applications).where(where),
    // 건수는 검색과 무관하게 전체 기준이어야 한다 — 남은 일의 지도이므로
    db.select({ status: applications.status, value: count() }).from(applications).groupBy(applications.status),
  ]);

  const counts: Record<string, number> = {};
  for (const r of statusRows) counts[r.status] = Number(r.value);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      kind: r.kind,
      status: r.status,
      score: r.score,
      answerCount: (r.answers ?? []).length,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    })),
    total: totals?.value ?? 0,
    page,
    pageSize: APPLICATIONS_PAGE_SIZE,
    counts,
  };
}

/** 채점 화면이 보는 한 칸 — 응시자의 답 옆에 회장이 적어 둔 정답을 놓는다 */
export type GradedAnswer = {
  questionId: number;
  prompt: string;
  answer: string;
  /** 회장이 등록해 둔 정답. 관리자 화면에서만 쓰인다. */
  official: string | null;
};

export type ApplicationDetail = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  kind: string;
  note: string | null;
  status: string;
  score: number | null;
  memo: string | null;
  createdAt: string;
  answers: GradedAnswer[];
};

/**
 * 지원서 한 건 전문.
 *
 * 답안에 실려 온 문제 본문은 낸 순간의 사진이다. 그 옆에 세울 정답은 지금
 * 문제은행에 있는 값을 읽어 온다 — 회장이 그 사이에 정답을 고치셨다면
 * 고친 쪽이 기준이어야 채점이 맞기 때문이다.
 */
export async function getApplicationDetail(id: number): Promise<ApplicationDetail | null> {
  const db = getDb();
  const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  if (!row) return null;

  const entries = row.answers ?? [];
  const ids = [...new Set(entries.map((e) => e.questionId))].filter((n) => Number.isInteger(n));
  const official = new Map<number, string | null>();
  if (ids.length) {
    const qs = await db
      .select({ id: questions.id, answer: questions.answer })
      .from(questions)
      .where(inArray(questions.id, ids));
    for (const q of qs) official.set(q.id, q.answer);
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    kind: row.kind,
    note: row.note,
    status: row.status,
    score: row.score,
    memo: row.memo,
    createdAt: row.createdAt.toISOString().slice(0, 16).replace("T", " "),
    answers: entries.map((e) => ({
      questionId: e.questionId,
      prompt: e.prompt,
      answer: e.answer,
      // 회장은 읽고 견주기만 하시므로 태그를 벗긴 글자로 드린다
      official: (() => {
        const raw = official.get(e.questionId);
        return raw ? htmlToText(raw) : null;
      })(),
    })),
  };
}

export type ApplicationPatch = {
  status?: string;
  /** null 이면 '채점 전'으로 되돌린다 */
  score?: number | null;
  memo?: string | null;
};

export async function updateApplication(id: number, patch: ApplicationPatch): Promise<boolean> {
  const set: {
    status?: ApplyStatus;
    score?: number | null;
    memo?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (patch.status !== undefined) set.status = normalizeStatus(patch.status);
  if (patch.score !== undefined) {
    // 0~100 밖의 점수는 채점이 아니라 오타다
    set.score =
      patch.score === null || Number.isNaN(Number(patch.score))
        ? null
        : Math.min(100, Math.max(0, Math.round(Number(patch.score))));
  }
  if (patch.memo !== undefined) set.memo = (patch.memo ?? "").trim() || null;

  const [row] = await getDb()
    .update(applications)
    .set(set)
    .where(eq(applications.id, id))
    .returning({ id: applications.id });
  return Boolean(row);
}

export async function deleteApplication(id: number): Promise<void> {
  await getDb().delete(applications).where(eq(applications.id, id));
}
