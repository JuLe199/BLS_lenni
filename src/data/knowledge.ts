/**
 * Knowledge sections ("Wissensvermittlung") for BLS and ALS.
 *
 * Chapters follow the order of the respective ERC Guidelines 2025 chapter.
 * Same rule as everywhere: every teaching statement is a VERBATIM quote from the guideline
 * (checked by `npm run verify:content`). Titles, intros, questions and options are authored.
 */
import type { Quote, QuizQuestion } from "@/data/aed-training";

export interface KnowledgeChapter {
  id: string;
  title: string;
  /** One neutral sentence that introduces the chapter (no clinical claims). */
  intro: string;
  points: Quote[];
  /** Optional link to practise this chapter. */
  practice?: { href: string; label: string };
}

export interface KnowledgeModule {
  id: "bls" | "als";
  title: string;
  subtitle: string;
  chapters: KnowledgeChapter[];
  quiz: QuizQuestion[];
}

/* ====================================================================== BLS */

const BLS_CHAPTERS: KnowledgeChapter[] = [
  {
    id: "key",
    title: "Key messages",
    intro: "The guideline opens with a handful of key messages – they frame everything that follows.",
    points: [
      { ref: "fig1-key-messages", quote: "Learn how to recognise a cardiac arrest." },
      { ref: "fig1-key-messages", quote: "Call emergency medical services without delay, even if uncertain." },
      { ref: "fig1-key-messages", quote: "If uncertain, performing CPR will not cause serious injury." },
      { ref: "fig1-key-messages", quote: "Everyone can use an AED, even if they are not trained." },
    ],
  },
  {
    id: "recognition",
    title: "1 · Recognising cardiac arrest",
    intro: "Recognition is the first link: unresponsive plus abnormal breathing.",
    points: [
      { ref: "rec-recognition", quote: "Ensure it is safe to approach." },
      { ref: "rec-recognition", quote: "Suspect cardiac arrest in any person who is unresponsive (Fig. 2)." },
      { ref: "rec-recognition", quote: "Slow, laboured breathing, as well as other abnormal patterns such as agonal gasping or panting, must be recognised as signs of cardiac arrest." },
      { ref: "rec-recognition", quote: "A short period of seizure-like activity may occur at the onset of cardiac arrest. Once the seizure stops, assess breathing." },
      { ref: "ev-abnormal-breathing", quote: "Agonal breathing is frequently misinterpreted as a sign of life." },
      { ref: "rec-recognition", quote: "If there is any doubt, assume cardiac arrest and start CPR (Fig. 3)." },
    ],
    practice: { href: "/bls", label: "BLS cases" },
  },
  {
    id: "alerting",
    title: "2 · Alerting the emergency services",
    intro: "Calling early brings the dispatcher, the AED and the professional team.",
    points: [
      { ref: "rec-alerting", quote: "If you have a mobile phone, activate speaker mode, call the local emergency number without delay." },
      { ref: "rec-alerting", quote: "Assess breathing while you wait for the call to be answered." },
      { ref: "rec-alerting", quote: "If you think no-one will come to help, then you will have to leave the person to alert the local emergency service." },
      { ref: "fig3-algorithm", quote: "In-hospital: Check for breathing and signs of life. Request AED or defibrillator. Alert resuscitation team." },
    ],
  },
  {
    id: "dispatcher",
    title: "3 · The role of the dispatcher",
    intro: "The dispatcher is part of the team – recognising the arrest and coaching the caller.",
    points: [
      { ref: "rec-dispatcher", quote: "Dispatchers should use standardised protocols to facilitate recognition of cardiac arrest." },
      { ref: "rec-dispatcher", quote: "Once cardiac arrest is recognised, dispatchers should provide CPR instructions to all callers." },
      { ref: "rec-dispatcher", quote: "Dispatchers should assume the caller does not know how to perform CPR and provide chest-compression-only instructions." },
      { ref: "rec-dispatcher", quote: "Once CPR is underway, dispatchers should ask if there is an ‘AED’ or ‘defibrillator’ at the scene." },
    ],
  },
  {
    id: "compressions",
    title: "4 · High-quality chest compressions",
    intro: "Compressions are the core of BLS – where, how deep, how fast.",
    points: [
      { ref: "rec-compressions", quote: "Commence chest compressions as soon as possible." },
      { ref: "rec-compressions", quote: "Place the heel of one hand on the lower half of the sternum (‘in the centre of the chest’)." },
      { ref: "rec-compressions", quote: "Compress to a depth of at least 5 cm, but not more than 6 cm." },
      { ref: "rec-compressions", quote: "Compress the chest at a rate of 100–120 min⁻¹ with as few interruptions as possible." },
      { ref: "rec-compressions", quote: "Allow the chest to recoil completely after each compression; avoid leaning on the chest." },
      { ref: "rec-compressions", quote: "Start CPR on the bed and, if needed, compress the chest deeper to compensate for the soft mattress." },
    ],
  },
  {
    id: "breaths",
    title: "5 · Rescue breaths",
    intro: "Trained rescuers combine compressions and breaths.",
    points: [
      { ref: "rec-rescue-breaths", quote: "If you have been trained to provide rescue breaths, alternate 30 chest compressions with 2 rescue breaths." },
      { ref: "rec-rescue-breaths", quote: "When providing rescue breaths, deliver just enough air to make the chest start to rise; avoid excessive ventilation." },
      { ref: "rec-rescue-breaths", quote: "If you are not trained to provide rescue breaths, perform continuous chest compressions, without interruptions." },
    ],
  },
  {
    id: "aed",
    title: "6 · Using an AED",
    intro: "The AED chapter has its own training module with pad placement, a drill and a quiz.",
    points: [
      { ref: "three-steps", quote: "As soon as an AED is available, attach it and follow the AED instructions." },
      { ref: "rec-aed-use", quote: "If more than one rescuer is present, continue CPR while the defibrillation pads are being attached." },
      { ref: "rec-aed-use", quote: "After the shock has been delivered, immediately restart chest compressions." },
    ],
    practice: { href: "/aed", label: "AED training" },
  },
  {
    id: "safety",
    title: "7 · Safety",
    intro: "Rescuers often worry about harm – the guideline addresses this directly.",
    points: [
      { ref: "rec-safety", quote: "Ensure the safety of yourself, the person in cardiac arrest, and any bystanders (Fig. 7)." },
      { ref: "rec-safety", quote: "Lay people should commence CPR for presumed cardiac arrest without concerns of harm to patients not in cardiac arrest." },
      { ref: "rec-safety", quote: "The risk of harm to rescuers, from accidental shock during AED use, is low." },
    ],
  },
];

