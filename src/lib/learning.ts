/**
 * Learning progress ("Lernstand") – computed deterministically from stored results.
 */
import type { AedProgress, StoredResult } from "@/lib/progress";

export type CompetencyId = "recognition" | "alerting" | "cpr" | "aed";

export const COMPETENCIES: { id: CompetencyId; label: string; description: string }[] = [
  { id: "recognition", label: "Recognise cardiac arrest", description: "Safety, response, breathing, agonal gasps, signs of recovery" },
  { id: "alerting", label: "Alert & organise help", description: "Emergency call, speaker phone, team alert, dispatcher tasks" },
  { id: "cpr", label: "High-quality CPR", description: "Start without delay, depth/rate/recoil, ventilation, minimal pauses" },
  { id: "aed", label: "AED & defibrillation", description: "Fetch AED, pads during CPR, stand clear, shock, restart CPR" },
];

/** Every checklist item id belongs to exactly one competency (checked by verify:content). */
export const COMPETENCY_OF: Record<string, CompetencyId> = {
  safety: "recognition",
  check_response: "recognition",
  assess_breathing: "recognition",
  recognise_arrest: "recognition",
  breathing_signs_of_life: "recognition",
  recognise_recovery: "recognition",
  two_questions: "recognition",

  call_ems: "alerting",
  speaker_mode: "alerting",
  alert_team: "alerting",
  stay_with_patient: "alerting",
  location: "alerting",
  dispatch_ems: "alerting",
  speaker_phone: "alerting",
  first_responders: "alerting",
  directive_language: "alerting",
  keep_coaching: "alerting",

  start_cpr: "cpr",
  cpr_quality: "cpr",
  ventilation: "cpr",
  cpr_on_bed: "cpr",
  cpr_mode: "cpr",
  ventilation_hcp: "cpr",
  standard_cpr_obesity: "cpr",
  bvm_technique: "cpr",
  minimise_interruptions: "cpr",
  cpr_instructions: "cpr",
  compression_only: "cpr",
  continue_until_handover: "cpr",

  send_for_aed: "aed",
  request_aed: "aed",
  pads_during_cpr: "aed",
  nobody_touches: "aed",
  shock_without_delay: "aed",
  resume_cpr: "aed",
  bare_skin: "aed",
  pad_position: "aed",
  address_modesty: "aed",
  ask_aed: "aed",
  guide_to_aed: "aed",
  aed_instructions: "aed",
  aed_early: "aed",
};

export interface CompetencyScore {
  id: CompetencyId;
  label: string;
  description: string;
  /** 0–100, or null when nothing has been assessed yet. */
  percent: number | null;
  done: number;
  total: number;
}

/** Latest attempt per case that carries item-level data. */
function latestDetailed(results: StoredResult[]): StoredResult[] {
  const byCase = new Map<string, StoredResult>();
  for (const r of results) if (r.done && r.missed) byCase.set(r.caseId, r);
  return [...byCase.values()];
}

export function competencyScores(results: StoredResult[]): CompetencyScore[] {
  const latest = latestDetailed(results);
  return COMPETENCIES.map((c) => {
    let done = 0;
    let total = 0;
    for (const r of latest) {
      done += r.done!.filter((id) => COMPETENCY_OF[id] === c.id).length;
      total += r.done!.filter((id) => COMPETENCY_OF[id] === c.id).length + r.missed!.filter((id) => COMPETENCY_OF[id] === c.id).length;
    }
    return { ...c, done, total, percent: total ? Math.round((done / total) * 100) : null };
  });
}

/** Share of the AED module completed (0–1): 5 lessons, pad exercise, drill, quiz ≥ 80 %. */
export function aedModuleShare(p: AedProgress, lessonCount: number): number {
  const parts = [
    lessonCount ? Math.min(1, p.lessons.length / lessonCount) : 0,
    p.padsDone ? 1 : 0,
    p.drillDone ? 1 : 0,
    p.quizBest === null ? 0 : Math.min(1, p.quizBest / 80),
  ];
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export const LEVELS = [
  { min: 0, label: "Getting started" },
  { min: 25, label: "In training" },
  { min: 50, label: "Advanced" },
  { min: 75, label: "Competent" },
  { min: 95, label: "BLS expert" },
];

export interface LearningLevel {
  percent: number;
  level: string;
  nextLevel: { label: string; at: number } | null;
  casesPassed: number;
  casesTotal: number;
  aedShare: number;
}

/** Overall level: 70 % BLS cases passed, 30 % AED training module. */
export function learningLevel(results: StoredResult[], caseIds: string[], aed: AedProgress, lessonCount: number): LearningLevel {
  const passed = new Set(results.filter((r) => r.passed).map((r) => r.caseId));
  const casesPassed = caseIds.filter((id) => passed.has(id)).length;
  const aedShare = aedModuleShare(aed, lessonCount);
  const percent = Math.round(70 * (caseIds.length ? casesPassed / caseIds.length : 0) + 30 * aedShare);
  const idx = LEVELS.reduce((a, l, i) => (percent >= l.min ? i : a), 0);
  const nxt = LEVELS[idx + 1];
  return {
    percent,
    level: LEVELS[idx].label,
    nextLevel: nxt ? { label: nxt.label, at: nxt.min } : null,
    casesPassed,
    casesTotal: caseIds.length,
    aedShare,
  };
}
