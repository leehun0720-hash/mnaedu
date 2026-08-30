import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LEVEL_TIERS } from "@/lib/questions";
import Link from "next/link";
import { POINTS, getCurrentMember, levelsFor } from "@/lib/members";
import { getMyAnswerSummary } from "@/lib/answers";
import { isAuthConfigured } from "@/lib/supabase/config";
import AuthShell from "../auth-shell";

export const metadata: Metadata = {
  title: "내 학습 현황 | M&A 아카데미",
  robots: { index: false, follow: false },
};

// 사람마다 다른 화면이므로 미리 만들어 둘 수 없다
export const dynamic = "force-dynamic";

export default async function MePage() {
  if (!isAuthConfigured()) redirect("/academy/login");
  const member = await getCurrentMember();
  if (!member) redirect("/academy/login");

  const open = levelsFor(member.tier);
  const isPaid = member.tier === "paid";
  const solved = await getMyAnswerSummary(member.id);

  return (
    <AuthShell>
      <div className="me-card">
        <p className="me-eyebrow">내 학습 현황</p>
        <h1>{member.name ?? member.email}</h1>

        <div className="me-stats">
          <div>
            <span>등급</span>
            <strong>{isPaid ? "유료회원" : "무료회원"}</strong>
          </div>
          <div>
            <span>포인트</span>
            <strong>{member.points.toLocaleString()}P</strong>
          </div>
          <div>
            <span>통과 레벨</span>
            <strong>{member.clearedLevel > 0 ? `L${member.clearedLevel}` : "—"}</strong>
          </div>
        </div>

        <div className="me-solved">
          <h2>풀이 현황</h2>
          {solved.total === 0 ? (
            <p className="me-solved-empty">
              아직 푼 문제가 없습니다. 선발 테스트에서 첫 문제를 풀면 점수와 포인트가 여기에 쌓입니다.
            </p>
          ) : (
            <>
              <div className="me-stats me-stats--solved">
                <div>
                  <span>푼 문제</span>
                  <strong>{solved.total}</strong>
                </div>
                <div>
                  <span>통과</span>
                  <strong>{solved.passed}</strong>
                </div>
                <div>
                  <span>평균 점수</span>
                  <strong>{solved.avgScore ?? "—"}</strong>
                </div>
                <div>
                  <span>채점 대기</span>
                  <strong>{solved.pending}</strong>
                </div>
              </div>
              <ul className="me-answers">
                {solved.recent.map((a) => (
                  <li key={a.questionId}>
                    <Link href={`/academy/quiz/${a.questionId}`}>{a.prompt}…</Link>
                    <span data-state={a.status === "graded" ? (a.pass ? "pass" : "fail") : "pending"}>
                      {a.status === "graded" ? `${a.score}점` : "채점 대기"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="me-levels">
          <h2>레벨별 열림 상태</h2>
          <ul>
            {LEVEL_TIERS.map((t) => {
              const unlocked = open.includes(t.name);
              return (
                <li key={t.code} data-open={unlocked}>
                  <span className="me-level-code">{t.code}</span>
                  <span className="me-level-name">{t.name}</span>
                  <span className="me-level-state">{unlocked ? "열림" : "유료회원 전용"}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="me-points">
          <h2>포인트 적립과 사용</h2>
          <p>
            문제 풀이에 통과하면 건당 {POINTS.perQuiz}P가 적립되고, 문제별 성보경 회장 해설을 열람할 때{" "}
            {POINTS.perExplanation}P가 차감됩니다. 한 번 열람한 해설은 다시 차감되지 않습니다.
          </p>
          {!isPaid && (
            <p className="me-upgrade">
              L2~L5 전문가 퀴즈는 유료회원에게 열립니다.{" "}
              <Link href="/academy/billing">유료회원 전환 안내 →</Link>
            </p>
          )}
          {isPaid && member.paidUntil && (
            <p className="me-upgrade">
              이용 기간 {member.paidUntil.toLocaleDateString("ko-KR")}까지 ·{" "}
              <Link href="/academy/billing">연장하기 →</Link>
            </p>
          )}
        </div>

        <div className="me-actions">
          <Link className="button button-red" href="/academy#exam">
            문제 풀러 가기 <span>→</span>
          </Link>
          <Link className="button" href="/academy/help">
            이용 안내
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="me-logout">
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
