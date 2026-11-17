#!/usr/bin/env node
/**
 * Content integrity check – run with `npm run verify:content`.
 *
 * Fails if any case
 *  - cites a guideline passage id that does not exist,
 *  - has a teaching quote that is not VERBATIM in its passage,
 *  - has duplicate checklist/pitfall/fact ids,
 *  - has a checklist without critical items or an AED without rhythms,
 *  - has a monitor ECG sequence that contradicts the AED rhythm sequence.
 *
 * Uses Node's built-in TypeScript type stripping (Node ≥ 22.18).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guideline = JSON.parse(readFileSync(path.join(root, "src/data/guideline/bls-2025.json"), "utf8"));
const { BLS_CASES } = await import(path.join(root, "src/data/cases/bls.ts"));
const { aedTrainingQuotes, AED_QUIZ } = await import(path.join(root, "src/data/aed-training.ts"));

const norm = (s) => s.toLowerCase().replace(/min⁻¹/g, "min").replace(/[^a-z0-9]/g, "");
const passages = new Map(guideline.passages.map((p) => [p.id, p]));
const errors = [];
let quotes = 0;
let refs = 0;

for (const c of BLS_CASES) {
  const where = (s) => `[${c.id}] ${s}`;
  const seen = new Set();
  for (const group of [c.checklist, c.pitfalls, c.facts]) {
    for (const x of group) {
      if (seen.has(x.id) && !c.facts.includes(x)) errors.push(where(`duplicate id ${x.id}`));
      if (!c.facts.includes(x)) seen.add(x.id);
    }
  }
  const factIds = new Set();
  for (const f of c.facts) {
    if (factIds.has(f.id)) errors.push(where(`duplicate fact id ${f.id}`));
    factIds.add(f.id);
  }
  for (const x of [...c.checklist, ...c.pitfalls]) {
    if (!x.refs?.length) errors.push(where(`${x.id} has no guideline refs`));
    for (const r of x.refs ?? []) {
      refs++;
      if (!passages.has(r)) errors.push(where(`${x.id}: unknown passage "${r}"`));
    }
  }
  if (!c.checklist.some((x) => x.critical)) errors.push(where("no critical checklist item"));
  if (c.aed && !c.aed.rhythms.length) errors.push(where("AED without rhythm sequence"));
  if (c.monitor) {
    const shockable = new Set(["vf", "pvt"]);
    if (!c.aed) errors.push(where("monitor without AED (the ECG is derived from the AED analyses)"));
    else {
      if (c.monitor.ecg.length !== c.aed.rhythms.length) errors.push(where("monitor.ecg and aed.rhythms differ in length"));
      c.monitor.ecg.forEach((r, i) => {
        const want = c.aed.rhythms[i];
        if (want && (shockable.has(r) ? "shockable" : "non-shockable") !== want)
          errors.push(where(`monitor.ecg[${i}] = ${r} contradicts aed.rhythms[${i}] = ${want}`));
      });
    }
    if (c.monitor.rosc && !c.facts.some((f) => f.id === c.monitor.rosc.afterFact))
      errors.push(where(`monitor.rosc.afterFact "${c.monitor.rosc.afterFact}" is not a fact id`));
  }
  for (const t of c.teaching) {
    quotes++;
    const p = passages.get(t.ref);
    if (!p) {
      errors.push(where(`teaching: unknown passage "${t.ref}"`));
      continue;
    }
    if (!norm(p.text).includes(norm(t.quote))) errors.push(where(`teaching quote not verbatim in ${t.ref}: "${t.quote.slice(0, 80)}…"`));
  }
}

// Learning progress: every checklist item belongs to a competency
const { COMPETENCY_OF } = await import(path.join(root, "src/lib/learning.ts"));
for (const c of BLS_CASES)
  for (const x of c.checklist) if (!COMPETENCY_OF[x.id]) errors.push(`[${c.id}] ${x.id}: no competency in src/lib/learning.ts`);

// AED training module: every quote verbatim, every quiz answer index valid
let aedQuotes = 0;
for (const t of aedTrainingQuotes()) {
  aedQuotes++;
  const p = passages.get(t.ref);
  if (!p) errors.push(`[aed-training] unknown passage "${t.ref}"`);
  else if (!norm(p.text).includes(norm(t.quote))) errors.push(`[aed-training] quote not verbatim in ${t.ref}: "${t.quote.slice(0, 80)}…"`);
}
for (const q of AED_QUIZ) {
  if (!(q.correct >= 0 && q.correct < q.options.length)) errors.push(`[aed-training] quiz ${q.id}: invalid answer index`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} content error(s):\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ ${BLS_CASES.length} cases · ${refs} guideline references · ${quotes} verbatim teaching quotes · ${aedQuotes} AED-module quotes – all verified against ${guideline.passages.length} passages.`);
