"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ChevronDown, ClipboardList, MessageCircleQuestion } from "lucide-react";
import type { KnowledgeModule } from "@/data/knowledge";
import { updateKnowledgeProgress, useKnowledgeProgress } from "@/lib/progress";
import { GUIDELINES } from "@/lib/guideline";
import { GuidelineQuote } from "@/components/GuidelineCitation";
import QuizBlock from "@/components/QuizBlock";
import { askTeamLeader } from "@/components/TeamLeader";

export default function KnowledgeSection({ module: m }: { module: KnowledgeModule }) {
  const progress = useKnowledgeProgress()[m.id];
  const [open, setOpen] = useState<string | null>(null);
  const G = GUIDELINES[m.id];
  const read = m.chapters.filter((c) => progress.chapters.includes(c.id)).length;
  const quizPassed = (progress.quizBest ?? 0) >= 80;

  const toggle = (id: string) => {
    setOpen((o) => (o === id ? null : id));
    if (!progress.chapters.includes(id)) updateKnowledgeProgress(m.id, (x) => ({ ...x, chapters: [...x.chapters, id] }));
  };

  const gradient = m.id === "als" ? "from-indigo-700 to-navy" : "from-resus to-rose-900";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
      <header className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} px-6 py-7 text-white shadow-xl sm:px-8`}>
        <BookOpen className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/10" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Knowledge · {m.id.toUpperCase()}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{m.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          {m.subtitle}. Every statement is a word-for-word quote from the {G.source.title} – tap a source chip to see the passage in context.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">{read}/{m.chapters.length} chapters read</span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">Quiz: {progress.quizBest === null ? "not taken" : `best ${progress.quizBest} %`}</span>
          <Link href={`/${m.id}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold text-slate-900 hover:bg-white/90">
            Practise with {m.id.toUpperCase()} cases <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><BookOpen className="h-5 w-5 text-knowledge" /> Chapters</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">In the order of the guideline. Open a chapter to mark it as read.</p>
          </div>
          {read === m.chapters.length && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> all read</span>}
        </div>
        <div className="space-y-2">
          {m.chapters.map((c) => {
            const done = progress.chapters.includes(c.id);
            return (
              <div key={c.id} className="card !p-0 overflow-hidden">
                <button onClick={() => toggle(c.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left" aria-expanded={open === c.id}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
                    {done ? "✓" : "•"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900 dark:text-white">{c.title}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{c.intro}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open === c.id ? "rotate-180" : ""}`} />
                </button>
                {open === c.id && (
                  <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-700">
                    <div className="grid gap-2 md:grid-cols-2">
                      {c.points.map((q, k) => <GuidelineQuote key={k} passageId={q.ref} quote={q.quote} />)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.practice && (
                        <Link href={c.practice.href} className="btn-secondary !py-1.5 text-xs">Practise: {c.practice.label} <ArrowRight className="h-3.5 w-3.5" /></Link>
                      )}
                      <button onClick={() => askTeamLeader(`${m.id.toUpperCase()} – ${c.title.replace(/^\d+ · /, "")}: `)} className="btn-secondary !py-1.5 text-xs">
                        <MessageCircleQuestion className="h-3.5 w-3.5 text-knowledge" /> Ask the Team Leader about this
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section id="quiz" className="scroll-mt-20">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><ClipboardList className="h-5 w-5 text-knowledge" /> Quiz</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{m.quiz.length} questions · pass mark 80 % · explanations quoted from the guideline</p>
          </div>
          {quizPassed && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> passed</span>}
        </div>
        <QuizBlock
          questions={m.quiz}
          best={progress.quizBest}
          anchorId="quiz"
          onSubmit={(score) => updateKnowledgeProgress(m.id, (x) => ({ ...x, quizAttempts: x.quizAttempts + 1, quizBest: Math.max(x.quizBest ?? 0, score) }))}
        />
      </section>
    </div>
  );
}
