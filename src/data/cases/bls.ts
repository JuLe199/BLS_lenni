/**
 * BLS case library – ERC Guidelines 2025 Adult Basic Life Support.
 *
 * Rules for authors (checked by `npm run verify:content`):
 * - Every checklist item / pitfall cites guideline passage ids (src/data/guideline/bls-2025.json).
 * - Every teaching point quote must appear VERBATIM in its passage.
 * - Do not score anything the BLS guideline does not say (e.g. handover structure, drugs,
 *   recovery position, pulse checks). Such actions are simply not graded.
 * - Scenario facts (ages, places, names) are fiction; clinical behaviour must stay consistent
 *   with the guideline (e.g. AED prompts are generic, no fixed analysis interval is claimed).
 */
import type { ChecklistItem, Pitfall, SimCase } from "@/lib/cases/types";

/* ------------------------------------------------------------------ shared building blocks */

const item = {
  safety: (): ChecklistItem => ({
    id: "safety",
    label: "Checks the scene is safe",
    criteria: "Learner explicitly checks or states that the scene is safe for themselves, the person and bystanders before or while approaching.",
    refs: ["rec-safety", "fig7-step-by-step"],
    weight: 1,
  }),
  response: (): ChecklistItem => ({
    id: "check_response",
    label: "Checks for a response",
    criteria: "Learner checks responsiveness, e.g. gently shakes the shoulders and asks loudly “Are you all right?”.",
    refs: ["fig7-step-by-step", "three-steps"],
    weight: 1,
  }),
  callEms: (detail: string): ChecklistItem => ({
    id: "call_ems",
    label: "Calls the emergency number immediately (unresponsive = call)",
    criteria: `Learner calls 112 (or makes a named bystander call) as soon as the person is unresponsive – the call is NOT postponed until breathing has been fully assessed. ${detail}`,
    refs: ["rec-recognition", "rec-alerting", "table1-changes"],
    weight: 3,
    critical: true,
  }),
  speaker: (): ChecklistItem => ({
    id: "speaker_mode",
    label: "Uses the phone on speaker / stays with the patient",
    criteria: "Learner activates speaker or hands-free mode (or has the caller do so) so that CPR can be started while talking to the dispatcher, and stays with the patient.",
    refs: ["rec-alerting", "fig7-step-by-step"],
    weight: 1,
  }),
  airwayBreathing: (): ChecklistItem => ({
    id: "assess_breathing",
    label: "Opens the airway and assesses breathing (≤ 10 s)",
    criteria: "Learner opens the airway (head tilt–chin lift) and looks, listens and feels for breathing for no more than 10 seconds.",
    refs: ["fig7-step-by-step", "fig3-algorithm"],
    weight: 1,
  }),
  recognise: (pattern: string): ChecklistItem => ({
    id: "recognise_arrest",
    label: "Recognises cardiac arrest despite abnormal breathing",
    criteria: `Learner interprets ${pattern} as NOT normal breathing and treats the person as being in cardiac arrest.`,
    refs: ["rec-recognition", "ev-abnormal-breathing"],
    weight: 3,
    critical: true,
  }),
  sendForAed: (detail: string): ChecklistItem => ({
    id: "send_for_aed",
    label: "Sends someone to get the AED",
    criteria: `Learner sends a helper to fetch and bring back the AED (does not leave the patient to get it personally while helpers are available). ${detail}`,
    refs: ["fig7-step-by-step", "rec-aed-use"],
    weight: 2,
  }),
  startCpr: (): ChecklistItem => ({
    id: "start_cpr",
    label: "Starts chest compressions without delay",
    criteria: "Learner starts chest compressions immediately after recognising cardiac arrest (compressions first).",
    refs: ["rec-compressions", "ev-compression-first", "three-steps"],
    weight: 3,
    critical: true,
  }),
  cprQuality: (): ChecklistItem => ({
    id: "cpr_quality",
    label: "High-quality compressions (position, depth, rate, recoil)",
    criteria: "Learner states – spontaneously or when asked – hand position on the lower half of the sternum / centre of the chest, depth 5–6 cm and rate 100–120 per minute. Full recoil / not leaning is a bonus, not required. Both depth AND rate must be correct.",
    refs: ["rec-compressions", "ev-depth-rate-recoil", "ev-hand-position", "fig7-step-by-step"],
    weight: 2,
  }),
  ventilationChoice: (): ChecklistItem => ({
    id: "ventilation",
    label: "Guideline-conform ventilation strategy",
    criteria: "Learner either performs 30:2 with rescue breaths (trained, able and willing) or deliberately performs continuous compression-only CPR (unable/unwilling to ventilate). Any other ratio (e.g. 15:2) does not count.",
    refs: ["rec-rescue-breaths", "ev-compression-only", "ev-ratio"],
    weight: 1,
  }),
  padsDuringCpr: (): ChecklistItem => ({
    id: "pads_during_cpr",
    label: "AED on, pads on bare chest – CPR continues meanwhile",
    criteria: "As soon as the AED is at the patient, it is switched on and the pads are attached to the bare chest while another rescuer continues compressions (no pause in CPR for pad placement).",
    refs: ["rec-aed-use", "ev-aed-how-when", "fig7-step-by-step-2"],
    weight: 2,
  }),
  clear: (): ChecklistItem => ({
    id: "nobody_touches",
    label: "Nobody touches the patient during analysis / shock",
    criteria: "Learner makes sure (e.g. loudly announces, checks visually) that nobody touches the patient while the AED analyses and when a shock is delivered.",
    refs: ["rec-aed-use", "ev-aed-how-when", "ev-aed-safety"],
    weight: 2,
    critical: true,
  }),
  shockWithoutDelay: (): ChecklistItem => ({
    id: "shock_without_delay",
    label: "Delivers the advised shock without delay",
    criteria: "When the AED advises a shock, the learner (semi-automatic: presses the shock button / fully automatic: keeps everyone clear) without first doing extra CPR or other checks.",
    refs: ["ev-cpr-before-defib", "fig7-step-by-step-2"],
    weight: 2,
  }),
  resumeCpr: (): ChecklistItem => ({
    id: "resume_cpr",
    label: "Restarts compressions immediately after the shock / “no shock advised”",
    criteria: "Immediately after a shock or a “no shock advised” prompt, compressions are restarted – no pulse check, no breathing check, no waiting.",
    refs: ["rec-aed-use", "fig7-step-by-step-2", "ev-interruptions"],
    weight: 3,
    critical: true,
  }),
  continueUntilHandover: (who: string): ChecklistItem => ({
    id: "continue_until_handover",
    label: `Continues CPR until ${who} takes over`,
    criteria: `CPR (and AED prompts) are continued without unnecessary interruptions until ${who} takes over – unless the patient definitely shows signs of recovery.`,
    refs: ["fig3-algorithm", "fig7-step-by-step-2"],
    weight: 1,
  }),
};

