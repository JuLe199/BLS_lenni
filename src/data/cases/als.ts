/**
 * ALS case library – ERC Guidelines 2025 Adult Advanced Life Support.
 *
 * Rules for authors (checked by `npm run verify:content`):
 * - Every checklist item / pitfall cites passage ids (ALS: src/data/guideline/als-2025.json,
 *   BLS passages may be cited as well).
 * - Teaching quotes are VERBATIM.
 * - Everything that can be decided by rules is `auto` (drug timing, shock decisions, access,
 *   capnography) – evaluated by src/lib/sim/als.ts, never by the AI.
 * - The rhythm sequence, ROSC conditions and monitor values are authored here; the AI never
 *   names the rhythm – the learner has to read the monitor.
 */
import type { ChecklistItem, Pitfall, SimCase } from "@/lib/cases/types";

const R = {
  ihca: "als-rec-treatment-of-in-hospital-cardiac-arrest",
  ohca: "als-rec-treatment-of-out-of-hospital-cardiac-arrest",
  algorithm: "als-fig2-algorithm",
  ihcaAlgorithm: "als-fig3-inhospital",
  keyMessages: "als-fig1-key-messages",
  aedVsManual: "als-rec-defibrillation-automated-external-defibrillation",
  strategy: "als-rec-defibrillation-defibrillation-strategy",
  safeDefib: "als-rec-defibrillation-safe-and-effective-defibrillation",
  pads: "als-rec-defibrillation-defibrillation-pads-and-paddles",
  energy: "als-rec-defibrillation-energy-levels-and-number-of-shock",
  refractory: "als-rec-defibrillation-refractory-ventricular-fibrillati",
  airway: "als-rec-airway-and-ventilation",
  access: "als-rec-medication-and-fluids-vascular-access",
  vasopressor: "als-rec-medication-and-fluids-vasopressor-drugs",
  antiarrhythmic: "als-rec-medication-and-fluids-antiarrhythmic-drugs",
  fluids: "als-rec-medication-and-fluids-fluids",
  otherDrugs: "als-rec-medication-and-fluids-other-medication",
  capno: "als-rec-waveform-capnography-during-advanced-life-suppor",
  pocus: "als-rec-use-of-ultrasound-imaging-during-advanced-life-s",
  mechanical: "als-rec-devices-mechanical-chest-compression-devices",
} as const;

