"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronDown, ClipboardList, Hand, RotateCcw, Target, XCircle, Zap } from "lucide-react";
import { AED_DRILL, AED_LESSONS, AED_QUIZ, PAD_ZONES, type DrillChoice, type PadZone, type Quote } from "@/data/aed-training";
import { updateAedProgress, useAedProgress } from "@/lib/progress";
import { applyAedSteps, type AedState, type CprStatus } from "@/lib/sim/state";
import type { CaseAed, CaseMonitor } from "@/lib/cases/types";
import { GuidelineQuote, CitationChip } from "@/components/GuidelineCitation";
import AedDevice from "@/components/AedDevice";
import PatientMonitor from "@/components/PatientMonitor";

function Section({ id, icon: Icon, title, subtitle, done, children }: { id: string; icon: typeof BookOpen; title: string; subtitle: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Icon className="h-5 w-5 text-aed" /> {title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {done && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> done</span>}
      </div>
      {children}
    </section>
  );
}

function QuoteLine({ q }: { q: Quote }) {
  return (
    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <span className="italic">“{q.quote}”</span> <CitationChip passageId={q.ref} quote={q.quote} compact />
    </p>
  );
}

/* ---------------------------------------------------------------- lessons */
function Lessons() {
  const p = useAedProgress();
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => {
    setOpen((o) => (o === id ? null : id));
    if (!p.lessons.includes(id)) updateAedProgress((x) => ({ ...x, lessons: [...x.lessons, id] }));
  };
  return (
    <div className="space-y-2">
      {AED_LESSONS.map((l, i) => {
        const read = p.lessons.includes(l.id);
        return (
          <div key={l.id} className="card !p-0 overflow-hidden">
            <button onClick={() => toggle(l.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${read ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
                {read ? "✓" : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900 dark:text-white">{l.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{l.intro}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open === l.id ? "rotate-180" : ""}`} />
            </button>
            {open === l.id && (
              <div className="grid gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-700 md:grid-cols-2">
                {l.points.map((q, k) => <GuidelineQuote key={k} passageId={q.ref} quote={q.quote} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- pad placement */
const ZONE_GEOM: Record<PadZone, { x: number; y: number; w: number; h: number }> = {
  r_clav: { x: 70, y: 92, w: 48, h: 56 }, // patient's right = viewer's left
  sternum: { x: 128, y: 112, w: 44, h: 68 },
  l_clav: { x: 182, y: 92, w: 46, h: 50 },
  l_breast: { x: 174, y: 158, w: 44, h: 48 },
  l_axilla: { x: 226, y: 150, w: 42, h: 76 },
  abdomen: { x: 120, y: 232, w: 60, h: 46 },
};

function PadPlacement() {
  const p = useAedProgress();
  const [placed, setPlaced] = useState<PadZone[]>([]);
  const [checked, setChecked] = useState(false);
  const correctSet = PAD_ZONES.filter((z) => z.correct).map((z) => z.id);
  const ok = checked && placed.length === 2 && placed.every((z) => correctSet.includes(z));

  const click = (z: PadZone) => {
    if (checked) return;
    setPlaced((cur) => (cur.includes(z) ? cur.filter((x) => x !== z) : cur.length >= 2 ? [cur[1], z] : [...cur, z]));
  };
  const check = () => {
    setChecked(true);
    if (placed.length === 2 && placed.every((z) => correctSet.includes(z))) updateAedProgress((x) => ({ ...x, padsDone: true }));
  };

  return (
    <div className="card grid gap-5 md:grid-cols-[minmax(0,320px)_1fr]">
      <div className="mx-auto w-full max-w-[320px]">
        <svg viewBox="0 0 300 330" className="w-full" role="group" aria-label="Chest – choose two pad positions">
          {/* torso */}
          <path d="M150 20 c-14 0 -22 10 -22 24 l0 16 c-30 6 -66 14 -86 30 c-14 12 -18 40 -18 70 l0 170 l252 0 l0 -170 c0 -30 -4 -58 -18 -70 c-20 -16 -56 -24 -86 -30 l0 -16 c0 -14 -8 -24 -22 -24z"
            className="fill-amber-100 stroke-amber-300 dark:fill-slate-700 dark:stroke-slate-500" strokeWidth="2" />
          {/* clavicles, sternum, nipples, navel, arms gap */}
          <path d="M146 78 C120 74 92 76 64 88 M154 78 C180 74 208 76 236 88" className="stroke-amber-400/70 dark:stroke-slate-400" strokeWidth="2.5" fill="none" />
          <path d="M150 82 L150 210" className="stroke-amber-400/60 dark:stroke-slate-400" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="104" cy="182" r="4" className="fill-amber-500/60 dark:fill-slate-400" />
          <circle cx="196" cy="182" r="4" className="fill-amber-500/60 dark:fill-slate-400" />
          <circle cx="150" cy="292" r="3" className="fill-amber-500/60 dark:fill-slate-400" />
          <path d="M40 120 L40 300 M260 120 L260 300" className="stroke-amber-300 dark:stroke-slate-500" strokeWidth="2" />
          <text x="30" y="318" className="fill-slate-500 text-[11px] font-semibold">patient’s RIGHT</text>
          <text x="186" y="318" className="fill-slate-500 text-[11px] font-semibold">patient’s LEFT</text>
          {PAD_ZONES.map((z) => {
            const g = ZONE_GEOM[z.id];
            const on = placed.includes(z.id);
            const good = checked && on && z.correct;
            const bad = checked && on && !z.correct;
            const missed = checked && !on && z.correct;
            return (
              <g key={z.id} onClick={() => click(z.id)} className={checked ? "" : "cursor-pointer"}>
                <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="10"
                  className={
                    good ? "fill-emerald-500/80 stroke-emerald-700" :
                    bad ? "fill-rose-500/80 stroke-rose-700" :
                    on ? "fill-slate-800/85 stroke-slate-950 dark:fill-slate-200/90" :
                    missed ? "fill-emerald-400/20 stroke-emerald-600" :
                    "fill-white/0 stroke-slate-400/60 hover:fill-blue-400/20"
                  }
                  strokeWidth={on || missed ? 2 : 1.5} strokeDasharray={on ? undefined : "5 4"} />
                {on && <text x={g.x + g.w / 2} y={g.y + g.h / 2 + 4} textAnchor="middle" className="pointer-events-none fill-white text-[11px] font-bold dark:fill-slate-900">PAD</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Tap the two places where you stick the pads (standard anterior-lateral position). Mind the sides: the patient’s right is on <strong>your left</strong>.
        </p>
        <p className="mt-2 text-xs text-slate-500">Placed: {placed.length}/2</p>
        <div className="mt-3 flex gap-2">
          <button onClick={check} disabled={placed.length !== 2 || checked} className="btn-primary !py-2 text-xs">Check</button>
          <button onClick={() => { setPlaced([]); setChecked(false); }} className="btn-secondary !py-2 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Again</button>
        </div>
        {checked && (
          <div className="mt-4 space-y-3">
            <p className={`flex items-center gap-2 text-sm font-semibold ${ok ? "text-emerald-600" : "text-rose-600"}`}>
              {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {ok ? "Correct – anterior-lateral position." : "Not quite – compare with the guideline:"}
            </p>
            {PAD_ZONES.filter((z) => placed.includes(z.id) || z.correct).map((z) => (
              <div key={z.id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
                <p className="mb-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {z.correct ? "✓" : "✗"} {z.label}{!placed.includes(z.id) && " (not chosen)"}
                </p>
                <QuoteLine q={z.why} />
              </div>
            ))}
          </div>
        )}
        {p.padsDone && !checked && <p className="mt-3 text-xs text-emerald-600">You have already solved this exercise.</p>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- drill */
const DRILL_AED: CaseAed = { type: "semi-automatic", availability: "Brought by a colleague.", rhythms: ["shockable", "non-shockable"] };
const DRILL_MONITOR: CaseMonitor = { ecg: ["vf", "pea"] };
const DRILL_START: AedState = { status: "arrived", analyses: 0, shocks: 0, padsAttached: false, cprTurns: 0, lastPrompt: null, lastResult: null };

function Drill() {
  const [stage, setStage] = useState(0);
  const [aed, setAed] = useState<AedState>(DRILL_START);
  const [cpr, setCpr] = useState<CprStatus>("in_progress");
  const [feedback, setFeedback] = useState<{ choice: DrillChoice; ok: boolean } | null>(null);
  const [errors, setErrors] = useState(0);
  const done = stage >= AED_DRILL.length;
  const s = AED_DRILL[stage];

  const choose = (c: DrillChoice) => {
    setFeedback({ choice: c, ok: Boolean(c.correct) });
    if (!c.correct) {
      setErrors((e) => e + 1);
      return;
    }
    let a = aed;
    let nextCpr = cpr;
    switch (s.effect) {
      case "power_on":
        a = applyAedSteps(a, ["powered_on"], DRILL_AED).aed;
        break;
      case "pads":
        a = applyAedSteps(a, ["pads_attached"], DRILL_AED).aed;
        nextCpr = "paused"; // hands off for the analysis
        break;
      case "shock":
        a = applyAedSteps(a, ["shock_button_pressed"], DRILL_AED).aed;
        break;
      case "cpr_on":
        nextCpr = "in_progress";
        a = { ...a, cprTurns: a.cprTurns + 1 };
        break;
      case "reanalysis":
        nextCpr = "paused";
        a = applyAedSteps(a, ["reanalysis"], DRILL_AED).aed;
        break;
      case "finish":
        nextCpr = "in_progress";
        if (errors === 0) updateAedProgress((x) => ({ ...x, drillDone: true }));
        break;
    }
    setAed(a);
    setCpr(nextCpr);
    setStage((n) => n + 1);
  };

  const reset = () => {
    setStage(0);
    setAed(DRILL_START);
    setCpr("in_progress");
    setFeedback(null);
    setErrors(0);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="card min-w-0">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
          <span>Step {Math.min(stage + 1, AED_DRILL.length)} of {AED_DRILL.length}</span>
          <span>Errors: {errors}</span>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="h-full rounded-full bg-aed transition-all" style={{ width: `${(stage / AED_DRILL.length) * 100}%` }} />
        </div>
        {done ? (
          <div>
            <p className={`flex items-center gap-2 text-base font-semibold ${errors === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              <CheckCircle2 className="h-5 w-5" /> {errors === 0 ? "Drill completed without errors." : `Drill completed with ${errors} error${errors === 1 ? "" : "s"} – try once more without errors.`}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Now apply it in a real case – e.g. <Link href="/bls/bls-office-pads" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Meeting room: pads on bare skin</Link>.</p>
            <button onClick={reset} className="btn-secondary mt-4 !py-2 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Start again</button>
          </div>
        ) : (
          <>
            <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">{s.situation}</p>
            <div className="space-y-2">
              {s.choices.map((c) => (
                <button key={c.text} onClick={() => choose(c)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                  {c.text}
                </button>
              ))}
            </div>
          </>
        )}
        {feedback && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${feedback.ok ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"}`}>
            <p className={`mb-1 text-xs font-bold uppercase tracking-wider ${feedback.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{feedback.ok ? "Correct" : "Not like this"} – “{feedback.choice.text}”</p>
            <QuoteLine q={feedback.choice.why} />
          </div>
        )}
      </div>
      <div className="space-y-3">
        <PatientMonitor state={{ aed, cpr, facts: [], endReason: null }} monitor={DRILL_MONITOR} compact />
        <AedDevice aed={aed} config={DRILL_AED} disabled />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- quiz */
function Quiz() {
  const p = useAedProgress();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = Math.round((AED_QUIZ.filter((q) => answers[q.id] === q.correct).length / AED_QUIZ.length) * 100);
  const complete = AED_QUIZ.every((q) => answers[q.id] !== undefined);

  const submit = () => {
    setSubmitted(true);
    updateAedProgress((x) => ({ ...x, quizAttempts: x.quizAttempts + 1, quizBest: Math.max(x.quizBest ?? 0, score) }));
    document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" });
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
      {AED_QUIZ.map((q, i) => {
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
          <p className="text-xs text-slate-400">{Object.keys(answers).length}/{AED_QUIZ.length} answered{p.quizBest !== null && ` · your best so far: ${p.quizBest} %`}</p>
          <button onClick={submit} disabled={!complete} className="btn-primary">Submit quiz</button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- page */
export default function AedTraining() {
  const p = useAedProgress();
  const nav = [
    { id: "learn", label: "1 · Learn", done: p.lessons.length >= AED_LESSONS.length },
    { id: "pads", label: "2 · Pad placement", done: p.padsDone },
    { id: "drill", label: "3 · Step-by-step drill", done: p.drillDone },
    { id: "quiz", label: "4 · Quiz", done: (p.quizBest ?? 0) >= 80 },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-900 px-6 py-7 text-white shadow-xl sm:px-8">
        <Zap className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/10" />
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Knowledge module</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Using an AED</h1>
        <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
          Learn, practise and test how to use an automated external defibrillator. Every teaching statement is a verified quote from the ERC Guidelines 2025 – Adult BLS.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
              {n.done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />} {n.label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="learn" icon={BookOpen} title="Learn" subtitle="Five short lessons – open each one to mark it as read." done={nav[0].done}>
        <Lessons />
      </Section>
      <Section id="pads" icon={Target} title="Pad placement" subtitle="Where do the two pads go?" done={nav[1].done}>
        <PadPlacement />
      </Section>
      <Section id="drill" icon={Hand} title="Step-by-step drill" subtitle="Two rescuers, semi-automatic AED. Choose the right action at each step – the AED and monitor react." done={nav[2].done}>
        <Drill />
      </Section>
      <Section id="quiz" icon={ClipboardList} title="Quiz" subtitle={`${AED_QUIZ.length} questions · pass with 80 %`} done={nav[3].done}>
        <Quiz />
      </Section>
    </div>
  );
}
