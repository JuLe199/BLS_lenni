"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Circle, CircleDot, GraduationCap, RotateCcw, Zap } from "lucide-react";
import type { PublicCase } from "@/lib/cases/public";
import { bestResult, resetProgress, useAedProgress, useKnowledgeProgress, useResults } from "@/lib/progress";
import { COMPETENCIES, competencyScores, learningLevel } from "@/lib/learning";
import { AED_LESSONS } from "@/data/aed-training";
import { KNOWLEDGE } from "@/data/knowledge";

function useLevel(cases: PublicCase[]) {
  const results = useResults();
  const aed = useAedProgress();
  const knowledge = useKnowledgeProgress();
  const lv = learningLevel({
    results,
    caseIds: { bls: cases.filter((c) => c.module === "bls").map((c) => c.id), als: cases.filter((c) => c.module === "als").map((c) => c.id) },
    aed,
    aedLessonCount: AED_LESSONS.length,
    knowledge,
    chapterIds: { bls: KNOWLEDGE.bls.chapters.map((c) => c.id), als: KNOWLEDGE.als.chapters.map((c) => c.id) },
  });
  return { results, aed, knowledge, lv };
}

function Ring({ percent, size = 112 }: { percent: number; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} className="fill-none stroke-slate-200 dark:stroke-slate-700" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} className="fill-none stroke-blue-500 transition-all duration-700" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{percent}%</span>
      </div>
    </div>
  );
}

