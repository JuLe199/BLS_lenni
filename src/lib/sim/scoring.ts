import type { ChecklistItem, Pitfall, SimCase } from "@/lib/cases/types";
import type { SimState } from "@/lib/sim/state";

export const PASS_SCORE = 70;
const PITFALL_PENALTY = 5;
const MAX_PENALTY = 30;

export interface CaseResult {
  score: number;
  passed: boolean;
  achievedWeight: number;
  totalWeight: number;
  done: ChecklistItem[];
  /** Done, but cancelled by a related pitfall (late / wrong) – counts as not met. */
  compromised: { item: ChecklistItem; by: Pitfall[] }[];
  missed: ChecklistItem[];
  criticalMissed: ChecklistItem[];
  pitfalls: Pitfall[];
  penalty: number;
}

/** Deterministic scoring – the model never assigns a score. */
export function computeResult(c: Pick<SimCase, "checklist" | "pitfalls">, s: Pick<SimState, "completed" | "pitfalls">): CaseResult {
  const blockers = (x: ChecklistItem) => c.pitfalls.filter((p) => (x.blockedBy ?? []).includes(p.id) && s.pitfalls.includes(p.id));
  const done = c.checklist.filter((x) => s.completed.includes(x.id) && blockers(x).length === 0);
  const compromised = c.checklist
    .filter((x) => s.completed.includes(x.id) && blockers(x).length > 0)
    .map((item) => ({ item, by: blockers(item) }));
  const missed = c.checklist.filter((x) => !done.includes(x));
  const totalWeight = c.checklist.reduce((a, x) => a + x.weight, 0);
  const achievedWeight = done.reduce((a, x) => a + x.weight, 0);
  const pitfalls = c.pitfalls.filter((p) => s.pitfalls.includes(p.id));
  const penalty = Math.min(MAX_PENALTY, pitfalls.length * PITFALL_PENALTY);
  const score = Math.max(0, Math.round((achievedWeight / totalWeight) * 100) - penalty);
  const criticalMissed = missed.filter((x) => x.critical);
  return {
    score,
    passed: criticalMissed.length === 0 && score >= PASS_SCORE,
    achievedWeight,
    totalWeight,
    done,
    compromised,
    missed,
    criticalMissed,
    pitfalls,
    penalty,
  };
}
