import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/rich-text.ts", import.meta.url).href;
const { sanitizeHtml, bodyToHtml, htmlToText, looksLikeHtml, plainToHtml, textLength } = await import(url);

// 편집기가 HTML 을 내놓으므로, 들어오는 길목에서 거르는 이 함수가 홈페이지의
// 안전을 쥔다. 뚫리면 관리자 화면에 붙여넣은 것이 방문자의 브라우저에서 돈다.

test("허락한 서식은 그대로 남는다", () => {
  const html = "<p>첫 <strong>굵게</strong> <em>기울임</em> <u>밑줄</u></p><ul><li>하나</li><li>둘</li></ul><h2>소제목</h2><blockquote>인용</blockquote>";
  assert.equal(sanitizeHtml(html), html);
});

test("스크립트와 이벤트 속성은 흔적도 남지 않는다", () => {
  for (const evil of [
    '<p>안녕<script>alert(1)</script></p>',
    '<p onclick="alert(1)">안녕</p>',
    '<img src=x onerror="alert(1)">안녕',
    '<a href="javascript:alert(1)">안녕</a>',
    '<p><style>body{display:none}</style>안녕</p>',
    '<iframe src="https://evil"></iframe>안녕',
    '<svg onload=alert(1)><circle/></svg>안녕',
  ]) {
    const out = sanitizeHtml(evil);
    assert.doesNotMatch(out, /script|onerror|onclick|onload|javascript:|<img|<iframe|<style|<svg|display:none/i, evil);
    assert.match(out, /안녕/);
  }
});

test("워드에서 붙여넣은 것은 서식만 남고 쓰레기는 빠진다", () => {
  const word = '<html><head><style>p.MsoNormal{margin:0}</style></head><body><div class="WordSection1"><p class="MsoNormal" style="margin-bottom:0"><span style="font-family:맑은 고딕"><b>제목</b></span><o:p></o:p></p><p class="MsoNormal">본문 <i>강조</i></p></div></body></html>';
  const out = sanitizeHtml(word);
  assert.equal(out, "<p><strong>제목</strong></p><p>본문 <em>강조</em></p>");
  assert.doesNotMatch(out, /Mso|style|span|o:p|font-family/);
});

test("링크는 http(s) 만, 새 창으로", () => {
  assert.equal(
    sanitizeHtml('<a href="https://frontierexpert.com/x?a=1">회사</a>'),
    '<a href="https://frontierexpert.com/x?a=1" target="_blank" rel="noopener noreferrer">회사</a>'
  );
  assert.equal(sanitizeHtml('<a href="ftp://x">글</a>'), "글");
  assert.equal(sanitizeHtml('<a href="https://x" onclick="e()">글</a>'), '<a href="https://x" target="_blank" rel="noopener noreferrer">글</a>');
});

test("짝이 안 맞아도 페이지가 무너지지 않게 닫아 준다", () => {
  assert.equal(sanitizeHtml("<blockquote><p>열어만 둠"), "<blockquote><p>열어만 둠</p></blockquote>");
  assert.equal(sanitizeHtml("</p>닫기만 함<p>x"), "닫기만 함<p>x</p>");
});

test("태그가 아닌 부등호는 글자로 남는다", () => {
  assert.equal(sanitizeHtml("<p>a < b 이고 c > d</p>"), "<p>a &lt; b 이고 c &gt; d</p>");
});

test("옛 평문 글은 문단으로 감싸 그대로 그려진다", () => {
  const plain = "첫 문단입니다.\n둘째 줄.\n\n둘째 문단입니다.";
  assert.equal(looksLikeHtml(plain), false);
  assert.equal(bodyToHtml(plain), "<p>첫 문단입니다.<br>둘째 줄.</p>\n<p>둘째 문단입니다.</p>");
  // 평문에 든 < 도 글자다
  assert.equal(plainToHtml("a<b"), "<p>a&lt;b</p>");
});

test("글자 수는 태그를 빼고 센다", () => {
  assert.equal(htmlToText("<p>안녕 <strong>세상</strong></p><ul><li>하나</li></ul>"), "안녕 세상\n하나");
  assert.equal(textLength("<p><strong>가나다</strong></p>"), 3);
  assert.equal(textLength("가나다 라"), 4);
});
