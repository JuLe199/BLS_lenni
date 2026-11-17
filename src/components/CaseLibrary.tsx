"use client";

import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock, Hospital, PhoneCall, Trees } from "lucide-react";
import type { PublicCase } from "@/lib/cases/public";
import { AUDIENCE_LABEL, SETTING_LABEL, type Audience, type Setting } from "@/lib/cases/types";
import { bestResult, setAudience, useAudience, useResults } from "@/lib/progress";
import { GUIDELINES } from "@/lib/guideline";
import { BookOpen } from "lucide-react";

const SETTING_ICON: Record<Setting, typeof Hospital> = {
  "out-of-hospital": Trees,
  "in-hospital": Hospital,
  dispatch: PhoneCall,
};

export function AudiencePicker() {
  const audience = useAudience();
  const options: (Audience | "all")[] = ["all", "nurse", "physician", "ems"];
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => setAudience(o)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            audience === o ? "bg-navy text-white dark:bg-blue-500" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          {o === "all" ? "All professions" : AUDIENCE_LABEL[o]}
        </button>
      ))}
    </div>
  );
}

export function CaseCard({ c }: { c: PublicCase }) {
  const results = useResults();
  const best = bestResult(results, c.id);
  const Icon = SETTING_ICON[c.setting];
  return (
    <Link href={`/${c.module}/${c.id}`} className="card group flex flex-col !p-0">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-3 pt-5 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-resus-light text-resus dark:bg-resus/15">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{c.module.toUpperCase()} case {c.number} · {SETTING_LABEL[c.setting]}</p>
            <h3 className="font-semibold text-slate-900 dark:text-white">{c.title}</h3>
          </div>
        </div>
        {best && (
          <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${best.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
            {best.passed && <CheckCircle2 className="h-3 w-3" />} {best.score}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{c.teaser}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.focus.map((f) => (
            <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">{f}</span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-400">
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.minutes} min</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${c.level === "core" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300" : "bg-knowledge-light text-knowledge dark:bg-knowledge/15"}`}>{c.level}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover:gap-2 dark:text-blue-400">Start <ArrowRight className="h-3.5 w-3.5 transition-all" /></span>
        </div>
      </div>
    </Link>
  );
}

const MODULE_TEXT = {
  bls: { title: "Adult Basic Life Support – cases", learn: "/learn/bls" },
  als: { title: "Adult Advanced Life Support – cases", learn: "/learn/als" },
};

export default function CaseLibrary({ cases, module = "bls" }: { cases: PublicCase[]; module?: "bls" | "als" }) {
  const audience = useAudience();
  const G = GUIDELINES[module];
  const shown = audience === "all" ? cases : cases.filter((c) => c.audiences.includes(audience));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-resus"><Building2 className="h-3.5 w-3.5" /> Module · {module.toUpperCase()}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{MODULE_TEXT[module].title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Based exclusively on the {G.source.title} ({G.source.journal}){module === "als" && " – building on the ERC 2025 Adult BLS guideline"}.
          </p>
          <Link href={MODULE_TEXT[module].learn} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-knowledge-light px-3 py-1.5 text-xs font-semibold text-knowledge hover:bg-knowledge/15 dark:bg-knowledge/15">
            <BookOpen className="h-3.5 w-3.5" /> First learn the content – {module.toUpperCase()} knowledge section <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <AudiencePicker />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => <CaseCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
