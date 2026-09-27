# OCR / labelled charge reader proof (PR #101)

Do not merge. Do not production-deploy.

Source of the root: `artifacts/casebrain-qa/assurance/mixed-pdf-preview-rerun-v1/PROOF.md`.

## Root

OCR Beck File extract names `Offence type: ABH s.47`, `Case title: ABH s.47 - Emery Beck`, and an exact ABH allegation. Smoke-pack detection still treated the pack as labelled, then blanked the charge because it only read `Offence family` / `Exact charge wording`. Overview/File/Chase/Court/Papers all showed `Charge not safely identified from uploaded papers`.

This patch reads labelled `Offence type`, `Exact allegation wording`, `Statement of Offence`, `Allegation`, and a charge fragment in `Case title` when no stronger field exists. Proof-pressure and narrative names cannot replace a charge.

Not mixed in: Brookes duplicate WhatsApp/subscriber cards, Court chip wording, generic layout polish.

## SHA

- `a0cbe255da239b431c886748109355111b4d8aca` — read labelled OCR Offence type / allegation as the charge

Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app

Vercel: SUCCESS / Ready (`Deployment has completed`)

Login: `gduffy1993+casebrain-gold20@gmail.com`

Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`

## Tests run

- `npx tsx scripts/ocr-labelled-charge-reader.test.ts` — PASS
- `npx tsx scripts/smoke-pack-front-sheet.test.ts` — PASS
- `npx tsx scripts/overview-charge-file-first.test.ts` — PASS
- `npx tsx scripts/leverage-file-named-gaps.test.ts` — PASS
- `npx tsx scripts/chase-fragment-card-gate.test.ts` — PASS
- `npx tsx scripts/court-today-file-shortlist.test.ts` — PASS
- `npx tsx scripts/smoke-pack-court-ledger-gate.test.ts` — PASS

## Live capture

Gold20 preview after Vercel Ready on `a0cbe255d`.

Receipts: `artifacts/casebrain-qa/assurance/ocr-labelled-charge-reader-v1/receipts/`

Screenshots: `artifacts/casebrain-qa/assurance/ocr-labelled-charge-reader-v1/screenshots/`

| case | tabs |
|---|---|
| OCR Beck `1d454c0b-da05-4385-8151-016426ca59b9` | Overview + File + Chase + Court + Papers + Why/source |
| Brookes fresh | Overview smoke |
| Vale Bell 0039 | Overview smoke |
| Leverage | Overview smoke |
| Ahmed | Overview smoke |
| Patel | Overview smoke |
| Gauntlet | Overview smoke |

## Before / after

| Surface | Before | After |
|---|---|---|
| **OCR Beck Overview** | `Charge not safely identified from uploaded papers` | Exact File allegation: assaulted Miles Dacre thereby **occasioning actual bodily harm**. Northlake / 24/06/2026. |
| **OCR Beck File / Chase / Court / Papers** | Same blank charge | Same ABH allegation wording. File extract still names `Offence type: ABH s.47`. |
| **Brookes fresh** | Intimidating a witness | Still **Intimidating a witness**. No possession pack title. |
| **Vale Bell 0039** | Drug-driving exact wording | Still controlled-drug / toxicology proof pressure. |
| **Leverage** | 3 File-named gaps | Still full CCTV master, continuity statement, ID procedure notes. |
| **Ahmed / Patel / Gauntlet** | Fragments suppressed | Still no `reasonable excuse` / cut-sentence / officer-note cards. |

## Remaining issues

P0/P1 from this OCR charge root: none.

P2, not this patch:

- Brookes duplicate subscriber/WhatsApp cards
- Court TOP CHASE chip generic aliases
- OCR Beck duplicate split continuity / full-resolution cards
- Court Why PAGE-MISSING on the safe line while Overview named cards are source-backed
