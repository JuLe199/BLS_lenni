import Link from "next/link";
import { BookOpenText, Bot, Calculator, CheckCheck, Cpu, FileCheck2, MessageCircleQuestion, ShieldAlert, ShieldCheck } from "lucide-react";
import { ALS_GUIDELINE, BLS_GUIDELINE } from "@/lib/guideline";
import { ALS_CASES, BLS_CASES } from "@/data/cases";

export const metadata = { title: "How the AI is grounded – eLS" };

const LAYERS = [
  {
    icon: BookOpenText,
    title: "1 · One closed knowledge base",
    text: `The model receives the ${BLS_GUIDELINE.source.short} (${BLS_GUIDELINE.passages.length} passages) and the ${ALS_GUIDELINE.source.short} (${ALS_GUIDELINE.passages.length} passages) – page-referenced, generated mechanically from the PDFs – and is instructed to use nothing else for teaching content. If the guideline does not address something, the answer is “not addressed in the guideline” – never a gap-filling guess.`,
  },
  {
    icon: FileCheck2,
    title: "2 · Authored cases, not invented ones",
    text: `All ${BLS_CASES.length} BLS and ${ALS_CASES.length} ALS scenarios are written in advance: findings, people, equipment, the rhythm sequence and the ending. The model may only reveal authored findings; it is told never to add vital signs, rhythms or outcomes.`,
  },
  {
    icon: Cpu,
    title: "3 · Deterministic devices and physiology",
    text: "The model only reports what the learner did (pads attached, rhythm check, shock, drug given …) as fixed categories. AED prompts, the monitor (ECG, SpO₂, blood pressure, ETCO₂), rhythm-check results, IV/IO success, drug timing and ROSC come from state machines and the case script – the model cannot change them. In ALS cases the rhythm is never named: you interpret it.",
  },
  {
    icon: ShieldCheck,
    title: "4 · Verified coach notes",
    text: "Every coach note must cite the guideline. The server checks each quote word-for-word against the passage text and that every number in the note appears in a quote. A second, independent model call then checks that every knowledge statement in the note is entailed by those quotes alone (no added reasons or facts). One repair attempt is allowed; if the note still fails, it is withheld – and you are told so.",
  },
  {
    icon: Bot,
    title: "5 · Narration filter",
    text: "Scene descriptions are filtered: sentences announcing shock decisions, talking about the guideline, or containing clinical numbers (cm, %, rates, ratios) that appear neither in the case, your input nor the guideline are removed.",
  },
  {
    icon: Calculator,
    title: "6 · Deterministic score",
    text: "The model only decides which checklist items you performed (structured output with fixed ids). The score, pass/fail and the whole debrief are calculated and rendered from authored content – no AI text in the debrief.",
  },
  {
    icon: MessageCircleQuestion,
    title: "7 · Ask the Team Leader",
    text: "Questions are answered from guideline passages selected for the question. The answer is split into statements; each statement must carry verbatim quotes (checked word-for-word, numbers included) and passes the independent entailment check. Unverifiable statements are removed – if nothing survives, the Team Leader says the guidelines do not answer it.",
  },
  {
    icon: CheckCheck,
    title: "8 · Build-time content check",
    text: "`npm run verify:content` fails if a case references a non-existent passage or if any teaching quote in cases, knowledge sections, quizzes or the AED module is not verbatim in the guideline.",
  },
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Method</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">How the AI is kept accurate</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
        Language models can produce fluent but wrong statements. In this trainer the AI is used for what it is good at – understanding free-text actions
        and narrating a scene – while everything that must be correct is either authored in advance or mechanically verified.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {LAYERS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card !p-5">
            <Icon className="h-5 w-5 text-blue-500" />
            <h2 className="mt-2 font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <p className="font-semibold">Remaining limitations</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>The AI can misjudge which checklist item you fulfilled (too strict or too lenient). The action log in the debrief shows each decision.</li>
            <li>Scene narration is AI-generated within the case script; it is filtered but not quote-verified.</li>
            <li>The simulation trains decisions, not psychomotor skills – hands-on CPR training remains essential.</li>
            <li>The guideline text is © European Resuscitation Council / Elsevier. Clarify licensing before public deployment.</li>
          </ul>
        </div>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/guideline" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Browse the full knowledge base →</Link>
      </p>
    </div>
  );
}
