"use client";

import { useCallback, useEffect, useState } from "react";
import { INQUIRY_STATUSES } from "@/lib/inquiry";

/**
 * 「상담 신청」 탭 — 홈페이지에서 들어온 상담 신청을 모아 보고 처리한다.
 *
 * 회장 지시(2026-10-08): 상담 신청을 관리할 수 있는 페이지를 구축할 것.
 *
 * 한 줄에 신청 한 건. 누르면 펼쳐져 문의 내용 전체와 연락처가 보이고, 그
 * 자리에서 처리 상태를 옮기고 메모를 남긴다. 새로 들어온 「접수」 건수는
 * 탭 이름 옆에도 뜬다(onFresh).
 */
type Row = {
  id: number;
  area: string;
  name: string;
  org: string | null;
  phone: string | null;
  email: string;
  message: string;
  source: string | null;
  status: string;
  memo: string | null;
  createdAt: string;
};

type ListResponse = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  byStatus: Record<string, number>;
};

async function readError(res: Response): Promise<string> {
  if (res.status === 401) return "로그인이 풀렸습니다. 화면을 새로고침해 다시 들어와 주십시오.";
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "처리하지 못했습니다.";
}

export default function InquiriesTab({ onFresh }: { onFresh?: (n: number) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ status: string; memo: string }>({ status: "접수", memo: "" });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 타자 한 자마다 서버를 두드리지 않는다 — 손을 멈추신 뒤에 찾는다
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    try {
      const res = await fetch(`/api/admin/inquiries?${params}`, { cache: "no-store" });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      const data = (await res.json()) as ListResponse;
      setRows(data.rows);
      setTotal(data.total);
      setPageSize(data.pageSize || 20);
      setByStatus(data.byStatus ?? {});
      onFresh?.(data.byStatus?.["접수"] ?? 0);
      setError(null);
    } catch {
      setError("서버에 닿지 않았습니다. 잠시 후 다시 불러와 주십시오.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, onFresh]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) void load();
    });
    return () => {
      alive = false;
    };
  }, [load]);

  function toggle(row: Row) {
    if (openId === row.id) {
      setOpenId(null);
      return;
    }
    setOpenId(row.id);
    setEdit({ status: row.status, memo: row.memo ?? "" });
    setNotice(null);
  }

  async function save(id: number, patch: { status: string; memo: string }) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setNotice(`상담 신청 #${id}을(를) 저장했습니다 — 처리 상태: ${patch.status}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("이 상담 신청을 지울까요? 연락처와 문의 내용이 함께 사라지며 되돌릴 수 없습니다.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inquiries?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setNotice(`상담 신청 #${id}을(를) 지웠습니다.`);
      if (openId === id) setOpenId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <section className="admin-card">
        <h2>상담 신청</h2>
        <p className="admin-note">
          홈페이지 첫 화면과 각 주요업무 화면의 상담 신청 양식으로 들어온 신청입니다. 신청자는
          보낸 뒤에도 보던 화면에 그대로 남고, 접수번호와 보낸 내용을 그 자리에서 확인합니다.
          줄을 누르면 문의 내용과 연락처가 펼쳐지고, 처리 상태와 메모를 남기실 수 있습니다.
        </p>

        <div className="admin-counts">
          {INQUIRY_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              data-on={status === st}
              onClick={() => {
                setStatus(status === st ? "" : st);
                setPage(1);
              }}
            >
              {st} <b>{byStatus[st] ?? 0}</b>
            </button>
          ))}
          {status && (
            <button type="button" onClick={() => setStatus("")}>
              전체 보기
            </button>
          )}
        </div>

        <div className="admin-row">
          <label style={{ flex: 1 }}>
            찾기 <small>성함 · 소속 · 이메일 · 연락처 · 문의 내용 · 분야</small>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="일부만 적어도 찾습니다" />
          </label>
          <button type="button" className="admin-btn admin-btn--quiet" onClick={() => load()}>
            다시 불러오기
          </button>
        </div>
        {error && <p className="admin-error">{error}</p>}
        {notice && <p className="admin-notice">{notice}</p>}
      </section>

      <section className="admin-card">
        <h2>
          신청 목록 <small>{total}건</small>
        </h2>
        {loading ? (
          <p className="admin-note">불러오는 중입니다…</p>
        ) : rows.length === 0 ? (
          <p className="admin-note">
            {search || status ? "조건에 맞는 상담 신청이 없습니다." : "아직 들어온 상담 신청이 없습니다."}
          </p>
        ) : (
          <ul className="admin-list admin-list--inquiries">
            {rows.map((r) => (
              <li key={r.id} data-open={openId === r.id}>
                <button type="button" className="admin-inq" onClick={() => toggle(r)} aria-expanded={openId === r.id}>
                  <span className="admin-inq-head">
                    <span className="admin-appli-status" data-status={r.status}>
                      {r.status}
                    </span>
                    <b>{r.name}</b>
                    {r.org && <span className="admin-inq-org">{r.org}</span>}
                    <span className="admin-appli-kind">{r.area}</span>
                    <span className="admin-inq-date">
                      #{r.id} · {r.createdAt}
                    </span>
                  </span>
                  <span className="admin-inq-preview">{r.message}</span>
                </button>

                {openId === r.id && (
                  <div className="admin-inq-detail">
                    <dl className="admin-appli-meta">
                      <div>
                        <dt>이메일</dt>
                        <dd>
                          <a href={`mailto:${r.email}`}>{r.email}</a>
                        </dd>
                      </div>
                      <div>
                        <dt>연락처</dt>
                        <dd>{r.phone ? <a href={`tel:${r.phone.replace(/[^0-9+]/g, "")}`}>{r.phone}</a> : "—"}</dd>
                      </div>
                      <div>
                        <dt>보낸 화면</dt>
                        <dd>
                          {r.source ? (
                            <a href={r.source} target="_blank" rel="noopener noreferrer">
                              {r.source}
                            </a>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>
                    <div className="admin-appli-note">
                      <h3>문의 내용</h3>
                      <p>{r.message}</p>
                    </div>

                    <div className="admin-row">
                      <label>
                        처리 상태
                        <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                          {INQUIRY_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="admin-field">
                      메모 <small>신청자에게는 보이지 않습니다</small>
                      <textarea
                        rows={3}
                        value={edit.memo}
                        onChange={(e) => setEdit({ ...edit, memo: e.target.value })}
                        placeholder="예) 10/9 전화 통화 — 다음 주 화요일 미팅"
                      />
                    </label>
                    <div className="admin-actions">
                      <button type="button" className="admin-btn" disabled={busy} onClick={() => save(r.id, edit)}>
                        저장
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        disabled={busy}
                        onClick={() => remove(r.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {total > pageSize && (
          <div className="admin-pager">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              이전
            </button>
            <span>
              {page} / {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              다음
            </button>
          </div>
        )}
      </section>
    </>
  );
}
