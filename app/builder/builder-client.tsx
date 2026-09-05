"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SECTION_CATALOG,
  THEME_PRESETS,
  newId,
  newSection,
  type Background,
  type Section,
  type SectionKind,
  type SiteDoc,
  type Theme,
} from "@/lib/builder/types";
import { renderSite, themeVars, BUILDER_CSS } from "@/lib/builder/render";
import { exportHtml, parseDoc, serializeDoc } from "@/lib/builder/export";
import { starterDoc, blankDoc } from "@/lib/builder/template";
import "./builder.css";

const STORAGE_KEY = "fma-builder-doc";
const HISTORY_LIMIT = 60;

/* ── 경로로 값 넣기 ─────────────────────────────────────────
   캔버스에서 고친 글자는 "sections.2.cards.1.title" 같은 경로로 돌아온다.
   문서를 통째로 새로 만들어 돌려주므로, 되돌리기 기록이 서로 섞이지 않는다. */
function getByPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], root);
}

function setByPath<T>(root: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = Array.isArray(root) ? [...(root as unknown[])] : { ...(root as object) };
  let cursor: Record<string, unknown> = clone as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const next = cursor[key];
    cursor[key] = Array.isArray(next) ? [...next] : { ...(next as object) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}

/** 올린 사진은 줄여서 담는다 — 원본 그대로면 저장 공간이 금세 찬다 */
async function fileToDataUrl(file: File, maxWidth = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── 속성판 부품 ───────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="bx-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  area,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  placeholder?: string;
}) {
  return area ? (
    <textarea rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="bx-color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input className="bx-hex" value={value} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <span className="bx-choice">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={value === o.value ? "is-on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

/** 사진 한 장 — 주소를 붙여 넣거나 파일을 올린다 */
function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <span className="bx-image">
      <input
        value={value.startsWith("data:") ? "(올린 사진)" : value}
        placeholder="https://... 또는 파일 올리기"
        readOnly={value.startsWith("data:")}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="bx-image-row">
        <label className="bx-mini">
          {busy ? "올리는 중…" : "파일 올리기"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              fileToDataUrl(file)
                .then((url) => onChange(url))
                .catch(() => alert("사진을 읽지 못했습니다."))
                .finally(() => setBusy(false));
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button type="button" className="bx-mini" onClick={() => onChange("")}>
            지우기
          </button>
        )}
      </span>
    </span>
  );
}

/** 목록형 속성(카드·단계·글 등) 공통 틀 */
function ListEditor<T>({
  items,
  onChange,
  make,
  render,
  addLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  make: () => T;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel: string;
}) {
  return (
    <div className="bx-list">
      {items.map((item, i) => (
        <div className="bx-list-item" key={i}>
          <div className="bx-list-bar">
            <strong>{i + 1}</strong>
            <button
              type="button"
              disabled={i === 0}
              onClick={() => {
                const next = [...items];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === items.length - 1}
              onClick={() => {
                const next = [...items];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                onChange(next);
              }}
            >
              ↓
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              삭제
            </button>
          </div>
          {render(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))))}
        </div>
      ))}
      <button type="button" className="bx-add-item" onClick={() => onChange([...items, make()])}>
        + {addLabel}
      </button>
    </div>
  );
}

/* ── 본체 ─────────────────────────────────────────────── */

