#!/usr/bin/env python3
"""
Builds the guideline knowledge base (src/data/guideline/bls-2025.json) from the
ERC Guidelines 2025 Adult Basic Life Support PDF.

Usage:
    python3 -I scripts/build_guideline.py [path/to/BLS.pdf]

Default PDF path: source/ERC-2025-BLS.pdf (gitignored – the PDF itself is not
committed). Requires `pypdfium2` (pip3 install pypdfium2).

Why a build step: the AI case engine may only make teaching statements that it can
back with a verbatim quote from one of these passages. The server verifies every
quote against this file, so the passages must be the exact guideline wording –
generated mechanically, not retyped.

Text passages are cut from the PDF text layer between start/end markers.
Figures and Table 1 are graphics without a usable text layer; they are transcribed
by hand in FIGURES below (checked against the rendered pages).
"""

import json
import re
import sys
from pathlib import Path

import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PDF = ROOT / "source" / "ERC-2025-BLS.pdf"
OUT = ROOT / "src" / "data" / "guideline" / "bls-2025.json"

SOURCE = {
    "title": "European Resuscitation Council Guidelines 2025 Adult Basic Life Support",
    "short": "ERC Guidelines 2025 – Adult BLS",
    "journal": "Resuscitation 215 (2025) 110771",
    "doi": "10.1016/j.resuscitation.2025.110771",
    "authors": "Smyth MA, van Goor S, Malta Hansen C, et al., for the ERC Adult Basic Life Support Collaborators",
}

# Figure captions sit inside the running text of the text layer – remove them.
CAPTIONS = [
    "Fig. 1 – Adult Basic Life Support – key messages.",
    "Fig. 2 – Three steps to save a life.",
    "Fig. 3 – Universal BLS algorithm.",
    "Fig. 4 – Community response.",
    "Fig. 5 – AED signage.",
    "Fig. 6 – Anterior-lateral pad position (a) or anterior-posterior pad position (b).",
    "Fig. 7 – BLS step by step.",
    "Fig 7. (continued)",
    "Fig. 8a – Safety.",
    "Fig. 8b – Check.",
    "Fig. 8c – Unconscious – Call.",
    "Fig. 8d – Check for breathing – open the airway.",
    "Fig. 8e – Not breathing normally.",
    "Fig. 8f – Hand in the centre of the chest.",
    "Fig. 8g – Both hands perform chest compressions.",
    "Fig. 8h – Arms straight, vertical above the victim.",
    "Fig. 8i – If untrained or unable to do rescue breath, apply only chest compression.",
    "Fig. 8j – If trained and able provide rescue breaths with a compression-ventilation ratio of 30:2.",
    "Fig. 8k – Send for AED.",
    "Fig. 8l – When AED arrives, continue chest compressions, while placing defibrillation pads.",
    "Fig. 8m – Follow the directions of the AED.",
    "Fig. 8n – If shock is indicated, deliver shock and continue chest compressions.",
    "Fig. 8o – If a shock is not indicated, continue chest compressions.",
]

