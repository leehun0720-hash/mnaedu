/**
 * 홈페이지 빌더 — 그리기.
 *
 * 편집 화면(캔버스)과 내보낸 HTML이 **같은 함수**에서 나온다. 둘을 따로 만들면
 * 편집 중에 본 모습과 내보낸 결과가 어긋나는데, 그것이 빌더에서 가장 치명적인
 * 고장이다. 그래서 마크업도 스타일도 여기 한 곳에만 둔다.
 *
 * 편집 모드에서는 글자 요소에 data-edit="경로"를 붙인다. 캔버스가 그 표시를
 * 보고 그 자리에서 고쳐 쓸 수 있게 만든다(경로는 문서에서의 위치를 가리킨다).
 */

import type { Background, Section, SiteDoc, Theme } from "./types";

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 이미지 주소는 그대로 style/src에 들어가므로 형식을 확인한다.
 * http(s)와 data 이미지만 통과시켜 javascript: 같은 주소가 끼지 못하게 한다.
 */
export function safeUrl(url: string): string {
  const v = (url ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v) || /^data:image\//i.test(v) || v.startsWith("/")) {
    return v.replace(/["'\\]/g, "");
  }
  return "";
}

/**
 * 편집 표시 — 내보낼 때는 아무것도 붙지 않는다.
 *
 * contenteditable을 마크업에 함께 넣는 것이 중요하다. 그려진 뒤에 자바스크립트로
 * 붙이면, 화면을 다시 그릴 때마다 그 표시가 함께 지워진다(그린 결과의 주인은
 * 리액트다). 마크업에 넣어 두면 몇 번을 다시 그려도 편집 상태가 살아 있다.
 */
function ed(path: string, edit: boolean): string {
  return edit ? ` data-edit="${escapeHtml(path)}" contenteditable="true" spellcheck="false"` : "";
}

function bgStyle(bg: Background): { style: string; hasImage: boolean } {
  switch (bg.kind) {
    case "solid":
      return { style: `background-color:${escapeHtml(bg.color)};`, hasImage: false };
    case "gradient":
      return {
        style: `background-image:linear-gradient(${Number(bg.angle) || 0}deg,${escapeHtml(bg.from)},${escapeHtml(bg.to)});`,
        hasImage: false,
      };
    case "image": {
      const url = safeUrl(bg.url);
      if (!url) return { style: "", hasImage: false };
      const ov = Math.min(1, Math.max(0, Number(bg.overlay) || 0));
      return {
        style: `background-image:url('${url}');background-size:cover;background-position:center;--bf-ov:${ov};`,
        hasImage: true,
      };
    }
    default:
      return { style: "", hasImage: false };
  }
}

/** 테마 → CSS 변수. 문서 전체를 감싸는 요소에 붙는다. */
export function themeVars(theme: Theme): string {
  const heading =
    theme.heading === "serif"
      ? `"Noto Serif KR", Georgia, serif`
      : `"Noto Sans KR", -apple-system, sans-serif`;
  return [
    `--bf-accent:${theme.accent}`,
    `--bf-accent-ink:${theme.accentInk}`,
    `--bf-paper:${theme.paper}`,
    `--bf-paper-deep:${theme.paperDeep}`,
    `--bf-ink:${theme.ink}`,
    `--bf-ink-strong:${theme.inkStrong}`,
    `--bf-line:${theme.line}`,
    `--bf-muted:${theme.muted}`,
    `--bf-heading:${heading}`,
    `--bf-radius:${theme.radius}px`,
    `--bf-fs:${theme.fontSize}px`,
  ].join(";");
}

/* ────────────────────────────────────────────────────────────
   구역별 마크업
   ──────────────────────────────────────────────────────────── */

function headBlock(
  s: { eyebrow?: string; title?: string; lead?: string },
  p: string,
  edit: boolean
): string {
  const bits: string[] = [];
  if (s.eyebrow !== undefined) bits.push(`<p class="bf-eyebrow"${ed(`${p}.eyebrow`, edit)}>${escapeHtml(s.eyebrow)}</p>`);
  if (s.title !== undefined) bits.push(`<h2 class="bf-h2"${ed(`${p}.title`, edit)}>${escapeHtml(s.title)}</h2>`);
  if (s.lead !== undefined) bits.push(`<p class="bf-lead"${ed(`${p}.lead`, edit)}>${escapeHtml(s.lead)}</p>`);
  return `<div class="bf-head">${bits.join("")}</div>`;
}

function inner(s: Section, p: string, edit: boolean): string {
  switch (s.kind) {
    case "header": {
      // 로고 그림이 있으면 그것이 상표다 — 없을 때만 강조색 네모가 대신 선다.
      // 높이만 정하고 가로는 비율대로 두어야 어떤 모양의 로고든 찌그러지지 않는다.
      const logoUrl = safeUrl(s.logoImage ?? "");
      const logoH = Math.min(120, Math.max(16, Number(s.logoHeight) || 34));
      const mark = logoUrl
        ? `<img class="bf-brand-img" src="${logoUrl}" alt="${escapeHtml(s.logo)}" style="height:${logoH}px">`
        : `<span class="bf-brand-mark" aria-hidden="true"></span>`;
      return `<div class="bf-nav">
  <div class="bf-brand">
    ${mark}
    <span class="bf-brand-text">
      <strong${ed(`${p}.logo`, edit)}>${escapeHtml(s.logo)}</strong>
      <small${ed(`${p}.sub`, edit)}>${escapeHtml(s.sub)}</small>
    </span>
  </div>
  <nav class="bf-menu">${s.menu
    .map((m, i) => `<span${ed(`${p}.menu.${i}.label`, edit)}>${escapeHtml(m.label)}</span>`)
    .join("")}</nav>
  <span class="bf-btn bf-btn--sm"${ed(`${p}.cta`, edit)}>${escapeHtml(s.cta)}</span>
</div>`;
    }

    case "hero":
      return `<div class="bf-hero">
  <p class="bf-eyebrow"${ed(`${p}.eyebrow`, edit)}>${escapeHtml(s.eyebrow)}</p>
  <h1 class="bf-h1"><span${ed(`${p}.title`, edit)}>${escapeHtml(s.title)}</span><br><em${ed(`${p}.titleEm`, edit)}>${escapeHtml(s.titleEm)}</em></h1>
  <p class="bf-hero-desc"${ed(`${p}.desc`, edit)}>${escapeHtml(s.desc)}</p>
  <div class="bf-actions">
    <span class="bf-btn"${ed(`${p}.primary`, edit)}>${escapeHtml(s.primary)}</span>
    <span class="bf-btn bf-btn--ghost"${ed(`${p}.secondary`, edit)}>${escapeHtml(s.secondary)}</span>
  </div>
  ${
    s.stats.length
      ? `<div class="bf-stats">${s.stats
          .map(
            (st, i) =>
              `<div class="bf-stat"><strong${ed(`${p}.stats.${i}.value`, edit)}>${escapeHtml(st.value)}</strong><span${ed(
                `${p}.stats.${i}.label`,
                edit
              )}>${escapeHtml(st.label)}</span></div>`
          )
          .join("")}</div>`
      : ""
  }
</div>`;

    case "cards":
      return `${headBlock(s, p, edit)}
<div class="bf-cards" data-cols="${Number(s.columns) || 3}">${s.cards
        .map((c, i) => {
          const img = safeUrl(c.image);
          return `<article class="bf-card">
  ${img ? `<span class="bf-card-img" style="background-image:url('${img}')"></span>` : ""}
  <span class="bf-card-no"${ed(`${p}.cards.${i}.no`, edit)}>${escapeHtml(c.no)}</span>
  <h3${ed(`${p}.cards.${i}.title`, edit)}>${escapeHtml(c.title)}</h3>
  <span class="bf-card-en"${ed(`${p}.cards.${i}.en`, edit)}>${escapeHtml(c.en)}</span>
  <p${ed(`${p}.cards.${i}.desc`, edit)}>${escapeHtml(c.desc)}</p>
  <span class="bf-card-meta"${ed(`${p}.cards.${i}.meta`, edit)}>${escapeHtml(c.meta)}</span>
</article>`;
        })
        .join("")}</div>`;

    case "steps":
      return `${headBlock(s, p, edit)}
<div class="bf-steps">${s.steps
        .map(
          (st, i) => `<div class="bf-step" data-gate="${st.gate ? "true" : "false"}">
  <span class="bf-step-index"${ed(`${p}.steps.${i}.index`, edit)}>${escapeHtml(st.index)}</span>
  <h3${ed(`${p}.steps.${i}.name`, edit)}>${escapeHtml(st.name)}</h3>
  <p${ed(`${p}.steps.${i}.desc`, edit)}>${escapeHtml(st.desc)}</p>
</div>`
        )
        .join("")}</div>`;

    case "table":
      return `${headBlock(s, p, edit)}
<div class="bf-table-wrap"><table class="bf-table">
  <thead><tr><th></th>${s.columns
    .map((c, i) => `<th${ed(`${p}.columns.${i}`, edit)}>${escapeHtml(c)}</th>`)
    .join("")}</tr></thead>
  <tbody>${s.rows
    .map(
      (r, ri) => `<tr><th scope="row"${ed(`${p}.rows.${ri}.label`, edit)}>${escapeHtml(r.label)}</th>${r.cells
        .map((cell, ci) => {
          const mark = cell === "O" ? "bf-yes" : cell === "X" ? "bf-no" : "";
          return `<td class="${mark}"${ed(`${p}.rows.${ri}.cells.${ci}`, edit)}>${escapeHtml(cell)}</td>`;
        })
        .join("")}</tr>`
    )
    .join("")}</tbody>
</table></div>`;

    case "list":
      return `${headBlock(s, p, edit)}
<ol class="bf-list">${s.items
        .map(
          (it, i) => `<li>
  <span class="bf-list-no"${ed(`${p}.items.${i}.no`, edit)}>${escapeHtml(it.no)}</span>
  <span class="bf-list-label"${ed(`${p}.items.${i}.label`, edit)}>${escapeHtml(it.label)}</span>
  <span class="bf-list-tags">${it.tags.map((t) => `<i>${escapeHtml(t)}</i>`).join("")}</span>
</li>`
        )
        .join("")}</ol>`;

    case "gallery":
      return `${headBlock(s, p, edit)}
<div class="bf-gallery" data-cols="${Number(s.columns) || 3}">${s.images
        .map((im, i) => {
          const url = safeUrl(im.url);
          return `<figure class="bf-shot">
  <span class="bf-shot-img"${url ? ` style="background-image:url('${url}')"` : ` data-empty="1"`}></span>
  <figcaption${ed(`${p}.images.${i}.caption`, edit)}>${escapeHtml(im.caption)}</figcaption>
</figure>`;
        })
        .join("")}</div>`;

    case "rich":
      return `<div class="bf-rich">
  <p class="bf-eyebrow"${ed(`${p}.eyebrow`, edit)}>${escapeHtml(s.eyebrow)}</p>
  <h2 class="bf-h2"${ed(`${p}.title`, edit)}>${escapeHtml(s.title)}</h2>
  <div class="bf-body"${ed(`${p}.body`, edit)}>${s.body
        .split(/\n{2,}/)
        .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
        .join("")}</div>
</div>`;

    case "cta":
      return `<div class="bf-cta">
  <h2 class="bf-h2"${ed(`${p}.title`, edit)}>${escapeHtml(s.title)}</h2>
  <p${ed(`${p}.desc`, edit)}>${escapeHtml(s.desc)}</p>
  <span class="bf-btn"${ed(`${p}.button`, edit)}>${escapeHtml(s.button)}</span>
  <small${ed(`${p}.note`, edit)}>${escapeHtml(s.note)}</small>
</div>`;

    case "board": {
      const rows = s.posts
        .map(
          (post, i) => `<li class="bf-post" data-post="${escapeHtml(post.id)}">
  <span class="bf-post-badge">${post.notice ? "공지" : String(s.posts.length - i)}</span>
  <span class="bf-post-title"${ed(`${p}.posts.${i}.title`, edit)}>${escapeHtml(post.title)}</span>
  <span class="bf-post-author"${ed(`${p}.posts.${i}.author`, edit)}>${escapeHtml(post.author)}</span>
  <span class="bf-post-date"${ed(`${p}.posts.${i}.date`, edit)}>${escapeHtml(post.date)}</span>
</li>`
        )
        .join("");
      return `${headBlock(s, p, edit)}
<div class="bf-board" data-board="${escapeHtml(s.boardKey)}" data-pagesize="${Number(s.pageSize) || 8}" data-write="${
        s.allowWrite ? "1" : "0"
      }">
  <div class="bf-board-view" data-view="list">
    <div class="bf-board-head"><span>제목</span><span>작성자</span><span>날짜</span></div>
    <ul class="bf-posts">${rows}</ul>
    <div class="bf-board-foot">
      <span class="bf-board-count">전체 ${s.posts.length}건</span>
      ${s.allowWrite ? `<button type="button" class="bf-btn bf-btn--sm" data-act="new">글쓰기</button>` : ""}
    </div>
  </div>
  <div class="bf-board-view" data-view="read" hidden>
    <h3 class="bf-read-title"></h3>
    <p class="bf-read-meta"></p>
    <div class="bf-read-body"></div>
    <div class="bf-board-foot"><button type="button" class="bf-btn bf-btn--sm bf-btn--ghost" data-act="back">목록</button><button type="button" class="bf-btn bf-btn--sm bf-btn--ghost" data-act="del">삭제</button></div>
  </div>
  <form class="bf-board-view bf-board-form" data-view="write" hidden>
    <label>제목<input name="title" required maxlength="120"></label>
    <label>작성자<input name="author" required maxlength="40"></label>
    <label>내용<textarea name="body" rows="6" required maxlength="4000"></textarea></label>
    <div class="bf-board-foot"><button type="submit" class="bf-btn bf-btn--sm">등록</button><button type="button" class="bf-btn bf-btn--sm bf-btn--ghost" data-act="back">취소</button></div>
  </form>
</div>`;
    }

    case "footer":
      return `<div class="bf-footer">
  <div>
    <strong class="bf-foot-brand"${ed(`${p}.brand`, edit)}>${escapeHtml(s.brand)}</strong>
    ${s.lines.map((l, i) => `<p${ed(`${p}.lines.${i}`, edit)}>${escapeHtml(l)}</p>`).join("")}
  </div>
  <nav class="bf-foot-links">${s.links
    .map((l, i) => `<span${ed(`${p}.links.${i}.label`, edit)}>${escapeHtml(l.label)}</span>`)
    .join("")}</nav>
</div>`;
  }
}

/** 구역 하나를 감싸서 그린다 */
export function renderSection(s: Section, index: number, edit: boolean): string {
  if (s.hidden) return "";
  const { style, hasImage } = bgStyle(s.background);
  const p = `sections.${index}`;
  return `<section class="bf-sec bf-sec--${s.kind}" data-id="${escapeHtml(s.id)}" data-pad="${s.padding}" data-scheme="${
    s.scheme
  }"${hasImage ? ` data-hasimg="1"` : ""}${style ? ` style="${style}"` : ""}>
<div class="bf-inner" data-w="${s.width}" data-align="${s.align}">${inner(s, p, edit)}</div>
</section>`;
}

/** 문서 전체 — 캔버스와 내보내기가 공유한다 */
export function renderSite(doc: SiteDoc, edit = false): string {
  return doc.sections.map((s, i) => renderSection(s, i, edit)).join("\n");
}

/** 게시판이 하나라도 있는지 — 내보낼 때 스크립트를 넣을지 정한다 */
export function hasBoard(doc: SiteDoc): boolean {
  return doc.sections.some((s) => s.kind === "board" && !s.hidden);
}

/* ────────────────────────────────────────────────────────────
   스타일 — 캔버스와 내보낸 문서가 같은 것을 쓴다
   ──────────────────────────────────────────────────────────── */

export const BUILDER_CSS = `
.bf-root{font-family:"Noto Sans KR",-apple-system,BlinkMacSystemFont,sans-serif;font-size:var(--bf-fs);line-height:1.75;color:var(--bf-ink);background:var(--bf-paper);word-break:keep-all;-webkit-font-smoothing:antialiased}
.bf-root *{box-sizing:border-box}
.bf-root p{margin:0}

.bf-sec{position:relative;background-color:var(--bf-paper)}
.bf-sec[data-hasimg="1"]::before{content:"";position:absolute;inset:0;background:rgba(18,12,10,var(--bf-ov,.5))}
.bf-sec[data-pad="sm"]{padding:18px 24px}
.bf-sec[data-pad="md"]{padding:clamp(40px,6vw,64px) 24px}
.bf-sec[data-pad="lg"]{padding:clamp(56px,8vw,104px) 24px}
.bf-sec[data-pad="xl"]{padding:clamp(72px,11vw,148px) 24px}
.bf-sec[data-scheme="dark"]{color:#EDE6E2}
.bf-sec[data-scheme="dark"]:not([style*="background"]):not([data-hasimg]){background-color:var(--bf-ink-strong)}

.bf-inner{position:relative;z-index:1;margin:0 auto;width:100%}
.bf-inner[data-w="narrow"]{max-width:760px}
.bf-inner[data-w="normal"]{max-width:1100px}
.bf-inner[data-w="wide"]{max-width:1340px}
.bf-inner[data-w="full"]{max-width:none}
.bf-inner[data-align="center"]{text-align:center}
.bf-inner[data-align="center"] .bf-head{margin-left:auto;margin-right:auto}
.bf-inner[data-align="center"] .bf-actions,.bf-inner[data-align="center"] .bf-stats{justify-content:center}

.bf-eyebrow{font-size:.69em;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--bf-accent-ink);margin:0 0 10px!important}
[data-scheme="dark"] .bf-eyebrow{color:var(--bf-accent);filter:brightness(1.75)}
.bf-h1{font-family:var(--bf-heading);font-size:clamp(34px,5.6vw,68px);font-weight:900;line-height:1.16;letter-spacing:-.02em;margin:0 0 20px}
.bf-h1 em{font-style:normal;color:var(--bf-accent)}
[data-scheme="dark"] .bf-h1 em{filter:brightness(1.5)}
.bf-h2{font-family:var(--bf-heading);font-size:clamp(23px,3.1vw,38px);font-weight:800;line-height:1.32;letter-spacing:-.01em;color:var(--bf-ink-strong);margin:0 0 12px}
[data-scheme="dark"] .bf-h2{color:#fff}
.bf-head{max-width:760px;margin-bottom:clamp(28px,4vw,48px)}
.bf-lead{color:var(--bf-muted);font-size:.97em}
[data-scheme="dark"] .bf-lead{color:#C6BAB4}

.bf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 26px;background:var(--bf-accent);color:#fff;font-weight:700;font-size:.92em;border:0;border-radius:var(--bf-radius);cursor:pointer;text-decoration:none;font-family:inherit}
.bf-btn--sm{padding:9px 18px;font-size:.84em}
.bf-btn--ghost{background:transparent;color:currentColor;border:1px solid currentColor;opacity:.9}
.bf-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}

.bf-nav{display:flex;align-items:center;gap:28px}
.bf-brand{display:flex;align-items:center;gap:11px}
.bf-brand-mark{width:26px;height:26px;background:var(--bf-accent);border-radius:calc(var(--bf-radius) + 2px);flex:none}
/* 높이만 정하고 가로는 auto — 가로세로 어느 모양의 로고든 찌그러지지 않는다 */
.bf-brand-img{display:block;width:auto;max-width:260px;object-fit:contain;flex:none}
.bf-brand-text strong{display:block;font-family:var(--bf-heading);font-size:1.06em;font-weight:800;line-height:1.2}
.bf-brand-text small{display:block;font-size:.62em;letter-spacing:.22em;color:var(--bf-muted);margin-top:1px}
[data-scheme="dark"] .bf-brand-text small{color:#B3A7A1}
.bf-menu{display:flex;gap:24px;margin-left:auto;font-size:.9em;font-weight:600}
.bf-nav .bf-btn{flex:none}

.bf-hero{max-width:860px}
.bf-inner[data-align="center"] .bf-hero{margin:0 auto}
.bf-hero-desc{font-size:1.03em;opacity:.86;max-width:600px}
.bf-inner[data-align="center"] .bf-hero-desc{margin:0 auto}
.bf-stats{display:flex;flex-wrap:wrap;gap:clamp(24px,5vw,56px);margin-top:clamp(32px,5vw,56px);padding-top:26px;border-top:1px solid currentColor;border-color:color-mix(in srgb,currentColor 22%,transparent)}
.bf-stat strong{display:block;font-family:var(--bf-heading);font-size:1.9em;font-weight:800;line-height:1.1;color:var(--bf-accent)}
[data-scheme="dark"] .bf-stat strong{filter:brightness(1.5)}
.bf-stat span{font-size:.76em;letter-spacing:.1em;opacity:.72}

.bf-cards{display:grid;gap:20px}
.bf-cards[data-cols="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
.bf-cards[data-cols="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
.bf-cards[data-cols="4"]{grid-template-columns:repeat(4,minmax(0,1fr))}
.bf-card{border:1px solid var(--bf-line);border-radius:var(--bf-radius);background:#fff;padding:24px 22px 22px;display:flex;flex-direction:column;gap:7px;transition:transform .18s,box-shadow .18s}
.bf-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(20,14,12,.09)}
[data-scheme="dark"] .bf-card{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.16)}
.bf-card-img{display:block;height:132px;margin:-24px -22px 14px;background-size:cover;background-position:center;border-radius:var(--bf-radius) var(--bf-radius) 0 0}
.bf-card-no{font-size:.68em;font-weight:800;letter-spacing:.16em;color:var(--bf-accent-ink)}
[data-scheme="dark"] .bf-card-no{color:var(--bf-accent);filter:brightness(1.7)}
.bf-card h3{font-family:var(--bf-heading);font-size:1.2em;font-weight:800;margin:0;color:var(--bf-ink-strong)}
[data-scheme="dark"] .bf-card h3{color:#fff}
.bf-card-en{font-size:.65em;letter-spacing:.2em;color:var(--bf-muted);text-transform:uppercase}
.bf-card p{font-size:.88em;color:var(--bf-muted);margin-top:4px}
[data-scheme="dark"] .bf-card p,[data-scheme="dark"] .bf-card-en{color:#BFB3AD}
.bf-card-meta{margin-top:auto;padding-top:12px;font-size:.78em;font-weight:700;color:var(--bf-accent-ink)}
[data-scheme="dark"] .bf-card-meta{color:var(--bf-accent);filter:brightness(1.7)}

.bf-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.bf-step{border-top:2px solid var(--bf-line);padding:16px 4px 0}
.bf-step[data-gate="true"]{border-top-color:var(--bf-accent)}
.bf-step-index{font-size:.68em;font-weight:800;letter-spacing:.16em;color:var(--bf-muted)}
.bf-step[data-gate="true"] .bf-step-index{color:var(--bf-accent-ink)}
[data-scheme="dark"] .bf-step[data-gate="true"] .bf-step-index{color:var(--bf-accent);filter:brightness(1.7)}
.bf-step h3{font-family:var(--bf-heading);font-size:1.12em;font-weight:800;margin:6px 0 5px;color:var(--bf-ink-strong)}
[data-scheme="dark"] .bf-step h3{color:#fff}
.bf-step p{font-size:.86em;color:var(--bf-muted)}
[data-scheme="dark"] .bf-step p{color:#BFB3AD}

.bf-table-wrap{overflow-x:auto}
.bf-table{width:100%;border-collapse:collapse;min-width:520px}
.bf-table th,.bf-table td{padding:13px 16px;text-align:center;font-size:.88em;border-bottom:1px solid var(--bf-line)}
.bf-table thead th{background:var(--bf-paper-deep);font-weight:700;color:var(--bf-ink-strong);border-bottom:2px solid var(--bf-ink-strong)}
.bf-table tbody th{text-align:left;font-weight:600;color:var(--bf-ink-strong)}
[data-scheme="dark"] .bf-table thead th,[data-scheme="dark"] .bf-table tbody th{color:#fff;background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.2)}
[data-scheme="dark"] .bf-table td{border-color:rgba(255,255,255,.12)}
.bf-yes{color:var(--bf-accent-ink);font-weight:800}
[data-scheme="dark"] .bf-yes{color:var(--bf-accent);filter:brightness(1.7)}
.bf-no{color:var(--bf-muted);opacity:.55}

.bf-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--bf-line)}
.bf-list li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 6px;border-bottom:1px solid var(--bf-line)}
[data-scheme="dark"] .bf-list,[data-scheme="dark"] .bf-list li{border-color:rgba(255,255,255,.14)}
.bf-list-no{font-size:.76em;font-weight:800;color:var(--bf-accent-ink)}
[data-scheme="dark"] .bf-list-no{color:var(--bf-accent);filter:brightness(1.7)}
.bf-list-label{font-weight:600;font-size:.95em}
.bf-list-tags{display:flex;gap:5px}
.bf-list-tags i{font-style:normal;font-size:.66em;font-weight:700;letter-spacing:.06em;border:1px solid var(--bf-line);padding:3px 7px;color:var(--bf-muted);border-radius:calc(var(--bf-radius) / 2)}

.bf-gallery{display:grid;gap:14px}
.bf-gallery[data-cols="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
.bf-gallery[data-cols="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
.bf-gallery[data-cols="4"]{grid-template-columns:repeat(4,minmax(0,1fr))}
.bf-shot{margin:0}
.bf-shot-img{display:block;aspect-ratio:4/3;background-size:cover;background-position:center;background-color:var(--bf-paper-deep);border-radius:var(--bf-radius)}
.bf-shot-img[data-empty="1"]{background-image:repeating-linear-gradient(45deg,rgba(0,0,0,.05) 0 10px,transparent 10px 20px)}
.bf-shot figcaption{font-size:.8em;color:var(--bf-muted);margin-top:8px}

.bf-rich .bf-body{font-size:.98em;color:var(--bf-ink)}
.bf-rich .bf-body p{margin:0 0 1.05em}
[data-scheme="dark"] .bf-rich .bf-body{color:#D9CFCA}

.bf-cta{text-align:center;max-width:680px;margin:0 auto}
.bf-cta p{opacity:.85;margin-bottom:22px}
.bf-cta small{display:block;margin-top:14px;font-size:.76em;opacity:.6}

.bf-board{border-top:2px solid var(--bf-ink-strong)}
[data-scheme="dark"] .bf-board{border-top-color:rgba(255,255,255,.5)}
.bf-board-head{display:grid;grid-template-columns:64px minmax(0,1fr) 110px 108px;gap:12px;padding:12px 14px;font-size:.76em;font-weight:700;letter-spacing:.06em;color:var(--bf-muted);background:var(--bf-paper-deep);border-bottom:1px solid var(--bf-line)}
.bf-board-head span:first-child{grid-column:2}
[data-scheme="dark"] .bf-board-head{background:rgba(255,255,255,.06);color:#C6BAB4;border-color:rgba(255,255,255,.14)}
.bf-posts{list-style:none;margin:0;padding:0}
.bf-post{display:grid;grid-template-columns:64px minmax(0,1fr) 110px 108px;gap:12px;align-items:center;padding:14px;border-bottom:1px solid var(--bf-line);cursor:pointer}
.bf-post:hover{background:var(--bf-paper-deep)}
[data-scheme="dark"] .bf-post{border-color:rgba(255,255,255,.12)}
[data-scheme="dark"] .bf-post:hover{background:rgba(255,255,255,.05)}
.bf-post-badge{font-size:.72em;font-weight:700;color:var(--bf-muted);text-align:center}
.bf-posts .bf-post:has(.bf-post-badge:not(:empty)) .bf-post-badge{white-space:nowrap}
.bf-post-title{font-weight:600;font-size:.94em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bf-post-author,.bf-post-date{font-size:.79em;color:var(--bf-muted)}
.bf-board-foot{display:flex;align-items:center;gap:10px;padding:16px 4px 0}
.bf-board-count{font-size:.79em;color:var(--bf-muted);margin-right:auto}
.bf-read-title{font-family:var(--bf-heading);font-size:1.35em;font-weight:800;margin:22px 0 6px}
.bf-read-meta{font-size:.79em;color:var(--bf-muted);padding-bottom:16px;border-bottom:1px solid var(--bf-line)}
.bf-read-body{padding:20px 0;font-size:.93em;white-space:pre-wrap}
.bf-board-form{display:grid;gap:14px;padding-top:22px}
/* 화면 전환은 hidden으로 한다 — display를 준 화면이 hidden을 이겨 두 화면이 겹치지 않게 */
.bf-board-view[hidden]{display:none!important}
.bf-board-form label{display:grid;gap:6px;font-size:.8em;font-weight:700;color:var(--bf-muted)}
.bf-board-form input,.bf-board-form textarea{font:inherit;font-size:1rem;font-weight:400;color:var(--bf-ink);padding:11px 13px;border:1px solid var(--bf-line);border-radius:var(--bf-radius);background:#fff;width:100%}
.bf-board-form textarea{resize:vertical}

.bf-footer{display:flex;flex-wrap:wrap;gap:22px;justify-content:space-between;align-items:flex-start}
.bf-foot-brand{display:block;font-family:var(--bf-heading);font-size:1.1em;font-weight:800;margin-bottom:10px}
.bf-footer p{font-size:.82em;opacity:.72;margin:2px 0}
.bf-foot-links{display:flex;flex-wrap:wrap;gap:18px;font-size:.82em;opacity:.85}

@media (max-width:900px){
  .bf-cards[data-cols="3"],.bf-cards[data-cols="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bf-gallery[data-cols="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bf-menu{display:none}
}
@media (max-width:620px){
  .bf-cards[data-cols="2"],.bf-cards[data-cols="3"],.bf-cards[data-cols="4"]{grid-template-columns:1fr}
  .bf-gallery[data-cols="2"],.bf-gallery[data-cols="3"],.bf-gallery[data-cols="4"]{grid-template-columns:1fr}
  .bf-board-head{display:none}
  .bf-post{grid-template-columns:auto minmax(0,1fr);gap:6px 10px}
  .bf-post-title{grid-column:2;white-space:normal}
  .bf-post-author,.bf-post-date{grid-column:2;display:inline}
  .bf-stats{gap:20px}
}
`.trim();
