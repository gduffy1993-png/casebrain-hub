# CaseBrain coverage roadmap

North star: **safe on every PDF, smart where source supports it** — not perfect extraction on every document shape.

## Loop (repeat forever)

1. Scan real corpus (`--batch`, production gate A+B).
2. Group fingerprints in `grouped-failures.md`.
3. One shared fix per fingerprint (pilot-workflow / battleboard / disclosure).
4. `tsc`, pilot tests, `pilot-3`, batch rollup.
5. Human review before any training export.

## Phases

| Phase | Status | Scope |
|-------|--------|--------|
| 0 | Done | Real batch, A/B/C buckets, production gate |
| 1 | Done | Source-safe wording, eval ID strip, interview admission |
| 2 | In progress | Violence workflow profile, offence inference, mixed-count |
| 3 | Next | Manifest promotion per family (family-40 → confirmed) |
| 4 | Next | Auditor surfaces: exports, thin-bundle fingerprints |
| 5 | Long | Parser/OCR/upload quality (separate from auditor) |

## Production metric

Use **Production gate (A+B)** in `real-960-rollup.md`, not full-1000 AMBER on lab bucket C.

## Command

```powershell
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --corpus real --batch --chunk-size 50 --max 1000
```
