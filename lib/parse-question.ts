import { TRACKS, type Format } from "./questions";

export type ParsedDraft = {
  track: string;
  format: Format;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

/** Keywords that point at a practice area, beyond its own name. */
const TRACK_HINTS: Record<string, string[]> = {
  friendly: ["우호적", "PMI", "실사", "밸류에이션", "시너지", "Locked-Box", "진술보장", "에스크로"],
  hostile: ["적대적", "포이즌", "공개매수", "백기사", "위임장", "경영권 방어", "지분 매집", "5%"],
  control: ["경영권 투자", "바이아웃", "SPA", "Exit", "지분 인수", "PEF", "주주간", "콜옵션"],
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

  // Practice area: exact name wins, otherwise the strongest keyword match
  const byName = TRACKS.find((t) => text.includes(t.label));
  if (byName) {
    draft.track = byName.slug;
  } else {
    let best = "";
    let bestHits = 0;
    for (const [slug, hints] of Object.entries(TRACK_HINTS)) {
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
    .replace(/^\s*(과정|영역|유형)\s*[:：].*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return draft;
}
