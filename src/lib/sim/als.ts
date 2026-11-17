/**
 * ALS engine – manual defibrillator, rhythm decisions, drugs, airway (deterministic).
 *
 * Like the AED state machine, the AI only reports WHAT the learner did (alsActions). This module
 * decides what happens: which rhythm the monitor shows at each check, whether a shock was
 * indicated, whether a drug could be given (IV/IO access) and whether its timing followed the
 * ERC ALS 2025 algorithm. Checklist items / pitfalls marked `auto` are set only here.
 */
import type { AlsAutoItem, AlsAutoPitfall, CaseAls, EcgRhythm } from "@/lib/cases/types";
import type { CprStatus } from "@/lib/sim/state";
import type { MonitorView } from "@/lib/sim/monitor";

export const ALS_ACTIONS = [
  "pads_on",
  "rhythm_check",
  "shock",
  "resume_cpr",
  "iv_access",
  "io_access",
  "adrenaline",
  "amiodarone_300",
  "amiodarone_150",
  "lidocaine",
  "fluids",
  "oxygen",
  "bag_mask",
  "supraglottic_airway",
  "intubation",
  "capnography",
  "vector_change",
  "twelve_lead_ecg",
] as const;
export type AlsAction = (typeof ALS_ACTIONS)[number];

export type AlsDrug = "adrenaline" | "amiodarone_300" | "amiodarone_150" | "lidocaine" | "fluids";

export interface AlsDrugGiven {
  drug: AlsDrug;
  /** Scenario time (s). */
  t: number;
  /** Valid shocks delivered before this dose. */
  shocks: number;
  /** Rhythm checks done before this dose. */
  checks: number;
  /** Rhythm at the time (last check). */
  rhythm: EcgRhythm | null;
}

export interface AlsState {
  padsOn: boolean;
  vectorChange: boolean;
  checks: number;
  shocks: number;
  /** Rhythm found at the last check. */
  lastRhythm: EcgRhythm | null;
  /** After a rhythm check, before the shock / resume decision. */
  decisionPending: boolean;
  /** Whether the last check was followed by a shock. */
  shockedAfterLastCheck: boolean;
  /** Per check: was the decision correct? */
  decisions: boolean[];
  access: "none" | "iv" | "io";
  ivAttempts: number;
  drugs: AlsDrugGiven[];
  airway: "none" | "bag_mask" | "supraglottic_airway" | "intubation";
  oxygen: boolean;
  capnography: boolean;
  twelveLead: boolean;
  rosc: boolean;
  /** Turn-level timestamps for the cycle timer. */
  lastCheckAt: number | null;
}

export function initialAls(): AlsState {
  return {
    padsOn: false,
    vectorChange: false,
    checks: 0,
    shocks: 0,
    lastRhythm: null,
    decisionPending: false,
    shockedAfterLastCheck: false,
    decisions: [],
    access: "none",
    ivAttempts: 0,
    drugs: [],
    airway: "none",
    oxygen: false,
    capnography: false,
    twelveLead: false,
    rosc: false,
    lastCheckAt: null,
  };
}

export const isShockableRhythm = (r: EcgRhythm | null) => r === "vf" || r === "pvt";

const given = (s: AlsState, d: AlsDrug) => s.drugs.some((x) => x.drug === d);

function roscRequirementsMet(s: AlsState, cfg: CaseAls): boolean {
  if (!cfg.rosc) return false;
  return cfg.rosc.requires.every((r) => {
    switch (r) {
      case "adrenaline":
        return given(s, "adrenaline");
      case "amiodarone":
        return given(s, "amiodarone_300") || given(s, "lidocaine");
      case "vector_change":
        return s.vectorChange;
      case "fluids":
        return given(s, "fluids");
      case "oxygen":
        return s.oxygen || s.airway !== "none";
    }
  });
}

/** What a rhythm check performed now would find (used for the AI context and the engine). */
export function nextCheckOutcome(s: AlsState, cfg: CaseAls): { rhythm: EcgRhythm; rosc: boolean } {
  const n = s.checks + 1;
  if (cfg.rosc && n >= cfg.rosc.atCheck && roscRequirementsMet(s, cfg)) return { rhythm: "sinus", rosc: true };
  return { rhythm: cfg.rhythms[Math.min(n - 1, cfg.rhythms.length - 1)], rosc: false };
}

