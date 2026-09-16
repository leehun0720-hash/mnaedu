/**
 * Q&A 게시판 — 실제로 묻고 답하는 자리.
 *
 * 회장 지시(2026-09-16): Q&A 를 게시판으로, 실제 묻고 답하는 형태로.
 *
 * 설계에서 못 박은 것 셋.
 *
 * 1. 질문은 접수되고, 회장이 공개를 켜야 게시판에 선다. 아무나 눌러 바로
 *    걸리는 공개 게시판은 기업 홈페이지에서 광고·비방·남의 회사 이름이
 *    오르는 자리가 된다. 물어보는 일은 그대로 열어 두고, 무엇을 세울지만
 *    회장이 정하신다.
 * 2. 비밀글은 게시판에 아예 오르지 않는다. '비밀글입니다'라는 줄만 세우는
 *    방식은 누가 언제 무엇을 물었는지를 드러낸다 — M&A 를 다루는 회사에서는
 *    그 사실 자체가 정보다.
 * 3. 질문자의 이메일은 어디에도 게시되지 않는다. 회신을 위해 받을 뿐이다.
 *
 * 이 파일은 관리자 화면(클라이언트)도 함께 쓰므로 데이터베이스를 건드리지
 * 않는다 — 조회와 저장은 lib/qna-db.ts 가 맡는다.
 */

export const QNA_LIMITS = {
  name: 40,
  email: 120,
  title: 120,
  body: 4000,
  answer: 8000,
} as const;

export type QnaInput = {
  name?: string;
  email?: string;
  title?: string;
  body?: string;
  secret?: boolean;
  agree?: boolean;
};

export type QnaValid = {
  name: string;
  email: string | null;
  title: string;
  body: string;
  secret: boolean;
};

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * 질문을 받아도 되는지 본다.
 *
 * 고치지 않고 돌려보낸다 — 조용히 잘린 질문보다 다시 적어 달라는 쪽이
 * 묻는 분에게도 회장에게도 낫다.
 */
export function validateQuestion(input: QnaInput): { error: string } | { value: QnaValid } {
  const name = (input.name ?? "").trim();
  if (name.length < 2) return { error: "성함이나 표시할 이름을 적어 주십시오." };
  if (name.length > QNA_LIMITS.name) return { error: "이름이 너무 깁니다." };

  const email = (input.email ?? "").trim();
  if (email && !looksLikeEmail(email)) return { error: "이메일 주소를 정확히 적어 주십시오." };
  if (email.length > QNA_LIMITS.email) return { error: "이메일 주소가 너무 깁니다." };

  const title = (input.title ?? "").trim();
  if (title.length < 4) return { error: "제목을 네 글자 이상 적어 주십시오." };
  if (title.length > QNA_LIMITS.title) return { error: "제목이 너무 깁니다." };

  const body = (input.body ?? "").trim();
  if (body.length < 10) return { error: "질문 내용을 열 글자 이상 적어 주십시오." };
  if (body.length > QNA_LIMITS.body) return { error: "질문이 너무 깁니다. 나누어 보내 주십시오." };

  if (!input.agree) return { error: "개인정보 수집·이용에 동의해 주셔야 접수됩니다." };

  return {
    value: { name, email: email || null, title, body, secret: Boolean(input.secret) },
  };
}

/** 관리자가 다는 답변 */
export function validateAnswer(raw: string | null | undefined): { error: string } | { value: string | null } {
  const answer = (raw ?? "").trim();
  if (!answer) return { value: null };
  if (answer.length > QNA_LIMITS.answer) return { error: "답변이 너무 깁니다." };
  return { value: answer };
}

/** 목록에서 한 줄이 어떤 상태인지 — 배지 문구가 여기서 나온다 */
export function answerState(answer: string | null | undefined): "답변완료" | "답변대기" {
  return (answer ?? "").trim() ? "답변완료" : "답변대기";
}