/* ------------------------------------------------------------------ shared items */
const item = {
  confirmArrest: (): ChecklistItem => ({
    id: "confirm_arrest",
    label: "Confirms cardiac arrest quickly and keeps compressions going",
    criteria: "Learner checks for signs of life / breathing (and, if experienced, a carotid pulse) within about 10 s, declares cardiac arrest and makes sure high-quality compressions start or continue.",
    refs: [R.ihcaAlgorithm, R.ihca],
    weight: 2,
  }),
  padsDuringCpr: (): ChecklistItem => ({
    id: "pads_during_cpr",
    label: "Defibrillator pads applied while CPR continues",
    criteria: "Learner has the pads applied (antero-lateral) without stopping compressions for it.",
    refs: [R.strategy, R.pads],
    weight: 2,
  }),
  rhythmDecisions: (): ChecklistItem => ({
    id: "rhythm_decisions",
    label: "Correct shock / no-shock decision at every rhythm check",
    criteria: "Determined by the system: shockable rhythm → shock; non-shockable rhythm → no shock, immediately resume CPR.",
    refs: [R.algorithm, R.aedVsManual],
    weight: 3,
    critical: true,
    auto: "rhythm_decisions",
  }),
  safeShock: (): ChecklistItem => ({
    id: "safe_short_shock",
    label: "Charges during compressions, safety check, minimal pause",
    criteria: "Learner has the defibrillator charged while compressions continue, orders everyone clear and oxygen away (≥1 m) only for the shock itself, so that the hands-off pause is very short.",
    refs: [R.strategy, R.safeDefib],
    weight: 2,
  }),
  energy: (): ChecklistItem => ({
    id: "shock_energy",
    label: "Appropriate shock energy",
    criteria: "Learner selects at least 150 J for the first biphasic shock (or the highest setting if unsure of the device) and may escalate for subsequent shocks.",
    refs: [R.energy],
    weight: 1,
  }),
  resumeImmediately: (): ChecklistItem => ({
    id: "resume_immediately",
    label: "Resumes compressions immediately for 2 minutes",
    criteria: "After each shock (or no-shock decision) learner immediately restarts chest compressions for a 2-minute cycle – no pulse check directly after the shock.",
    refs: [R.strategy, R.algorithm],
    weight: 2,
  }),
  access: (): ChecklistItem => ({
    id: "vascular_access",
    label: "Vascular access established (IV first, IO if IV fails)",
    criteria: "Determined by the system.",
    refs: [R.access],
    weight: 1,
    auto: "vascular_access",
  }),
  airway: (): ChecklistItem => ({
    id: "airway_oxygen",
    label: "Oxygen and stepwise airway management",
    criteria: "Learner gives high-flow oxygen with effective bag-mask ventilation and only escalates to a supraglottic airway or tracheal tube in a stepwise way (tube only by a skilled intubator with capnography); after an advanced airway: 10 breaths per minute with continuous compressions.",
    refs: [R.airway],
    weight: 2,
  }),
  capno: (): ChecklistItem => ({
    id: "capnography",
    label: "Uses waveform capnography",
    criteria: "Determined by the system.",
    refs: [R.capno],
    weight: 1,
    auto: "capnography",
  }),
  reversible: (detail: string): ChecklistItem => ({
    id: "reversible_causes",
    label: "Actively looks for reversible causes",
    criteria: `Learner systematically considers reversible causes (hypoxia, hypovolaemia, hyper-/hypokalaemia/metabolic, hypo-/hyperthermia, toxins, tamponade, tension pneumothorax, thrombosis) and asks for the relevant information. ${detail}`,
    refs: [R.algorithm, R.ihca],
    weight: 2,
  }),
  postRosc: (): ChecklistItem => ({
    id: "post_rosc",
    label: "Immediate post-ROSC steps",
    criteria: "After ROSC learner uses the ABCDE approach and names at least two of: SpO2 target 94–98 %, normal PaCO2, systolic BP > 100 mmHg, 12-lead ECG, identify and treat the cause, temperature control.",
    refs: [R.algorithm],
    weight: 2,
  }),
};

