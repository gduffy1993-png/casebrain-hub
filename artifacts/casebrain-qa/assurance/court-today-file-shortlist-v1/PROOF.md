# Court Today File-shortlist proof (PR #101)

Do not merge. Do not production-deploy.

Source of the root: `artifacts/casebrain-qa/assurance/mixed-pdf-preview-proof-v1/PROOF.md` and `SCORE.json`.

## Root

Court Today top chase / court-line / what’s-missing / ask-court now use the same File/PDF-backed Overview/Chase shortlist. Offence-family playbook asks, today-angle, contradiction MG11 furniture, and snapshot 999/CAD/custody templates no longer fill Court when a File shortlist exists. Empty shortlists stay provisional.

Not mixed in: Ahmed/Patel/Gauntlet fragment-card cleanup, Leverage empty Overview mute, generic layout/copy polish.

## SHAs

- `2ef3e40cca64c17f96aa7ffe1ed87e8d5585196a` — drive Court from File-named shortlist
- `46c99c20b7d538b61f764fddf1bf7f46a8719f40` — preview typecheck
- `7fdfa31f044ed72280b49319723773f906edee86` — keep chase items visible when they also form the safe line

Live capture is against `7fdfa31f044ed72280b49319723773f906edee86`.

Preview: https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app

Vercel: SUCCESS / Ready

Login: `gduffy1993+casebrain-gold20@gmail.com`

Workspace: `e066f4cd-749f-4436-baa9-8c187092149a`

## Tests run

- `npx tsx scripts/court-today-file-shortlist.test.ts` — PASS
- `npx tsx scripts/smoke-pack-court-ledger-gate.test.ts` — PASS
- `npx tsx scripts/bundle-truth-ledger.test.ts` — PASS
- `npx tsx scripts/bundle-client-safe-extract.test.ts` — PASS
- `npx tsx scripts/export-pack.test.ts` — PASS
- `npx tsx scripts/hearing-mode.test.ts` — PASS
- `npx vitest run scripts/source-truth-guardian.test.ts` — 23 pass / 1 fail (Jordan chase label wording; not this root)
- `npx tsx scripts/decision-board.test.ts` — pre-existing `not legal advice` string; not this root
- `npx tsx scripts/bundle-contradiction-extract.test.ts` — pre-existing Paige scan assertion; not this root

## Live capture

Gold20 cases, Overview + Chase + Court Today.

- Patterson `1098e31f-aa53-424e-a405-683440907f7a`
- Davies `60bcda4a-87f8-48e0-826e-e2f0dcd74fb2`
- Trap fresh `ba0931b2-1e30-4aad-8655-e91afac35660`
- Brookes fresh `95a2746e-d1d3-4f55-aad6-4fb41a7b428b`

Receipts: `artifacts/casebrain-qa/assurance/court-today-file-shortlist-v1/receipts/`

Screenshots: `artifacts/casebrain-qa/assurance/court-today-file-shortlist-v1/screenshots/`

## Before / after

### Patterson — PASS

Before: Court safe line Custody/PACE; top chase `999 audio / emergency-call material`. CAD/custody extract is a served tab. Overview/Chase already named O1 CCTV, O2 knife log, O3 blood.

After: safe line names O1 Full CCTV window, O2 Knife search log, O3 blood swab. Top chase `O1 Full CCTV window from flat block`. What’s missing O1/O2/O3. No 999/CAD.

### Davies — PASS

Before: safe line Custody/PACE; top chase `Custody Record / Custody CCTV` while File MG6/01 custody extract is Served. Overview/Chase named MG6/04 bank / MG6/05 CCTV continuity.

After: top chase `MG6/05 CCTV Continuity log`. No custody chase. Overview/Chase still include MG6/04 bank. Court first-three list-cap dropped bank from Court KPI (P2). Not chasing served custody.

### Trap fresh — PASS

Before: safe line `Sequence, injury and causation...`; next step `Full MG11 set, complainant schedule...`. Overview/Chase kept interview + continuity.

After: Court safe line, top chase, ask-court, and what’s missing are interview record / continuity provenance only. No complainant MG11 / injury-causation furniture.

### Brookes fresh — PASS (this root)

Before: Court top chase `Full phone download / source extraction`; next `Chase full phone extraction and attribution/SIM/IMEI material`.

After: Court safe line U5 email / original download and voice note / Original WhatsApp export. Top chase `U5 Email from witness attaching screenshots`. No possession playbook line. No pre-interview. Court header is `Charge not safely identified from uploaded papers`. Overview still shows `Possession / knowledge / phone-attribution` — left as a separate charge-signal issue.

## Ahmed / Patel / Gauntlet / Leverage

No product work on fragment-card cleanup or empty-Overview mute. Court now consumes the same shortlist those surfaces already had, so those roots are unchanged except incidental agreement (Court matching Chase, including remaining bad cards).

## Remaining issues (from mixed proof, not this root)

P0: none for this Court-shortlist root.

P1:

- Ahmed: fragment / “reasonable excuse” chase cards
- Patel: cut-sentence chase card; Court previously 999 vs MG6 CCTV/MG11
- Gauntlet: officer-note sentence card
- Leverage: Overview/Chase empty while File MG6 names CCTV/continuity/ID
- Brookes Overview charge still `Possession / knowledge / phone-attribution` vs File intimidating a witness

P2:

- Davies Court list-cap can omit MG6/04 bank when other File items rank higher
- Brookes duplicate subscriber/WhatsApp cards
- Vale Bell generic Court chrome
- Tobin generic CCTV/MG11 labels
- Arden lumped outstanding card
- Grant “do not force PWITS” wording
- Dunn generic custody chrome
