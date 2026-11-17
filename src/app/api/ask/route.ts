import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel, Type, type Schema } from "@google/genai";
import { checkAccess } from "@/lib/server/access";
import { retrievePassages } from "@/lib/ask";
import { passagesForPrompt, type Passage } from "@/lib/guideline";
import { verifyCoach } from "@/lib/sim/guards";
import { checkEntailment } from "@/lib/sim/entailment";
import type { VerifiedCitation } from "@/lib/sim/chat";

export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-4-hydrogen";

interface AskRequest {
  question?: string;
  /** Previous exchange (for follow-up questions) – context only. */
  previous?: { question: string; answer: string } | null;
}

interface ModelAnswer {
  answerable: boolean;
  statements: { text: string; citations: { passageId: string; quote: string }[] }[];
}

export interface AskStatement {
  text: string;
  citations: VerifiedCitation[];
}

function schema(ids: string[]): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      answerable: { type: Type.BOOLEAN, description: "false if the passages do not answer the question." },
      statements: {
        type: Type.ARRAY,
        description: "The answer as 1–5 short statements, each backed by verbatim quotes. Empty if not answerable.",
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            citations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  passageId: { type: Type.STRING, enum: ids },
                  quote: { type: Type.STRING, description: "Copied character-for-character from the passage." },
                },
                required: ["passageId", "quote"],
                propertyOrdering: ["passageId", "quote"],
              },
            },
          },
          required: ["text", "citations"],
          propertyOrdering: ["citations", "text"],
        },
      },
    },
    required: ["answerable", "statements"],
    propertyOrdering: ["answerable", "statements"],
  };
}

function systemInstruction(passages: Passage[]): string {
  return `You are "the Team Leader" in a resuscitation training app for healthcare professionals: an experienced resuscitation team leader who answers learners' questions about adult Basic and Advanced Life Support.

ABSOLUTE RULES
1. Answer ONLY from the GUIDELINE PASSAGES below (ERC Guidelines 2025 Adult BLS and Adult ALS). Never use outside knowledge: no other guidelines, no textbook facts, no local protocols, no drug doses or numbers that are not in the passages.
2. Split the answer into 1–5 short statements (1–2 sentences each). EVERY statement needs 1–2 citations whose "quote" is copied CHARACTER-FOR-CHARACTER from the passage with that passageId (one contiguous sentence or clause of at least 6 words). The system deletes statements whose quotes are not verbatim.
3. Every number in a statement must appear in one of that statement's quotes. Do not add reasons, consequences or recommendations that the quotes do not state.
4. If the passages do not answer the question (or it is not about resuscitation), set answerable=false and statements=[]. Do not guess. Questions about individual patients, diagnoses or treatment outside training: answerable=false.
5. Write the statements in the language of the question (German question → German statements; the quotes always stay in the original English). Be concise, practical and neutral, like a calm team leader explaining at the bedside. No markdown.
6. Never claim more certainty than the passages: keep "consider", "may", "should" as in the source.

GUIDELINE PASSAGES (the ONLY source; ids in [[ ]])
${passagesForPrompt(passages)}`;
}

export async function POST(req: NextRequest) {
  const denied = checkAccess(req);
  if (denied) return denied;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });

  let body: AskRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const question = (body.question ?? "").trim().slice(0, 600);
  if (question.length < 3) return NextResponse.json({ error: "Please type a question." }, { status: 400 });
  const prev = body.previous && typeof body.previous.question === "string" ? body.previous : null;

  // Retrieval uses the follow-up context too ("and in asystole?").
  const passages = retrievePassages(prev ? `${prev.question} ${question}` : question);
  const ids = passages.map((p) => p.id);
  const ai = new GoogleGenAI({ apiKey });
  const userText = `${prev ? `PREVIOUS QUESTION (context): ${prev.question.slice(0, 400)}\nPREVIOUS ANSWER (context): ${prev.answer.slice(0, 800)}\n\n` : ""}QUESTION: ${question}`;

  const call = async (extra?: string): Promise<ModelAnswer> => {
    const contents = [{ role: "user", parts: [{ text: userText }] }];
    if (extra) contents.push({ role: "user", parts: [{ text: extra }] });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: systemInstruction(passages),
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: schema(ids),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 4096,
      },
    });
    return JSON.parse(res.text ?? "{}") as ModelAnswer;
  };

  /** Layer 1 (deterministic, per statement) + layer 2 (independent entailment check over the whole answer). */
  const verify = async (ans: ModelAnswer) => {
    const kept: AskStatement[] = [];
    const problems: string[] = [];
    for (const st of (ans.statements ?? []).slice(0, 6)) {
      const det = verifyCoach(st.text, st.citations ?? [], passages);
      if (det.ok) kept.push({ text: st.text.trim(), citations: det.citations });
      else problems.push(...det.problems.map((p) => `Statement "${st.text.slice(0, 80)}": ${p}`));
    }
    if (!kept.length) return { kept, problems };
    const ent = await checkEntailment(
      ai,
      MODEL,
      kept.map((k) => k.text).join("\n"),
      kept.flatMap((k) => k.citations),
      question,
      { noteKind: "answer of the Team Leader to a learner's question", contextLabel: "LEARNER QUESTION" }
    );
    if (ent.ok) return { kept, problems };
    // Drop the statements the checker flagged; if it could not name them, fail closed.
    const flagged = ent.problems.map((p) => p.match(/"(.+)"$/)?.[1]).filter(Boolean) as string[];
    if (!flagged.length) return { kept: [], problems: [...problems, ...ent.problems] };
    const survivors = kept.filter((k) => !flagged.some((f) => k.text.includes(f) || f.includes(k.text)));
    return { kept: survivors, problems: [...problems, ...ent.problems] };
  };

  let ans: ModelAnswer;
  try {
    ans = await call();
  } catch (err) {
    console.error("ask: model error", err);
    return NextResponse.json({ error: "The Team Leader is not reachable right now. Please try again." }, { status: 502 });
  }
  if (!ans.answerable || !ans.statements?.length) return NextResponse.json({ answerable: false, statements: [] });

  let result = await verify(ans);
  let repaired = false;
  if (result.problems.length) {
    try {
      const again = await call(
        `VERIFICATION FAILED:\n- ${result.problems.slice(0, 8).join("\n- ")}\nReturn the complete JSON again. Copy every quote character-for-character from its passage, only use numbers that appear in that statement's quotes, and remove every statement (including reasons and consequences) that your quotes do not state. If you cannot support the answer with verbatim quotes, set answerable=false.`
      );
      if (again.answerable && again.statements?.length) {
        const r2 = await verify(again);
        if (r2.kept.length && r2.problems.length <= result.problems.length && r2.kept.length >= result.kept.length) {
          result = r2;
          repaired = true;
        }
      }
    } catch (err) {
      console.warn("ask: repair failed", err);
    }
  }
  if (!result.kept.length) return NextResponse.json({ answerable: false, statements: [], withheld: true });
  return NextResponse.json({ answerable: true, statements: result.kept, partial: result.problems.length > 0, repaired });
}