# (id, section, title, kind, [(start_marker, end_marker), ...])
# Markers are matched against the cleaned, whitespace-normalised text; both are inclusive.
PASSAGES = [
    # ---------------------------------------------------------------- Introduction
    ("intro-definitions", "Introduction", "Definitions used in the guideline", "definition", [
        ("For the purpose of these Guidelines, the term CPR", "advanced life support (neonatal, paediatric, and adult life support)."),
    ]),
    # ---------------------------------------------------------------- Concise guidelines
    ("rec-recognition", "Concise guidelines", "Recognising cardiac arrest", "recommendation", [
        ("Ensure it is safe to approach. Suspect cardiac arrest", "Once the seizure stops, assess breathing."),
        ("If any person is unresponsive with abnormal breathing, cardiac arrest should be assumed.", "assume cardiac arrest and start CPR (Fig. 3)."),
    ]),
    ("rec-alerting", "Concise guidelines", "Alerting the emergency services", "recommendation", [
        ("If you have a mobile phone, activate speaker mode,", "when you return from summoning help, immediately commence CPR."),
    ]),
    ("rec-dispatcher", "Concise guidelines", "Role of the dispatcher", "recommendation", [
        ("Dispatchers should use standardised protocols to facilitate", "ask if there is an ‘AED’ or ‘defibrillator’ at the scene."),
        ("If no AED is available at the scene, and more than one bystander", "guide bystanders to the nearest AED."),
        ("As soon as an AED is available at the patient, dispatchers should", "to the incident and to retrieve a nearby AED (Fig. 4)."),
    ]),
    ("rec-compressions", "Concise guidelines", "High quality chest compressions", "recommendation", [
        ("Commence chest compressions as soon as possible.", "compress the chest deeper to compensate for the soft mattress."),
    ]),
    ("rec-rescue-breaths", "Concise guidelines", "Rescue breaths", "recommendation", [
        ("If you have been trained to provide rescue breaths, alternate 30", "perform continuous chest compressions, without interruptions."),
    ]),
    ("rec-aed-find", "Concise guidelines", "Using an AED – how to find an AED", "recommendation", [
        ("Anyone can use an Automated External Defibrillator (AED).", "direct callers to the nearest available AED."),
    ]),
    ("rec-aed-use", "Concise guidelines", "Using an AED – when and how to use an AED", "recommendation", [
        ("Use an AED as soon as it is available.", "shown on the AED (or AED pads) and in Fig. 6."),
        ("If more than one rescuer is present, continue CPR while the", "pause CPR to undertake rhythm analysis."),
    ]),
    ("rec-aed-placement", "Concise guidelines", "Where to place AEDs", "recommendation", [
        ("AEDs should be placed in clear sight.", "linked to AED registries and first responder programmes."),
    ]),
    ("rec-safety", "Concise guidelines", "Safety", "recommendation", [
        ("Ensure the safety of yourself, the person in cardiac arrest, and any bystanders (Fig. 7).", "Ensure the safety of yourself, the person in cardiac arrest, and any bystanders (Fig. 7)."),
        ("Lay people should commence CPR for presumed cardiac arrest", "offer them support)."),
    ]),
    # ---------------------------------------------------------------- Evidence: recognition
    ("ev-recognition", "Evidence – Recognising cardiac arrest", "Operational definition of cardiac arrest", "evidence", [
        ("The practical, operational definition of cardiac arrest", "(Fig. 8a and Fig. 8b)."),
    ]),
    ("ev-abnormal-breathing", "Evidence – Recognising cardiac arrest", "Abnormal (agonal) breathing", "evidence", [
        ("The ERC Guidelines 2025 BLS continue to highlight the importance of recognising agonal breathing", "heavy or laboured breathing."),
        ("Misinterpretation of abnormal breathing remains the biggest", "within the recognition of cardiac arrest section (Fig. 8c and Fig. 8d)."),
    ]),
    ("ev-seizures", "Evidence – Recognising cardiac arrest", "Seizure-like activity", "evidence", [
        ("Seizure-like movements of short duration among patients in cardiac", "a person who is not in cardiac arrest."),
    ]),
    ("ev-alerting", "Evidence – Alerting the emergency services", "Calling for any unresponsive person; the lone rescuer", "evidence", [
        ("Whenever a person is found unresponsive, bystanders who have a", "the ERC advises that this is done as quickly as possible (Fig. 8e)."),
    ]),
    # ---------------------------------------------------------------- Evidence: dispatcher
    ("ev-dispatch-recognition", "Evidence – Role of the dispatcher", "Dispatcher recognition of cardiac arrest", "evidence", [
        ("Prompt and accurate recognition of cardiac arrest is essential", "ERC Guidelines 2025 Systems Save Lives."),
    ]),
    ("ev-dispatch-cpr", "Evidence – Role of the dispatcher", "Dispatcher CPR instructions", "evidence", [
        ("Dispatch-assisted CPR is recommended for a person in cardiac", "provide CPR instructions for all patients in cardiac arrest."),
    ]),
    ("ev-dispatch-video", "Evidence – Role of the dispatcher", "Video for dispatcher CPR instructions", "evidence", [
        ("Traditionally, dispatchers provide audio-only CPR instructions.", "preferably as part of a formal research programme."),
    ]),
    ("ev-dispatch-aed", "Evidence – Role of the dispatcher", "Dispatcher AED instructions and volunteer responders", "evidence", [
        ("High survival rates have been observed following on-site AED use", "integrated into dispatch systems to facilitate this."),
    ]),
    ("ev-dispatch-technology", "Evidence – Role of the dispatcher", "Technology to support dispatchers (CCTV, machine learning, smart and wearable devices)", "evidence", [
        ("The use of technology to support dispatchers is more completely", "should only be implemented within a formal research programme."),
    ]),
    # ---------------------------------------------------------------- Evidence: compressions
    ("ev-compressions-intro", "Evidence – High quality chest compressions", "Why chest compressions matter", "evidence", [
        ("Chest compressions are a critical component of effective CPR", "ERC Guidelines 2025 Advanced Life Support."),
    ]),
    ("ev-compression-first", "Evidence – High quality chest compressions", "Initiating CPR – compressions first", "evidence", [
        ("The sequence for commencing CPR (compressions first versus", "the ERC recommends a compression first approach."),
    ]),
    ("ev-firm-surface", "Evidence – High quality chest compressions", "Surface on which chest compressions are performed", "evidence", [
        ("ILCOR updated the CoSTR for performing chest compressions on a", "The ERC does not advocate using a backboard."),
    ]),
    ("ev-hand-position", "Evidence – High quality chest compressions", "Hand position during chest compressions", "evidence", [
        ("The evidence for optimal hand position was reviewed by ILCOR", "this position is on the lower half of the sternum (Figs. 8f–8h)."),
    ]),
    ("ev-depth-rate-recoil", "Evidence – High quality chest compressions", "Chest compression depth, rate and recoil", "evidence", [
        ("The ERC Guidelines 2025 BLS maintain the previous recommenda", "No studies were identified that examined different measures of leaning."),
        ("Consistent with ILCOR, the ERC continues to recommend a chest compression rate of 100 to 120", "to allow full chest wall recoil."),
    ]),
    ("ev-interruptions", "Evidence – High quality chest compressions", "Minimising interruptions to chest compressions", "evidence", [
        ("Interruptions comprise pauses for rhythm analysis, charging the", "chest compression fraction should be maximised."),
    ]),
    ("ev-compression-only", "Evidence – High quality chest compressions", "Compression-only CPR and CPR by healthcare professionals", "evidence", [
        ("The role of ventilation and oxygenation in the initial management", "Self-reported fatigue was noted to be ‘somewhat hard’ or ‘hard’."),
        ("The ERC supports the ILCOR recommendations that chest com", "they should provide CCC with asynchronous ventilations (Fig. 8i)."),
    ]),
    ("ev-obesity", "Evidence – High quality chest compressions", "CPR in patients living with obesity", "evidence", [
        ("The increasing prevalence of obesity worldwide and the challenges", "standard CPR protocols should be used in obese patients."),
    ]),
    ("ev-head-up", "Evidence – High quality chest compressions", "Head-up CPR", "evidence", [
        ("The updated ILCOR CoSTR for head-up CPR", "without a CPR bundle, leads to improved outcomes."),
    ]),
    ("ev-feedback-devices", "Evidence – High quality chest compressions", "CPR feedback devices", "evidence", [
        ("To improve CPR quality, key CPR metrics should be measured.", "(see ERC Guidelines 2025 Systems Saving Lives34 )."),
    ]),
    # ---------------------------------------------------------------- Evidence: ventilation
    ("ev-rescue-breaths", "Evidence – Rescue breaths", "Rescue breaths", "evidence", [
        ("Ventilation during cardiac arrest is a critical aspect of cardiopul", "with and without supplementary oxygen (Fig. 8j)."),
    ]),
    ("ev-ventilation-feedback", "Evidence – Rescue breaths", "Ventilation feedback devices", "evidence", [
        ("There is a growing body of evidence to indicate that ventilation during", "preferably as part of a formal research programme."),
    ]),
    ("ev-ratio", "Evidence – Rescue breaths", "Compression to ventilation ratio", "evidence", [
        ("ILCOR updated the CoSTR for chest compressions-to-ventilation", "a compression–ventilation ratio of 30:2 in adult patients in cardiac arrest."),
    ]),
    ("ev-passive-ventilation", "Evidence – Rescue breaths", "Passive ventilation", "evidence", [
        ("Passive ventilation describes gas exchange secondary to recoil", "techniques during conventional CPR."),
    ]),
    # ---------------------------------------------------------------- Evidence: AED
    ("ev-aed-intro", "Evidence – Using an AED", "What an AED does and why time matters", "evidence", [
        ("An automated external defibrillator (AED) is a portable, battery", "Guidelines 2025 Systems Save Lives."),
    ]),
    ("ev-aed-ultraportable", "Evidence – Using an AED", "Ultra-portable AEDs", "evidence", [
        ("Several manufacturers have developed ultraportable or pocket AEDs", "demonstrate improved patient outcomes with their use."),
    ]),
    ("ev-aed-find", "Evidence – Using an AED", "How to find an AED (registries, geolocation, signage, cabinets, drones)", "evidence", [
        ("All public access AEDs should be registered with the local emer", "provide basic instructions on retrieving the AED from the drone."),
    ]),
    ("ev-aed-how-when", "Evidence – Using an AED", "How and when to use an AED", "evidence", [
        ("An AED should only be attached to a person who is unresponsive", "guidance and feedback on quality chest compressions (Figs. 8l–8o)."),
    ]),
    ("ev-cpr-before-defib", "Evidence – Using an AED", "Chest compressions before defibrillation?", "evidence", [
        ("ILCOR has updated the 2020 CoSTR", "Defibrillation should not be delayed to provide additional CPR."),
    ]),
    ("ev-pad-position", "Evidence – Using an AED", "Positioning of defibrillation pads", "evidence", [
        ("ILCOR undertook a systematic review addressing AED pad size and", "the anterior-posterior pad position if trained (Fig. 6)."),
    ]),
    ("ev-bra", "Evidence – Using an AED", "Removing a bra prior to defibrillation", "evidence", [
        ("Evidence indicates females in cardiac arrest are less likely to", "incorporate pad placement in people wearing bras."),
    ]),
    ("ev-aed-public-placement", "Evidence – Using an AED", "Where to place an AED in public", "evidence", [
        ("Evidence pertaining to geographical placement of AEDs can be", "EMS response times and location of current AEDs."),
    ]),
    # ---------------------------------------------------------------- Evidence: safety
    ("ev-ppe", "Evidence – Safety", "Personal protective equipment", "evidence", [
        ("The use of personal protective equipment during resuscitation plays", "protection and prompt action can go hand in hand."),
    ]),
    ("ev-rescuer-harm", "Evidence – Safety", "Harm to people providing CPR", "evidence", [
        ("ILCOR performed a scoping review related to harm to people provid", "the risk of damage from accidental shock during AED use is low."),
    ]),
    ("ev-patient-harm", "Evidence – Safety", "Unintentional injury from CPR to patients not in cardiac arrest", "evidence", [
        ("Lay people may be reluctant to perform CPR on an unresponsive", "consistent with the ILCOR treatment recommendations."),
    ]),
    ("ev-aed-safety", "Evidence – Safety", "Safety of AEDs", "evidence", [
        ("Errors in AED use most commonly occur because of problems with", "present a low risk of injury to rescuers."),
    ]),
]

