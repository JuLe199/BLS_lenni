#!/usr/bin/env node
/**
 * Deterministic tests for the ALS engine (no AI) – run with `npm run test:als`.
 * Plays the authored cases with scripted learner actions and checks rhythm decisions,
 * drug-timing rules and ROSC conditions.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const als = await import(path.join(root, "src/lib/sim/als.ts"));
const { ALS_CASES } = await import(path.join(root, "src/data/cases/als.ts"));
const byId = Object.fromEntries(ALS_CASES.map((c) => [c.id, c]));

function play(caseId, turns) {
  const cfg = byId[caseId].als;
  let s = als.initialAls();
  let t = 0;
  const pitfalls = [];
  const notes = [];
  for (const [actions, cpr = "in_progress"] of turns) {
    t += 60;
    const r = als.applyAlsActions(s, actions, cfg, t, cpr);
    s = r.als;
    pitfalls.push(...r.pitfalls);
    notes.push(...r.notes);
  }
  return { s, pitfalls, notes, items: als.autoItemsMet(s, cfg) };
}

let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log("  ✓", name);
};

// Case 1 – textbook shockable pathway: ROSC at check 4
test("VF: correct pathway → ROSC at check 4, all auto items", () => {
  const r = play("als-cardiology-vf", [
    [["pads_on", "iv_access"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr", "adrenaline", "amiodarone_300", "capnography"]],
    [["rhythm_check"], "paused"],
  ]);
  assert.equal(r.s.rosc, true);
  assert.equal(r.s.shocks, 3);
  assert.deepEqual(r.pitfalls, []);
  for (const it of ["rhythm_decisions", "adrenaline_after_third_shock", "amiodarone_after_third_shock", "vascular_access", "capnography"]) assert.ok(r.items.includes(it), it);
});

test("VF: adrenaline before 3rd shock → pitfall, no ROSC without amiodarone", () => {
  const r = play("als-cardiology-vf", [
    [["pads_on", "iv_access"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr", "adrenaline"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr"]],
    [["rhythm_check"], "paused"],
  ]);
  assert.ok(r.pitfalls.includes("adrenaline_too_early"));
  assert.equal(r.s.rosc, false);
  assert.ok(!r.items.includes("adrenaline_after_third_shock"));
});

test("VF: no shock after a shockable check → missed_shock", () => {
  const r = play("als-cardiology-vf", [[["pads_on"]], [["rhythm_check"], "paused"], [["resume_cpr"]]]);
  assert.ok(r.pitfalls.includes("missed_shock"));
  assert.ok(!r.items.includes("rhythm_decisions"));
});

test("Shock without rhythm check is refused", () => {
  const r = play("als-cardiology-vf", [[["pads_on", "shock"]]]);
  assert.equal(r.s.shocks, 0);
  assert.ok(r.notes.length > 0);
});

test("Drug without access is refused", () => {
  const r = play("als-cardiology-vf", [[["pads_on", "adrenaline"]]]);
  assert.equal(r.s.drugs.length, 0);
  assert.ok(r.notes.some((x) => x.includes("no IV or IO")));
});

// Case 2 – PEA with hypovolaemia
test("PEA: shock for non-shockable → pitfall; early adrenaline + fluids → ROSC at check 3", () => {
  const r = play("als-ed-pea-bleeding", [
    [["pads_on", "iv_access", "adrenaline"]],
    [["rhythm_check"], "paused"],
    [["shock", "resume_cpr"]],
    [["fluids"]],
    [["rhythm_check"], "paused"],
    [["resume_cpr"]],
    [["rhythm_check"], "paused"],
  ]);
  assert.ok(r.pitfalls.includes("shock_nonshockable"));
  assert.equal(r.s.rosc, true);
  assert.ok(r.items.includes("adrenaline_early_nonshockable"));
  assert.ok(r.items.includes("fluids_given"));
});

test("PEA: amiodarone → amiodarone_nonshockable", () => {
  const r = play("als-ed-pea-bleeding", [[["pads_on", "iv_access"]], [["rhythm_check"], "paused"], [["resume_cpr", "amiodarone_300"]]]);
  assert.ok(r.pitfalls.includes("amiodarone_nonshockable"));
});

test("PEA: no fluids → no ROSC", () => {
  const r = play("als-ed-pea-bleeding", [
    [["pads_on", "iv_access", "adrenaline"]],
    [["rhythm_check"], "paused"], [["resume_cpr"]],
    [["rhythm_check"], "paused"], [["resume_cpr", "adrenaline"]],
    [["rhythm_check"], "paused"],
  ]);
  assert.equal(r.s.rosc, false);
});

test("Adrenaline twice in the same cycle → pitfall", () => {
  const r = play("als-ed-pea-bleeding", [[["pads_on", "iv_access"]], [["rhythm_check"], "paused"], [["resume_cpr", "adrenaline"]], [["adrenaline"]]]);
  assert.ok(r.pitfalls.includes("adrenaline_same_cycle"));
});

// Case 3 – refractory VF
test("Refractory VF: IV fails twice, IO, vector change, amio 300+150 → ROSC at check 6", () => {
  const turns = [[["pads_on", "iv_access"]], [["iv_access"]], [["io_access"]]];
  for (let i = 1; i <= 5; i++) {
    turns.push([["rhythm_check"], "paused"]);
    const extra = i === 3 ? ["adrenaline", "amiodarone_300", "vector_change"] : i === 5 ? ["amiodarone_150", "adrenaline"] : [];
    turns.push([["shock", "resume_cpr", ...extra]]);
  }
  turns.push([["rhythm_check"], "paused"]);
  const r = play("als-ems-refractory-vf", turns);
  assert.equal(r.s.ivAttempts, 2);
  assert.equal(r.s.access, "io");
  assert.equal(r.s.shocks, 5);
  assert.equal(r.s.rosc, true);
  assert.deepEqual(r.pitfalls, []);
  for (const it of ["io_after_failed_iv", "vector_change", "amiodarone_after_fifth_shock", "amiodarone_after_third_shock", "adrenaline_after_third_shock"]) assert.ok(r.items.includes(it), it);
});

test("Refractory VF: without vector change no ROSC", () => {
  const turns = [[["pads_on", "io_access"]]];
  for (let i = 1; i <= 6; i++) {
    turns.push([["rhythm_check"], "paused"]);
    turns.push([["shock", "resume_cpr", ...(i === 3 ? ["adrenaline", "amiodarone_300"] : [])]]);
  }
  const r = play("als-ems-refractory-vf", turns);
  assert.equal(r.s.rosc, false);
});

test("Monitor: CPR artefact while compressing, rhythm visible when paused, ETCO2 only with capnography", () => {
  const cfg = byId["als-cardiology-vf"].als;
  let s = als.initialAls();
  s = als.applyAlsActions(s, ["pads_on"], cfg, 10, "in_progress").als;
  assert.equal(als.alsMonitorView(s, cfg, "in_progress").trace, "cpr");
  assert.equal(als.alsMonitorView(s, cfg, "in_progress").etco2, null);
  s = als.applyAlsActions(s, ["rhythm_check"], cfg, 20, "paused").als;
  assert.equal(als.alsMonitorView(s, cfg, "paused").trace, "vf");
  s = als.applyAlsActions(s, ["capnography"], cfg, 30, "in_progress").als;
  assert.equal(als.alsMonitorView(s, cfg, "in_progress").etco2, cfg.etco2Cpr);
});

console.log(`✓ ${n} ALS engine tests passed`);
