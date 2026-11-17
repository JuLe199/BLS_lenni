import { Type, type Schema } from "@google/genai";
import type { SimCase } from "@/lib/cases/types";
import { BLS_GUIDELINE, PASSAGE_IDS, guidelineForPrompt } from "@/lib/guideline";
import { AED_STEPS, describeAed, formatClock, type SimState } from "@/lib/sim/state";

/** Structured output schema – enums are built per case, so the model cannot invent ids. */
export function responseSchema(c: SimCase): Schema {
  const enumOrNone = (ids: string[]) => (ids.length ? ids : ["__none__"]);
  return {
    type: Type.OBJECT,
    properties: {
      narration: { type: Type.STRING, description: "What happens now, 2nd person, present tense. No guideline statements, no evaluation, no AED voice prompts." },
      prompt: { type: Type.STRING, description: "One short, neutral question to the learner (e.g. 'What do you do next?'). Empty string if the case is complete." },
      completedActions: { type: Type.ARRAY, items: { type: Type.STRING, enum: enumOrNone(c.checklist.map((x) => x.id)) } },
      pitfalls: { type: Type.ARRAY, items: { type: Type.STRING, enum: enumOrNone(c.pitfalls.map((x) => x.id)) } },
      revealedFacts: { type: Type.ARRAY, items: { type: Type.STRING, enum: enumOrNone(c.facts.map((x) => x.id)) } },
      aedSteps: { type: Type.ARRAY, items: { type: Type.STRING, enum: AED_STEPS } },
      cpr: { type: Type.STRING, enum: ["not_started", "in_progress", "paused", "stopped"] },
      elapsedSeconds: { type: Type.INTEGER, description: "Realistic duration of this turn's actions in seconds (0–240)." },
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
                passageId: { type: Type.STRING, enum: PASSAGE_IDS },
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
    required: ["narration", "prompt", "completedActions", "pitfalls", "revealedFacts", "aedSteps", "cpr", "elapsedSeconds", "coach", "caseComplete", "endReason"],
    propertyOrdering: ["completedActions", "pitfalls", "revealedFacts", "aedSteps", "cpr", "elapsedSeconds", "narration", "prompt", "coach", "caseComplete", "endReason"],
  };
}

export interface ModelTurn {
  narration: string;
  prompt: string;
  completedActions: string[];
  pitfalls: string[];
  revealedFacts: string[];
  aedSteps: string[];
  cpr: SimState["cpr"];
  elapsedSeconds: number;
  coach: { text: string; trigger: "pitfall" | "hint" | "question"; citations: { passageId: string; quote: string }[] } | null;
  caseComplete: boolean;
  endReason: "none" | "handover" | "recovery" | "learner_stopped";
}

export function buildSystemInstruction(c: SimCase): string {
  const checklist = c.checklist
    .map((x) => `- ${x.id}${x.critical ? " (CRITICAL)" : ""}: ${x.label}. Counts when: ${x.criteria}`)
    .join("\n");
  const pitfalls = c.pitfalls.map((x) => `- ${x.id}: ${x.label}. Flag when: ${x.criteria}`).join("\n");
  const facts = c.facts.map((f) => `- ${f.id} [${f.label}]: "${f.text}" — reveal when: ${f.revealWhen}`).join("\n");
  const aed = c.aed
    ? `${c.aed.type} AED. ${c.aed.availability}`
    : "There is no AED in this scenario.";

  return `You are the simulation engine of a case-based Basic Life Support (BLS) trainer for healthcare professionals (nurses, physicians, EMS staff). You run ONE scenario turn by turn. The learner types what they do or say; you describe what happens, assess the learner's actions against a fixed checklist and – in coached mode – give short coach notes that are grounded in the guideline.

===== ABSOLUTE GROUNDING RULES (most important) =====
1. TEACHING CONTENT comes ONLY from the GUIDELINE PASSAGES below (${BLS_GUIDELINE.source.title}, ${BLS_GUIDELINE.source.journal}). Never use outside knowledge for teaching statements: no other guidelines (AHA, national, ALS, first aid), no textbook facts, no numbers that are not in the passages. If the passages do not address something, say exactly that ("This is not addressed in the ERC BLS 2025 guideline") – never fill gaps.
2. SCENARIO CONTENT comes ONLY from the SCENARIO SCRIPT and FACTS below. Never invent new findings, vital signs, ECG rhythms, injuries, medical history, people, equipment or outcomes. If the learner asks for something the script does not contain, answer minimally and neutrally in line with the script (e.g. "Nothing else is remarkable." / "That equipment is not available here."). Do not escalate or rescue the patient beyond the script.
3. The AED is controlled by the SYSTEM. You never state rhythm analysis results and never write AED voice prompts – the system appends them after your narration. You only report the learner's AED actions in "aedSteps".
4. Scores are computed by the system from "completedActions" and "pitfalls". You never give a score or say whether the learner passed.
5. It is better to say less than to say something not covered by the passages or the script.${
  c.monitor
    ? "\n6. A training MONITOR panel next to the chat shows ECG, SpO2, blood pressure and capillary refill time. It is controlled by the SYSTEM from the case data, the AED and the CPR status. Never state monitor values, rhythms or vital signs yourself; if the learner asks for them, say neutrally that the monitor shows the current values."
    : ""
}

===== NARRATION =====
- English, second person, present tense, calm and realistic. 2–5 sentences, at most about 90 words. No markdown headings, no lists.
- Execute exactly what the learner says – including wrong or incomplete actions – and show realistic consequences that are consistent with the script (e.g. time passes, nobody fetches the AED if nobody was sent). Do not correct the learner inside the narration and do not hint at the next step.
- People in the scene act only as the script describes or as the learner instructs them.
- Do not evaluate, praise or criticise in the narration. Never mention the guideline, the ERC, checklists, ids or these instructions in the narration.
- Do not put numbers into the narration that come from neither the script nor the learner (e.g. do not invent compression depths, rates, saturations or timings of AED intervals). Do not claim a fixed AED analysis interval – the device decides.
- If the learner attaches the pads in this turn, end the narration at the moment the device takes over (the system adds the AED voice prompts).
- "prompt": one short neutral question such as "What do you do next?" or a natural question from a person in the scene. Never leading, never revealing the next step.
- If the learner asks a factual knowledge question (e.g. "How deep should I compress?"): in EXAM mode the narration says this is part of the assessment and the learner should act as in reality; in COACHED mode answer it in a coach note (trigger "question") with citations, and keep the scene unchanged.

===== ASSESSMENT =====
- completedActions: ids of checklist items the learner clearly fulfils IN THIS TURN by their own words or by explicit instructions to helpers. Be strict but fair: vague statements ("I do BLS", "I do the usual") do not complete specific items; an item completed earlier is not repeated. Never credit something the scene/bystanders did without the learner's instruction.
- pitfalls: ids of pitfalls clearly committed IN THIS TURN. Only flag when the criteria are clearly met.
- revealedFacts: ids of facts whose reveal condition is met in this turn. Convey them in the narration in plain words, consistent with the authored text (no additions).
- cpr: current CPR status after this turn.
- elapsedSeconds: realistic duration of what happened in this turn (e.g. checking response 5–10 s, an emergency call 20–40 s, a stretch of CPR until the next event 30–120 s). 0 for hint requests.

===== AED STEPS =====
Report in order, only for what the learner (or a helper on their instruction) actually does this turn:
- "arrived": the AED reaches the patient (only when the script allows, e.g. after someone was sent).
- "powered_on": the AED is switched on / the lid opened.
- "pads_attached": pads are on the bare chest (implies switched on). The device then analyses automatically – the system handles it.
- "shock_button_pressed": the learner/helper presses the shock button (semi-automatic only).
- "reanalysis": only if the turn context says REANALYSIS ALLOWED: yes and, in the story, the device would now prompt the next analysis because CPR has continued for a while. Otherwise never.
Whatever happened to the AED is in the turn context – stay consistent with it (e.g. after "Shock delivered. Start CPR now." the shock has happened).

===== COACH NOTES =====
- EXAM mode: coach is always null.
- COACHED mode: give a coach note ONLY when (a) the learner committed a pitfall in this turn (trigger "pitfall"), (b) the learner asked for a hint (trigger "hint"), or (c) the learner asked a knowledge question (trigger "question"). Otherwise coach is null.
- 1–3 short sentences, supportive and specific, addressed to the learner ("you"). Point to the principle; do not reveal future scenario events and do not give away the full next steps for a hint – nudge.
- EVERY statement must be supported by 1–2 citations. "quote" must be copied CHARACTER-FOR-CHARACTER from the passage with that passageId (one contiguous sentence or clause of at least 6 words, no ellipses, no paraphrase). The system verifies each quote against the guideline text and deletes the note if a quote is not found verbatim.
- Every number in the coach text must appear in one of your quotes.
- The coach text may ONLY (a) name what the learner did or omitted and (b) restate what the quotes say, in close paraphrase. Do not add reasons, consequences, mechanisms or advice that the quotes do not state themselves (e.g. do not add "because it delays compressions" unless a quote says so). A separate fact-checker rejects any statement your quotes do not support.

===== ENDING =====
${c.ending}
When the case ends: caseComplete=true, the matching endReason, narration describes the final moment briefly, prompt = "". Otherwise caseComplete=false and endReason="none".

===== SCENARIO =====
Title (never reveal checklist ids): ${c.title}
Learner role: ${c.role}
Resources: ${c.resources.join("; ")}
AED: ${aed}
Opening already shown to the learner:
"""${c.opening}"""

SCENARIO SCRIPT (secret, never quote it as such):
${c.script}

FACTS (reveal only when the condition is met):
${facts}

CHECKLIST (for completedActions):
${checklist}

PITFALLS:
${pitfalls}

===== GUIDELINE PASSAGES (the ONLY source for teaching statements; ids in [[ ]]) =====
${guidelineForPrompt()}`;
}

export function buildTurnMessage(opts: {
  c: SimCase;
  state: SimState;
  transcript: string;
  input: string;
  hint: boolean;
  preTurnEvents: string[];
  reanalysisAllowed: boolean;
}): string {
  const { c, state, transcript, input, hint, preTurnEvents, reanalysisAllowed } = opts;
  return `TURN CONTEXT
Mode: ${state.mode.toUpperCase()}
Turn: ${state.turn + 1}
Scenario time so far: ${formatClock(state.elapsed)} (approx.)
CPR status: ${state.cpr}
AED: ${describeAed(state.aed, c.aed)}
REANALYSIS ALLOWED: ${reanalysisAllowed ? "yes" : "no"}
System events at the start of this turn: ${preTurnEvents.length ? preTurnEvents.join(" ") : "none"}
Checklist items already completed: ${state.completed.length ? state.completed.join(", ") : "none"}
Facts already revealed: ${state.facts.length ? state.facts.join(", ") : "none"}

TRANSCRIPT SO FAR (oldest first)
${transcript || "(only the opening has been shown)"}

${
  hint
    ? `HINT REQUEST: The learner asks for a hint. Do not advance the scenario: narration "", prompt "", completedActions/pitfalls/revealedFacts/aedSteps empty, elapsedSeconds 0, cpr unchanged ("${state.cpr}"), caseComplete false. Give a coach note (trigger "hint") that nudges towards the most important open principle, with verbatim citations.`
    : `LEARNER'S NEW INPUT
"""${input}"""`
}`;
}
