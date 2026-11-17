/**
 * Simulation state + deterministic AED state machine.
 * Shared by client and server. The model never decides rhythm results or AED prompts:
 * it only reports what the learner did (aedSteps); this module turns that into device behaviour.
 */
import type { CaseAed, Rhythm, SimCase } from "@/lib/cases/types";

export type Mode = "coached" | "exam";
export type CprStatus = "not_started" | "in_progress" | "paused" | "stopped";
export type AedStep = "arrived" | "powered_on" | "pads_attached" | "shock_button_pressed" | "reanalysis";
export const AED_STEPS: AedStep[] = ["arrived", "powered_on", "pads_attached", "shock_button_pressed", "reanalysis"];
export type EndReason = "handover" | "recovery" | "learner_stopped";

export type AedStatus =
  | "absent" // not at the patient
  | "arrived" // at the patient, off
  | "on" // switched on, waiting for pads
  | "shock_advised" // semi-automatic: waiting for the shock button
  | "shock_pending_auto" // fully automatic: will shock at the start of the next turn
  | "cpr"; // CPR interval after a shock / no-shock decision

export interface AedState {
  status: AedStatus;
  analyses: number;
  shocks: number;
  padsAttached: boolean;
  /** Turns completed in the current CPR interval (used to time the next analysis). */
  cprTurns: number;
  lastPrompt: string | null;
  lastResult: Rhythm | null;
}

export interface TurnLog {
  turn: number;
  input: string;
  completed: string[];
  pitfalls: string[];
}

export interface SimState {
  caseId: string;
  mode: Mode;
  turn: number;
  elapsed: number;
  completed: string[];
  pitfalls: string[];
  facts: string[];
  cpr: CprStatus;
  aed: AedState;
  ended: boolean;
  endReason: EndReason | null;
  log: TurnLog[];
}

export function initialState(c: Pick<SimCase, "id">, mode: Mode): SimState {
  return {
    caseId: c.id,
    mode,
    turn: 0,
    elapsed: 0,
    completed: [],
    pitfalls: [],
    facts: [],
    cpr: "not_started",
    aed: { status: "absent", analyses: 0, shocks: 0, padsAttached: false, cprTurns: 0, lastPrompt: null, lastResult: null },
    ended: false,
    endReason: null,
    log: [],
  };
}

/** Generic, manufacturer-neutral prompts (the guideline only says: follow the AED's prompts). */
export const AED_PROMPTS = {
  attachPads: "Attach pads to the patient’s bare chest.",
  analysing: "Analysing heart rhythm. Do not touch the patient.",
  stopCprAnalysing: "Stop CPR. Analysing heart rhythm. Do not touch the patient.",
  shockAdvisedSemi: "Shock advised. Stand clear. Press the flashing shock button now.",
  shockAdvisedAuto: "Shock advised. Stand clear. The shock will be delivered automatically.",
  shockDelivered: "Shock delivered. Start CPR now.",
  noShock: "No shock advised. Start CPR now.",
} as const;

function nextRhythm(aed: CaseAed, analyses: number): Rhythm {
  return aed.rhythms[Math.min(analyses, aed.rhythms.length - 1)];
}

function analyse(state: AedState, aed: CaseAed, reanalysis: boolean, prompts: string[]): AedState {
  const rhythm = nextRhythm(aed, state.analyses);
  prompts.push(reanalysis ? AED_PROMPTS.stopCprAnalysing : AED_PROMPTS.analysing);
  const s: AedState = { ...state, analyses: state.analyses + 1, lastResult: rhythm, cprTurns: 0 };
  if (rhythm === "shockable") {
    const p = aed.type === "fully-automatic" ? AED_PROMPTS.shockAdvisedAuto : AED_PROMPTS.shockAdvisedSemi;
    prompts.push(p);
    return { ...s, status: aed.type === "fully-automatic" ? "shock_pending_auto" : "shock_advised", lastPrompt: p };
  }
  prompts.push(AED_PROMPTS.noShock);
  return { ...s, status: "cpr", lastPrompt: AED_PROMPTS.noShock };
}

/**
 * Event the device triggers on its own at the START of a turn (before the learner's new action):
 * a fully automatic AED delivers a pending shock.
 */
