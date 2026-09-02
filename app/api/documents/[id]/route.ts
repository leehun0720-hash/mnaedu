import { getDocumentForDownload, safeFileName } from "@/lib/documents";

export const dynamic = "force-dynamic";

/**
 * 자료 내려받기.
 *
 * 자료실은 누구에게나 열려 있다 — 회원 확인은 정답·해설에만 걸린다.
 * 발행되지 않은 자료는 여기로도 나가지 않으므로, 링크를 안다고 해서
 * 초안이 새지는 않는다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return new Response("자료를 찾을 수 없습니다.", { status: 400 });
  }

  const doc = await getDocumentForDownload(numeric);
  if (!doc) return new Response("자료를 찾을 수 없습니다.", { status: 404 });

  const bytes = Buffer.from(doc.content, "base64");
  const name = safeFileName(doc.fileName);
  // 한글 파일 이름이 헤더에서 깨지지 않도록 RFC 5987 형식을 함께 보낸다
  const encoded = encodeURIComponent(name);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      // 자료는 교체될 수 있으므로 공유 캐시에 남기지 않는다
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
