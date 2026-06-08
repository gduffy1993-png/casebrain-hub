# CaseBrain coverage roadmap

North star: **safe on every PDF, smart where source supports it** — not perfect extraction on every document shape.

## Loop (repeat forever)

1. Scan real corpus (`--batch`, production gate A+B).
2. Group fingerprints in `grouped-failures.md`.
3. One shared fix per fingerprint (pilot-workflow / battleboard / disclosure).
4. `tsc`, pilot tests, `pilot-3`, batch rollup.
5. Human review before any training export.

## Autopilot slices (roadmap/autopilot only)

| Slice | Scope | Status |
|-------|--------|--------|
| A | Sleep report, baseline lock, training export rules | Done |
| B | Charge-offence routing, family-40 fictional promote only, leakage filters | Done |
| C | Certainty language, chase dedupe, thin-bundle honesty, route cleanup | Done |
| D | Auditor surface depth, discovery thin-bundle scan | Done |
| E | Correct-fix fields, manifest review queue hardening | Done |
| F | Full-960 collector timeout + batch resume | Done |
| G | Training approval scaffold (`approvedForTraining: false` default) | Done |
| H | Final batch + complete sleep report | Done |

## Phases

| Phase | Status | Scope |
|-------|--------|--------|
| 0 | Done | Real batch, A/B/C buckets, production gate |
| 1 | Done | Source-safe wording, eval ID strip, interview admission |
| 2 | Done | Violence workflow profile, offence inference, mixed-count |
| 3 | In progress | Manifest promotion per family (family-40 → confirmed, human gate) |
| 4 | In progress | Auditor surfaces, thin-bundle fingerprints, training scaffold |
| 5 | Long | Parser/OCR/upload quality (separate from auditor) |
| 6 | Long | Law/chat RAG (out of autopilot) |

## Production metric

Use **Production gate (A+B)** in `real-960-rollup.md`, not full-1000 AMBER on lab bucket C.

## Commands

```powershell
# Preflight
npx tsc --noEmit
npx tsx scripts/pilot-workflow-profile.test.ts
npx tsx scripts/pilot-hearing-extract.test.ts
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin

# Full real batch
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --corpus real --batch --chunk-size 50 --max 1000 --user-role pilot-non-admin
```

## Protected (stop autopilot)

DB schema, auth, upload backend/parsing, OCR, law model, training upload, Golden/Battleboard eval baselines, merge/push to `main`.
