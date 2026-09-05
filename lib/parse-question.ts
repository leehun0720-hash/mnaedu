import { COURSES, type Format } from "./questions";

export type ParsedDraft = {
  track: string;
  format: Format;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

/** Keywords that point at one of the five business areas, beyond its own name. */
const COURSE_HINTS: Record<string, string[]> = {
  brokerage: ["우호적", "중개", "소싱", "PMI", "실사", "밸류에이션", "시너지", "SPA"],
  // 경영권 투자는 별도 분야 없이 경영권 분쟁에 통합된다 (보고서 9장-3 기본안)
  dispute: ["적대적", "포이즌", "공개매수", "백기사", "위임장", "경영권 방어", "경영권 투자", "의결권", "주주총회"],
  financing: ["자금조달", "LBO", "인수금융", "메자닌", "브릿지", "대주단", "자본구조", "워터폴", "전환사채"],
  "family-office": ["패밀리", "가문", "승계", "상속", "신탁"],
  "investor-club": ["투자클럽", "투자가 클럽", "클럽딜", "클럽 딜", "신디케이트", "조합", "LP", "GP"],
};

const CHOICE_LINE =
  /^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩]|\(?\d{1,2}[).]|[가나다라마][).]|[A-Ea-e][).])\s*(.+)$/;

const LABELLED = /^\s*(정답|답|해설|설명|풀이)\s*[:：]\s*(.+)$/;

/**
 * Turns pasted text into a draft. Deliberately conservative: it fills what it
 * is confident about and leaves the rest for the chairman to correct, because
 * a wrong silent guess is worse than an empty field.
 */
export function parseQuestion(raw: string): ParsedDraft {
  const draft: ParsedDraft = {
    track: "",
    format: "주관식",
    prompt: "",
    choices: [],
    answer: "",
    explanation: "",
  };
  if (!raw.trim()) return draft;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const promptLines: string[] = [];

  for (const line of lines) {
    const labelled = line.match(LABELLED);
    if (labelled) {
      const [, key, value] = labelled;
      if (key === "정답" || key === "답") draft.answer = value.trim();
      else draft.explanation = value.trim();
      continue;
    }
    const choice = line.match(CHOICE_LINE);
    if (choice) {
      draft.choices.push(choice[1].trim());
      continue;
    }
    promptLines.push(line);
  }

  if (draft.choices.length >= 2) draft.format = "객관식";
  else draft.choices = [];

  const text = raw;

  // Course: exact name wins, otherwise the strongest keyword match
  const byName = COURSES.find((c) => text.includes(c.label));
  if (byName) {
    draft.track = byName.slug;
  } else {
    let best = "";
    let bestHits = 0;
    for (const [slug, hints] of Object.entries(COURSE_HINTS)) {
      const hits = hints.filter((h) => text.includes(h)).length;
      if (hits > bestHits) {
        best = slug;
        bestHits = hits;
      }
    }
    draft.track = best;
  }

  draft.prompt = promptLines
    .join("\n")
    // Strip the metadata we have already pulled out of the body
    .replace(/^\s*(과정|분야|유형)\s*[:：].*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return draft;
}