# Graphics (no usable text layer) – transcribed by hand from the rendered pages.
FIGURES = [
    {
        "id": "fig1-key-messages", "section": "Figures", "title": "Fig. 1 – Adult Basic Life Support – key messages",
        "kind": "figure", "page": 2,
        "text": "Adult Basic Life Support key messages: Learn how to recognise a cardiac arrest. Call emergency medical services without delay, even if uncertain. If uncertain, performing CPR will not cause serious injury. Everyone can learn how to perform CPR. CPR and AED save lives. Everyone can use an AED, even if they are not trained. AEDs should not be locked away.",
    },
    {
        "id": "three-steps", "section": "Concise guidelines", "title": "If you encounter someone who appears to be unresponsive – follow the 3 steps to save a life",
        "kind": "recommendation", "page": 2,
        "text": "If you encounter someone who appears to be unresponsive follow the 3 steps to save a life. 1. Check: Is it safe to approach? Is the person conscious? 2. Call EMS immediately if they are unresponsive. Assess breathing. If you are unsure the call-taker will assist you. 3. CPR: Start CPR immediately if they are unresponsive with abnormal breathing. As soon as an AED is available, attach it and follow the AED instructions. If you are unsure the call-taker will assist you.",
    },
    {
        "id": "table1-changes", "section": "Figures", "title": "Table 1 – The major changes in the 2025 Guidelines for Adult Basic Life Support",
        "kind": "figure", "page": 3,
        "text": "Changes to guidance: The 2021 ERC BLS Guidelines emphasised recognising cardiac arrest in a person who is unresponsive and not breathing normally, before calling the local emergency services. The 2025 ERC BLS Guidelines emphasises calling the local emergency services for any person who is unresponsive. Rescuers no longer need to confirm abnormal breathing before calling. Initiate the call first then assess breathing while waiting for the call to be answered. The dispatcher will be able assist you in identifying abnormal breathing, if needed. The 2021 ERC BLS Guidelines emphasised descriptions of slow or laboured breathing as indicators of abnormal breathing. Exercise is a common precipitant of cardiac arrest. Early after the onset of cardiac arrest, athletes may display a near normal or panting breathing pattern. New topics added in the 2025 ERC BLS guidance: The 2025 ERC BLS Guidelines include some detail of the role of dispatcher. The role of the dispatcher is critical to early recognition of cardiac arrest and initiation of CPR. Existing studies of head-up CPR include a bundle of interventions and are not limited to just positioning the patient in a head-up position. Evidence addressing the impact of head-up CPR without the other elements of the CPR bundle is lacking. There is increasing evidence that finding a person in cardiac arrest and attempting resuscitation is a potentially traumatic experience for many lay rescuers. The 2025 ERC BLS Guidelines now recognises that lay rescuers and bystanders may benefit from support. There is a growing body of evidence exploring cardiac arrest management and outcomes in obese patients. The 2025 ERC BLS Guidelines advise that obese patients receive standard 30:2 CPR without modifications. Topics removed from the ERC Guidelines 2025 BLS: BLS modifications for COVID-19 been removed from the BLS Guidelines. COVID-19 is now endemic in the community and this advice has been removed in line with national health policies. COVID-19 patients should be treated as any other patients. Modifications to CPR are no longer required. Management of foreign body airway obstruction has been relocated from BLS to the ERC Guidelines 2025 First Aid.",
    },
    {
        "id": "fig2-three-steps", "section": "Figures", "title": "Fig. 2 – Three steps to save a life",
        "kind": "figure", "page": 4,
        "text": "Check: Safety. Responsiveness. If unresponsive → Call: Call EMS without delay. Use phone on speaker. Check for breathing. Follow the dispatcher's instructions. If absent or abnormal breathing → CPR & AED: Start CPR. Attach AED as soon as one is available. Follow AED instructions. If you are unsure, the dispatcher will help.",
    },
    {
        "id": "fig3-algorithm", "section": "Figures", "title": "Fig. 3 – Universal BLS algorithm",
        "kind": "figure", "page": 5,
        "text": "CHECK: responsiveness → CALL for help - raise alarm → Open the airway. Absent or abnormal breathing → Start CPR → Attach AED as soon as able. Follow AED instructions → Continue CPR until EMS / resuscitation team arrives. Call for help without delay – Out-of-hospital: Phone on speaker. Check for breathing. If you are unsure, the dispatcher will help. Follow dispatcher's instructions. In-hospital: Check for breathing and signs of life. Request AED or defibrillator. Alert resuscitation team. Start CPR – Adult: If not BLS trained: Chest-compression only CPR. If BLS trained: CPR 30:2.",
    },
    {
        "id": "fig6-pad-position", "section": "Figures", "title": "Fig. 6 – Anterior-lateral pad position (a) or anterior-posterior pad position (b)",
        "kind": "figure", "page": 7,
        "text": "Drawing of defibrillation pad positions on male and female chests. (a) Anterior-lateral: one pad below the right clavicle, to the right of the upper sternum; one pad on the left side of the chest in the mid-axillary line below the armpit. (b) Anterior-posterior: one pad on the front of the left chest, one pad on the back to the left of the spine below the scapula.",
    },
    {
        "id": "fig7-step-by-step", "section": "Figures", "title": "Fig. 7 – BLS step by step",
        "kind": "figure", "page": 8,
        "text": "SAFETY: Make sure that you, the victim and bystanders are safe. RESPONSE – Check for a response: Shake the victim gently by the shoulders and ask loudly: “Are you all right?” ALERT EMERGENCY SERVICES: If victim is unresponsive, ask a helper to call the emergency medical services or call them yourself. Stay with the victim if possible. Activate the speaker function or hands-free option on the telephone so that you can start CPR whilst talking to the dispatcher. AIRWAY – Open the airway: If there is no response, position the victim on their back. With your hand on the forehead and your fingertips under the point of the chin, gently tilt the victim’s head backwards, lifting the chin to open the airway. BREATHING – Look, listen and feel for breathing: Look, listen and feel for breathing for no more than 10 seconds. A victim who is barely breathing, or taking infrequent, slow and noisy gasps, is not breathing normally. SEND FOR AED – Send someone to get an AED: Send someone to find and bring back an AED, if available. If you are on your own, fetch an AED only if you can get and apply it within one minute; otherwise, start CPR immediately. CIRCULATION – Start chest compressions: Kneel by the side of the victim. Place the heel of one hand in the centre of the victim’s chest - this is the lower half of the victim’s breastbone (sternum). Place the heel of your other hand on top of the first hand and interlock your fingers. Keep your arms straight. Position yourself vertically above the victim’s chest and press down on the sternum at least 5 cm (but not more than 6 cm). After each compression, release all the pressure on the chest without losing contact between your hand and the chest. Repeat at a rate of 100-120 min⁻¹. COMPRESSION-ONLY CPR: If you are untrained, or unable to give rescue breaths, give chest-compression-only CPR (continuous compressions at a rate of 100-120 min⁻¹).",
    },
    {
        "id": "fig7-step-by-step-2", "section": "Figures", "title": "Fig. 7 (continued) – BLS step by step",
        "kind": "figure", "page": 9,
        "text": "COMBINE RESCUE BREATHING WITH CHEST COMPRESSIONS: If you are trained to do so, after 30 compressions, open the airway again, using head tilt and chin lift. Pinch the soft part of the nose closed, using your index finger and thumb of your hand on the forehead. Allow the victim’s mouth to open, but maintain chin lift. Take a normal breath and place your lips around the victim’s mouth, making sure that you have an airtight seal. Blow steadily into the mouth whilst watching for the chest to rise, taking about 1 second as in normal breathing. This is an effective rescue breath. Maintaining head tilt and chin lift, take your mouth away from the victim and watch for the chest to fall as air comes out. Take another normal breath and blow into the victim’s mouth once more to achieve a total of two rescue breaths. Do not interrupt compressions by more than 10 seconds to deliver the two breaths, even if one or both are not effective. Then return your hands without delay to the correct position on the sternum and give a further 30 chest compressions. Continue with chest compressions and rescue breaths in a 30:2 ratio. WHEN AED ARRIVES – Switch on the AED and attach the electrode pads: As soon as the AED arrives, switch it on and attach the electrode pads to the victim’s bare chest. If more than one rescuer is present, CPR should be continued whilst the electrode pads are being attached to the chest. FOLLOW THE SPOKEN/VISUAL DIRECTIONS: Follow the spoken and visual directions given by the AED. If a shock is advised, ensure that neither you nor anyone else is touching the victim. Push the shock button as directed. Then immediately resume CPR as directed by the AED. IF NO SHOCK IS ADVISED – Continue CPR: If no shock is advised, immediately resume CPR and continue as directed by the AED. IF NO AED IS AVAILABLE – Continue CPR: If no AED is available, or whilst waiting for one to arrive, continue CPR. Do not interrupt resuscitation until: A healthcare professional tells you to stop OR The victim is definitely waking up, moving, opening eyes, and breathing normally OR You become exhausted. It is rare for CPR alone to restart the heart. Unless you are certain that the victim has recovered, continue CPR. Signs that the victim has recovered: Waking-up. Moving. Opening eyes. Breathing normally.",
    },
]


