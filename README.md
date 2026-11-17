# eLS – Life Support Case Trainer (working title)

Case-based resuscitation e-learning for **nurses, physicians and EMS staff**, built on the eKLINAM stack
(Next.js 16, Tailwind 4, Gemini). Module 1: **Adult Basic Life Support**, grounded exclusively in the
*European Resuscitation Council Guidelines 2025 – Adult Basic Life Support* (Resuscitation 215 (2025) 110771).
ALS / PLS / Special Circumstances are prepared as modules (“soon”).

## Start locally

Node.js ≥ 22.18.

```bash
npm install
npm run dev
```

`.env.local` (not committed):

```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-4-hydrogen      # default
GEMINI_THINKING_LEVEL=low           # minimal | low | medium | high
APP_ACCESS_CODE=...                 # required in production; unset = open in local dev only
```

## How hallucinations are prevented

| Layer | What | Where |
|---|---|---|
| Closed knowledge base | 53 page-referenced passages generated from the PDF; the model may use nothing else for teaching | `scripts/build_guideline.py` → `src/data/guideline/bls-2025.json` |
| Authored cases | Findings, people, equipment, AED rhythm sequence, ending – all written in advance | `src/data/cases/bls.ts` |
| Deterministic AED | Model only reports learner actions; rhythm results + voice prompts come from a state machine | `src/lib/sim/state.ts` |
| Structured output | Per-case enums for checklist/pitfall/fact ids – the model cannot invent ids | `src/lib/sim/prompt.ts` |
| Quote verification | Every coach quote must be verbatim in the cited passage; numbers must appear in the quotes | `src/lib/sim/guards.ts` |
| Entailment check | Independent second call: every knowledge statement must follow from the verified quotes | `src/lib/sim/entailment.ts` |
| Repair → withhold | One repair attempt; otherwise the note is withheld and the learner is told | `src/app/api/case/turn/route.ts` |
| Narration filter | Removes sentences announcing shock decisions, citing the guideline, or with unsupported clinical numbers | `src/lib/sim/guards.ts` |
| Deterministic debrief | Score, pass/fail and debrief come from the authored checklist – no AI text | `src/lib/sim/scoring.ts`, `src/components/Debrief.tsx` |
| Content CI | Fails on unknown passage ids or non-verbatim teaching quotes | `npm run verify:content` |

## Content workflow

- **Guideline**: put the PDF at `source/ERC-2025-BLS.pdf` (gitignored) and run `npm run guideline:build`
  (needs `pip3 install pypdfium2`). Figures 1/2/3/6/7 and Table 1 are transcribed by hand in the script.
- **Cases**: edit `src/data/cases/bls.ts`. Each checklist item/pitfall cites passage ids; each teaching
  point must be a verbatim quote. `BLOCKED_BY` defines which pitfalls cancel an item (e.g. a late call).
  Run `npm run verify:content` after every change.
- **New module (e.g. ALS)**: add a guideline JSON with the same structure, a case file, and register the
  module in `src/lib/brand.ts`. The engine is module-agnostic except for the BLS guideline import in
  `src/lib/guideline.ts` (generalise when the second guideline is added).

## Deployment

Same as eKLINAM: Netlify **Git deploy** (not drag-and-drop – the API route needs a server). Set
`GEMINI_API_KEY`, `APP_ACCESS_CODE` (and optionally `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL`) in Netlify.

## Notes

- Progress is stored per browser (localStorage); no user accounts.
- The guideline text is © European Resuscitation Council / Elsevier – clarify licensing/permission
  before making the app publicly accessible.
- Training tool; not a substitute for certified BLS courses or local protocols.
