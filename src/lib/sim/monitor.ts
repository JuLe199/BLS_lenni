/**
 * Training monitor – deterministic physiology derived from the simulation state.
 *
 * Like the AED, the monitor is never driven by the AI. What it shows follows only from
 *  - the authored case data (ECG rhythm per AED analysis, optional ROSC values),
 *  - the AED state machine (pads, analyses, shocks),
 *  - the CPR status and the revealed facts reported for the turn.
 *
 * Shared by client (display) and server (timeline events).
 */
import { SHOCKABLE_ECG, type CaseMonitor, type EcgRhythm } from "@/lib/cases/types";
import type { SimState } from "@/lib/sim/state";

export type Trace = EcgRhythm | "cpr" | "none";
export type Circulation = "none" | "cpr" | "spontaneous";

export interface MonitorView {
  /** What the ECG channel draws. "none" = no ECG source (pads not attached). */
  trace: Trace;
  /** The underlying rhythm (also while CPR artefact hides it). */
  rhythm: EcgRhythm;
  rhythmVisible: boolean;
  circulation: Circulation;
  /** ECG heart rate (electrical activity). null = not countable (VF) / no ECG. */
  hr: number | null;
  spo2: number | null;
  sys: number | null;
  dia: number | null;
  /** Capillary refill time in seconds; null = no refill (no circulation). */
  crt: number | null;
  rosc: boolean;
}

export const RHYTHM_LABEL: Record<EcgRhythm, string> = {
  vf: "Ventricular fibrillation (VF)",
  pvt: "Pulseless ventricular tachycardia (pVT)",
  asystole: "Asystole",
  pea: "Organised rhythm without pulse (PEA)",
  sinus: "Sinus rhythm",
};

/** Electrical rate shown on the monitor for each rhythm in cardiac arrest (authoring constants). */
const ARREST_RATE: Record<EcgRhythm, number | null> = { vf: null, pvt: 180, asystole: 0, pea: 40, sinus: 90 };

export function isShockable(r: EcgRhythm): boolean {
  return SHOCKABLE_ECG.includes(r);
}

/**
 * Index of the rhythm the patient is in right now.
 * Before the first analysis: ecg[0]. While a shock is advised: the rhythm that was analysed.
 * In the CPR interval after a shock / no-shock decision: the rhythm the next analysis will find.
 */
export function rhythmIndex(state: Pick<SimState, "aed">): number {
  const { status, analyses } = state.aed;
  if (status === "shock_advised" || status === "shock_pending_auto") return Math.max(0, analyses - 1);
  return analyses;
}

export function isRosc(state: Pick<SimState, "facts" | "endReason">, mon: CaseMonitor | null): boolean {
  if (!mon?.rosc) return false;
  return state.facts.includes(mon.rosc.afterFact) || state.endReason === "recovery";
}

export function monitorView(state: Pick<SimState, "aed" | "cpr" | "facts" | "endReason">, mon: CaseMonitor): MonitorView {
  const rosc = isRosc(state, mon);
  const rhythm: EcgRhythm = rosc ? "sinus" : mon.ecg[Math.min(rhythmIndex(state), mon.ecg.length - 1)];
  const pads = state.aed.padsAttached;
  const cprRunning = state.cpr === "in_progress" && !rosc;
  const trace: Trace = !pads ? "none" : cprRunning ? "cpr" : rhythm;

  if (rosc && mon.rosc) {
    return {
      trace, rhythm, rhythmVisible: pads, circulation: "spontaneous",
      hr: pads ? mon.rosc.hr : null, spo2: mon.rosc.spo2, sys: mon.rosc.sys, dia: mon.rosc.dia, crt: mon.rosc.crt, rosc: true,
    };
  }
  return {
    trace,
    rhythm,
    rhythmVisible: pads && !cprRunning,
    circulation: cprRunning ? "cpr" : "none",
    hr: pads && !cprRunning ? ARREST_RATE[rhythm] : null,
    spo2: null,
    sys: null,
    dia: null,
    crt: null,
    rosc: false,
  };
}

/* ---------------------------------------------------------------- timeline */

export type TimelineKind = "cpr_start" | "cpr_pause" | "pads" | "analysis" | "shock" | "rosc";
export interface TimelineEvent {
  /** Scenario time (seconds, approximate – end of the turn in which it happened). */
  t: number;
  kind: TimelineKind;
  label: string;
}

/** Derives monitor events by comparing the state before and after a turn (deterministic). */
export function timelineEvents(prev: SimState, next: SimState, mon: CaseMonitor | null): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const t = next.elapsed;
  if (prev.cpr !== "in_progress" && next.cpr === "in_progress")
    ev.push({ t, kind: "cpr_start", label: prev.cpr === "not_started" ? "Chest compressions started" : "Chest compressions resumed" });
  if (prev.cpr === "in_progress" && (next.cpr === "paused" || next.cpr === "stopped"))
    ev.push({ t, kind: "cpr_pause", label: next.cpr === "stopped" ? "CPR stopped" : "CPR paused" });
  if (!prev.aed.padsAttached && next.aed.padsAttached) ev.push({ t, kind: "pads", label: "Pads attached – ECG visible" });
  if (mon) {
    for (let i = prev.aed.analyses; i < next.aed.analyses; i++) {
      const r = mon.ecg[Math.min(i, mon.ecg.length - 1)];
      ev.push({ t, kind: "analysis", label: `Analysis ${i + 1}: ${RHYTHM_LABEL[r]} – ${isShockable(r) ? "shock advised" : "no shock advised"}` });
    }
  } else {
    for (let i = prev.aed.analyses; i < next.aed.analyses; i++) ev.push({ t, kind: "analysis", label: `Analysis ${i + 1}` });
  }
  for (let i = prev.aed.shocks; i < next.aed.shocks; i++) ev.push({ t, kind: "shock", label: `Shock ${i + 1} delivered` });
  if (!isRosc(prev, mon) && isRosc(next, mon)) ev.push({ t, kind: "rosc", label: "Return of spontaneous circulation (ROSC)" });
  return ev;
}

export interface KeyTimes {
  firstCompressions: number | null;
  padsOn: number | null;
  firstShock: number | null;
  rosc: number | null;
  shocks: number;
}

export function keyTimes(events: TimelineEvent[] | undefined): KeyTimes {
  const first = (k: TimelineKind) => events?.find((e) => e.kind === k)?.t ?? null;
  return {
    firstCompressions: first("cpr_start"),
    padsOn: first("pads"),
    firstShock: first("shock"),
    rosc: first("rosc"),
    shocks: events?.filter((e) => e.kind === "shock").length ?? 0,
  };
}
