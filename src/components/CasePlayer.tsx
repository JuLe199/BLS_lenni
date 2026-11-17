"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft, Send, Lightbulb, Flag, Clock, Lock, Play, GraduationCap, ClipboardCheck, ShieldCheck,
  User, Clapperboard, Volume2, Sparkles, Info, TriangleAlert, Users, Wrench, Eye, CircleCheck, MessageCircleQuestion,
} from "lucide-react";
import type { PublicCase } from "@/lib/cases/public";
import { AUDIENCE_LABEL, SETTING_LABEL } from "@/lib/cases/types";
import type { ChatItem, RevealedFact } from "@/lib/sim/chat";
import { formatClock, initialState, type Mode, type SimState } from "@/lib/sim/state";
import { computeResult } from "@/lib/sim/scoring";
import { clearAccessCode, clearSession, getAccessCode, loadSession, recordResult, saveSession, setAccessCode } from "@/lib/progress";
import AedDevice from "@/components/AedDevice";
import PatientMonitor, { type MonitorDisplay } from "@/components/PatientMonitor";
import AlsPanel, { ALS_QUICK_ACTIONS } from "@/components/AlsPanel";
import { monitorView } from "@/lib/sim/monitor";
import { alsMonitorView } from "@/lib/sim/als";
import Debrief from "@/components/Debrief";
import { askTeamLeader } from "@/components/TeamLeader";
import { CitationChip } from "@/components/GuidelineCitation";

type Phase = "intro" | "running" | "debrief";

