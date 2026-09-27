# PR #101 post-P2 full 16-case mixed proof (QA only)

Do not merge. Do not production deploy. No product code changed in this pass.

## Account / deploy

- Login email: `gduffy1993+casebrain-gold20@gmail.com`
- Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`
- PR: https://github.com/gduffy1993-png/casebrain-hub/pull/101
- Latest SHA checked: `7e4d743e31c956b7a8a24358e8d62fdd0950928e`
- Product behaviour SHA: `f95c941cccb411442bd50272ffa3a58c085c07f0`
- Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app
- Vercel: SUCCESS / Ready (`Deployment has completed` on `7e4d743e3`)

Same 16 scored cases. Trap fresh `ba0931b2` and Brookes fresh `95a2746e`. Vale Bell `b6d8ed78`.

## Verdict

**PASS — 16 PASS / 0 FAIL. Hard failure count: 0. Capture errors: 0.**

Receipts: 15/16 SOURCE-BACKED (named Overview/Court Why with `direct_pdf_quote`, `derived_from_absence`, or `multi_source_backed` plus child receipts). Carter quiet file DERIVED-VALID.

Overview item counts match Chase TOTAL on every case, including Carter 0/0.

Five truth roots still hold: Court File-shortlist, Overview File-first charge, fragment-card gate, Leverage File-named gaps, OCR labelled charge.

## Per-case marks

| id | identity | issues | chase/court | receipts | cross-tab | verdict |
|---|---|---|---|---|---|---|
| hale | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| patterson | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| patel | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| davies | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| tobin | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| ahmed | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| grant | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| dunn | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| arden | QUIET-BUT-CORRECT | RIGHT | TOO NOISY | SOURCE-BACKED | AGREES | PASS |
| gauntlet | RIGHT | RIGHT | TOO NOISY | SOURCE-BACKED | AGREES | PASS |
| trap-fresh | RIGHT | QUIET-BUT-CORRECT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| carter | RIGHT | QUIET-BUT-CORRECT | QUIET-BUT-CORRECT | DERIVED-VALID | AGREES | PASS |
| vale-bell | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| ocr-beck | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| leverage | RIGHT | RIGHT | RIGHT | SOURCE-BACKED | AGREES | PASS |
| brookes-fresh | RIGHT | RIGHT | TOO NOISY | SOURCE-BACKED | AGREES | PASS |

## Remaining soft issues only (not FAIL)

- Court 3-item cap vs longer Overview/Chase boards (Davies 7→3, Dunn 6→3, Brookes 7→3, Gauntlet 5→3, Tobin 7→3, Hale 8→3)
- Arden missing court in chrome; one lumped File-named outstanding card
- Vale Bell missing listing time in Court chrome (Arden also missing listing time)
- Hale Chase tab still humanizes CAD as `CAD / dispatch log material` while Court uses File-named `CAD and 999 summaries Original audio/log`
- Brookes Chase display of RV/2 as `Further papers on the file`
- OCR labelled Court line still names Full-resolution beside the collapsed visual card
- Carter quiet Court Why has no File/PDF quote (`procedural_instruction`) — expected on an empty board
- Listing-time / Court chrome generally

P2 targets that previously were soft are cleared on this 16-case run: Brookes duplicate digital cards and generic Full phone; Patel duplicate interview; OCR visual split; Hale continuity wording stack; Dunn/Gauntlet generic CAD/999 chips; Arden `Further papers` chip; Davies `Primary charge:` glue; Court Why “no quote” on multi-item safe lines.

## PDFs / case IDs

| id | PDF | case ID |
|---|---|---|
| hale | CB-MURDER-TEST-0001_criminal_defence_bundle.pdf | 9b555b7b-d520-4c33-a661-9ed93acc0fe1 |
| patterson | CB-TB-014_James_Patterson.pdf | 1098e31f-aa53-424e-a405-683440907f7a |
| patel | CB-TB-546_Patel.pdf | ffddc1a8-b837-4bde-bb50-bc55be0e7626 |
| davies | CB-TB-439_Davies.pdf | 60bcda4a-87f8-48e0-826e-e2f0dcd74fb2 |
| tobin | CB-TB-1925_Tobin.pdf | f68abc38-3c3f-4f1b-bc2c-3153796e13e6 |
| ahmed | CB-TB-1573_Ahmed.pdf | ff92431f-fd4b-4adb-992e-abfdb5c80faa |
| grant | CB-TB-1681_Grant.pdf | 91b84da7-0caa-43e6-b40e-d160b4dbdc90 |
| dunn | CB-TB-343_Dunn.pdf | 33b31c1e-4277-4c90-ac52-3cc0b959ad05 |
| arden | CB-MONSTER-2026-0001.pdf | 578ecbd4-0450-4550-9b6e-86a8a3fe692e |
| gauntlet | gauntlet-08-kitchen-sink.pdf | 280e487c-3680-4eca-97f1-988828f448e2 |
| trap-fresh | CB-TRAP-2026-0030.pdf | ba0931b2-1e30-4aad-8655-e91afac35660 |
| carter | police station.pdf | 576c0d28-f5b2-459a-9254-fe3c69379d0a |
| vale-bell | CB-CHARGE-2026-0039.pdf | b6d8ed78-b475-4d78-bc44-a7ec1e5475f0 |
| ocr-beck | CB-OCR-2026-0013.pdf | 1d454c0b-da05-4385-8151-016426ca59b9 |
| leverage | CB-LEVERAGE-2026-0001.pdf | 17e21c53-5635-481e-a189-c8116d56c3d6 |
| brookes-fresh | CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf | 95a2746e-d1d3-4f55-aad6-4fb41a7b428b |

## Folders

- Screenshots: `artifacts/casebrain-qa/assurance/mixed-pdf-p2-final-v1/screenshots/` (80 PNGs)
- Receipts: `artifacts/casebrain-qa/assurance/mixed-pdf-p2-final-v1/receipts/`
- Capture: `artifacts/casebrain-qa/assurance/mixed-pdf-p2-final-v1/CAPTURE.json` (`errors: []`)
- Score: `artifacts/casebrain-qa/assurance/mixed-pdf-p2-final-v1/SCORE.json`
