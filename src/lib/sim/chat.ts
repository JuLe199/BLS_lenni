export interface VerifiedCitation {
  passageId: string;
  quote: string;
  title: string;
  page: number;
}

export interface RevealedFact {
  id: string;
  label: string;
  text: string;
}

export type ChatItem =
  | { kind: "scene"; text: string; prompt?: string; facts?: RevealedFact[] }
  | { kind: "learner"; text: string }
  | { kind: "aed"; lines: string[] }
  | { kind: "coach"; text: string; citations: VerifiedCitation[]; trigger: "pitfall" | "hint" | "question" }
  | { kind: "notice"; text: string; tone: "info" | "warn" | "error" };

/** Compact transcript sent to the model (coach notes are left out on purpose – they are not scene facts). */
export function transcriptForModel(items: ChatItem[], max = 40): string {
  const lines: string[] = [];
  for (const it of items.slice(-max)) {
    if (it.kind === "scene") lines.push(`SIMULATION: ${it.text}${it.prompt ? `\n(Question to learner: ${it.prompt})` : ""}`);
    else if (it.kind === "learner") lines.push(`LEARNER: ${it.text}`);
    else if (it.kind === "aed") lines.push(`AED VOICE PROMPTS: ${it.lines.map((l) => `“${l}”`).join(" ")}`);
  }
  return lines.join("\n");
}
