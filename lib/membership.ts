import { LEVEL_TIERS, normalizeLevel } from "@/lib/questions";

/**
 * 회원 등급과 포인트 규칙 (기획 보고서 4.3).
 *
 * 무료회원은 기초 정보와 L1 입문 퀴즈까지, 유료회원에게 L2~L5가 열린다.
 * 포인트는 문제를 풀며 쌓고 해설을 열 때 쓴다 — 해설이 곧 보상이 되어
 * 풀이를 반복하게 만들고, 해설의 무분별한 유통도 자연히 억제된다.
 *
 * 데이터베이스를 건드리지 않는 순수 규칙이라 서버·클라이언트·테스트 어디서든
 * 같은 판단을 쓴다. 저장과 차감은 lib/members.ts가 맡는다.
 */
export const POINTS = {
  /** 퀴즈 1건(3문제)을 풀면 쌓이는 양 */
  perQuiz: 10,
  /** 해설 하나를 여는 데 드는 양 */
  perExplanation: 30,
  /** 가입 축하 — 처음 몇 개는 열어 볼 수 있게 한다 */
  onJoin: 60,
} as const;

export type Tier = "free" | "paid";

/** 무료회원에게 열리는 레벨은 L1 하나뿐이다 */
export function levelsFor(tier: Tier): string[] {
  return LEVEL_TIERS.filter((t) => tier === "paid" || t.access === "무료회원").map((t) => t.name);
}

export function canAccessLevel(tier: Tier, level: string): boolean {
  return levelsFor(tier).includes(normalizeLevel(level));
}

