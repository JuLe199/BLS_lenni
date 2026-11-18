/**
 * AED training module – content.
 *
 * Same rule as the cases: every teaching statement is a VERBATIM quote from the
 * ERC Guidelines 2025 Adult BLS (checked by `npm run verify:content`).
 * Headings, questions and answer options are authored; explanations are quotes.
 */

export interface Quote {
  ref: string;
  quote: string;
}

export interface AedLesson {
  id: string;
  title: string;
  /** One neutral sentence that introduces the lesson (no clinical claims). */
  intro: string;
  points: Quote[];
}

export const AED_LESSONS: AedLesson[] = [
  {
    id: "what",
    title: "What an AED does – and why minutes count",
    intro: "An AED analyses the heart rhythm through its pads and tells you exactly what to do.",
    points: [
      { ref: "ev-aed-intro", quote: "An automated external defibrillator (AED) is a portable, battery-powered device that includes adhesive defibrillation pads to attach to a patient’s chest to detect the heart rhythm following suspected cardiac arrest." },
      { ref: "ev-aed-intro", quote: "AEDs are accurate in their interpretation of the heart rhythm and are safe and effective when used by laypeople." },
      { ref: "ev-aed-intro", quote: "If the rhythm is a shockable rhythm (ventricular fibrillation or pulseless ventricular tachycardia), an audible (and sometimes visual) prompt is given to the operator to deliver a direct current electric shock (defibrillation) to re-establish a coordinated heart rhythm." },
      { ref: "ev-aed-intro", quote: "For other heart rhythms (including asystole and a normal rhythm), no shock is advised." },
      { ref: "ev-aed-intro", quote: "Among patients in a shockable rhythm, each minute delay to defibrillation is associated with 6 % higher probability of failure to terminate VF, and 3–6 % lower probability of survival to discharge." },
    ],
  },
  {
    id: "find",
    title: "Finding and fetching an AED",
    intro: "The AED has to reach the patient – without stopping CPR.",
    points: [
      { ref: "rec-aed-find", quote: "Anyone can use an Automated External Defibrillator (AED)." },
      { ref: "rec-aed-find", quote: "The local emergency service should be able to direct callers to the nearest available AED." },
      { ref: "fig7-step-by-step", quote: "Send someone to find and bring back an AED, if available." },
      { ref: "fig7-step-by-step", quote: "If you are on your own, fetch an AED only if you can get and apply it within one minute; otherwise, start CPR immediately." },
      { ref: "ev-aed-how-when", quote: "CPR should not be delayed whilst locating and retrieving an AED, but as soon as an AED has been brought to the patient’s side, it should be attached to the patient." },
    ],
  },
  {
    id: "use",
    title: "Using the AED step by step",
    intro: "Switch on, attach the pads, follow the prompts – and keep compressions going whenever the device allows.",
    points: [
      { ref: "ev-aed-how-when", quote: "An AED should only be attached to a person who is unresponsive with abnormal breathing." },
      { ref: "rec-aed-use", quote: "Use an AED as soon as it is available." },
      { ref: "rec-aed-use", quote: "Some AEDs automatically turn on when opened. If not, identify the power button and turn it on." },
      { ref: "rec-aed-use", quote: "Follow the audio/visual prompts from the AED." },
      { ref: "rec-aed-use", quote: "If more than one rescuer is present, continue CPR while the defibrillation pads are being attached." },
      { ref: "rec-aed-use", quote: "Ensure that nobody touches the person whilst the AED is analysing the heart rhythm." },
      { ref: "rec-aed-use", quote: "Some AEDs (fully automatic AEDs) will deliver a shock automatically, while others (semi-automatic AEDs) will require the rescuer to press the shock button to deliver the shock." },
      { ref: "ev-cpr-before-defib", quote: "Defibrillation should not be delayed to provide additional CPR." },
      { ref: "rec-aed-use", quote: "After the shock has been delivered, immediately restart chest compressions." },
      { ref: "rec-aed-use", quote: "If no shock is indicated, immediately restart CPR chest compressions." },
      { ref: "rec-aed-use", quote: "Usually, the AED will instruct the rescuer to perform CPR, then, after a set time interval the AED will instruct the rescuer to pause CPR to undertake rhythm analysis." },
    ],
  },
  {
    id: "pads",
    title: "Where the pads go",
    intro: "Standard is the anterior-lateral position shown on the pads themselves.",
    points: [
      { ref: "ev-pad-position", quote: "One defibrillation pad should be positioned below the patient’s right clavicle, just to the right of the upper sternal border." },
      { ref: "ev-pad-position", quote: "The other defibrillation pad should be centred on the patient’s left mid-axillary line, below the armpit." },
      { ref: "ev-pad-position", quote: "Pad placement should avoid breast tissue if possible." },
      { ref: "ev-pad-position", quote: "ILCOR has issued a good practice statement that recommends following the manufacturer’s AED guidance and instructions for adult pad placement." },
      { ref: "ev-pad-position", quote: "If the anterior-lateral pad position is not feasible, then the rescuer can consider using the anterior-posterior pad position if trained (Fig. 6)." },
      { ref: "ev-bra", quote: "AED adhesive pads should be placed onto bare skin." },
      { ref: "ev-bra", quote: "If this can be quickly accomplished without unfastening or cutting the bra then, it is acceptable to leave the bra in place." },
      { ref: "ev-bra", quote: "Rescuers should not be concerned about exposing the persons chest to apply defibrillation pads." },
    ],
  },
  {
    id: "safety",
    title: "Safety and typical errors",
    intro: "The device is safe – most errors come from how we interact with it.",
    points: [
      { ref: "rec-safety", quote: "The risk of harm to rescuers, from accidental shock during AED use, is low." },
      { ref: "fig7-step-by-step-2", quote: "If a shock is advised, ensure that neither you nor anyone else is touching the victim." },
      { ref: "ev-aed-safety", quote: "Errors in AED use most commonly occur because of problems with how the operator interacts with the AED, rather than faults in or malfunction of the device itself, and include continuing CPR during rhythm analysis, not delivering a shock when instructed and premature removal of the AED." },
      { ref: "ev-aed-safety", quote: "The ERC recommends the use of AEDs as they are safe to use and present a low risk of injury to rescuers." },
    ],
  },
];

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: Quote;
}

