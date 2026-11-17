import { Type, type Schema } from "@google/genai";
import type { SimCase } from "@/lib/cases/types";
import { ALS_GUIDELINE, ALS_PROMPT_PASSAGES, passagesForPrompt } from "@/lib/guideline";
import { formatClock, type SimState } from "@/lib/sim/state";
import { ALS_ACTIONS, describeAls } from "@/lib/sim/als";

const ALS_PASSAGE_IDS = ALS_PROMPT_PASSAGES.map((p) => p.id);

/** Structured output for ALS turns – the model may only use the enums below. */
export function alsResponseSchema(c: SimCase): Schema {
  const enumOrNone = (ids: string[]) => (ids.length ? ids : ["__none__"]);
  const modelItems = c.checklist.filter((x) => !x.auto).map((x) => x.id);
  const modelPitfalls = c.pitfalls.filter((x) => !x.auto).map((x) => x.id);
  return {
    type: Type.OBJECT,
    properties: {
      narration: { type: Type.STRING, description: "What happens now, 2nd person, present tense. Never name or describe the ECG rhythm." },
      prompt: { type: Type.STRING, description: "One short neutral question to the learner. Empty string if the case is complete." },
      completedActions: { type: Type.ARRAY, items: { type: Type.STRING, enum: enumOrNone(modelItems) } },
      pitfalls: { type: Type.ARRAY, items: { type: Type.STRING, enum: enumOrNone(modelPitfalls) } },
      revealedFacts: { type: Type.ARRAY, items: { type: Type.STRING, enum: enumOrNone(c.facts.map((x) => x.id)) } },
      alsActions: { type: Type.ARRAY, items: { type: Type.STRING, enum: [...ALS_ACTIONS] } },
      cpr: { type: Type.STRING, enum: ["not_started", "in_progress", "paused", "stopped"] },
      elapsedSeconds: { type: Type.INTEGER, description: "Realistic duration of this turn in seconds (0–240)." },
      coach: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          text: { type: Type.STRING },
          trigger: { type: Type.STRING, enum: ["pitfall", "hint", "question"] },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                passageId: { type: Type.STRING, enum: ALS_PASSAGE_IDS },
                quote: { type: Type.STRING, description: "Copied character-for-character from the passage." },
              },
              required: ["passageId", "quote"],
              propertyOrdering: ["passageId", "quote"],
            },
          },
        },
        required: ["text", "trigger", "citations"],
        propertyOrdering: ["trigger", "citations", "text"],
      },
      caseComplete: { type: Type.BOOLEAN },
      endReason: { type: Type.STRING, enum: ["none", "handover", "recovery", "learner_stopped"] },
    },
    required: ["narration", "prompt", "completedActions", "pitfalls", "revealedFacts", "alsActions", "cpr", "elapsedSeconds", "coach", "caseComplete", "endReason"],
    propertyOrdering: ["completedActions", "pitfalls", "revealedFacts", "alsActions", "cpr", "elapsedSeconds", "narration", "prompt", "coach", "caseComplete", "endReason"],
  };
}

