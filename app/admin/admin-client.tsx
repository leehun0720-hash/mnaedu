"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSES, FORMATS, normalizeTrack } from "@/lib/questions";
import { parseQuestion } from "@/lib/parse-question";

/**
 * 관리자 화면 — 회장이 혼자 쓰는 곳.
 *
 * 하는 일은 셋뿐이다: 문제를 쓰고, 자료를 올리고, 누가 등록했는지 본다.
 * 채점도 등급도 포인트도 결제도 없다 — 회장의 손이 계속 가야 하는 일은
 * 이 화면에 두지 않는다는 것이 설계 원칙이다.
 */

type Row = {
  id: number;
  track: string;
  format: string;
  prompt: string;
  choices: string[] | null;
  answer: string | null;
  intent: string | null;
  explanation: string | null;
  published: boolean;
  createdAt: string;
};

type Draft = {
  id?: number;
  track: string;
  format: string;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
  published: boolean;
};

type DocRow = {
  id: number;
  title: string;
  summary: string | null;
  track: string | null;
  kind: string;
  fileName: string;
  fileSize: number;
  published: boolean;
  createdAt: string;
};

type MemberRow = { id: number; email: string; name: string | null; createdAt: string };

/** 분야 → 그 칸의 문제 수. 어디가 비어 있는지 보는 지도다. */
type Coverage = Record<string, { total: number; published: number }>;

type QuestionsResponse = { questions: Row[]; total: number; page: number; coverage: Coverage };
type DocumentsResponse = { documents: DocRow[] };
type MembersResponse = { members: MemberRow[]; total: number; page: number };

/** 목록 불러오기 실패 — 응답 대신 이 값이 돌아오면 화면에 이유를 띄운다 */
type FetchFailure = { failed: true; expired: boolean; message: string };
function isFailure(d: unknown): d is FetchFailure {
  return typeof d === "object" && d !== null && "failed" in d;
}

const EMPTY: Draft = {
  track: "",
  format: "주관식",
  prompt: "",
  choices: ["", "", "", ""],
  answer: "",
  explanation: "",
  published: false,
};

const PAGE_SIZE = 20;

