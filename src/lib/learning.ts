/**
 * Learning progress ("Lernstand") – computed deterministically from stored results.
 */
import type { AedProgress, KnowledgeProgressEntry, StoredResult } from "@/lib/progress";

export type CompetencyId = "recognition" | "alerting" | "cpr" | "aed" | "als_defib" | "als_drugs" | "als_airway" | "als_causes";

export const COMPETENCIES: { id: CompetencyId; module: "bls" | "als"; label: string; description: string }[] = [
  { id: "recognition", module: "bls", label: "Recognise cardiac arrest", description: "Safety, response, breathing, agonal gasps, signs of recovery" },
  { id: "alerting", module: "bls", label: "Alert & organise help", description: "Emergency call, speaker phone, team alert, dispatcher tasks" },
  { id: "cpr", module: "bls", label: "High-quality CPR", description: "Start without delay, depth/rate/recoil, ventilation, minimal pauses" },
  { id: "aed", module: "bls", label: "AED & defibrillation", description: "Fetch AED, pads during CPR, stand clear, shock, restart CPR" },
  { id: "als_defib", module: "als", label: "Rhythm & manual defibrillation", description: "Read the rhythm, shock decisions, safe short pauses, energy, vector change" },
  { id: "als_drugs", module: "als", label: "Drugs & vascular access", description: "IV/IO, adrenaline and amiodarone timing, fluids" },
  { id: "als_airway", module: "als", label: "Airway & capnography", description: "Oxygen, stepwise airway, ventilation, waveform capnography" },
  { id: "als_causes", module: "als", label: "Reversible causes & post-ROSC", description: "4 Hs & 4 Ts, treatment of the cause, immediate post-ROSC care" },
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

  // ALS
  confirm_arrest: "recognition",
  resume_immediately: "cpr",
  rhythm_decisions: "als_defib",
  safe_short_shock: "als_defib",
  shock_energy: "als_defib",
  vector_change: "als_defib",
  vascular_access: "als_drugs",
  io_after_failed_iv: "als_drugs",
  adrenaline_after_third_shock: "als_drugs",
  adrenaline_early: "als_drugs",
  amiodarone_after_third_shock: "als_drugs",
  amiodarone_after_fifth_shock: "als_drugs",
  fluids_for_hypovolaemia: "als_drugs",
  airway_oxygen: "als_airway",
  capnography: "als_airway",
  reversible_causes: "als_causes",
  post_rosc: "als_causes",
  consider_options: "als_causes",
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
  { min: 95, label: "Resuscitation expert" },
];

export interface LearningLevel {
  percent: number;
  level: string;
  nextLevel: { label: string; at: number } | null;
  casesPassed: number;
  casesTotal: number;
  /** Per module: passed / total cases. */
  byModule: { bls: { passed: number; total: number }; als: { passed: number; total: number } };
  aedShare: number;
  /** Knowledge sections (chapters read + quiz), 0–1 each. */
  knowledge: { bls: number; als: number };
  /** Mean of AED module, BLS knowledge and ALS knowledge (0–1). */
  knowledgeShare: number;
}

/** Share of a knowledge section completed (0–1): half chapters read, half quiz (≥ 80 % = full). */
export function knowledgeShareOf(p: KnowledgeProgressEntry, chapterIds: string[]): number {
  const read = chapterIds.length ? chapterIds.filter((id) => p.chapters.includes(id)).length / chapterIds.length : 0;
  const quiz = p.quizBest === null ? 0 : Math.min(1, p.quizBest / 80);
  return 0.5 * read + 0.5 * quiz;
}

export interface LevelInput {
  results: StoredResult[];
  caseIds: { bls: string[]; als: string[] };
  aed: AedProgress;
  aedLessonCount: number;
  knowledge: { bls: KnowledgeProgressEntry; als: KnowledgeProgressEntry };
  chapterIds: { bls: string[]; als: string[] };
}

/** Overall level: 60 % cases passed (BLS + ALS), 40 % knowledge (AED module, BLS and ALS knowledge sections). */
export function learningLevel(x: LevelInput): LearningLevel {
  const passed = new Set(x.results.filter((r) => r.passed).map((r) => r.caseId));
  const count = (ids: string[]) => ({ passed: ids.filter((id) => passed.has(id)).length, total: ids.length });
  const byModule = { bls: count(x.caseIds.bls), als: count(x.caseIds.als) };
  const casesPassed = byModule.bls.passed + byModule.als.passed;
  const casesTotal = byModule.bls.total + byModule.als.total;
  const aedShare = aedModuleShare(x.aed, x.aedLessonCount);
  const knowledge = { bls: knowledgeShareOf(x.knowledge.bls, x.chapterIds.bls), als: knowledgeShareOf(x.knowledge.als, x.chapterIds.als) };
  const knowledgeShare = (aedShare + knowledge.bls + knowledge.als) / 3;
  const percent = Math.round(60 * (casesTotal ? casesPassed / casesTotal : 0) + 40 * knowledgeShare);
  const idx = LEVELS.reduce((a, l, i) => (percent >= l.min ? i : a), 0);
  const nxt = LEVELS[idx + 1];
  return {
    percent,
    level: LEVELS[idx].label,
    nextLevel: nxt ? { label: nxt.label, at: nxt.min } : null,
    casesPassed,
    casesTotal,
    byModule,
    aedShare,
    knowledge,
    knowledgeShare,
  };
}