export const AED_QUIZ: QuizQuestion[] = [
  {
    id: "who",
    question: "Who may use a public-access AED?",
    options: ["Only healthcare professionals", "Only people with an AED course certificate", "Anyone", "Only the emergency medical services"],
    correct: 2,
    explanation: { ref: "rec-aed-find", quote: "Anyone can use an Automated External Defibrillator (AED)." },
  },
  {
    id: "alone",
    question: "You are alone with a person in cardiac arrest. The nearest AED is about 3 minutes away. What do you do?",
    options: ["Run and get the AED first", "Start CPR immediately", "Wait for someone to pass by", "Check the pulse for one minute"],
    correct: 1,
    explanation: { ref: "fig7-step-by-step", quote: "If you are on your own, fetch an AED only if you can get and apply it within one minute; otherwise, start CPR immediately." },
  },
  {
    id: "pads_cpr",
    question: "Two rescuers, the AED has just arrived. What happens with chest compressions while the pads are attached?",
    options: ["Stop CPR until the pads are on", "Continue CPR while the pads are attached", "Give two rescue breaths instead", "Pause CPR and check breathing"],
    correct: 1,
    explanation: { ref: "rec-aed-use", quote: "If more than one rescuer is present, continue CPR while the defibrillation pads are being attached." },
  },
  {
    id: "analysis",
    question: "The AED says: “Analysing heart rhythm.” What is most important now?",
    options: ["Keep compressing so no time is lost", "Nobody touches the patient", "Remove the pads to check the skin", "Give rescue breaths"],
    correct: 1,
    explanation: { ref: "rec-aed-use", quote: "Ensure that nobody touches the person whilst the AED is analysing the heart rhythm." },
  },
  {
    id: "shockable",
    question: "Which heart rhythms are shockable?",
    options: ["Asystole and normal rhythm", "Ventricular fibrillation and pulseless ventricular tachycardia", "Every rhythm in cardiac arrest", "Only a slow heart rate"],
    correct: 1,
    explanation: { ref: "ev-aed-intro", quote: "If the rhythm is a shockable rhythm (ventricular fibrillation or pulseless ventricular tachycardia), an audible (and sometimes visual) prompt is given to the operator to deliver a direct current electric shock (defibrillation) to re-establish a coordinated heart rhythm." },
  },
  {
    id: "after_shock",
    question: "The shock has been delivered. What next?",
    options: ["Check for a pulse first", "Wait for the next analysis", "Immediately restart chest compressions", "Remove the pads"],
    correct: 2,
    explanation: { ref: "rec-aed-use", quote: "After the shock has been delivered, immediately restart chest compressions." },
  },
  {
    id: "no_shock",
    question: "The AED says “No shock advised”. What does that mean for you?",
    options: ["The patient has recovered – stop CPR", "Immediately restart CPR", "Switch the AED off", "Move the pads and try again"],
    correct: 1,
    explanation: { ref: "rec-aed-use", quote: "If no shock is indicated, immediately restart CPR chest compressions." },
  },
  {
    id: "position",
    question: "Standard (anterior-lateral) pad position – where does the first pad go?",
    options: ["Over the centre of the breastbone", "Below the right clavicle, just right of the upper sternum", "On the left shoulder", "On the upper abdomen"],
    correct: 1,
    explanation: { ref: "ev-pad-position", quote: "One defibrillation pad should be positioned below the patient’s right clavicle, just to the right of the upper sternal border." },
  },
  {
    id: "bra",
    question: "The patient wears an underwired bra. What is correct?",
    options: ["Never use an AED with a metal underwire", "Always cut the bra off first", "Pads on bare skin – leaving the bra in place is acceptable if that is quick", "Place the pads over the clothing"],
    correct: 2,
    explanation: { ref: "ev-bra", quote: "If this can be quickly accomplished without unfastening or cutting the bra then, it is acceptable to leave the bra in place." },
  },
  {
    id: "fully_auto",
    question: "What is the difference between a fully automatic and a semi-automatic AED?",
    options: ["The fully automatic AED delivers the shock itself", "Only the semi-automatic AED analyses the rhythm", "The fully automatic AED needs no pads", "There is no difference"],
    correct: 0,
    explanation: { ref: "rec-aed-use", quote: "Some AEDs (fully automatic AEDs) will deliver a shock automatically, while others (semi-automatic AEDs) will require the rescuer to press the shock button to deliver the shock." },
  },
];

