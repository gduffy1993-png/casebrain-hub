# Chase fragment-card gate proof (PR #101)

Do not merge. Do not production-deploy.

Source of the root: `artifacts/casebrain-qa/assurance/overview-charge-file-first-v1/` and `artifacts/casebrain-qa/assurance/mixed-pdf-preview-proof-v1/`.

## Root

Clause tails, email-attachment sentences, cut cautions, and officer-note narrative were being promoted into Overview/Chase cards. Chase/Overview cards must be named material or named disclosure gaps. Overview and Chase use the same post-filtered shortlist.

Not mixed in: Leverage empty Overview/Chase mute, duplicate subscriber/WhatsApp cleanup, Court layout/chrome, broad UI redesign.

## SHA

- `9ef796ab93373651d2116ac8e3306289ecf07051` — drop clause fragments and officer-note sentences from Overview/Chase cards

Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app

Vercel: SUCCESS / Ready on that SHA

Login: `gduffy1993+casebrain-gold20@gmail.com`

Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`

## Tests run

- `npx tsx scripts/chase-fragment-card-gate.test.ts` — PASS
- `npx tsx scripts/uniform-gate-truth.test.ts` — 26 checks PASS (reasonable excuse stays a Papers row, not a chase card)
- `npx tsx scripts/court-today-file-shortlist.test.ts` — PASS
- `npx tsx scripts/overview-charge-file-first.test.ts` — PASS
- `npx tsx scripts/smoke-pack-court-ledger-gate.test.ts` — PASS

## Live capture

Gold20 preview after Vercel Ready on `9ef796ab9`.

Receipts: `artifacts/casebrain-qa/assurance/chase-fragment-card-gate-v1/receipts/`

Screenshots: `artifacts/casebrain-qa/assurance/chase-fragment-card-gate-v1/screenshots/`

| case | tabs |
|---|---|
| Ahmed `ff92431f-fd4b-4adb-992e-abfdb5c80faa` | Overview + Chase/detail + Why/source receipt |
| Patel `ffddc1a8-b837-4bde-bb50-bc55be0e7626` | Overview + Chase/detail + Why/source receipt |
| Gauntlet `280e487c-3680-4eca-97f1-988828f448e2` | Overview + Chase/detail + Why/source receipt |
| Brookes fresh `95a2746e-d1d3-4f55-aad6-4fb41a7b428b` | Overview + File |
| Vale Bell 0039 `b6d8ed78-b475-4d78-bc44-a7ec1e5475f0` | Overview |

No live receipt contains `reasonable excuse`, `not included with the email`, `Officer note says`, or `treated as a settled`.

## Before / after

| Case | Before | After |
|---|---|---|
| Ahmed | 7 cards including `reasonable excuse` and `not included with the email.` Overview and Chase agreed on the bad cards. | 5 cards both tabs: Complete CAD/999 log, full interview transcript, Final medical/forensic report, search record, phone subscriber data. Receipts still cite MG6/MG6C. |
| Patel | Overview 7 vs Chase 6. Extra Overview card: `Where the full recording or transcript is not served, the account must not be treated as a settled`. | 6 cards both tabs. Named MG6/05 CCTV, custody, interview, MG6/04 MG11, EX/01 remain. Receipts still cite MG6/05 p.7. |
| Gauntlet | 6 cards including `Officer note says final continuity statement to follow.` | 5 cards both tabs. MG6C/001 Exterior CCTV export log and other named MG6C rows remain. Receipts still quote the schedule row. |
| Brookes fresh | (stay-good) File-first charge. | Still **Intimidating a witness**. File extract still has `1Intimidating a witnessBetween`. |
| Vale Bell 0039 | (stay-good) labelled proof pressure. | Still driver identity and toxicology procedure. |

## Remaining issues (not this root)

P0: none for this fragment-card root.

P1:

- Leverage — Overview/Chase empty while File MG6 names CCTV/continuity/ID (explicitly out of this patch)

P2:

- Ahmed Overview `phone subscriber data` vs Chase `Subscriber / account data` (same item, different polish)
- Gauntlet Chase list polish `999 audio / emergency-call material` vs Overview `MG6C/007 CAD/999 audio`
- Patel duplicate interview cards (recording/transcript + MG6/07)
- Vale Bell Overview still has a cut `…procedure; full` still-needed tail (labelled pressure itself remains)
- Duplicate subscriber/WhatsApp cards (Brookes)
- Court layout/chrome / generic “Prepare hearing line”
- Ahmed unsplit-document receipts: source-backed, exact page unavailable
