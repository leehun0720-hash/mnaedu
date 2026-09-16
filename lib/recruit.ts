/**
 * 직원채용 — 시험과 지원.
 *
 * 회장 지시(2026-09-16): 채용 문제도 업무 문제와 똑같이 출제하고, 응시자가
 * 그 문제를 푼 다음 「직원채용」을 골라 지원 의사를 보내게 한다.
 *
 * 설계에서 못 박은 것 두 가지.
 *
 * 1. 채용 문제는 업무 분야가 아니다. 다섯 업무 분야와 같은 표에 담되 track 을
 *    recruit 으로 두어, 업무 화면과 첫 화면 목록에는 절대 서지 않는다. 채용
 *    문제가 업무 게시판에 섞이면 그 자체로 사고다.
 * 2. 정답은 어떤 경로로도 응시자에게 가지 않는다. 채점은 사람이 한다 —
 *    주관식 답을 글자 맞춰 세는 것은 채점이 아니라 흉내이기 때문이다.
 *    응시자의 답과 회장이 적어 둔 정답은 관리자 화면에서 나란히 놓인다.
 *
 * 이 파일은 관리자 화면(클라이언트)도 함께 쓰므로 데이터베이스를 건드리지
 * 않는다 — 조회와 저장은 lib/applications.ts 가 맡는다.
 */

/** 채용 문제를 담는 자리. 업무 분야 다섯 개 어디에도 속하지 않는다. */
export const RECRUIT_TRACK = "recruit";
export const RECRUIT_LABEL = "직원채용";

export function isRecruitTrack(track: string | null | undefined): boolean {
  return (track ?? "").trim() === RECRUIT_TRACK;
}

/** 지원 구분 — 응시자가 무엇으로 지원하는지 고른다 */
export const APPLY_KINDS = ["직원채용", "인턴십", "제휴·협업"] as const;
export type ApplyKind = (typeof APPLY_KINDS)[number];

export function normalizeKind(value: string | null | undefined): ApplyKind {
  const v = (value ?? "").trim();
  return (APPLY_KINDS as readonly string[]).includes(v) ? (v as ApplyKind) : APPLY_KINDS[0];
}

/** 전형 상태 — 회장이 관리자 화면에서 옮긴다 */
export const APPLY_STATUSES = ["접수", "검토중", "합격", "불합격"] as const;
export type ApplyStatus = (typeof APPLY_STATUSES)[number];

export function normalizeStatus(value: string | null | undefined): ApplyStatus {
  const v = (value ?? "").trim();
  return (APPLY_STATUSES as readonly string[]).includes(v) ? (v as ApplyStatus) : APPLY_STATUSES[0];
}

/** 합격선 — 홈페이지에 적어 둔 기준과 같은 값이어야 한다 */
export const PASS_SCORE = 80;

/** 한 번에 치르는 문항 수의 상한. 너무 길면 아무도 끝까지 풀지 않는다. */
export const MAX_EXAM_QUESTIONS = 10;

/** 응시자가 적어 낸 답 한 칸 */
export type AnswerEntry = {
  /** 어느 문제였는지 — 나중에 문제를 고쳐도 추적할 수 있게 */
  questionId: number;
  /** 그때 보였던 문제 본문. 문제가 바뀌거나 지워져도 답안이 읽힌다. */
  prompt: string;
  answer: string;
};

/* ── 입력 검사 ─────────────────────────────────────────────
   공개된 자리에서 들어오는 값이므로 길이를 모두 못 박는다. 서버와 화면이
   같은 규칙을 봐야 "보낼 때는 됐는데 저장이 안 되는" 일이 없다. */

export const LIMITS = {
  name: 40,
  email: 120,
  phone: 40,
  note: 2000,
  answer: 4000,
} as const;

export type ApplyInput = {
  name?: string;
  email?: string;
  phone?: string;
  kind?: string;
  note?: string;
  answers?: unknown;
  agree?: boolean;
};

export type ApplyValid = {
  name: string;
  email: string;
  phone: string | null;
  kind: ApplyKind;
  note: string | null;
  answers: AnswerEntry[];
};

/** 아주 헐거운 확인 — 오타를 잡자는 것이지 주소를 증명하자는 것이 아니다 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * 지원서를 받아도 되는지 본다.
 *
 * 고치지 않고 돌려보낸다 — 이름이 조용히 잘린 지원서보다, 다시 적어 달라는
 * 쪽이 응시자에게도 회장에게도 낫다.
 */
export function validateApply(input: ApplyInput): { error: string } | { value: ApplyValid } {
  const name = (input.name ?? "").trim();
  if (name.length < 2) return { error: "성함을 적어 주십시오." };
  if (name.length > LIMITS.name) return { error: "성함이 너무 깁니다." };

  const email = (input.email ?? "").trim();
  if (!looksLikeEmail(email)) return { error: "연락받으실 이메일 주소를 정확히 적어 주십시오." };
  if (email.length > LIMITS.email) return { error: "이메일 주소가 너무 깁니다." };

  const phone = (input.phone ?? "").trim();
  if (phone.length > LIMITS.phone) return { error: "연락처가 너무 깁니다." };

  const note = (input.note ?? "").trim();
  if (note.length > LIMITS.note) return { error: "지원 동기가 너무 깁니다." };

  if (!input.agree) return { error: "개인정보 수집·이용에 동의해 주셔야 접수됩니다." };

  const raw = Array.isArray(input.answers) ? input.answers : [];
  const answers: AnswerEntry[] = [];
  for (const item of raw) {
    const entry = item as Partial<AnswerEntry>;
    const questionId = Number(entry?.questionId);
    const answer = String(entry?.answer ?? "").trim();
    if (!Number.isInteger(questionId) || questionId <= 0) continue;
    if (!answer) continue;
    if (answer.length > LIMITS.answer) return { error: "답안 한 칸이 너무 깁니다." };
    answers.push({
      questionId,
      prompt: String(entry?.prompt ?? "").slice(0, 2000),
      answer,
    });
  }
  if (answers.length === 0) return { error: "답안을 한 문항 이상 작성해 주십시오." };

  return {
    value: {
      name,
      email,
      phone: phone || null,
      kind: normalizeKind(input.kind),
      note: note || null,
      answers,
    },
  };
}
