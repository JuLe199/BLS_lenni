"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ChevronDown, Clock, RotateCcw, Siren } from "lucide-react";
import type { PublicCase } from "@/lib/cases/public";
import type { SimState } from "@/lib/sim/state";
import { formatClock } from "@/lib/sim/state";
import { computeResult, PASS_SCORE } from "@/lib/sim/scoring";
import { CitationChip, GuidelineQuote } from "@/components/GuidelineCitation";
import { keyTimes, type TimelineKind } from "@/lib/sim/monitor";

const DOT: Record<TimelineKind, string> = {
  cpr_start: "bg-emerald-500",
  cpr_pause: "bg-amber-500",
  pads: "bg-sky-500",
  analysis: "bg-violet-500",
  shock: "bg-resus",
  rosc: "bg-emerald-600",
  drug: "bg-knowledge",
  access: "bg-slate-400",
  airway: "bg-cyan-500",
};

function Timeline({ state }: { state: SimState }) {
  const ev = state.timeline ?? [];
  const k = keyTimes(ev);
  const t = (x: number | null) => (x === null ? "–" : `≈ ${formatClock(x)}`);
  return (
    <div className="card">
      <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Monitor timeline</h3>
      <p className="mb-3 text-[11px] text-slate-400">Scenario times are approximate (end of the turn in which it happened).</p>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["First compressions", t(k.firstCompressions)],
          ["Pads on", t(k.padsOn)],
          ["First shock", t(k.firstShock)],
          [k.rosc !== null ? "ROSC" : "Shocks", k.rosc !== null ? t(k.rosc) : String(k.shocks)],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
            <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{val}</p>
          </div>
        ))}
      </div>
      {ev.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">No monitor events recorded.</p>
      ) : (
        <ol className="relative ml-1 space-y-2 border-l border-slate-200 pl-4 text-xs dark:border-slate-700">
          {ev.map((e, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${DOT[e.kind]}`} />
              <span className="mr-2 font-mono text-slate-400">{formatClock(e.t)}</span>
              <span className="text-slate-700 dark:text-slate-200">{e.label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} className="fill-none stroke-slate-200 dark:stroke-slate-700" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          className={`fill-none ${passed ? "stroke-emerald-500" : "stroke-amber-500"}`}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function Row({ label, criteria, refs, status, note, critical }: {
  label: string; criteria: string; refs: string[]; status: "done" | "compromised" | "missed"; note?: string; critical?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = status === "done" ? CheckCircle2 : status === "compromised" ? AlertTriangle : XCircle;
  const color = status === "done" ? "text-emerald-500" : status === "compromised" ? "text-amber-500" : "text-rose-500";
  return (
    <li className="py-2.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 text-left">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
          {critical && <span className="ml-2 rounded bg-resus-light px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-resus dark:bg-resus/20">critical</span>}
          {note && <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">{note}</span>}
        </span>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="ml-8 mt-2 space-y-2">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{criteria}</p>
          <div className="flex flex-wrap gap-1.5">
            {refs.map((r) => <CitationChip key={r} passageId={r} />)}
          </div>
        </div>
      )}
    </li>
  );
}

export default function Debrief({ pc, state, onRetry }: { pc: PublicCase; state: SimState; onRetry: () => void }) {
  const res = computeResult(pc, state);
  const compromisedIds = new Set(res.compromised.map((x) => x.item.id));
  const endText =
    state.endReason === "recovery" ? "Patient showed signs of recovery" :
    state.endReason === "handover" ? "Handover to the professional team" : "Case ended by you";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing score={res.score} passed={res.passed} />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-wider ${res.passed ? "text-emerald-600" : "text-amber-600"}`}>
            {res.passed ? "Passed" : "Not yet passed"}
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Debrief – {pc.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ≈ {formatClock(state.elapsed)} scenario time</span>
            <span className="inline-flex items-center gap-1"><Siren className="h-3.5 w-3.5" /> {endText}</span>
            <span>{res.done.length}/{pc.checklist.length} actions · {res.pitfalls.length} pitfall{res.pitfalls.length === 1 ? "" : "s"}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Pass = all critical actions met and score ≥ {PASS_SCORE}. {res.criticalMissed.length > 0 && <strong className="text-rose-600 dark:text-rose-400">Critical action(s) not met: {res.criticalMissed.map((x) => x.label).join("; ")}.</strong>}
          </p>
        </div>
        <button onClick={onRetry} className="btn-secondary shrink-0"><RotateCcw className="h-4 w-4" /> Try again</button>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs leading-relaxed text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This debrief contains no AI-generated text. The score is calculated from a fixed, authored checklist; every item links to the ERC BLS 2025 passage it is based on, and all quotes below are verified word-for-word against the guideline. The AI only decided which actions you performed – check the action log if something looks wrong.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Checklist</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {pc.checklist.map((x) => {
              const status = res.done.includes(x) ? "done" : compromisedIds.has(x.id) ? "compromised" : "missed";
              const by = res.compromised.find((c) => c.item.id === x.id)?.by;
              return (
                <Row key={x.id} label={x.label} criteria={x.criteria} refs={x.refs} status={status} critical={x.critical}
                  note={by ? `Done, but not counted – ${by.map((p) => p.label.toLowerCase()).join(", ")}.` : undefined} />
              );
            })}
          </ul>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="card">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Pitfalls</h3>
            {res.pitfalls.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No pitfalls recognised.</p>
            ) : (
              <ul className="space-y-3">
                {res.pitfalls.map((p) => (
                  <li key={p.id}>
                    <p className="flex items-start gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {p.label}
                    </p>
                    <div className="ml-6 mt-1 flex flex-wrap gap-1.5">{p.refs.map((r) => <CitationChip key={r} passageId={r} />)}</div>
                  </li>
                ))}
              </ul>
            )}
            {res.penalty > 0 && <p className="mt-3 text-[11px] text-slate-400">−{res.penalty} points for pitfalls (5 each, max 30).</p>}
          </div>

          <div className="card">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Action log</h3>
            <ol className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
              {state.log.map((l) => (
                <li key={l.turn} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
                  <p className="text-slate-700 dark:text-slate-200"><span className="mr-1 font-mono text-slate-400">{l.turn}.</span>{l.input}</p>
                  {(l.completed.length > 0 || l.pitfalls.length > 0) && (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {l.completed.map((id) => <span key={id} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">✓ {pc.checklist.find((x) => x.id === id)?.label ?? id}</span>)}
                      {l.pitfalls.map((id) => <span key={id} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">! {pc.pitfalls.find((x) => x.id === id)?.label ?? id}</span>)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {(pc.monitor || pc.als) && <Timeline state={state} />}

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Key messages from the guideline</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {pc.teaching.map((t, i) => <GuidelineQuote key={i} passageId={t.ref} quote={t.quote} />)}
        </div>
      </div>
    </div>
  );
}
