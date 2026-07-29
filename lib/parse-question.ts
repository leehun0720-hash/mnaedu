import { COURSES, LEVELS, type Format, type Level } from "./questions";

export type ParsedDraft = {
  track: string;
  level: Level;
  format: Format;
  prompt: string;
  choices: string[];
  answer: string;
  intent: string;
};

/** Keywords that point at a programme, beyond its own name. */
const COURSE_HINTS: Record<string, string[]> = {
  friendly: ["우호적", "PMI", "실사", "밸류에이션", "시너지"],
  hostile: ["적대적", "포이즌", "공개매수", "백기사", "위임장", "경영권 방어"],
  control: ["경영권 투자", "바이아웃", "SPA", "Exit", "지분 인수", "PEF"],
  family: ["패밀리", "가문", "승계", "상속", "신탁"],
  club: ["투자클럽", "클럽딜", "조합", "펀드 운용", "LP", "GP"],
};

const CHOICE_LINE =
  /^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩]|\(?\d{1,2}[).]|[가나다라마][).]|[A-Ea-e][).])\s*(.+)$/;

const LABELLED = /^\s*(정답|답|출제\s*의도|의도|해설)\s*[:：]\s*(.+)$/;

/**
 * Turns pasted text into a draft. Deliberately conservative: it fills what it
 * is confident about and leaves the rest for the chairman to correct, because
 * a wrong silent guess is worse than an empty field.
 */
export function parseQuestion(raw: string): ParsedDraft {
  const draft: ParsedDraft = {
    track: "",
    level: "중급",
    format: "주관식",
    prompt: "",
    choices: [],
    answer: "",
    intent: "",
  };
  if (!raw.trim()) return draft;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const promptLines: string[] = [];

  for (const line of lines) {
    const labelled = line.match(LABELLED);
    if (labelled) {
      const [, key, value] = labelled;
      if (key === "정답" || key === "답") draft.answer = value.trim();
      else draft.intent = value.trim();
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

  // Level: explicit labels first, then the 상/중/하 shorthand
  const explicit = LEVELS.find((l) => text.includes(l));
  if (explicit) draft.level = explicit;
  else if (/난이도\s*[:：]?\s*하/.test(text)) draft.level = "초급";
  else if (/난이도\s*[:：]?\s*상/.test(text)) draft.level = "상급";

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
    .replace(/^\s*(난이도|과정|유형)\s*[:：].*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return draft;
}
