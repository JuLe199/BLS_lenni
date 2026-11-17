"use client";

import { useMemo, useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import { BLS_GUIDELINE, type Passage } from "@/lib/guideline";

const KIND_LABEL: Record<Passage["kind"], string> = {
  recommendation: "Recommendation",
  figure: "Figure / table (transcribed)",
  definition: "Definition",
  evidence: "Evidence",
};

export default function GuidelineBrowser() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = BLS_GUIDELINE.passages.filter((p) => !needle || (p.title + " " + p.text).toLowerCase().includes(needle));
    const map = new Map<string, Passage[]>();
    for (const p of list) map.set(p.section, [...(map.get(p.section) ?? []), p]);
    return Array.from(map.entries());
  }, [q]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Reference</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Guideline passages</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        This is the complete knowledge base the AI may use – nothing else. Text sections are extracted verbatim from the PDF
        (reference numbers removed); figures and Table 1 are transcribed. Source: {BLS_GUIDELINE.source.authors}{" "}
        <em>{BLS_GUIDELINE.source.title}</em>. {BLS_GUIDELINE.source.journal}.{" "}
        <a href={`https://doi.org/${BLS_GUIDELINE.source.doi}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400">
          doi:{BLS_GUIDELINE.source.doi} <ExternalLink className="h-3 w-3" />
        </a>
      </p>
      <div className="sticky top-14 z-10 mt-5 bg-background/90 py-2 backdrop-blur lg:top-0">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. “agonal”, “mattress”, “bra”" className="w-full bg-transparent text-base outline-none dark:text-white" />
        </label>
      </div>
      <div className="mt-4 space-y-8">
        {groups.map(([section, ps]) => (
          <section key={section}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{section}</h2>
            <div className="space-y-3">
              {ps.map((p) => (
                <article key={p.id} id={p.id} className="card scroll-mt-24 !p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                    <span className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-700">{KIND_LABEL[p.kind]}</span>
                      p. {p.page}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{p.text}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && <p className="text-sm text-slate-500">No passage matches “{q}”.</p>}
      </div>
    </div>
  );
}