const pit = {
  delayedCall: (): Pitfall => ({
    id: "delayed_call",
    label: "Delayed the emergency call",
    criteria: "Learner postpones calling 112 / the team until breathing (or a pulse) has been fully assessed, or performs other tasks first although the person is unresponsive.",
    refs: ["table1-changes", "rec-recognition", "ev-alerting"],
  }),
  missedAgonal: (): Pitfall => ({
    id: "missed_abnormal_breathing",
    label: "Took abnormal breathing as a sign of life",
    criteria: "Learner treats gasping / snoring / panting / seizure-like movements as normal breathing or a sign of life and does not start CPR (e.g. waits, observes, recovery position).",
    refs: ["ev-abnormal-breathing", "rec-recognition", "ev-seizures"],
  }),
  longAssessment: (): Pitfall => ({
    id: "prolonged_assessment",
    label: "Assessment delayed compressions (> 10 s)",
    criteria: "Learner spends clearly more than 10 seconds checking breathing/pulse or performs additional examinations before starting compressions.",
    refs: ["fig7-step-by-step", "ev-compression-first"],
  }),
  touchDuringAnalysis: (): Pitfall => ({
    id: "touch_during_analysis",
    label: "Patient touched during analysis or shock",
    criteria: "Learner or a helper continues compressions or touches the patient while the AED analyses or delivers a shock.",
    refs: ["rec-aed-use", "ev-aed-safety"],
  }),
  pausedForPads: (): Pitfall => ({
    id: "cpr_paused_for_pads",
    label: "Stopped CPR for pad placement",
    criteria: "Although a second rescuer is present, compressions are stopped while the AED is switched on or pads are attached.",
    refs: ["rec-aed-use", "ev-aed-how-when"],
  }),
  delayAfterShock: (): Pitfall => ({
    id: "delay_after_analysis",
    label: "Hands-off time after shock / no-shock prompt",
    criteria: "After a shock or “no shock advised”, the learner checks pulse/breathing, waits, or discusses before restarting compressions.",
    refs: ["rec-aed-use", "ev-interruptions"],
  }),
  extraCprBeforeShock: (): Pitfall => ({
    id: "delayed_shock",
    label: "Delayed an advised shock",
    criteria: "Learner delays an advised shock to do more CPR first or for other reasons.",
    refs: ["ev-cpr-before-defib", "ev-aed-intro"],
  }),
  stoppedTooEarly: (): Pitfall => ({
    id: "stopped_cpr_prematurely",
    label: "Stopped CPR without definite signs of recovery",
    criteria: "Learner stops CPR although the patient is not definitely waking up, moving, opening eyes AND breathing normally (and no HCP/team has taken over).",
    refs: ["fig7-step-by-step-2"],
  }),
  excessiveVentilation: (): Pitfall => ({
    id: "excessive_ventilation",
    label: "Excessive or prolonged ventilation",
    criteria: "Rescue breaths are forceful/large, given much longer than about 1 s each, or the pause for two breaths clearly exceeds 10 s.",
    refs: ["rec-rescue-breaths", "ev-rescue-breaths"],
  }),
};

const COMMON_AED_FLOW =
  "AED behaviour is controlled by the SYSTEM (rhythm results and voice prompts are inserted automatically – never invent them). Report AED steps via aedSteps only when the learner (or a helper they direct) actually does them.";

/* ------------------------------------------------------------------ cases */

