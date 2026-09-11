/**
 * 값이 같은지 보되, 걸린 시간으로 답이 새지 않게 한다.
 *
 * 앞에서부터 비교하다 다른 글자를 만나 즉시 돌아서면, 응답이 얼마나 빨리
 * 왔는지로 "몇 글자까지 맞았는지"를 알아낼 수 있다. 그래서 길이 차이까지
 * 끝까지 접어 넣고 항상 같은 만큼 돈다.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