export default function BuilderClient() {
  const [doc, setDocState] = useState<SiteDoc>(() => starterDoc());
  const [past, setPast] = useState<SiteDoc[]>([]);
  const [future, setFuture] = useState<SiteDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [tab, setTab] = useState<"sections" | "add" | "theme">("sections");
  const [saved, setSaved] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  /** 캔버스 이벤트는 한 번만 붙으므로, 최신 문서를 이 그릇을 통해 본다 */
  const docRef = useRef(doc);

  /** 문서를 바꾼다 — 되돌리기 기록을 함께 남긴다 */
  const commit = useCallback((next: SiteDoc) => {
    setPast((p) => [...p, next].slice(-HISTORY_LIMIT));
    setFuture([]);
    setDocState(next);
  }, []);

  // 앞선 작업을 이어서 연다. 효과 본문에서 바로 상태를 건드리지 않도록
  // 콜백 안에서만 반영한다(리렌더가 꼬리를 무는 것을 막는 규칙).
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => {
        try {
          return localStorage.getItem(STORAGE_KEY);
        } catch {
          return null;
        }
      })
      .then((raw) => {
        if (!alive || !raw) return;
        const loaded = parseDoc(raw);
        if (loaded) setDocState(loaded);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // 바뀔 때마다 조용히 담아 둔다 — 브라우저를 닫아도 남는다
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeDoc(doc));
        setSaved(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      } catch {
        setSaved("저장 공간이 가득 찼습니다");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [doc]);

  const selectedIndex = doc.sections.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? doc.sections[selectedIndex] : null;

  const html = useMemo(() => renderSite(doc, mode === "edit"), [doc, mode]);

  /* 캔버스 글자를 그 자리에서 고친다.
     고칠 수 있다는 표시(contenteditable)는 마크업에 실려 온다. 그려진 뒤에
     자바스크립트로 붙이면 화면을 다시 그릴 때마다 지워지기 때문이다 — 그린 결과의
     주인은 리액트다. 같은 이유로 글자마다 귀를 달지 않고 캔버스 한 곳에서 받는다.
     안쪽 내용은 다시 그릴 때 통째로 갈리지만 캔버스 자체는 그대로 남는다.
     값 반영은 포커스를 뗄 때만 한다 — 입력 중에 다시 그리면 커서가 튄다. */
  useEffect(() => {
    const root = canvasRef.current;
    if (!root || mode !== "edit") return;

    const editableOf = (target: EventTarget | null): HTMLElement | null => {
      const el = target instanceof HTMLElement ? target.closest<HTMLElement>("[data-edit]") : null;
      return el && root.contains(el) ? el : null;
    };

    const onFocusOut = (e: FocusEvent) => {
      const el = editableOf(e.target);
      const path = el?.dataset.edit;
      if (!el || !path) return;
      // 한 줄 글자로 되돌린다 — 붙여넣기로 들어온 줄바꿈·서식을 흘리지 않는다
      const text = el.innerText.replace(/ /g, " ").replace(/\s*\n\s*/g, " ").trim();
      const current = docRef.current;
      if (getByPath(current, path) === text) return;
      commit(setByPath(current, path, text));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const el = editableOf(e.target);
      const path = el?.dataset.edit;
      if (!el || !path) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        el.blur();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        el.innerText = String(getByPath(docRef.current, path) ?? "");
        el.blur();
      }
    };

    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [mode, commit]);

  /* ── 구역 조작 ── */
  const patchSection = (index: number, patch: Partial<Section>) => {
    const next = {
      ...doc,
      sections: doc.sections.map((s, i) => (i === index ? ({ ...s, ...patch } as Section) : s)),
    };
    commit(next);
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= doc.sections.length) return;
    const sections = [...doc.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    commit({ ...doc, sections });
  };

  const addSection = (kind: SectionKind) => {
    const section = newSection(kind);
    const at = selectedIndex >= 0 ? selectedIndex + 1 : doc.sections.length;
    const sections = [...doc.sections];
    sections.splice(at, 0, section);
    commit({ ...doc, sections });
    setSelectedId(section.id);
    setTab("sections");
  };

  const duplicateSection = (index: number) => {
    const copy = { ...doc.sections[index], id: newId(), name: `${doc.sections[index].name} 복사` } as Section;
    const sections = [...doc.sections];
    sections.splice(index + 1, 0, copy);
    commit({ ...doc, sections });
    setSelectedId(copy.id);
  };

  const removeSection = (index: number) => {
    if (!confirm(`「${doc.sections[index].name}」 구역을 지울까요?`)) return;
    commit({ ...doc, sections: doc.sections.filter((_, i) => i !== index) });
    setSelectedId(null);
  };

  const undo = () => {
    if (past.length < 1) return;
    const previous = past[past.length - 2] ?? starterDoc();
    setFuture((f) => [doc, ...f]);
    setPast((p) => p.slice(0, -1));
    setDocState(past.length === 1 ? previous : past[past.length - 2]);
  };

  const redo = () => {
    if (!future.length) return;
    const [next, ...rest] = future;
    setPast((p) => [...p, next]);
    setFuture(rest);
    setDocState(next);
  };

  const canvasWidth = device === "desktop" ? "100%" : device === "tablet" ? "834px" : "390px";

  return (
    <div className="bx">
      {/* ── 상단 막대 ── */}
      <header className="bx-top">
        <span className="bx-logo">
          홈페이지 빌더<small>FRONTIER SITE BUILDER</small>
        </span>
        <input
          className="bx-title"
          value={doc.title}
          onChange={(e) => commit({ ...doc, title: e.target.value })}
          aria-label="사이트 이름"
        />
        <div className="bx-top-group">
          <button type="button" onClick={undo} disabled={past.length === 0} title="되돌리기">
            ↶
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0} title="다시 실행">
            ↷
          </button>
        </div>
        <div className="bx-top-group">
          {(
            [
              ["desktop", "🖥 PC"],
              ["tablet", "📱 태블릿"],
              ["mobile", "📱 모바일"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" className={device === key ? "is-on" : ""} onClick={() => setDevice(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="bx-top-group">
          <button
            type="button"
            className={mode === "preview" ? "is-on" : ""}
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          >
            {mode === "edit" ? "▶ 미리보기" : "✎ 편집으로"}
          </button>
        </div>
        <span className="bx-saved">{saved ? `${saved} 저장됨` : ""}</span>
        <div className="bx-top-group">
          <button type="button" onClick={() => download(`${doc.title || "site"}.html`, exportHtml(doc), "text/html")}>
            HTML 내보내기
          </button>
          <button
            type="button"
            onClick={() => download(`${doc.title || "site"}.json`, serializeDoc(doc), "application/json")}
          >
            저장(JSON)
          </button>
          <label className="bx-topfile">
            불러오기
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                file
                  .text()
                  .then((raw) => {
                    const loaded = parseDoc(raw);
                    if (!loaded) {
                      alert("빌더에서 저장한 JSON 파일이 아닙니다.");
                      return;
                    }
                    commit(loaded);
                    setSelectedId(null);
                  })
                  .catch(() => alert("파일을 읽지 못했습니다."));
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!confirm("지금 작업을 버리고 처음 템플릿으로 되돌릴까요?")) return;
              commit(starterDoc());
              setSelectedId(null);
            }}
          >
            처음부터
          </button>
        </div>
      </header>

      <div className="bx-body">
        {/* ── 왼쪽: 구역 목록 · 추가 · 테마 ── */}
        <aside className="bx-left">
          <div className="bx-tabs">
            {(
              [
                ["sections", "구역"],
                ["add", "추가"],
                ["theme", "테마"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" className={tab === key ? "is-on" : ""} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "sections" && (
            <div className="bx-panel">
              <p className="bx-hint">구역을 눌러 고르고, 순서를 바꾸거나 숨길 수 있습니다.</p>
              {doc.sections.length === 0 && <p className="bx-empty">구역이 없습니다. 「추가」에서 골라 넣으세요.</p>}
              <ul className="bx-secs">
                {doc.sections.map((s, i) => (
                  <li key={s.id} className={s.id === selectedId ? "is-on" : ""} data-hidden={s.hidden ? "1" : undefined}>
                    <button type="button" className="bx-sec-name" onClick={() => setSelectedId(s.id)}>
                      <span className="bx-sec-kind">{SECTION_CATALOG.find((c) => c.kind === s.kind)?.name}</span>
                      <strong>{s.name}</strong>
                    </button>
                    <span className="bx-sec-acts">
                      <button type="button" title="위로" disabled={i === 0} onClick={() => moveSection(i, -1)}>
                        ↑
                      </button>
                      <button
                        type="button"
                        title="아래로"
                        disabled={i === doc.sections.length - 1}
                        onClick={() => moveSection(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        title={s.hidden ? "보이기" : "숨기기"}
                        onClick={() => patchSection(i, { hidden: !s.hidden })}
                      >
                        {s.hidden ? "◌" : "●"}
                      </button>
                      <button type="button" title="복제" onClick={() => duplicateSection(i)}>
                        ⧉
                      </button>
                      <button type="button" title="삭제" onClick={() => removeSection(i)}>
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "add" && (
            <div className="bx-panel">
              <p className="bx-hint">고른 구역 바로 아래에 들어갑니다.</p>
              <div className="bx-catalog">
                {SECTION_CATALOG.map((c) => (
                  <button key={c.kind} type="button" onClick={() => addSection(c.kind)}>
                    <strong>{c.name}</strong>
                    <span>{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "theme" && (
            <div className="bx-panel">
              <p className="bx-hint">색과 글꼴은 사이트 전체에 한 번에 적용됩니다.</p>
              <div className="bx-presets">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => commit({ ...doc, theme: { ...p.theme } })}
                    style={{ borderColor: p.theme.accent }}
                  >
                    <span style={{ background: p.theme.accent }} />
                    {p.name}
                  </button>
                ))}
              </div>
              {(
                [
                  ["accent", "강조색"],
                  ["accentInk", "강조 글자색"],
                  ["paper", "바탕색"],
                  ["paperDeep", "바탕 진한색"],
                  ["ink", "본문 글자"],
                  ["inkStrong", "제목 글자"],
                  ["line", "선 색"],
                  ["muted", "설명 글자"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <ColorInput
                    value={doc.theme[key]}
                    onChange={(v) => commit({ ...doc, theme: { ...doc.theme, [key]: v } as Theme })}
                  />
                </Field>
              ))}
              <Field label="제목 글꼴">
                <Choice
                  value={doc.theme.heading}
                  options={[
                    { value: "serif" as const, label: "명조" },
                    { value: "sans" as const, label: "고딕" },
                  ]}
                  onChange={(v) => commit({ ...doc, theme: { ...doc.theme, heading: v } })}
                />
              </Field>
              <Field label={`모서리 둥글기 ${doc.theme.radius}px`}>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={doc.theme.radius}
                  onChange={(e) => commit({ ...doc, theme: { ...doc.theme, radius: Number(e.target.value) } })}
                />
              </Field>
              <Field label={`기준 글자 크기 ${doc.theme.fontSize}px`}>
                <input
                  type="range"
                  min={14}
                  max={20}
                  value={doc.theme.fontSize}
                  onChange={(e) => commit({ ...doc, theme: { ...doc.theme, fontSize: Number(e.target.value) } })}
                />
              </Field>
              <button
                type="button"
                className="bx-add-item"
                onClick={() => {
                  if (!confirm("모든 구역을 지우고 빈 문서로 시작할까요?")) return;
                  commit(blankDoc());
                  setSelectedId(null);
                }}
              >
                빈 문서로 시작
              </button>
            </div>
          )}
        </aside>

        {/* ── 가운데: 캔버스 ── */}
        <main className="bx-canvas-wrap" data-device={device}>
          {mode === "edit" ? (
            <div className="bx-canvas" style={{ width: canvasWidth }}>
              <style dangerouslySetInnerHTML={{ __html: BUILDER_CSS }} />
              <div
                ref={canvasRef}
                className="bf-root"
                style={cssVarStyle(doc.theme)}
                data-selected={selectedId ?? undefined}
                onClick={(e) => {
                  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
                  if (el?.dataset.id) setSelectedId(el.dataset.id);
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
              {doc.sections.length === 0 && (
                <p className="bx-canvas-empty">
                  왼쪽 「추가」에서 구역을 골라 넣으세요. 넣은 뒤에는 화면의 글자를 직접 눌러 고칠 수 있습니다.
                </p>
              )}
            </div>
          ) : (
            <iframe
              className="bx-preview"
              style={{ width: canvasWidth }}
              title="미리보기"
              srcDoc={exportHtml(doc)}
            />
          )}
        </main>

        {/* ── 오른쪽: 속성판 ── */}
        <aside className="bx-right">
          {!selected ? (
            <div className="bx-panel">
              <p className="bx-hint">
                화면에서 구역을 누르면 이곳에서 배경·여백·레이아웃을 조정할 수 있습니다. 글자는 화면에서 바로
                눌러 고치세요.
              </p>
            </div>
          ) : (
            <div className="bx-panel">
              <h2 className="bx-right-title">
                {SECTION_CATALOG.find((c) => c.kind === selected.kind)?.name}
                <small>{selected.name}</small>
              </h2>

              <Field label="구역 이름 (목록 표시용)">
                <TextInput value={selected.name} onChange={(v) => patchSection(selectedIndex, { name: v })} />
              </Field>

              <h3 className="bx-group">배치</h3>
              <Field label="여백">
                <Choice
                  value={selected.padding}
                  options={[
                    { value: "sm" as const, label: "좁게" },
                    { value: "md" as const, label: "보통" },
                    { value: "lg" as const, label: "넓게" },
                    { value: "xl" as const, label: "아주 넓게" },
                  ]}
                  onChange={(v) => patchSection(selectedIndex, { padding: v })}
                />
              </Field>
              <Field label="내용 폭">
                <Choice
                  value={selected.width}
                  options={[
                    { value: "narrow" as const, label: "좁게" },
                    { value: "normal" as const, label: "보통" },
                    { value: "wide" as const, label: "넓게" },
                    { value: "full" as const, label: "꽉 차게" },
                  ]}
                  onChange={(v) => patchSection(selectedIndex, { width: v })}
                />
              </Field>
              <Field label="정렬">
                <Choice
                  value={selected.align}
                  options={[
                    { value: "left" as const, label: "왼쪽" },
                    { value: "center" as const, label: "가운데" },
                  ]}
                  onChange={(v) => patchSection(selectedIndex, { align: v })}
                />
              </Field>
              <Field label="글자색">
                <Choice
                  value={selected.scheme}
                  options={[
                    { value: "light" as const, label: "밝은 바탕" },
                    { value: "dark" as const, label: "어두운 바탕" },
                  ]}
                  onChange={(v) => patchSection(selectedIndex, { scheme: v })}
                />
              </Field>

              <h3 className="bx-group">배경</h3>
              <BackgroundEditor
                value={selected.background}
                onChange={(bg) => patchSection(selectedIndex, { background: bg })}
              />

              <h3 className="bx-group">내용</h3>
              <SectionFields section={selected} onPatch={(patch) => patchSection(selectedIndex, patch)} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** 테마 변수를 리액트 style 객체로 — 캔버스도 내보내기와 같은 변수를 쓴다 */
function cssVarStyle(theme: Theme): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const pair of themeVars(theme).split(";")) {
    const [key, value] = pair.split(":");
    if (key && value) style[key.trim()] = value.trim();
  }
  return style as React.CSSProperties;
}

function BackgroundEditor({ value, onChange }: { value: Background; onChange: (bg: Background) => void }) {
  return (
    <>
      <Field label="배경 종류">
        <Choice
          value={value.kind}
          options={[
            { value: "none" as const, label: "기본" },
            { value: "solid" as const, label: "단색" },
            { value: "gradient" as const, label: "그러데이션" },
            { value: "image" as const, label: "사진" },
          ]}
          onChange={(kind) => {
            if (kind === "none") onChange({ kind: "none" });
            if (kind === "solid") onChange({ kind: "solid", color: "#FFFFFF" });
            if (kind === "gradient") onChange({ kind: "gradient", from: "#241A17", to: "#4A2A1E", angle: 155 });
            if (kind === "image") onChange({ kind: "image", url: "", overlay: 0.5 });
          }}
        />
      </Field>
      {value.kind === "solid" && (
        <Field label="배경색">
          <ColorInput value={value.color} onChange={(color) => onChange({ ...value, color })} />
        </Field>
      )}
      {value.kind === "gradient" && (
        <>
          <Field label="시작 색">
            <ColorInput value={value.from} onChange={(from) => onChange({ ...value, from })} />
          </Field>
          <Field label="끝 색">
            <ColorInput value={value.to} onChange={(to) => onChange({ ...value, to })} />
          </Field>
          <Field label={`각도 ${value.angle}°`}>
            <input
              type="range"
              min={0}
              max={360}
              value={value.angle}
              onChange={(e) => onChange({ ...value, angle: Number(e.target.value) })}
            />
          </Field>
        </>
      )}
      {value.kind === "image" && (
        <>
          <Field label="배경 사진">
            <ImagePicker value={value.url} onChange={(url) => onChange({ ...value, url })} />
          </Field>
          <Field label={`어둡게 덮기 ${Math.round(value.overlay * 100)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(value.overlay * 100)}
              onChange={(e) => onChange({ ...value, overlay: Number(e.target.value) / 100 })}
            />
          </Field>
        </>
      )}
    </>
  );
}

/** 구역 종류별 내용 항목 — 글자는 화면에서도 고칠 수 있고 여기서도 고칠 수 있다 */
function SectionFields({ section, onPatch }: { section: Section; onPatch: (patch: Partial<Section>) => void }) {
  const patch = onPatch as (p: Record<string, unknown>) => void;

  switch (section.kind) {
    case "header":
      return (
        <>
          <Field label="로고 글자">
            <TextInput value={section.logo} onChange={(v) => patch({ logo: v })} />
          </Field>
          <Field label="로고 아래 영문">
            <TextInput value={section.sub} onChange={(v) => patch({ sub: v })} />
          </Field>
          <Field label="오른쪽 버튼">
            <TextInput value={section.cta} onChange={(v) => patch({ cta: v })} />
          </Field>
          <h3 className="bx-group">메뉴</h3>
          <ListEditor
            items={section.menu}
            onChange={(menu) => patch({ menu })}
            make={() => ({ label: "새 메뉴" })}
            addLabel="메뉴 추가"
            render={(item, set) => <TextInput value={item.label} onChange={(v) => set({ label: v })} />}
          />
        </>
      );

    case "hero":
      return (
        <>
          <Field label="윗줄 라벨">
            <TextInput value={section.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
          </Field>
          <Field label="제목 1행">
            <TextInput value={section.title} onChange={(v) => patch({ title: v })} />
          </Field>
          <Field label="제목 2행 (강조색)">
            <TextInput value={section.titleEm} onChange={(v) => patch({ titleEm: v })} />
          </Field>
          <Field label="설명">
            <TextInput area value={section.desc} onChange={(v) => patch({ desc: v })} />
          </Field>
          <Field label="주 버튼">
            <TextInput value={section.primary} onChange={(v) => patch({ primary: v })} />
          </Field>
          <Field label="보조 버튼">
            <TextInput value={section.secondary} onChange={(v) => patch({ secondary: v })} />
          </Field>
          <h3 className="bx-group">성과 숫자</h3>
          <ListEditor
            items={section.stats}
            onChange={(stats) => patch({ stats })}
            make={() => ({ value: "00", label: "항목" })}
            addLabel="숫자 추가"
            render={(item, set) => (
              <>
                <TextInput value={item.value} onChange={(v) => set({ value: v })} placeholder="숫자" />
                <TextInput value={item.label} onChange={(v) => set({ label: v })} placeholder="설명" />
              </>
            )}
          />
        </>
      );

    case "cards":
      return (
        <>
          <HeadFields section={section} patch={patch} />
          <Field label="한 줄에 몇 개">
            <Choice
              value={section.columns}
              options={[
                { value: 2, label: "2개" },
                { value: 3, label: "3개" },
                { value: 4, label: "4개" },
              ]}
              onChange={(columns) => patch({ columns })}
            />
          </Field>
          <h3 className="bx-group">카드</h3>
          <ListEditor
            items={section.cards}
            onChange={(cards) => patch({ cards })}
            make={() => ({ no: "00", title: "새 카드", en: "NEW", desc: "설명을 적으세요.", meta: "자세히 보기", image: "" })}
            addLabel="카드 추가"
            render={(item, set) => (
              <>
                <TextInput value={item.no} onChange={(v) => set({ no: v })} placeholder="번호" />
                <TextInput value={item.title} onChange={(v) => set({ title: v })} placeholder="제목" />
                <TextInput value={item.en} onChange={(v) => set({ en: v })} placeholder="영문 라벨" />
                <TextInput area value={item.desc} onChange={(v) => set({ desc: v })} placeholder="설명" />
                <TextInput value={item.meta} onChange={(v) => set({ meta: v })} placeholder="아래 링크 글자" />
                <ImagePicker value={item.image} onChange={(v) => set({ image: v })} />
              </>
            )}
          />
        </>
      );

    case "steps":
      return (
        <>
          <HeadFields section={section} patch={patch} />
          <h3 className="bx-group">단계</h3>
          <ListEditor
            items={section.steps}
            onChange={(steps) => patch({ steps })}
            make={() => ({ index: "STEP 00", name: "새 단계", desc: "설명", gate: false })}
            addLabel="단계 추가"
            render={(item, set) => (
              <>
                <TextInput value={item.index} onChange={(v) => set({ index: v })} placeholder="STEP 01" />
                <TextInput value={item.name} onChange={(v) => set({ name: v })} placeholder="단계 이름" />
                <TextInput area value={item.desc} onChange={(v) => set({ desc: v })} placeholder="설명" />
                <label className="bx-check">
                  <input type="checkbox" checked={item.gate} onChange={(e) => set({ gate: e.target.checked })} />
                  중요 단계로 강조
                </label>
              </>
            )}
          />
        </>
      );

    case "table":
      return (
        <>
          <HeadFields section={section} patch={patch} />
          <h3 className="bx-group">열 이름</h3>
          <ListEditor
            items={section.columns.map((label) => ({ label }))}
            onChange={(cols) =>
              patch({
                columns: cols.map((c) => c.label),
                rows: section.rows.map((r) => ({
                  ...r,
                  cells: cols.map((_, i) => r.cells[i] ?? "-"),
                })),
              })
            }
            make={() => ({ label: "새 열" })}
            addLabel="열 추가"
            render={(item, set) => <TextInput value={item.label} onChange={(v) => set({ label: v })} />}
          />
          <h3 className="bx-group">행</h3>
          <p className="bx-hint">칸에 O 또는 X를 적으면 표시가 강조됩니다.</p>
          <ListEditor
            items={section.rows}
            onChange={(rows) => patch({ rows })}
            make={() => ({ label: "새 항목", cells: section.columns.map(() => "-") })}
            addLabel="행 추가"
            render={(item, set) => (
              <>
                <TextInput value={item.label} onChange={(v) => set({ label: v })} placeholder="항목 이름" />
                <span className="bx-cells">
                  {item.cells.map((cell, ci) => (
                    <input
                      key={ci}
                      value={cell}
                      onChange={(e) =>
                        set({ cells: item.cells.map((c, j) => (j === ci ? e.target.value : c)) })
                      }
                    />
                  ))}
                </span>
              </>
            )}
          />
        </>
      );

    case "list":
      return (
        <>
          <HeadFields section={section} patch={patch} />
          <h3 className="bx-group">항목</h3>
          <ListEditor
            items={section.items}
            onChange={(items) => patch({ items })}
            make={() => ({ no: "00", label: "새 항목", meta: "", tags: [] })}
            addLabel="항목 추가"
            render={(item, set) => (
              <>
                <TextInput value={item.no} onChange={(v) => set({ no: v })} placeholder="번호" />
                <TextInput value={item.label} onChange={(v) => set({ label: v })} placeholder="내용" />
                <TextInput
                  value={item.tags.join(", ")}
                  onChange={(v) => set({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="꼬리표 (쉼표로 구분)"
                />
              </>
            )}
          />
        </>
      );

    case "gallery":
      return (
        <>
          <HeadFields section={section} patch={patch} />
          <Field label="한 줄에 몇 장">
            <Choice
              value={section.columns}
              options={[
                { value: 2, label: "2장" },
                { value: 3, label: "3장" },
                { value: 4, label: "4장" },
              ]}
              onChange={(columns) => patch({ columns })}
            />
          </Field>
          <h3 className="bx-group">사진</h3>
          <ListEditor
            items={section.images}
            onChange={(images) => patch({ images })}
            make={() => ({ url: "", caption: "사진 설명" })}
            addLabel="사진 추가"
            render={(item, set) => (
              <>
                <ImagePicker value={item.url} onChange={(v) => set({ url: v })} />
                <TextInput value={item.caption} onChange={(v) => set({ caption: v })} placeholder="설명" />
              </>
            )}
          />
        </>
      );

    case "rich":
      return (
        <>
          <Field label="윗줄 라벨">
            <TextInput value={section.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
          </Field>
          <Field label="제목">
            <TextInput value={section.title} onChange={(v) => patch({ title: v })} />
          </Field>
          <Field label="본문 (빈 줄로 문단 나눔)">
            <textarea rows={10} value={section.body} onChange={(e) => patch({ body: e.target.value })} />
          </Field>
        </>
      );

    case "cta":
      return (
        <>
          <Field label="제목">
            <TextInput value={section.title} onChange={(v) => patch({ title: v })} />
          </Field>
          <Field label="설명">
            <TextInput area value={section.desc} onChange={(v) => patch({ desc: v })} />
          </Field>
          <Field label="버튼 글자">
            <TextInput value={section.button} onChange={(v) => patch({ button: v })} />
          </Field>
          <Field label="아래 작은 글씨">
            <TextInput value={section.note} onChange={(v) => patch({ note: v })} />
          </Field>
        </>
      );

    case "board":
      return (
        <>
          <HeadFields section={section} patch={patch} />
          <label className="bx-check">
            <input
              type="checkbox"
              checked={section.allowWrite}
              onChange={(e) => patch({ allowWrite: e.target.checked })}
            />
            방문자가 글을 쓸 수 있게
          </label>
          <p className="bx-hint">
            여기 넣은 글은 내보낸 파일에 함께 담깁니다. 방문자가 새로 쓴 글은 그 사람 브라우저에만 남습니다 —
            여러 사람이 함께 보는 게시판이 필요하면 서버 연결이 따로 필요합니다.
          </p>
          <h3 className="bx-group">글</h3>
          <ListEditor
            items={section.posts}
            onChange={(posts) => patch({ posts })}
            make={() => ({
              id: newId("p"),
              title: "새 글 제목",
              author: "관리자",
              date: new Date().toISOString().slice(0, 10),
              body: "내용을 적으세요.",
              notice: false,
            })}
            addLabel="글 추가"
            render={(item, set) => (
              <>
                <TextInput value={item.title} onChange={(v) => set({ title: v })} placeholder="제목" />
                <span className="bx-two">
                  <TextInput value={item.author} onChange={(v) => set({ author: v })} placeholder="작성자" />
                  <TextInput value={item.date} onChange={(v) => set({ date: v })} placeholder="2026-09-01" />
                </span>
                <TextInput area value={item.body} onChange={(v) => set({ body: v })} placeholder="내용" />
                <label className="bx-check">
                  <input type="checkbox" checked={item.notice} onChange={(e) => set({ notice: e.target.checked })} />
                  공지로 표시
                </label>
              </>
            )}
          />
        </>
      );

    case "footer":
      return (
        <>
          <Field label="브랜드 이름">
            <TextInput value={section.brand} onChange={(v) => patch({ brand: v })} />
          </Field>
          <h3 className="bx-group">회사 정보 줄</h3>
          <ListEditor
            items={section.lines.map((text) => ({ text }))}
            onChange={(lines) => patch({ lines: lines.map((l) => l.text) })}
            make={() => ({ text: "새 줄" })}
            addLabel="줄 추가"
            render={(item, set) => <TextInput value={item.text} onChange={(v) => set({ text: v })} />}
          />
          <h3 className="bx-group">하단 링크</h3>
          <ListEditor
            items={section.links}
            onChange={(links) => patch({ links })}
            make={() => ({ label: "새 링크" })}
            addLabel="링크 추가"
            render={(item, set) => <TextInput value={item.label} onChange={(v) => set({ label: v })} />}
          />
        </>
      );
  }
}

/** 제목 묶음(라벨·제목·설명)은 여러 구역이 함께 쓴다 */
function HeadFields({
  section,
  patch,
}: {
  section: { eyebrow: string; title: string; lead: string };
  patch: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="윗줄 라벨">
        <TextInput value={section.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </Field>
      <Field label="제목">
        <TextInput value={section.title} onChange={(v) => patch({ title: v })} />
      </Field>
      <Field label="설명">
        <TextInput area value={section.lead} onChange={(v) => patch({ lead: v })} />
      </Field>
    </>
  );
}
