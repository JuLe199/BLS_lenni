import guidelineData from "@/data/guideline/bls-2025.json";

export type PassageKind = "recommendation" | "figure" | "definition" | "evidence";

export interface Passage {
  id: string;
  section: string;
  title: string;
  kind: PassageKind;
  page: number;
  text: string;
}

export interface GuidelineSource {
  title: string;
  short: string;
  journal: string;
  doi: string;
  authors: string;
}

export const BLS_GUIDELINE = guidelineData as { source: GuidelineSource; passages: Passage[] };

const BY_ID = new Map(BLS_GUIDELINE.passages.map((p) => [p.id, p]));

export function getPassage(id: string): Passage | undefined {
  return BY_ID.get(id);
}

export const PASSAGE_IDS: string[] = BLS_GUIDELINE.passages.map((p) => p.id);

/**
 * Normalisation for quote verification: case-insensitive, ignores whitespace, punctuation,
 * quote/dash styles and the min⁻¹ superscript – but keeps every letter and digit in order.
 * A quote therefore only passes if the exact wording (and every number) is in the passage.
 */
export function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/min⁻¹/g, "min")
    .replace(/[^a-z0-9]/g, "");
}

/** Minimum length so that trivial fragments ("CPR", "the AED") cannot serve as evidence. */
const MIN_QUOTE_CHARS = 25;

export function quoteIsVerbatim(passageId: string, quote: string): boolean {
  const p = BY_ID.get(passageId);
  if (!p) return false;
  const q = normaliseForMatch(quote);
  if (q.length < MIN_QUOTE_CHARS) return false;
  return normaliseForMatch(p.text).includes(q);
}

/** Finds the passage that contains a quote verbatim (used to repair a wrong passage id). */
export function findPassageForQuote(quote: string): Passage | undefined {
  const q = normaliseForMatch(quote);
  if (q.length < MIN_QUOTE_CHARS) return undefined;
  return BLS_GUIDELINE.passages.find((p) => normaliseForMatch(p.text).includes(q));
}

export function citationLabel(p: Pick<Passage, "title" | "page">): string {
  return `ERC BLS 2025 · ${p.title} · p. ${p.page}`;
}

/** Plain-text rendering of the whole knowledge base for the model prompt. */
export function guidelineForPrompt(): string {
  return BLS_GUIDELINE.passages
    .map((p) => `[[${p.id}]] (${p.section} – ${p.title}, p. ${p.page})\n${p.text}`)
    .join("\n\n");
}

/** All passage texts concatenated + normalised – used by the number guard. */
export const GUIDELINE_CORPUS_NORMALISED = normaliseForMatch(
  BLS_GUIDELINE.passages.map((p) => p.text).join(" ")
);