export const ALS_NOTES = {
  noPads: "No ECG: the defibrillator pads are not attached yet – the rhythm cannot be assessed.",
  noCheckForShock: "The defibrillator did not shock: a shock needs a rhythm check showing a shockable rhythm first.",
  noAccess: (d: string) => `${d} could not be given – there is no IV or IO access yet.`,
  ivFailed: (n: number) => `IV attempt ${n} failed.`,
  shockNonShockable: "A shock was delivered for a non-shockable rhythm.",
} as const;

export interface AlsTurnResult {
  als: AlsState;
  /** Deterministic notes shown to the learner (system, not AI). */
  notes: string[];
  /** Auto pitfalls committed in this turn. */
  pitfalls: AlsAutoPitfall[];
  /** Timeline labels. */
  events: { kind: "pads" | "analysis" | "shock" | "drug" | "access" | "airway" | "rosc"; label: string }[];
}

const DRUG_LABEL: Record<AlsDrug, string> = {
  adrenaline: "Adrenaline 1 mg IV/IO",
  amiodarone_300: "Amiodarone 300 mg IV/IO",
  amiodarone_150: "Amiodarone 150 mg IV/IO",
  lidocaine: "Lidocaine 100 mg IV/IO",
  fluids: "Fluid bolus (crystalloid)",
};
export { DRUG_LABEL };

export const RHYTHM_SHORT: Record<EcgRhythm, string> = { vf: "VF", pvt: "pVT", asystole: "Asystole", pea: "PEA", sinus: "Organised rhythm with pulse (ROSC)" };