const CPR_LABEL: Record<SimState["cpr"], { text: string; cls: string }> = {
  not_started: { text: "CPR not started", cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  in_progress: { text: "CPR in progress", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  paused: { text: "CPR paused", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  stopped: { text: "CPR stopped", cls: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
};

function SceneBubble({ item }: { item: Extract<ChatItem, { kind: "scene" }> }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white dark:bg-slate-700">
        <Clapperboard className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-[85%] space-y-2">
        <div className="whitespace-pre-line rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
          {item.text}
          {item.prompt && <p className="mt-2 font-semibold text-slate-900 dark:text-white">{item.prompt}</p>}
        </div>
        {item.facts && item.facts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.facts.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30">
                <Eye className="h-3 w-3" /> New finding: {f.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AedBubble({ lines }: { lines: string[] }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Volume2 className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-emerald-900/40 bg-slate-950 px-4 py-3 shadow-sm">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-400/70">AED voice prompt</p>
        {lines.map((l, i) => (
          <p key={i} className="font-mono text-[13px] leading-relaxed text-emerald-300">“{l}”</p>
        ))}
      </div>
    </div>
  );
}

function CoachBubble({ item }: { item: Extract<ChatItem, { kind: "coach" }> }) {
  const title = item.trigger === "hint" ? "Hint" : item.trigger === "question" ? "From the guideline" : "Coach note";
  return (
    <div className="ml-11 max-w-[85%] rounded-2xl border border-knowledge/30 bg-knowledge-light/70 px-4 py-3 dark:border-knowledge/30 dark:bg-knowledge/10">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-knowledge">
        <Sparkles className="h-3.5 w-3.5" /> {title}
        <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-white/70 px-1 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-emerald-700 dark:bg-slate-900/40 dark:text-emerald-300">
          <ShieldCheck className="h-3 w-3" /> quotes verified
        </span>
      </p>
      <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">{item.text}</p>
      <div className="mt-2 space-y-1.5">
        {item.citations.map((c, i) => (
          <div key={i} className="text-xs text-slate-600 dark:text-slate-300">
            <span className="italic">“{c.quote}”</span> <CitationChip passageId={c.passageId} quote={c.quote} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

function NoticeBubble({ item }: { item: Extract<ChatItem, { kind: "notice" }> }) {
  const Icon = item.tone === "info" ? Info : TriangleAlert;
  const cls =
    item.tone === "error" ? "text-rose-600 dark:text-rose-400" : item.tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400";
  return (
    <p className={`ml-11 flex items-center gap-1.5 text-xs ${cls}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" /> {item.text}
    </p>
  );
}

export default function CasePlayer({ pc, nextCaseId }: { pc: PublicCase; nextCaseId: string | null }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [state, setState] = useState<SimState>(() => initialState(pc, "coached"));
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState<false | "turn" | "hint">(false);
  const hasSaved = useSyncExternalStore(
    () => () => {},
    () => loadSession(pc.id) !== null,
    () => false
  );
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessInput, setAccessInput] = useState("");
  const [accessError, setAccessError] = useState("");
  const [pending, setPending] = useState<{ input: string; hint: boolean } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, loading]);

  useEffect(() => {
    if (phase === "running" && !state.ended && items.length) saveSession(pc.id, { state, items, savedAt: new Date().toISOString() });
  }, [phase, state, items, pc.id]);

  const facts: RevealedFact[] = useMemo(
    () => items.flatMap((it) => (it.kind === "scene" && it.facts ? it.facts : [])),
    [items]
  );
  const completedLabels = useMemo(
    () => pc.checklist.filter((x) => state.completed.includes(x.id)),
    [pc.checklist, state.completed]
  );

  const finish = useCallback(
    (s: SimState) => {
      const r = computeResult(pc, s);
      recordResult({
        caseId: pc.id,
        date: new Date().toISOString(),
        score: r.score,
        passed: r.passed,
        mode: s.mode,
        done: r.done.map((x) => x.id),
        missed: r.missed.map((x) => x.id),
      });
      clearSession(pc.id);
      setPhase("debrief");
      window.scrollTo({ top: 0 });
    },
    [pc]
  );

  const start = (m: Mode) => {
    clearSession(pc.id);
    setState(initialState(pc, m));
    setItems([{ kind: "scene", text: pc.opening }]);
    setPhase("running");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const resume = () => {
    const s = loadSession(pc.id);
    if (!s) return;
    setState(s.state);
    setItems(s.items);
    setPhase("running");
  };

  const send = async (text: string, hint = false) => {
    if (loading || state.ended) return;
    const trimmed = text.trim();
    if (!hint && !trimmed) return;
    setLoading(hint ? "hint" : "turn");
    const baseItems = hint ? items : [...items, { kind: "learner", text: trimmed } as ChatItem];
    if (!hint) {
      setItems(baseItems);
      setInput("");
    }
    try {
      const code = getAccessCode();
      const res = await fetch("/api/case/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(code ? { "x-access-code": code } : {}) },
        body: JSON.stringify({ caseId: pc.id, state, items, input: trimmed, hint }),
      });
      const data = await res.json();
      // On any failure the turn did not happen: drop the optimistic learner bubble, restore the input.
      const fail = (text: string) => {
        setItems([...items, { kind: "notice", tone: "error", text }]);
        if (!hint) setInput(trimmed);
      };
      if (res.status === 401 || res.status === 503) {
        setItems(items);
        if (!hint) setInput(trimmed);
        clearAccessCode();
        setPending({ input: trimmed, hint });
        setAccessError(res.status === 503 ? data.error : code ? "Access code not accepted." : "");
        setAccessOpen(true);
        return;
      }
      if (!res.ok || data.error) {
        fail(`${data.error ?? "Something went wrong."} Your input was kept – please send again.`);
        return;
      }
      const next: SimState = data.state;
      setItems([...baseItems, ...(data.items as ChatItem[])]);
      setState(next);
      if (next.ended) setTimeout(() => finish(next), 2200);
    } catch {
      setItems([...items, { kind: "notice", tone: "error", text: "Connection error – your input was kept, please send again." }]);
      if (!hint) setInput(trimmed);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const submitAccess = () => {
    setAccessCode(accessInput.trim());
    setAccessOpen(false);
    setAccessError("");
    if (pending) {
      const p = pending;
      setPending(null);
      setTimeout(() => send(p.input, p.hint), 0);
    }
  };

  const endNow = () => {
    const s: SimState = { ...state, ended: true, endReason: "learner_stopped" };
    setState(s);
    setConfirmEnd(false);
    finish(s);
  };

  const isAls = pc.module === "als";
  const view: MonitorDisplay | null =
    pc.als && state.als ? alsMonitorView(state.als, pc.als, state.cpr) : pc.monitor ? monitorView(state, pc.monitor) : null;
  const guidelineName = isAls ? "ERC 2025 Adult ALS and BLS guidelines" : "ERC BLS 2025 guideline";

  /* ---------------------------------------------------------------- intro */
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <Link href={`/${pc.module}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> {pc.module.toUpperCase()} cases
        </Link>
        <div className="overflow-hidden rounded-3xl bg-navy text-white shadow-xl">
          <div className="relative px-6 py-7 sm:px-8">
            <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-30" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden>
              <polyline className="ecg-line" fill="none" stroke="#e5484d" strokeWidth="2" points="0,40 120,40 140,40 150,15 160,55 170,40 260,40 280,40 290,10 300,58 310,40 420,40 440,40 450,18 460,52 470,40 600,40" />
            </svg>
            <p className="text-xs font-semibold uppercase tracking-wider text-resus">Case {pc.number} · {pc.module.toUpperCase()} · {SETTING_LABEL[pc.setting]}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{pc.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{pc.teaser}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {pc.focus.map((f) => (
                <span key={f} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-100">{f}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><User className="h-4 w-4 text-blue-500" /> Your role</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{pc.role}</p>
            <p className="mt-3 text-xs text-slate-400">For: {pc.audiences.map((a) => AUDIENCE_LABEL[a]).join(" · ")} · ≈ {pc.minutes} min · {pc.level}</p>
          </div>
          <div className="card">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Wrench className="h-4 w-4 text-blue-500" /> Available</h2>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {pc.resources.map((r) => <li key={r} className="flex gap-2"><span className="text-slate-300">•</span>{r}</li>)}
            </ul>
          </div>
        </div>

        <div className="card mt-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">How it works</h2>
          <ul className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <li className="flex gap-2"><span className="mt-0.5 text-blue-500">①</span>Type what you do or say – as precisely as you would act. Bystanders only do what you tell them.</li>
            <li className="flex gap-2"><span className="mt-0.5 text-blue-500">②</span>Scenario time only moves when you act; take a moment to think.</li>
            <li className="flex gap-2"><span className="mt-0.5 text-blue-500">③</span>{isAls
              ? "The defibrillator monitor (ECG, SpO₂, blood pressure, ETCO₂) is driven by a deterministic case engine – rhythm, ROSC, IV/IO success and drug timing are fixed by the case, not by the AI. The rhythm is never named: you interpret it."
              : "The AED and the training monitor (ECG, SpO₂, blood pressure, capillary refill) behave deterministically – they react to your CPR, the pads and shocks as fixed by the case, not by the AI."}</li>
            <li className="flex gap-2"><span className="mt-0.5 text-blue-500">④</span>Every teaching statement is quoted from the {guidelineName} and verified word-for-word.</li>
          </ul>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => start("coached")} className="card flex flex-1 items-start gap-3 text-left !p-5 hover:ring-2 hover:ring-blue-300">
            <GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-knowledge" />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Coached mode</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Verified coach notes after mistakes, hints on request, recognised actions visible.</span>
            </span>
          </button>
          <button onClick={() => start("exam")} className="card flex flex-1 items-start gap-3 text-left !p-5 hover:ring-2 hover:ring-resus/40">
            <ClipboardCheck className="mt-0.5 h-6 w-6 shrink-0 text-resus" />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Exam mode</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">No feedback or hints during the case – everything in the debrief.</span>
            </span>
          </button>
        </div>
        {hasSaved && (
          <button onClick={resume} className="btn-secondary mt-3 w-full"><Play className="h-4 w-4" /> Resume paused attempt</button>
        )}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          AI-supported simulation for training. Not a substitute for a certified {isAls ? "ALS" : "BLS"} course or local protocols.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- debrief */
  if (phase === "debrief") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link href={`/${pc.module}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" /> {pc.module.toUpperCase()} cases
          </Link>
          {nextCaseId && <Link href={`/${pc.module}/${nextCaseId}`} className="btn-primary !py-2 text-xs">Next case →</Link>}
        </div>
        <Debrief pc={pc} state={state} onRetry={() => setPhase("intro")} />
      </div>
    );
  }

  /* ---------------------------------------------------------------- running */
  const rail = (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Clock className="h-3.5 w-3.5" /> Scenario time</span>
          <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white">≈ {formatClock(state.elapsed)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CPR_LABEL[state.cpr].cls}`}>{CPR_LABEL[state.cpr].text}</span>
          <span className="text-[11px] text-slate-400">Turn {state.turn}</span>
        </div>
      </div>

      {view && <PatientMonitor view={view} als={isAls} revealRhythm={state.ended} />}

      {isAls && <AlsPanel state={state} />}

      {pc.aed && (
        <AedDevice
          aed={state.aed}
          config={pc.aed}
          disabled={Boolean(loading)}
          onShockButton={() => send("I make sure nobody is touching the patient and press the shock button.")}
        />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Eye className="h-3.5 w-3.5" /> Findings</h3>
        {facts.length === 0 ? (
          <p className="text-[11px] text-slate-400">Findings appear here once you assess them.</p>
        ) : (
          <dl className="space-y-2">
            {facts.map((f) => (
              <div key={f.id}>
                <dt className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{f.label}</dt>
                <dd className="text-[12px] leading-snug text-slate-600 dark:text-slate-400">{f.text}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {state.mode === "coached" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><CircleCheck className="h-3.5 w-3.5" /> Recognised actions</h3>
          {completedLabels.length === 0 ? (
            <p className="text-[11px] text-slate-400">None yet.</p>
          ) : (
            <ul className="space-y-1">
              {completedLabels.map((x) => (
                <li key={x.id} className="flex gap-1.5 text-[12px] leading-snug text-slate-700 dark:text-slate-200"><span className="text-emerald-500">✓</span>{x.label}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-3 text-[11px] text-slate-400 dark:border-slate-600">
          <ClipboardCheck className="mb-1 h-4 w-4" /> Exam mode – your assessment is shown in the debrief.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200"><Users className="h-3.5 w-3.5" /> Your role</p>
        {pc.role}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-7xl flex-col overflow-hidden px-2 py-3 sm:px-4 lg:h-screen">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/${pc.module}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              Case {pc.number} · {pc.module.toUpperCase()}
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${state.mode === "exam" ? "bg-resus-light text-resus dark:bg-resus/20" : "bg-knowledge-light text-knowledge dark:bg-knowledge/20"}`}>{state.mode}</span>
            </p>
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white sm:text-lg">{pc.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.mode === "coached" && (
            <button onClick={() => askTeamLeader()} className="btn-secondary !px-3 !py-1.5 text-xs" title="Ask the Team Leader a guideline question">
              <MessageCircleQuestion className="h-3.5 w-3.5 text-knowledge" /> <span className="hidden sm:inline">Team Leader</span>
            </button>
          )}
          {state.mode === "coached" && (
            <button onClick={() => send("", true)} disabled={Boolean(loading) || state.ended} className="btn-secondary !px-3 !py-1.5 text-xs">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Hint
            </button>
          )}
          <button onClick={() => setConfirmEnd(true)} disabled={state.ended} className="btn-secondary !px-3 !py-1.5 text-xs">
            <Flag className="h-3.5 w-3.5" /> End case
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {view && (
            <details className="group lg:hidden" open>
              <summary className="mb-1 cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="group-open:hidden">▸ Show monitor</span><span className="hidden group-open:inline">▾ Hide monitor</span>
              </summary>
              <PatientMonitor view={view} als={isAls} revealRhythm={state.ended} compact />
            </details>
          )}
          {pc.aed && (
            <div className="lg:hidden">
              <AedDevice aed={state.aed} config={pc.aed} disabled={Boolean(loading)} onShockButton={() => send("I make sure nobody is touching the patient and press the shock button.")} />
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl bg-slate-100/60 p-3 dark:bg-slate-900/40 sm:p-4">
            {items.map((it, i) => {
              if (it.kind === "scene") return <SceneBubble key={i} item={it} />;
              if (it.kind === "aed") return <AedBubble key={i} lines={it.lines} />;
              if (it.kind === "coach") return <CoachBubble key={i} item={it} />;
              if (it.kind === "notice") return <NoticeBubble key={i} item={it} />;
              return (
                <div key={i} className="flex flex-row-reverse gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"><User className="h-4 w-4" /></div>
                  <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-[15px] leading-relaxed text-white">{it.text}</div>
                </div>
              );
            })}
            {loading && (
              <div className="flex items-center gap-3 pl-11 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                </span>
                {loading === "hint" ? "Looking up the guideline …" : "The scene unfolds …"}
              </div>
            )}
            {state.ended && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                Case complete – preparing your debrief …
              </div>
            )}
            <div ref={endRef} />
          </div>

          {!state.ended && isAls && (
            <div className="-mb-1 flex shrink-0 gap-1.5 overflow-x-auto pb-1">
              {ALS_QUICK_ACTIONS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={Boolean(loading)}
                  onClick={() => {
                    setInput((v) => (v.trim() ? `${v.trim()} ${q.text}` : q.text));
                    inputRef.current?.focus();
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                  title="Adds this instruction to your input – edit before sending"
                >
                  <q.icon className="h-3 w-3" /> {q.label}
                </button>
              ))}
            </div>
          )}
          {!state.ended && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex shrink-0 items-end gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
            >
              <textarea
                ref={inputRef}
                value={input}
                rows={2}
                maxLength={800}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={state.turn === 0 ? "e.g. “I check the scene is safe and …”" : "What do you do or say?"}
                disabled={Boolean(loading)}
                className="min-h-[3.25rem] min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-snug focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <button type="submit" disabled={Boolean(loading) || !input.trim()} className="btn-primary h-[3.25rem] !px-4" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        <aside className="hidden w-80 shrink-0 overflow-y-auto pb-4 lg:block">{rail}</aside>
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">End the case now?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You will get the debrief for everything you did so far.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={endNow} className="btn-resus flex-1">End & debrief</button>
              <button onClick={() => setConfirmEnd(false)} className="btn-secondary flex-1">Continue</button>
            </div>
          </div>
        </div>
      )}

      {accessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAccess();
            }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
          >
            <div className="mb-2 flex items-center gap-2 text-slate-900 dark:text-white"><Lock className="h-5 w-5 text-blue-500" /><h3 className="text-base font-semibold">Access code</h3></div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">The AI cases are protected. Enter the access code from your course.</p>
            <input
              type="password"
              autoFocus
              value={accessInput}
              onChange={(e) => setAccessInput(e.target.value)}
              className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            {accessError && <p className="mb-2 text-xs text-rose-600">{accessError}</p>}
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={!accessInput.trim()} className="btn-primary flex-1">Unlock</button>
              <button type="button" onClick={() => setAccessOpen(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
