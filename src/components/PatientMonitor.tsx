"use client";

import { useMemo } from "react";
import { Activity, Info } from "lucide-react";
import { RHYTHM_LABEL, isShockable, type MonitorView, type Trace } from "@/lib/sim/monitor";

/* ------------------------------------------------------------------ waveform synthesis
 * Each trace is a seamless loop of `seconds` length, drawn twice side by side and scrolled
 * by CSS. All shapes are purely illustrative (training display, not a diagnostic ECG).
 */
const H = 60; // viewBox height
const PPS = 50; // viewBox units per second
const WINDOW = 6 * PPS; // visible window: 6 s

function gauss(t: number, mu: number, sd: number) {
  return Math.exp(-((t - mu) ** 2) / (2 * sd * sd));
}

/** One PQRST complex (t in seconds from beat start). Positive = upwards. */
function qrs(t: number, wide = false) {
  const w = wide ? 2.4 : 1;
  return (
    0.12 * gauss(t, 0.08, 0.022) - // P
    0.12 * gauss(t, 0.18, 0.008 * w) + // Q
    1.0 * gauss(t, 0.2, 0.011 * w) - // R
    0.25 * gauss(t, 0.225, 0.01 * w) + // S
    0.22 * gauss(t, 0.42, 0.045) // T
  );
}

interface Wave {
  seconds: number;
  y: (t: number) => number; // roughly -1 … 1
}

function periodic(period: number, approx: number, beat: (t: number) => number): Wave {
  const n = Math.max(1, Math.round(approx / period));
  return { seconds: n * period, y: (t) => beat(t % period) };
}

function waveFor(trace: Trace, hr: number | null): Wave {
  switch (trace) {
    case "sinus":
      return periodic(60 / (hr ?? 90), 6, (t) => qrs(t));
    case "pea":
      return periodic(60 / 40, 6, (t) => 0.75 * qrs(t, true));
    case "pvt":
      return periodic(60 / 180, 4, (t) => 0.9 * Math.sin((2 * Math.PI * t) / (60 / 180)));
    case "vf": {
      const T = 4;
      const f = (k: number) => (2 * Math.PI * k) / T;
      return {
        seconds: T,
        y: (t) =>
          (0.45 + 0.2 * Math.sin(f(1) * t)) *
          (Math.sin(f(17) * t) + 0.6 * Math.sin(f(23) * t + 1.3) + 0.35 * Math.sin(f(29) * t + 0.4)) /
          1.6,
      };
    }
    case "cpr":
      // compressions ~110/min: large rounded artefact
      return periodic(60 / 110, 6, (t) => {
        const p = t / (60 / 110);
        return 0.85 * Math.sin(Math.PI * p) ** 2 - 0.35;
      });
    case "asystole":
      return { seconds: 6, y: (t) => 0.04 * Math.sin((2 * Math.PI * t) / 6) };
    case "none":
      return { seconds: 6, y: () => 0 };
  }
}

function plethWave(hr: number): Wave {
  return periodic(60 / hr, 6, (t) => {
    const p = t / (60 / hr);
    return 0.9 * gauss(p, 0.25, 0.09) + 0.35 * gauss(p, 0.55, 0.1) - 0.45;
  });
}

