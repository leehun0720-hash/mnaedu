import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { Question } from "@/db/schema";

/**
 * 주관식 AI 채점.
 *
 * Vercel 환경변수 ANTHROPIC_API_KEY가 있을 때만 동작한다. 없으면 답안은
 * 채점 대기로 남고 회장이 관리자 화면에서 채점한다 — AI는 보조 채점자다.
 * 모범답안·출제 의도는 프롬프트로만 전달되고 회원에게는 나가지 않는다.
 */
export function isAiGradingConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type AiGrade = { score: number; feedback: string };

export async function gradeEssayWithAi(
  question: Pick<Question, "prompt" | "answer" | "intent" | "level" | "track">,
  memberAnswer: string
): Promise<AiGrade | null> {
  const client = new Anthropic();

  const rubric = [
    `[문제] ${question.prompt}`,
    question.answer ? `[모범답안 요지] ${question.answer}` : null,
    question.intent ? `[출제 의도] ${question.intent}` : null,
    `[난이도] ${question.level}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    system:
      "당신은 M&A 실무 교육기관의 채점관입니다. 수험자의 답안을 0~100점으로 채점하고 짧은 강평을 씁니다. " +
      "교과서 지식의 나열보다 논리가 실전에서 무너지는 한계 조건까지 짚었는지를 높이 평가합니다. " +
      "모범답안이 없으면 문제와 출제 의도만으로 평가합니다. 답안이 문제와 무관하거나 성의가 없으면 낮게 채점합니다. " +
      '반드시 JSON 하나만 출력하십시오: {"score": <0~100 정수>, "feedback": "<2~3문장 강평, 정답 전문은 쓰지 말 것>"}',
    messages: [
      {
        role: "user",
        content: `${rubric}\n\n[수험자 답안]\n${memberAnswer}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { score?: unknown; feedback?: unknown };
    const score = Math.round(Number(parsed.score));
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    const feedback = String(parsed.feedback ?? "").slice(0, 1000);
    return { score, feedback };
  } catch {
    return null;
  }
}
