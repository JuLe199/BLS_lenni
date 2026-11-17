import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { VerifiedCitation } from "@/lib/sim/chat";

/**
 * Second, independent check for coach notes: after the deterministic quote check has passed,
 * a separate model call (fresh context, no scenario, no guideline) verifies that every
 * knowledge claim in the note is entailed by the verified quotes alone. This catches added
 * reasons or facts that sit next to a correct quote ("…because X") but are not in it.
 * Fails closed: if the checker errors, the note is treated as unverified.
 */
export async function checkEntailment(
  ai: GoogleGenAI,
  model: string,
  note: string,
  citations: VerifiedCitation[],
  learnerAction: string
): Promise<{ ok: boolean; problems: string[] }> {
  const prompt = `You are a strict fact-checker for a medical training app.

NOTE (feedback shown to a learner in a Basic Life Support simulation):
"""${note}"""

QUOTES (verbatim excerpts from the ERC Guidelines 2025 Adult BLS – the ONLY allowed evidence):
${citations.map((c, i) => `${i + 1}. "${c.quote}"`).join("\n")}

LEARNER ACTION in the simulation (context only, not evidence):
"""${learnerAction}"""

Task: Identify every statement in NOTE that conveys resuscitation knowledge – a fact, a recommendation, a reason/consequence, a definition or a number. Each such statement must be directly supported by the QUOTES (close paraphrase is fine; adding facts, reasons, numbers or stronger wording than the quotes is NOT). Statements that merely describe what the learner did or did not do, or that address the learner (e.g. "Think about…", "You moved the patient"), need no support.
Return supported=true only if all knowledge statements are supported. List each unsupported statement verbatim in unsupportedClaims.`;

  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            unsupportedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
            supported: { type: Type.BOOLEAN },
          },
          required: ["unsupportedClaims", "supported"],
          propertyOrdering: ["unsupportedClaims", "supported"],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 2048,
      },
    });
    const out = JSON.parse(res.text ?? "{}") as { supported?: boolean; unsupportedClaims?: string[] };
    const claims = (out.unsupportedClaims ?? []).filter((x) => x.trim());
    if (out.supported === true && claims.length === 0) return { ok: true, problems: [] };
    return {
      ok: false,
      problems: claims.length
        ? claims.map((cl) => `Statement not supported by your quotes: "${cl}"`)
        : ["The fact-checker could not confirm that all statements are supported by your quotes."],
    };
  } catch (err) {
    console.warn("entailment check failed", err);
    return { ok: false, problems: ["Fact-check unavailable."] };
  }
}
