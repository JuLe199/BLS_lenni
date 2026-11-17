"use client";

import { useSyncExternalStore } from "react";
import type { Audience } from "@/lib/cases/types";
import type { ChatItem } from "@/lib/sim/chat";
import type { Mode, SimState } from "@/lib/sim/state";

const RESULTS_KEY = "els_results_v1";
const AUDIENCE_KEY = "els_audience";
const SESSION_PREFIX = "els_session_v1_";
const EVENT = "els-progress";

export interface StoredResult {
  caseId: string;
  date: string;
  score: number;
  passed: boolean;
  mode: Mode;
  /** Checklist item ids that counted (since v2 – older results lack them). */
  done?: string[];
  /** Checklist item ids missed or cancelled by a pitfall. */
  missed?: string[];
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function recordResult(r: StoredResult) {
  const all = read<StoredResult[]>(RESULTS_KEY, []);
  all.push(r);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(all.slice(-200)));
  emit();
}

let cachedRaw: string | null = null;
let cachedResults: StoredResult[] = [];
function resultsSnapshot(): StoredResult[] {
  const raw = localStorage.getItem(RESULTS_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedResults = raw ? (JSON.parse(raw) as StoredResult[]) : [];
  }
  return cachedResults;
}
const EMPTY: StoredResult[] = [];

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useResults(): StoredResult[] {
  return useSyncExternalStore(subscribe, resultsSnapshot, () => EMPTY);
}

export function bestResult(results: StoredResult[], caseId: string): StoredResult | null {
  const mine = results.filter((r) => r.caseId === caseId);
  if (!mine.length) return null;
  return mine.reduce((a, b) => (b.score > a.score ? b : a));
}

export function getAudience(): Audience | "all" {
  return read<Audience | "all">(AUDIENCE_KEY, "all");
}
export function setAudience(a: Audience | "all") {
  localStorage.setItem(AUDIENCE_KEY, JSON.stringify(a));
  emit();
}
export function useAudience(): Audience | "all" {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(AUDIENCE_KEY), () => null);
  if (!raw) return "all";
  try {
    return JSON.parse(raw) as Audience | "all";
  } catch {
    return "all";
  }
}

export interface SavedSession {
  state: SimState;
  items: ChatItem[];
  savedAt: string;
}
export function saveSession(caseId: string, s: SavedSession) {
  localStorage.setItem(SESSION_PREFIX + caseId, JSON.stringify(s));
}
export function loadSession(caseId: string): SavedSession | null {
  return read<SavedSession | null>(SESSION_PREFIX + caseId, null);
}
export function clearSession(caseId: string) {
  localStorage.removeItem(SESSION_PREFIX + caseId);
}

const ACCESS_KEY = "els_access_code";
export function getAccessCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(ACCESS_KEY) ?? "";
}
export function setAccessCode(code: string) {
  sessionStorage.setItem(ACCESS_KEY, code);
}
export function clearAccessCode() {
  sessionStorage.removeItem(ACCESS_KEY);
}

/* ---------------------------------------------------------------- AED training module */

const AED_KEY = "els_aed_v1";

export interface AedProgress {
  /** Lesson ids marked as read. */
  lessons: string[];
  /** Best quiz result in percent (null = not taken). */
  quizBest: number | null;
  quizAttempts: number;
  /** Pad placement exercise solved. */
  padsDone: boolean;
  /** AED step-by-step drill completed without error. */
  drillDone: boolean;
}

const AED_EMPTY: AedProgress = { lessons: [], quizBest: null, quizAttempts: 0, padsDone: false, drillDone: false };

let cachedAedRaw: string | null = null;
let cachedAed: AedProgress = AED_EMPTY;
function aedSnapshot(): AedProgress {
  const raw = localStorage.getItem(AED_KEY);
  if (raw !== cachedAedRaw) {
    cachedAedRaw = raw;
    try {
      cachedAed = raw ? { ...AED_EMPTY, ...(JSON.parse(raw) as Partial<AedProgress>) } : AED_EMPTY;
    } catch {
      cachedAed = AED_EMPTY;
    }
  }
  return cachedAed;
}

export function useAedProgress(): AedProgress {
  return useSyncExternalStore(subscribe, aedSnapshot, () => AED_EMPTY);
}

export function updateAedProgress(fn: (p: AedProgress) => AedProgress) {
  try {
    localStorage.setItem(AED_KEY, JSON.stringify(fn(aedSnapshot())));
  } catch {
    /* storage unavailable – progress just isn't kept */
  }
  emit();
}

export function resetProgress() {
  for (const k of [RESULTS_KEY, AED_KEY]) localStorage.removeItem(k);
  emit();
}
