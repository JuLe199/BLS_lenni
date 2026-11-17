"use client";

import { Activity, Droplet, Syringe, Wind, Zap } from "lucide-react";
import type { AlsState } from "@/lib/sim/als";
import { DRUG_LABEL } from "@/lib/sim/als";
import { formatClock, type SimState } from "@/lib/sim/state";

const AIRWAY_LABEL: Record<AlsState["airway"], string> = {
  none: "No airway adjunct",
  bag_mask: "Bag-mask ventilation",
  supraglottic_airway: "Supraglottic airway",
  intubation: "Tracheal tube",
};

/** Quick actions only pre-fill the input – the learner still decides and can edit the wording. */
export const ALS_QUICK_ACTIONS: { label: string; text: string; icon: typeof Zap }[] = [
  { label: "Rhythm check", text: "Stop compressions – everybody look at the monitor, rhythm check.", icon: Activity },
  { label: "Charge & shock", text: "Continue compressions while charging. Oxygen away, everybody stand clear – shock.", icon: Zap },
  { label: "Resume CPR", text: "Resume chest compressions immediately, 2 minutes.", icon: Activity },
  { label: "IV access", text: "Please place an IV cannula.", icon: Syringe },
  { label: "Adrenaline", text: "Give 1 mg adrenaline IV.", icon: Syringe },
  { label: "Amiodarone 300", text: "Give 300 mg amiodarone IV.", icon: Syringe },
  { label: "Capnography", text: "Connect waveform capnography.", icon: Wind },
];

function Row({ label, value, tone = "text-slate-700 dark:text-slate-200" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-right font-medium ${tone}`}>{value}</span>
    </div>
  );
}

/**
 * Read-only protocol of the ALS engine state (defibrillator, access, drugs, airway).
 * Nothing here evaluates the learner – timing is assessed in the debrief.
 */
export default function AlsPanel({ state }: { state: Pick<SimState, "als" | "elapsed"> }) {
  const s = state.als;
  if (!s) return null;
  const sinceCheck = s.lastCheckAt === null ? null : Math.max(0, state.elapsed - s.lastCheckAt);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Zap className="h-3.5 w-3.5" /> Resuscitation log</h3>
      <div className="space-y-1">
        <Row label="Pads" value={!s.padsOn ? "not attached" : s.vectorChange ? "antero-posterior" : "antero-lateral"} tone={s.padsOn ? undefined : "text-amber-600 dark:text-amber-400"} />
        <Row label="Rhythm checks" value={String(s.checks)} />
        <Row label="Shocks" value={String(s.shocks)} />
        <Row label="Since last check" value={sinceCheck === null ? "–" : `≈ ${formatClock(sinceCheck)}`} />
        <Row label="Access" value={s.access === "none" ? (s.ivAttempts ? `none (${s.ivAttempts} IV attempt${s.ivAttempts > 1 ? "s" : ""} failed)` : "none") : s.access.toUpperCase()} />
        <Row label="Airway" value={AIRWAY_LABEL[s.airway] + (s.oxygen ? " · O₂" : "")} />
        <Row label="Capnography" value={s.capnography ? "connected" : "not connected"} />
      </div>
      <p className="mb-1 mt-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Droplet className="h-3 w-3" /> Drugs</p>
      {s.drugs.length === 0 ? (
        <p className="text-[11px] text-slate-400">None given.</p>
      ) : (
        <ul className="space-y-0.5">
          {s.drugs.map((d, i) => (
            <li key={i} className="flex justify-between gap-2 text-[12px] text-slate-700 dark:text-slate-200">
              <span>{DRUG_LABEL[d.drug]}</span>
              <span className="font-mono text-slate-400">≈ {formatClock(d.t)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