HYPHENATED: set[str] = set()


def clean(raw_pages: list[str]) -> tuple[str, list[int]]:
    """Returns (normalised text, page_starts) where page_starts[i] is the offset of page i+1."""
    parts: list[str] = []
    page_starts: list[int] = []
    offset = 0
    for i, t in enumerate(raw_pages):
        if i >= 22:  # pages 23+ are references only
            break
        t = t.replace("\r", "\n")
        # line-break hyphenation (U+FFFE): join the halves, but keep the hyphen for genuine
        # compounds that appear hyphenated elsewhere in the document (e.g. anterior-posterior)
        t = re.sub(
            "([A-Za-z]+)\ufffe\\s*([A-Za-z]+)",
            lambda m: f"{m.group(1)}-{m.group(2)}"
            if f"{m.group(1)}-{m.group(2)}".lower() in HYPHENATED
            else m.group(1) + m.group(2),
            t,
        )
        t = re.sub("\ufffe\\s*", "", t)
        # running headers
        t = re.sub(r"R E S U S C I T A T I O N 2 1 5 \( 2 0 2 5 \) 1 1 0 7 7 1", " ", t)
        t = re.sub(r"(?m)^\s*\d{0,2}\s*RESUSCITATION 215 \(2025\) 110771\s*\d{0,2}\s*$", " ", t)
        t = re.sub(r"RESUSCITATION 215 \(2025\) 110771", " ", t)
        # superscript minus lost in extraction: "min 1" -> "min⁻¹"
        t = re.sub(r"min\s?1\b", "min⁻¹", t)
        t = re.sub(r"\s+", " ", t).strip() + " "
        page_starts.append(offset)
        parts.append(t)
        offset += len(t)
    text = "".join(parts)
    return text, page_starts


