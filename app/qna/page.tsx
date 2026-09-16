import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT, FAQS } from "@/lib/company";
import { countPublicQna, getPublicQna } from "@/lib/qna-db";
import { getCurrentMember } from "@/lib/members";
import { answerState } from "@/lib/qna";
import AdminLink from "../admin-link";
import BoardPager, { BOARD_PAGE_SIZE } from "../board-pager";
import CopyGuard from "../copy-guard";
import ThemeToggle from "../theme-toggle";
import SiteRail from "../site-rail";
import AskForm from "./ask-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Q&A — 묻고 답하기 | ㈜프론티어 M&A",
  description:
    "㈜프론티어 M&A에 직접 질문하고 답변을 받는 게시판입니다. 자주 묻는 질문도 함께 보실 수 있습니다.",
};

type Search = { qp?: string };

/**
 * Q&A — 묻고 답하는 게시판.
 *
 * 회장 지시(2026-09-16): Q&A 를 실제 묻고 답하는 게시판으로.
 *
 * 화면은 둘로 나뉜다. 위는 회장이 미리 적어 둔 「자주 묻는 질문」이고,
 * 아래가 방문자가 직접 묻는 게시판이다. 자주 묻는 질문을 없애지 않은 것은,
 * 같은 질문이 게시판에 반복해서 쌓이는 것을 막기 위해서다 — 먼저 읽고
 * 그래도 없으면 묻게 한다.
 */
export default async function QnaPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { qp } = await searchParams;
  const page = Math.max(1, Number(qp) || 1);
  const offset = (page - 1) * BOARD_PAGE_SIZE;

  const [items, total, member] = await Promise.all([
    getPublicQna(BOARD_PAGE_SIZE, offset),
    countPublicQna(),
    getCurrentMember(),
  ]);

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
        <section className="co-section">
          <nav className="ins-crumb" aria-label="위치">
            <Link href="/">홈페이지 첫 화면</Link>
            <span aria-hidden="true"> · </span>
            <span>Q&amp;A</span>
          </nav>

          <div className="co-section-head">
            <p className="co-section-index">Q&amp;A · 묻고 답하기</p>
            <h1>무엇이든 물어보십시오</h1>
            <p className="co-section-note co-section-note--wide">
              업무·절차·채용에 관한 질문을 받습니다. 답변은 회장이 직접 드리며, 질문과 함께
              이 게시판에 올립니다. 거래나 회사 이름이 들어가는 질문은 비밀글로 보내 주십시오.
            </p>
          </div>

          {/*
            작성란은 화면 맨 아래에 있다. 자주 묻는 질문과 게시판을 지나야 닿으므로,
            바로 쓰러 오신 분이 찾지 못한다 — 처음부터 그리로 가는 단추를 위에 둔다.
          */}
          <div className="qa-jump">
            <Link className="co-btn co-btn--primary" href="#ask">
              질문 남기기 <i aria-hidden="true">↓</i>
            </Link>
            <p>아래로 내려가면 작성란이 있습니다.</p>
          </div>
        </section>

        {/* ── 자주 묻는 질문 ── */}
        <section className="co-section co-section--tint" id="faq">
          <div className="co-section-head">
            <p className="co-section-index">FAQ</p>
            <h2>자주 묻는 질문</h2>
            <p className="co-section-note">먼저 여기부터 보십시오. 같은 질문이 가장 많습니다.</p>
          </div>
          <div className="co-faq">
            {FAQS.map((f) => (
              <details key={f.q} className="co-faq-item">
                <summary>
                  <span>{f.q}</span>
                  <i aria-hidden="true">+</i>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 게시판 ── */}
        <section className="co-section" id="board">
          <div className="co-section-head">
            <p className="co-section-index">BOARD</p>
            <h2>
              묻고 답하기 <small className="qa-count">{total}건</small>
            </h2>
          </div>

          {items.length === 0 ? (
            <p className="qa-empty">
              아직 올라온 질문이 없습니다. 첫 질문을 남겨 주십시오. 답변이 준비되면 질문과
              함께 이 자리에 올립니다.
            </p>
          ) : (
            <ol className="qa-list">
              {items.map((item) => (
                <li key={item.id}>
                  <details className="qa-item">
                    <summary>
                      <span className="qa-no">{total - offset - item.no + 1}</span>
                      <span className="qa-title">{item.title}</span>
                      <span className="qa-meta">
                        <b data-state={answerState(item.answer)}>{answerState(item.answer)}</b>
                        <span>{item.name}</span>
                        <time dateTime={item.createdAt}>{item.createdAt}</time>
                      </span>
                      <i aria-hidden="true">+</i>
                    </summary>
                    <div className="qa-body">
                      <p className="qa-q">{item.body}</p>
                      {item.answer ? (
                        <div className="qa-a">
                          <p className="qa-a-by">
                            ㈜프론티어 M&amp;A 회장 성보경
                            {item.answeredOn && (
                              <time dateTime={item.answeredOn}> · {item.answeredOn}</time>
                            )}
                          </p>
                          <p>{item.answer}</p>
                        </div>
                      ) : (
                        <p className="qa-waiting">답변을 준비하고 있습니다.</p>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}

          <BoardPager page={page} total={total} param="qp" basePath="/qna" hash="board" />
        </section>

        {/* ── 질문하기 ── */}
        <section className="co-section co-section--tint" id="ask">
          <div className="co-section-head">
            <p className="co-section-index">ASK</p>
            <h2>질문 남기기</h2>
          </div>
          <AskForm />
          <p className="qa-tail">
            급하신 일이면 전화도 좋습니다 — <a href={CONTACT.telHref}>{CONTACT.tel}</a>. 업무
            의뢰는 <Link href="/#contact">상담신청</Link>으로 보내 주십시오.
          </p>
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