export const BLS_CASES: SimCase[] = [
  /* 1 ------------------------------------------------------------------ */
  {
    id: "bls-platform-collapse",
    module: "bls",
    number: 1,
    title: "Collapse on the platform",
    teaser: "Off duty at a busy train station – a man slumps to the ground right next to you.",
    setting: "out-of-hospital",
    audiences: ["nurse", "physician", "ems"],
    level: "core",
    minutes: 10,
    focus: ["Call first", "Agonal breathing", "Public-access AED", "Team of bystanders"],
    role: "You are an off-duty healthcare professional on your way home. You have no equipment except your mobile phone.",
    resources: ["Your mobile phone", "Two bystanders (a commuter and a station employee)", "Public-access AED in the station hall (semi-automatic)"],
    opening:
      "Platform 4, 6:40 pm. A man in his fifties standing a few metres away from you suddenly slumps to the ground and stays motionless. People step back. A woman next to you grabs your arm: “Oh God – you’re a nurse or something? Can you help him?”\n\nA station employee in a high-visibility vest is walking towards you.\n\nWhat do you do?",
    script: `Setting: busy train station platform, early evening. The patient (Mr Hoffmann, ~55 y) collapsed in front of witnesses (witnessed arrest). He lies on his back roughly 3 m from the platform edge; no train is approaching; the area is safe.
People: Commuter "Mia" (no CPR training, has a phone, willing to help). Station employee "Mr Yilmaz" (knows the public-access AED is in the station hall next to the ticket machines, about 1 minute away at a run).
Course of events:
- He is unresponsive. When the airway is opened he has occasional slow, noisy gasps (agonal breathing, roughly every 10 seconds) – this is NOT normal breathing.
- If 112 is called (by the learner or a bystander the learner instructs), the dispatcher answers, asks for the location and what happened, confirms cardiac arrest when told about the gasping, says "We need to do CPR" and that an ambulance is on its way, and – once CPR is underway – asks whether there is an AED.
- If the learner sends Mr Yilmaz (or Mia) for the AED, it is at the patient after about 1–2 further turns of CPR. If nobody is sent, nobody brings it until the learner asks; the dispatcher's AED question is a cue.
- If the learner starts CPR without describing the technique, Mia asks once: "Show me how – how deep and how fast? I might have to take over." (gives the learner the chance to state depth/rate).
- 1st AED analysis → shock advised (system). After the shock and resumed CPR, the 2nd analysis (after a further turn of CPR) → no shock advised (system); the patient is still unresponsive and not breathing normally, so CPR must continue.
- EMS (ambulance crew) arrives after the 2nd analysis once the learner has resumed CPR, and takes over.
${COMMON_AED_FLOW}`,
    ending: "End the case (caseComplete=true, endReason=handover) when the ambulance crew has arrived and taken over CPR after the 2nd analysis. If the learner explicitly wants to stop earlier, end with endReason=learner_stopped.",
    facts: [
      { id: "scene", label: "Scene", text: "He lies on his back about 3 m from the platform edge. No train is approaching; nothing endangers you, him or the bystanders.", revealWhen: "Learner checks scene safety or looks around." },
      { id: "response", label: "Response", text: "No reaction to shaking his shoulders and asking loudly “Are you all right?”.", revealWhen: "Learner checks responsiveness." },
      { id: "breathing", label: "Breathing", text: "After head tilt–chin lift: an occasional slow, noisy gasp – roughly one every 10 seconds; otherwise the chest does not move.", revealWhen: "Learner opens the airway / looks, listens and feels for breathing." },
      { id: "aed_location", label: "AED", text: "The station employee knows a public-access AED: station hall, next to the ticket machines – about 1 minute away at a run.", revealWhen: "Learner asks for an AED or the employee is addressed / dispatcher asks about an AED." },
      { id: "skin", label: "Appearance", text: "Grey-pale face, no movement apart from the occasional gasp.", revealWhen: "Learner looks at the patient more closely." },
    ],
    aed: { type: "semi-automatic", availability: "Public-access AED in the station hall, ~1 min away – must be fetched by a helper.", rhythms: ["shockable", "non-shockable"] },
    checklist: [
      item.safety(),
      item.response(),
      item.callEms("Delegating the call to Mia or Mr Yilmaz counts if the learner explicitly instructs them."),
      item.speaker(),
      item.airwayBreathing(),
      item.recognise("the occasional slow, noisy gasps"),
      item.sendForAed("Sending Mr Yilmaz (who knows where it is) is ideal."),
      item.startCpr(),
      item.cprQuality(),
      item.ventilationChoice(),
      item.padsDuringCpr(),
      item.clear(),
      item.shockWithoutDelay(),
      item.resumeCpr(),
      item.continueUntilHandover("the ambulance crew"),
    ],
    pitfalls: [
      pit.delayedCall(),
      pit.missedAgonal(),
      pit.longAssessment(),
      {
        id: "left_patient_for_aed",
        label: "Left the patient to fetch the AED personally",
        criteria: "Learner runs to get the AED themselves although bystanders are available to fetch it.",
        refs: ["fig7-step-by-step"],
      },
      pit.pausedForPads(),
      pit.touchDuringAnalysis(),
      pit.extraCprBeforeShock(),
      pit.delayAfterShock(),
      pit.stoppedTooEarly(),
    ],
    teaching: [
      { ref: "table1-changes", quote: "Rescuers no longer need to confirm abnormal breathing before calling." },
      { ref: "rec-recognition", quote: "Slow, laboured breathing, as well as other abnormal patterns such as agonal gasping or panting, must be recognised as signs of cardiac arrest." },
      { ref: "fig7-step-by-step", quote: "Send someone to find and bring back an AED, if available." },
      { ref: "rec-aed-use", quote: "After the shock has been delivered, immediately restart chest compressions." },
      { ref: "ev-aed-intro", quote: "Among patients in a shockable rhythm, each minute delay to defibrillation is associated with 6 % higher probability of failure to terminate VF, and 3–6 % lower probability of survival to discharge." },
    ],
  },

  /* 2 ------------------------------------------------------------------ */
  {
    id: "bls-ward-night",
    module: "bls",
    number: 2,
    title: "Night shift: unresponsive in bed",
    teaser: "Routine observations on a medical ward – your patient does not react.",
    setting: "in-hospital",
    audiences: ["nurse", "physician"],
    level: "core",
    minutes: 10,
    focus: ["In-hospital alert", "CPR on the bed", "Mattress CPR mode", "Ventilation as HCP"],
    role: "You are working the night shift on a general medical ward (nurse or ward doctor). A colleague is in the corridor.",
    resources: [
      "Colleague (healthcare assistant) on the corridor",
      "Ward phone with the in-house emergency number for the resuscitation team",
      "Emergency trolley: AED, pocket mask, bag-valve-mask with oxygen",
      "Patient on an air mattress with a CPR-mode function",
    ],
    opening:
      "Ward 4B, 2:15 am. You enter room 12 for the scheduled observations. Mr Kaiser, 74, admitted yesterday with pneumonia, lies flat in his bed. The room is dimly lit. He does not turn his head when you come in.\n\nYour colleague Jonas is restocking a trolley in the corridor.\n\nWhat do you do?",
    script: `Setting: general medical ward at night. Patient: Mr Kaiser, 74 y, pneumonia, on an alternating-pressure air mattress (bed has a clearly labelled red "CPR" quick-release/stiffening function at the foot end). Room is safe.
People: Colleague Jonas (healthcare assistant, BLS trained) – does exactly what he is told; if not instructed he stays in the corridor. Resuscitation team arrives a few minutes after being alerted (not before the 2nd AED analysis).
Course of events:
- Unresponsive. After opening the airway: no breathing movements at all; no signs of life (no movement, no coughing). If the learner checks a carotid pulse: none palpable (but that is not required by the scenario).
- If the learner shouts for help, Jonas comes immediately. The learner must make sure the resuscitation team is alerted and the AED/defibrillator is brought (emergency trolley in the corridor, ~20 s away).
- CPR must start on the bed. If the learner activates the CPR mode, the mattress deflates/stiffens within seconds. If the learner wants to move him to the floor: Jonas hesitates – it is a heavy patient and the bed is high; if insisted, it costs about 1 minute without compressions.
- If the learner asks for a backboard: there is none on the trolley.
- Ventilation: pocket mask and bag-valve-mask with oxygen are on the trolley.
- 1st AED analysis → no shock advised (system); 2nd analysis (after a further turn of CPR) → no shock advised. Patient remains in cardiac arrest.
- The resuscitation team arrives after the 2nd analysis once CPR has been resumed, and takes over (ALS is outside this module).
${COMMON_AED_FLOW}`,
    ending: "End (handover) when the resuscitation team arrives and takes over after the 2nd analysis. ALS measures (drugs, intubation, IV) are outside this BLS case – the team takes over.",
    facts: [
      { id: "response", label: "Response", text: "No reaction to voice or to shaking his shoulders.", revealWhen: "Learner checks responsiveness." },
      { id: "breathing", label: "Breathing / signs of life", text: "After head tilt–chin lift: no breathing movements, no coughing, no movement – no signs of life.", revealWhen: "Learner checks breathing and/or signs of life." },
      { id: "pulse", label: "Pulse (if checked)", text: "No carotid pulse palpable.", revealWhen: "Only if the learner explicitly checks a pulse." },
      { id: "mattress", label: "Bed", text: "Alternating-pressure air mattress; red CPR release at the foot end of the bed.", revealWhen: "Learner looks at the bed/mattress or asks about it." },
      { id: "trolley", label: "Emergency trolley", text: "AED, pocket mask and bag-valve-mask with oxygen – no backboard.", revealWhen: "The trolley is brought or the learner asks what is on it." },
    ],
    aed: { type: "semi-automatic", availability: "On the ward emergency trolley in the corridor (~20 s away) – must be brought.", rhythms: ["non-shockable", "non-shockable"] },
    checklist: [
      item.response(),
      {
        id: "alert_team",
        label: "Shouts for help and alerts the resuscitation team",
        criteria: "Learner calls for help (colleague) AND makes sure the in-house resuscitation team is alerted (calls it or instructs the colleague to call it) without delay.",
        refs: ["fig3-algorithm", "rec-recognition"],
        weight: 3,
        critical: true,
      },
      {
        id: "request_aed",
        label: "Requests the AED / defibrillator",
        criteria: "Learner has the AED/defibrillator (emergency trolley) brought to the bedside.",
        refs: ["fig3-algorithm", "rec-aed-use"],
        weight: 2,
      },
      {
        id: "breathing_signs_of_life",
        label: "Checks breathing and signs of life (≤ 10 s)",
        criteria: "Learner opens the airway and checks breathing and signs of life for no more than 10 seconds.",
        refs: ["fig3-algorithm", "fig7-step-by-step"],
        weight: 1,
      },
      item.startCpr(),
      {
        id: "cpr_on_bed",
        label: "Starts CPR on the bed (does not move him to the floor)",
        criteria: "Compressions are performed on the bed; the patient is not moved to the floor.",
        refs: ["rec-compressions", "ev-firm-surface"],
        weight: 2,
      },
      {
        id: "cpr_mode",
        label: "Activates the mattress CPR mode",
        criteria: "Learner activates (or has a colleague activate) the CPR mode / CPR release of the air mattress.",
        refs: ["ev-firm-surface"],
        weight: 2,
      },
      item.cprQuality(),
      {
        id: "ventilation_hcp",
        label: "Ventilation as healthcare professional (30:2 or CCC + asynchronous ventilation)",
        criteria: "Learner ventilates 30:2 with pocket mask or bag-valve-mask (breaths of about 1 s, chest just begins to rise, pause ≤ 10 s) – OR continuous compressions with asynchronous positive-pressure ventilation. Compression-only without any ventilation plan, or 15:2, does not count.",
        refs: ["ev-compression-only", "ev-rescue-breaths", "ev-ratio"],
        weight: 2,
      },
      item.padsDuringCpr(),
      item.clear(),
      item.resumeCpr(),
      item.continueUntilHandover("the resuscitation team"),
    ],
    pitfalls: [
      pit.delayedCall(),
      pit.longAssessment(),
      {
        id: "moved_to_floor",
        label: "Moved the patient to the floor",
        criteria: "Learner moves (or attempts to move) the patient from the bed to the floor before/while starting CPR.",
        refs: ["ev-firm-surface", "rec-compressions"],
      },
      {
        id: "backboard_delay",
        label: "Delayed CPR looking for a backboard",
        criteria: "Learner delays compressions to search for or place a backboard.",
        refs: ["ev-firm-surface"],
      },
      pit.excessiveVentilation(),
      pit.pausedForPads(),
      pit.touchDuringAnalysis(),
      pit.delayAfterShock(),
      pit.stoppedTooEarly(),
    ],
    teaching: [
      { ref: "fig3-algorithm", quote: "In-hospital: Check for breathing and signs of life. Request AED or defibrillator. Alert resuscitation team." },
      { ref: "rec-compressions", quote: "Start CPR on the bed and, if needed, compress the chest deeper to compensate for the soft mattress." },
      { ref: "ev-firm-surface", quote: "For the in-hospital setting, if a mattress has a ‘CPR mode’ to increase mattress stiffness, it should be activated when performing CPR." },
      { ref: "ev-firm-surface", quote: "The ERC does not advocate using a backboard." },
      { ref: "ev-rescue-breaths", quote: "The maximum interruption in chest compression to deliver two breaths should not exceed 10 s." },
      { ref: "rec-aed-use", quote: "If no shock is indicated, immediately restart CPR chest compressions." },
    ],
  },

  /* 3 ------------------------------------------------------------------ */
  {
    id: "bls-five-a-side",
    module: "bls",
    number: 3,
    title: "Five-a-side: the panting midfielder",
    teaser: "A teammate collapses mid-game. Eyes open, panting, a few jerks – “he’s just fainted”?",
    setting: "out-of-hospital",
    audiences: ["nurse", "physician", "ems"],
    level: "advanced",
    minutes: 10,
    focus: ["Athletes: panting / eyes open", "Seizure-like onset", "Fully automatic AED", "When to stop CPR"],
    role: "You are playing in an amateur five-a-side match in a sports hall after work. You are the only healthcare professional present.",
    resources: ["Teammates (no medical training)", "Your phone in your bag at the bench (~10 m)", "Fully automatic AED in a wall cabinet at the hall entrance (~30 m)"],
    opening:
      "Thursday evening, municipal sports hall. Tom, 44, your team’s midfielder, sprints back for a defensive run – and suddenly drops to the floor without any contact. His arms and legs jerk for a few seconds, then stop.\n\nHe is lying on his back. His eyes are open. A teammate kneels next to him: “He’s breathing – he’s just fainted, right? Let’s put him in the recovery position.”\n\nWhat do you do?",
    script: `Setting: indoor sports hall, wooden floor, safe. Patient: Tom, 44 y, collapsed while sprinting (exercise-related cardiac arrest). Witnessed.
People: Teammates Ben (keeps suggesting recovery position/"he's breathing") and Lukas (fast, does what he is told). Phones are in bags at the bench (~10 m). AED: fully automatic, wall cabinet at the hall entrance (~30 m, unlocked), Lukas can fetch it within about 1 minute.
Course of events:
- Seizure-like jerking lasted a few seconds at the onset and has stopped (already over when the case starts).
- Unresponsive (no reaction to voice or shaking). Eyes open, staring, no blinking to voice.
- Breathing when assessed: fast, irregular, shallow "panting" breaths with long pauses in between – clearly NOT normal breathing. If the learner doesn't open the airway/look properly, Ben insists "look, he's breathing!".
- If 112 is called (speaker): dispatcher confirms cardiac arrest when told about the breathing, says "We need to do CPR", asks about an AED once CPR is underway. Ambulance on its way.
- Fully automatic AED: the SYSTEM analyses after pads are attached; if a shock is advised the device itself delivers it after warning – the learner's job is to keep everyone clear.
- 1st analysis → shock advised → (device delivers shock at the start of the following turn). Learner must restart compressions immediately.
- RECOVERY: After the learner has resumed CPR after the shock and continued for one further turn, Tom starts to move, groans, pushes the hands away, blinks/looks around and breathes normally (regular, effortless breaths). These are definite signs of recovery – CPR may now be stopped. If the learner keeps compressing a patient who is fighting them, Tom resists. If the learner stops CPR earlier (before these signs), record the pitfall and Tom remains in cardiac arrest (no breathing, no movement).
- EMS arrives a few minutes after recovery and takes over (case end). Keeping the AED pads on / monitoring are NOT part of the BLS guideline – do not grade them, do not claim a guideline recommendation about them.
${COMMON_AED_FLOW}`,
    ending: "End (endReason=recovery or handover) when EMS has arrived after Tom has recovered and the learner hands over. If the learner explicitly wants to stop earlier, end with learner_stopped.",
    facts: [
      { id: "onset", label: "Onset", text: "Sudden collapse while sprinting, no contact; arms and legs jerked for a few seconds, then stopped.", revealWhen: "Learner asks how he collapsed / asks bystanders." },
      { id: "response", label: "Response", text: "No reaction to voice or shaking his shoulders. Eyes open, staring.", revealWhen: "Learner checks responsiveness." },
      { id: "breathing", label: "Breathing", text: "Fast, irregular, shallow panting breaths with long pauses in between – not normal breathing.", revealWhen: "Learner opens the airway and looks, listens and feels for breathing." },
      { id: "aed_location", label: "AED", text: "Fully automatic AED in an unlocked wall cabinet at the hall entrance, about 30 m away.", revealWhen: "Learner asks for an AED or looks around the hall." },
      { id: "recovery", label: "After the shock", text: "Tom groans, moves his arms, pushes your hands away, blinks and looks around; he now breathes regularly and effortlessly.", revealWhen: "SYSTEM/SCRIPT: one turn after CPR was resumed following the shock." },
    ],
    aed: { type: "fully-automatic", availability: "Wall cabinet at the hall entrance (~30 m), unlocked – a teammate can fetch it.", rhythms: ["shockable", "non-shockable"] },
    checklist: [
      item.response(),
      item.callEms("Asking a teammate to call 112 on speaker counts if explicitly instructed."),
      item.airwayBreathing(),
      item.recognise("the panting, irregular breathing (with eyes open and after brief seizure-like jerking)"),
      item.sendForAed("Lukas is fastest."),
      item.startCpr(),
      item.cprQuality(),
      item.padsDuringCpr(),
      {
        ...item.clear(),
        criteria: "Fully automatic AED: learner keeps everyone clear during analysis AND while the device warns that it will deliver the shock.",
      },
      item.resumeCpr(),
      {
        id: "recognise_recovery",
        label: "Recognises definite signs of recovery before stopping CPR",
        criteria: "Learner stops CPR only once Tom is definitely waking up, moving, opening/blinking his eyes and breathing normally – and not before.",
        refs: ["fig7-step-by-step-2"],
        weight: 2,
      },
    ],
    pitfalls: [
      pit.delayedCall(),
      {
        ...pit.missedAgonal(),
        criteria: "Learner accepts the open eyes, panting breaths or the brief seizure-like jerks as signs of life (e.g. recovery position, waiting for him to 'come round') instead of starting CPR.",
      },
      pit.longAssessment(),
      pit.pausedForPads(),
      pit.touchDuringAnalysis(),
      pit.delayAfterShock(),
      pit.stoppedTooEarly(),
    ],
    teaching: [
      { ref: "table1-changes", quote: "Early after the onset of cardiac arrest, athletes may display a near normal or panting breathing pattern." },
      { ref: "ev-abnormal-breathing", quote: "Athletes who sustain a cardiac arrest may continue breathing more regularly and/ or have their eyes open following collapse." },
      { ref: "rec-recognition", quote: "A short period of seizure-like activity may occur at the onset of cardiac arrest. Once the seizure stops, assess breathing." },
      { ref: "ev-aed-safety", quote: "Simulation studies suggest that fully automatic AEDs increase safety, reduce error and shorten time to defibrillation compared to semi-automatic AEDs." },
      { ref: "fig7-step-by-step-2", quote: "It is rare for CPR alone to restart the heart. Unless you are certain that the victim has recovered, continue CPR." },
    ],
  },

  /* 4 ------------------------------------------------------------------ */
  {
    id: "bls-bus-stop-alone",
    module: "bls",
    number: 4,
    title: "Alone at the bus stop",
    teaser: "Evening, empty street – a woman slides off the bench. Nobody else around but your phone.",
    setting: "out-of-hospital",
    audiences: ["nurse", "physician", "ems"],
    level: "core",
    minutes: 10,
    focus: ["Lone rescuer", "Dispatcher-assisted CPR", "Don’t leave to find an AED", "Community first responder"],
    role: "You are on your way home, alone, off duty. You carry your mobile phone; no other equipment.",
    resources: ["Your mobile phone (good signal)", "No AED in sight", "Dispatcher via 112 (community first-responder system available)"],
    opening:
      "A quiet residential street, 9:30 pm. At the bus stop ahead of you a woman in her sixties slides sideways off the bench onto the pavement and lies still. There is nobody else in the street.\n\nWhat do you do?",
    script: `Setting: residential street at night, bus stop on a wide pavement, no traffic risk once she lies on the pavement. Patient: Mrs Arslan, ~63 y. Witnessed collapse.
People: nobody else around. The learner has a phone with good signal.
Course of events:
- Unresponsive. Breathing when assessed: occasional loud snoring gasps – NOT normal breathing.
- Dispatcher (when 112 is called, ideally on speaker): asks for the exact location, "Is she awake?", "Is she breathing normally?". When told about the snoring gasps, the dispatcher says it is a cardiac arrest: "We need to do CPR. I'll help you." The dispatcher by default gives compression-only instructions (push hard and fast in the centre of the chest); if the learner says they are trained and willing to give rescue breaths, the dispatcher agrees to 30:2. Once CPR is underway, the dispatcher asks: "Is there an AED nearby?" – there is none in sight. The dispatcher says the nearest registered AED is in a pharmacy about 400 m away (several minutes there and back) and that a registered community first responder has been alerted via the app and will bring an AED. Ambulance on its way.
- If the learner wants to run for the AED alone: the dispatcher points out it is several minutes away and that a first responder is bringing one; if the learner still goes, CPR stops for several minutes (pitfall).
- The first responder (Daniel, trained volunteer with an AED) arrives after about 2–3 turns of CPR, switches the AED on if asked and can attach pads or take over compressions as directed by the learner.
- 1st analysis → shock advised; 2nd analysis (after a further turn of CPR) → shock advised again. Ambulance crew arrives after the 2nd shock once CPR has been resumed and takes over.
${COMMON_AED_FLOW}`,
    ending: "End (handover) when the ambulance crew arrives after the 2nd shock and takes over.",
    facts: [
      { id: "scene", label: "Scene", text: "Wide pavement, she lies away from the kerb; no traffic risk. Nobody else in the street.", revealWhen: "Learner checks safety / looks around." },
      { id: "response", label: "Response", text: "No reaction to shaking her shoulders and asking loudly.", revealWhen: "Learner checks responsiveness." },
      { id: "breathing", label: "Breathing", text: "Occasional loud, snoring gasps; in between no chest movement.", revealWhen: "Learner opens the airway / assesses breathing." },
      { id: "aed", label: "AED", text: "No AED in sight. Per dispatcher: nearest registered AED ~400 m away (pharmacy); a community first responder has been alerted and is bringing an AED.", revealWhen: "Dispatcher asks about the AED / learner asks for one." },
    ],
    aed: { type: "semi-automatic", availability: "Brought by an alerted community first responder after a few minutes.", rhythms: ["shockable", "shockable"] },
    checklist: [
      item.safety(),
      item.response(),
      item.callEms("The learner is alone – they must call themselves."),
      item.speaker(),
      item.recognise("the snoring gasps"),
      item.startCpr(),
      item.cprQuality(),
      item.ventilationChoice(),
      {
        id: "stay_with_patient",
        label: "Stays and continues CPR instead of leaving to search for an AED",
        criteria: "Learner (alone) does not leave the patient to fetch the distant AED but continues CPR with the dispatcher's support until the AED is brought.",
        refs: ["fig7-step-by-step", "rec-dispatcher"],
        weight: 2,
      },
      item.padsDuringCpr(),
      item.clear(),
      item.shockWithoutDelay(),
      item.resumeCpr(),
      item.continueUntilHandover("the ambulance crew"),
    ],
    pitfalls: [
      pit.delayedCall(),
      pit.missedAgonal(),
      {
        id: "ended_call",
        label: "Ended the call / put the phone away",
        criteria: "Learner hangs up on the dispatcher or puts the phone away instead of keeping the call on speaker while doing CPR.",
        refs: ["fig7-step-by-step", "rec-alerting"],
      },
      {
        id: "left_to_find_aed",
        label: "Left the patient to search for an AED",
        criteria: "Learner leaves the patient alone to look for / fetch an AED that cannot be retrieved and applied within one minute.",
        refs: ["fig7-step-by-step"],
      },
      pit.pausedForPads(),
      pit.touchDuringAnalysis(),
      pit.extraCprBeforeShock(),
      pit.delayAfterShock(),
      pit.stoppedTooEarly(),
    ],
    teaching: [
      { ref: "rec-alerting", quote: "If you have a mobile phone, activate speaker mode, call the local emergency number without delay." },
      { ref: "fig7-step-by-step", quote: "If you are on your own, fetch an AED only if you can get and apply it within one minute; otherwise, start CPR immediately." },
      { ref: "rec-dispatcher", quote: "Where first responder systems have been implemented, dispatchers should activate registered community volunteer responders to the incident and to retrieve a nearby AED" },
      { ref: "ev-cpr-before-defib", quote: "Defibrillation should not be delayed to provide additional CPR." },
    ],
  },

  /* 5 ------------------------------------------------------------------ */
  {
    id: "bls-office-pads",
    module: "bls",
    number: 5,
    title: "Meeting room: pads on bare skin",
    teaser: "A colleague collapses during a meeting. The AED is there – but the team hesitates.",
    setting: "out-of-hospital",
    audiences: ["nurse", "physician", "ems"],
    level: "advanced",
    minutes: 10,
    focus: ["Pad position (anterior-lateral)", "Bra & modesty", "Team roles"],
    role: "You are in a meeting in the administration building of your hospital campus (non-clinical area, no resuscitation team coverage – EMS via 112). Two colleagues are with you.",
    resources: ["Two colleagues (BLS-trained, nervous)", "Mobile phones", "Semi-automatic AED in the corridor, 15 m away", "Scissors from a desk drawer"],
    opening:
      "Administration building, 11:05 am. Halfway through the budget meeting, Dr Weber, 58, head of controlling, stops mid-sentence, slumps sideways in her chair and slides to the floor.\n\nYour colleagues Sven and Aylin jump up. Aylin: “What do we do?”\n\nWhat do you do?",
    script: `Setting: meeting room, carpet floor, safe. Patient: Dr Weber, 58 y, wears a blouse and an underwired bra. Witnessed collapse. Building is not covered by the in-hospital resuscitation team – EMS via 112.
People: Sven and Aylin, both BLS-trained office staff, do exactly what they are told. Aylin is visibly uncomfortable about undressing a senior colleague and will hesitate ("Shouldn't we wait for the paramedics? It's Dr Weber…") until the learner addresses it.
Course of events:
- Unresponsive; breathing when assessed: no normal breathing, a single gasp.
- AED in the corridor (15 m), fetched within seconds if someone is sent.
- Pads: the blouse must be opened. The underwire bra: the right-upper pad (below the right clavicle) fits on bare skin above the bra; the left lateral pad (left mid-axillary line below the armpit) is partly covered by the bra band. If the learner just pushes/displaces the bra band, both pads fit on bare skin in the correct position within seconds. Cutting the bra off with scissors costs ~20–30 s. If pads are placed over clothing or the bra, the AED prompts "Check pads" and no analysis happens (system will not analyse – narrate the delay and let the learner correct).
- 1st analysis → shock advised; 2nd analysis (after a further turn of CPR) → shock advised. Ambulance crew arrives after the 2nd shock once CPR is resumed, takes over.
${COMMON_AED_FLOW}
Extra rule: Only report aedSteps "pads_attached" once BOTH pads are on bare skin in an acceptable position.`,
    ending: "End (handover) when the ambulance crew takes over after the 2nd shock.",
    facts: [
      { id: "response", label: "Response", text: "No reaction to voice or shaking.", revealWhen: "Learner checks responsiveness." },
      { id: "breathing", label: "Breathing", text: "After head tilt–chin lift: one single gasp, then no breathing movements.", revealWhen: "Learner assesses breathing." },
      { id: "clothing", label: "Clothing", text: "Buttoned blouse; underwired bra. The bra band partly covers the left lateral pad position.", revealWhen: "Learner exposes the chest / prepares pad placement." },
      { id: "aed", label: "AED", text: "Semi-automatic AED in the corridor, 15 m away.", revealWhen: "Learner asks for/sends for the AED." },
    ],
    aed: { type: "semi-automatic", availability: "Corridor cabinet, 15 m – a colleague can fetch it within seconds.", rhythms: ["shockable", "shockable"] },
    checklist: [
      item.response(),
      item.callEms("Delegating to Sven or Aylin counts if explicit (who calls, on speaker)."),
      item.recognise("the single gasp / absent breathing"),
      item.sendForAed("Either colleague can fetch it."),
      item.startCpr(),
      item.cprQuality(),
      {
        id: "bare_skin",
        label: "Pads on bare skin – bra displaced only as far as needed",
        criteria: "Learner exposes the chest without hesitation, places the pads on bare skin and deals with the bra quickly (adjusting/displacing it is enough; does not waste time removing or cutting it if not needed).",
        refs: ["ev-bra", "rec-aed-use"],
        weight: 2,
        critical: true,
      },
      {
        id: "pad_position",
        label: "Correct anterior-lateral pad position",
        criteria: "One pad below the right clavicle, right of the upper sternum; the other centred in the left mid-axillary line below the armpit, avoiding breast tissue if possible. (Following the pictograms on the AED/pads also counts.)",
        refs: ["ev-pad-position", "fig6-pad-position"],
        weight: 2,
      },
      {
        id: "address_modesty",
        label: "Overcomes hesitation – life-saving action before modesty",
        criteria: "Learner addresses Aylin's hesitation and clearly prioritises pad placement (screening the patient from onlookers is fine as long as it does not delay).",
        refs: ["ev-bra"],
        weight: 1,
      },
      item.padsDuringCpr(),
      item.clear(),
      item.shockWithoutDelay(),
      item.resumeCpr(),
      item.continueUntilHandover("the ambulance crew"),
    ],
    pitfalls: [
      pit.delayedCall(),
      pit.missedAgonal(),
      {
        id: "modesty_delay",
        label: "Delayed pads out of concern for modesty",
        criteria: "Learner waits, discusses at length, or tries to place pads over clothing because of reluctance to expose the chest.",
        refs: ["ev-bra"],
      },
      {
        id: "pads_not_on_skin",
        label: "Pads over clothing / bra or in the wrong position",
        criteria: "Pads are put on over clothing or the bra, or clearly in the wrong position.",
        refs: ["ev-bra", "ev-pad-position"],
      },
      {
        id: "unnecessary_bra_removal",
        label: "Lost time removing/cutting the bra unnecessarily",
        criteria: "Learner spends time unfastening or cutting the bra although displacing it would have been enough.",
        refs: ["ev-bra"],
      },
      pit.pausedForPads(),
      pit.touchDuringAnalysis(),
      pit.extraCprBeforeShock(),
      pit.delayAfterShock(),
    ],
    teaching: [
      { ref: "ev-bra", quote: "Rescuers should not be concerned about exposing the persons chest to apply defibrillation pads. They should prioritise life-saving interventions over concerns for modesty." },
      { ref: "ev-bra", quote: "If this can be quickly accomplished without unfastening or cutting the bra then, it is acceptable to leave the bra in place." },
      { ref: "ev-pad-position", quote: "One defibrillation pad should be positioned below the patient’s right clavicle, just to the right of the upper sternal border. The other defibrillation pad should be centred on the patient’s left mid-axillary line, below the armpit." },
      { ref: "rec-aed-use", quote: "If more than one rescuer is present, continue CPR while the defibrillation pads are being attached." },
    ],
  },

  /* 6 ------------------------------------------------------------------ */
  {
    id: "bls-dispatch-call",
    module: "bls",
    number: 6,
    title: "Emergency call: you are the dispatcher",
    teaser: "“My wife collapsed – she’s making strange snoring noises.” Guide a frightened caller through CPR.",
    setting: "dispatch",
    audiences: ["ems"],
    level: "advanced",
    minutes: 10,
    focus: ["Two-question recognition", "Telephone CPR", "“We need to do CPR”", "AED retrieval"],
    role: "You are the call-taker in an integrated emergency dispatch centre. You can dispatch ambulances and alert registered community first responders via the app system. Your AED registry shows the nearest public AED.",
    resources: ["Dispatch system (ambulance, community first-responder alert)", "AED registry", "The caller on the phone"],
    opening:
      "112 emergency call, 7:12 pm. A man’s voice, out of breath:\n\n“Hello? Hello – my wife – she just fell over in the kitchen! She’s lying on the floor and she’s… she’s making these strange snoring noises. Please send someone!”\n\nWhat do you say or do?",
    script: `Setting: you (the learner) are the dispatcher; the model plays the CALLER and reports what happens at the scene. Caller: Mr Becker, 71, at home: Lindenstraße 14, ground floor, front door unlocked. Patient: his wife Ingrid, 68, collapsed in the kitchen, lies on the tiled floor.
Caller behaviour: frightened, needs short, clear instructions; has never done CPR and does not know how to give rescue breaths. Phone can be put on speaker if told. If asked "Do you want to do CPR?" he hesitates ("I… I don't know if I can…"); if told "We need to do CPR" / clear instruction, he starts.
Course of events:
- Unconscious (does not react when he shakes her and shouts her name). Breathing: occasional snoring gasps – the caller will describe it as "she's snoring" / "gasping now and then" if asked whether she is breathing normally.
- About 1–2 turns after CPR is underway, the neighbour Mrs Schulz arrives (second bystander). Per the AED registry: a public AED is at the pharmacy on the corner, ~150 m away (open). If the dispatcher sends Mrs Schulz, she returns with it after about 2 turns while Mr Becker continues compressions.
- A community first responder can be alerted via the system (arrives only after the AED, helps then).
- When the AED arrives: the dispatcher should tell them to switch it on and follow its instructions. 1st analysis → shock advised (system; the caller pushes the button if told to follow the prompts). 2nd analysis (after a further turn) → no shock advised.
- Ambulance crew arrives after the 2nd analysis once CPR has been resumed and takes over; the call ends.
- Ask for location if the dispatcher hasn't (the caller only gives the address when asked).
${COMMON_AED_FLOW}
For this case, aedSteps report what the CALLER/NEIGHBOUR does on the dispatcher's instruction (arrived, powered_on, pads_attached, shock_button_pressed, reanalysis).`,
    ending: "End (handover) when the ambulance crew has arrived and taken over after the 2nd analysis.",
    facts: [
      { id: "location", label: "Location", text: "Lindenstraße 14, ground floor; front door unlocked.", revealWhen: "Dispatcher asks for the address/location." },
      { id: "conscious", label: "Conscious?", text: "Caller: “No – she doesn’t react when I shake her and shout her name.”", revealWhen: "Dispatcher asks whether she is conscious/awake/responding." },
      { id: "breathing", label: "Breathing normally?", text: "Caller: “She’s… snoring, sort of. Every now and then a gasp. Then nothing.”", revealWhen: "Dispatcher asks whether she is breathing normally." },
      { id: "caller_skills", label: "Caller", text: "Has never done CPR, cannot do rescue breaths.", revealWhen: "Dispatcher asks about CPR experience or starts instructions." },
      { id: "neighbour", label: "Second bystander", text: "Neighbour Mrs Schulz has arrived and is available.", revealWhen: "SCRIPT: 1–2 turns after CPR is underway." },
      { id: "aed_registry", label: "AED registry", text: "Public AED in the pharmacy on the corner, ~150 m, open now.", revealWhen: "Dispatcher checks for a nearby AED / asks about an AED." },
    ],
    aed: { type: "semi-automatic", availability: "Public AED in the pharmacy ~150 m away (registry) – needs a second bystander to fetch it.", rhythms: ["shockable", "non-shockable"] },
    checklist: [
      {
        id: "location",
        label: "Establishes the location",
        criteria: "Dispatcher obtains the address/location of the emergency.",
        refs: ["rec-dispatcher", "ev-dispatch-recognition"],
        weight: 1,
      },
      {
        id: "two_questions",
        label: "Uses the two key questions (conscious? breathing normally?)",
        criteria: "Dispatcher asks whether the patient is conscious/responding AND whether she is breathing normally.",
        refs: ["ev-dispatch-recognition", "rec-dispatcher"],
        weight: 2,
      },
      {
        id: "recognise_arrest",
        label: "Recognises cardiac arrest from the description (snoring/gasping)",
        criteria: "Dispatcher identifies snoring/gasping as abnormal breathing = cardiac arrest.",
        refs: ["ev-abnormal-breathing", "ev-dispatch-recognition", "rec-recognition"],
        weight: 3,
        critical: true,
      },
      {
        id: "dispatch_ems",
        label: "Dispatches an ambulance without delay",
        criteria: "Dispatcher sends EMS / tells the caller help is being sent early in the call.",
        refs: ["ev-dispatch-recognition", "ev-alerting"],
        weight: 2,
      },
      {
        id: "cpr_instructions",
        label: "Gives CPR instructions",
        criteria: "Dispatcher instructs the caller to start chest compressions (position the patient on her back, hands in the centre of the chest, push hard and fast, count aloud) and keeps coaching.",
        refs: ["rec-dispatcher", "ev-dispatch-cpr"],
        weight: 3,
        critical: true,
      },
      {
        id: "compression_only",
        label: "Compression-only instructions for an untrained caller",
        criteria: "Dispatcher gives chest-compression-only instructions (assumes the caller cannot do CPR), and would only facilitate 30:2 if the caller says they know rescue breaths.",
        refs: ["rec-dispatcher"],
        weight: 2,
      },
      {
        id: "directive_language",
        label: "Directive, simple language (“We need to do CPR”)",
        criteria: "Dispatcher uses clear, directive wording rather than asking whether the caller wants to do CPR.",
        refs: ["ev-dispatch-cpr"],
        weight: 1,
      },
      {
        id: "speaker_phone",
        label: "Caller on speaker / hands-free",
        criteria: "Dispatcher tells the caller to put the phone on speaker so both hands are free.",
        refs: ["rec-alerting", "fig7-step-by-step"],
        weight: 1,
      },
      {
        id: "ask_aed",
        label: "Asks about an AED once CPR is underway",
        criteria: "After CPR has started, dispatcher asks whether there is an AED / defibrillator at the scene.",
        refs: ["rec-dispatcher", "ev-dispatch-aed"],
        weight: 2,
      },
      {
        id: "guide_to_aed",
        label: "Sends the second bystander to the nearest AED",
        criteria: "Once a second bystander is present, dispatcher sends them to the registered AED while the caller continues compressions.",
        refs: ["rec-dispatcher", "ev-dispatch-aed"],
        weight: 2,
      },
      {
        id: "first_responders",
        label: "Activates community first responders",
        criteria: "Dispatcher alerts registered community volunteer responders via the system.",
        refs: ["rec-dispatcher", "ev-dispatch-aed"],
        weight: 1,
      },
      {
        id: "aed_instructions",
        label: "Instructs: switch on the AED and follow its prompts",
        criteria: "When the AED arrives, dispatcher tells the bystanders to switch it on and follow its instructions (pads on bare chest, nobody touches during analysis/shock, restart compressions).",
        refs: ["rec-dispatcher", "rec-aed-use"],
        weight: 2,
      },
      {
        id: "keep_coaching",
        label: "Stays on the line until EMS takes over",
        criteria: "Dispatcher keeps coaching (compressions restarted after shock/no-shock) until the ambulance crew arrives.",
        refs: ["rec-dispatcher", "fig3-algorithm"],
        weight: 1,
      },
    ],
    pitfalls: [
      {
        id: "missed_abnormal_breathing",
        label: "Accepted “snoring” as breathing",
        criteria: "Dispatcher treats snoring/gasping as normal breathing (e.g. advises recovery position or waiting for the ambulance) and delays CPR instructions.",
        refs: ["ev-abnormal-breathing", "ev-dispatch-recognition"],
      },
      {
        id: "asks_willingness",
        label: "Asked “Do you want to do CPR?”",
        criteria: "Dispatcher asks the caller whether they want to/can do CPR instead of giving a clear instruction.",
        refs: ["ev-dispatch-cpr"],
      },
      {
        id: "sent_only_rescuer",
        label: "Sent the only rescuer away for an AED",
        criteria: "Dispatcher sends Mr Becker (while he is alone) to fetch an AED, interrupting CPR.",
        refs: ["rec-dispatcher", "fig7-step-by-step"],
      },
      {
        id: "delayed_cpr_instructions",
        label: "Too many questions before CPR instructions",
        criteria: "Dispatcher asks many non-essential questions (medical history, medication etc.) before starting CPR instructions.",
        refs: ["ev-dispatch-recognition", "ev-abnormal-breathing"],
      },
      pit.touchDuringAnalysis(),
      pit.delayAfterShock(),
    ],
    teaching: [
      { ref: "rec-dispatcher", quote: "Dispatchers should assume the caller does not know how to perform CPR and provide chest-compression-only instructions." },
      { ref: "rec-dispatcher", quote: "Once CPR is underway, dispatchers should ask if there is an ‘AED’ or ‘defibrillator’ at the scene." },
      { ref: "ev-dispatch-cpr", quote: "Modifying the statement “Do you want to do CPR” to “We need to do CPR” increased the number of cases where CPR was actually peformed" },
      { ref: "ev-abnormal-breathing", quote: "Common terms used by lay people to describe agonal breathing include gasping, barely or occasionally breathing, moaning, sighing, gurgling, noisy, groaning, snorting, heavy or laboured breathing." },
    ],
  },

  /* 7 ------------------------------------------------------------------ */
  {
    id: "bls-ems-bvm-home",
    module: "bls",
    number: 7,
    title: "First on scene: bag-mask CPR at home",
    teaser: "Your ambulance arrives first. A 132 kg patient in bed, no bystander CPR.",
    setting: "out-of-hospital",
    audiences: ["ems", "physician"],
    level: "advanced",
    minutes: 12,
    focus: ["Obesity: standard 30:2", "CPR on the bed", "Bag-mask ventilation", "Interruptions & feedback"],
    role: "You are the team leader of a two-person ambulance crew (BLS phase). Your colleague Elif is with you. The emergency physician is on the way.",
    resources: [
      "Colleague (paramedic) Elif",
      "Defibrillator used in AED mode",
      "Bag-valve-mask with oxygen",
      "CPR feedback device (accelerometer puck) in the kit",
    ],
    opening:
      "Dispatch: “Male, 61, collapsed in bed, wife on the phone, CPR not started.” You arrive 7 minutes later at a third-floor flat. The wife opens the door: “He’s in the bedroom – I couldn’t do anything, he’s too heavy!”\n\nIn the bedroom, Mr Schmid (about 132 kg) lies on his back in a soft double bed.\n\nWhat do you do?",
    script: `Setting: small bedroom, double bed with a soft mattress, very little floor space beside the bed (furniture). Patient: Mr Schmid, 61 y, ~132 kg (obesity). Unwitnessed by the crew; no bystander CPR.
People: Elif (paramedic) follows the learner's instructions; the wife is in the doorway. The emergency physician arrives after the 2nd analysis.
Course of events:
- Unresponsive, no normal breathing (no breathing movements), no signs of life.
- Moving him to the floor: very little floor space, two rescuers for 132 kg – would take about 1–2 minutes without compressions.
- CPR on the soft mattress: effective depth needs firmer/deeper compressions to compensate for the mattress.
- Bag-valve-mask: with head tilt–chin lift and a good mask seal, the chest begins to rise with each breath of about 1 s. If breaths are given forcefully/large, the stomach distends (narrate objectively) – pitfall. If the pause for two breaths takes long (>10 s), narrate the long hands-off time.
- Feedback device: available. If the learner asks: it shows depth/rate. Not mandatory.
- Defibrillator in AED mode: 1st analysis → no shock advised; 2nd analysis (after a further turn) → no shock advised.
- The emergency physician arrives after the 2nd analysis once CPR is resumed; ALS (airway, IV/IO, drugs) starts – outside this BLS case → case ends with handover.
- Advanced airway/drugs requested by the learner before handover: not part of this BLS-phase scenario; Elif reminds that the physician is 1–2 minutes away and both hands are needed for CPR.
${COMMON_AED_FLOW}`,
    ending: "End (handover) when the emergency physician has arrived after the 2nd analysis and takes over.",
    facts: [
      { id: "response", label: "Response", text: "No reaction to voice or shaking.", revealWhen: "Learner checks responsiveness." },
      { id: "breathing", label: "Breathing / signs of life", text: "No breathing movements, no signs of life.", revealWhen: "Learner checks breathing/signs of life." },
      { id: "room", label: "Room", text: "Soft double bed; very little floor space beside the bed; the patient weighs about 132 kg.", revealWhen: "Learner looks at the room / considers moving the patient." },
      { id: "bvm", label: "Ventilation", text: "With head tilt–chin lift and a good seal, each breath of about 1 s makes the chest begin to rise.", revealWhen: "Learner ventilates with the bag-valve-mask." },
      { id: "feedback", label: "Feedback device", text: "Accelerometer puck available; shows compression depth and rate.", revealWhen: "Learner uses or asks for the feedback device." },
    ],
    aed: { type: "semi-automatic", availability: "Crew defibrillator in AED mode – at the bedside with the crew.", rhythms: ["non-shockable", "non-shockable"] },
    checklist: [
      item.response(),
      {
        id: "breathing_signs_of_life",
        label: "Checks breathing and signs of life (≤ 10 s)",
        criteria: "Learner opens the airway and checks breathing/signs of life for no more than 10 seconds.",
        refs: ["fig7-step-by-step", "fig3-algorithm"],
        weight: 1,
      },
      item.startCpr(),
      {
        id: "cpr_on_bed",
        label: "Starts CPR on the bed – compresses deeper to compensate",
        criteria: "Compressions are started on the bed without first moving the patient to the floor; learner compensates for the soft mattress (deeper/firm compressions).",
        refs: ["rec-compressions", "ev-firm-surface"],
        weight: 2,
      },
      {
        id: "standard_cpr_obesity",
        label: "Standard CPR despite obesity (no modifications)",
        criteria: "Learner applies standard technique and 30:2 (or CCC with asynchronous ventilation) – no altered ratio or other modifications because of body weight.",
        refs: ["ev-obesity", "table1-changes"],
        weight: 2,
      },
      item.cprQuality(),
      {
        id: "bvm_technique",
        label: "Bag-mask breaths: ~1 s, chest just begins to rise, pause ≤ 10 s",
        criteria: "Learner/Elif ventilates 30:2 with BVM (or CCC with asynchronous ventilation): inflation of about 1 s, just enough volume for the chest to begin to rise, no forceful breaths, max. 10 s interruption for two breaths.",
        refs: ["ev-rescue-breaths", "rec-rescue-breaths", "ev-compression-only"],
        weight: 2,
      },
      {
        id: "aed_early",
        label: "Defibrillator (AED mode) attached early, CPR continues meanwhile",
        criteria: "Defibrillator pads are attached as soon as possible while compressions continue.",
        refs: ["rec-aed-use", "ev-aed-how-when"],
        weight: 2,
      },
      item.clear(),
      item.resumeCpr(),
      {
        id: "minimise_interruptions",
        label: "Minimises hands-off time",
        criteria: "Learner explicitly organises CPR to minimise interruptions (e.g. pre-planned roles, short pauses for breaths/analysis only).",
        refs: ["ev-interruptions", "rec-compressions"],
        weight: 1,
      },
      item.continueUntilHandover("the emergency physician"),
    ],
    pitfalls: [
      pit.longAssessment(),
      {
        id: "moved_to_floor",
        label: "Moved the patient to the floor before CPR",
        criteria: "Learner moves (or attempts to move) the patient from the bed to the floor before starting compressions.",
        refs: ["rec-compressions", "ev-firm-surface"],
      },
      {
        id: "modified_for_obesity",
        label: "Modified CPR because of obesity",
        criteria: "Learner changes ratio/technique because of body weight (e.g. 15:2, compression-only without ventilation plan, other modifications).",
        refs: ["ev-obesity", "table1-changes"],
      },
      pit.excessiveVentilation(),
      pit.touchDuringAnalysis(),
      pit.delayAfterShock(),
      pit.stoppedTooEarly(),
    ],
    teaching: [
      { ref: "table1-changes", quote: "The 2025 ERC BLS Guidelines advise that obese patients receive standard 30:2 CPR without modifications." },
      { ref: "rec-compressions", quote: "However, rescuers should not move a person from a ‘soft’ surface e.g. bed, to the floor." },
      { ref: "ev-rescue-breaths", quote: "Rescuers should aim for an inflation duration of about 1 s, with sufficient volume to make the chest begin to rise, but avoid rapid or forceful breaths." },
      { ref: "ev-compression-only", quote: "HCPs may perform either CPR with a ratio of 30 compressions to 2 ventilations, or CCC with asynchronous positive-pressure ventilations, until such time as the airway has been secured with a tracheal tube or supraglottic airway device." },
      { ref: "ev-feedback-devices", quote: "feedback devices are unlikely to improve clinical outcome for the patient directly in front of you." },
    ],
  },
];

