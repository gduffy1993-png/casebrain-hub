# Overview charge File-first proof (PR #101)

Do not merge. Do not production-deploy.

Source of the root: `artifacts/casebrain-qa/assurance/court-today-file-shortlist-v1/PROOF.md` and `artifacts/casebrain-qa/assurance/mixed-pdf-preview-proof-v1/PROOF.md`.

## Root

Brookes Overview / header charge was filled from the PWITS proof-pressure pack title (`Possession / knowledge / phone-attribution`) while File/PDF names intimidating a witness. Court Today already used the File shortlist. This patch stops playbook route titles replacing the charge, and reads File charge / statement of offence / Count-Allegation tables first (including glued live PDF extract).

Not mixed in: Ahmed/Patel/Gauntlet fragment-card cleanup, Leverage empty Overview mute, generic layout/copy polish.

## SHAs

- `d8e735a2d73d4d2161d1db96241c904f0e7701de` — File/PDF charge first; never use pack title as Overview charge
- `634908998599abe2942f7453d8e5928f0fdae3c3` — glued `CountAllegationParticulars` / `1Intimidating a witnessBetween` live extract

Live capture is against `634908998599abe2942f7453d8e5928f0fdae3c3`.

Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app

Vercel: SUCCESS / Ready

Login: `gduffy1993+casebrain-gold20@gmail.com`

Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`

## Tests run

- `npx tsx scripts/overview-charge-file-first.test.ts` — PASS
- `npx tsx scripts/court-today-file-shortlist.test.ts` — PASS
- `npx tsx scripts/extract-bundle-case-metadata-gold.test.ts` — PASS
- `npx tsx scripts/live-ui-wording-regression.test.ts` — PASS
- `npx tsx scripts/pilot-workflow-profile.test.ts` — PASS
- `npx tsx scripts/smoke-pack-court-ledger-gate.test.ts` — PASS
- `npx tsx scripts/smoke-pack-front-sheet.test.ts` — PASS
- `npx tsx scripts/bundle-truth-ledger.test.ts` — PASS
- `npx vitest run scripts/source-truth-guardian.test.ts` — 23 pass / 1 fail (Jordan chase label wording; not this root)
- `npx tsx scripts/canonical-state-gate-v1.test.ts` — pre-existing `indexOffence` undefined; not this root

## Live capture

Gold20 Brookes fresh `95a2746e-d1d3-4f55-aad6-4fb41a7b428b` — Overview + File + Court Today.

Receipts: `artifacts/casebrain-qa/assurance/overview-charge-file-first-v1/receipts/`

Screenshots: `artifacts/casebrain-qa/assurance/overview-charge-file-first-v1/screenshots/`

## Before / after

### Brookes fresh Overview — PASS

Before: Overview header `Possession / knowledge / phone-attribution`. Client-safe summary used the same pack title. File chrome: charge not safely identified. File extract names `1Intimidating a witness`.

After: Name Taylor Brookes. Charge/offence **Intimidating a witness**. File header and File extract agree. Key defence issues still name phone attribution / subscriber / extraction. Chase shortlist still U5 email / voice note / WhatsApp / subscriber. No PWITS pack title in Overview header.

### Brookes Court Today — no regress

Safe line: U5 Email / original download and voice note / Original WhatsApp export. Top chase: `U5 Email from witness attaching screenshots`. Header charge now also Intimidating a witness. `Full phone download / source extraction` remains in What’s missing (already present on the prior Court-shortlist capture; not this root).

## Ahmed / Patel / Gauntlet / Leverage

No product work on fragment-card cleanup or empty-Overview mute.

## Remaining issues (from mixed proof, not this root)

P0: none for this Overview-charge root.

P1:

- Ahmed: fragment / “reasonable excuse” chase cards
- Patel: cut-sentence chase card
- Gauntlet: officer-note sentence card
- Leverage: Overview/Chase empty while File MG6 names CCTV/continuity/ID

P2:

- Brookes duplicate subscriber/WhatsApp cards
- Brookes Court What’s missing still includes `Full phone download / source extraction`
- Davies Court list-cap can omit MG6/04 bank
- Vale Bell generic Court chrome
- Tobin generic CCTV/MG11 labels
- Arden lumped outstanding card
- Grant “do not force PWITS” wording
- Dunn generic custody chrome
