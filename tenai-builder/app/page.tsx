import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/builder/brand";
import { SECTION_CATALOG } from "@/lib/builder/types";
import { TEMPLATES } from "@/lib/builder/template";

/**
 * 서비스 입구.
 *
 * 빌더는 도구이고, 이 화면은 그 도구를 처음 만나는 고객이 서는 자리다.
 * 무엇을 만들 수 있는지, 얼마나 걸리는지, 결과물이 무엇으로 남는지를
 * 한 화면 안에서 답한다. 설명이 길어지면 도구를 열지 않는다.
 */
export const metadata: Metadata = {
  title: `${BRAND.productEn} — ${BRAND.product}`,
  description:
    "구역을 쌓아 홈페이지를 만들고 HTML 한 장으로 내보냅니다. 서버도 로그인도 필요 없습니다.",
};

const STEPS = [
  { no: "01", title: "골격을 고릅니다", desc: "여섯 가지 템플릿 중 하나로 시작합니다. 빈 화면에서 시작하지 않습니다." },
  { no: "02", title: "글자를 누르고 고칩니다", desc: "화면의 글자를 직접 눌러 그 자리에서 고칩니다. 색과 글꼴은 견본으로 한 번에 바꿉니다." },
  { no: "03", title: "HTML 한 장으로 내보냅니다", desc: "파일 하나만 있으면 어디에 올려도 그대로 뜹니다. 빌더가 없어도 결과물은 남습니다." },
];

export default function Home() {
  return (
    <main className="tn">
      <header className="tn-top">
        <span className="tn-logo">
          {BRAND.company}
          <small>{BRAND.productEn}</small>
        </span>
        <nav className="tn-nav">
          <a href="#what">할 수 있는 일</a>
          <a href="#templates">템플릿</a>
          <a href="#how">만드는 순서</a>
          <a href={BRAND.siteHref} target="_blank" rel="noopener noreferrer">
            {BRAND.site} ↗
          </a>
        </nav>
        <Link className="tn-cta" href="/builder">
          빌더 열기 →
        </Link>
      </header>

      <section className="tn-hero">
        <p className="tn-eyebrow">{BRAND.sloganEn}</p>
        <h1>
          홈페이지를 <em>글자 고치듯</em> 만듭니다
        </h1>
        <p className="tn-lead">
          구역을 쌓아 사이트를 만들고, HTML 파일 한 장으로 내보냅니다. 서버도 로그인도 필요
          없습니다. 만드는 내내 화면에 보이는 그대로가 결과물입니다.
        </p>
        <div className="tn-hero-acts">
          <Link className="tn-btn" href="/builder">
            빌더 열기
          </Link>
          <a className="tn-btn tn-btn-ghost" href="#templates">
            템플릿 먼저 보기
          </a>
        </div>
        <ul className="tn-stats">
          <li>
            <strong>{TEMPLATES.length}</strong>
            <span>시작 템플릿</span>
          </li>
          <li>
            <strong>{SECTION_CATALOG.length}</strong>
            <span>구역 부품</span>
          </li>
          <li>
            <strong>1</strong>
            <span>내보내는 파일 수</span>
          </li>
        </ul>
      </section>

      <section className="tn-sec" id="what">
        <p className="tn-kicker">WHAT YOU GET</p>
        <h2>할 수 있는 일</h2>
        <div className="tn-grid">
          <article>
            <h3>글자를 눌러 그 자리에서</h3>
            <p>
              편집 화면이 따로 없습니다. 캔버스의 글자를 누르면 커서가 생기고, 고친 것이
              바로 반영됩니다. 되돌리기도 됩니다.
            </p>
          </article>
          <article>
            <h3>구역 {SECTION_CATALOG.length}가지를 쌓아서</h3>
            <p>
              상단 메뉴·히어로·카드·단계 흐름·비교표·목록·갤러리·글·배너·게시판·푸터를
              골라 넣고 순서를 바꿉니다.
            </p>
          </article>
          <article>
            <h3>색과 글꼴은 견본으로</h3>
            <p>
              테마 견본을 누르면 사이트 전체 색이 한 번에 바뀝니다. 텐에이아이·중앙부처·지자체·교육·모노
              다섯 가지에서 고르거나 색을 직접 지정합니다.
            </p>
          </article>
          <article>
            <h3>PC·태블릿·모바일을 함께</h3>
            <p>
              위쪽 단추로 화면 크기를 바꿔 가며 확인합니다. 내보낸 파일도 같은 방식으로
              접힙니다.
            </p>
          </article>
          <article>
            <h3>게시판도 파일 안에서</h3>
            <p>
              공지·자료실 구역을 넣으면 내보낸 HTML 안에서 글쓰기가 그대로 돕니다. 글은
              보는 사람의 브라우저에 남습니다.
            </p>
          </article>
          <article>
            <h3>작업은 저장하고 이어서</h3>
            <p>
              작업물은 브라우저에 자동으로 저장되고, JSON 파일로 내려받아 다른 기기에서
              이어서 하실 수 있습니다.
            </p>
          </article>
        </div>
      </section>

      <section className="tn-sec tn-sec-tint" id="templates">
        <p className="tn-kicker">TEMPLATES</p>
        <h2>이런 골격으로 시작합니다</h2>
        <p className="tn-sec-lead">
          빈 화면에서 시작하지 않습니다. 고르는 순간 사이트 한 벌이 서 있고, 글자만 바꾸면
          됩니다.
        </p>
        <ul className="tn-tpl">
          {TEMPLATES.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.name}</strong>
              <span>{entry.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="tn-sec" id="how">
        <p className="tn-kicker">HOW IT WORKS</p>
        <h2>만드는 순서</h2>
        <ol className="tn-steps">
          {STEPS.map((step) => (
            <li key={step.no}>
              <b>{step.no}</b>
              <div>
                <strong>{step.title}</strong>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="tn-note">
          만드는 내용은 서버로 가지 않습니다. 보시는 브라우저 안에만 남고, 내보낸 파일만
          손에 남습니다.
        </p>
      </section>

      <section className="tn-band">
        <h2>지금 열어서 만들어 보십시오</h2>
        <p>가입도 설치도 없습니다. 눌러서 바로 시작합니다.</p>
        <Link className="tn-btn tn-btn-light" href="/builder">
          빌더 열기 →
        </Link>
      </section>

      <footer className="tn-foot">
        <div>
          <strong>{BRAND.company}</strong>
          <p>{BRAND.tagline}</p>
        </div>
        <div>
          <p>{BRAND.addressLines.join(" ")}</p>
          <p>
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            {" · "}
            <a href={BRAND.siteHref} target="_blank" rel="noopener noreferrer">
              {BRAND.site}
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