const pit = {
  shockNonShockable: (): Pitfall => ({ id: "shock_nonshockable", label: "Shock for a non-shockable rhythm", criteria: "System.", refs: [R.algorithm], auto: "shock_nonshockable" }),
  missedShock: (): Pitfall => ({ id: "missed_shock", label: "Shockable rhythm not shocked", criteria: "System.", refs: [R.strategy, R.algorithm], auto: "missed_shock" }),
  adrenalineTooEarly: (): Pitfall => ({ id: "adrenaline_too_early", label: "Adrenaline before the third shock (shockable rhythm)", criteria: "System.", refs: [R.vasopressor], auto: "adrenaline_too_early" }),
  amiodaroneTooEarly: (): Pitfall => ({ id: "amiodarone_too_early", label: "Amiodarone given too early", criteria: "System.", refs: [R.antiarrhythmic], auto: "amiodarone_too_early" }),
  amiodaroneNonShockable: (): Pitfall => ({ id: "amiodarone_nonshockable", label: "Antiarrhythmic for a non-shockable rhythm", criteria: "System.", refs: [R.antiarrhythmic], auto: "amiodarone_nonshockable" }),
  adrenalineSameCycle: (): Pitfall => ({ id: "adrenaline_same_cycle", label: "Adrenaline repeated within the same cycle", criteria: "System.", refs: [R.vasopressor], auto: "adrenaline_same_cycle" }),
  longPause: (): Pitfall => ({
    id: "long_pause",
    label: "Long interruption of chest compressions",
    criteria: "Learner stops compressions for longer than necessary – e.g. charging only after stopping, pulse check directly after the shock, a long rhythm/pulse check, or stopping CPR for intubation or IV access.",
    refs: [R.strategy, R.airway],
  }),
  unsafeShock: (): Pitfall => ({
    id: "unsafe_shock",
    label: "Unsafe shock",
    criteria: "Learner orders the shock while someone still compresses/touches the patient, or leaves the oxygen mask/bag on the chest during the shock.",
    refs: [R.safeDefib],
  }),
  routineCalcium: (): Pitfall => ({
    id: "routine_calcium_bicarbonate",
    label: "Routine calcium / sodium bicarbonate / corticosteroids",
    criteria: "Learner orders calcium, sodium bicarbonate or corticosteroids without a specific indication from the script.",
    refs: [R.otherDrugs],
  }),
  stopForEtco2: (): Pitfall => ({
    id: "stopped_for_etco2",
    label: "Stops compressions on an ETCO2 rise alone",
    criteria: "Learner interrupts compressions only because the capnography value rises, without other signs of ROSC.",
    refs: [R.capno],
  }),
};

const BLOCKED_BY: Record<string, string[]> = {
  rhythm_decisions: ["shock_nonshockable", "missed_shock"],
  safe_short_shock: ["unsafe_shock", "long_pause"],
  resume_immediately: ["long_pause"],
  adrenaline_after_third_shock: ["adrenaline_too_early", "adrenaline_same_cycle"],
  adrenaline_early: ["adrenaline_same_cycle"],
  amiodarone_after_third_shock: ["amiodarone_too_early"],
};

const COMMON_ALS_SCRIPT = `General rules for this ALS case:
- The team (two nurses / paramedics as described) does exactly what the learner orders: compressions, swapping compressors, charging, drugs, airway. They do not decide anything themselves.
- The defibrillator is a manual defibrillator with monitor; the SYSTEM decides what the monitor shows. Never name or describe the rhythm.
- At a rhythm check the team pauses compressions and everybody looks at the monitor; a team member asks the learner: "What do you see – what do you want to do?"
- Drug orders are carried out as ordered (the SYSTEM decides whether IV/IO access allows it). Do not comment on the dose or timing.
- If the learner asks for a lab value or examination that the script does not contain, answer that it is not available right now.`;