export function applyAlsActions(prev: AlsState, actions: AlsAction[], cfg: CaseAls, t: number, cpr: CprStatus): AlsTurnResult {
  let s: AlsState = { ...prev, drugs: [...prev.drugs], decisions: [...prev.decisions] };
  const notes: string[] = [];
  const pitfalls: AlsAutoPitfall[] = [];
  const events: AlsTurnResult["events"] = [];

  const decide = (shocked: boolean) => {
    if (!s.decisionPending) return;
    const shouldShock = isShockableRhythm(s.lastRhythm) && !s.rosc;
    const ok = shocked === shouldShock;
    s.decisions = [...s.decisions, ok];
    if (!ok) pitfalls.push(shocked ? "shock_nonshockable" : "missed_shock");
    s.decisionPending = false;
    s.shockedAfterLastCheck = shocked;
  };

  for (const a of actions) {
    switch (a) {
      case "pads_on":
        if (!s.padsOn) {
          s.padsOn = true;
          events.push({ kind: "pads", label: "Defibrillator pads on – ECG visible" });
        }
        break;
      case "rhythm_check": {
        if (!s.padsOn) {
          notes.push(ALS_NOTES.noPads);
          break;
        }
        if (s.decisionPending) break; // same check reported twice
        if (s.rosc) break;
        const out = nextCheckOutcome(s, cfg);
        s.checks += 1;
        s.lastRhythm = out.rhythm;
        s.lastCheckAt = t;
        s.decisionPending = true;
        s.shockedAfterLastCheck = false;
        events.push({ kind: "analysis", label: `Rhythm check ${s.checks}: ${RHYTHM_SHORT[out.rhythm]}` });
        if (out.rosc) {
          s.rosc = true;
          s.decisionPending = false;
          s.decisions = [...s.decisions, true];
          events.push({ kind: "rosc", label: "Return of spontaneous circulation (ROSC)" });
        }
        break;
      }
      case "shock":
        if (!s.padsOn || !s.decisionPending) {
          notes.push(ALS_NOTES.noCheckForShock);
          break;
        }
        if (isShockableRhythm(s.lastRhythm)) {
          s.shocks += 1;
          events.push({ kind: "shock", label: `Shock ${s.shocks} delivered` });
        } else {
          notes.push(ALS_NOTES.shockNonShockable);
          events.push({ kind: "shock", label: "Shock delivered for a non-shockable rhythm" });
        }
        decide(true);
        break;
      case "resume_cpr":
        decide(false);
        break;
      case "iv_access":
        if (s.access !== "none") break;
        if (s.ivAttempts < (cfg.ivFails ?? 0)) {
          s.ivAttempts += 1;
          notes.push(ALS_NOTES.ivFailed(s.ivAttempts));
        } else {
          s.ivAttempts += 1;
          s.access = "iv";
          events.push({ kind: "access", label: "IV access established" });
        }
        break;
      case "io_access":
        if (s.access === "none") {
          s.access = "io";
          events.push({ kind: "access", label: "IO access established" });
        }
        break;
      case "adrenaline":
      case "amiodarone_300":
      case "amiodarone_150":
      case "lidocaine":
      case "fluids": {
        if (s.access === "none") {
          notes.push(ALS_NOTES.noAccess(DRUG_LABEL[a]));
          break;
        }
        if (s.rosc && a !== "fluids") break;
        const dose: AlsDrugGiven = { drug: a, t, shocks: s.shocks, checks: s.checks, rhythm: s.lastRhythm ?? cfg.rhythms[0] };
        if (a === "adrenaline") {
          const shockablePath = isShockableRhythm(dose.rhythm);
          if (shockablePath && s.shocks < 3) pitfalls.push("adrenaline_too_early");
          const prevAdr = s.drugs.filter((x) => x.drug === "adrenaline").at(-1);
          if (prevAdr && prevAdr.checks === s.checks) pitfalls.push("adrenaline_same_cycle");
        }
        if (a === "amiodarone_300" || a === "lidocaine") {
          if (!isShockableRhythm(dose.rhythm)) pitfalls.push("amiodarone_nonshockable");
          else if (s.shocks < 3) pitfalls.push("amiodarone_too_early");
        }
        if (a === "amiodarone_150" && s.shocks < 5) pitfalls.push("amiodarone_too_early");
        s.drugs.push(dose);
        events.push({ kind: "drug", label: DRUG_LABEL[a] });
        break;
      }
      case "oxygen":
        s.oxygen = true;
        break;
      case "bag_mask":
        if (s.airway === "none") s.airway = "bag_mask";
        s.oxygen = true;
        break;
      case "supraglottic_airway":
      case "intubation":
        if (s.airway !== a) {
          s.airway = a;
          events.push({ kind: "airway", label: a === "intubation" ? "Tracheal tube placed" : "Supraglottic airway placed" });
        }
        break;
      case "capnography":
        s.capnography = true;
        break;
      case "vector_change":
        if (s.padsOn && !s.vectorChange) {
          s.vectorChange = true;
          events.push({ kind: "pads", label: "Pads changed to antero-posterior (vector change)" });
        }
        break;
      case "twelve_lead_ecg":
        if (s.rosc) s.twelveLead = true;
        break;
    }
  }
  // CPR restarted without an explicit decision → counts as "no shock"
  if (s.decisionPending && cpr === "in_progress" && !actions.includes("rhythm_check")) decide(false);
  return { als: s, notes, pitfalls: Array.from(new Set(pitfalls)), events };
}

/** Auto checklist items that are met by the current state. */
export function autoItemsMet(s: AlsState, cfg: CaseAls): AlsAutoItem[] {
  const out: AlsAutoItem[] = [];
  const adr = s.drugs.filter((d) => d.drug === "adrenaline");
  const firstAdr = adr[0];
  if (s.decisions.length > 0 && s.decisions.every(Boolean)) out.push("rhythm_decisions");
  if (firstAdr && !isShockableRhythm(firstAdr.rhythm) && firstAdr.checks <= 2) out.push("adrenaline_early_nonshockable");
  if (firstAdr && firstAdr.shocks >= 3) out.push("adrenaline_after_third_shock");
  const amio = s.drugs.find((d) => d.drug === "amiodarone_300" || d.drug === "lidocaine");
  if (amio && amio.shocks >= 3 && isShockableRhythm(amio.rhythm)) out.push("amiodarone_after_third_shock");
  const amio2 = s.drugs.find((d) => d.drug === "amiodarone_150");
  if (amio2 && amio2.shocks >= 5) out.push("amiodarone_after_fifth_shock");
  if (s.vectorChange && s.shocks >= 3) out.push("vector_change");
  if (s.access !== "none") out.push("vascular_access");
  if ((cfg.ivFails ?? 0) > 0 && s.access === "io" && s.ivAttempts >= 1) out.push("io_after_failed_iv");
  if (s.capnography) out.push("capnography");
  if (s.drugs.some((d) => d.drug === "fluids")) out.push("fluids_given");
  return out;
}

