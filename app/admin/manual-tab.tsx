"use client";

import { useEffect, useState } from "react";
import type { ManualDoc } from "./manual-content";

/**
 * 「사용 안내」 탭 — 저장소의 안내서를 관리자 화면 안에서 읽는다.
 *
 * 회장 지시(2026-10-02): 매뉴얼을 관리자 페이지에서 확인할 수 있게.
 *
 * 내용은 scripts/build-manual.mjs 가 ADMIN.md · MANUAL.md · SUPABASE.md 에서
 * 미리 만들어 둔 것이다. 이 탭을 열 때에만 따로 불러온다 — 다른 탭을 쓰실 때
 * 안내서 무게를 함께 지고 다니지 않게.
 */
export default function ManualTab() {
  const [docs, setDocs] = useState<ManualDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState("admin");

  useEffect(() => {
    let alive = true;
    import("./manual-content")
      .then((m) => {
        if (alive) setDocs(m.MANUAL_DOCS);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <section className="admin-card">
        <p className="admin-error">안내서를 불러오지 못했습니다. 화면을 새로고침해 주십시오.</p>
      </section>
    );
  }
  if (!docs) {
    return (
      <section className="admin-card">
        <p className="admin-note">안내서를 불러오는 중입니다…</p>
      </section>
    );
  }

  const doc = docs.find((d) => d.id === current) ?? docs[0];

  return (
    <section className="admin-card admin-manual">
      <div className="admin-manual-tools">
        <div>
          <h2>사용 안내</h2>
          <p className="admin-note">
            기능을 고칠 때마다 함께 고쳐 온 안내서입니다. 위의 이름을 눌러 문서를 바꾸고, 목차를
            눌러 그 자리로 건너뛰십시오.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--quiet" onClick={() => window.print()}>
          인쇄 · PDF로 저장
        </button>
      </div>

      <div className="admin-manual-switch" role="tablist" aria-label="안내서">
        {docs.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === doc.id}
            data-on={d.id === doc.id}
            onClick={() => {
              setCurrent(d.id);
              // 문서를 바꾸면 맨 위부터 — 앞 문서에서 내려와 있던 자리에 머물지 않게
              document.querySelector(".admin-manual")?.scrollIntoView({ block: "start" });
            }}
          >
            {d.title}
          </button>
        ))}
      </div>

      {doc.toc.length > 0 && (
        <nav className="admin-manual-toc" aria-label="목차">
          <p>목차</p>
          <ol>
            {doc.toc.map((t) => (
              <li key={t.anchor}>
                <a href={`#${t.anchor}`} dangerouslySetInnerHTML={{ __html: t.html }} />
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* 저장소의 안내서를 미리 바꾼 것 — 방문자 입력이 섞이지 않는다 */}
      <article key={doc.id} className="manual-body" dangerouslySetInnerHTML={{ __html: doc.html }} />
    </section>
  );
}
