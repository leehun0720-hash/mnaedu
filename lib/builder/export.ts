/**
 * 홈페이지 빌더 — 내보내기.
 *
 * 만든 사이트를 파일 하나(HTML)로 뽑는다. 그 파일만 있으면 어디에 올려도
 * 그대로 뜬다 — 빌더가 없어도 결과물이 남아야 도구로서 값을 한다.
 *
 * 미리보기도 같은 함수를 쓴다. 미리보기에서 본 것과 내려받은 파일이
 * 한 글자도 다르지 않아야 한다.
 */

import { BUILDER_CSS, escapeHtml, hasBoard, renderSite, themeVars } from "./render";
import type { SiteDoc } from "./types";

/**
 * 게시판 동작 — 내보낸 문서 안에서 홀로 돌아간다.
 *
 * 서버가 없으므로 글은 보는 사람의 브라우저에 남는다. 문서에 심어 둔 글은
 * 씨앗으로 두고, 새로 쓴 글을 앞에 얹는 방식이라 원본이 지워지지 않는다.
 */
const BOARD_SCRIPT = String.raw`
(function () {
  function store(key) {
    try {
      var raw = localStorage.getItem("bf-board-" + key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function save(key, list) {
    try { localStorage.setItem("bf-board-" + key, JSON.stringify(list)); } catch (e) {}
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function today() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-board]"), function (root) {
    var key = root.getAttribute("data-board");
    var canWrite = root.getAttribute("data-write") === "1";
    // 문서에 심어 둔 글 = 씨앗. 방문자가 쓴 글은 저장소에만 쌓이고 위에 얹힌다.
    var seeds = Array.prototype.map.call(root.querySelectorAll(".bf-posts .bf-post"), function (li) {
      return {
        id: li.getAttribute("data-post"),
        title: li.querySelector(".bf-post-title").textContent,
        author: li.querySelector(".bf-post-author").textContent,
        date: li.querySelector(".bf-post-date").textContent,
        body: li.getAttribute("data-body") || "",
        notice: li.querySelector(".bf-post-badge").textContent.trim() === "공지",
        seed: true
      };
    });
    var views = {};
    Array.prototype.forEach.call(root.querySelectorAll("[data-view]"), function (v) {
      views[v.getAttribute("data-view")] = v;
    });
    var listEl = root.querySelector(".bf-posts");
    var countEl = root.querySelector(".bf-board-count");
    var current = null;

    function all() { return store(key).concat(seeds); }
    function show(name) {
      Object.keys(views).forEach(function (n) { views[n].hidden = n !== name; });
    }
    function paint() {
      var posts = all();
      listEl.innerHTML = posts.map(function (p, i) {
        return '<li class="bf-post" data-id="' + esc(p.id) + '">' +
          '<span class="bf-post-badge">' + (p.notice ? "공지" : posts.length - i) + "</span>" +
          '<span class="bf-post-title">' + esc(p.title) + "</span>" +
          '<span class="bf-post-author">' + esc(p.author) + "</span>" +
          '<span class="bf-post-date">' + esc(p.date) + "</span></li>";
      }).join("");
      if (countEl) countEl.textContent = "전체 " + posts.length + "건";
    }

    listEl.addEventListener("click", function (e) {
      var li = e.target.closest(".bf-post");
      if (!li) return;
      var id = li.getAttribute("data-id");
      var post = all().filter(function (p) { return p.id === id; })[0];
      if (!post) return;
      current = post;
      views.read.querySelector(".bf-read-title").textContent = post.title;
      views.read.querySelector(".bf-read-meta").textContent = post.author + " · " + post.date;
      views.read.querySelector(".bf-read-body").textContent = post.body || "(내용이 없습니다)";
      var del = views.read.querySelector('[data-act="del"]');
      if (del) del.hidden = !!post.seed || !canWrite;
      show("read");
    });

    root.addEventListener("click", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-act");
      if (!act) return;
      if (act === "new") { views.write.reset(); show("write"); }
      if (act === "back") { paint(); show("list"); }
      if (act === "del" && current) {
        if (!confirm("이 글을 삭제할까요?")) return;
        save(key, store(key).filter(function (p) { return p.id !== current.id; }));
        paint(); show("list");
      }
    });

    if (views.write) {
      views.write.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = new FormData(views.write);
        var title = String(f.get("title") || "").trim();
        var author = String(f.get("author") || "").trim();
        var body = String(f.get("body") || "").trim();
        if (!title || !author || !body) return;
        var list = store(key);
        list.unshift({
          id: "p" + Date.now().toString(36),
          title: title, author: author, body: body, date: today(), notice: false
        });
        save(key, list);
        paint(); show("list");
      });
    }

    paint();
  });
})();
`.trim();

/** 게시판 글 본문은 목록 마크업에 실어 둔다 — 내보낸 파일만으로 읽기가 되도록 */
function withPostBodies(html: string, doc: SiteDoc): string {
  let out = html;
  for (const section of doc.sections) {
    if (section.kind !== "board") continue;
    for (const post of section.posts) {
      const needle = `data-post="${escapeHtml(post.id)}"`;
      out = out.replace(needle, `${needle} data-body="${escapeHtml(post.body)}"`);
    }
  }
  return out;
}

export type ExportOptions = { includeFontLink?: boolean };

/** 문서 → 혼자 서는 HTML 한 장 */
export function exportHtml(doc: SiteDoc, options: ExportOptions = {}): string {
  const { includeFontLink = true } = options;
  const body = withPostBodies(renderSite(doc, false), doc);
  /**
   * 웹폰트는 글을 막지 않고 뒤따라 온다.
   * 그냥 stylesheet로 걸면 폰트 서버가 느리거나 막힌 곳에서는 그동안 화면이
   * 하얗게 남는다 — 글씨는 먼저 보이고 글꼴이 나중에 갈아 끼는 편이 언제나 낫다.
   */
  const fontHref =
    "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&family=Noto+Serif+KR:wght@700;800;900&display=swap";
  const fonts = includeFontLink
    ? `\n<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fontHref}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${fontHref}"></noscript>`
    : "";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(doc.title)}</title>${fonts}
<style>
*{margin:0;padding:0}
body{margin:0}
${BUILDER_CSS}
</style>
</head>
<body>
<div class="bf-root" style="${themeVars(doc.theme)}">
${body}
</div>
${hasBoard(doc) ? `<script>\n${BOARD_SCRIPT}\n</script>` : ""}
</body>
</html>`;
}

/** 문서를 파일로 주고받기 위한 직렬화 — 되읽을 때 형식을 확인한다 */
export function serializeDoc(doc: SiteDoc): string {
  return JSON.stringify(doc, null, 2);
}

export function parseDoc(raw: string): SiteDoc | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SiteDoc>;
    if (!parsed || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.sections) || !parsed.theme) return null;
    return parsed as SiteDoc;
  } catch {
    return null;
  }
}
