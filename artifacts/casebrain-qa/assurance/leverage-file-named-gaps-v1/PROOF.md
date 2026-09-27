# Leverage File-named gaps proof (PR #101)

Do not merge. Do not production-deploy.

Source of the root: `artifacts/casebrain-qa/assurance/chase-fragment-card-gate-v1/` and `artifacts/casebrain-qa/assurance/mixed-pdf-preview-proof-v1/`.

## Root

Leverage File MG6 names outstanding full CCTV master, continuity statement, and ID procedure notes. Overview and Chase were empty because the labelled list was bullet-prefixed and comma-separated, so the smoke-pack extractor never read it, and the combined glance line never became named cards.

Not mixed in: duplicate subscriber/WhatsApp cleanup, Court layout/chrome, broad UI redesign.

## SHA

- `bf13248a71d6bd30c7dae97b462781e2a0d29db9` — surface File-named CCTV / continuity / ID gaps on labelled packs

Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app

Vercel: SUCCESS / Ready on that SHA

Login: `gduffy1993+casebrain-gold20@gmail.com`

Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`

## Tests run

- `npx tsx scripts/leverage-file-named-gaps.test.ts` — PASS
- `npx tsx scripts/chase-fragment-card-gate.test.ts` — PASS
- `npx tsx scripts/smoke-pack-front-sheet.test.ts` — PASS
- `npx tsx scripts/uniform-gate-truth.test.ts` — 26 checks PASS
- `npx tsx scripts/court-today-file-shortlist.test.ts` — PASS
- `npx tsx scripts/overview-charge-file-first.test.ts` — PASS
- `npx tsx scripts/smoke-pack-court-ledger-gate.test.ts` — PASS

## Live capture

Gold20 preview after Vercel Ready on `bf13248a7`.

Receipts: `artifacts/casebrain-qa/assurance/leverage-file-named-gaps-v1/receipts/`

Screenshots: `artifacts/casebrain-qa/assurance/leverage-file-named-gaps-v1/screenshots/`

| case | tabs |
|---|---|
| Leverage `17e21c53-5635-481e-a189-c8116d56c3d6` | Overview + Chase/detail + Why/source receipt |
| Ahmed | Overview smoke-check |
| Patel | Overview smoke-check |
| Gauntlet | Overview smoke-check |
| Brookes fresh | Overview smoke-check |
| Vale Bell 0039 | Overview smoke-check |

## Before / after

| Case | Before | After |
|---|---|---|
| **Leverage** | Overview 0 / Chase 0. File names outstanding full CCTV master, continuity, ID procedure notes. | **3 cards both tabs:** full CCTV master, continuity statement, ID procedure notes. Receipts cite MG6 / DISCLOSURE POSITION, compiled p.3, file quote `full CCTV master — outstanding`. |
| **Ahmed** | Fragment cards already suppressed. | Still no `reasonable excuse` / email tail. Named gaps remain. |
| **Patel** | Fragment card already suppressed. | Still no cut-sentence card. MG6/05 CCTV remains. Overview/Chase still agree. |
| **Gauntlet** | Officer-note card already suppressed. | Still no `Officer note says`. MG6C named rows remain. |
| **Brookes fresh** | File-first charge. | Still **Intimidating a witness**. |
| **Vale Bell 0039** | Labelled proof pressure. Cut `…procedure; full` tail. | Still driver identity and toxicology. Outstanding list now splits to continuity/provenance and offence-specific expert rows (same File labels). |

## Remaining issues (not this root)

P0: none for this Leverage gap root.

P1: none remaining from the mixed-proof P1 list that this patch was asked to fix.

P2:

- Ahmed Overview `phone subscriber data` vs Chase `Subscriber / account data`
- Gauntlet Chase list polish `999 audio / emergency-call material` vs Overview `MG6C/007 CAD/999 audio`
- Patel duplicate interview cards
- Brookes duplicate subscriber/WhatsApp cards
- Court layout/chrome / generic “Prepare hearing line”
- Ahmed unsplit-document receipts: source-backed, exact page unavailable
