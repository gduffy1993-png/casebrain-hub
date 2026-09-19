# PR #101 P2 solicitor trust polish

Do not merge. Do not production deploy. No broad redesign. Truth extraction roots unchanged.

## Account / deploy

- Login email: `gduffy1993+casebrain-gold20@gmail.com`
- Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`
- PR: https://github.com/gduffy1993-png/casebrain-hub/pull/101
- Product SHA: `f95c941cccb411442bd50272ffa3a58c085c07f0`
- Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app
- Vercel: SUCCESS / Ready (`Deployment has completed` on `f95c941cc`)
- Before source: `artifacts/casebrain-qa/assurance/mixed-pdf-final-rerun-v1` (SHA `b0b9df799`, 16/16 PASS, hard 0)

Spot-capture only: Brookes, Patel, OCR Beck, Hale, Dunn, Gauntlet, Arden, Davies. Full 16 not rerun.

## Tests run

- `npx tsx scripts/p2-solicitor-trust-polish.test.ts` PASS
- `npx tsx scripts/court-today-file-shortlist.test.ts` PASS
- `npx tsx scripts/chase-fragment-card-gate.test.ts` PASS
- `npx tsx scripts/leverage-file-named-gaps.test.ts` PASS
- `npx tsx scripts/ocr-labelled-charge-reader.test.ts` PASS
- `npx tsx scripts/overview-charge-file-first.test.ts` PASS
- `npx vitest run scripts/visible-output-receipt.test.ts` PASS

## Before / after (live Gold20)

| Case | Before | After |
|---|---|---|
| Brookes | 8 Overview cards: duplicate subscriber, WhatsApp, voice-note; Court What’s missing included `Full phone download / source extraction` | 7 cards: U2 voice note, U5, File-named original download, Original WhatsApp, one subscriber, RV/2. Court 3-cap is U2 / U5 / MG6C original download. Generic Full phone gone. |
| Patel | 6 cards including `Full Interview recording / transcript` plus `MG6/07 full interview transcript` | 5 cards. Named `MG6/07` kept; generic interview duplicate gone. `MG6/05` CCTV kept. |
| OCR Beck | 6 cards: combined continuity/full-resolution plus split `Full-resolution original` and `Continuity/provenance` plus chat export | 3 cards: one visual continuity/full-resolution, chat export, source metadata. Chat export not swallowed. |
| Hale | 8 cards including three same-source continuity wordings plus Master footage | Continuity wording collapsed to one `Final continuity note`. Master footage kept. Cap then shows scene-photo index and unnamed witness A (separate named rows). |
| Dunn | Court TOP CHASE `CAD / dispatch log material`; Why `No supporting File/PDF quote` | TOP CHASE `O02 CAD log full print`. Why `multi_source_backed` with child receipts for O02 / O05 / O01. |
| Gauntlet | Court TOP CHASE `999 audio / emergency-call material` | TOP CHASE `MG6C/001 Exterior CCTV export log`. Why child receipts for MG6C/001 / 007 / 008. |
| Arden | Court TOP CHASE `Further papers on the file` | TOP CHASE File-named lumped outstanding (`full bundle pages … CCTV master, continuity`). Lumped wording itself unchanged. |
| Davies | Overview/Court `Primary charge:Concealing…` | `Concealing criminal property, contrary to section 327…` |

Court Why on all 8 spot cases: ITEM RECEIPTS present; none of the 8 Court receipts say `No supporting File/PDF quote available`.

## Remaining issues (soft / out of P2)

- Listing time / Court chrome generally (Vale Bell, Arden missing court)
- Court 3-item cap (Brookes WhatsApp stays on Overview, not in Court 3)
- Arden lumped outstanding wording (chip now File-named; still one lumped row)
- Hale Chase tab still humanizes CAD as `CAD / dispatch log material` while Court uses File-named `CAD and 999 summaries Original audio/log`
- Brookes Chase display of RV/2 as `Further papers on the file` (glued custody row)
- OCR Court labelled smoke-pack line still mentions Full-resolution as a phrase beside the collapsed card
- Upload/account UI, broad layout: not touched
- Full 16-case mixed rerun not repeated; hard-clean assumed from stay-good tests + 8-case spot with no fragment / pack-charge / blank-charge flags
