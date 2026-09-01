"use client";

import { useCallback, useEffect, useState } from "react";
import { COURSES, FORMATS, LEVELS, normalizeLevel, normalizeTrack } from "@/lib/questions";
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
  explanation: string | null;
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
  explanation: string;
  published: boolean;
};

/** 분야|레벨 → 그 칸의 문제 수. 출제가 어디에 비어 있는지 보는 지도다. */
type Coverage = Record<string, { total: number; published: number }>;

type QuestionsResponse = { questions: Row[]; total: number; page: number; coverage: Coverage };
type AnswersResponse = { answers: AnswerRow[]; total: number; pendingCount: number; page: number };
type MembersResponse = { members: MemberRow[]; total: number; page: number; freeCount: number; paidCount: number };

type OrderRow = {
  id: number;
  orderId: string;
  planName: string;
  amount: number;
  days: number;
  status: string;
  provider: string;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  memberEmail: string | null;
  memberName: string | null;
};

type OrdersResponse = { orders: OrderRow[]; total: number; pendingCount: number; page: number };

/** 목록 불러오기 실패 — 응답 대신 이 값이 돌아오면 화면에 이유를 띄운다 */
type FetchFailure = { failed: true; expired: boolean; message: string };
function isFailure(d: unknown): d is FetchFailure {
  return typeof d === "object" && d !== null && "failed" in d;
}

type LedgerEntry = {
  id: number;
  kind: string;
  amount: number;
  reason: string;
  createdAt: string;
};

type MemberRow = {
  id: number;
  email: string;
  name: string | null;
  tier: string;
  points: number;
  clearedLevel: number;
  createdAt: string;
};

type AnswerRow = {
  id: number;
  status: string;
  score: number | null;
  gradedBy: string | null;
  feedback: string | null;
  body: string;
  createdAt: string;
  questionId: number;
  prompt: string | null;
  level: string | null;
  track: string | null;
  memberEmail: string | null;
  memberName: string | null;
};

const EMPTY: Draft = {
  track: "",
  // 5레벨 체계의 한가운데. 목록에 없는 값을 기본값으로 두면 저장이 거부된다.
  level: "실무",
  format: "주관식",
  prompt: "",
  choices: ["", ""],
  answer: "",
  intent: "",
  explanation: "",
  published: false,
};

/** 한 페이지 크기 — 서버(route.ts)와 같은 값이어야 페이지 수가 맞는다 */
const PAGE_SIZE = 20;

/**
 * 목록 페이지 이동. 목록이 한 페이지에 다 들어가면 아무것도 그리지 않는다 —
 * 문제가 세 건일 때까지 페이지 조작을 보여 줄 이유가 없다.
 */