/* ---------------------------------------------------------------- step-by-step drill
 * Two rescuers, semi-automatic AED. Each stage offers one correct action and distractors.
 * The correct action drives the same deterministic AED state machine used in the cases.
 */
export type DrillEffect = "power_on" | "pads" | "shock" | "cpr_on" | "reanalysis" | "finish";

export interface DrillChoice {
  text: string;
  correct?: boolean;
  /** Why it is wrong (verbatim) – or, for the correct choice, the backing quote. */
  why: Quote;
}

export interface DrillStage {
  id: string;
  situation: string;
  effect: DrillEffect;
  choices: DrillChoice[];
}

export const AED_DRILL: DrillStage[] = [
  {
    id: "arrives",
    situation: "Your colleague is doing chest compressions. The AED has just been brought to the patient’s side.",
    effect: "power_on",
    choices: [
      { text: "Give two more minutes of CPR before using the AED", why: { ref: "ev-aed-how-when", quote: "CPR should not be delayed whilst locating and retrieving an AED, but as soon as an AED has been brought to the patient’s side, it should be attached to the patient." } },
      { text: "Open the AED and switch it on", correct: true, why: { ref: "rec-aed-use", quote: "Some AEDs automatically turn on when opened. If not, identify the power button and turn it on." } },
      { text: "Ask everyone to stop CPR while you read the instructions", why: { ref: "rec-aed-use", quote: "Follow the audio/visual prompts from the AED." } },
    ],
  },
  {
    id: "pads",
    situation: "The AED prompts you to attach the pads. Your colleague is still compressing.",
    effect: "pads",
    choices: [
      { text: "Ask your colleague to stop CPR so you can attach the pads", why: { ref: "rec-aed-use", quote: "If more than one rescuer is present, continue CPR while the defibrillation pads are being attached." } },
      { text: "Place the pads over the T-shirt to save time", why: { ref: "ev-bra", quote: "AED adhesive pads should be placed onto bare skin." } },
      { text: "Bare the chest and attach the pads while CPR continues", correct: true, why: { ref: "rec-aed-use", quote: "If more than one rescuer is present, continue CPR while the defibrillation pads are being attached." } },
    ],
  },
  {
    id: "shock",
    situation: "“Analysing heart rhythm. Do not touch the patient.” – then: “Shock advised. Stand clear. Press the flashing shock button now.”",
    effect: "shock",
    choices: [
      { text: "Make sure nobody touches the patient, then press the shock button", correct: true, why: { ref: "fig7-step-by-step-2", quote: "If a shock is advised, ensure that neither you nor anyone else is touching the victim." } },
      { text: "Do another round of CPR first, then shock", why: { ref: "ev-cpr-before-defib", quote: "Defibrillation should not be delayed to provide additional CPR." } },
      { text: "Keep compressing while the AED analyses and charges", why: { ref: "rec-aed-use", quote: "Ensure that nobody touches the person whilst the AED is analysing the heart rhythm." } },
    ],
  },
  {
    id: "after_shock",
    situation: "“Shock delivered. Start CPR now.”",
    effect: "cpr_on",
    choices: [
      { text: "Wait and watch whether the patient wakes up", why: { ref: "rec-aed-use", quote: "After the shock has been delivered, immediately restart chest compressions." } },
      { text: "Immediately restart chest compressions", correct: true, why: { ref: "rec-aed-use", quote: "After the shock has been delivered, immediately restart chest compressions." } },
      { text: "Remove the pads – the shock is done", why: { ref: "ev-aed-safety", quote: "Errors in AED use most commonly occur because of problems with how the operator interacts with the AED, rather than faults in or malfunction of the device itself, and include continuing CPR during rhythm analysis, not delivering a shock when instructed and premature removal of the AED." } },
    ],
  },
  {
    id: "reanalysis",
    situation: "After a while of CPR the AED prompts: “Stop CPR. Analysing heart rhythm. Do not touch the patient.”",
    effect: "reanalysis",
    choices: [
      { text: "Keep compressing – every compression counts", why: { ref: "ev-aed-safety", quote: "Errors in AED use most commonly occur because of problems with how the operator interacts with the AED, rather than faults in or malfunction of the device itself, and include continuing CPR during rhythm analysis, not delivering a shock when instructed and premature removal of the AED." } },
      { text: "Hands off – nobody touches the patient during the analysis", correct: true, why: { ref: "rec-aed-use", quote: "Ensure that nobody touches the person whilst the AED is analysing the heart rhythm." } },
    ],
  },
  {
    id: "no_shock",
    situation: "“No shock advised. Start CPR now.” The patient is still unresponsive and not breathing normally.",
    effect: "finish",
    choices: [
      { text: "Stop – no shock means the heart is beating again", why: { ref: "fig7-step-by-step-2", quote: "It is rare for CPR alone to restart the heart. Unless you are certain that the victim has recovered, continue CPR." } },
      { text: "Immediately restart CPR and keep following the AED until EMS takes over", correct: true, why: { ref: "rec-aed-use", quote: "If no shock is indicated, immediately restart CPR chest compressions." } },
    ],
  },
];