const BLS_QUIZ: QuizQuestion[] = [
  {
    id: "gasping",
    question: "A collapsed man is unresponsive and takes slow, gasping breaths every few seconds. How do you interpret this?",
    options: ["Normal breathing – recovery position", "A sign of cardiac arrest", "A seizure – wait until it stops", "A sign of an airway obstruction only"],
    correct: 1,
    explanation: { ref: "rec-recognition", quote: "Slow, laboured breathing, as well as other abnormal patterns such as agonal gasping or panting, must be recognised as signs of cardiac arrest." },
  },
  {
    id: "doubt",
    question: "You are unsure whether the person is in cardiac arrest. What does the guideline recommend?",
    options: ["Wait for the ambulance", "Check the pulse for 30 seconds", "Assume cardiac arrest and start CPR", "Put the person in the recovery position"],
    correct: 2,
    explanation: { ref: "rec-recognition", quote: "If there is any doubt, assume cardiac arrest and start CPR (Fig. 3)." },
  },
  {
    id: "phone",
    question: "You have a mobile phone. How do you call for help?",
    options: ["Start CPR first, call after 2 minutes", "Activate speaker mode and call the emergency number without delay", "Send a text message", "Call a relative first"],
    correct: 1,
    explanation: { ref: "rec-alerting", quote: "If you have a mobile phone, activate speaker mode, call the local emergency number without delay." },
  },
  {
    id: "depth",
    question: "How deep should chest compressions in an adult be?",
    options: ["About 3–4 cm", "At least 5 cm, but not more than 6 cm", "At least 7 cm", "As deep as possible"],
    correct: 1,
    explanation: { ref: "rec-compressions", quote: "Compress to a depth of at least 5 cm, but not more than 6 cm." },
  },
  {
    id: "rate",
    question: "Which compression rate is recommended?",
    options: ["60–80 per minute", "80–100 per minute", "100–120 per minute", "130–150 per minute"],
    correct: 2,
    explanation: { ref: "rec-compressions", quote: "Compress the chest at a rate of 100–120 min⁻¹ with as few interruptions as possible." },
  },
  {
    id: "bed",
    question: "The patient lies in a hospital bed. What do you do?",
    options: ["Always move the patient to the floor first", "Start CPR on the bed and compress deeper if needed", "Wait for a backboard before starting", "Only give rescue breaths"],
    correct: 1,
    explanation: { ref: "rec-compressions", quote: "Start CPR on the bed and, if needed, compress the chest deeper to compensate for the soft mattress." },
  },
  {
    id: "ratio",
    question: "You are trained in rescue breaths. Which ratio do you use?",
    options: ["15:2", "30:2", "5:1", "Continuous compressions only"],
    correct: 1,
    explanation: { ref: "rec-rescue-breaths", quote: "If you have been trained to provide rescue breaths, alternate 30 chest compressions with 2 rescue breaths." },
  },
  {
    id: "dispatcher_cpr",
    question: "As a dispatcher, which CPR instructions do you give a caller by default?",
    options: ["30:2 with rescue breaths", "Chest-compression-only instructions", "No instructions until EMS arrives", "Recovery position"],
    correct: 1,
    explanation: { ref: "rec-dispatcher", quote: "Dispatchers should assume the caller does not know how to perform CPR and provide chest-compression-only instructions." },
  },
];

