import "server-only";

import { countArticlesByTrack, getArticlesByTrack } from "@/lib/articles";
import { countDocumentsByTrack, formatSize, getDocumentsByTrack } from "@/lib/documents";
import { mergeLibrary, type LibraryEntry } from "@/lib/library-merge";
import type { Stage } from "@/lib/questions";

/**
 * 한 분야의 자료실 — 내려받는 파일과 읽는 글을 한 목록에 세운다.
 *
 * 회장 지시(2026-09-15): "각 클럽 자료실에 글을 업로드할 수 있게."
 *
 * 표를 새로 만들지 않았다. 파일은 documents 에, 글은 articles 에 이미 분야를
 * 달고 앉아 있으므로, 화면에 세울 때만 둘을 합친다. 그래서 회장은 올리시던
 * 그대로 — 파일은 자료실 탭에서, 글은 칼럼 탭에서 — 올리시면 되고, 분야만
 * 정하시면 그 분야 자료실에 함께 선다.
 */
export type { LibraryEntry };

export async function getLibraryEntries(
  slug: string,
  limit = 10,
  offset = 0,
  stage: Stage | null = null
): Promise<LibraryEntry[]> {
  // 합친 뒤에 자르므로, 양쪽에서 이 쪽까지 필요한 만큼을 가져온다
  const need = offset + limit;
  const [docs, posts] = await Promise.all([
    getDocumentsByTrack(slug, need, 0, stage),
    getArticlesByTrack(slug, need, stage),
  ]);

  return mergeLibrary(
    [
      ...docs.map((d) => ({
        key: `doc-${d.id}`,
        title: d.title,
        summary: d.summary,
        kind: d.kind,
        stage: d.stage,
        trackLabel: d.trackLabel,
        createdAt: d.createdAt,
        href: `/api/documents/${d.id}`,
        file: true,
        size: formatSize(d.fileSize),
      })),
      ...posts.map((a) => ({
        key: `post-${a.id}`,
        title: a.title,
        summary: a.lede || null,
        kind: "글",
        stage: a.stage,
        trackLabel: a.trackLabel,
        createdAt: a.date,
        href: `/insights/${encodeURIComponent(a.slug)}`,
        file: false,
        size: "",
      })),
    ],
    limit,
    offset
  );
}

export async function countLibraryEntries(slug: string, stage: Stage | null = null): Promise<number> {
  const [docs, posts] = await Promise.all([
    countDocumentsByTrack(slug, stage),
    countArticlesByTrack(slug, stage),
  ]);
  return docs + posts;
}