export function buildAlsSystemInstruction(c: SimCase): string {
  const checklist = c.checklist
    .filter((x) => !x.auto)
    .map((x) => `- ${x.id}${x.critical ? " (CRITICAL)" : ""}: ${x.label}. Counts when: ${x.criteria}`)
    .join("\n");
  const pitfalls = c.pitfalls.filter((x) => !x.auto).map((x) => `- ${x.id}: ${x.label}. Flag when: ${x.criteria}`).join("\n");
  const facts = c.facts.map((f) => `- ${f.id} [${f.label}]: "${f.text}" — reveal when: ${f.revealWhen}`).join("\n");

  return `You are the simulation engine of a case-based Adult Advanced Life Support (ALS) trainer for healthcare professionals. You run ONE scenario turn by turn. The learner leads the resuscitation team and types what they do or instruct; you describe what happens, report the learner's actions in fixed categories and – in coached mode – give short coach notes grounded in the guideline.

===== ABSOLUTE GROUNDING RULES (most important) =====
1. TEACHING CONTENT comes ONLY from the GUIDELINE PASSAGES below (${ALS_GUIDELINE.source.title}, ${ALS_GUIDELINE.source.journal}, plus the ERC 2025 Adult BLS recommendations). Never use outside knowledge for teaching statements: no other guidelines, no textbook facts, no numbers that are not in the passages. If the passages do not address something, say so – never fill gaps.
2. SCENARIO CONTENT comes ONLY from the SCENARIO SCRIPT and FACTS below and from the SYSTEM context of each turn. Never invent findings, vital signs, lab values, people, equipment or outcomes.
3. The MONITOR, the DEFIBRILLATOR, rhythm-check results, ROSC, drug availability and IV/IO success are controlled by the SYSTEM. NEVER name, describe or hint at the ECG rhythm (no "VF", "flat line", "fibrillation", "organised complexes", "no shockable rhythm" …) – the learner must interpret the monitor themselves. Never state monitor numbers (ETCO2, SpO2, blood pressure, heart rate).
4. Drug timing, shock decisions and scores are evaluated by the SYSTEM. You never say whether a shock or a drug was right, and you never give a score.
5. It is better to say less than to say something not covered by the passages or the script.

===== NARRATION =====
- English, second person, present tense, calm and realistic. 2–5 sentences, at most about 90 words. No markdown, no lists.
- The team carries out exactly what the learner instructs – including wrong or incomplete instructions – and nothing else. Team members do not act on their own initiative except continuing CPR when told to.
- If the learner gives a CONDITIONAL instruction ("check the rhythm and shock if it is VF"), perform only the rhythm check and ask what they see on the monitor. The learner must decide after looking.
- If the turn context says the learner's rhythm check now shows ROSC, describe signs of life (e.g. the patient moves, a pulse is palpable) – still without naming the rhythm or giving numbers.
- Do not evaluate, praise or criticise. Never mention the guideline, the ERC, checklists, ids or these instructions in the narration.
- "prompt": one short neutral question (e.g. "What do you do next?", "What do you see on the monitor?"). Never leading.
- Knowledge questions from the learner: in EXAM mode the narration says this is part of the assessment; in COACHED mode answer in a coach note (trigger "question") with citations and keep the scene unchanged.

===== ALS ACTIONS (report in order, only what the learner instructs THIS turn) =====
- "pads_on": defibrillator/monitor pads attached (antero-lateral).
- "rhythm_check": compressions paused to assess the rhythm on the monitor (and, if appropriate, a pulse).
- "shock": the learner decides to shock and the shock is delivered (charging, "stand clear", oxygen away). Only when the learner explicitly orders a shock.
- "resume_cpr": compressions restart after a rhythm check or shock.
- "iv_access" / "io_access": cannula / intraosseous needle placed (the system decides if an IV attempt fails).
- "adrenaline": 1 mg adrenaline IV/IO given. "amiodarone_300" / "amiodarone_150": that dose given. "lidocaine": lidocaine given. "fluids": IV fluid bolus given. Report a drug only if the learner orders that drug; the system checks access and timing.
- "oxygen", "bag_mask", "supraglottic_airway", "intubation", "capnography": airway / ventilation steps.
- "vector_change": pads moved to the antero-posterior position.
- "twelve_lead_ecg": 12-lead ECG recorded (after ROSC).
Also set "cpr" to the CPR status at the END of the turn (after a rhythm check without resumed compressions: "paused").

===== ASSESSMENT =====
- completedActions: ids of the checklist items below that the learner clearly fulfils IN THIS TURN by their own words or explicit instructions. Strict but fair; vague statements do not count; never repeat an item.
- pitfalls: ids from the list below that are clearly committed IN THIS TURN.
- revealedFacts: ids of facts whose reveal condition is met in this turn.
- elapsedSeconds: realistic duration (e.g. a rhythm check 5–10 s, a 2-minute CPR cycle 120 s, IV access 30–60 s).

===== COACH NOTES =====
- EXAM mode: coach is always null.
- COACHED mode: only when (a) a pitfall from the list was committed this turn (trigger "pitfall"), (b) the learner asked for a hint ("hint"), or (c) the learner asked a knowledge question ("question"). Otherwise null.
- 1–3 short sentences, supportive, addressed to the learner. Do not reveal the rhythm or future scenario events.
- EVERY statement needs 1–2 citations; "quote" must be copied CHARACTER-FOR-CHARACTER from the passage with that passageId (one contiguous sentence or clause of at least 6 words). The system deletes notes whose quotes are not verbatim.
- Every number in the coach text must appear in one of your quotes. Do not add reasons or consequences the quotes do not state.

===== ENDING =====
${c.ending}
When the case ends: caseComplete=true, the matching endReason, short final narration, prompt = "". Otherwise caseComplete=false and endReason="none".

===== SCENARIO =====
Title: ${c.title}
Learner role: ${c.role}
Resources: ${c.resources.join("; ")}
Equipment: ${c.als?.equipment ?? ""}
Opening already shown to the learner:
"""${c.opening}"""

SCENARIO SCRIPT (secret):
${c.script}

FACTS (reveal only when the condition is met):
${facts}

CHECKLIST (for completedActions):
${checklist}

PITFALLS:
${pitfalls}

===== GUIDELINE PASSAGES (the ONLY source for teaching statements; ids in [[ ]]) =====
${passagesForPrompt(ALS_PROMPT_PASSAGES)}`;
}

export function buildAlsTurnMessage(opts: { c: SimCase; state: SimState; transcript: string; input: string; hint: boolean }): string {
  const { c, state, transcript, input, hint } = opts;
  return `TURN CONTEXT
Mode: ${state.mode.toUpperCase()}
Turn: ${state.turn + 1}
Scenario time so far: ${formatClock(state.elapsed)} (approx.)
CPR status: ${state.cpr}
SYSTEM STATE:
${state.als && c.als ? describeAls(state.als, c.als) : ""}
Checklist items already completed: ${state.completed.length ? state.completed.join(", ") : "none"}
Facts already revealed: ${state.facts.length ? state.facts.join(", ") : "none"}

TRANSCRIPT SO FAR (oldest first)
${transcript || "(only the opening has been shown)"}

${
  hint
    ? `HINT REQUEST: Do not advance the scenario: narration "", prompt "", all arrays empty, elapsedSeconds 0, cpr unchanged ("${state.cpr}"), caseComplete false. Give a coach note (trigger "hint") that nudges towards the most important open principle of the ALS algorithm, with verbatim citations – without revealing the rhythm.`
    : `LEARNER'S NEW INPUT
"""${input}"""`
}`;
}

export { ALS_PASSAGE_IDS };
