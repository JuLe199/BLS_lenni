/**
 * "Ask the Team Leader" – retrieval over the closed guideline knowledge base.
 *
 * The model only ever sees guideline passages selected here: the concise recommendations and
 * figures of both guidelines (always) plus the evidence passages that best match the question.
 * Pure functions – shared by the API route and the content tests.
 */
import { ALL_PASSAGES, ALS_PROMPT_PASSAGES, type Passage } from "@/lib/guideline";

const STOP = new Set(
  "a an and are as at be by can could do does for from has have how i if in is it its me my of on or should than that the their then there these this to was what when where which who why will with would you your about after before during into than also any must not no yes per der die das und ist im in den dem des ein eine einer eines wie was wann wo warum welche welcher welches soll sollte sollen muss man mit bei nach vor von zu zum zur für auf aus ich du sie er es wir ihr oder nicht kein keine noch auch nur sehr mehr wird werden kann können darf gibt geben".split(" ")
);

/** German (and colloquial) terms → guideline vocabulary. Lower-case stems. */
const SYNONYMS: Record<string, string[]> = {
  adrenalin: ["adrenaline"],
  epinephrin: ["adrenaline"],
  epinephrine: ["adrenaline"],
  suprarenin: ["adrenaline"],
  amiodaron: ["amiodarone"],
  amio: ["amiodarone"],
  lidocain: ["lidocaine"],
  defi: ["defibrillat", "shock"],
  defibrillator: ["defibrillat"],
  defibrillation: ["defibrillat", "shock"],
  schock: ["shock"],
  schocks: ["shock"],
  energie: ["energy", "joule"],
  joule: ["energy"],
  kammerflimmern: ["vf", "ventricular", "fibrillation"],
  flimmern: ["vf", "fibrillation"],
  asystolie: ["asystole"],
  pea: ["pea", "non-shockable"],
  rhythmus: ["rhythm"],
  rhythmuskontrolle: ["rhythm", "check"],
  thoraxkompression: ["compression"],
  thoraxkompressionen: ["compression"],
  herzdruckmassage: ["compression"],
  drucktiefe: ["depth", "compression"],
  frequenz: ["rate"],
  beatmung: ["ventilation", "breath"],
  beatmen: ["ventilation"],
  atemspende: ["rescue", "breath"],
  intubation: ["intubation", "tracheal"],
  tubus: ["tracheal", "tube"],
  larynxtubus: ["laryngeal", "supraglottic"],
  larynxmaske: ["supraglottic"],
  igel: ["gel", "supraglottic"],
  kapnografie: ["capnography", "etco2"],
  kapnographie: ["capnography", "etco2"],
  etco2: ["etco2", "capnography"],
  sauerstoff: ["oxygen"],
  zugang: ["access"],
  venenzugang: ["intravenous", "access"],
  intraossär: ["intraosseous"],
  io: ["intraosseous"],
  iv: ["intravenous"],
  flüssigkeit: ["fluid"],
  volumen: ["fluid", "hypovolaemia"],
  infusion: ["fluid", "infusion"],
  ursachen: ["causes", "reversible"],
  ursache: ["causes", "reversible"],
  hypoxie: ["hypoxia"],
  hypovolämie: ["hypovolaemia"],
  hyperkaliämie: ["hyperkalaemia"],
  hypothermie: ["hypothermia"],
  spannungspneumothorax: ["tension", "pneumothorax"],
  perikardtamponade: ["tamponade"],
  tamponade: ["tamponade"],
  lungenembolie: ["pulmonary", "embolism"],
  lyse: ["thrombolytic"],
  thrombolyse: ["thrombolytic"],
  ultraschall: ["ultrasound", "pocus"],
  sono: ["ultrasound", "pocus"],
  rosc: ["rosc", "spontaneous", "circulation"],
  spontankreislauf: ["rosc", "spontaneous", "circulation"],
  pulskontrolle: ["pulse", "check"],
  puls: ["pulse"],
  pads: ["pad", "pads"],
  elektroden: ["pad", "pads"],
  klebeelektroden: ["pad", "pads"],
  "anterior-posterior": ["antero-posterior", "vector"],
  vektorwechsel: ["vector", "antero-posterior"],
  aed: ["aed"],
  laien: ["lay"],
  laie: ["lay"],
  leitstelle: ["dispatcher"],
  disponent: ["dispatcher"],
  notruf: ["emergency", "call"],
  schnappatmung: ["agonal", "gasping"],
  atmung: ["breathing"],
  bewusstlos: ["unresponsive"],
  krampfanfall: ["seizure"],
  schwangerschaft: ["pregnan"],
  übergewicht: ["obesity"],
  adipositas: ["obesity"],
  mechanisch: ["mechanical"],
  reanimation: ["resuscitation", "cpr"],
  wiederbelebung: ["resuscitation", "cpr"],
  abbruch: ["termination"],
  beenden: ["termination", "stopped"],
  ecpr: ["ecpr", "extracorporeal"],
  ecmo: ["extracorporeal"],
  tachykardie: ["tachycardia", "tachyarrhythmia"],
  bradykardie: ["bradycardia"],
  kardioversion: ["cardioversion"],
  schrittmacher: ["pacing", "pacemaker"],
  atropin: ["atropine"],
  icd: ["icd", "implantable"],
  teamleader: ["team", "leader"],
  debriefing: ["debriefing"],
  bewusstsein: ["consciousness"],
  sedierung: ["sedative", "analgesic"],
  kalzium: ["calcium"],
  calcium: ["calcium"],
  bicarbonat: ["bicarbonate"],
  natriumbicarbonat: ["bicarbonate"],
  tief: ["depth"],
  tiefe: ["depth"],
  drücken: ["compress"],
  drucken: ["compress"],
  schnell: ["rate"],
  dosis: ["dose"],
  dosierung: ["dose"],
  erste: ["first"],
  ersten: ["first"],
  ersters: ["first"],
  vf: ["vf", "ventricular fibrillation", "shockable"],
  pvt: ["pulseless ventricular tachycardia", "shockable"],
  vt: ["ventricular tachycardia"],
  kf: ["vf", "ventricular fibrillation"],
  cpr: ["cpr"],
  hlw: ["cpr"],
  sga: ["supraglottic"],
  o2: ["oxygen"],
  ekg: ["ecg", "rhythm"],
  ecg: ["ecg", "rhythm"],
  "4h": ["reversible causes"],
  hits: ["reversible causes"],
  kinder: ["paediatric", "child"],
  kind: ["paediatric", "child"],
};

