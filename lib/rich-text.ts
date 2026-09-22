/**
 * 서식 있는 본문 — 저장할 때 거르고, 그릴 때 그대로 쓴다.
 *
 * 회장 지시(2026-09-15): 관리자에서 글을 쓸 때 구글 메일 같은 편집기를.
 * 편집기는 HTML 을 내놓는다. HTML 을 그대로 저장해 그대로 그리면 누군가
 * <script> 를 끼워 넣는 순간 홈페이지가 남의 것이 된다. 그래서 들어오는 길목
 * (관리자 API)에서 허락한 태그만 남기고 나머지는 지운다. 그리는 쪽은 그 결과를
 * 믿고 그린다 — 거르는 곳이 한 군데여야 빠지는 곳이 없다.
 *
 * 허락하는 것: 문단·줄바꿈·굵게·기울임·밑줄·취소선·목록·소제목·인용·구분선,
 * 그리고 http(s) 로 가는 링크. 속성은 링크의 href 하나뿐이다. 이미지는 받지
 * 않는다 — 어딘가에 올려 두어야 하고, 그 주소가 곧 노출면이다.
 *
 * 순수 함수라 저장소 없이 시험한다. 브라우저에서도 같은 함수로 붙여넣기를
 * 거르므로, 서버와 화면이 같은 규칙을 쓴다.
 */

/** 그대로 두는 태그. 열고 닫는 짝을 맞춘다. */
const BLOCKS = new Set(["p", "ul", "ol", "li", "h2", "h3", "blockquote"]);
const INLINE = new Set(["strong", "em", "u", "s", "a"]);
const VOID = new Set(["br", "hr"]);

/** 다른 이름으로 들어온 것을 우리 이름으로 옮긴다. div 는 문단으로 — 워드가 그렇게 보낸다. */
const RENAME: Record<string, string> = {
  b: "strong",
  i: "em",
  strike: "s",
  del: "s",
  div: "p",
  h1: "h2",
  h4: "h3",
  h5: "h3",
  h6: "h3",
};

/** 내용까지 통째로 버리는 태그 — 워드가 붙이는 <style> 덩어리가 대표다 */
const DROP_WITH_CONTENT = new Set(["style", "script", "head", "title", "meta", "link", "object", "embed", "iframe", "svg", "math", "xml"]);