export function preTurnAedEvents(state: AedState, aed: CaseAed | null): { aed: AedState; prompts: string[]; events: string[] } {
  const prompts: string[] = [];
  const events: string[] = [];
  if (!aed || state.status !== "shock_pending_auto") return { aed: state, prompts, events };
  prompts.push(AED_PROMPTS.shockDelivered);
  events.push("At the start of this turn the fully automatic AED delivers the shock and then prompts: “Shock delivered. Start CPR now.” (The system shows this prompt after your narration – describe the moment of the shock, not the prompt.)");
  return {
    aed: { ...state, status: "cpr", shocks: state.shocks + 1, cprTurns: 0, lastPrompt: AED_PROMPTS.shockDelivered },
    prompts,
    events,
  };
}

/** Turns of ongoing CPR after which the device analyses by itself if the model has not triggered it. */
export const AUTO_ANALYSIS_AFTER_TURNS = 3;

/**
 * Fallback at the END of a turn: if CPR has been running for several turns since the last analysis,
 * the AED interrupts for the next analysis (the model normally triggers this earlier via "reanalysis").
 */
export function postTurnAutoAnalysis(state: AedState, aed: CaseAed | null, cpr: CprStatus): { aed: AedState; prompts: string[] } {
  const prompts: string[] = [];
  if (!aed || state.status !== "cpr" || !state.padsAttached || cpr !== "in_progress" || state.cprTurns < AUTO_ANALYSIS_AFTER_TURNS) {
    return { aed: state, prompts };
  }
  return { aed: analyse(state, aed, true, prompts), prompts };
}

/** Applies the learner's AED actions reported by the model, in order, with prerequisite checks. */
export function applyAedSteps(
  state: AedState,
  steps: AedStep[],
  aed: CaseAed | null
): { aed: AedState; prompts: string[]; ignored: AedStep[] } {
  const prompts: string[] = [];
  const ignored: AedStep[] = [];
  if (!aed) return { aed: state, prompts, ignored: steps };
  let s = state;
  for (const step of steps) {
    switch (step) {
      case "arrived":
        if (s.status === "absent") s = { ...s, status: "arrived" };
        else ignored.push(step);
        break;
      case "powered_on":
        if (s.status === "arrived") {
          prompts.push(AED_PROMPTS.attachPads);
          s = { ...s, status: "on", lastPrompt: AED_PROMPTS.attachPads };
        } else ignored.push(step);
        break;
      case "pads_attached":
        if ((s.status === "arrived" || s.status === "on") && !s.padsAttached) {
          s = analyse({ ...s, padsAttached: true }, aed, false, prompts);
        } else ignored.push(step);
        break;
      case "shock_button_pressed":
        if (s.status === "shock_advised") {
          prompts.push(AED_PROMPTS.shockDelivered);
          s = { ...s, status: "cpr", shocks: s.shocks + 1, cprTurns: 0, lastPrompt: AED_PROMPTS.shockDelivered };
        } else ignored.push(step);
        break;
      case "reanalysis":
        if (s.status === "cpr" && s.padsAttached && s.cprTurns >= 1) s = analyse(s, aed, true, prompts);
        else ignored.push(step);
        break;
    }
  }
  return { aed: s, prompts, ignored };
}

/** Call once at the end of every turn. */
export function endOfTurnAed(before: AedStatus, after: AedState): AedState {
  if (before === "cpr" && after.status === "cpr") return { ...after, cprTurns: after.cprTurns + 1 };
  return after;
}

export function describeAed(aed: AedState, c: CaseAed | null): string {
  if (!c) return "No AED in this scenario.";
  const where = `${c.type} AED – ${c.availability}`;
  switch (aed.status) {
    case "absent":
      return `${where}. Status: NOT at the patient yet.`;
    case "arrived":
      return `${where}. Status: at the patient, switched off, pads not attached.`;
    case "on":
      return `${where}. Status: switched on, waiting for pads (prompt: “${aed.lastPrompt}”).`;
    case "shock_advised":
      return `${where}. Status: SHOCK ADVISED – waiting for the shock button (analyses so far: ${aed.analyses}, shocks: ${aed.shocks}).`;
    case "shock_pending_auto":
      return `${where}. Status: SHOCK ADVISED – the device will deliver the shock automatically (analyses so far: ${aed.analyses}).`;
    case "cpr":
      return `${where}. Status: pads attached, CPR interval after the last analysis (last prompt: “${aed.lastPrompt}”; analyses: ${aed.analyses}, shocks: ${aed.shocks}).`;
  }
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