/** Current rhythm for the monitor. */
export function currentRhythm(s: AlsState, cfg: CaseAls): EcgRhythm {
  if (s.rosc) return "sinus";
  if (s.lastRhythm === null) return cfg.rhythms[0];
  if (s.shockedAfterLastCheck) {
    const nxt = nextCheckOutcome(s, cfg);
    return nxt.rosc ? s.lastRhythm : nxt.rhythm;
  }
  return s.lastRhythm;
}

const ARREST_RATE: Record<EcgRhythm, number | null> = { vf: null, pvt: 180, asystole: 0, pea: 40, sinus: 90 };

export interface AlsMonitorView extends MonitorView {
  etco2: number | null;
}

export function alsMonitorView(s: AlsState, cfg: CaseAls, cpr: CprStatus): AlsMonitorView {
  const rhythm = currentRhythm(s, cfg);
  const cprRunning = cpr === "in_progress" && !s.rosc;
  const trace = !s.padsOn ? "none" : cprRunning ? "cpr" : rhythm;
  if (s.rosc && cfg.rosc) {
    return {
      trace, rhythm, rhythmVisible: s.padsOn, circulation: "spontaneous",
      hr: s.padsOn ? cfg.rosc.hr : null, spo2: cfg.rosc.spo2, sys: cfg.rosc.sys, dia: cfg.rosc.dia, crt: cfg.rosc.crt,
      rosc: true, etco2: s.capnography ? cfg.rosc.etco2 : null,
    };
  }
  return {
    trace,
    rhythm,
    rhythmVisible: s.padsOn && !cprRunning,
    circulation: cprRunning ? "cpr" : "none",
    hr: s.padsOn && !cprRunning ? ARREST_RATE[rhythm] : null,
    spo2: null,
    sys: null,
    dia: null,
    crt: null,
    rosc: false,
    etco2: s.capnography && cprRunning ? cfg.etco2Cpr : null,
  };
}

/** Compact description of the ALS state for the AI context (no rhythm names – the learner must read the monitor). */
export function describeAls(s: AlsState, cfg: CaseAls): string {
  const nxt = nextCheckOutcome(s, cfg);
  const lines = [
    `Defibrillator pads: ${s.padsOn ? (s.vectorChange ? "on (antero-posterior)" : "on (antero-lateral)") : "NOT attached"}.`,
    `Rhythm checks so far: ${s.checks}; valid shocks: ${s.shocks}.`,
    s.decisionPending ? "A rhythm check has just been done – the team waits for the learner's decision (shock or resume CPR)." : "",
    `Vascular access: ${s.access === "none" ? `none (IV attempts so far: ${s.ivAttempts})` : s.access.toUpperCase()}.`,
    `Drugs given: ${s.drugs.length ? s.drugs.map((d) => DRUG_LABEL[d.drug]).join(", ") : "none"}.`,
    `Airway: ${s.airway}; oxygen: ${s.oxygen ? "yes" : "no"}; waveform capnography: ${s.capnography ? "yes" : "no"}.`,
    s.rosc
      ? "STATUS: ROSC has been achieved – the patient has a pulse and signs of life (post-ROSC care phase)."
      : `IF the learner performs a rhythm check in THIS turn: ${nxt.rosc ? "the patient now has a palpable pulse and shows signs of life (ROSC) – describe this, without naming the rhythm." : "there is still no pulse and no sign of life – describe only that the team looks at the monitor; never name or describe the rhythm."}`,
    s.access === "none" && s.ivAttempts < (cfg.ivFails ?? 0) ? `IF the learner attempts IV access in THIS turn: the attempt fails (difficult veins).` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
