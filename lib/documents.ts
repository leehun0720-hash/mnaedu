import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { documents } from "@/db/schema";
import { courseLabel } from "@/lib/questions";

/**
 * 자료실.
 *
 * 회장이 워드 문서를 올리면 그대로 목록에 선다. 승인 절차도 작성자 구분도
 * 없다 — 올리는 사람이 한 명이기 때문이다.
 *
 * 파일 본문은 DB의 documents.content에 base64로 담는다. 목록 조회는 그 열을
 * 절대 선택하지 않으므로, 큰 값은 실제로 내려받을 때만 오간다.
 */

/** 올릴 수 있는 형식 — 워드 문서가 기본이고 PDF·한글까지 받는다 */
export const ALLOWED_EXTENSIONS = [".doc", ".docx", ".pdf", ".hwp", ".hwpx"] as const;

/**
 * 한 건의 상한. base64는 원본보다 약 1/3 커지므로 DB에 들어가는 값은
 * 이보다 크다 — 서버리스 응답 한도와 무료 구간 용량을 함께 고려한 값이다.
 */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const DOCUMENT_KINDS = ["자료", "칼럼"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

const MIME_BY_EXTENSION: Record<string, string> = {
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf": "application/pdf",
  ".hwp": "application/x-hwp",
  ".hwpx": "application/hwp+zip",
};

export type PublicDocument = {
  id: number;
  title: string;
  summary: string | null;
  kind: string;
  trackLabel: string | null;
  fileName: string;
  fileSize: number;
  createdAt: string;
};

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

export function isAllowedFile(fileName: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

export function mimeFor(fileName: string): string {
  return MIME_BY_EXTENSION[extensionOf(fileName)] ?? "application/octet-stream";
}

/** "1.2 MB" — 목록에 곁들일 크기 표기 */
export function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 브라우저가 파일 이름으로 오해할 여지를 없앤다. 업로더가 회장 한 명이라도,
 * 파일 이름은 결국 응답 헤더에 실려 나가므로 경로 구분자와 따옴표는 지운다.
 */
export function safeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "file";
  return base.replace(/["\r\n]/g, "").slice(0, 200) || "file";
}

function toPublic(row: {
  id: number;
  title: string;
  summary: string | null;
  kind: string;
  track: string | null;
  fileName: string;
  fileSize: number;
  createdAt: Date;
}): PublicDocument {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    kind: row.kind,
    trackLabel: row.track ? courseLabel(row.track) : null,
    fileName: row.fileName,
    fileSize: row.fileSize,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

/** 목록에 필요한 열만 — content는 절대 넣지 않는다 */
const LIST_COLUMNS = {
  id: documents.id,
  title: documents.title,
  summary: documents.summary,
  kind: documents.kind,
  track: documents.track,
  fileName: documents.fileName,
  fileSize: documents.fileSize,
  createdAt: documents.createdAt,
} as const;

export async function getPublicDocuments(limit = 30): Promise<PublicDocument[]> {
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      .select(LIST_COLUMNS)
      .from(documents)
      .where(eq(documents.published, true))
      .orderBy(desc(documents.createdAt))
      .limit(limit);
    return rows.map(toPublic);
  } catch (err) {
    // 자료실이 비어 보이는 편이, 자료실 때문에 홈페이지가 멎는 것보다 낫다
    console.error("[documents] list failed:", err);
    return [];
  }
}

export type DownloadableDocument = {
  fileName: string;
  mimeType: string;
  content: string;
};

/** 내려받기 — 발행된 자료만 나간다 */
export async function getDocumentForDownload(id: number): Promise<DownloadableDocument | null> {
  if (!isDbConfigured()) return null;
  try {
    const [row] = await getDb()
      .select({
        fileName: documents.fileName,
        mimeType: documents.mimeType,
        content: documents.content,
      })
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.published, true)))
      .limit(1);
    return row ?? null;
  } catch (err) {
    console.error("[documents] download failed:", err);
    return null;
  }
}
