"use client";

import { Zap, Volume2 } from "lucide-react";
import type { CaseAed } from "@/lib/cases/types";
import type { AedState } from "@/lib/sim/state";

const STATUS_LABEL: Record<AedState["status"], string> = {
  absent: "Not at the patient",
  arrived: "At the patient – off",
  on: "On – attach pads",
  shock_advised: "Shock advised",
  shock_pending_auto: "Shock advised (automatic)",
  cpr: "CPR interval",
};

/**
 * Visual AED. Purely a mirror of the deterministic state machine – it never decides anything.
 * The shock button can be clicked when a semi-automatic AED advises a shock; that sends the
 * learner's action as a normal turn.
 */
export default function AedDevice({
  aed,
  config,
  onShockButton,
  disabled,
}: {
  aed: AedState;
  config: CaseAed;
  onShockButton?: () => void;
  disabled?: boolean;
}) {
  const present = aed.status !== "absent";
  const powered = present && aed.status !== "arrived";
  const shockReady = aed.status === "shock_advised";
  const autoPending = aed.status === "shock_pending_auto";
  const screen = !present ? "—" : !powered ? "OFF" : aed.lastPrompt ?? "";

  return (
    <div className={`rounded-2xl border p-3 transition-opacity ${present ? "border-emerald-700/40 bg-gradient-to-b from-emerald-600 to-emerald-700" : "border-slate-200 bg-slate-100 opacity-70 dark:border-slate-700 dark:bg-slate-800"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${present ? "bg-white text-emerald-700" : "bg-slate-300 text-slate-500 dark:bg-slate-700"}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 21s-7.5-4.6-9.3-9.4C1.3 8 3.4 4.5 7 4.5c2 0 3.5 1.1 5 2.8 1.5-1.7 3-2.8 5-2.8 3.6 0 5.7 3.5 4.3 7.1C19.5 16.4 12 21 12 21z" />
              <path d="M13 7l-3 6h3l-1 5 4-7h-3l1-4z" fill="#047857" />
            </svg>
          </span>
          <div>
            <p className={`text-xs font-bold tracking-wide ${present ? "text-white" : "text-slate-500"}`}>AED</p>
            <p className={`text-[10px] ${present ? "text-emerald-100" : "text-slate-400"}`}>{config.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${powered ? "bg-lime-300 led-blink" : "bg-slate-400"}`} />
          <span className={`text-[10px] font-medium ${present ? "text-emerald-50" : "text-slate-400"}`}>{STATUS_LABEL[aed.status]}</span>
        </div>
      </div>

      <div className="rounded-lg border border-black/30 bg-slate-950 px-3 py-2.5 shadow-inner">
        <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-emerald-400/70">
          <Volume2 className="h-3 w-3" /> voice prompt
        </div>
        <p className="min-h-[2.5rem] font-mono text-[12px] leading-snug text-emerald-300">{screen}</p>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
          <span>Analyses {aed.analyses}</span>
          <span>Shocks {aed.shocks}</span>
          <span>Pads {aed.padsAttached ? "✓" : "–"}</span>
        </div>
      </div>

      {config.type === "semi-automatic" ? (
        <button
          type="button"
          disabled={!shockReady || disabled}
          onClick={onShockButton}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
            shockReady ? "shock-pulse bg-resus text-white hover:bg-resus-dark" : "cursor-not-allowed bg-black/20 text-white/50"
          } ${!present ? "bg-slate-300 text-slate-400 dark:bg-slate-700" : ""}`}
        >
          <Zap className="h-4 w-4" /> SHOCK
        </button>
      ) : (
        <div className={`mt-3 rounded-xl py-2 text-center text-[11px] font-semibold ${autoPending ? "shock-pulse bg-resus text-white" : present ? "bg-black/15 text-emerald-50" : "bg-slate-200 text-slate-400 dark:bg-slate-700"}`}>
          {autoPending ? "Shock will be delivered automatically – stand clear" : "Fully automatic – no shock button"}
        </div>
      )}
      {!present && <p className="mt-2 text-[10px] leading-snug text-slate-500">{config.availability}</p>}
    </div>
  );
}