function pathFor(w: Wave): { d: string; width: number } {
  const width = w.seconds * PPS;
  const pts: string[] = [];
  const step = 1 / 250;
  for (let k = 0; k <= 2; k++) {
    for (let t = 0; t < w.seconds; t += step) {
      const x = (k * w.seconds + t) * PPS;
      const y = H / 2 - w.y(t) * (H / 2 - 6);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }
  return { d: "M" + pts.join("L"), width };
}

function Sweep({ wave, color, dashed, label }: { wave: Wave; color: string; dashed?: boolean; label: string }) {
  const { d, width } = useMemo(() => pathFor(wave), [wave]);
  return (
    <div className="relative h-14 overflow-hidden" role="img" aria-label={label}>
      <div
        className="monitor-sweep absolute inset-y-0 left-0"
        style={{ width: `${(width * 3 * 100) / WINDOW}%`, animationDuration: `${wave.seconds}s` }}
      >
        <svg viewBox={`0 0 ${width * 3} ${H}`} preserveAspectRatio="none" className="h-full w-full">
          <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeDasharray={dashed ? "3 4" : undefined} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

function Num({ label, value, unit, color, sub }: { label: string; value: string; unit?: string; color: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`font-mono text-xl font-bold leading-tight ${color}`}>
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-medium text-slate-400">{unit}</span>}
      </p>
      {sub && <p className="truncate text-[9px] text-slate-500">{sub}</p>}
    </div>
  );
}

const CIRC = {
  none: { text: "No circulation", cls: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  cpr: { text: "Flow only by compressions", cls: "bg-amber-500/15 text-amber-200 ring-amber-500/30" },
  spontaneous: { text: "Spontaneous circulation (ROSC)", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
};

/** Waveform capnography: plateau per breath (illustrative). */
function capnoWave(rate: number, level: number): Wave {
  const amp = Math.min(1, Math.max(0.15, level / 45));
  return periodic(60 / rate, 6, (t) => {
    const p = t / (60 / rate);
    const rise = 1 / (1 + Math.exp(-(p - 0.12) * 60));
    const fall = 1 / (1 + Math.exp((p - 0.55) * 60));
    return amp * 1.6 * rise * fall - 0.8;
  });
}

export type MonitorDisplay = MonitorView & { etco2?: number | null; capnoConnected?: boolean };

/**
 * Training monitor – a mirror of `monitorView()` / `alsMonitorView()`; it decides nothing itself.
 * In ALS mode the rhythm is never named: the learner has to interpret the ECG (revealRhythm after the case).
 */
export default function PatientMonitor({
  view: v,
  compact,
  als,
  revealRhythm,
}: {
  view: MonitorDisplay;
  compact?: boolean;
  als?: boolean;
  revealRhythm?: boolean;
}) {
  const ecgWave = useMemo(() => waveFor(v.trace, v.hr), [v.trace, v.hr]);
  const pleth = useMemo(() => (v.spo2 && v.hr ? plethWave(v.hr) : null), [v.spo2, v.hr]);
  const capno = useMemo(() => (v.etco2 ? capnoWave(v.rosc ? 12 : 10, v.etco2) : null), [v.etco2, v.rosc]);
  const flat = useMemo(() => waveFor("none", null), []);
  const showName = !als || revealRhythm;

  const ecgCaption =
    v.trace === "none"
      ? "No ECG – pads not attached"
      : v.trace === "cpr"
        ? "CPR artefact – rhythm not assessable during compressions"
        : showName
          ? RHYTHM_LABEL[v.rhythm]
          : "Compressions paused – interpret the rhythm yourself";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/5 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          <Activity className="h-3.5 w-3.5 text-emerald-400" /> {als ? "Defibrillator monitor" : "Training monitor"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ${CIRC[v.circulation].cls}`}>{CIRC[v.circulation].text}</span>
      </div>

      <div className="px-3 pt-2">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-widest">
          <span className="text-emerald-400/80">ECG · pads</span>
          {showName && v.rhythmVisible && v.trace !== "none" && (
            <span className={`font-semibold ${v.rosc ? "text-emerald-300" : isShockable(v.rhythm) ? "text-rose-300" : "text-sky-300"}`}>
              {v.rosc ? "perfusing" : isShockable(v.rhythm) ? "shockable" : "non-shockable"}
            </span>
          )}
        </div>
        <Sweep wave={ecgWave} color={v.trace === "none" ? "#475569" : "#4ade80"} dashed={v.trace === "none"} label={ecgCaption} />
        <p className="-mt-1 truncate text-[10px] text-emerald-300/80">{ecgCaption}</p>
      </div>

      {!compact && (
        <div className="px-3 pt-1.5">
          <p className="text-[9px] uppercase tracking-widest text-cyan-400/80">Pleth · SpO₂</p>
          <Sweep wave={pleth ?? flat} color={pleth ? "#22d3ee" : "#475569"} dashed={!pleth} label={pleth ? "Pulse oximetry waveform" : "No pulse oximetry signal"} />
        </div>
      )}

      {als && !compact && (
        <div className="px-3 pt-1.5">
          <p className="text-[9px] uppercase tracking-widest text-yellow-400/80">CO₂ · capnography</p>
          <Sweep wave={capno ?? flat} color={capno || v.capnoConnected ? "#facc15" : "#475569"} dashed={!capno && !v.capnoConnected} label={capno ? "Capnography waveform" : v.capnoConnected ? "Capnography connected – no exhaled CO₂ while compressions are paused" : "No capnography"} />
        </div>
      )}

      <div className={`grid gap-x-3 gap-y-2 border-t border-white/5 px-3 py-2 ${als ? "grid-cols-3" : "grid-cols-[1fr_1fr_1.35fr_1fr]"}`}>
        <Num label="HR" value={v.hr === null ? "---" : String(v.hr)} unit="/min" color="text-emerald-400" sub={v.circulation === "spontaneous" ? "pulse present" : "no pulse"} />
        <Num label="SpO₂" value={v.spo2 === null ? "---" : String(v.spo2)} unit="%" color="text-cyan-300" sub={v.spo2 === null ? "no signal" : undefined} />
        <Num label="NIBP" value={v.sys === null ? "---" : `${v.sys}/${v.dia}`} color="text-rose-300" sub={v.sys === null ? "not measurable" : "mmHg"} />
        <Num label="Cap. refill" value={v.crt === null ? "---" : String(v.crt)} unit={v.crt === null ? undefined : "s"} color="text-amber-300" sub={v.crt === null ? "no refill" : "recapillarisation"} />
        {als && (
          <Num label="ETCO₂" value={v.etco2 == null ? "---" : String(v.etco2)} unit={v.etco2 == null ? undefined : "mmHg"} color="text-yellow-300" sub={v.etco2 == null ? (v.capnoConnected ? "no flow – CPR paused" : "no capnography") : v.rosc ? "after ROSC" : "during CPR"} />
        )}
      </div>

      <div className="flex gap-1.5 border-t border-white/5 bg-white/[0.03] px-3 py-1.5 text-[9.5px] leading-snug text-slate-400">
        <Info className="mt-px h-3 w-3 shrink-0" />
        <span>
          {als
            ? "Training view, generated by the case engine – not by the AI. The rhythm is not named: decide yourself whether it is shockable."
            : "Training view, generated by the case – not by the AI. In real BLS you decide by responsiveness and breathing, not by monitor values."}
        </span>
      </div>
    </div>
  );
}
