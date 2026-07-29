"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * STUDIO MODE — 미팅 현장에서 디자인을 협의·확정하기 위한 컨트롤 패널.
 *
 * `?studio=1`로 진입했을 때만 마운트된다. 모든 조작은 CSS 변수·body 클래스·
 * 인라인 스타일로 즉시 반영되며, 저장하지 않는 한 새로고침으로 사라진다 —
 * 회의용 도구이지 사이트 기능이 아니다. "확정 사양 복사"가 내보내는 JSON이
 * 그날 확정한 MVP 사양의 기록이 된다.
 */

/* ---------------------------------------------------------------- colour */

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** lightness/saturation을 상대 이동한 색 */
function shift(hex: string, dl: number, ds = 0): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s + ds, l + dl);
}

/** 같은 색상(hue)의 아주 옅은 배경 틴트 */
function tint(hex: string, lightness: number): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, 55), lightness);
}

/** WCAG 상대 휘도 → 흰 글자와의 대비 */
function contrastWithWhite(hex: string): number {
  const m = hex.replace("#", "");
  const chan = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L =
    0.2126 * chan(parseInt(m.slice(0, 2), 16)) +
    0.7152 * chan(parseInt(m.slice(2, 4), 16)) +
    0.0722 * chan(parseInt(m.slice(4, 6), 16));
  return (1 + 0.05) / (L + 0.05);
}

/* ------------------------------------------------------------- presets */

type VarMap = Record<string, string>;

/** 주조색 하나로 ember 계열 6종을 파생 */
function deriveLead(lead: string): VarMap {
  return {
    "--ember": lead,
    "--ember-press": shift(lead, -5),
    "--ember-ink": shift(lead, -13),
    "--ember-glow": shift(lead, 18, 6),
    "--ember-on-dark": shift(lead, 16),
    "--ember-soft": tint(lead, 94),
  };
}

function deriveGold(gold: string): VarMap {
  return {
    "--heritage-gold": gold,
    "--heritage-soft": shift(gold, 13),
    "--gold-ink": shift(gold, -21),
  };
}

function deriveGround(ground: string): VarMap {
  return {
    "--ground": ground,
    "--ink-strong": shift(ground, 4),
    "--ink": shift(ground, 7),
  };
}

interface Preset {
  id: string;
  name: string;
  note: string;
  /** 스와치에 보여줄 대표 3색 */
  chips: [string, string, string];
  vars: VarMap;
  lead: string;
  gold: string;
  ground: string;
}

const PRESETS: Preset[] = [
  {
    id: "ember",
    name: "엠버 · 인장",
    note: "현행 — 회장 인영의 붉은 기운이 주조",
    chips: ["#D8341A", "#C49A3A", "#17110F"],
    lead: "#D8341A",
    gold: "#C49A3A",
    ground: "#17110F",
    vars: {}, // 기본값 그대로
  },
  {
    id: "navy",
    name: "미드나잇 네이비",
    note: "BI/CI 가이드라인 정본 — 네이비 70%",
    chips: ["#C22B14", "#C49A3A", "#0C1322"],
    lead: "#C22B14",
    gold: "#C49A3A",
    ground: "#0C1322",
    vars: {
      ...deriveLead("#C22B14"),
      ...deriveGround("#0C1322"),
      "--ink-strong": "#16233F",
      "--ink": "#1D2C4C",
      "--paper-bg": "#F4F5F8",
      "--warm-white": "#F6F7FA",
      "--paper-deep": "#EAEDF2",
      "--line-color": "#D2D6DE",
      "--muted": "#565E70",
      "--label-ink": "#565E70",
      "--label-on-dark": "#98A3B8",
    },
  },
  {
    id: "obsidian",
    name: "흑단 · 금",
    note: "프리미엄 다크 — 금이 주조, 붉은 기운은 절제",
    chips: ["#7E6118", "#C49A3A", "#12100C"],
    lead: "#7E6118",
    gold: "#C49A3A",
    ground: "#12100C",
    vars: {
      ...deriveLead("#7E6118"),
      "--ember-glow": "#E0B54E",
      "--ember-on-dark": "#D9B04A",
      ...deriveGround("#12100C"),
      "--paper-bg": "#F7F5EF",
      "--paper-deep": "#EFEBE0",
    },
  },
  {
    id: "sumuk",
    name: "수묵 · 낙관",
    note: "먹빛 모노크롬 — 인장 하나만 붉게 남긴다",
    chips: ["#B3261E", "#8C8C8C", "#141414"],
    lead: "#B3261E",
    gold: "#8C8C8C",
    ground: "#141414",
    vars: {
      ...deriveLead("#B3261E"),
      ...deriveGround("#141414"),
      "--heritage-gold": "#8C8C8C",
      "--heritage-soft": "#B5B5B5",
      "--gold-ink": "#5F5F5F",
      "--paper-bg": "#F6F6F4",
      "--warm-white": "#F8F8F6",
      "--paper-deep": "#ECECE8",
      "--line-color": "#D9D9D4",
      "--muted": "#5C5C57",
      "--label-ink": "#5C5C57",
      "--label-on-dark": "#A6A6A0",
    },
  },
];

