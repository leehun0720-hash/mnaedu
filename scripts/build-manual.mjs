/**
 * 관리자 화면 「사용 안내」 탭에 싣는 안내서를 만든다.
 *
 * 회장 지시(2026-10-02): 매뉴얼을 관리자 페이지에서 확인할 수 있게.
 *
 * 안내서의 원본은 저장소의 마크다운(ADMIN.md · MANUAL.md · SUPABASE.md)이다.
 * 기능을 고칠 때마다 함께 고쳐 온 문서라, 화면에도 그것을 그대로 세운다 —
 * 따로 쓴 사본은 금세 낡는다.
 *
 * 실행할 때 마크다운을 읽지 않고 미리 HTML 로 바꾸어 app/admin/manual-content.ts
 * 에 담아 둔다. 배포된 서버가 파일을 찾아 읽는 일이 없으므로 어디서든 같게
 * 동작한다. 원본을 고치면 이 스크립트를 다시 돌린다:
 *
 *   npm run manual
 *
 * 잊으면 tests/manual.test.mjs 가 실패해 알려 준다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Marked } from "marked";

const ROOT = new URL("../", import.meta.url);
export const OUTPUT = new URL("app/admin/manual-content.ts", ROOT);

/** 탭 안에서 고르는 순서대로 */
export const SOURCES = [
  { id: "admin", file: "ADMIN.md", title: "관리자 사용법" },
  { id: "site", file: "MANUAL.md", title: "홈페이지 운영 안내" },
  { id: "db", file: "SUPABASE.md", title: "데이터베이스 (Supabase)" },
];

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * 마크다운 한 편을 HTML 과 목차로 바꾼다.
 *
 * 제목마다 문서 이름을 앞에 붙인 번호 자리(admin-3 …)를 단다. 한국어 제목을
 * 주소 조각으로 바꾸면 깨지기 쉽고, 세 문서가 한 화면에 번갈아 서므로 서로
 * 겹치지 않아야 한다. 바깥 주소는 새 창으로 연다 — 관리자 화면을 잃지 않게.
 */
export function renderDoc(id, markdown) {
  const toc = [];
  let n = 0;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const anchor = `${id}-${++n}`;
        if (depth === 2) toc.push({ anchor, html: inner });
        return `<h${depth} id="${anchor}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:\/\//i.test(href);
        const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
        const target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        return `<a href="${escapeAttr(href)}"${titleAttr}${target}>${inner}</a>`;
      },
    },
  });
  const html = marked.parse(markdown);
  return { html, toc };
}

export function buildModuleSource() {
  const docs = SOURCES.map((s) => {
    const markdown = readFileSync(new URL(s.file, ROOT), "utf-8");
    const { html, toc } = renderDoc(s.id, markdown);
    return { id: s.id, title: s.title, file: s.file, toc, html };
  });
  return `// 이 파일은 scripts/build-manual.mjs 가 만든다 — 손으로 고치지 마십시오.
// 원본: ${SOURCES.map((s) => s.file).join(" · ")}  →  다시 만들기: npm run manual

export type ManualDoc = {
  id: string;
  title: string;
  file: string;
  /** 큰 제목(##)만 — 위에서 바로 건너뛰는 목차 */
  toc: { anchor: string; html: string }[];
  html: string;
};

export const MANUAL_DOCS: ManualDoc[] = ${JSON.stringify(docs, null, 2)};
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeFileSync(OUTPUT, buildModuleSource());
  console.log(`안내서를 만들었습니다 → ${OUTPUT.pathname}`);
}
