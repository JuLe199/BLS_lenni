export type Audience = "nurse" | "physician" | "ems";
export type Setting = "out-of-hospital" | "in-hospital" | "dispatch";
export type Rhythm = "shockable" | "non-shockable";

export const AUDIENCE_LABEL: Record<Audience, string> = {
  nurse: "Nursing",
  physician: "Physicians",
  ems: "EMS / Paramedics",
};

export const SETTING_LABEL: Record<Setting, string> = {
  "out-of-hospital": "Out-of-hospital",
  "in-hospital": "In-hospital",
  dispatch: "Dispatch centre",
};

/** A scene finding. Authored text is shown verbatim in the "Findings" panel once revealed. */
export interface CaseFact {
  id: string;
  label: string;
  text: string;
  /** For the model: which learner action reveals this fact. */
  revealWhen: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  /** For the model AND the debrief: what exactly counts as done. */
  criteria: string;
  /** Guideline passage ids backing this item. */
  refs: string[];
  weight: 1 | 2 | 3;
  critical?: boolean;
  /** Pitfall ids that cancel this item even if it was eventually done (e.g. a late call). */
  blockedBy?: string[];
}

export interface Pitfall {
  id: string;
  label: string;
  /** For the model: when to flag this. */
  criteria: string;
  refs: string[];
}

/** Authored teaching point – `quote` must be verbatim in passage `ref` (checked by verify:content). */
export interface TeachingPoint {
  ref: string;
  quote: string;
}

export interface CaseAed {
  type: "semi-automatic" | "fully-automatic";
  /** Where the AED is and how it reaches the patient (for the model and the scene panel). */
  availability: string;
  /** Result of the 1st, 2nd, … rhythm analysis. The last entry repeats if more analyses follow. */
  rhythms: Rhythm[];
}

/** ECG rhythm shown on the training monitor. vf/pvt are shockable, the others are not. */
export type EcgRhythm = "vf" | "pvt" | "asystole" | "pea" | "sinus";
export const SHOCKABLE_ECG: EcgRhythm[] = ["vf", "pvt"];

/**
 * Authored physiology for the training monitor (deterministic – never decided by the AI).
 * `ecg[i]` is the rhythm the AED finds at analysis i+1 and must agree with `aed.rhythms[i]`
 * (checked by verify:content). After the last entry the rhythm stays the same.
 */
export interface CaseMonitor {
  ecg: EcgRhythm[];
  /** Return of spontaneous circulation: shown once the authored fact `afterFact` has been revealed. */
  rosc?: { afterFact: string; hr: number; spo2: number; sys: number; dia: number; crt: number };
}

export interface SimCase {
  id: string;
  module: "bls";
  number: number;
  title: string;
  teaser: string;
  setting: Setting;
  audiences: Audience[];
  level: "core" | "advanced";
  minutes: number;
  focus: string[];
  /** Shown before start. */
  role: string;
  resources: string[];
  /** First message of the case – authored, shown verbatim (no AI). */
  opening: string;
  /** Scenario script for the model only: course of events, people, what happens when. */
  script: string;
  /** How and when the case ends (model only). */
  ending: string;
  facts: CaseFact[];
  aed: CaseAed | null;
  /** Training monitor (ECG, SpO2, blood pressure, capillary refill). null = no monitor (e.g. dispatcher case). */
  monitor: CaseMonitor | null;
  checklist: ChecklistItem[];
  pitfalls: Pitfall[];
  teaching: TeachingPoint[];
}
