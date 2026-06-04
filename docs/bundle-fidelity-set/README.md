# Bundle fidelity set — Phase 3

Gold bundles with **truth keys** prove CaseBrain **reads** bundle text correctly before we tune answer style or UI.

## Repo gold set (7)

| # | Bundle ID | Location | Status |
|---|-----------|----------|--------|
| 1 | `pilot-3-marcus-vale` | `gold/pilot-3/marcus-vale.truth-key.json` | **Linked-only** — in-app demo manifest |
| 2 | `pilot-3-kian-doyle` | `gold/pilot-3/kian-doyle.truth-key.json` | **Linked-only** |
| 3 | `pilot-3-leon-marsh` | `gold/pilot-3/leon-marsh.truth-key.json` | **Linked-only** |
| 4 | `s18-charge-reduction-jordan-clarke` | `gold/s18-charge-reduction/truth-key.json` | **Runnable** — `test_bundles/s18_charge_reduction_bundle_v1/` |
| 5 | `gbh-pike-jordan-pike` | `gold/gbh-pike/truth-key.json` | **Runnable** — `docs/fictional-bundle-gbh/FICTIONAL_GBH_BUNDLE_COPY_PASTE.txt` |
| 6 | `motoring-thin-ella-shaw` | `gold/motoring-thin/` | **Runnable** — markdown bundle + truth key |
| 7 | `generic-provisional-sam-okonkwo` | `gold/generic-provisional/` | **Runnable** — markdown bundle + truth key |

## Purpose per bundle

- **Marcus / Kian / Leon** — hero workflows (fraud, PWITS, robbery ID); fidelity via `casebrain-auditor --pack pilot-3` until demo text is exported here.
- **S18 Jordan Clarke** — full doc map: charge, MG5, MG11, CCTV, medical, interview, MG6 gaps.
- **GBH Pike** — messy disclosure, date tension, missing CCTV/medical/999.
- **Ella Shaw motoring thin** — thin papers; `generic_motoring_provisional`; must not map to violence/fraud/PWITS.
- **Sam Okonkwo generic provisional** — perverting course of justice; human review; no wrong-family mapping.

## Truth key format

- Schema: `truth-key.schema.json`
- Copy template: `truth-key.template.json`
- Each bundle: `truth-key.json` (or `*.truth-key.json` for pilot-3)

Fields: defendant, charge, court, dates, stage, document types, missing material, thin bundle, expected workflow profile, prohibited families, human review flag.

## Run fidelity (markdown gold only)

```powershell
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/bundle-fidelity.ts --pack gold
```

Report (local, gitignored):

`artifacts/casebrain-auditor/latest/bundle-fidelity/`

## Local real PDFs (later — not in repo)

1. Copy `truth-key.template.json` to a **gitignored** folder, e.g. `artifacts/bundle-fidelity-local/my-case/truth-key.json`.
2. Keep PDFs on your machine only — **never commit** raw client bundles or real names.
3. Run fidelity against pasted text or local path when slice 2+ supports it.

**Warning:** Real PDFs, local truth keys with client data, and run artifacts must stay out of git unless fictional/redacted and explicitly approved.

## Phase slices

| Slice | Scope |
|-------|--------|
| **1 (this branch)** | Gold set, truth keys, runner v1 — defendant/charge/profile/doc types |
| **2** | Tighter field checks, pilot-3 text export, ranked fix fingerprints |
| **3** | Local PDF path (gitignored), your 5 real bundles |

## Gates after changes

```powershell
npx tsc --noEmit
npx tsx scripts/corpus-playback-checks.test.ts
npx tsx scripts/provisional-offence-policy.test.ts
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin
npx tsx scripts/casebrain-auditor-overnight.ts production-pass
```