export const ALS_CASES: SimCase[] = [
  /* 1 ------------------------------------------------------------------ */
  {
    id: "als-cardiology-vf",
    module: "als",
    number: 1,
    title: "Cardiology ward: the shockable pathway",
    teaser: "You lead the resuscitation team. The monitor alarm sounds – a patient with chest pain collapses. Manual defibrillation, drug timing after the third shock.",
    setting: "in-hospital",
    audiences: ["physician", "nurse"],
    level: "core",
    minutes: 15,
    focus: ["Manual defibrillation", "Shockable rhythm", "Adrenaline & amiodarone after 3 shocks", "Minimal pauses"],
    role: "You are the leader of the hospital resuscitation team (ALS provider). You arrive with the resuscitation trolley: manual defibrillator with pads, airway equipment, drugs. Two ward nurses are there.",
    resources: ["Manual defibrillator / monitor with pads", "Bag-mask, oxygen, supraglottic airways (i-gel), intubation equipment, waveform capnography", "IV cannulas, IO device, adrenaline, amiodarone, crystalloids", "Two ward nurses (BLS-trained)"],
    opening:
      "Cardiology ward, 3:10 am. Mr Brandt, 66, admitted yesterday with chest pain, has just collapsed in bed. Nurse Anna has pulled the emergency alarm and started chest compressions; the bed has been flattened and the backrest released. Nurse Felix stands ready with the bag-mask.\n\nYou arrive with the resuscitation trolley.\n\nWhat do you do?",
    script: `Setting: cardiology ward, single room, patient in bed with CPR mode activated (firm). Patient: Mr Brandt, 66 y, admitted with acute coronary syndrome (NSTEMI), peripheral cannula has been removed in the night (no IV access in place).
People: Nurse Anna (doing compressions), Nurse Felix (airway / drugs / documentation). Both act only on instruction; they can swap compressor, charge the defibrillator, prepare drugs, place an IV cannula (succeeds at the first attempt).
Course of events:
- Unresponsive, no breathing, no carotid pulse (if checked).
- The SYSTEM decides the rhythm at every check; ROSC can only occur at a rhythm check when the system says so (turn context).
- If the learner asks about the cause: the nurse reports the admission diagnosis (chest pain, ACS) and that a blood test yesterday showed normal potassium; nothing else is known.
- After ROSC: the patient opens his eyes briefly, moves his arms, breathes spontaneously but insufficiently; the cardiologist on call is on the way.
${COMMON_ALS_SCRIPT}`,
    ending: "End (endReason=recovery) when ROSC has been achieved AND the learner has started immediate post-ROSC care (or asks to hand over to the cardiologist). If 8 rhythm checks have passed without ROSC, end with handover to the cardiologist on call (endReason=handover). If the learner wants to stop, endReason=learner_stopped.",
    facts: [
      { id: "no_signs", label: "Assessment", text: "Unresponsive, no breathing, no palpable carotid pulse.", revealWhen: "Learner checks responsiveness, breathing and/or pulse." },
      { id: "history", label: "History", text: "Admitted yesterday with acute coronary syndrome (NSTEMI); potassium normal yesterday; no IV cannula in place.", revealWhen: "Learner asks about the patient, history or possible causes." },
      { id: "after_rosc", label: "After ROSC", text: "Eyes open briefly, arms move, spontaneous but shallow breathing; skin still pale.", revealWhen: "SYSTEM: after ROSC has been achieved." },
    ],
    aed: null,
    monitor: null,
    als: {
      rhythms: ["vf", "vf", "vf", "vf", "vf", "vf", "vf", "vf"],
      rosc: { atCheck: 4, requires: ["adrenaline", "amiodarone"], hr: 96, spo2: 95, sys: 104, dia: 62, crt: 3, etco2: 38 },
      etco2Cpr: 22,
      ivFails: 0,
      equipment: "Manual defibrillator with pads on the trolley (biphasic, 150–200 J), monitor, bag-mask with oxygen, i-gel, laryngoscope and tubes, waveform capnography, IV/IO, adrenaline 1 mg, amiodarone 300 mg/150 mg, crystalloids.",
    },
    checklist: [
      item.confirmArrest(),
      item.padsDuringCpr(),
      item.rhythmDecisions(),
      item.safeShock(),
      item.energy(),
      item.resumeImmediately(),
      item.access(),
      {
        id: "adrenaline_after_third_shock",
        label: "Adrenaline 1 mg after the third shock",
        criteria: "Determined by the system: first adrenaline given after the third shock (not before).",
        refs: [R.vasopressor],
        weight: 3,
        critical: true,
        auto: "adrenaline_after_third_shock",
      },
      {
        id: "amiodarone_after_third_shock",
        label: "Amiodarone 300 mg after the third shock",
        criteria: "Determined by the system: amiodarone 300 mg given after three shocks for persistent VF/pVT.",
        refs: [R.antiarrhythmic],
        weight: 3,
        critical: true,
        auto: "amiodarone_after_third_shock",
      },
      item.airway(),
      item.capno(),
      item.reversible("Here: ACS → thrombosis (coronary) is the most likely cause."),
      item.postRosc(),
    ],
    pitfalls: [
      pit.shockNonShockable(),
      pit.missedShock(),
      pit.adrenalineTooEarly(),
      pit.amiodaroneTooEarly(),
      pit.adrenalineSameCycle(),
      pit.longPause(),
      pit.unsafeShock(),
      pit.routineCalcium(),
      pit.stopForEtco2(),
    ],
    teaching: [
      { ref: R.strategy, quote: "This is achieved by continuing chest compressions during defibrillator charging, delivering defibrillation aiming for an interruption in chest compressions of less than 5 s and then immediately resuming chest compressions." },
      { ref: R.vasopressor, quote: "Give adrenaline 1 mg after the third shock for adult patients in cardiac arrest with a shockable rhythm." },
      { ref: R.antiarrhythmic, quote: "Give amiodarone 300 mg IV for adult patients in cardiac arrest who are in VF/pVT after three shocks have been administered." },
      { ref: R.safeDefib, quote: "Minimise the risk of fire by taking off any oxygen mask, nasal cannulae or bag mask and by placing them at least 1 m away from the patient’s chest." },
      { ref: R.energy, quote: "Use single shocks followed by a 2-minute cycle of chest compressions." },
      { ref: R.capno, quote: "An increase in ETCO2 during CPR may indicate that ROSC has occurred. However, chest compression should not be interrupted based on this sign alone." },
    ],
  },

  /* 2 ------------------------------------------------------------------ */
  {
    id: "als-ed-pea-bleeding",
    module: "als",
    number: 2,
    title: "Emergency department: no shock – find the cause",
    teaser: "A patient with a gastrointestinal bleed deteriorates in the resus room. Non-shockable rhythm: early adrenaline – and the reversible cause decides.",
    setting: "in-hospital",
    audiences: ["physician", "nurse"],
    level: "core",
    minutes: 15,
    focus: ["Non-shockable rhythm", "Early adrenaline", "Reversible causes (4 Hs & 4 Ts)", "Fluids only for hypovolaemia"],
    role: "You are the emergency physician leading the resuscitation in the emergency department. Two experienced ED nurses are with you.",
    resources: ["Manual defibrillator / monitor (pads in the drawer)", "Bag-mask, oxygen, i-gel, intubation equipment, waveform capnography", "IV cannulas, IO device, adrenaline, amiodarone, warmed crystalloids, blood products on request", "Two ED nurses"],
    opening:
      "Emergency department, resus bay 2, 11:40 pm. Mrs Novak, 72, brought in an hour ago after vomiting blood and passing black stools, suddenly stops answering. Her eyes roll back, she is not breathing normally. Her only cannula has just come out while she was vomiting. Nurse Jonas looks at you.\n\nWhat do you do?",
    script: `Setting: emergency department resus bay, trolley (firm), monitoring cables are attached but the defibrillator pads are not. Patient: Mrs Novak, 72 y, upper gastrointestinal bleeding (haematemesis and melaena), on an anticoagulant, history of hypertension.
People: Nurse Jonas and Nurse Mira (both skilled; can do compressions, place an IV cannula – succeeds at the first attempt –, give drugs, prepare fluids and blood products).
Course of events:
- She is unresponsive, not breathing normally, no carotid pulse (if checked) – cardiac arrest.
- The SYSTEM decides the rhythm; ROSC only at a rhythm check when the system says so.
- Reversible causes – information on request: obvious massive blood loss (bloody vomit on the floor, melaena), pale, cold peripheries; airway clear after suction; no signs of tension pneumothorax; temperature normal; no toxins known; potassium unknown (blood gas result after ROSC only).
- After ROSC: she groans, moves, pulse weak; the gastroenterologist and transfusion service can be called.
${COMMON_ALS_SCRIPT}`,
    ending: "End (endReason=recovery) when ROSC has been achieved AND the learner has started immediate post-ROSC care including treatment of the cause (blood/fluids, gastroenterology). If 8 rhythm checks have passed without ROSC, end with handover (endReason=handover). If the learner wants to stop, endReason=learner_stopped.",
    facts: [
      { id: "no_signs", label: "Assessment", text: "Unresponsive, not breathing normally, no palpable carotid pulse.", revealWhen: "Learner checks responsiveness, breathing and/or pulse." },
      { id: "bleeding", label: "Blood loss", text: "Large amount of vomited blood on the floor and the trolley; melaena; pale, cold extremities.", revealWhen: "Learner looks for causes, asks about blood loss/hypovolaemia or examines the patient." },
      { id: "other_causes", label: "Other causes", text: "Airway clear after suction, chest rises equally, temperature normal, no known toxins, no trauma.", revealWhen: "Learner asks about hypoxia, tension pneumothorax, temperature, toxins or other reversible causes." },
      { id: "after_rosc", label: "After ROSC", text: "She groans and moves her arms; weak central pulse; still pale.", revealWhen: "SYSTEM: after ROSC has been achieved." },
    ],
    aed: null,
    monitor: null,
    als: {
      rhythms: ["pea", "pea", "pea", "pea", "asystole", "asystole", "asystole", "asystole"],
      rosc: { atCheck: 3, requires: ["adrenaline", "fluids"], hr: 118, spo2: 96, sys: 92, dia: 54, crt: 4, etco2: 32 },
      etco2Cpr: 18,
      ivFails: 0,
      equipment: "Manual defibrillator (pads in the drawer), monitor, bag-mask with oxygen and suction, i-gel, tubes, capnography, IV/IO, adrenaline 1 mg, amiodarone, warmed crystalloids, blood products (on request).",
    },
    checklist: [
      item.confirmArrest(),
      item.padsDuringCpr(),
      item.rhythmDecisions(),
      item.resumeImmediately(),
      item.access(),
      {
        id: "adrenaline_early",
        label: "Adrenaline 1 mg as soon as possible (non-shockable)",
        criteria: "Determined by the system: first adrenaline given in the first or second CPR cycle.",
        refs: [R.vasopressor, R.keyMessages],
        weight: 3,
        critical: true,
        auto: "adrenaline_early_nonshockable",
      },
      item.reversible("Here: massive gastrointestinal bleeding → hypovolaemia."),
      {
        id: "fluids_for_hypovolaemia",
        label: "Fluids for hypovolaemia",
        criteria: "Determined by the system: fluid bolus (crystalloid) given during CPR for the haemorrhage.",
        refs: [R.fluids],
        weight: 2,
        critical: true,
        auto: "fluids_given",
      },
      item.airway(),
      item.capno(),
      item.postRosc(),
    ],
    pitfalls: [
      pit.shockNonShockable(),
      pit.amiodaroneNonShockable(),
      pit.adrenalineSameCycle(),
      pit.longPause(),
      pit.routineCalcium(),
      pit.stopForEtco2(),
    ],
    teaching: [
      { ref: R.vasopressor, quote: "Give adrenaline 1 mg as soon as possible for adult patients in cardiac arrest with a non-shockable rhythm." },
      { ref: R.fluids, quote: "Give fluids during CPR only if cardiac arrest is caused by hypovolaemia." },
      { ref: R.access, quote: "Attempt intravenous (IV) rather than intraosseous (IO) access first, to enable drug delivery in adults in cardiac arrest." },
      { ref: R.ihca, quote: "Hospital systems should aim to recognise cardiac arrest, start CPR immediately, defibrillate rapidly (<3 min) for shockable rhythms, give adrenaline rapidly for non-shockable rhythms, and identify and treat reversible causes." },
      { ref: R.otherDrugs, quote: "Do not routinely give calcium, sodium bicarbonate or corticosteroids during cardiac arrest." },
    ],
  },

  /* 3 ------------------------------------------------------------------ */
  {
    id: "als-ems-refractory-vf",
    module: "als",
    number: 3,
    title: "Living room: refractory VF",
    teaser: "EMS arrives at a witnessed collapse with bystander CPR. The rhythm does not convert – vector change, IO access, second amiodarone dose.",
    setting: "out-of-hospital",
    audiences: ["ems", "physician"],
    level: "advanced",
    minutes: 20,
    focus: ["Refractory VF", "Antero-posterior vector change", "IO after failed IV", "Amiodarone 300 + 150 mg"],
    role: "You are the team leader of an ALS-capable EMS crew (paramedic / emergency physician). Your colleague and a second crew member are with you.",
    resources: ["Manual defibrillator / monitor with two sets of pads", "Bag-mask, oxygen, i-gel, intubation equipment, waveform capnography", "IV cannulas, IO drill, adrenaline, amiodarone, lidocaine, crystalloids", "Mechanical chest compression device (in the vehicle)", "Two crew members"],
    opening:
      "Saturday, 4:15 pm, a living room. Mr Okafor, 52, collapsed while watching football with his son, who has been doing chest compressions for about six minutes as instructed by the dispatcher. There is no AED. The patient lies on the carpet; the son is exhausted.\n\nYou and your crew enter with the equipment.\n\nWhat do you do?",
    script: `Setting: living room, enough floor space, safe. Patient: Mr Okafor, 52 y, ~110 kg, witnessed collapse, no known illness, son did dispatcher-assisted CPR (compression-only) for ~6 min.
People: Paramedic Lea and EMT Tim (act only on instruction; can take over compressions, charge, change pads to the antero-posterior position with the second set of pads, try IV access, place an IO needle, give drugs, fetch the mechanical CPR device from the vehicle). The son stays nearby.
Course of events:
- Unresponsive, no normal breathing, no pulse – cardiac arrest.
- IV access is difficult: the SYSTEM decides whether IV attempts fail (turn context). An IO needle in the proximal humerus or tibia works at the first attempt.
- The SYSTEM decides the rhythm at every check; ROSC only when the system says so.
- If asked about causes: no trauma, no drugs/toxins known, chest pain earlier in the afternoon according to the son.
- After ROSC: weak central pulse, no purposeful movement yet, breathing insufficient; transport to a cardiac arrest centre is possible.
${COMMON_ALS_SCRIPT}`,
    ending: "End (endReason=recovery) when ROSC has been achieved AND the learner has started immediate post-ROSC care and plans transport (e.g. to a cardiac arrest centre). If 9 rhythm checks have passed without ROSC, end with handover/transport decision (endReason=handover). If the learner wants to stop, endReason=learner_stopped.",
    facts: [
      { id: "no_signs", label: "Assessment", text: "Unresponsive, no normal breathing, no palpable carotid pulse; son has been compressing for about 6 minutes.", revealWhen: "Learner checks the patient or asks the son." },
      { id: "history", label: "History", text: "52 y, no known illness; complained of chest pain earlier in the afternoon; collapsed suddenly in front of his son.", revealWhen: "Learner asks the son about history or causes." },
      { id: "veins", label: "Veins", text: "Large arms, no visible veins – IV cannulation is very difficult.", revealWhen: "Learner attempts or asks about IV access." },
      { id: "after_rosc", label: "After ROSC", text: "Weak central pulse, no purposeful movement yet, insufficient spontaneous breathing.", revealWhen: "SYSTEM: after ROSC has been achieved." },
    ],
    aed: null,
    monitor: null,
    als: {
      rhythms: ["vf", "vf", "vf", "vf", "vf", "vf", "vf", "vf", "vf"],
      rosc: { atCheck: 6, requires: ["vector_change", "amiodarone", "adrenaline"], hr: 88, spo2: 93, sys: 108, dia: 66, crt: 3, etco2: 41 },
      etco2Cpr: 20,
      ivFails: 2,
      equipment: "Manual defibrillator with monitor, two sets of pads, bag-mask with oxygen, i-gel, tubes, capnography, IV cannulas, IO drill, adrenaline, amiodarone, lidocaine, crystalloids; mechanical CPR device in the vehicle.",
    },
    checklist: [
      item.confirmArrest(),
      item.padsDuringCpr(),
      item.rhythmDecisions(),
      item.safeShock(),
      item.resumeImmediately(),
      {
        id: "io_after_failed_iv",
        label: "IO access after failed IV attempts",
        criteria: "Determined by the system: IO needle placed once IV attempts have failed.",
        refs: [R.access],
        weight: 2,
        auto: "io_after_failed_iv",
      },
      {
        id: "adrenaline_after_third_shock",
        label: "Adrenaline 1 mg after the third shock",
        criteria: "Determined by the system.",
        refs: [R.vasopressor],
        weight: 2,
        critical: true,
        auto: "adrenaline_after_third_shock",
      },
      {
        id: "amiodarone_after_third_shock",
        label: "Amiodarone 300 mg after the third shock",
        criteria: "Determined by the system.",
        refs: [R.antiarrhythmic],
        weight: 2,
        critical: true,
        auto: "amiodarone_after_third_shock",
      },
      {
        id: "vector_change",
        label: "Vector change to antero-posterior pads for refractory VF",
        criteria: "Determined by the system: pads changed to the antero-posterior position after three failed shocks.",
        refs: [R.refractory, R.pads, R.keyMessages],
        weight: 3,
        critical: true,
        auto: "vector_change",
      },
      {
        id: "amiodarone_after_fifth_shock",
        label: "Amiodarone 150 mg after the fifth shock",
        criteria: "Determined by the system.",
        refs: [R.antiarrhythmic],
        weight: 2,
        auto: "amiodarone_after_fifth_shock",
      },
      item.airway(),
      item.capno(),
      {
        id: "consider_options",
        label: "Considers mechanical CPR / transport / ECPR for refractory arrest",
        criteria: "Learner considers mechanical chest compressions to facilitate transfer, and/or extracorporeal CPR or coronary angiography (cardiac arrest centre).",
        refs: [R.algorithm, R.mechanical, R.ohca],
        weight: 1,
      },
      item.postRosc(),
    ],
    pitfalls: [
      pit.shockNonShockable(),
      pit.missedShock(),
      pit.adrenalineTooEarly(),
      pit.amiodaroneTooEarly(),
      pit.adrenalineSameCycle(),
      pit.longPause(),
      pit.unsafeShock(),
      pit.stopForEtco2(),
    ],
    teaching: [
      { ref: R.refractory, quote: "For refractory VF, defined as continuous VF after three consecutive shocks, and having ensured correct antero-lateral pad positioning, consider using a defibrillation vector change by using an alternative defibrillation pad position (e.g. antero-posterior)." },
      { ref: R.access, quote: "If IV access cannot be rapidly achieved within two attempts, it is reasonable to consider IO access as an alternative route for vascular access during adult cardiac arrest." },
      { ref: R.antiarrhythmic, quote: "Give a further dose of amiodarone 150 mg IV for adult patients in cardiac arrest who are in VF/pVT after five shocks have been administered." },
      { ref: R.pads, quote: "The anterior pad is placed to the left of the sternum, avoiding as much breast tissue as possible." },
      { ref: R.mechanical, quote: "Consider mechanical chest compressions only if high-quality manual chest compression is not practical or compromises provider safety." },
    ],
  },
];

for (const c of ALS_CASES) {
  for (const it of c.checklist) {
    it.blockedBy = (BLOCKED_BY[it.id] ?? []).filter((pid) => c.pitfalls.some((p) => p.id === pid));
  }
}

export function getAlsCase(id: string): SimCase | undefined {
  return ALS_CASES.find((c) => c.id === id);
}
