import type { Metadata } from "next";
import Link from "next/link";
import { HELP_SECTIONS } from "@/lib/help";
import AuthShell from "../auth-shell";

export const metadata: Metadata = {
  title: "이용 안내 | M&A 아카데미",
  description: "회원 가입부터 문제 풀이·채점·포인트·해설·유료 전환까지, 아카데미 이용 방법을 안내합니다.",
  robots: { index: false, follow: false },
};

/**
 * 회원용 도움말. 내용은 lib/help.ts 한 곳에서 오므로, 규칙이 바뀌면
 * 안내도 함께 바뀐다 — 여기 손으로 다시 적지 않는다.
 */
export default function HelpPage() {
  return (
    <AuthShell>
      <div className="help-page">
        <p className="me-eyebrow">이용 안내</p>
        <h1>아카데미 이용 방법</h1>
        <p className="help-lead">
          가입부터 문제 풀이·채점·포인트·해설·유료 전환까지, 자주 찾는 안내를 모았습니다.
        </p>

        <nav className="help-toc" aria-label="안내 목차">
          {HELP_SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>

        {HELP_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="help-section">
            <h2>{section.title}</h2>
            {section.intro && <p className="help-section-intro">{section.intro}</p>}
            <div className="help-blocks">
              {section.blocks.map((block, i) => (
                <details key={i} className="help-block">
                  <summary>{block.q}</summary>
                  <div className="help-answer">
                    {block.a.map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="help-foot">
          <p>더 궁금한 점이 있으시면 홈페이지 문의사항으로 연락 주십시오.</p>
          <p className="quiz-back">
            <Link href="/academy">← 아카데미</Link>
            <Link href="/company#contact">문의하기 →</Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