/* ---------------------------------------------------------- hero copy */

export interface HeroVariant {
  id: string;
  label: string;
  pre: string;
  em: string;
  post: string;
  desc: string;
}

export const HERO_VARIANTS: HeroVariant[] = [
  {
    id: "A",
    label: "A · 마지막 10%",
    pre: "AI가 답할 수 없는",
    em: "마지막 10%",
    post: "를 가르친다.",
    desc:
      "㈜프론티어 M&A 성보경 회장의 40년 실전 자산(500회 · 1,500문제)과 온라인에서 가려내고, 오프라인에서 실제 딜을 다루는 소수정예 과정.",
  },
  {
    id: "B",
    label: "B · 전장에서 배운다",
    pre: "M&A는 강의실이 아니라",
    em: "전장",
    post: "에서 배운다.",
    desc:
      "이론이 아니라 병법입니다. 온라인 선발 시험을 통과한 소수만이 성보경 회장의 오프라인 딜 랩에서 실제 거래를 상대합니다.",
  },
  {
    id: "C",
    label: "C · 직전(直傳)",
    pre: "40년의 실전을",
    em: "다음 세대",
    post: "에게 남긴다.",
    desc:
      "1993년 국내 최초 M&A 전문회사 설립, 70건의 딜과 19건의 경영권 분쟁 중재. 성보경 회장의 판단을 소수정예가 직접 이어받습니다.",
  },
];

/* --------------------------------------------------------- text editing */

/**
 * 문구 직접 수정 모드에서 편집 가능해지는 영역.
 * 히어로·본문 섹션은 물론 메인 메뉴와 푸터까지 포함한다.
 */
const EDIT_SELECTORS = [
  // 헤더 — 메인 메뉴와 로그인 버튼, 브랜드 문구
  ".primary-nav a",
  ".header-login",
  ".brand-name",
  ".brand-descriptor",
  ".mobile-nav a span",
  // 히어로
  ".hero h1",
  ".hero-description",
  ".hero-eyebrow",
  ".hero-proof strong",
  ".hero-proof span",
  // 본문 섹션
  ".section h2",
  ".section-heading > p",
  ".section-index",
  ".tier-card h3",
  ".tier-card p",
  ".funnel-name",
  ".funnel-desc",
  ".exam-prompt",
  ".track-card strong",
  ".track-hook",
  ".track-card p",
  ".verdict-quote",
  // 푸터
  ".footer-statement",
  ".footer-nav-title",
  ".footer-nav a",
  ".footer-contact p",
  ".footer-contact a",
  ".partner-note",
  ".footer-base small",
  ".footer-admin",
].join(", ");

