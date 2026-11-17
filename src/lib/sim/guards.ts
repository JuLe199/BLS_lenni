/**
 * Anti-hallucination guards – deterministic checks applied to every model turn.
 *
 * Coach notes (the only place where the model makes teaching statements):
 *   - every citation quote must be verbatim in the cited passage (or is re-attributed to the passage
 *     that does contain it); unverifiable citations are removed,
 *   - a note without at least one verified citation is withheld,
 *   - every number in the note must appear in one of its verified quotes.
 * Narration:
 *   - sentences that announce AED results, talk about the guideline or contain clinical numbers that
 *     appear neither in the scenario, the learner's input nor the guideline are removed.
 */
import { findPassageForQuote, getPassage, normaliseForMatch, quoteIsVerbatim, GUIDELINE_CORPUS_NORMALISED } from "@/lib/guideline";
import type { VerifiedCitation } from "@/lib/sim/chat";

export interface CoachCheck {
  ok: boolean;
  citations: VerifiedCitation[];
  problems: string[];
}

const NUMBER_RE = /\d+(?:[.,]\d+)?/g;

export function verifyCoach(text: string, citations: { passageId: string; quote: string }[]): CoachCheck {
  const problems: string[] = [];
  const verified: VerifiedCitation[] = [];
  for (const cit of citations.slice(0, 3)) {
    let pid = cit.passageId;
    if (!quoteIsVerbatim(pid, cit.quote)) {
      const other = findPassageForQuote(cit.quote);
      if (other) {
        pid = other.id;
      } else {
        problems.push(`Quote not found verbatim in passage ${cit.passageId}: "${cit.quote.slice(0, 120)}"`);
        continue;
      }
    }
    const p = getPassage(pid)!;
    if (!verified.some((v) => v.passageId === pid && normaliseForMatch(v.quote) === normaliseForMatch(cit.quote))) {
      verified.push({ passageId: pid, quote: cit.quote.trim(), title: p.title, page: p.page });
    }
  }
  if (!verified.length) problems.push("No verifiable citation.");

  const quoteNumbers = new Set(verified.flatMap((v) => v.quote.match(NUMBER_RE) ?? []).map((n) => n.replace(",", ".")));
  for (const n of text.match(NUMBER_RE) ?? []) {
    if (!quoteNumbers.has(n.replace(",", "."))) problems.push(`Number "${n}" in the coach note is not contained in any cited quote.`);
  }
  if (!text.trim()) problems.push("Empty coach text.");
  return { ok: problems.length === 0, citations: verified, problems };
}

const CLINICAL_NUMBER_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:–|-|to)?\s*\d*(?:[.,]\d+)?\s*(?:cm|mm|%|j|joules?|kg|mg|ml|bpm|\/\s?min|per minute|min⁻¹)(?![A-Za-z])|\b\d+\s?:\s?\d+\b/gi;

function sentenceSplit(s: string): string[] {
  return s.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

export function sanitiseNarration(narration: string, allowedSources: string): { text: string; removed: string[] } {
  const allowed = normaliseForMatch(allowedSources);
  const removed: string[] = [];
  const kept = sentenceSplit(narration).filter((sentence) => {
    if (/\b(?:no\s+)?shock\s+(?:is\s+)?(?:advised|indicated|recommended|not advised)\b/i.test(sentence)) {
      removed.push(sentence);
      return false;
    }
    if (/\b(guideline|ERC|ILCOR|evidence|recommend(?:s|ed|ation)?)\b/i.test(sentence)) {
      removed.push(sentence);
      return false;
    }
    for (const m of sentence.match(CLINICAL_NUMBER_RE) ?? []) {
      const digits = normaliseForMatch(m);
      if (!allowed.includes(digits) && !GUIDELINE_CORPUS_NORMALISED.includes(digits)) {
        removed.push(sentence);
        return false;
      }
    }
    return true;
  });
  return { text: kept.join(" ").trim(), removed };
}
