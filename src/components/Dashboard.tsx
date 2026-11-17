"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, BookOpenText, CheckCircle2, HeartPulse, Lock, MessageCircleQuestion, ShieldCheck, Sparkles, Target, Trophy, Zap } from "lucide-react";
import type { PublicCase } from "@/lib/cases/public";
import { MODULES, APP_TAGLINE } from "@/lib/brand";
import { bestResult, useAudience, useResults } from "@/lib/progress";
import { AudiencePicker, CaseCard } from "@/components/CaseLibrary";
import { ALL_PASSAGES } from "@/lib/guideline";
import { askTeamLeader } from "@/components/TeamLeader";
import { LearningLevelCard } from "@/components/LearningProgress";

export default function Dashboard({ cases }: { cases: PublicCase[] }) {
  const results = useResults();
  const audience = useAudience();
  const mine = audience === "all" ? cases : cases.filter((c) => c.audiences.includes(audience));
  const passed = cases.filter((c) => bestResult(results, c.id)?.passed).length;
  const attempted = new Set(results.map((r) => r.caseId)).size;
  const avg = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : null;
  const next = mine.find((c) => !bestResult(results, c.id)?.passed) ?? mine[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-navy px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-resus/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
        <svg className="pointer-events-none absolute inset-x-0 bottom-6 h-20 w-full opacity-40" viewBox="0 0 800 80" preserveAspectRatio="none" aria-hidden>
          <polyline className="ecg-line" fill="none" stroke="#e5484d" strokeWidth="2.5"
            points="0,50 140,50 160,50 172,18 184,72 196,50 330,50 350,50 362,12 374,76 386,50 520,50 540,50 552,20 564,70 576,50 800,50" />
        </svg>
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-resus">
            <HeartPulse className="h-4 w-4" /> Life support case trainer
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Train resuscitation decisions – one realistic case at a time.</h1>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">{APP_TAGLINE}. For nurses, physicians and EMS professionals.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {next && (
              <Link href={`/${next.module}/${next.id}`} className="btn-resus">
                {attempted ? "Continue" : "Start"} with “{next.title}” <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link href="/method" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              <ShieldCheck className="h-4 w-4" /> How the AI stays accurate
            </Link>
          </div>
        </div>
      </section>

      {/* Stats + audience */}
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="card !p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Trophy className="h-3.5 w-3.5" /> Passed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{passed}<span className="text-base font-medium text-slate-400"> / {cases.length}</span></p>
        </div>
        <div className="card !p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Target className="h-3.5 w-3.5" /> Average score</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{avg ?? "–"}</p>
        </div>
        <div className="card !p-5 md:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">I am training as</p>
          <AudiencePicker />
        </div>
      </section>

      {/* Learning progress + knowledge */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <LearningLevelCard cases={cases} />
        <button onClick={() => askTeamLeader()} className="card group flex items-center gap-4 !p-5 text-left">
          <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-knowledge to-indigo-800 text-white"><MessageCircleQuestion className="h-8 w-8" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Questions?</span>
            <span className="mt-0.5 block text-lg font-bold text-slate-900 dark:text-white">Ask the Team Leader</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Answers only from the ERC 2025 BLS & ALS guidelines, with verified quotes</span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </button>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          { href: "/learn/bls", icon: BookOpen, tone: "from-resus to-rose-800", kicker: "Knowledge · BLS", title: "Basic Life Support", text: "7 chapters in guideline order + quiz" },
          { href: "/learn/als", icon: BookOpen, tone: "from-indigo-600 to-navy", kicker: "Knowledge · ALS", title: "Advanced Life Support", text: "10 chapters in guideline order + quiz" },
          { href: "/aed", icon: Zap, tone: "from-emerald-600 to-emerald-800", kicker: "Knowledge · AED", title: "Using an AED", text: "Lessons, pad placement, drill and quiz" },
        ].map(({ href, icon: Icon, tone, kicker, title, text }) => (
          <Link key={href} href={href} className="card group flex items-center gap-4 !p-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white`}><Icon className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kicker}</span>
              <span className="block font-semibold text-slate-900 dark:text-white">{title}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{text}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      {/* Modules */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Modules</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODULES.map((m) =>
            m.status === "live" && m.href ? (
              <Link key={m.id} href={m.href} className="card group !p-5 ring-1 ring-resus/20">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-resus px-2 py-1 text-xs font-bold text-white">{m.short}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">live</span>
                </div>
                <p className="mt-3 font-semibold text-slate-900 dark:text-white">{m.name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cases.filter((c) => c.module === m.id).length} cases · {m.guideline}</p>
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-2 dark:text-blue-400">Open <ArrowRight className="h-3.5 w-3.5" /></p>
              </Link>
            ) : (
              <div key={m.id} className="rounded-2xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{m.short}</span>
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="mt-3 font-semibold text-slate-500 dark:text-slate-300">{m.name}</p>
                <p className="mt-1 text-xs text-slate-400">In preparation · {m.guideline}</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Cases */}
      {(["bls", "als"] as const).map((mod) => {
        const list = mine.filter((c) => c.module === mod);
        if (!list.length) return null;
        return (
          <section key={mod} className="mt-8">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{mod.toUpperCase()} cases {audience !== "all" && <span className="text-sm font-normal text-slate-400">· filtered for your profession</span>}</h2>
              <Link href={`/${mod}`} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">All {mod.toUpperCase()} cases</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => <CaseCard key={c.id} c={c} />)}
            </div>
          </section>
        );
      })}

      {/* Trust */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {[
          { icon: BookOpenText, title: "One source of truth", text: `Teaching content comes only from the ERC Guidelines 2025 Adult BLS and ALS – ${ALL_PASSAGES.length} page-referenced passages.` },
          { icon: ShieldCheck, title: "Verified, not trusted", text: "Every quote the AI uses is checked word-for-word against the guideline text. Unverifiable notes are withheld." },
          { icon: Sparkles, title: "Deterministic where it matters", text: "Rhythms, ROSC, drug timing, monitor values and your score come from the case engine – never from the AI." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="card !p-5">
            <Icon className="h-5 w-5 text-blue-500" />
            <p className="mt-2 font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</p>
          </div>
        ))}
      </section>
      {passed === cases.length && cases.length > 0 && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> All cases passed – well done.</p>
      )}
    </div>
  );
}
