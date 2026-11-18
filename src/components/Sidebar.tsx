"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { BookOpen, BookOpenText, GraduationCap, HeartPulse, LayoutDashboard, Menu, Moon, ShieldCheck, Sun, X, Lock, Zap } from "lucide-react";
import { APP_NAME, MODULES } from "@/lib/brand";
import { useResults } from "@/lib/progress";

function subscribeDark(cb: () => void) {
  window.addEventListener("els-darkmode", cb);
  return () => window.removeEventListener("els-darkmode", cb);
}

function useDark() {
  return useSyncExternalStore(subscribeDark, () => document.documentElement.classList.contains("dark"), () => false);
}

function toggleDark() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("els_dark", String(next));
  window.dispatchEvent(new Event("els-darkmode"));
}

function NavContent({ onNavigate, caseIds }: { onNavigate?: () => void; caseIds: Record<string, string[]> }) {
  const pathname = usePathname();
  const dark = useDark();
  const results = useResults();
  const passedCases = new Set(results.filter((r) => r.passed).map((r) => r.caseId));
  const done = (m: string) => (caseIds[m] ?? []).filter((id) => passedCases.has(id)).length;

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
      active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <Link href="/" onClick={onNavigate} className="block">
          <p className="text-lg font-bold tracking-tight text-white">
            {APP_NAME.slice(0, 1)}
            <span className="text-resus">{APP_NAME.slice(1)}</span>
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Life Support Case Trainer</p>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
        <Link href="/" onClick={onNavigate} className={linkCls(pathname === "/")}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </Link>
        <Link href="/progress" onClick={onNavigate} className={linkCls(pathname.startsWith("/progress"))}>
          <GraduationCap className="h-4 w-4" /> Learning progress
        </Link>

        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Modules</p>
        {MODULES.map((m) =>
          m.status === "live" && m.href ? (
            <Link key={m.id} href={m.href} onClick={onNavigate} className={linkCls(pathname === m.href || pathname.startsWith(m.href + "/"))}>
              <HeartPulse className="h-4 w-4 text-resus" />
              <span className="min-w-0 flex-1">
                <span className="block">{m.short} cases</span>
                <span className="block text-[10px] font-normal text-slate-400">{m.name}</span>
              </span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                {done(m.id)}/{caseIds[m.id]?.length ?? 0}
              </span>
            </Link>
          ) : (
            <div key={m.id} className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-slate-500">
              <Lock className="h-4 w-4" />
              <span className="min-w-0 flex-1">
                <span className="block">{m.short}</span>
                <span className="block text-[10px]">{m.name}</span>
              </span>
              <span className="rounded-md border border-slate-600 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">soon</span>
            </div>
          )
        )}

        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Knowledge</p>
        {MODULES.filter((m) => m.status === "live" && m.learn).map((m) => (
          <Link key={m.id} href={m.learn!} onClick={onNavigate} className={linkCls(pathname.startsWith(m.learn!))}>
            <BookOpen className="h-4 w-4 text-knowledge" /> {m.short} knowledge
          </Link>
        ))}
        <Link href="/aed" onClick={onNavigate} className={linkCls(pathname.startsWith("/aed"))}>
          <Zap className="h-4 w-4 text-aed" /> AED training
        </Link>

        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reference</p>
        <Link href="/guideline" onClick={onNavigate} className={linkCls(pathname.startsWith("/guideline"))}>
          <BookOpenText className="h-4 w-4" /> Guideline passages
        </Link>
        <Link href="/method" onClick={onNavigate} className={linkCls(pathname.startsWith("/method"))}>
          <ShieldCheck className="h-4 w-4" /> How the AI is grounded
        </Link>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button onClick={toggleDark} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-slate-300 hover:bg-white/5 hover:text-white">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? "Light mode" : "Dark mode"}
        </button>
        <p className="px-3 pt-2 text-[10px] leading-snug text-slate-500">
          Training tool. Not a substitute for certified BLS/ALS courses or local protocols.
        </p>
      </div>
    </div>
  );
}

export default function Sidebar({ caseIds }: { caseIds: Record<string, string[]> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy lg:block">
        <NavContent caseIds={caseIds} />
      </aside>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-navy px-4 lg:hidden">
        <Link href="/" className="text-base font-bold text-white">
          {APP_NAME.slice(0, 1)}
          <span className="text-resus">{APP_NAME.slice(1)}</span>
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-300" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <NavContent caseIds={caseIds} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