/**
 * Pitfalls that cancel a checklist item: doing the right thing late or wrongly does not earn the
 * item (e.g. calling 112 only after a 30-second assessment is not "calling immediately").
 */
const BLOCKED_BY: Record<string, string[]> = {
  call_ems: ["delayed_call"],
  speaker_mode: ["ended_call"],
  assess_breathing: ["prolonged_assessment"],
  breathing_signs_of_life: ["prolonged_assessment"],
  recognise_arrest: ["missed_abnormal_breathing"],
  send_for_aed: ["left_patient_for_aed"],
  start_cpr: ["missed_abnormal_breathing"],
  cpr_on_bed: ["moved_to_floor"],
  ventilation_hcp: ["excessive_ventilation"],
  bvm_technique: ["excessive_ventilation"],
  stay_with_patient: ["left_to_find_aed"],
  pads_during_cpr: ["cpr_paused_for_pads"],
  aed_early: ["cpr_paused_for_pads"],
  nobody_touches: ["touch_during_analysis"],
  shock_without_delay: ["delayed_shock"],
  resume_cpr: ["delay_after_analysis"],
  recognise_recovery: ["stopped_cpr_prematurely"],
  continue_until_handover: ["stopped_cpr_prematurely"],
  bare_skin: ["modesty_delay", "pads_not_on_skin", "unnecessary_bra_removal"],
  address_modesty: ["modesty_delay"],
  pad_position: ["pads_not_on_skin"],
  standard_cpr_obesity: ["modified_for_obesity"],
  directive_language: ["asks_willingness"],
  cpr_instructions: ["delayed_cpr_instructions"],
  guide_to_aed: ["sent_only_rescuer"],
  minimise_interruptions: ["cpr_paused_for_pads", "delay_after_analysis", "excessive_ventilation"],
};
for (const c of BLS_CASES) {
  for (const it of c.checklist) {
    it.blockedBy = (BLOCKED_BY[it.id] ?? []).filter((pid) => c.pitfalls.some((p) => p.id === pid));
  }
}

export function getCase(id: string): SimCase | undefined {
  return BLS_CASES.find((c) => c.id === id);
}