export function queryTerms(question: string): string[] {
  const raw = question
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\- ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w));
  const out = new Set<string>();
  for (const w of raw) {
    const syn = SYNONYMS[w];
    if (syn) syn.forEach((s) => out.add(s));
    if (/^[a-z0-9\-]+$/.test(w) && w.length >= 3) out.add(w.length > 6 ? w.slice(0, w.length - 2) : w); // crude stem
  }
  return [...out];
}

const tokens = (t: string) => t.toLowerCase();
const DOCS = ALL_PASSAGES.map((p) => ({ p, text: tokens(p.title + " " + p.text), title: tokens(p.title) }));
const AVG_LEN = DOCS.reduce((a, d) => a + d.text.length, 0) / DOCS.length;
const count = (hay: string, t: string) => hay.split(t).length - 1;
const IDF = new Map<string, number>();
function idf(t: string): number {
  let v = IDF.get(t);
  if (v === undefined) {
    const df = DOCS.filter((d) => d.text.includes(t)).length;
    v = Math.log(1 + (DOCS.length - df + 0.5) / (df + 0.5));
    IDF.set(t, v);
  }
  return v;
}

/** BM25-style relevance with a title bonus. */
function score(d: (typeof DOCS)[number], terms: string[]): number {
  const k = 1.2;
  const b = 0.75;
  let s = 0;
  for (const t of terms) {
    const tf = count(d.text, t);
    if (!tf) continue;
    s += idf(t) * ((tf * (k + 1)) / (tf + k * (1 - b + (b * d.text.length) / AVG_LEN)));
    if (d.title.includes(t)) s += idf(t);
  }
  return s;
}

/**
 * Passages the Team Leader may use for this question: the best-matching passages first
 * (any kind, incl. evidence sections), then all concise recommendations and figures of
 * both guidelines as a stable backbone.
 */
export function retrievePassages(question: string, limit = 8): Passage[] {
  const terms = queryTerms(question);
  const ranked = DOCS.map((d) => ({ p: d.p, s: score(d, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
  const out = [...ranked];
  for (const p of ALS_PROMPT_PASSAGES) if (!out.includes(p)) out.push(p);
  return out;
}
