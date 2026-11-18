"use client";

import { useEffect, useState } from "react";
import { BookOpenText, X, ExternalLink } from "lucide-react";
import { getPassage, guidelineOf, normaliseForMatch } from "@/lib/guideline";

/** Returns [start, end) of `quote` inside `text` using the same normalisation as the server check. */
function locate(text: string, quote: string): [number, number] | null {
  const idx: number[] = [];
  let norm = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toLowerCase();
    if (/[a-z0-9]/.test(ch)) {
      norm += ch;
      idx.push(i);
    }
  }
  const q = normaliseForMatch(quote);
  if (!q) return null;
  const k = norm.indexOf(q);
  if (k < 0) return null;
  return [idx[k], idx[k + q.length - 1] + 1];
}

export function PassageModal({ passageId, quote, onClose }: { passageId: string; quote?: string; onClose: () => void }) {
  const p = getPassage(passageId);
  const g = guidelineOf(passageId).source;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!p) return null;
  const range = quote ? locate(p.text, quote) : null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-800 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {g.short} · page {p.page}
            </p>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{p.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{p.section}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {range ? (
            <p>
              {p.text.slice(0, range[0])}
              <mark className="rounded bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-400/30 dark:text-amber-50">{p.text.slice(range[0], range[1])}</mark>
              {p.text.slice(range[1])}
            </p>
          ) : (
            <p>{p.text}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span>
            {g.authors}. {g.journal}.
          </span>
          <a href={`https://doi.org/${g.doi}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400">
            DOI <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function CitationChip({ passageId, quote, compact }: { passageId: string; quote?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const p = getPassage(passageId);
  if (!p) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex max-w-full items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
        title={`${p.title} – page ${p.page}`}
      >
        <BookOpenText className="h-3 w-3 shrink-0" />
        <span className="truncate">{compact ? `${guidelineOf(passageId).id.toUpperCase()} p. ${p.page}` : `${guidelineOf(passageId).id.toUpperCase()} · ${p.title} · p. ${p.page}`}</span>
      </button>
      {open && <PassageModal passageId={passageId} quote={quote} onClose={() => setOpen(false)} />}
    </>
  );
}

/** A verbatim quote with its source chip. */
export function GuidelineQuote({ passageId, quote }: { passageId: string; quote: string }) {
  return (
    <figure className="rounded-xl border-l-4 border-blue-400 bg-blue-50/60 px-4 py-3 dark:bg-blue-500/10">
      <blockquote className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">“{quote}”</blockquote>
      <figcaption className="mt-2">
        <CitationChip passageId={passageId} quote={quote} />
      </figcaption>
    </figure>
  );
}
