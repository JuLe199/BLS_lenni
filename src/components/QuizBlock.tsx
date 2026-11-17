"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Quote, QuizQuestion } from "@/data/aed-training";
import { CitationChip } from "@/components/GuidelineCitation";

function QuoteLine({ q }: { q: Quote }) {
  return (
    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <span className="italic">“{q.quote}”</span> <CitationChip passageId={q.ref} quote={q.quote} compact />
    </p>
  );
}

/** Multiple-choice quiz; explanations are verbatim guideline quotes. Pass mark 80 %. */
export default function QuizBlock({ questions, best, anchorId, onSubmit }: { questions: QuizQuestion[]; best: number | null; anchorId: string; onSubmit: (score: number) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = Math.round((questions.filter((q) => answers[q.id] === q.correct).length / questions.length) * 100);
  const complete = questions.every((q) => answers[q.id] !== undefined);

  const submit = () => {
    setSubmitted(true);
    onSubmit(score);
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      {submitted && (
        <div className={`card flex items-center gap-4 !p-5 ${score >= 80 ? "ring-2 ring-emerald-300" : "ring-2 ring-amber-300"}`}>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{score}%</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{score >= 80 ? "Passed. Well done!" : "Not passed yet (≥ 80 % needed). Read the explanations and try again."}</p>
          <button onClick={() => { setAnswers({}); setSubmitted(false); }} className="btn-secondary ml-auto !py-2 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Again</button>
        </div>
      )}
      {questions.map((q, i) => {
        const a = answers[q.id];
        return (
          <div key={q.id} className="card !p-5">
            <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{i + 1}. {q.question}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, k) => {
                const chosen = a === k;
                const cls = submitted
                  ? k === q.correct
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
                    : chosen
                      ? "border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100"
                      : "border-slate-200 text-slate-500 dark:border-slate-700"
                  : chosen
                    ? "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100"
                    : "border-slate-200 text-slate-700 hover:border-blue-300 dark:border-slate-600 dark:text-slate-200";
                return (
                  <button key={k} disabled={submitted} onClick={() => setAnswers((x) => ({ ...x, [q.id]: k }))} className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${cls}`}>
                    {o}
                  </button>
                );
              })}
            </div>
            {submitted && <div className="mt-3"><QuoteLine q={q.explanation} /></div>}
          </div>
        );
      })}
      {!submitted && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">{Object.keys(answers).length}/{questions.length} answered{best !== null && ` · your best so far: ${best} %`}</p>
          <button onClick={submit} disabled={!complete} className="btn-primary">Submit quiz</button>
        </div>
      )}
    </div>
  );
}