/* ====================================================================== ALS */

const ALS_CHAPTERS: KnowledgeChapter[] = [
  {
    id: "key",
    title: "Key messages",
    intro: "Five key messages summarise the ERC 2025 ALS guideline.",
    points: [
      { ref: "als-fig1-key-messages", quote: "Start advanced life support early - every second counts!" },
      { ref: "als-fig1-key-messages", quote: "Ensure effective ventilation and high-quality chest compressions." },
      { ref: "als-fig1-key-messages", quote: "Defibrillate early for shockable rhythms: use correct antero-lateral defibrillator pad placement; switch to antero-posterior pads if 3 shocks are ineffective." },
      { ref: "als-fig1-key-messages", quote: "Give IV adrenaline early for non-shockable cardiac arrests." },
      { ref: "als-fig1-key-messages", quote: "Identify and treat reversible causes without delay." },
    ],
  },
  {
    id: "prevention",
    title: "1 · Preventing in-hospital cardiac arrest",
    intro: "The guideline starts before the arrest: recognising deterioration and calling for help.",
    points: [
      { ref: "als-rec-prevention-of-in-hospital-cardiac-arrest", quote: "Hospitals use a track and trigger early warning score system for the early identification of patients who are critically ill or at risk of clinical deterioration." },
      { ref: "als-rec-prevention-of-in-hospital-cardiac-arrest", quote: "Hospitals empower all staff to call for help when they identify a patient at risk of physiological deterioration. This includes calls based on clinical concern, rather than solely on vital signs." },
      { ref: "als-rec-prevention-of-in-hospital-cardiac-arrest", quote: "Hospital staff use structured communication tools to ensure effective handover of information." },
    ],
  },
  {
    id: "systems",
    title: "2 · Treating cardiac arrest in and out of hospital",
    intro: "How hospitals and EMS systems should be organised for cardiac arrest.",
    points: [
      { ref: "als-rec-treatment-of-in-hospital-cardiac-arrest", quote: "Hospital systems should aim to recognise cardiac arrest, start CPR immediately, defibrillate rapidly (<3 min) for shockable rhythms, give adrenaline rapidly for non-shockable rhythms, and identify and treat reversible causes." },
      { ref: "als-rec-treatment-of-in-hospital-cardiac-arrest", quote: "The resuscitation team should meet at the beginning of each shift for introductions and allocation of team roles." },
      { ref: "als-rec-treatment-of-out-of-hospital-cardiac-arrest", quote: "Adults with non-traumatic OHCA should be considered for transport to a cardiac arrest centre according to local protocols and take into account which interventions can be provided on scene." },
      { ref: "als-rec-debriefing", quote: "Use data-driven, performance-focused debriefing of rescuers to improve CPR quality and patient outcomes" },
    ],
  },
  {
    id: "algorithm",
    title: "3 · The ALS algorithm",
    intro: "One loop for every adult cardiac arrest: assess the rhythm, treat, two minutes of CPR, reassess.",
    points: [
      { ref: "als-fig2-algorithm", quote: "Unresponsive with absent or abnormal breathing → Start CPR 30:2. Attach defibrillator / monitor. Call EMS / resuscitation team → ASSESS RHYTHM." },
      { ref: "als-fig2-algorithm", quote: "Shockable (VF / pulseless VT) → 1 Shock, Drugs* → Immediately resume chest compressions for 2 minutes." },
      { ref: "als-fig2-algorithm", quote: "Non-shockable (PEA, Asystole) → Give adrenaline every 3-5 minutes → Immediately resume chest compressions for 2 minutes." },
      { ref: "als-fig2-algorithm", quote: "Minimise interruptions to chest compressions. Early IV access (IO if IV not possible)." },
      { ref: "als-rec-cpr-induced-consciousness", quote: "Rescuers may consider using sedative or analgesic drugs (or both) in small doses to prevent pain and distress to patients who are conscious during CPR." },
    ],
    practice: { href: "/als", label: "ALS cases" },
  },
  {
    id: "defib-strategy",
    title: "4 · Defibrillation – strategy and safety",
    intro: "Shock early, keep the pauses short and keep everyone safe.",
    points: [
      { ref: "als-rec-defibrillation-automated-external-defibrillation", quote: "Manual defibrillators should only be used by rescuers who can quickly and accurately identify a cardiac arrest rhythm (within 5 s) and, if needed, deliver a safe shock with minimal interruption (aim for less than 5 s) to chest compressions." },
      { ref: "als-rec-defibrillation-defibrillation-strategy", quote: "Continue CPR while a defibrillator is retrieved and defibrillation pads applied." },
      { ref: "als-rec-defibrillation-defibrillation-strategy", quote: "This is achieved by continuing chest compressions during defibrillator charging, delivering defibrillation aiming for an interruption in chest compressions of less than 5 s and then immediately resuming chest compressions." },
      { ref: "als-rec-defibrillation-defibrillation-strategy", quote: "Immediate defibrillation of (ventricular fibrillation) VF of any amplitude (even fine VF) should be attempted." },
      { ref: "als-rec-defibrillation-safe-and-effective-defibrillation", quote: "Minimise the risk of fire by taking off any oxygen mask, nasal cannulae or bag mask and by placing them at least 1 m away from the patient’s chest." },
      { ref: "als-rec-defibrillation-safe-and-effective-defibrillation", quote: "Do not defibrillate during manual chest compressions (even when wearing clinical gloves), as that practice is not safe to the rescuer." },
    ],
  },
  {
    id: "defib-pads",
    title: "5 · Pads, energy and refractory VF",
    intro: "Where the pads go, how much energy, and what to do when VF persists.",
    points: [
      { ref: "als-rec-defibrillation-defibrillation-pads-and-paddles", quote: "Antero-lateral pad position is the position of choice for initial pad/- paddle placement." },
      { ref: "als-rec-defibrillation-energy-levels-and-number-of-shock", quote: "Use single shocks followed by a 2-minute cycle of chest compressions." },
      { ref: "als-rec-defibrillation-energy-levels-and-number-of-shock", quote: "For biphasic waveforms (rectilinear biphasic or truncated exponential biphasic, but not pulsed biphasic), defibrillation shock energy levels for the first shock is at least 150 J." },
      { ref: "als-rec-defibrillation-energy-levels-and-number-of-shock", quote: "If the rescuer is unaware of the recommended energy settings of the defibrillator, for an adult use the highest energy setting for all shocks." },
      { ref: "als-rec-defibrillation-refractory-ventricular-fibrillati", quote: "For refractory VF, defined as continuous VF after three consecutive shocks, and having ensured correct antero-lateral pad positioning, consider using a defibrillation vector change by using an alternative defibrillation pad position (e.g. antero-posterior)." },
      { ref: "als-rec-defibrillation-defibrillation-pads-and-paddles", quote: "The anterior pad is placed to the left of the sternum, avoiding as much breast tissue as possible. The posterior pad is placed at the same height, centred just medial to the left scapula." },
    ],
  },
  {
    id: "airway",
    title: "6 · Airway and ventilation",
    intro: "Start simple, step up according to skills, and ventilate neither too little nor too much.",
    points: [
      { ref: "als-rec-airway-and-ventilation", quote: "During CPR, start with basic airway techniques and progress stepwise according to the skills of the rescuer until effective ventilation is achieved." },
      { ref: "als-rec-airway-and-ventilation", quote: "Give the highest feasible inspired oxygen during CPR." },
      { ref: "als-rec-airway-and-ventilation", quote: "When using a supraglottic airway (SGA), an i-gel is preferred to a laryngeal tube." },
      { ref: "als-rec-airway-and-ventilation", quote: "Tracheal intubation should only be attempted by rescuers with a high success rate and with the use of continuous waveform capnography." },
      { ref: "als-rec-airway-and-ventilation", quote: "Once a tracheal tube or a SGA has been inserted, ventilate the lungs at a rate of 10 min⁻¹ and continue chest compressions without pausing during ventilations." },
    ],
  },
  {
    id: "drugs",
    title: "7 · Vascular access, drugs and fluids",
    intro: "Which drug, when – counted by rhythm and by the number of shocks.",
    points: [
      { ref: "als-rec-medication-and-fluids-vascular-access", quote: "Attempt intravenous (IV) rather than intraosseous (IO) access first, to enable drug delivery in adults in cardiac arrest." },
      { ref: "als-rec-medication-and-fluids-vascular-access", quote: "If IV access cannot be rapidly achieved within two attempts, it is reasonable to consider IO access as an alternative route for vascular access during adult cardiac arrest." },
      { ref: "als-rec-medication-and-fluids-vasopressor-drugs", quote: "Give adrenaline 1 mg as soon as possible for adult patients in cardiac arrest with a non-shockable rhythm." },
      { ref: "als-rec-medication-and-fluids-vasopressor-drugs", quote: "Give adrenaline 1 mg after the third shock for adult patients in cardiac arrest with a shockable rhythm." },
      { ref: "als-rec-medication-and-fluids-vasopressor-drugs", quote: "Repeat adrenaline 1 mg every 3–5 min whilst ALS continues." },
      { ref: "als-rec-medication-and-fluids-antiarrhythmic-drugs", quote: "Give amiodarone 300 mg IV for adult patients in cardiac arrest who are in VF/pVT after three shocks have been administered." },
      { ref: "als-rec-medication-and-fluids-antiarrhythmic-drugs", quote: "Give a further dose of amiodarone 150 mg IV for adult patients in cardiac arrest who are in VF/pVT after five shocks have been administered." },
      { ref: "als-rec-medication-and-fluids-fluids", quote: "Give fluids during CPR only if cardiac arrest is caused by hypovolaemia." },
      { ref: "als-rec-medication-and-fluids-other-medication", quote: "Do not routinely give calcium, sodium bicarbonate or corticosteroids during cardiac arrest." },
    ],
    practice: { href: "/als", label: "ALS cases" },
  },
  {
    id: "monitoring",
    title: "8 · Capnography, ultrasound and devices",
    intro: "Tools that support – but never replace – high-quality CPR.",
    points: [
      { ref: "als-rec-waveform-capnography-during-advanced-life-suppor", quote: "Use waveform capnography to confirm correct tracheal tube placement during CPR. Use waveform capnography to monitor the quality of CPR." },
      { ref: "als-rec-waveform-capnography-during-advanced-life-suppor", quote: "An increase in ETCO2 during CPR may indicate that ROSC has occurred. However, chest compression should not be interrupted based on this sign alone." },
      { ref: "als-rec-waveform-capnography-during-advanced-life-suppor", quote: "Do not use a low ETCO2 value alone to decide if a resuscitation attempt should be stopped." },
      { ref: "als-rec-use-of-ultrasound-imaging-during-advanced-life-s", quote: "POCUS must not cause additional or prolonged interruptions in chest compressions." },
      { ref: "als-rec-devices-mechanical-chest-compression-devices", quote: "Consider mechanical chest compressions only if high-quality manual chest compression is not practical or compromises provider safety." },
      { ref: "als-rec-extracorporeal-cpr", quote: "ECPR may be considered as a rescue therapy for selected adults with IHCA and OHCA when conventional CPR is failing to restore spontaneous circulation, in settings in which this can be implemented." },
    ],
  },
  {
    id: "causes-rosc",
    title: "9 · Reversible causes and immediately after ROSC",
    intro: "Throughout the resuscitation: look for the 4 Hs and 4 Ts. After ROSC: the first steps.",
    points: [
      { ref: "als-fig2-algorithm", quote: "Reversible causes: Hypoxia. Hypovolaemia. Hyper-hypokalaemia / metabolic. Hypothermia, hyperthermia. Toxins. Tamponade (cardiac). Tension pneumothorax. Thrombosis (coronary / pulmonary)." },
      { ref: "als-rec-medication-and-fluids-thrombolytic-drugs", quote: "Consider immediate thrombolytic drug therapy when pulmonary embolism is the suspected or confirmed cause of cardiac arrest." },
      { ref: "als-rec-use-of-ultrasound-imaging-during-advanced-life-s", quote: "POCUS may help identify treatable causes of cardiac arrest such as cardiac tamponade and tension pneumothorax." },
      { ref: "als-fig2-algorithm", quote: "Immediately after ROSC: Use ABCDE approach. Aim for SpO2 of 94-98% and normal PaCO2. Aim SBP > 100 mmHg. 12 Lead ECG. Identify and treat cause. Temperature control." },
    ],
  },
  {
    id: "periarrest",
    title: "10 · Peri-arrest arrhythmias",
    intro: "Arrhythmias before or after the arrest: is the patient stable or unstable?",
    points: [
      { ref: "als-rec-peri-arrest-arrhythmias", quote: "The assessment and treatment of all arrhythmias address the condition of the patient (stable versus unstable) and the nature of the arrhythmia." },
      { ref: "als-rec-peri-arrest-arrhythmias", quote: "Rescuers should seek expert advice if the arrhythmia and/or lifethreatening features persist." },
      { ref: "als-rec-peri-arrest-arrhythmias", quote: "Shock – recognised by hypotension (e.g., systolic blood pressure <90 mmHg) along with signs of compensatory mechanisms, such as increased sympathetic activity, and evidence of inadequate organ perfusion" },
      { ref: "als-rec-peri-arrest-arrhythmias", quote: "Heart failure – manifested by pulmonary oedema (failure of the left ventricle) and/or raised jugular venous pressure (failure of the right ventricle)." },
    ],
  },
];