PROTECT = {
    "EtCO2": "EtCO₂",
    "I2 =": "I² =",
    "30c:2s": "30c:2s",
}


def strip_citations(s: str) -> str:
    s = s.replace("EtCO2", "EtCO₂").replace("I2 =", "I² =").replace("COVID-19", "COVID‑19")
    # protect manikin protocol labels like 30c2s / 50c:5s / 100c10 s
    s = re.sub(r"(\d+)c:?(\d+)\s?s\b", lambda m: m.group(0).replace("c", "ç"), s)
    # reference numbers glued to the preceding word/punctuation: "arrest.11 ", "studies143–148 ", "ILCOR3a "
    # NOTE: the reference number must touch the word/punctuation (no space) – "at least 5 cm"
    # or "Fig. 3" must never be touched.
    pattern = re.compile(
        r"(?<=[A-Za-z\)\]’”])([.,;:]?)(\d{1,3}[a-z]?(?:\s?[,–-]\s?\d{1,3}[a-z]?)*)(?=[\s.,;:)]|$)"
    )
    s = pattern.sub(lambda m: m.group(1), s)
    # years with a glued reference: "in 2017.154 ILCOR" / "from 202112 and"
    s = re.sub(r"\b((?:19|20)\d\d)\.\d{1,3}[a-z]?(?=\s)", r"\1.", s)
    s = re.sub(r"\b(20[0-2]\d)\d{1,3}(?=[\s.,;)])", r"\1", s)
    s = s.replace("ç", "c").replace("COVID‑19", "COVID-19")
    s = re.sub(r"\s+([.,;:])", r"\1", s)
    s = pattern.sub(lambda m: m.group(1), s)  # second pass: "device .237" became "device.237"
    # ratio followed by a glued reference: "compared to 15:2.158 In one"
    s = re.sub(r"(\d+:\d)\.\d{1,3}(?=\s)", r"\1.", s)
    s = s.replace("depth only, 134–139 while", "depth only, while")
    s = s.replace("rate of 0.22 %.77 To date", "rate of 0.22 %. To date")
    s = s.replace("Three studies 262,265,266 reported", "Three studies reported")
    s = re.sub(r"\s{2,}", " ", s)
    s = s.replace("( ", "(").replace(" )", ")")
    return s.strip()


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf_path.exists():
        sys.exit(f"PDF not found: {pdf_path}")
    pdf = pdfium.PdfDocument(str(pdf_path))
    raw = [pdf[i].get_textpage().get_text_range() for i in range(len(pdf))]
    HYPHENATED.update(w.lower() for w in re.findall(r"[A-Za-z]+-[A-Za-z]+", " ".join(raw)))
    HYPHENATED.update({"anterior-posterior", "anterior-lateral", "bag-valve-mask", "battery-powered", "dispatcher-assisted", "high-certainty", "life-threatening", "to-nose", "non-obese", "out-of", "real-time", "stepped-wedge"})
    text, page_starts = clean(raw)
    for cap in CAPTIONS:
        text = text.replace(cap + " ", "")  # page offsets shift slightly; page lookup tolerates this
    # recompute page starts after caption removal by re-cleaning per page
    pages_clean = []
    for i in range(len(page_starts)):
        start = page_starts[i]
        end = page_starts[i + 1] if i + 1 < len(page_starts) else None
        pages_clean.append((start, end))

    def page_of(snippet: str) -> int:
        # find the page whose cleaned text contains the snippet start
        probe = snippet[:60]
        for i, t in enumerate(raw[:22]):
            tt = re.sub(r"\ufffe\s*", "", t)
            tt = re.sub(r"min\s?1\b", "min⁻¹", tt)
            tt = re.sub(r"\s+", " ", tt)
            if probe in tt:
                return i + 1
        return 0

    out = []
    errors = []
    for pid, section, title, kind, segs in PASSAGES:
        chunks = []
        page = 0
        for start, end in segs:
            a = text.find(start)
            if a < 0:
                errors.append(f"{pid}: start marker not found: {start!r}")
                continue
            b = text.find(end, a)
            if b < 0:
                errors.append(f"{pid}: end marker not found: {end!r}")
                continue
            chunk = text[a : b + len(end)]
            chunks.append(strip_citations(chunk))
            if not page:
                page = page_of(start)
        body = " ".join(chunks)
        # the PDF repeats one paragraph on p.15 and p.21 (layout artefact) – de-duplicate sentences
        seen = set()
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z‘“(])", body)
        dedup = []
        for snt in sentences:
            key = snt.strip()
            if len(key) > 60 and key in seen:
                continue
            seen.add(key)
            dedup.append(snt)
        body = " ".join(dedup)
        out.append({"id": pid, "section": section, "title": title, "kind": kind, "page": page, "text": body})

    for f in FIGURES:
        out.append(dict(f))

    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(1)

    order = {"recommendation": 0, "figure": 1, "definition": 2, "evidence": 3}
    out.sort(key=lambda p: (order[p["kind"]], p["page"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"source": SOURCE, "passages": out}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(p["text"]) for p in out)
    print(f"wrote {len(out)} passages, {total} chars → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