function Bar({ percent, tone = "bg-blue-500" }: { percent: number | null; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      {percent !== null && <div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${percent}%` }} />}
    </div>
  );
}

/** Compact card for the dashboard. */
export function LearningLevelCard({ cases }: { cases: PublicCase[] }) {
  const { lv } = useLevel(cases);
  return (
    <Link href="/progress" className="card group flex items-center gap-4 !p-5">
      <Ring percent={lv.percent} size={76} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><GraduationCap className="h-3.5 w-3.5" /> Learning progress</p>
        <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{lv.level}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lv.casesPassed}/{lv.casesTotal} cases passed · knowledge {Math.round(lv.knowledgeShare * 100)}%
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function LearningProgress({ cases }: { cases: PublicCase[] }) {
  const { results, aed, knowledge, lv } = useLevel(cases);
  const [confirmReset, setConfirmReset] = useState(false);
  const comps = competencyScores(results);
  const weakest = comps.filter((c) => c.percent !== null).sort((a, b) => a.percent! - b.percent!)[0];
  const recent = [...results].reverse().slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Your learning progress</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Where you stand</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Stored only in this browser. Calculated from your case results, the knowledge sections and the AED training – no AI involved.</p>

      <section className="card mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Ring percent={lv.percent} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current level</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{lv.level}</p>
          {lv.nextLevel && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lv.nextLevel.at - lv.percent} % to “{lv.nextLevel.label}”</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Cases passed (60 %)</span><span>{lv.casesPassed}/{lv.casesTotal}</span></div>
              <Bar percent={lv.casesTotal ? (lv.casesPassed / lv.casesTotal) * 100 : 0} tone="bg-resus" />
              <p className="mt-1 text-[11px] text-slate-400">BLS {lv.byModule.bls.passed}/{lv.byModule.bls.total} · ALS {lv.byModule.als.passed}/{lv.byModule.als.total}</p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Knowledge (40 %)</span><span>{Math.round(lv.knowledgeShare * 100)} %</span></div>
              <Bar percent={lv.knowledgeShare * 100} tone="bg-knowledge" />
              <p className="mt-1 text-[11px] text-slate-400">BLS {Math.round(lv.knowledge.bls * 100)} % · ALS {Math.round(lv.knowledge.als * 100)} % · AED {Math.round(lv.aedShare * 100)} %</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Competencies</h2>
        {(["bls", "als"] as const).map((mod) => (
        <div key={mod} className="mb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{mod.toUpperCase()}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {comps.filter((c) => COMPETENCIES.find((x) => x.id === c.id)?.module === mod).map((c) => (
            <div key={c.id} className="card !p-5">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-white">{c.label}</p>
                <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{c.percent === null ? "–" : `${c.percent} %`}</p>
              </div>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{c.description}</p>
              <Bar percent={c.percent} tone={c.percent === null ? "bg-slate-300" : c.percent >= 80 ? "bg-emerald-500" : c.percent >= 50 ? "bg-amber-500" : "bg-rose-500"} />
              <p className="mt-1.5 text-[11px] text-slate-400">{c.total ? `${c.done} of ${c.total} actions met in your latest attempts` : `Not assessed yet – play a ${mod.toUpperCase()} case`}</p>
            </div>
          ))}
        </div>
        </div>
        ))}
        {weakest && weakest.percent! < 80 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            Focus next on <strong>{weakest.label.toLowerCase()}</strong>{weakest.id === "aed" && <> – the <Link href="/aed" className="font-semibold underline">AED training</Link> helps here</>}.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {(["bls", "als"] as const).map((mod) => (
        <div key={mod} className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{mod.toUpperCase()} cases</h2>
          <ul className="space-y-2">
            {cases.filter((c) => c.module === mod).map((c) => {
              const best = bestResult(results, c.id);
              const Icon = best?.passed ? CheckCircle2 : best ? CircleDot : Circle;
              return (
                <li key={c.id}>
                  <Link href={`/${c.module}/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <Icon className={`h-5 w-5 shrink-0 ${best?.passed ? "text-emerald-500" : best ? "text-amber-500" : "text-slate-300"}`} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{c.number}. {c.title}</span>
                    <span className="font-mono text-xs text-slate-400">{best ? `best ${best.score}` : "open"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        ))}

        {(["bls", "als"] as const).map((mod) => {
          const k = knowledge[mod];
          const total = KNOWLEDGE[mod].chapters.length;
          const read = KNOWLEDGE[mod].chapters.filter((c) => k.chapters.includes(c.id)).length;
          return (
            <div key={`k-${mod}`} className="card">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white"><BookOpen className="h-4 w-4 text-knowledge" /> {mod.toUpperCase()} knowledge</h2>
              <ul className="space-y-2 text-sm">
                {[
                  ["Chapters read", `${read}/${total}`, read >= total],
                  ["Quiz (pass ≥ 80 %)", k.quizBest === null ? "not taken" : `best ${k.quizBest} %`, (k.quizBest ?? 0) >= 80],
                ].map(([label, val, ok]) => (
                  <li key={label as string} className="flex items-center gap-3 px-2">
                    {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{label}</span>
                    <span className="font-mono text-xs text-slate-400">{val}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/learn/${mod}`} className="btn-secondary mt-4 w-full !py-2 text-xs">Open {mod.toUpperCase()} knowledge <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          );
        })}

        <div className="card">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white"><Zap className="h-4 w-4 text-aed" /> AED training</h2>
          <ul className="space-y-2 text-sm">
            {[
              [`Lessons read`, `${aed.lessons.length}/${AED_LESSONS.length}`, aed.lessons.length >= AED_LESSONS.length],
              [`Pad placement exercise`, aed.padsDone ? "solved" : "open", aed.padsDone],
              [`AED step-by-step drill`, aed.drillDone ? "completed" : "open", aed.drillDone],
              [`Quiz (pass ≥ 80 %)`, aed.quizBest === null ? "not taken" : `best ${aed.quizBest} %`, (aed.quizBest ?? 0) >= 80],
            ].map(([label, val, ok]) => (
              <li key={label as string} className="flex items-center gap-3 px-2">
                {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                <span className="flex-1 text-slate-700 dark:text-slate-200">{label}</span>
                <span className="font-mono text-xs text-slate-400">{val}</span>
              </li>
            ))}
          </ul>
          <Link href="/aed" className="btn-secondary mt-4 w-full !py-2 text-xs">Open AED training <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="card mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Recent attempts</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No attempts yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700/60">
            {recent.map((r, i) => {
              const c = cases.find((x) => x.id === r.caseId);
              return (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>{r.passed ? "passed" : "not yet"}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{c ? c.title : r.caseId}</span>
                  <span className="text-xs text-slate-400">{r.mode}</span>
                  <span className="w-10 text-right font-mono text-xs text-slate-500">{r.score}</span>
                  <span className="hidden w-24 text-right text-xs text-slate-400 sm:block">{new Date(r.date).toLocaleDateString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-6 text-right">
        {confirmReset ? (
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            Delete all progress in this browser?
            <button onClick={() => { resetProgress(); setConfirmReset(false); }} className="btn-resus !px-3 !py-1.5 text-xs">Delete</button>
            <button onClick={() => setConfirmReset(false)} className="btn-secondary !px-3 !py-1.5 text-xs">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"><RotateCcw className="h-3.5 w-3.5" /> Reset progress</button>
        )}
      </div>
    </div>
  );
}
