import { levelCode } from "@/lib/questions";

/**
 * AI 채점의 안전 규칙 (순수 함수).
 *
 * lib/grading.ts는 server-only로 막혀 있어 테스트가 불러올 수 없다. 이
 * 방어들은 정답 유출을 막는 마지막 관문이라 반드시 시험해 봐야 하므로,
 * DB도 네트워크도 건드리지 않는 판단만 여기로 뺀다 —
 * lib/membership.ts를 lib/members.ts에서 뗀 것과 같은 이유다.
 */

/**
 * AI가 스스로 채점을 끝낼 수 있는 최고 난이도.
 *
 * 보고서 4.2는 상급(L4)·마스터(L5)를 "회장 검수 없이는 발행 불가"로 둔다.
 * 채점도 같아야 한다 — 주입으로 만점을 받아내면 통과 레벨까지 올라가므로,
 * 회장이 출제한 레벨의 합격 판정은 회장이 한다.
 */
export const AI_MAX_LEVEL = 3;

export function aiMayGrade(level: string): boolean {
  const code = levelCode(level);
  if (!code) return false;
  return Number(code.slice(1)) <= AI_MAX_LEVEL;
}

/**
 * 강평이 비공개 자산을 옮겨 적었는지 검사한다.
 *
 * 완전한 일치를 찾는 것이 아니라, 연속된 낱말 덩어리가 그대로 겹치는지를
 * 본다 — 주입에 성공한 모델은 원문을 통째로 베끼지, 바꿔 쓰지 않는다.
 * 겹치면 강평을 통째로 버린다(점수만 남긴다). 애매하면 버리는 쪽이 옳다.
 *
 * 프롬프트로 "정답을 쓰지 말라"고 이르는 것은 방어가 아니다 — 그 지시와
 * 공격 문장이 같은 채널에 있기 때문이다. 이 검사는 모델의 협조에 기대지
 * 않는다는 점에서 다르다.
 */
export function leaksSecret(feedback: string, secrets: (string | null)[]): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const hay = norm(feedback);
  if (!hay) return false;

  for (const secret of secrets) {
    if (!secret) continue;
    const words = norm(secret).split(" ").filter(Boolean);
    // 여덟 낱말이 연달아 같으면 우연이 아니다
    const RUN = 8;
    if (words.length < RUN) {
      // 짧은 원문은 통째로 들어갔는지만 본다
      if (words.length >= 3 && hay.includes(words.join(" "))) return true;
      continue;
    }
    for (let i = 0; i + RUN <= words.length; i++) {
      if (hay.includes(words.slice(i, i + RUN).join(" "))) return true;
    }
  }
  return false;
}