const ALS_QUIZ: QuizQuestion[] = [
  {
    id: "adr_nonshock",
    question: "Asystole on the first rhythm check, IV access is in place. When do you give the first adrenaline?",
    options: ["After the third shock", "As soon as possible", "After 10 minutes of CPR", "Only after ROSC"],
    correct: 1,
    explanation: { ref: "als-rec-medication-and-fluids-vasopressor-drugs", quote: "Give adrenaline 1 mg as soon as possible for adult patients in cardiac arrest with a non-shockable rhythm." },
  },
  {
    id: "adr_shock",
    question: "Persistent VF. When is the first dose of adrenaline due?",
    options: ["Before the first shock", "After the first shock", "After the third shock", "Never in VF"],
    correct: 2,
    explanation: { ref: "als-rec-medication-and-fluids-vasopressor-drugs", quote: "Give adrenaline 1 mg after the third shock for adult patients in cardiac arrest with a shockable rhythm." },
  },
  {
    id: "amio",
    question: "VF persists after three shocks. Which antiarrhythmic dose is recommended?",
    options: ["Amiodarone 150 mg IV", "Amiodarone 300 mg IV", "Amiodarone 600 mg IV", "Calcium chloride"],
    correct: 1,
    explanation: { ref: "als-rec-medication-and-fluids-antiarrhythmic-drugs", quote: "Give amiodarone 300 mg IV for adult patients in cardiac arrest who are in VF/pVT after three shocks have been administered." },
  },
  {
    id: "pause",
    question: "What is the target for the interruption of chest compressions around a shock?",
    options: ["Less than 5 s", "About 10 s", "About 20 s", "Not relevant – safety first"],
    correct: 0,
    explanation: { ref: "als-rec-defibrillation-defibrillation-strategy", quote: "This is achieved by continuing chest compressions during defibrillator charging, delivering defibrillation aiming for an interruption in chest compressions of less than 5 s and then immediately resuming chest compressions." },
  },
  {
    id: "oxygen",
    question: "Before the shock, the patient is ventilated with a bag-mask and oxygen. What do you do with it?",
    options: ["Keep ventilating during the shock", "Take it off and place it at least 1 m away from the chest", "Increase the oxygen flow", "Nothing – oxygen is no risk"],
    correct: 1,
    explanation: { ref: "als-rec-defibrillation-safe-and-effective-defibrillation", quote: "Minimise the risk of fire by taking off any oxygen mask, nasal cannulae or bag mask and by placing them at least 1 m away from the patient’s chest." },
  },
  {
    id: "vector",
    question: "VF continues after three shocks with correct antero-lateral pads. What should you consider?",
    options: ["Stacked shocks every minute", "A vector change to an antero-posterior pad position", "Stopping the resuscitation", "Lower energy shocks"],
    correct: 1,
    explanation: { ref: "als-rec-defibrillation-refractory-ventricular-fibrillati", quote: "For refractory VF, defined as continuous VF after three consecutive shocks, and having ensured correct antero-lateral pad positioning, consider using a defibrillation vector change by using an alternative defibrillation pad position (e.g. antero-posterior)." },
  },
  {
    id: "io",
    question: "Two IV attempts have failed. What is reasonable now?",
    options: ["Give the drugs endotracheally", "Consider IO access", "Keep trying IV until it works", "Give no drugs"],
    correct: 1,
    explanation: { ref: "als-rec-medication-and-fluids-vascular-access", quote: "If IV access cannot be rapidly achieved within two attempts, it is reasonable to consider IO access as an alternative route for vascular access during adult cardiac arrest." },
  },
  {
    id: "vent_rate",
    question: "An i-gel is in place and ventilation works. How do you continue?",
    options: ["30:2 with pauses for every breath", "Ventilate at 10 per minute with continuous compressions", "Ventilate at 30 per minute", "Stop ventilating"],
    correct: 1,
    explanation: { ref: "als-rec-airway-and-ventilation", quote: "Once a tracheal tube or a SGA has been inserted, ventilate the lungs at a rate of 10 min⁻¹ and continue chest compressions without pausing during ventilations." },
  },
  {
    id: "etco2",
    question: "ETCO₂ suddenly rises during CPR. What do you do?",
    options: ["Stop compressions immediately for a pulse check", "Do not interrupt compressions based on this sign alone", "End the resuscitation", "Give adrenaline immediately"],
    correct: 1,
    explanation: { ref: "als-rec-waveform-capnography-during-advanced-life-suppor", quote: "An increase in ETCO2 during CPR may indicate that ROSC has occurred. However, chest compression should not be interrupted based on this sign alone." },
  },
  {
    id: "calcium",
    question: "Which of these drugs should NOT be given routinely in cardiac arrest?",
    options: ["Adrenaline", "Amiodarone", "Calcium, sodium bicarbonate or corticosteroids", "Crystalloids in hypovolaemia"],
    correct: 2,
    explanation: { ref: "als-rec-medication-and-fluids-other-medication", quote: "Do not routinely give calcium, sodium bicarbonate or corticosteroids during cardiac arrest." },
  },
  {
    id: "fluids",
    question: "When are fluids indicated during CPR?",
    options: ["In every cardiac arrest", "Only if the arrest is caused by hypovolaemia", "Only after ROSC", "Never"],
    correct: 1,
    explanation: { ref: "als-rec-medication-and-fluids-fluids", quote: "Give fluids during CPR only if cardiac arrest is caused by hypovolaemia." },
  },
  {
    id: "rosc_spo2",
    question: "Immediately after ROSC – which oxygen saturation do you aim for?",
    options: ["100 %", "88–92 %", "94–98 %", "Not relevant"],
    correct: 2,
    explanation: { ref: "als-fig2-algorithm", quote: "Immediately after ROSC: Use ABCDE approach. Aim for SpO2 of 94-98% and normal PaCO2." },
  },
];

export const KNOWLEDGE: Record<"bls" | "als", KnowledgeModule> = {
  bls: {
    id: "bls",
    title: "Adult Basic Life Support – knowledge",
    subtitle: "Following the structure of the ERC Guidelines 2025 Adult BLS",
    chapters: BLS_CHAPTERS,
    quiz: BLS_QUIZ,
  },
  als: {
    id: "als",
    title: "Adult Advanced Life Support – knowledge",
    subtitle: "Following the structure of the ERC Guidelines 2025 Adult ALS",
    chapters: ALS_CHAPTERS,
    quiz: ALS_QUIZ,
  },
};

export function knowledgeQuotes(): Quote[] {
  return Object.values(KNOWLEDGE).flatMap((m) => [...m.chapters.flatMap((c) => c.points), ...m.quiz.map((q) => q.explanation)]);
}