function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (last <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="admin-pager">
      <button
        type="button"
        className="admin-btn admin-btn--quiet"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← 이전
      </button>
      <span>
        {from}–{to} / {total}건 · {page}/{last}쪽
      </span>
      <button
        type="button"
        className="admin-btn admin-btn--quiet"
        disabled={page >= last}
        onClick={() => onPage(page + 1)}
      >
        다음 →
      </button>
    </div>
  );
}

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

  // 문제 목록은 서버에서 잘라 온다 — 문제은행이 커져도 화면은 한 페이지다
  const [qTotal, setQTotal] = useState(0);
  const [qPage, setQPage] = useState(1);
  const [qFilter, setQFilter] = useState({ q: "", track: "", level: "", state: "" });
  const [coverage, setCoverage] = useState<Coverage>({});

  // 채점함 — 주관식 답안을 회장이 직접 채점한다 (AI 채점 미설정 시 필수 경로)
  const [inbox, setInbox] = useState<AnswerRow[]>([]);
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({});
  const [inboxStatus, setInboxStatus] = useState("pending");
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // 회원 관리 — 결제 연결 전까지 유료 전환은 여기서 수동으로 한다
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [mTotal, setMTotal] = useState(0);
  const [mPage, setMPage] = useState(1);
  const [mFilter, setMFilter] = useState({ q: "", tier: "" });
  const [tierCounts, setTierCounts] = useState({ free: 0, paid: 0 });
  // 포인트 내역 — 펼친 회원 하나만 들고 있는다
  const [ledgerFor, setLedgerFor] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  // 결제 관리 — 유료 전환 신청 승인 (PG 연결 전에는 유일한 승인 경로)
  const [orderRows, setOrderRows] = useState<OrderRow[]>([]);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPending, setOrderPending] = useState(0);

  // 가져오기와 반영을 나눈다 — 효과 훅에서는 콜백 안에서만 상태를 건드리고,
  // 저장·채점 뒤의 새로고침은 같은 함수를 그대로 다시 쓴다.
  //
  // 실패는 조용히 삼키지 않는다 — 목록이 그냥 비어 보이면 "회원이 없다"와
  // "불러오다 실패했다"를 구분할 수 없어, 세션 만료 하나로 화면 전체가
  // 이유 없이 텅 비어 보이는 사고가 난다. 가져오기 함수는 실패를 값으로
  // 돌려주기만 하고, 상태 반영은 호출한 쪽의 콜백에서 한다.
  const adminGet = useCallback(async <T,>(url: string): Promise<T | FetchFailure> => {
    const res = await fetch(url);
    if (res.status === 401) {
      return { failed: true, expired: true, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        failed: true,
        expired: false,
        message: body.error ?? `목록을 불러오지 못했습니다 (오류 ${res.status}). 잠시 후 다시 시도해 주세요.`,
      };
    }
    return (await res.json()) as T;
  }, []);

  const reportFailure = useCallback((f: FetchFailure) => {
    // 세션이 끝났으면 로그인 화면으로 되돌려 이유를 보여 준다
    if (f.expired) setLoggedIn(false);
    setError(f.message);
  }, []);

  const fetchQuestions = useCallback(async (): Promise<QuestionsResponse | FetchFailure | null> => {
    if (!dbConfigured) return null;
    const p = new URLSearchParams({ page: String(qPage) });
    if (qFilter.q) p.set("q", qFilter.q);
    if (qFilter.track) p.set("track", qFilter.track);
    if (qFilter.level) p.set("level", qFilter.level);
    if (qFilter.state) p.set("state", qFilter.state);
    return adminGet<QuestionsResponse>(`/api/admin/questions?${p}`);
  }, [dbConfigured, qPage, qFilter, adminGet]);

  const fetchInbox = useCallback(async (): Promise<AnswersResponse | FetchFailure | null> => {
    if (!dbConfigured) return null;
    return adminGet<AnswersResponse>(`/api/admin/answers?status=${inboxStatus}&page=${inboxPage}`);
  }, [dbConfigured, inboxStatus, inboxPage, adminGet]);

  const fetchMembers = useCallback(async (): Promise<MembersResponse | FetchFailure | null> => {
    if (!dbConfigured) return null;
    const p = new URLSearchParams({ page: String(mPage) });
    if (mFilter.q) p.set("q", mFilter.q);
    if (mFilter.tier) p.set("tier", mFilter.tier);
    return adminGet<MembersResponse>(`/api/admin/members?${p}`);
  }, [dbConfigured, mPage, mFilter, adminGet]);

  const fetchOrders = useCallback(async (): Promise<OrdersResponse | FetchFailure | null> => {
    if (!dbConfigured) return null;
    return adminGet<OrdersResponse>(`/api/admin/orders?status=${orderStatus}&page=${orderPage}`);
  }, [dbConfigured, orderStatus, orderPage, adminGet]);

  const applyOrders = useCallback((d: OrdersResponse) => {
    setOrderRows(d.orders);
    setOrderTotal(d.total);
    setOrderPending(d.pendingCount);
  }, []);

  const loadOrders = useCallback(async () => {
    const d = await fetchOrders();
    if (!d) return;
    if (isFailure(d)) reportFailure(d);
    else applyOrders(d);
  }, [fetchOrders, applyOrders, reportFailure]);

  const applyQuestions = useCallback((d: QuestionsResponse) => {
    setRows(d.questions);
    setQTotal(d.total);
    setCoverage(d.coverage ?? {});
  }, []);

  const applyInbox = useCallback((d: AnswersResponse) => {
    setInbox(d.answers);
    setInboxTotal(d.total);
    setPendingCount(d.pendingCount);
  }, []);

  const applyMembers = useCallback((d: MembersResponse) => {
    setMemberRows(d.members);
    setMTotal(d.total);
    setTierCounts({ free: d.freeCount, paid: d.paidCount });
  }, []);

  const loadQuestions = useCallback(async () => {
    const d = await fetchQuestions();
    if (!d) return;
    if (isFailure(d)) reportFailure(d);
    else applyQuestions(d);
  }, [fetchQuestions, applyQuestions, reportFailure]);

  const loadInbox = useCallback(async () => {
    const d = await fetchInbox();
    if (!d) return;
    if (isFailure(d)) reportFailure(d);
    else applyInbox(d);
  }, [fetchInbox, applyInbox, reportFailure]);

  const loadMembers = useCallback(async () => {
    const d = await fetchMembers();
    if (!d) return;
    if (isFailure(d)) reportFailure(d);
    else applyMembers(d);
  }, [fetchMembers, applyMembers, reportFailure]);

  // 각 목록은 자기 필터·페이지가 바뀔 때만 다시 불러온다. 하나를 넘겼다고
  // 나머지 둘까지 새로 받으면 화면이 커질수록 낭비가 커진다. alive 가드는
  // 늦게 도착한 응답이 이미 사라진 화면에 쓰이는 것을 막는다.
  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    fetchQuestions()
      .then((d) => {
        if (!alive || !d) return;
        if (isFailure(d)) reportFailure(d);
        else applyQuestions(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn, fetchQuestions, applyQuestions, reportFailure]);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    fetchInbox()
      .then((d) => {
        if (!alive || !d) return;
        if (isFailure(d)) reportFailure(d);
        else applyInbox(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn, fetchInbox, applyInbox, reportFailure]);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    fetchOrders()
      .then((d) => {
        if (!alive || !d) return;
        if (isFailure(d)) reportFailure(d);
        else applyOrders(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn, fetchOrders, applyOrders, reportFailure]);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    fetchMembers()
      .then((d) => {
        if (!alive || !d) return;
        if (isFailure(d)) reportFailure(d);
        else applyMembers(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loggedIn, fetchMembers, applyMembers, reportFailure]);

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
    setInbox([]);
    setMemberRows([]);
    setCoverage({});
    setLedgerFor(null);
    setLedger([]);
    setOrderRows([]);
  }

  async function decideOrder(id: number, action: "approve" | "cancel") {
    if (action === "cancel" && !confirm("이 신청을 취소할까요?")) return;
    const note =
      action === "approve"
        ? (prompt("승인 메모 (결제 수단·입금 확인 등)", "입금 확인") ?? "")
        : (prompt("취소 사유", "회원 요청") ?? "");
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, note }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? "처리하지 못했습니다.");
      return;
    }
    setNotice(action === "approve" ? "승인했습니다. 이용 기간이 열렸습니다." : "취소했습니다.");
    void loadOrders();
    void loadMembers();
  }

  /** 원장에 남는 사유는 'admin:…' 접두사로 저장된다 — 화면에서는 읽기 좋게 푼다 */
  function ledgerReason(raw: string): string {
    if (raw === "join") return "가입 축하";
    if (raw.startsWith("quiz:")) return `퀴즈 통과 (문제 #${raw.slice(5)})`;
    if (raw.startsWith("explanation:")) return `해설 열람 (문제 #${raw.slice(12)})`;
    if (raw.startsWith("admin:")) return `관리자 조정 — ${raw.slice(6)}`;
    return raw;
  }

  async function toggleLedger(memberId: number) {
    if (ledgerFor === memberId) {
      setLedgerFor(null);
      return;
    }
    setLedgerFor(memberId);
    setLedger([]);
    const d = await adminGet<{ entries: LedgerEntry[] }>(`/api/admin/ledger?memberId=${memberId}`);
    if (isFailure(d)) reportFailure(d);
    else setLedger(d.entries);
  }

  /** 증감으로 조정 — 0 아래로는 내려가지 않는다 */
  function adjustPoints(m: MemberRow, delta: number) {
    const next = Math.max(0, m.points + delta);
    if (next === m.points) return;
    void updateMember(m.id, { points: next, reason: delta > 0 ? "지급" : "차감" });
  }

  /** 정확한 잔액으로 맞춘다 — 이월·정정처럼 목표값이 정해진 경우 */
  function setPointsExact(m: MemberRow) {
    const input = prompt(`${m.name ?? m.email}의 포인트를 얼마로 맞출까요?`, String(m.points));
    if (input === null) return;
    const value = Math.round(Number(input));
    if (!Number.isFinite(value) || value < 0) {
      setError("포인트는 0 이상의 숫자여야 합니다.");
      return;
    }
    if (value === m.points) return;
    const why = prompt("사유를 적어 주십시오 (포인트 내역에 남습니다)", "수동 정정") ?? "수동 정정";
    void updateMember(m.id, { points: value, reason: why });
  }

  async function updateMember(id: number, patch: { tier?: string; points?: number; reason?: string }) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? "회원 정보를 바꾸지 못했습니다.");
      return;
    }
    setNotice("회원 정보를 수정했습니다.");
    void loadMembers();
    // 내역을 펼쳐 둔 상태라면 방금 남은 기록까지 바로 보이게 한다
    if (ledgerFor === id) {
      void fetch(`/api/admin/ledger?memberId=${id}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ entries: LedgerEntry[] }>) : null))
        .then((d) => d && setLedger(d.entries))
        .catch(() => {});
    }
  }

  async function saveGrade(id: number) {
    const g = grades[id];
    const score = Number(g?.score);
    if (!g || !Number.isFinite(score) || score < 0 || score > 100) {
      setError("점수는 0~100 사이 숫자여야 합니다.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/answers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, score, feedback: g.feedback }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? "채점을 저장하지 못했습니다.");
      return;
    }
    setNotice("채점을 저장했습니다. 통과한 답안에는 퀴즈 포인트가 적립됩니다.");
    void loadInbox();
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
    void loadQuestions();
  }

  /**
   * 발행 토글 — 목록에서 바로 켜고 끈다. 문제가 수백 건이 되면 발행 하나
   * 바꾸자고 편집 화면을 오갈 수 없다. 저장 API는 전체 값을 검증하므로
   * 옛 슬러그·난이도로 저장된 행은 현행 분류로 옮겨서 보낸다.
   */
  async function togglePublish(r: Row) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/questions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r.id,
        track: normalizeTrack(r.track),
        level: normalizeLevel(r.level),
        format: r.format,
        prompt: r.prompt,
        choices: r.choices ?? [],
        answer: r.answer ?? "",
        intent: r.intent ?? "",
        explanation: r.explanation ?? "",
        published: !r.published,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(((await res.json()) as { error?: string }).error ?? "발행 상태를 바꾸지 못했습니다.");
      return;
    }
    setNotice(r.published ? "발행을 취소했습니다." : "발행했습니다.");
    void loadQuestions();
  }

  async function remove(id: number) {
    if (!confirm("이 문제를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/questions?id=${id}`, { method: "DELETE" });
    if (draft.id === id) setDraft(EMPTY);
    void loadQuestions();
  }

  function edit(r: Row) {
    setDraft({
      id: r.id,
      // 개편 전에 저장된 행은 옛 슬러그·난이도를 갖고 있어, 그대로 세우면
      // 선택지에 일치 항목이 없어 빈칸이 되고 저장이 거부된다.
      track: normalizeTrack(r.track),
      level: normalizeLevel(r.level),
      format: r.format,
      prompt: r.prompt,
      choices: r.choices?.length ? r.choices : ["", ""],
      answer: r.answer ?? "",
      intent: r.intent ?? "",
      explanation: r.explanation ?? "",
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
              분야
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

          <label className="admin-field">
            해설 <small>유료회원이 포인트로 열람 — 풀이 화면의 정답 아래에 표시됩니다</small>
            <textarea
              rows={5}
              value={draft.explanation}
              onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
              placeholder="교과서 논지가 실전에서 무너지는 조건까지 짚는 회장 해설을 적으십시오."
            />
          </label>

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
          <h2>결제 관리 ({orderPending}건 확인 대기)</h2>
          <p className="admin-note">
            유료 전환 신청입니다. 승인하면 그 자리에서 이용 기간이 열립니다 — 남은 기간이
            있으면 그 끝에 이어 붙으므로 미리 연장해도 기간을 잃지 않습니다. 결제 대행(PG)
            연결 전까지는 입금 확인 후 여기서 승인하십시오.
          </p>

          <div className="admin-filters">
            {[
              { key: "pending", label: `확인 대기 (${orderPending})` },
              { key: "paid", label: "결제 완료" },
              { key: "canceled", label: "취소" },
              { key: "all", label: "전체" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={orderStatus === t.key ? "admin-btn" : "admin-btn admin-btn--quiet"}
                onClick={() => {
                  setOrderPage(1);
                  setOrderStatus(t.key);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {orderRows.length === 0 ? (
            <p className="admin-note">
              {orderStatus === "pending" ? "확인할 신청이 없습니다." : "해당하는 신청이 없습니다."}
            </p>
          ) : (
            <ul className="admin-list">
              {orderRows.map((o) => (
                <li key={o.id}>
                  <div className="admin-list-meta">
                    <span className={o.status === "paid" ? "admin-tag admin-tag--on" : "admin-tag"}>
                      {o.status === "pending"
                        ? "확인 대기"
                        : o.status === "paid"
                          ? "결제 완료"
                          : o.status === "canceled"
                            ? "취소"
                            : "실패"}
                    </span>
                    <span>{o.memberName ?? o.memberEmail ?? "회원"}</span>
                    <span>{o.planName}</span>
                    <span>{o.amount.toLocaleString("ko-KR")}원 · {o.days}일</span>
                  </div>
                  <p className="admin-list-prompt">
                    {o.orderId} · 신청 {new Date(o.createdAt).toLocaleString("ko-KR")}
                    {o.note && ` · ${o.note}`}
                  </p>
                  {o.status === "pending" && (
                    <div className="admin-actions">
                      <button
                        className="admin-btn"
                        disabled={busy}
                        onClick={() => decideOrder(o.id, "approve")}
                      >
                        승인 (이용 기간 열기)
                      </button>
                      <button
                        className="admin-btn admin-btn--danger"
                        disabled={busy}
                        onClick={() => decideOrder(o.id, "cancel")}
                      >
                        취소
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Pager page={orderPage} total={orderTotal} onPage={setOrderPage} />
        </section>

        <section className="admin-card">
          <h2>
            회원 관리 (무료 {tierCounts.free} · 유료 {tierCounts.paid})
          </h2>
          {/* 화면 위쪽 배너는 여기까지 스크롤하면 안 보인다 — 실패는 이 자리에서도 알린다 */}
          {error && <p className="admin-error">{error}</p>}
          <p className="admin-note">
            등급과 포인트를 여기서 관리합니다. 등급을 바꾸면 다음 화면 이동부터 바로 적용됩니다 —
            무료회원은 L1 입문 퀴즈까지, 유료회원은 L2~L5와 회장 해설 열람이 열립니다.
            포인트 조정은 사유와 함께 내역에 남으므로, 회원이 문의하면 「포인트 내역」으로
            언제 얼마가 오갔는지 그대로 보여 줄 수 있습니다.
          </p>

          <div className="admin-filters">
            <input
              type="search"
              placeholder="이름 · 이메일 검색"
              value={mFilter.q}
              onChange={(e) => {
                setMPage(1);
                setMFilter({ ...mFilter, q: e.target.value });
              }}
            />
            <select
              value={mFilter.tier}
              onChange={(e) => {
                setMPage(1);
                setMFilter({ ...mFilter, tier: e.target.value });
              }}
            >
              <option value="">등급 전체</option>
              <option value="free">무료회원</option>
              <option value="paid">유료회원</option>
            </select>
            {(mFilter.q || mFilter.tier) && (
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                onClick={() => {
                  setMPage(1);
                  setMFilter({ q: "", tier: "" });
                }}
              >
                필터 해제
              </button>
            )}
          </div>

          {memberRows.length === 0 ? (
            <p className="admin-note">
              {mTotal === 0 && !mFilter.q && !mFilter.tier
                ? "아직 가입한 회원이 없습니다."
                : "조건에 맞는 회원이 없습니다."}
            </p>
          ) : (
            <ul className="admin-list">
              {memberRows.map((m) => (
                <li key={m.id}>
                  <div className="admin-list-meta">
                    <span className={m.tier === "paid" ? "admin-tag admin-tag--on" : "admin-tag"}>
                      {m.tier === "paid" ? "유료회원" : "무료회원"}
                    </span>
                    <span>{m.name ?? m.email}</span>
                    <span>{m.points.toLocaleString()}P</span>
                    <span>{m.clearedLevel > 0 ? `L${m.clearedLevel} 통과` : "통과 없음"}</span>
                  </div>
                  <p className="admin-list-prompt">{m.email}</p>
                  <div className="admin-actions">
                    <button
                      className="admin-btn admin-btn--quiet"
                      disabled={busy}
                      onClick={() => updateMember(m.id, { tier: m.tier === "paid" ? "free" : "paid" })}
                    >
                      {m.tier === "paid" ? "무료로 내리기" : "유료로 올리기"}
                    </button>
                    <button
                      className="admin-btn admin-btn--quiet"
                      disabled={busy}
                      onClick={() => adjustPoints(m, 100)}
                    >
                      +100P
                    </button>
                    <button
                      className="admin-btn admin-btn--quiet"
                      disabled={busy || m.points < 100}
                      onClick={() => adjustPoints(m, -100)}
                    >
                      −100P
                    </button>
                    <button
                      className="admin-btn admin-btn--quiet"
                      disabled={busy}
                      onClick={() => setPointsExact(m)}
                    >
                      정확히 지정
                    </button>
                    <button className="admin-btn admin-btn--quiet" onClick={() => toggleLedger(m.id)}>
                      {ledgerFor === m.id ? "내역 닫기" : "포인트 내역"}
                    </button>
                  </div>

                  {/* 잔액이 왜 이 숫자인지 — 회원 문의에 답하는 근거 */}
                  {ledgerFor === m.id && (
                    <div className="admin-ledger">
                      {ledger.length === 0 ? (
                        <p className="admin-note">기록이 없습니다.</p>
                      ) : (
                        <ul>
                          {ledger.map((e) => (
                            <li key={e.id}>
                              <span data-kind={e.kind}>
                                {e.kind === "earn" ? "+" : "−"}
                                {e.amount}P
                              </span>
                              <span>{ledgerReason(e.reason)}</span>
                              <time>{new Date(e.createdAt).toLocaleString("ko-KR")}</time>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Pager page={mPage} total={mTotal} onPage={setMPage} />
        </section>

        <section className="admin-card">
          <h2>채점함 ({pendingCount}건 대기)</h2>
          <p className="admin-note">
            주관식 답안입니다. 60점 이상이면 통과로 처리되어 회원에게 퀴즈 포인트가 적립되고,
            강평은 본인에게만 보입니다. 기본은 채점 대기만 보여 줍니다 — 회원이 늘어도
            할 일 목록이 지난 채점에 묻히지 않도록.
          </p>

          <div className="admin-filters">
            {[
              { key: "pending", label: `채점 대기 (${pendingCount})` },
              { key: "graded", label: "채점 완료" },
              { key: "all", label: "전체" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={inboxStatus === t.key ? "admin-btn" : "admin-btn admin-btn--quiet"}
                onClick={() => {
                  setInboxPage(1);
                  setInboxStatus(t.key);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {inbox.length === 0 ? (
            <p className="admin-note">
              {inboxStatus === "pending" ? "채점할 답안이 없습니다." : "해당하는 답안이 없습니다."}
            </p>
          ) : (
            <ul className="admin-list">
              {inbox.map((a) => (
                <li key={a.id}>
                  <div className="admin-list-meta">
                    <span className={a.status === "pending" ? "admin-tag" : "admin-tag admin-tag--on"}>
                      {a.status === "pending" ? "채점 대기" : `${a.score}점 · ${a.gradedBy === "ai" ? "AI" : a.gradedBy === "auto" ? "자동" : "회장"}`}
                    </span>
                    <span>{a.memberName ?? a.memberEmail ?? "회원"}</span>
                    <span>{a.level ?? ""}</span>
                  </div>
                  <p className="admin-list-prompt">[문제] {a.prompt ?? `#${a.questionId}`}</p>
                  <p className="admin-answer-body">[답안] {a.body}</p>
                  {a.status === "pending" && (
                    <div className="admin-grade-row">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="점수"
                        value={grades[a.id]?.score ?? ""}
                        onChange={(e) =>
                          setGrades({ ...grades, [a.id]: { score: e.target.value, feedback: grades[a.id]?.feedback ?? "" } })
                        }
                      />
                      <input
                        placeholder="강평 (본인에게만 보임)"
                        value={grades[a.id]?.feedback ?? ""}
                        onChange={(e) =>
                          setGrades({ ...grades, [a.id]: { score: grades[a.id]?.score ?? "", feedback: e.target.value } })
                        }
                      />
                      <button className="admin-btn" onClick={() => saveGrade(a.id)} disabled={busy}>
                        채점 저장
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Pager page={inboxPage} total={inboxTotal} onPage={setInboxPage} />
        </section>

        <section className="admin-card">
          <h2>출제 현황 (분야 × 레벨)</h2>
          <p className="admin-note">
            칸의 숫자는 그 분야·레벨에 등록된 문제 수이고, 괄호 안은 발행된 수입니다. 빈 칸이
            아직 출제되지 않은 자리입니다 — 목록을 훑지 않고 여기서 다음 출제를 정하십시오.
            칸을 누르면 그 칸의 문제만 아래 목록에 걸립니다.
          </p>
          <div className="admin-coverage-scroll">
            <table className="admin-coverage">
              <thead>
                <tr>
                  <th scope="col">분야</th>
                  {LEVELS.map((l) => (
                    <th key={l} scope="col">{l}</th>
                  ))}
                  <th scope="col">계</th>
                </tr>
              </thead>
              <tbody>
                {COURSES.map((c) => {
                  const rowTotal = LEVELS.reduce(
                    (sum, l) => sum + (coverage[`${c.slug}|${l}`]?.total ?? 0),
                    0
                  );
                  return (
                    <tr key={c.slug}>
                      <th scope="row">{c.label}</th>
                      {LEVELS.map((l) => {
                        const cell = coverage[`${c.slug}|${l}`];
                        const picked = qFilter.track === c.slug && qFilter.level === l;
                        return (
                          <td key={l} data-empty={!cell} data-picked={picked}>
                            <button
                              type="button"
                              onClick={() => {
                                setQPage(1);
                                setQFilter(
                                  picked
                                    ? { ...qFilter, track: "", level: "" }
                                    : { ...qFilter, track: c.slug, level: l }
                                );
                              }}
                              title={`${c.label} · ${l} 문제만 보기`}
                            >
                              {cell ? (
                                <>
                                  {cell.total}
                                  <small>({cell.published})</small>
                                </>
                              ) : (
                                "—"
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="admin-coverage-sum">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card">
          <h2>등록된 문제 ({qTotal})</h2>

          <div className="admin-filters">
            <input
              type="search"
              placeholder="문제 본문 검색"
              value={qFilter.q}
              onChange={(e) => {
                setQPage(1);
                setQFilter({ ...qFilter, q: e.target.value });
              }}
            />
            <select
              value={qFilter.track}
              onChange={(e) => {
                setQPage(1);
                setQFilter({ ...qFilter, track: e.target.value });
              }}
            >
              <option value="">분야 전체</option>
              {COURSES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
            <select
              value={qFilter.level}
              onChange={(e) => {
                setQPage(1);
                setQFilter({ ...qFilter, level: e.target.value });
              }}
            >
              <option value="">레벨 전체</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              value={qFilter.state}
              onChange={(e) => {
                setQPage(1);
                setQFilter({ ...qFilter, state: e.target.value });
              }}
            >
              <option value="">상태 전체</option>
              <option value="published">발행</option>
              <option value="draft">임시</option>
              <option value="incomplete">미완성 (정답·해설 없음)</option>
            </select>
            {(qFilter.q || qFilter.track || qFilter.level || qFilter.state) && (
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                onClick={() => {
                  setQPage(1);
                  setQFilter({ q: "", track: "", level: "", state: "" });
                }}
              >
                필터 해제
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="admin-note">
              {qTotal === 0 && !qFilter.q && !qFilter.track && !qFilter.level && !qFilter.state
                ? "아직 등록된 문제가 없습니다."
                : "조건에 맞는 문제가 없습니다."}
            </p>
          ) : (
            <ul className="admin-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <div className="admin-list-meta">
                    <span className={r.published ? "admin-tag admin-tag--on" : "admin-tag"}>
                      {r.published ? "발행" : "임시"}
                    </span>
                    <span>{COURSES.find((c) => c.slug === normalizeTrack(r.track))?.label ?? r.track}</span>
                    <span>{normalizeLevel(r.level)}</span>
                    <span>{r.format}</span>
                    {/* 발행 전에 무엇이 남았는지 목록에서 바로 보이게 한다 */}
                    {!r.answer && <span className="admin-tag admin-tag--warn">정답 없음</span>}
                    {!r.explanation && <span className="admin-tag admin-tag--warn">해설 없음</span>}
                  </div>
                  <p className="admin-list-prompt">{r.prompt}</p>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--quiet" onClick={() => edit(r)}>수정</button>
                    <button
                      className="admin-btn admin-btn--quiet"
                      disabled={busy}
                      onClick={() => togglePublish(r)}
                    >
                      {r.published ? "발행 취소" : "발행"}
                    </button>
                    <button className="admin-btn admin-btn--danger" onClick={() => remove(r.id)}>삭제</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Pager page={qPage} total={qTotal} onPage={setQPage} />
        </section>
      </div>
    </main>
  );
}
