import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions, unlockedExplanations } from "@/db/schema";
import { getQuizQuestion } from "@/lib/questions-db";
import { getCurrentMember } from "@/lib/members";
import { canAccessLevel } from "@/lib/membership";
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

  /**
   * 문제 본문 자체가 유료 자산이다.
   *
   * 답안 제출은 lib/answers.ts가 막고 있었지만, 화면은 등급과 무관하게
   * 본문과 보기를 그렸다 — 비로그인 상태로 /academy/quiz/1..N 을 훑으면
   * L2~L5 문제은행이 통째로 새어 나간다. 판정을 화면보다 먼저 세운다.
   * (무료·비로그인에게 열리는 L1은 그대로 보인다 — 가입 유인이다)
   */
  if (!canAccessLevel(member?.tier ?? "free", question.level)) {
    return (
      <AuthShell>
        <QuizLocked question={question} signedIn={Boolean(member)} />
      </AuthShell>
    );
  }

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
        watermarkLabel={member ? watermarkLabel(member.email) : ""}
      />
    </AuthShell>
  );
}

/**
 * 워터마크에 실을 열람자 표시.
 *
 * 전체 이메일을 그대로 깔면 캡처 한 장으로 회원 주소가 새어 나간다. 앞 세
 * 글자와 도메인만 남겨 본인은 자기 것임을 알아보고, 운영자는 로그와 대조해
 * 특정할 수 있되, 화면만 보고 주소를 알아내지는 못하게 한다.
 */
function watermarkLabel(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "FRONTIER M&A";
  const head = local.slice(0, 3);
  return `${head}${"*".repeat(Math.max(1, local.length - 3))}@${domain}`;
}

/**
 * 잠긴 문제 화면.
 *
 * 분류(분야·레벨)까지만 보여 주고 본문은 내보내지 않는다 — 무엇이 있는지는
 * 알려 주되 내용은 주지 않는 것이 이 화면의 일이다. 홈페이지 커리큘럼 목차를
 * 공개하되 실물은 회원 전용으로 두는 원칙과 같다 (보고서 4.3).
 */
function QuizLocked({
  question,
  signedIn,
}: {
  question: { trackLabel: string; level: string; levelClass: string; format: string };
  signedIn: boolean;
}) {
  return (
    <div className="quiz-card">
      <p className="me-eyebrow">유료회원 전용 문제</p>
      <div className="quiz-tags">
        <span className="exam-tag">{question.trackLabel}</span>
        <span className={`exam-tag ${question.levelClass}`}>{question.level}</span>
        <span className="exam-tag">{question.format}</span>
      </div>
      <h1 className="quiz-prompt">{question.level} 단계 문제입니다</h1>
      <div className="quiz-gate">
        <p>
          무료회원은 L1 입문 문제까지 풀 수 있습니다. {question.level} 문제와 성보경 회장 해설은
          유료회원에게 열립니다.
        </p>
        <p className="quiz-gate-actions">
          {signedIn ? (
            <Link className="button button-red" href="/academy/billing">유료회원 전환 안내</Link>
          ) : (
            <>
              <Link className="button button-red" href="/academy/login">로그인</Link>
              <Link className="button" href="/academy/join">회원가입</Link>
            </>
          )}
        </p>
      </div>
      <p className="quiz-back">
        <Link href="/academy#exam">← 다른 문제 보기</Link>
      </p>
    </div>
  );
}
