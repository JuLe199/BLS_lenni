"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Lock, MessageCircleQuestion, Send, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { CitationChip } from "@/components/GuidelineCitation";
import { clearAccessCode, getAccessCode, setAccessCode } from "@/lib/progress";
import type { VerifiedCitation } from "@/lib/sim/chat";

interface Statement {
  text: string;
  citations: VerifiedCitation[];
}
interface Exchange {
  question: string;
  status: "loading" | "answered" | "unanswerable" | "error";
  statements?: Statement[];
  partial?: boolean;
  error?: string;
}

const EXAMPLES = [
  "When do I give the first adrenaline in VF?",
  "Wann gebe ich Amiodaron und in welcher Dosis?",
  "What should I do if VF persists after three shocks?",
  "How deep and how fast should chest compressions be?",
  "Was sind die reversiblen Ursachen (4 H und HITS)?",
  "How do I use waveform capnography during CPR?",
];

const EVENT = "els-ask";

/** Opens the Team Leader drawer from anywhere, optionally with a pre-filled question. */
export function askTeamLeader(prefill = "") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: prefill }));
}

export default function TeamLeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<Exchange[]>([]);
  const [needCode, setNeedCode] = useState<{ question: string; error: string } | null>(null);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = log.some((e) => e.status === "loading");
  const inCase = /^\/(bls|als)\/[^/]+/.test(pathname);

  useEffect(() => {
    const onAsk = (e: Event) => {
      const prefill = (e as CustomEvent<string>).detail ?? "";
      setOpen(true);
      if (prefill) setInput(prefill);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener(EVENT, onAsk);
    return () => window.removeEventListener(EVENT, onAsk);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log, open]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const prevAnswered = [...log].reverse().find((e) => e.status === "answered");
    const previous = prevAnswered ? { question: prevAnswered.question, answer: (prevAnswered.statements ?? []).map((s) => s.text).join(" ") } : null;
    setInput("");
    setLog((l) => [...l, { question, status: "loading" }]);
    const settle = (patch: Partial<Exchange>) =>
      setLog((l) => l.map((e, i) => (i === l.length - 1 ? { ...e, ...patch } : e)));
    try {
      const ac = getAccessCode();
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(ac ? { "x-access-code": ac } : {}) },
        body: JSON.stringify({ question, previous }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 503) {
        clearAccessCode();
        setLog((l) => l.slice(0, -1));
        setInput(question);
        setNeedCode({ question, error: res.status === 503 ? data.error : ac ? "Access code not accepted." : "" });
        return;
      }
      if (!res.ok || data.error) {
        const base = data.error ?? data.errorMessage ?? "Something went wrong.";
        return settle({ status: "error", error: `${base} (HTTP ${res.status}${data.detail ? ` – ${data.detail}` : ""})` });
      }
      if (!data.answerable) return settle({ status: "unanswerable" });
      settle({ status: "answered", statements: data.statements, partial: data.partial });
    } catch {
      settle({ status: "error", error: "Connection error – please try again." });
    }
  };

  const submitCode = () => {
    setAccessCode(code.trim());
    const q = needCode?.question ?? "";
    setNeedCode(null);
    setCode("");
    if (q) setTimeout(() => ask(q), 0);
  };

  return (
    <>
      {!open && !inCase && (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-knowledge px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-knowledge/30 transition-transform hover:scale-[1.03] sm:bottom-6 sm:right-6"
          aria-label="Ask the Team Leader"
        >
          <MessageCircleQuestion className="h-5 w-5" />
          <span>Ask the Team Leader</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-slate-50 shadow-2xl dark:bg-slate-900" role="dialog" aria-label="Ask the Team Leader">
            <header className="flex items-start gap-3 bg-navy px-4 py-4 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-knowledge"><UserRound className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Ask the Team Leader</p>
                <p className="text-[11px] leading-snug text-slate-300">Answers only from the ERC Guidelines 2025 (Adult BLS & ALS). Every statement is backed by a word-for-word quote.</p>
              </div>
              {log.length > 0 && (
                <button onClick={() => setLog([])} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Clear conversation" title="Clear conversation">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {log.length === 0 && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Ask anything about adult resuscitation – in English or German. If the guidelines do not answer it, the Team Leader will say so instead of guessing.</p>
                  <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Examples</p>
                  <div className="flex flex-col gap-1.5">
                    {EXAMPLES.map((e) => (
                      <button key={e} onClick={() => ask(e)} className="rounded-xl bg-white px-3 py-2 text-left text-sm text-slate-700 ring-1 ring-slate-200 hover:ring-knowledge/50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {log.map((e, i) => (
                <div key={i} className="space-y-2">
                  <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-3.5 py-2 text-sm text-white">{e.question}</div>
                  {e.status === "loading" && (
                    <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      </span>
                      Checking the guidelines …
                    </p>
                  )}
                  {e.status === "answered" && (
                    <div className="rounded-2xl rounded-tl-sm bg-white p-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                      <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> Quotes verified
                      </p>
                      <div className="space-y-3">
                        {e.statements?.map((s, k) => (
                          <div key={k}>
                            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">{s.text}</p>
                            {s.citations.map((c, j) => (
                              <p key={j} className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                <span className="italic">“{c.quote}”</span> <CitationChip passageId={c.passageId} quote={c.quote} compact />
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                      {e.partial && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">Parts of the answer could not be verified and were left out.</p>}
                    </div>
                  )}
                  {e.status === "unanswerable" && (
                    <div className="rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      The ERC 2025 BLS and ALS guidelines in this app do not answer this question (or no answer could be verified). Try rephrasing, or check the guideline passages directly.
                    </div>
                  )}
                  {e.status === "error" && <p className="text-xs text-rose-600 dark:text-rose-400">{e.error}</p>}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {needCode && (
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  submitCode();
                }}
                className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white"><Lock className="h-4 w-4 text-blue-500" /> Access code</p>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">The AI features are protected. Enter the access code from your course.</p>
                <div className="flex gap-2">
                  <input type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                  <button type="submit" disabled={!code.trim()} className="btn-primary !py-2">Unlock</button>
                </div>
                {needCode.error && <p className="mt-1 text-xs text-rose-600">{needCode.error}</p>}
              </form>
            )}

            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                ask(input);
              }}
              className="flex items-end gap-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-700 dark:bg-slate-800"
            >
              <textarea
                ref={inputRef}
                value={input}
                rows={2}
                maxLength={600}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder="Your question to the Team Leader …"
                className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-base leading-snug focus:border-knowledge focus:outline-none focus:ring-2 focus:ring-knowledge/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-[3.25rem] !px-4" aria-label="Send question">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="bg-white px-4 pb-2 text-[10px] text-slate-400 dark:bg-slate-800">Training aid – not for decisions about real patients.</p>
          </aside>
        </div>
      )}
    </>
  );
}
