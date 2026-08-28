"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSES, FORMATS, LEVELS } from "@/lib/questions";
import { parseQuestion } from "@/lib/parse-question";

type Row = {
  id: number;
  track: string;
  level: string;
  format: string;
  prompt: string;
  choices: string[] | null;
  answer: string | null;
  intent: string | null;
  published: boolean;
  createdAt: string;
};

type Draft = {
  id?: number;
  track: string;
  level: string;
  format: string;
  prompt: string;
  choices: string[];
  answer: string;
  intent: string;
  published: boolean;
};

const EMPTY: Draft = {
  track: "",
  level: "중급",
  format: "주관식",
  prompt: "",
  choices: ["", ""],
  answer: "",
  intent: "",
  published: false,
};

export default function AdminClient({
  authed,
  authConfigured,
  dbConfigured,
}: {
  authed: boolean;
  authConfigured: boolean;
  dbConfigured: boolean;
}) {
  const [loggedIn, setLoggedIn] = useState(authed);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [paste, setPaste] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!dbConfigured) return;
    const res = await fetch("/api/admin/questions");
    if (res.ok) setRows(((await res.json()) as { questions: Row[] }).questions);
  }, [dbConfigured]);

  // Initial fetch after login. The guard stops a late response writing state
  // into a component that has already gone away.
  useEffect(() => {
    if (!loggedIn || !dbConfigured) return;
    let alive = true;
    fetch("/api/admin/questions")
      .then((r) => (r.ok ? (r.json() as Promise<{ questions: Row[] }>) : null))
      .then((data) => {
        if (alive && data) setRows(data.questions);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn, dbConfigured]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      setPassword("");
      setLoggedIn(true);
    } else {
      setError(((await res.json()) as { error?: string }).error ?? "로그인에 실패했습니다.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setRows([]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...draft,
      choices: draft.format === "객관식" ? draft.choices.filter((c) => c.trim()) : [],
    };
    const res = await fetch("/api/admin/questions", {
      method: draft.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? "저장하지 못했습니다.");
      return;
    }
    setNotice(draft.id ? "수정했습니다." : "저장했습니다.");
    setDraft(EMPTY);
    setPaste("");
    void load();
  }

  async function remove(id: number) {
    if (!confirm("이 문제를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" });
    if (draft.id === id) setDraft(EMPTY);
    void load();
  }

  function edit(r: Row) {
    setDraft({
      id: r.id,
      track: r.track,
      level: r.level,
      format: r.format,
      prompt: r.prompt,
      choices: r.choices?.length ? r.choices : ["", ""],
      answer: r.answer ?? "",
      intent: r.intent ?? "",
      published: r.published,
    });
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyPaste() {
    const d = parseQuestion(paste);
    setDraft((prev) => ({
      ...prev,
      track: d.track || prev.track,
      level: d.level,
      format: d.format,
      prompt: d.prompt || prev.prompt,
      choices: d.choices.length ? d.choices : prev.choices,
      answer: d.answer || prev.answer,
      intent: d.intent || prev.intent,
    }));
    setNotice("초안을 채웠습니다. 분류가 맞는지 확인한 뒤 저장하십시오.");
  }

  if (!authConfigured) {
    return (
      <main className="admin">
        <div className="admin-shell">
          <h1>관리자 설정이 필요합니다</h1>
          <p className="admin-note">
            Vercel 프로젝트의 Settings → Environment Variables에 아래 두 값을 추가한 뒤 다시 배포하십시오.
            비밀번호는 저장소에 저장되지 않습니다.
          </p>
          <pre className="admin-pre">
{`ADMIN_PASSWORD          회장님이 사용하실 비밀번호
ADMIN_SESSION_SECRET    아무 긴 임의 문자열 (32자 이상 권장)`}
          </pre>
        </div>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="admin">
        <div className="admin-shell admin-shell--narrow">
          <h1>출제 관리자</h1>
          <p className="admin-note">비밀번호를 입력하십시오.</p>
          <form onSubmit={login} className="admin-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              required
            />
            <button className="admin-btn" disabled={busy}>
              {busy ? "확인 중…" : "로그인"}
            </button>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="admin">
      <div className="admin-shell">
        <header className="admin-head">
          <div>
            <h1>출제 관리</h1>
            <p className="admin-note">
              발행한 문제는 홈페이지 &lsquo;선발 테스트&rsquo; 항목에 최신순으로 표시됩니다. 정답과 출제 의도는 공개되지 않습니다.
            </p>
          </div>
          <button className="admin-btn admin-btn--quiet" onClick={logout}>로그아웃</button>
        </header>

        {!dbConfigured && (
          <div className="admin-warn">
            데이터베이스가 아직 연결되지 않아 저장할 수 없습니다. Vercel 대시보드에서 Storage → Create Database로
            Postgres를 만들면 접속 정보가 자동으로 주입됩니다.
          </div>
        )}

        <section className="admin-card">
          <h2>붙여넣기로 초안 만들기</h2>
          <p className="admin-note">
            문제를 그대로 붙여넣으면 과정·난이도·유형을 추정해 아래 항목을 채웁니다. 추정이므로 반드시 확인하십시오.
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={6}
            placeholder={"예)\n난이도: 상급\n경영권 분쟁\n포이즌필이 발동된 상황에서…\n① 첫 번째 보기\n② 두 번째 보기\n정답: ②\n출제 의도: 방어수단의 한계를 아는지"}
          />
          <button type="button" className="admin-btn admin-btn--quiet" onClick={applyPaste} disabled={!paste.trim()}>
            초안 채우기
          </button>
        </section>

        <form className="admin-card" onSubmit={save}>
          <h2>{draft.id ? `문제 수정 (#${draft.id})` : "새 문제"}</h2>

          <div className="admin-row">
            <label>
              과정
              <select value={draft.track} onChange={(e) => setDraft({ ...draft, track: e.target.value })} required>
                <option value="">선택</option>
                {COURSES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
            </label>
            <label>
              난이도
              <select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label>
              유형
              <select value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })}>
                {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>

          <label className="admin-field">
            문제
            <textarea
              rows={5}
              value={draft.prompt}
              onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              required
            />
          </label>

          {draft.format === "객관식" && (
            <div className="admin-field">
              <span>보기</span>
              {draft.choices.map((c, i) => (
                <div key={i} className="admin-choice">
                  <input
                    value={c}
                    onChange={(e) => {
                      const next = [...draft.choices];
                      next[i] = e.target.value;
                      setDraft({ ...draft, choices: next });
                    }}
                    placeholder={`보기 ${i + 1}`}
                  />
                  {draft.choices.length > 2 && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--quiet"
                      onClick={() => setDraft({ ...draft, choices: draft.choices.filter((_, j) => j !== i) })}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                onClick={() => setDraft({ ...draft, choices: [...draft.choices, ""] })}
              >
                보기 추가
              </button>
            </div>
          )}

          <div className="admin-row">
            <label className="admin-field">
              정답 <small>공개되지 않음</small>
              <input value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
            </label>
            <label className="admin-field">
              출제 의도 <small>공개되지 않음</small>
              <input value={draft.intent} onChange={(e) => setDraft({ ...draft, intent: e.target.value })} />
            </label>
          </div>

          <label className="admin-check">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />
            지금 홈페이지에 발행
          </label>

          <div className="admin-actions">
            <button className="admin-btn" disabled={busy || !dbConfigured}>
              {busy ? "저장 중…" : draft.id ? "수정 저장" : "저장"}
            </button>
            {draft.id && (
              <button type="button" className="admin-btn admin-btn--quiet" onClick={() => setDraft(EMPTY)}>
                새 문제로
              </button>
            )}
          </div>
          {error && <p className="admin-error">{error}</p>}
          {notice && <p className="admin-ok">{notice}</p>}
        </form>

        <section className="admin-card">
          <h2>등록된 문제 ({rows.length})</h2>
          {rows.length === 0 ? (
            <p className="admin-note">아직 등록된 문제가 없습니다.</p>
          ) : (
            <ul className="admin-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <div className="admin-list-meta">
                    <span className={r.published ? "admin-tag admin-tag--on" : "admin-tag"}>
                      {r.published ? "발행" : "임시"}
                    </span>
                    <span>{COURSES.find((c) => c.slug === r.track)?.label ?? r.track}</span>
                    <span>{r.level}</span>
                    <span>{r.format}</span>
                  </div>
                  <p className="admin-list-prompt">{r.prompt}</p>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--quiet" onClick={() => edit(r)}>수정</button>
                    <button className="admin-btn admin-btn--danger" onClick={() => remove(r.id)}>삭제</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