/** 수정 위치를 사람이 읽을 수 있게 — 가장 가까운 랜드마크 기준 */
function describeLocation(el: Element): string {
  if (el.closest("header")) return "메인 메뉴";
  if (el.closest("footer")) return "푸터";
  if (el.closest(".hero")) return "히어로";
  const section = el.closest("section[id]");
  if (section) {
    const names: Record<string, string> = {
      courses: "5대 과정",
      funnel: "수강 여정",
      exam: "선발 테스트",
      offline: "오프라인",
    };
    return names[section.id] ?? section.id;
  }
  return el.tagName.toLowerCase();
}

/* ----------------------------------------------------------- sections */

const SECTIONS = [
  { id: "courses", name: "5대 과정" },
  { id: "funnel", name: "수강 여정" },
  { id: "exam", name: "선발 테스트" },
  { id: "offline", name: "오프라인" },
];

/* ---------------------------------------------------------------- panel */

interface StudioState {
  preset: string;
  lead: string;
  gold: string;
  ground: string;
  headingFont: "serif" | "sans";
  typeScale: number; // percent
  bodyScale: number; // percent
  space: number; // percent — 섹션 상하 여백
  radius: number; // px
  video: boolean;
  hidden: string[]; // 숨긴 섹션 id
}

const DEFAULT_STATE: StudioState = {
  preset: "ember",
  lead: "#D8341A",
  gold: "#C49A3A",
  ground: "#17110F",
  headingFont: "serif",
  typeScale: 100,
  bodyScale: 100,
  space: 100,
  radius: 0,
  video: true,
  hidden: [],
};

interface Snapshot {
  s: StudioState;
  hero: number;
}

/** 패널이 만진 적 있는 변수 전부 — 프리셋 전환 시 잔여물을 지우기 위한 목록 */
const MANAGED_VARS = [
  "--ember", "--ember-press", "--ember-ink", "--ember-glow", "--ember-on-dark", "--ember-soft",
  "--ground", "--ink-strong", "--ink",
  "--heritage-gold", "--heritage-soft", "--gold-ink",
  "--paper-bg", "--warm-white", "--paper-deep", "--line-color",
  "--muted", "--label-ink", "--label-on-dark",
  "--studio-type-scale", "--studio-body-scale", "--studio-space", "--studio-radius",
];