function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Tab = "questions" | "documents" | "members";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("questions");

  // 문제
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [coverage, setCoverage] = useState<Coverage>({});
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [paste, setPaste] = useState("");
  const [query, setQuery] = useState("");
  const [filterTrack, setFilterTrack] = useState("");
  const [filterState, setFilterState] = useState("");

  // 자료실
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docSummary, setDocSummary] = useState("");
  const [docTrack, setDocTrack] = useState("");
  const [docKind, setDocKind] = useState("자료");
  const [docPublished, setDocPublished] = useState(true);

  // 회원
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);

  const readJson = useCallback(async <T,>(url: string): Promise<T | FetchFailure> => {
    try {
      const res = await fetch(url);
      if (res.status === 401) {
        setLoggedIn(false);
        return { failed: true, expired: true, message: "로그인이 만료되었습니다. 다시 로그인해 주십시오." };
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { failed: true, expired: false, message: body.error ?? "목록을 불러오지 못했습니다." };
      }
      return (await res.json()) as T;
    } catch {
      return { failed: true, expired: false, message: "연결에 실패했습니다." };
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (filterTrack) params.set("track", filterTrack);
    if (filterState) params.set("state", filterState);
    const data = await readJson<QuestionsResponse>(`/api/admin/questions?${params}`);
    if (isFailure(data)) {
      setError(data.message);
      return;
    }
    setRows(data.questions);
    setTotal(data.total);
    setCoverage(data.coverage ?? {});
  }, [page, query, filterTrack, filterState, readJson]);

  const loadDocuments = useCallback(async () => {
    const data = await readJson<DocumentsResponse>("/api/admin/documents");
    if (isFailure(data)) {
      setError(data.message);
      return;
    }
    setDocs(data.documents);
  }, [readJson]);

  const loadMembers = useCallback(async () => {
    const data = await readJson<MembersResponse>("/api/admin/members");
    if (isFailure(data)) {
      setError(data.message);
      return;
    }
    setMembers(data.members);
    setMemberTotal(data.total);
  }, [readJson]);

  // 상태 갱신은 반드시 await 뒤에서 일어나야 한다 — 탭을 빠르게 오갈 때
  // 먼저 띄운 요청이 나중에 도착해 화면을 덮어쓰지 않도록 alive로 막는다.
  useEffect(() => {
    if (!loggedIn || !dbConfigured) return;
    let alive = true;
    const load =
      tab === "questions" ? loadQuestions : tab === "documents" ? loadDocuments : loadMembers;
    Promise.resolve()
      .then(() => (alive ? load() : undefined))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loggedIn, dbConfigured, tab, loadQuestions, loadDocuments, loadMembers]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      setLoggedIn(true);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
  }

  // ── 문제 ────────────────────────────────────────────────────────────
  function applyPaste() {
    const d = parseQuestion(paste);
    setDraft((prev) => ({
      ...prev,
      track: d.track || prev.track,
      format: d.format,
      prompt: d.prompt || prev.prompt,
      choices: d.choices.length ? [...d.choices, "", ""].slice(0, Math.max(4, d.choices.length)) : prev.choices,
      answer: d.answer || prev.answer,
      explanation: d.explanation || prev.explanation,
    }));
    setNotice("초안을 채웠습니다. 저장 전에 확인해 주십시오.");
  }

  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        ...draft,
        choices: draft.format === "객관식" ? draft.choices.filter((c) => c.trim()) : [],
      };
      const res = await fetch("/api/admin/questions", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "저장하지 못했습니다.");
        return;
      }
      setDraft(EMPTY);
      setPaste("");
      setNotice(draft.id ? "수정했습니다." : "저장했습니다.");
      await loadQuestions();
    } finally {
      setBusy(false);
    }
  }

  function editQuestion(r: Row) {
    setDraft({
      id: r.id,
      track: normalizeTrack(r.track),
      format: r.format,
      prompt: r.prompt,
      choices: r.choices?.length ? [...r.choices] : ["", "", "", ""],
      answer: r.answer ?? "",
      explanation: r.explanation ?? "",
      published: r.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeQuestion(id: number) {
    if (!confirm("이 문제를 지울까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" });
    await loadQuestions();
  }

  async function togglePublish(r: Row) {
    await fetch("/api/admin/questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r.id,
        track: r.track,
        format: r.format,
        prompt: r.prompt,
        choices: r.choices ?? [],
        answer: r.answer ?? "",
        explanation: r.explanation ?? "",
        published: !r.published,
      }),
    });
    await loadQuestions();
  }

  // ── 자료실 ──────────────────────────────────────────────────────────
  async function uploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) {
      setError("파일을 선택해 주십시오.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("file", docFile);
      form.set("title", docTitle);
      form.set("summary", docSummary);
      form.set("track", docTrack);
      form.set("kind", docKind);
      form.set("published", String(docPublished));
      const res = await fetch("/api/admin/documents", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "올리지 못했습니다.");
        return;
      }
      setDocFile(null);
      setDocTitle("");
      setDocSummary("");
      setDocTrack("");
      setNotice("자료를 올렸습니다.");
      await loadDocuments();
    } finally {
      setBusy(false);
    }
  }

  async function toggleDocPublish(d: DocRow) {
    await fetch("/api/admin/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: d.id,
        title: d.title,
        summary: d.summary ?? "",
        track: d.track ?? "",
        kind: d.kind,
        published: !d.published,
      }),
    });
    await loadDocuments();
  }

  async function removeDocument(id: number) {
    if (!confirm("이 자료를 지울까요? 파일도 함께 사라지며 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/documents?id=${id}`, { method: "DELETE" });
    await loadDocuments();
  }

  // ── 화면 ────────────────────────────────────────────────────────────
  if (!authConfigured) {
    return (
      <main className="admin">
        <div className="admin-shell admin-shell--narrow">
          <h1>관리자 설정이 필요합니다</h1>
          <p className="admin-note">
            Vercel 프로젝트 설정에 아래 두 값을 넣고 다시 배포하십시오. 저장소가 공개되어 있으므로
            비밀번호는 코드에 두지 않습니다.
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
          <h1>관리자</h1>
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

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="admin">
      <div className="admin-shell">
        <header className="admin-head">
          <div>
            <h1>관리자</h1>
            <p className="admin-note">
              발행한 문제와 자료는 홈페이지에 최신순으로 올라갑니다. 정답과 해설은 로그인한 회원에게만 열립니다.
            </p>
          </div>
          <button className="admin-btn admin-btn--quiet" onClick={logout}>
            로그아웃
          </button>
        </header>

        {!dbConfigured && (
          <div className="admin-warn">
            데이터베이스가 연결되지 않아 저장할 수 없습니다. SUPABASE.md의 절차대로 연결해 주십시오.
          </div>
        )}

        <nav className="admin-tabs">
          <button data-on={tab === "questions"} onClick={() => setTab("questions")}>
            문제 출제
          </button>
          <button data-on={tab === "documents"} onClick={() => setTab("documents")}>
            자료실
          </button>
          <button data-on={tab === "members"} onClick={() => setTab("members")}>
            회원
          </button>
        </nav>

        {error && <p className="admin-error">{error}</p>}
        {notice && <p className="admin-notice">{notice}</p>}

        {/* ── 문제 출제 ── */}
        {tab === "questions" && (
          <>
            <section className="admin-card">
              <h2>붙여넣기로 초안 만들기</h2>
              <p className="admin-note">
                문제를 그대로 붙여넣으면 분야·유형·보기·정답을 추정해 아래 항목을 채웁니다. 추정이므로 반드시 확인하십시오.
              </p>
              <textarea
                className="admin-paste"
                rows={7}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={"예)\n경영권 분쟁\n대상회사가 방어수단을 발동한 상황에서…\n① 첫 번째 보기\n② 두 번째 보기\n정답: ②\n해설: 왜 그 논거가 성립하는지"}
              />
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                onClick={applyPaste}
                disabled={!paste.trim()}
              >
                초안 채우기
              </button>
            </section>

            <form className="admin-card" onSubmit={saveQuestion}>
              <h2>{draft.id ? `문제 수정 (#${draft.id})` : "새 문제"}</h2>

              <div className="admin-row">
                <label>
                  업무 분야
                  <select
                    value={draft.track}
                    onChange={(e) => setDraft({ ...draft, track: e.target.value })}
                    required
                  >
                    <option value="">선택</option>
                    {COURSES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  유형
                  <select
                    value={draft.format}
                    onChange={(e) => setDraft({ ...draft, format: e.target.value })}
                  >
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="admin-field">
                문제 <small>누구나 볼 수 있습니다</small>
                <textarea
                  rows={5}
                  value={draft.prompt}
                  onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                  required
                />
              </label>

              {draft.format === "객관식" && (
                <div className="admin-choices">
                  {draft.choices.map((c, i) => (
                    <label key={i} className="admin-field">
                      보기 {"①②③④⑤"[i] ?? i + 1}
                      <input
                        value={c}
                        onChange={(e) => {
                          const next = [...draft.choices];
                          next[i] = e.target.value;
                          setDraft({ ...draft, choices: next });
                        }}
                      />
                    </label>
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

              <label className="admin-field">
                정답 <small>로그인한 회원에게 공개됩니다</small>
                <textarea
                  rows={4}
                  value={draft.answer}
                  onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                />
              </label>

              <label className="admin-field">
                해설 <small>로그인한 회원에게 공개됩니다 — 실무에서 갈리는 지점</small>
                <textarea
                  rows={5}
                  value={draft.explanation}
                  onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                />
              </label>

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />
                발행 — 체크해야 홈페이지에 나타납니다
              </label>

              <div className="admin-actions">
                <button className="admin-btn" disabled={busy || !dbConfigured}>
                  {busy ? "저장 중…" : draft.id ? "수정 저장" : "저장"}
                </button>
                {draft.id && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--quiet"
                    onClick={() => setDraft(EMPTY)}
                  >
                    새 문제로
                  </button>
                )}
              </div>
            </form>

            <section className="admin-card">
              <h2>출제 현황 ({total}건)</h2>
              <div className="admin-coverage">
                {COURSES.map((c) => {
                  const slot = coverage[c.slug] ?? { total: 0, published: 0 };
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      className="admin-cov"
                      data-empty={slot.total === 0}
                      data-on={filterTrack === c.slug}
                      onClick={() => {
                        setFilterTrack(filterTrack === c.slug ? "" : c.slug);
                        setPage(1);
                      }}
                    >
                      <span className="admin-cov-name">{c.label}</span>
                      <span className="admin-cov-count">
                        {slot.published} / {slot.total}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="admin-filters">
                <input
                  placeholder="문제 본문 검색"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
                <select
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">전체 상태</option>
                  <option value="published">발행</option>
                  <option value="draft">임시</option>
                  <option value="incomplete">미완성 (정답·해설 없음)</option>
                </select>
              </div>

              {rows.length === 0 ? (
                <p className="admin-note">해당하는 문제가 없습니다.</p>
              ) : (
                <ul className="admin-list">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <div className="admin-list-meta">
                        <span className={r.published ? "admin-tag admin-tag--on" : "admin-tag"}>
                          {r.published ? "발행" : "임시"}
                        </span>
                        <span>{COURSES.find((c) => c.slug === normalizeTrack(r.track))?.label ?? r.track}</span>
                        <span>{r.format}</span>
                        {!r.answer && <span className="admin-tag admin-tag--warn">정답 없음</span>}
                        {!r.explanation && <span className="admin-tag admin-tag--warn">해설 없음</span>}
                      </div>
                      <p className="admin-list-prompt">{r.prompt}</p>
                      {r.intent && (
                        <p className="admin-legacy">
                          <strong>옛 출제 의도(비공개 보관):</strong> {r.intent}
                          <span className="admin-legacy-note">
                            비공개를 전제로 쓰신 메모라 어디에도 공개하지 않습니다. 공개할 내용이라면 위 해설 칸에 옮겨 적어 주십시오.
                          </span>
                        </p>
                      )}
                      <div className="admin-actions">
                        <button className="admin-btn admin-btn--quiet" onClick={() => editQuestion(r)}>
                          수정
                        </button>
                        <button className="admin-btn admin-btn--quiet" onClick={() => togglePublish(r)}>
                          {r.published ? "발행 취소" : "발행"}
                        </button>
                        <button className="admin-btn admin-btn--danger" onClick={() => removeQuestion(r.id)}>
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {pages > 1 && (
                <div className="admin-pager">
                  <button
                    className="admin-btn admin-btn--quiet"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    이전
                  </button>
                  <span>
                    {page} / {pages}
                  </span>
                  <button
                    className="admin-btn admin-btn--quiet"
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    다음
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── 자료실 ── */}
        {tab === "documents" && (
          <>
            <form className="admin-card" onSubmit={uploadDocument}>
              <h2>자료 올리기</h2>
              <p className="admin-note">
                워드(.doc·.docx) · PDF · 한글(.hwp·.hwpx) 파일을 올릴 수 있습니다. 한 건에 8 MB까지입니다.
              </p>

              <label className="admin-field">
                파일
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,.hwp,.hwpx"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setDocFile(f);
                    if (f && !docTitle) setDocTitle(f.name.replace(/\.[^.]+$/, ""));
                  }}
                  required
                />
              </label>

              <label className="admin-field">
                제목
                <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
              </label>

              <label className="admin-field">
                한 줄 설명 <small>목록에 제목 아래로 보입니다</small>
                <input value={docSummary} onChange={(e) => setDocSummary(e.target.value)} />
              </label>

              <div className="admin-row">
                <label>
                  분야 <small>선택</small>
                  <select value={docTrack} onChange={(e) => setDocTrack(e.target.value)}>
                    <option value="">분류 없음</option>
                    {COURSES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  구분
                  <select value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                    <option value="자료">자료</option>
                    <option value="칼럼">칼럼</option>
                  </select>
                </label>
              </div>

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={docPublished}
                  onChange={(e) => setDocPublished(e.target.checked)}
                />
                발행 — 체크해야 홈페이지 자료실에 나타납니다
              </label>

              <div className="admin-actions">
                <button className="admin-btn" disabled={busy || !dbConfigured}>
                  {busy ? "올리는 중…" : "올리기"}
                </button>
              </div>
            </form>

            <section className="admin-card">
              <h2>올린 자료 ({docs.length}건)</h2>
              {docs.length === 0 ? (
                <p className="admin-note">아직 올린 자료가 없습니다.</p>
              ) : (
                <ul className="admin-list">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <div className="admin-list-meta">
                        <span className={d.published ? "admin-tag admin-tag--on" : "admin-tag"}>
                          {d.published ? "발행" : "임시"}
                        </span>
                        <span>{d.kind}</span>
                        {d.track && (
                          <span>{COURSES.find((c) => c.slug === normalizeTrack(d.track!))?.label ?? d.track}</span>
                        )}
                        <span>{formatSize(d.fileSize)}</span>
                        <span>{d.createdAt.slice(0, 10)}</span>
                      </div>
                      <p className="admin-list-prompt">
                        <strong>{d.title}</strong>
                        {d.summary && <> — {d.summary}</>}
                      </p>
                      <p className="admin-note">{d.fileName}</p>
                      <div className="admin-actions">
                        <a className="admin-btn admin-btn--quiet" href={`/api/documents/${d.id}`}>
                          받아보기
                        </a>
                        <button className="admin-btn admin-btn--quiet" onClick={() => toggleDocPublish(d)}>
                          {d.published ? "발행 취소" : "발행"}
                        </button>
                        <button className="admin-btn admin-btn--danger" onClick={() => removeDocument(d.id)}>
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ── 회원 ── */}
        {tab === "members" && (
          <section className="admin-card">
            <h2>회원 ({memberTotal}명)</h2>
            <p className="admin-note">
              정답과 해설을 열람하려고 등록한 분들입니다. 등급도 결제도 없으므로 여기서 조정할 것은 없습니다.
            </p>
            {members.length === 0 ? (
              <p className="admin-note">아직 등록한 회원이 없습니다.</p>
            ) : (
              <ul className="admin-list">
                {members.map((m) => (
                  <li key={m.id}>
                    <div className="admin-list-meta">
                      <span>{m.name ?? "이름 미기재"}</span>
                      <span>{m.email}</span>
                      <span>{m.createdAt.slice(0, 10)} 등록</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
