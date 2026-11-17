import blsData from "@/data/guideline/bls-2025.json";
import alsData from "@/data/guideline/als-2025.json";

export type PassageKind = "recommendation" | "figure" | "definition" | "evidence";
export type GuidelineId = "bls" | "als";

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

export interface Guideline {
  id: GuidelineId;
  source: GuidelineSource;
  passages: Passage[];
}

export const BLS_GUIDELINE: Guideline = { id: "bls", ...(blsData as Omit<Guideline, "id">) };
export const ALS_GUIDELINE: Guideline = { id: "als", ...(alsData as Omit<Guideline, "id">) };
export const GUIDELINES: Record<GuidelineId, Guideline> = { bls: BLS_GUIDELINE, als: ALS_GUIDELINE };

const BY_ID = new Map<string, Passage>();
const OWNER = new Map<string, Guideline>();
for (const g of [BLS_GUIDELINE, ALS_GUIDELINE]) {
  for (const p of g.passages) {
    if (BY_ID.has(p.id)) throw new Error(`duplicate passage id ${p.id}`);
    BY_ID.set(p.id, p);
    OWNER.set(p.id, g);
  }
}

export const ALL_PASSAGES: Passage[] = [...BLS_GUIDELINE.passages, ...ALS_GUIDELINE.passages];

export function getPassage(id: string): Passage | undefined {
  return BY_ID.get(id);
}

/** The guideline a passage belongs to. */
export function guidelineOf(id: string): Guideline {
  return OWNER.get(id) ?? BLS_GUIDELINE;
}

/** BLS passage ids (kept for the BLS case engine). */
export const PASSAGE_IDS: string[] = BLS_GUIDELINE.passages.map((p) => p.id);

/**
 * Normalisation for quote verification: case-insensitive, ignores whitespace, punctuation,
 * quote/dash styles and the min⁻¹ / kg⁻¹ superscripts – but keeps every letter and digit in order.
 * A quote therefore only passes if the exact wording (and every number) is in the passage.
 */
export function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/min⁻¹/g, "min")
    .replace(/kg⁻¹/g, "kg")
    .replace(/µg/g, "ug")
    .replace(/[^a-z0-9]/g, "");
}

/** Minimum length so that trivial fragments ("CPR", "the AED") cannot serve as evidence. */
const MIN_QUOTE_CHARS = 25;

const NORM_CACHE = new Map<string, string>();
function normText(p: Passage): string {
  let n = NORM_CACHE.get(p.id);
  if (n === undefined) {
    n = normaliseForMatch(p.text);
    NORM_CACHE.set(p.id, n);
  }
  return n;
}

export function quoteIsVerbatim(passageId: string, quote: string): boolean {
  const p = BY_ID.get(passageId);
  if (!p) return false;
  const q = normaliseForMatch(quote);
  if (q.length < MIN_QUOTE_CHARS) return false;
  return normText(p).includes(q);
}

/** Finds the passage that contains a quote verbatim (used to repair a wrong passage id). */
export function findPassageForQuote(quote: string, pool: Passage[] = ALL_PASSAGES): Passage | undefined {
  const q = normaliseForMatch(quote);
  if (q.length < MIN_QUOTE_CHARS) return undefined;
  return pool.find((p) => normText(p).includes(q));
}

export function citationLabel(p: Pick<Passage, "id" | "title" | "page">): string {
  return `${guidelineOf(p.id).id === "als" ? "ERC ALS 2025" : "ERC BLS 2025"} · ${p.title} · p. ${p.page}`;
}

export function passagesForPrompt(passages: Passage[]): string {
  return passages.map((p) => `[[${p.id}]] (${guidelineOf(p.id).source.short} – ${p.section} – ${p.title}, p. ${p.page})\n${p.text}`).join("\n\n");
}

/** Plain-text rendering of the whole BLS knowledge base for the BLS case prompt. */
export function guidelineForPrompt(): string {
  return passagesForPrompt(BLS_GUIDELINE.passages);
}

/**
 * Knowledge base for ALS cases: all ALS recommendations and figures + the BLS recommendations
 * and figures (ALS builds on BLS). The long evidence sections are left out to keep the prompt small.
 */
export const ALS_PROMPT_PASSAGES: Passage[] = [
  ...ALS_GUIDELINE.passages.filter((p) => p.kind !== "evidence"),
  ...BLS_GUIDELINE.passages.filter((p) => p.kind === "recommendation" || p.kind === "figure"),
];

/** All passage texts concatenated + normalised – used by the number guard. */
export const GUIDELINE_CORPUS_NORMALISED = normaliseForMatch(ALL_PASSAGES.map((p) => p.text).join(" "));