const TAG_RE = /^<(\/?)([a-zA-Z][a-zA-Z0-9:]*)((?:\s+[^\s<>"'=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s<>"']+))?)*)\s*(\/?)>/;
const HREF_RE = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s<>"']+))/i;

function escapeText(s: string): string {
  // 이미 &amp; 같은 실체는 그대로 둔다 — 편집기가 내놓는 그대로가 실체다
  return s.replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeHref(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!/^https?:\/\//i.test(v)) return null;
  return v.replace(/"/g, "%22");
}

/**
 * 허락한 것만 남긴다. 결과는 짝이 맞는 HTML 이다.
 */
export function sanitizeHtml(input: string): string {
  const src = input ?? "";
  const out: string[] = [];
  const stack: string[] = [];
  let i = 0;

  const closeTo = (name: string) => {
    // 열린 것 중 가장 가까운 같은 이름까지 닫는다 — 짝이 어긋나도 페이지가 무너지지 않게
    const at = stack.lastIndexOf(name);
    if (at === -1) return;
    while (stack.length > at) out.push(`</${stack.pop()}>`);
  };

  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt === -1) {
      out.push(escapeText(src.slice(i)));
      break;
    }
    if (lt > i) out.push(escapeText(src.slice(i, lt)));

    // 주석은 통째로 버린다
    if (src.startsWith("<!--", lt)) {
      const end = src.indexOf("-->", lt + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }

    const m = TAG_RE.exec(src.slice(lt));
    if (!m) {
      // 태그 꼴이 아닌 '<' — 글자로 본다
      out.push("&lt;");
      i = lt + 1;
      continue;
    }
    i = lt + m[0].length;
    const closing = m[1] === "/";
    const raw = m[2].toLowerCase();
    const attrs = m[3] ?? "";

    if (DROP_WITH_CONTENT.has(raw)) {
      if (!closing) {
        const end = src.toLowerCase().indexOf(`</${raw}`, i);
        if (end === -1) break;
        const gt = src.indexOf(">", end);
        i = gt === -1 ? src.length : gt + 1;
      }
      continue;
    }

    const name = RENAME[raw] ?? raw;

    if (VOID.has(name)) {
      if (!closing) out.push(`<${name}>`);
      continue;
    }
    if (!BLOCKS.has(name) && !INLINE.has(name)) continue; // 모르는 태그는 이름만 버리고 안의 글은 살린다

    if (closing) {
      closeTo(name);
      continue;
    }

    if (name === "a") {
      const h = HREF_RE.exec(attrs);
      const href = safeHref(h?.[1] ?? h?.[2] ?? h?.[3]);
      if (!href) continue; // 갈 곳이 안전하지 않은 링크는 글자만 남긴다
      out.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">`);
      stack.push("a");
      continue;
    }

    // 문단 안에 문단·소제목·목록이 들어올 수 없다. 브라우저도 그 자리에서 앞
    // 문단을 닫는다 — 워드가 <div> 안에 <p> 를 넣어 보내는 모양이 그렇다.
    if (BLOCKS.has(name) && name !== "li" && stack.includes("p")) closeTo("p");
    out.push(`<${name}>`);
    stack.push(name);
  }

  while (stack.length) out.push(`</${stack.pop()}>`);

  // 빈 문단은 편집기가 줄 간격 대신 남기는 것이라 지우고, 공백만 다듬는다
  return out
    .join("")
    .replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 편집기가 만든 글인가 — 옛 글(평문)과 새 글(HTML)을 가르는 기준.
 * 편집기는 늘 문단·목록 같은 덩어리 태그를 남기므로 그것으로 가른다. 평문에
 * 우연히 든 <b> 같은 낱개 태그는 글자로 둔다 — 옛 글을 멋대로 굵게 만들지 않는다.
 */
export function looksLikeHtml(s: string): boolean {
  return /<\/?(p|div|br|ul|ol|li|h[1-6]|blockquote)\b[^>]*>/i.test(s ?? "");
}

function escapeAll(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 평문을 문단 HTML 로 — 빈 줄이 문단, 한 줄바꿈은 <br> */
export function plainToHtml(text: string): string {
  return (text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeAll(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/**
 * 저장된 본문을 화면에 그릴 HTML 로.
 * 옛 글은 평문이므로 문단으로 감싸고, 새 글은 저장할 때 이미 걸렀지만 한 번 더 거른다.
 */
export function bodyToHtml(body: string): string {
  return looksLikeHtml(body) ? sanitizeHtml(body) : plainToHtml(body);
}

/**
 * 편집기가 낸 글을 '저장할 모양'으로 만든다.
 *
 * 편집기는 한 줄만 쓰고 엔터를 누르지 않으면 문단 태그 없이 낱개 태그만
 * 남긴다 — 예를 들어 `방어 수단을 <strong>세 가지</strong> 드십시오`.
 * 그 상태로 저장하면 bodyToHtml 이 덩어리 태그를 못 찾아 '옛 평문'으로 보고
 * 통째로 escape 한다. 그러면 화면에 태그가 글자로 드러난다.
 *
 * 실제로 그랬다(2026-09-22, 문제 출제에 편집기를 넣으며 발견). 짧은 칼럼과
 * 짧은 업무자료에도 같은 일이 일어날 자리였다.
 *
 * 그래서 걸러 낸 뒤 덩어리 태그가 없으면 문단으로 감싼다. 이 한 줄이 '편집기가
 * 낸 글'과 '옛 평문'을 가르는 표시가 되어, 낱개 서식만 쓴 글도 살아남는다.
 */
export function editorHtml(input: string): string {
  const clean = sanitizeHtml(input);
  if (!clean) return "";
  return looksLikeHtml(clean) ? clean : `<p>${clean}</p>`;
}

/** 태그를 벗긴 글자만 — 요약·길이 검사·검색 설명에 쓴다 */
export function htmlToText(html: string): string {
  return (html ?? "")
    .replace(/<(br|\/p|\/li|\/h2|\/h3|\/blockquote)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 본문이 실제로 몇 글자인가 — 태그를 빼고 센다 */
export function textLength(bodyOrHtml: string): number {
  return htmlToText(looksLikeHtml(bodyOrHtml) ? bodyOrHtml : plainToHtml(bodyOrHtml)).replace(/\s+/g, "").length;
}