/* ---------------------------------------------------------------- pad placement exercise */
export type PadZone = "r_clav" | "l_axilla" | "sternum" | "l_clav" | "l_breast" | "abdomen";

export const PAD_ZONES: { id: PadZone; label: string; correct: boolean; why: Quote }[] = [
  { id: "r_clav", label: "Below the right clavicle, right of the upper sternum", correct: true, why: { ref: "ev-pad-position", quote: "One defibrillation pad should be positioned below the patient’s right clavicle, just to the right of the upper sternal border." } },
  { id: "l_axilla", label: "Left mid-axillary line, below the armpit", correct: true, why: { ref: "ev-pad-position", quote: "The other defibrillation pad should be centred on the patient’s left mid-axillary line, below the armpit." } },
  { id: "sternum", label: "Centre of the breastbone", correct: false, why: { ref: "ev-pad-position", quote: "For most manufacturers this will mean placing defibrillation pads on the front of the persons chest and their left side (the anterior-lateral position)." } },
  { id: "l_clav", label: "Below the left clavicle", correct: false, why: { ref: "ev-pad-position", quote: "One defibrillation pad should be positioned below the patient’s right clavicle, just to the right of the upper sternal border." } },
  { id: "l_breast", label: "Over the left breast", correct: false, why: { ref: "ev-pad-position", quote: "Pad placement should avoid breast tissue if possible." } },
  { id: "abdomen", label: "Upper abdomen", correct: false, why: { ref: "ev-pad-position", quote: "The other defibrillation pad should be centred on the patient’s left mid-axillary line, below the armpit." } },
];

/** All verbatim quotes of the module (for verify:content). */
export function aedTrainingQuotes(): Quote[] {
  return [
    ...AED_LESSONS.flatMap((l) => l.points),
    ...AED_QUIZ.map((q) => q.explanation),
    ...AED_DRILL.flatMap((d) => d.choices.map((c) => c.why)),
    ...PAD_ZONES.map((z) => z.why),
  ];
}
