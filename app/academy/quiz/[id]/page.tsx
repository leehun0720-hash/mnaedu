import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions, unlockedExplanations } from "@/db/schema";
import { getQuizQuestion } from "@/lib/questions-db";
import { getCurrentMember } from "@/lib/members";
import { getMyAnswer, resolveCorrectIndex } from "@/lib/answers";
import { isAuthConfigured } from "@/lib/supabase/config";
import AuthShell from "../../auth-shell";
import QuizClient from "./quiz-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "문제 풀이 | M&A 아카데미",
  robots: { index: false, follow: false },
};

/**
 * 문제 풀이 화면 (풀이 → 채점 → 점수·포인트 → 해설).
 *
 * 정답·해설 본문은 이 페이지의 HTML에 실리지 않는다. 해설은 유료회원이
 * 열람 버튼을 눌러 /api/explanation을 거칠 때만 나가고, 그 전에는 모두에게
 * 자리만 잡은 모자이크(가짜 미리보기)가 보인다. 객관식 정답 번호만은
 * 본인이 제출을 마친 뒤 함께 내려간다.
 */
export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const question = await getQuizQuestion(id);
  if (!question) notFound();

  const member = await getCurrentMember();
  const myAnswer = member ? await getMyAnswer(member.id, id) : null;

  // 제출을 마친 본인에게만 객관식 정답 번호를 보여준다
  let correctChoiceIndex: number | undefined;
  let unlockedExplanation: string | undefined;
  if (member && myAnswer && isDbConfigured()) {
    const db = getDb();
    const [full] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    if (full && myAnswer.status === "graded" && full.format === "객관식") {
      correctChoiceIndex = resolveCorrectIndex(full) ?? undefined;
    }
    // 이미 포인트를 낸 해설은 새로고침해도 열린 채로 보인다
    if (full?.explanation && member.tier === "paid") {
      const [open] = await db
        .select({ id: unlockedExplanations.id })
        .from(unlockedExplanations)
        .where(and(eq(unlockedExplanations.memberId, member.id), eq(unlockedExplanations.questionId, id)))
        .limit(1);
      if (open) unlockedExplanation = full.explanation;
    }
  }

  return (
    <AuthShell>
      <QuizClient
        question={question}
        member={member && { tier: member.tier, points: member.points }}
        myAnswer={myAnswer}
        correctChoiceIndex={correctChoiceIndex}
        unlockedExplanation={unlockedExplanation}
        authConfigured={isAuthConfigured()}
      />
    </AuthShell>
  );
}
