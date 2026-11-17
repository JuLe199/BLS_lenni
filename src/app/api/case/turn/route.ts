import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getCase } from "@/data/cases/bls";
import { buildSystemInstruction, buildTurnMessage, responseSchema, type ModelTurn } from "@/lib/sim/prompt";
import { sanitiseNarration, verifyCoach } from "@/lib/sim/guards";
import { checkEntailment } from "@/lib/sim/entailment";
import { transcriptForModel, type ChatItem } from "@/lib/sim/chat";
import { applyAedSteps, endOfTurnAed, postTurnAutoAnalysis, preTurnAedEvents, type AedStep, type SimState } from "@/lib/sim/state";
import { checkAccess } from "@/lib/server/access";
import { timelineEvents } from "@/lib/sim/monitor";

export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-4-hydrogen";
const THINKING: Record<string, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

interface TurnRequest {
  caseId: string;
  state: SimState;
  items: ChatItem[];
  input?: string;
  hint?: boolean;
}

export async function POST(req: NextRequest) {
  const denied = checkAccess(req);
  if (denied) return denied;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });

  let body: TurnRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const c = getCase(body.caseId);
  if (!c) return NextResponse.json({ error: "Unknown case." }, { status: 404 });
  const state = body.state;
  if (!state || state.caseId !== c.id || state.ended) return NextResponse.json({ error: "Invalid or finished session." }, { status: 400 });
  const hint = Boolean(body.hint) && state.mode === "coached";
  const input = (body.input ?? "").trim().slice(0, 800);
  if (!hint && !input) return NextResponse.json({ error: "Empty input." }, { status: 400 });

  // 1) deterministic device events at the start of the turn (not for hint requests)
  const pre = hint ? { aed: state.aed, prompts: [], events: [] } : preTurnAedEvents(state.aed, c.aed);
  const stateForPrompt: SimState = { ...state, aed: pre.aed };
  const reanalysisAllowed = pre.aed.status === "cpr" && pre.aed.padsAttached && pre.aed.cprTurns >= 1;

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(c);
  const userMessage = buildTurnMessage({
    c,
    state: stateForPrompt,
    transcript: transcriptForModel(body.items ?? []),
    input,
    hint,
    preTurnEvents: pre.events,
    reanalysisAllowed,
  });

  const call = async (extra?: string): Promise<ModelTurn> => {
    const contents = [{ role: "user", parts: [{ text: userMessage }] }];
    if (extra) contents.push({ role: "user", parts: [{ text: extra }] });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: responseSchema(c),
        thinkingConfig: { thinkingLevel: THINKING[process.env.GEMINI_THINKING_LEVEL ?? "low"] ?? ThinkingLevel.LOW },
        maxOutputTokens: 8192,
      },
    });
    const text = res.text ?? "";
    return JSON.parse(text) as ModelTurn;
  };

  let turn: ModelTurn;
  try {
    turn = await call();
  } catch (err) {
    console.error("case turn: model error", err);
    return NextResponse.json({ error: "The simulation engine did not respond. Please try again." }, { status: 502 });
  }

  // 2) coach note verification (+ one repair attempt)
  const guard = { coachRepaired: false, coachWithheld: false, narrationRemoved: [] as string[], aedIgnored: [] as string[] };
  let coach = state.mode === "exam" ? null : turn.coach;
  // Layer 1: deterministic (quotes verbatim, numbers covered). Layer 2: independent entailment check.
  const verifyFull = async (cn: NonNullable<ModelTurn["coach"]>) => {
    const det = verifyCoach(cn.text, cn.citations ?? []);
    if (!det.ok) return det;
    const ent = await checkEntailment(ai, MODEL, cn.text, det.citations, hint ? "(The learner asked for a hint.)" : input);
    return ent.ok ? det : { ...det, ok: false, problems: ent.problems };
  };
  if (coach) {
    let check = await verifyFull(coach);
    if (!check.ok) {
      try {
        const repaired = await call(
          `VERIFICATION FAILED for your coach note:\n- ${check.problems.join("\n- ")}\nReturn the complete JSON again (identical scenario decisions), but fix the coach note: copy quotes character-for-character from the passage text, only use numbers that appear in your quotes, and remove every statement (including reasons and consequences) that your quotes do not state. If you cannot support the note with verbatim quotes, set coach to null.`
        );
        if (repaired.coach) {
          const check2 = await verifyFull(repaired.coach);
          if (check2.ok) {
            coach = repaired.coach;
            check = check2;
            guard.coachRepaired = true;
          }
        }
      } catch (err) {
        console.warn("case turn: repair call failed", err);
      }
    }
    if (!check.ok) {
      console.warn("case turn: coach withheld", check.problems);
      coach = null;
      guard.coachWithheld = true;
    } else {
      coach = { ...coach, citations: check.citations };
    }
  }

  const newItems: ChatItem[] = [];

  if (hint) {
    if (coach) newItems.push({ kind: "coach", text: coach.text, trigger: "hint", citations: coach.citations as never });
    else newItems.push({ kind: "notice", tone: "info", text: "No verified hint could be generated for this moment – try describing your next action." });
    return NextResponse.json({ state, items: newItems, guard });
  }

  // 3) narration sanitising
  const allowedSources = [c.opening, c.script, ...c.facts.map((f) => f.text), ...c.resources, input].join(" ");
  const narr = sanitiseNarration(turn.narration ?? "", allowedSources);
  guard.narrationRemoved = narr.removed;

  // 4) state update – only known ids, deterministic AED
  const known = (ids: string[], pool: string[]) => Array.from(new Set((ids ?? []).filter((x) => pool.includes(x))));
  const newCompleted = known(turn.completedActions, c.checklist.map((x) => x.id)).filter((x) => !state.completed.includes(x));
  const newPitfalls = known(turn.pitfalls, c.pitfalls.map((x) => x.id)).filter((x) => !state.pitfalls.includes(x));
  const newFacts = known(turn.revealedFacts, c.facts.map((x) => x.id)).filter((x) => !state.facts.includes(x));

  const aedRes = applyAedSteps(pre.aed, (turn.aedSteps ?? []) as AedStep[], c.aed);
  guard.aedIgnored = aedRes.ignored;
  const cprAfter = turn.cpr ?? state.cpr;
  const auto = postTurnAutoAnalysis(endOfTurnAed(pre.aed.status, aedRes.aed), c.aed, cprAfter);
  const aedAfter = auto.aed;

  const ended = Boolean(turn.caseComplete) && turn.endReason !== "none";
  const next: SimState = {
    ...state,
    turn: state.turn + 1,
    elapsed: state.elapsed + Math.max(0, Math.min(240, Math.round(turn.elapsedSeconds || 0))),
    completed: [...state.completed, ...newCompleted],
    pitfalls: [...state.pitfalls, ...newPitfalls],
    facts: [...state.facts, ...newFacts],
    cpr: cprAfter,
    aed: aedAfter,
    ended,
    endReason: ended ? (turn.endReason as SimState["endReason"]) : null,
    log: [...state.log, { turn: state.turn + 1, input, completed: newCompleted, pitfalls: newPitfalls }],
  };
  next.timeline = [...(state.timeline ?? []), ...timelineEvents(state, next, c.monitor)];

  newItems.push({
    kind: "scene",
    text: narr.text || "…",
    prompt: ended ? undefined : turn.prompt || "What do you do next?",
    facts: newFacts.map((id) => {
      const f = c.facts.find((x) => x.id === id)!;
      return { id: f.id, label: f.label, text: f.text };
    }),
  });
  const aedLines = [...pre.prompts, ...aedRes.prompts, ...auto.prompts];
  if (aedLines.length) newItems.push({ kind: "aed", lines: aedLines });
  if (coach) newItems.push({ kind: "coach", text: coach.text, trigger: coach.trigger, citations: coach.citations as never });
  if (guard.coachWithheld)
    newItems.push({ kind: "notice", tone: "warn", text: "A coach note was withheld because it could not be verified word-for-word against the guideline." });

  return NextResponse.json({ state: next, items: newItems, guard });
}
