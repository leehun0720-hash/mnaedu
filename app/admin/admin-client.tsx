"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSES, FORMATS, STAGES, normalizeStage, normalizeTrack } from "@/lib/questions";
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
  stage: string | null;
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
  stage: string;
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
  stage: string | null;
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
  stage: "",
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

type Tab = "questions" | "articles" | "documents" | "members" | "settings";

type ArticleRow = {
  id: number;
  slug: string;
  title: string;
  lede: string | null;
  source: string | null;
  track: string | null;
  stage: string | null;
  publishedOn: string | null;
  published: boolean;
  createdAt: string;
};

type ArticleDraft = {
  id?: number;
  title: string;
  lede: string;
  body: string;
  source: string;
  publishedOn: string;
  track: string;
  stage: string;
  published: boolean;
};

const EMPTY_ARTICLE: ArticleDraft = {
  title: "",
  lede: "",
  body: "",
  source: "",
  publishedOn: "",
  track: "",
  stage: "",
  published: true,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("questions");
  /** 휴대전화에서 무엇을 쳤는지 눈으로 확인하시게 한다 — 틀린 이유의 대부분이 오타다 */
  const [showPassword, setShowPassword] = useState(false);

  // 문제
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [coverage, setCoverage] = useState<Coverage>({});
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [paste, setPaste] = useState("");
  const [query, setQuery] = useState("");
  const [filterTrack, setFilterTrack] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterState, setFilterState] = useState("");

  // 자료실
  const [docs, setDocs] = useState<DocRow[]>([]);
  /** 값이 있으면 새로 올리는 것이 아니라 이미 올린 자료를 고치는 중이다 */
  const [docId, setDocId] = useState<number | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docSummary, setDocSummary] = useState("");
  const [docTrack, setDocTrack] = useState("");
  const [docStage, setDocStage] = useState("");
  const [docKind, setDocKind] = useState("자료");
  const [docPublished, setDocPublished] = useState(true);

  // 칼럼
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [articleDraft, setArticleDraft] = useState<ArticleDraft>(EMPTY_ARTICLE);

  // 회원
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);

  // 비밀번호 변경
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwInfo, setPwInfo] = useState<{ changedAt: string | null; usingEnv: boolean } | null>(null);

  const readJson = useCallback(async <T,>(url: string): Promise<T | FetchFailure> => {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 30000);
    try {
      const res = await fetch(url, { signal: abort.signal });
      if (res.status === 401) {
        setLoggedIn(false);
        return { failed: true, expired: true, message: "로그인이 만료되었습니다. 다시 로그인해 주십시오." };
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { failed: true, expired: false, message: body.error ?? "목록을 불러오지 못했습니다." };
      }
      return (await res.json()) as T;
    } catch (err) {
      return {
        failed: true,
        expired: false,
        message:
          err instanceof DOMException && err.name === "AbortError"
            ? "서버가 응답하지 않아 목록을 불러오지 못했습니다."
            : "연결에 실패했습니다.",
      };
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (filterTrack) params.set("track", filterTrack);
    if (filterStage) params.set("stage", filterStage);
    if (filterState) params.set("state", filterState);
    const data = await readJson<QuestionsResponse>(`/api/admin/questions?${params}`);
    if (isFailure(data)) {
      setError(data.message);
      return;
    }
    setRows(data.questions);
    setTotal(data.total);
    setCoverage(data.coverage ?? {});
  }, [page, query, filterTrack, filterStage, filterState, readJson]);

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

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (pwNext !== pwConfirm) {
      setError("새 비밀번호와 확인이 서로 다릅니다.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: pwCurrent, next: pwNext }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "비밀번호를 바꾸지 못했습니다.");
        return;
      }
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
      setNotice("비밀번호를 바꿨습니다. 다른 곳에 남아 있던 로그인은 모두 끊겼습니다.");
      await loadPasswordInfo();
    } catch {
      setError("연결에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const loadPasswordInfo = useCallback(async () => {
    const data = await readJson<{ changedAt: string | null; usingEnv: boolean }>("/api/admin/password");
    if (isFailure(data)) {
      setError(data.message);
      return;
    }
    setPwInfo(data);
  }, [readJson]);

  const loadArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/articles");
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { articles?: ArticleRow[]; error?: string }) : {};
      if (!res.ok) {
        // 표가 없을 때 이유를 화면에 드러낸다 — 빈 목록으로 두면 원인을 알 수 없다
        setError(data.error ?? "칼럼 목록을 불러오지 못했습니다.");
        setArticles([]);
        return;
      }
      setArticles(data.articles ?? []);
    } catch {
      setError("칼럼 목록을 불러오지 못했습니다.");
      setArticles([]);
    }
  }, []);

  // 상태 갱신은 반드시 await 뒤에서 일어나야 한다 — 탭을 빠르게 오갈 때
  // 먼저 띄운 요청이 나중에 도착해 화면을 덮어쓰지 않도록 alive로 막는다.
  useEffect(() => {
    if (!loggedIn || !dbConfigured) return;
    let alive = true;
    const load =
      tab === "questions"
        ? loadQuestions
        : tab === "articles"
          ? loadArticles
          : tab === "documents"
            ? loadDocuments
            : tab === "settings"
              ? loadPasswordInfo
              : loadMembers;
    Promise.resolve()
      .then(() => (alive ? load() : undefined))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loggedIn, dbConfigured, tab, loadQuestions, loadArticles, loadDocuments, loadMembers, loadPasswordInfo]);

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

  /**
   * 응답을 JSON 으로 읽되, 본문이 JSON 이 아니면 던지지 않는다.
   * 서버가 오류 쪽(HTML)을 돌려줄 때 화면이 조용히 멎는 것을 막는다.
   */
  async function readResponse(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: `서버가 예상 밖의 응답을 보냈습니다 (${res.status}).` };
    }
  }

  /**
   * 관리자 화면에서 무언가를 저장·삭제하는 요청은 모두 이 문을 지난다.
   *
   * 응답이 영영 오지 않으면 단추는 "저장 중…"에 갇히고, 서버가 JSON 대신
   * 오류 쪽을 돌려주면 화면은 말없이 멎는다. 회장님 쪽에서는 둘 다 "눌러도
   * 아무 일이 없다"로 보인다. 그래서 기다림에 끝을 두고, 어떤 실패든 반드시
   * 한 문장으로 돌려준다 — 실패를 보여 주는 편이 침묵보다 낫다.
   */
  async function send(
    url: string,
    init: RequestInit,
    /** 기다려 드릴 시간. 성한 저장은 1초면 끝나므로 20초면 넉넉하다. */
    limitMs = 20000
  ): Promise<{ ok: boolean; data: Record<string, unknown>; error: string | null }> {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), limitMs);
    try {
      const res = await fetch(url, { ...init, signal: abort.signal });
      const data = await readResponse(res);
      if (res.status === 401) {
        setLoggedIn(false);
        return { ok: false, data, error: "로그인이 만료되었습니다. 다시 로그인해 주십시오." };
      }
      if (!res.ok) return { ok: false, data, error: (data.error as string) ?? "처리하지 못했습니다." };
      return { ok: true, data, error: null };
    } catch (err) {
      return {
        ok: false,
        data: {},
        error:
          err instanceof DOMException && err.name === "AbortError"
            ? "서버가 응답하지 않아 중단했습니다. 잠시 후 다시 시도해 주십시오. 반복되면 알려 주십시오."
            : "연결에 실패했습니다. 인터넷 상태를 확인하고 다시 시도해 주십시오.",
      };
    } finally {
      window.clearTimeout(timer);
    }
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
      const out = await send("/api/admin/questions", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!out.ok) {
        setError(out.error ?? "저장하지 못했습니다.");
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
      stage: normalizeStage(r.stage) ?? "",
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
    setError(null);
    const out = await send(`/api/admin/questions?id=${id}`, { method: "DELETE" });
    if (!out.ok) {
      setError(out.error ?? "삭제하지 못했습니다.");
      return;
    }
    await loadQuestions();
  }

  async function togglePublish(r: Row) {
    setError(null);
    const out = await send("/api/admin/questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r.id,
        // 개편 전 슬러그로 저장된 행도 있다. 그대로 되보내면 서버가 물린다.
        track: normalizeTrack(r.track),
        stage: r.stage ?? "",
        format: r.format,
        prompt: r.prompt,
        choices: r.choices ?? [],
        answer: r.answer ?? "",
        explanation: r.explanation ?? "",
        published: !r.published,
      }),
    });
    if (!out.ok) {
      setError(out.error ?? "발행 상태를 바꾸지 못했습니다.");
      return;
    }
    await loadQuestions();
  }

  async function saveArticle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const out = await send("/api/admin/articles", {
        method: articleDraft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleDraft),
      });
      if (!out.ok) {
        setError(out.error ?? "저장하지 못했습니다.");
        return;
      }
      const saved = out.data.article as { slug?: string } | undefined;
      setNotice(
        articleDraft.id
          ? "칼럼을 수정했습니다."
          : `칼럼을 올렸습니다. 주소: /insights/${saved?.slug ?? ""}`
      );
      setArticleDraft(EMPTY_ARTICLE);
      await loadArticles();
    } finally {
      setBusy(false);
    }
  }

  async function editArticle(row: ArticleRow) {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/articles?id=${row.id}`);
    if (!res.ok) {
      setError("칼럼을 불러오지 못했습니다.");
      return;
    }
    const data = (await res.json()) as {
      article: { body: string; publishedOn: string | null };
    };
    setArticleDraft({
      id: row.id,
      title: row.title,
      lede: row.lede ?? "",
      body: data.article.body,
      source: row.source ?? "",
      publishedOn: data.article.publishedOn ? data.article.publishedOn.slice(0, 10) : "",
      track: row.track ? normalizeTrack(row.track) : "",
      stage: normalizeStage(row.stage) ?? "",
      published: row.published,
    });
    window.scrollTo({ top: 0 });
  }

  /** 발행 토글처럼 일부만 바꿀 때도 PUT이 요구하는 전체를 갖춰 보낸다 */
  async function articlePayload(row: ArticleRow) {
    const res = await fetch(`/api/admin/articles?id=${row.id}`);
    const data = (await res.json()) as {
      article: { title: string; lede: string | null; body: string; source: string | null; publishedOn: string | null; track: string | null; stage: string | null };
    };
    return {
      id: row.id,
      title: data.article.title,
      lede: data.article.lede ?? "",
      body: data.article.body,
      source: data.article.source ?? "",
      publishedOn: data.article.publishedOn ?? "",
      track: data.article.track ? normalizeTrack(data.article.track) : "",
      stage: normalizeStage(data.article.stage) ?? "",
    };
  }

  async function toggleArticlePublish(row: ArticleRow) {
    setError(null);
    const out = await send("/api/admin/articles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // PUT은 제목·본문을 검증하므로 토글만 보내면 400이 된다. 본문을 함께 싣는다.
      body: JSON.stringify({ ...(await articlePayload(row)), published: !row.published }),
    });
    if (!out.ok) {
      setError(out.error ?? "발행 상태를 바꾸지 못했습니다.");
      return;
    }
    await loadArticles();
  }

  async function removeArticle(id: number) {
    if (!window.confirm("이 칼럼을 삭제할까요? 검색에 걸린 주소도 함께 사라집니다.")) return;
    setError(null);
    const out = await send(`/api/admin/articles?id=${id}`, { method: "DELETE" });
    if (!out.ok) {
      setError(out.error ?? "삭제하지 못했습니다.");
      return;
    }
    await loadArticles();
  }

  // ── 자료실 ──────────────────────────────────────────────────────────
  function resetDocForm() {
    setDocId(null);
    setDocFile(null);
    setDocTitle("");
    setDocSummary("");
    setDocTrack("");
    setDocStage("");
    setDocKind("자료");
    setDocPublished(true);
  }

  /**
   * 이미 올린 자료를 고친다 — 제목·설명·분야·구분·발행 여부까지.
   * 파일 자체는 바꾸지 않는다. 파일이 바뀌면 그것은 다른 자료이므로 새로 올린다.
   */
  function editDocument(d: DocRow) {
    setError(null);
    setNotice(null);
    setDocId(d.id);
    setDocFile(null);
    setDocTitle(d.title);
    setDocSummary(d.summary ?? "");
    setDocTrack(d.track ? normalizeTrack(d.track) : "");
    setDocStage(normalizeStage(d.stage) ?? "");
    setDocKind(d.kind);
    setDocPublished(d.published);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDocument(e: React.FormEvent) {
    e.preventDefault();
    if (docId === null && !docFile) {
      setError("파일을 선택해 주십시오.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const out =
        docId === null
          ? // 8 MB짜리가 휴대전화 회선으로 올라갈 수 있다 — 이쪽만 길게 기다린다
            await send("/api/admin/documents", { method: "POST", body: docFormData(docFile!) }, 120000)
          : await send("/api/admin/documents", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: docId,
                title: docTitle,
                summary: docSummary,
                track: docTrack,
                stage: docStage,
                kind: docKind,
                published: docPublished,
              }),
            });
      if (!out.ok) {
        setError(out.error ?? (docId === null ? "올리지 못했습니다." : "수정하지 못했습니다."));
        return;
      }
      setNotice(docId === null ? "자료를 올렸습니다." : "자료를 수정했습니다.");
      resetDocForm();
      await loadDocuments();
    } finally {
      setBusy(false);
    }
  }

  function docFormData(file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("title", docTitle);
    form.set("summary", docSummary);
    form.set("track", docTrack);
    form.set("stage", docStage);
    form.set("kind", docKind);
    form.set("published", String(docPublished));
    return form;
  }

  async function toggleDocPublish(d: DocRow) {
    setError(null);
    const out = await send("/api/admin/documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: d.id,
        title: d.title,
        summary: d.summary ?? "",
        // 옛 슬러그를 그대로 보내면 서버가 분야 없음으로 지워 버린다
        track: d.track ? normalizeTrack(d.track) : "",
        stage: d.stage ?? "",
        kind: d.kind,
        published: !d.published,
      }),
    });
    if (!out.ok) {
      setError(out.error ?? "발행 상태를 바꾸지 못했습니다.");
      return;
    }
    await loadDocuments();
  }

  async function removeDocument(id: number) {
    if (!confirm("이 자료를 지울까요? 파일도 함께 사라지며 되돌릴 수 없습니다.")) return;
    setError(null);
    const out = await send(`/api/admin/documents?id=${id}`, { method: "DELETE" });
    if (!out.ok) {
      setError(out.error ?? "삭제하지 못했습니다.");
      return;
    }
    if (docId === id) resetDocForm();
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
            <div className="admin-pwrow">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                // 휴대전화 자판이 첫 글자를 대문자로 바꾸거나 자동수정하면
                // 맞는 비밀번호도 틀리게 들어간다
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
              />
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? "가리기" : "표시"}
              </button>
            </div>
            <button className="admin-btn" disabled={busy}>
              {busy ? "확인 중…" : "로그인"}
            </button>
          </form>
          {error && (
            <>
              <p className="admin-error">{error}</p>
              <p className="admin-note">
                「표시」를 눌러 대·소문자와 특수문자가 그대로 들어갔는지 확인해 보십시오. 비밀번호를 방금
                바꾸셨다면 재배포가 끝난 뒤에 적용됩니다.
              </p>
            </>
          )}
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
          <button data-on={tab === "articles"} onClick={() => setTab("articles")}>
            칼럼
          </button>
          <button data-on={tab === "documents"} onClick={() => setTab("documents")}>
            자료실
          </button>
          <button data-on={tab === "members"} onClick={() => setTab("members")}>
            회원
          </button>
          <button data-on={tab === "settings"} onClick={() => setTab("settings")}>
            비밀번호
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
                  단계 <small>같은 분야 안에서 기초·심화로 나눕니다</small>
                  <select
                    value={draft.stage}
                    onChange={(e) => setDraft({ ...draft, stage: e.target.value })}
                  >
                    <option value="">나누지 않음</option>
                    {STAGES.map((v) => (
                      <option key={v} value={v}>
                        {v}
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
                  value={filterStage}
                  onChange={(e) => {
                    setFilterStage(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">전체 단계</option>
                  {STAGES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value="none">나누지 않은 것</option>
                </select>
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
                        {r.stage && <span>{r.stage}</span>}
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

        {/* ── 칼럼 ── */}
        {tab === "articles" && (
          <>
            <form className="admin-card" onSubmit={saveArticle}>
              <h2>{articleDraft.id ? `칼럼 수정 (#${articleDraft.id})` : "칼럼 올리기"}</h2>
              <p className="admin-note">
                <strong>글은 여기서 올리십시오.</strong> 파일을 내려받게 하는 것이 아니라 읽히는 글입니다 —
                제목과 본문만 붙여넣으면 웹 페이지로 발행되어 검색에 잡힙니다. 아주경제 연재분을 옮기실 때도 씁니다.
              </p>
              <p className="admin-note">
                아래에서 <strong>분야</strong>를 정하시면 그 분야 화면의 <strong>업무자료</strong>에도 함께 서고,
                누르면 이 글을 읽는 쪽으로 이어집니다. 분야를 비우시면 칼럼 목록에만 섭니다.
              </p>

              <label className="admin-field">
                제목
                <input
                  value={articleDraft.title}
                  onChange={(e) => setArticleDraft({ ...articleDraft, title: e.target.value })}
                  maxLength={200}
                  required
                />
              </label>

              <label className="admin-field">
                본문 <small>워드에서 그대로 붙여넣으십시오. 빈 줄이 문단을 나눕니다.</small>
                <textarea
                  rows={14}
                  value={articleDraft.body}
                  onChange={(e) => setArticleDraft({ ...articleDraft, body: e.target.value })}
                  required
                />
              </label>

              <label className="admin-field">
                요약 <small>비우면 본문 앞부분을 씁니다 — 검색 결과에 보이는 설명입니다.</small>
                <input
                  value={articleDraft.lede}
                  onChange={(e) => setArticleDraft({ ...articleDraft, lede: e.target.value })}
                  maxLength={300}
                />
              </label>

              <div className="admin-row">
                <label>
                  게재처 <small>다른 매체에 실렸던 글일 때만</small>
                  <input
                    value={articleDraft.source}
                    onChange={(e) => setArticleDraft({ ...articleDraft, source: e.target.value })}
                    placeholder="비워 두면 매체 이름이 붙지 않습니다"
                    maxLength={60}
                  />
                </label>
                <label>
                  게재일 <small>원문이 실린 날</small>
                  <input
                    type="date"
                    value={articleDraft.publishedOn}
                    onChange={(e) =>
                      setArticleDraft({ ...articleDraft, publishedOn: e.target.value })
                    }
                  />
                </label>
                <label>
                  분야 <small>그 분야 자료실에도 함께</small>
                  <select
                    value={articleDraft.track}
                    onChange={(e) => setArticleDraft({ ...articleDraft, track: e.target.value })}
                  >
                    <option value="">분류 없음</option>
                    {COURSES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  단계 <small>선택</small>
                  <select
                    value={articleDraft.stage}
                    onChange={(e) => setArticleDraft({ ...articleDraft, stage: e.target.value })}
                  >
                    <option value="">나누지 않음</option>
                    {STAGES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={articleDraft.published}
                  onChange={(e) =>
                    setArticleDraft({ ...articleDraft, published: e.target.checked })
                  }
                />
                발행 — 체크해야 홈페이지 기사·칼럼에 나타납니다
              </label>

              <div className="admin-actions">
                <button className="admin-btn" disabled={busy}>
                  {busy ? "저장 중…" : articleDraft.id ? "수정 저장" : "칼럼 올리기"}
                </button>
                {articleDraft.id && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--quiet"
                    onClick={() => setArticleDraft(EMPTY_ARTICLE)}
                  >
                    새 칼럼 쓰기
                  </button>
                )}
              </div>
            </form>

            <section className="admin-card">
              <h2>칼럼 ({articles.length}편)</h2>
              {articles.length === 0 ? (
                <p className="admin-note">아직 올린 칼럼이 없습니다.</p>
              ) : (
                <ul className="admin-list">
                  {articles.map((a) => (
                    <li key={a.id}>
                      <div className="admin-list-meta">
                        <span className={a.published ? "admin-tag admin-tag--on" : "admin-tag"}>
                          {a.published ? "발행" : "임시"}
                        </span>
                        {a.source && <span>{a.source}</span>}
                        {a.publishedOn && <span>{a.publishedOn.slice(0, 10)}</span>}
                      </div>
                      <p className="admin-list-prompt">{a.title}</p>
                      <div className="admin-actions">
                        {a.published && (
                          <a
                            className="admin-btn admin-btn--quiet"
                            href={`/insights/${encodeURIComponent(a.slug)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            보기
                          </a>
                        )}
                        <button
                          className="admin-btn admin-btn--quiet"
                          onClick={() => editArticle(a)}
                        >
                          수정
                        </button>
                        <button
                          className="admin-btn admin-btn--quiet"
                          onClick={() => toggleArticlePublish(a)}
                        >
                          {a.published ? "발행 취소" : "발행"}
                        </button>
                        <button
                          className="admin-btn admin-btn--danger"
                          onClick={() => removeArticle(a.id)}
                        >
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

        {/* ── 자료실 ── */}
        {tab === "documents" && (
          <>
            <form className="admin-card" onSubmit={saveDocument}>
              <h2>{docId === null ? "자료 올리기" : "자료 수정"}</h2>
              <p className="admin-note">
                {docId === null
                  ? "워드(.doc·.docx) · PDF · 한글(.hwp·.hwpx) 파일을 올릴 수 있습니다. 한 건에 8 MB까지입니다. 내려받을 파일이 아니라 읽을 글을 올리시려면 「칼럼」 탭을 쓰십시오 — 분야를 정하시면 그 분야 자료실에 함께 섭니다."
                  : "제목 · 설명 · 분야 · 단계 · 구분 · 발행 여부를 고칩니다. 파일을 바꾸시려면 새 파일로 다시 올리신 뒤 옛 자료를 지워 주십시오."}
              </p>

              {docId === null && (
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
              )}

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
                  단계 <small>선택</small>
                  <select value={docStage} onChange={(e) => setDocStage(e.target.value)}>
                    <option value="">나누지 않음</option>
                    {STAGES.map((v) => (
                      <option key={v} value={v}>
                        {v}
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
                  {busy ? "저장 중…" : docId === null ? "올리기" : "수정 저장"}
                </button>
                {docId !== null && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--quiet"
                    onClick={resetDocForm}
                    disabled={busy}
                  >
                    취소
                  </button>
                )}
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
                        {d.stage && <span>{d.stage}</span>}
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
                        <button className="admin-btn admin-btn--quiet" onClick={() => editDocument(d)}>
                          수정
                        </button>
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
              <div className="admin-note">
                <p>아직 명단에 오른 회원이 없습니다.</p>
                <p>
                  이 명단에는 <strong>메일로 보낸 인증 링크를 눌러 가입을 마치신 분</strong>만 오릅니다.
                  가입 신청만 하고 인증을 마치지 않으신 분은 여기에 나타나지 않습니다.
                </p>
                <p>
                  누가 신청했는지까지 보시려면 Supabase 대시보드의{" "}
                  <strong>Authentication → Users</strong> 를 보십시오. 그곳의{" "}
                  <code>Last sign in</code> 이 비어 있으면 아직 인증을 마치지 않으신 것입니다.
                </p>
              </div>
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

        {tab === "settings" && (
          <section className="admin-card">
            <h2>비밀번호 변경</h2>
            <p className="admin-note">
              {pwInfo?.usingEnv
                ? "지금은 배포 설정에 넣어 둔 비밀번호로 들어오고 계십니다. 한 번 바꾸시면 그다음부터는 여기서 정하신 값만 통합니다."
                : pwInfo?.changedAt
                  ? `마지막으로 바꾸신 날: ${pwInfo.changedAt.slice(0, 10)}`
                  : "지금 쓰시는 비밀번호를 확인한 뒤 새 값으로 바꿉니다."}
            </p>

            <form className="admin-form" onSubmit={changePassword}>
              <label className="admin-field">
                <span>지금 비밀번호</span>
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              <label className="admin-field">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  value={pwNext}
                  onChange={(e) => setPwNext(e.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
                <i className="admin-hint">10자 이상. 길수록 안전합니다 — 브라우저가 만들어 주는 값을 쓰셔도 됩니다.</i>
              </label>

              <label className="admin-field">
                <span>새 비밀번호 확인</span>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </label>

              <button className="admin-btn" type="submit" disabled={busy || !dbConfigured}>
                {busy ? "바꾸는 중…" : "비밀번호 바꾸기"}
              </button>
            </form>

            <p className="admin-note">
              바꾸시면 다른 기기·브라우저에 남아 있던 로그인이 모두 끊깁니다. 이 화면만 그대로 이어집니다.
              비밀번호를 잊으셨을 때는 TEN AI에 연락 주시면 배포 설정에서 되살려 드립니다.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