export default function StudioPanel({
  heroVariant,
  onHeroVariant,
  onClose,
}: {
  heroVariant: number;
  onHeroVariant: (i: number) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<StudioState>(DEFAULT_STATE);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [snaps, setSnaps] = useState<(Snapshot | null)[]>([null, null, null]);

  // 편집된 요소의 원본 innerHTML — 원복과 변경 수집에 쓴다
  const originalsRef = useRef<Map<HTMLElement, string>>(new Map());

  const preset = PRESETS.find((p) => p.id === state.preset) ?? PRESETS[0];

  // 프리셋 + 사용자 색 조정을 합쳐 실제 적용될 변수 맵을 만든다.
  const varMap = useMemo(() => {
    const map: VarMap = { ...preset.vars };
    if (state.lead !== preset.lead) Object.assign(map, deriveLead(state.lead));
    if (state.gold !== preset.gold) Object.assign(map, deriveGold(state.gold));
    if (state.ground !== preset.ground) Object.assign(map, deriveGround(state.ground));
    map["--studio-type-scale"] = String(state.typeScale / 100);
    map["--studio-body-scale"] = String(state.bodyScale / 100);
    map["--studio-space"] = String(state.space / 100);
    map["--studio-radius"] = `${state.radius}px`;
    return map;
  }, [state, preset]);

  // 변수·클래스를 문서에 반영. 언마운트하면 전부 원복.
  useEffect(() => {
    const root = document.documentElement;
    MANAGED_VARS.forEach((v) => root.style.removeProperty(v));
    Object.entries(varMap).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.classList.toggle("studio-headings-sans", state.headingFont === "sans");
    document.body.classList.toggle("studio-no-video", !state.video);
    return () => {
      MANAGED_VARS.forEach((v) => root.style.removeProperty(v));
      document.body.classList.remove("studio-headings-sans", "studio-no-video");
    };
  }, [varMap, state.headingFont, state.video]);

  // 섹션 표시/숨김
  useEffect(() => {
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) el.style.display = state.hidden.includes(id) ? "none" : "";
    });
    return () => {
      SECTIONS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "";
      });
    };
  }, [state.hidden]);

  // 문구 직접 수정 모드 — 지정 영역을 contentEditable로 전환.
  // 편집 중에는 링크가 이동하지 않도록 클릭을 캡처 단계에서 막는다.
  useEffect(() => {
    if (!editing) return;
    // 버튼 래퍼(트랙·문제 카드)가 mousedown에서 포커스를 가로채 캐럿을 막으므로,
    // 편집 중에는 body 클래스로 버튼의 포인터 이벤트를 끄고 편집 영역만 받는다.
    document.body.classList.add("studio-editing");
    const els = Array.from(document.querySelectorAll<HTMLElement>(EDIT_SELECTORS));
    const origs = originalsRef.current;
    els.forEach((el) => {
      if (!origs.has(el)) origs.set(el, el.innerHTML);
      el.setAttribute("contenteditable", "true");
      el.setAttribute("data-studio-edit", "");
      el.spellcheck = false;
    });
    // 편집 영역 클릭이 링크 이동이나 카드 선택(트랙·문제 버튼의 onClick)으로
    // 번지지 않게 캡처 단계에서 끊는다 — 그래야 버튼 안의 문구도 고칠 수 있다.
    const blockNav = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest("[data-studio-edit]");
      if (!t) return;
      if (t.closest("a")) e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("click", blockNav, true);
    return () => {
      document.body.classList.remove("studio-editing");
      els.forEach((el) => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("data-studio-edit");
      });
      document.removeEventListener("click", blockNav, true);
    };
  }, [editing]);

  const applyPreset = (p: Preset) =>
    setState((s) => ({ ...s, preset: p.id, lead: p.lead, gold: p.gold, ground: p.ground }));

  const ctaContrast = contrastWithWhite(state.lead);

  /** 편집으로 실제 달라진 문구 목록 */
  const collectEdits = () => {
    const out: { 위치: string; 원문: string; 수정문: string }[] = [];
    originalsRef.current.forEach((origHtml, el) => {
      if (!el.isConnected) return;
      if (el.innerHTML === origHtml) return;
      const tmp = document.createElement("div");
      tmp.innerHTML = origHtml;
      out.push({
        위치: describeLocation(el),
        원문: (tmp.textContent ?? "").trim(),
        수정문: (el.textContent ?? "").trim(),
      });
    });
    return out;
  };

  const restoreTexts = () => {
    // 원본 맵은 지우지 않는다 — 원복 후 다시 고치면 그 차이가 다시 잡혀야 한다.
    originalsRef.current.forEach((origHtml, el) => {
      if (el.isConnected) el.innerHTML = origHtml;
    });
  };

  const copySpec = async () => {
    const edits = collectEdits();
    const spec = {
      확정일: new Date().toISOString().slice(0, 10),
      방향: preset.name,
      주조색: state.lead,
      포인트색: state.gold,
      다크그라운드: state.ground,
      제목서체: state.headingFont === "serif" ? "명조" : "고딕",
      제목크기: `${state.typeScale}%`,
      본문크기: `${state.bodyScale}%`,
      섹션여백: `${state.space}%`,
      모서리: `${state.radius}px`,
      히어로영상: state.video ? "사용" : "미사용",
      숨긴섹션: SECTIONS.filter((s) => state.hidden.includes(s.id)).map((s) => s.name),
      히어로카피: HERO_VARIANTS[heroVariant].id,
      히어로카피_본문: `${HERO_VARIANTS[heroVariant].pre} ${HERO_VARIANTS[heroVariant].em}${HERO_VARIANTS[heroVariant].post}`,
      문구수정: edits,
      CSS변수: varMap,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 클립보드 권한이 없으면 조용히 무시 — 콘솔에라도 남긴다 */
      console.log(JSON.stringify(spec, null, 2));
    }
  };

  const replayIntro = () => {
    try {
      sessionStorage.removeItem("fma-intro-seen");
    } catch {}
    window.location.reload();
  };

  const saveSnap = (i: number) =>
    setSnaps((arr) => {
      const next = [...arr];
      next[i] = { s: { ...state, hidden: [...state.hidden] }, hero: heroVariant };
      return next;
    });

  const loadSnap = (snap: Snapshot) => {
    setState({ ...snap.s, hidden: [...snap.s.hidden] });
    onHeroVariant(snap.hero);
  };

  const clearSnap = (i: number) =>
    setSnaps((arr) => {
      const next = [...arr];
      next[i] = null;
      return next;
    });

  if (!open) {
    return (
      <button type="button" className="studio-tab" onClick={() => setOpen(true)}>
        STUDIO
      </button>
    );
  }

  return (
    <aside className="studio-panel" aria-label="디자인 협의 패널">
      <header className="studio-head">
        <div>
          <strong>STUDIO</strong>
          <span>디자인 협의 모드</span>
        </div>
        <div className="studio-head-actions">
          <button type="button" onClick={() => setOpen(false)} aria-label="패널 접기">—</button>
          <button type="button" onClick={onClose} aria-label="스튜디오 모드 종료">✕</button>
        </div>
      </header>

      <section>
        <h4>방향</h4>
        <div className="studio-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="studio-preset"
              data-active={state.preset === p.id}
              onClick={() => applyPreset(p)}
            >
              <span className="studio-chips" aria-hidden="true">
                {p.chips.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="studio-preset-name">{p.name}</span>
              <span className="studio-preset-note">{p.note}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>색</h4>
        <div className="studio-row">
          <label>주조색</label>
          <input
            type="color"
            value={state.lead}
            onChange={(e) => setState((s) => ({ ...s, lead: e.target.value }))}
          />
          <code>{state.lead.toUpperCase()}</code>
        </div>
        <div className="studio-row">
          <label>포인트</label>
          <input
            type="color"
            value={state.gold}
            onChange={(e) => setState((s) => ({ ...s, gold: e.target.value }))}
          />
          <code>{state.gold.toUpperCase()}</code>
        </div>
        <div className="studio-row">
          <label>배경(다크)</label>
          <input
            type="color"
            value={state.ground}
            onChange={(e) => setState((s) => ({ ...s, ground: e.target.value }))}
          />
          <code>{state.ground.toUpperCase()}</code>
        </div>
        <p className="studio-verdict" data-ok={ctaContrast >= 4.5}>
          버튼 흰 글자 대비 {ctaContrast.toFixed(1)}:1 {ctaContrast >= 4.5 ? "— 합격" : "— 미달 (4.5:1 필요)"}
        </p>
      </section>

      <section>
        <h4>서체 · 형태</h4>
        <div className="studio-row">
          <label>제목 서체</label>
          <div className="studio-seg">
            <button
              type="button"
              data-active={state.headingFont === "serif"}
              onClick={() => setState((s) => ({ ...s, headingFont: "serif" }))}
            >
              명조
            </button>
            <button
              type="button"
              data-active={state.headingFont === "sans"}
              onClick={() => setState((s) => ({ ...s, headingFont: "sans" }))}
            >
              고딕
            </button>
          </div>
        </div>
        <div className="studio-row">
          <label>제목 크기</label>
          <input
            type="range"
            min={85}
            max={115}
            value={state.typeScale}
            onChange={(e) => setState((s) => ({ ...s, typeScale: Number(e.target.value) }))}
          />
          <code>{state.typeScale}%</code>
        </div>
        <div className="studio-row">
          <label>본문 크기</label>
          <input
            type="range"
            min={90}
            max={115}
            value={state.bodyScale}
            onChange={(e) => setState((s) => ({ ...s, bodyScale: Number(e.target.value) }))}
          />
          <code>{state.bodyScale}%</code>
        </div>
        <div className="studio-row">
          <label>섹션 여백</label>
          <input
            type="range"
            min={70}
            max={125}
            value={state.space}
            onChange={(e) => setState((s) => ({ ...s, space: Number(e.target.value) }))}
          />
          <code>{state.space}%</code>
        </div>
        <div className="studio-row">
          <label>모서리</label>
          <input
            type="range"
            min={0}
            max={14}
            value={state.radius}
            onChange={(e) => setState((s) => ({ ...s, radius: Number(e.target.value) }))}
          />
          <code>{state.radius}px</code>
        </div>
      </section>

      <section>
        <h4>구성</h4>
        <div className="studio-checks">
          {SECTIONS.map(({ id, name }) => {
            const on = !state.hidden.includes(id);
            return (
              <button
                key={id}
                type="button"
                data-active={on}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    hidden: on ? [...s.hidden, id] : s.hidden.filter((h) => h !== id),
                  }))
                }
              >
                <i aria-hidden="true">{on ? "●" : "○"}</i> {name}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h4>문구</h4>
        <div className="studio-row">
          <label>직접 수정</label>
          <div className="studio-seg">
            <button type="button" data-active={!editing} onClick={() => setEditing(false)}>
              끔
            </button>
            <button type="button" data-active={editing} onClick={() => setEditing(true)}>
              켬
            </button>
          </div>
          <button type="button" className="studio-mini" onClick={restoreTexts}>
            원복
          </button>
        </div>
        {editing && (
          <p className="studio-hint">
            화면의 점선 영역(메뉴·제목·본문·푸터)을 클릭해 그 자리에서 고치십시오.
            수정 내용은 &ldquo;확정 사양 복사&rdquo;에 원문과 함께 기록됩니다.
          </p>
        )}
      </section>

      <section>
        <h4>히어로</h4>
        <div className="studio-copyset">
          {HERO_VARIANTS.map((v, i) => (
            <button
              key={v.id}
              type="button"
              data-active={heroVariant === i}
              onClick={() => onHeroVariant(i)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="studio-row">
          <label>배경 영상</label>
          <div className="studio-seg">
            <button
              type="button"
              data-active={state.video}
              onClick={() => setState((s) => ({ ...s, video: true }))}
            >
              켬
            </button>
            <button
              type="button"
              data-active={!state.video}
              onClick={() => setState((s) => ({ ...s, video: false }))}
            >
              끔
            </button>
          </div>
          <button type="button" className="studio-mini" onClick={replayIntro}>
            인트로 다시
          </button>
        </div>
      </section>

      <section>
        <h4>스냅샷</h4>
        <div className="studio-snaps">
          {snaps.map((snap, i) => {
            const label = ["A", "B", "C"][i];
            return snap ? (
              <span key={label} className="studio-snap" data-filled="true">
                <button type="button" onClick={() => loadSnap(snap)} title="이 상태로 복원">
                  {label} 복원
                </button>
                <button
                  type="button"
                  className="studio-snap-x"
                  onClick={() => clearSnap(i)}
                  aria-label={`스냅샷 ${label} 지우기`}
                >
                  ✕
                </button>
              </span>
            ) : (
              <span key={label} className="studio-snap">
                <button type="button" onClick={() => saveSnap(i)} title="현재 상태를 저장">
                  {label} 저장
                </button>
              </span>
            );
          })}
        </div>
        <p className="studio-hint">
          현재 상태(색·서체·구성·카피)를 담아두고 오가며 비교하십시오. 문구 수정은 화면에
          그대로 남습니다.
        </p>
      </section>

      <footer className="studio-foot">
        <button type="button" className="studio-primary" onClick={copySpec}>
          {copied ? "복사되었습니다" : "확정 사양 복사"}
        </button>
        <button
          type="button"
          className="studio-mini"
          onClick={() => {
            setState(DEFAULT_STATE);
            setEditing(false);
            restoreTexts();
            onHeroVariant(0);
          }}
        >
          초기화
        </button>
      </footer>
    </aside>
  );
}
