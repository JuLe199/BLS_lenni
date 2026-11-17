# eLS – Life Support Case Trainer (working title)

Case-based resuscitation e-learning for **nurses, physicians and EMS staff**, built on the eKLINAM stack
(Next.js 16, Tailwind 4, Gemini). Modules: **Adult Basic Life Support** and **Adult Advanced Life Support**,
grounded exclusively in the *ERC Guidelines 2025 – Adult BLS* (Resuscitation 215 (2025) 110771) and
*Adult ALS* (Resuscitation 215 (2025) 110769). Special Circumstances is prepared as a module (“soon”).

What learners get:
- **Cases** (7 BLS, 3 ALS) with a deterministic training monitor (ECG, SpO₂, NIBP, capillary refill; ETCO₂ in ALS).
  In ALS the case engine (`src/lib/sim/als.ts`) decides rhythm per check, ROSC, IV/IO success and drug timing.
- **Knowledge sections** `/learn/bls`, `/learn/als` in guideline order, each with a quiz (`src/data/knowledge.ts`),
  plus the AED training module `/aed`.
- **Ask the Team Leader**: a drawer on every page (`/api/ask`) that answers questions only from the guideline
  passages, statement by statement with verified verbatim quotes.
- **Learning progress** `/progress`: 60 % cases passed, 40 % knowledge (BLS, ALS, AED), competencies per module.

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
| Deterministic ALS engine | Rhythm checks, shocks, drug timing pitfalls, ROSC requirements – the model only reports action categories | `src/lib/sim/als.ts`, `npm run test:als` |
| Team Leader answers | Retrieval over both guidelines; each statement needs verbatim quotes + entailment check; otherwise removed | `src/lib/ask.ts`, `src/app/api/ask/route.ts` |
| Content CI | Fails on unknown passage ids or non-verbatim teaching quotes (cases, knowledge, quizzes, AED module) | `npm run verify:content` |

## Content workflow

- **Guideline**: put the PDF at `source/ERC-2025-BLS.pdf` (gitignored) and run `npm run guideline:build`
  (needs `pip3 install pypdfium2`). Figures 1/2/3/6/7 and Table 1 are transcribed by hand in the script.
- **Cases**: edit `src/data/cases/bls.ts`. Each checklist item/pitfall cites passage ids; each teaching
  point must be a verbatim quote. `BLOCKED_BY` defines which pitfalls cancel an item (e.g. a late call).
  Run `npm run verify:content` after every change.
- **ALS guideline**: `source/ERC-2025-ALS.pdf` → `npm run guideline:build:als` (needs `pdfplumber`, `pypdfium2`).
- **New module**: add a guideline JSON, a case file, register it in `src/lib/guideline.ts`, `src/data/cases/index.ts`
  and `src/lib/brand.ts`.

## Deployment

Same as eKLINAM: Netlify **Git deploy** (not drag-and-drop – the API route needs a server). Set
`GEMINI_API_KEY`, `APP_ACCESS_CODE` (and optionally `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL`) in Netlify.

## Notes

- Progress is stored per browser (localStorage); no user accounts.
- The guideline text is © European Resuscitation Council / Elsevier – clarify licensing/permission
  before making the app publicly accessible.
- Training tool; not a substitute for certified BLS courses or local protocols.
