import Link from "next/link";
import type { Metadata } from "next";
import { CAREERS, CONTACT } from "@/lib/company";
import { getExamQuestions } from "@/lib/applications";
import { getCurrentMember } from "@/lib/members";
import { PASS_SCORE } from "@/lib/recruit";
import AdminLink from "../admin-link";
import CopyGuard from "../copy-guard";
import ThemeToggle from "../theme-toggle";
import SiteRail from "../site-rail";
import ExamForm from "./exam-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "직원채용 — 채용시험 응시 | ㈜프론티어 M&A",
  description:
    "㈜프론티어 M&A 임직원 채용시험에 응시하고 그 자리에서 지원 의사를 보내실 수 있습니다.",
};

/**
 * 직원채용 — 시험을 치르고 지원하는 자리.
 *
 * 회장 지시(2026-09-16): 채용 문제도 업무 문제와 똑같이 출제하고, 응시자가
 * 그 문제를 푼 다음 「직원채용」을 골라 지원 의사를 보내게 한다.
 *
 * 문제 본문만 이 화면에 온다 — 정답은 lib/applications.ts 에서 아예 고르지
 * 않으므로, 브라우저가 어느 방법으로도 가져갈 수 없다.
 */
export default async function CareersPage() {
  const [exam, member] = await Promise.all([getExamQuestions(), getCurrentMember()]);

  return (
    <div className="co-page">
      <CopyGuard />
      <ThemeToggle />
      <SiteRail signedIn={member !== null} />

      <header className="co-header">
        <Link className="co-brand" href="/" aria-label="㈜프론티어 M&A 처음으로">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img src="/logo-frontier-group.svg" alt="" width={34} height={30} aria-hidden="true" />
          <span className="co-brand-text">
            <b>㈜프론티어 M&amp;A</b>
            <i>FRONTIER M&amp;A · SINCE 1993</i>
          </span>
        </Link>
        <div className="co-header-actions">
          <Link className="co-cta-link" href="/#contact">
            상담신청 <i aria-hidden="true">→</i>
          </Link>
        </div>
      </header>

      <main>
        <section className="co-section rc-intro">
          <nav className="ins-crumb" aria-label="위치">
            <Link href="/">홈페이지 첫 화면</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/#careers">직원채용</Link>
          </nav>

          <div className="co-section-head">
            <p className="co-section-index">CAREERS · 채용시험</p>
            <h1>임직원 채용시험</h1>
            <p className="co-section-note">{CAREERS.lede}</p>
          </div>

          <ul className="rc-rules">
            <li>
              <strong>한 자리에서 끝납니다</strong>
              <p>
                아래 문제를 푸신 뒤, 같은 화면에서 「직원채용」을 골라 지원 의사를 보내시면
                접수됩니다. 따로 이력서를 보내실 필요는 없습니다.
              </p>
            </li>
            <li>
              <strong>합격 기준 {PASS_SCORE}점</strong>
              <p>{CAREERS.gate} 답안은 회장이 직접 읽고 채점합니다.</p>
            </li>
            <li>
              <strong>시간 제한은 없습니다</strong>
              <p>
                충분히 생각하고 적으십시오. 다만 보내고 나면 수정이 어려우니 한 번 더 읽어
                보신 뒤 보내 주십시오.
              </p>
            </li>
            <li>
              <strong>영문 출제</strong>
              <p>{CAREERS.examNote}</p>
            </li>
          </ul>
        </section>

        <section className="co-section co-section--tint rc-exam">
          <ExamForm questions={exam} />
        </section>

        <section className="co-section rc-tail">
          <p>
            전형이나 처우에 관해 먼저 여쭙고 싶은 것이 있으시면 문의로 알려 주십시오. 전화도
            좋습니다 — <a href={CONTACT.telHref}>{CONTACT.tel}</a>
          </p>
          <Link className="co-btn co-btn--ghost co-btn--sm" href="/#contact">
            문의 남기기 <i aria-hidden="true">→</i>
          </Link>
        </section>
      </main>

      <footer className="co-footer">
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <small>
            <Link href="/">홈</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/privacy">개인정보처리방침</Link>
          </small>
          <AdminLink variant="footer" />
        </div>
      </footer>
    </div>
  );
}
