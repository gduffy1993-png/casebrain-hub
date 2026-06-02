# CaseBrain Auditor — plan

## Purpose

Run many cases → collect visible workflow failures → **fingerprint** → **group by root cause** → emit **one Cursor fix brief per group**. No auto-edits to production.

## Developer workflow (manual — auditor does not start the app)

```powershell
cd C:\Users\gduff\casebrain-hub
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npm run dev
```

Auditor runs **separately** (same shell env recommended for pilot UI flags):

```powershell
npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin
```

The auditor does **not** call `npm run dev`, spawn Next.js, or manage environment variables.

## Architecture

| Module | Role |
|--------|------|
| `pack-registry.ts` | Pack definitions (`pilot-3` active; others scaffolded) |
| `truth-manifests.ts` | Marcus / Kian / Leon expected + forbidden concepts |
| `surface-collectors.ts` | `live-builder` via existing brief builders + stress battleboard |
| `scorers.ts` | Fingerprints, manifests, strategy/source rubrics |
| `issue-fingerprints.ts` | Shared fingerprint catalogue |
| `grouped-failures.ts` | Group by fingerprint (max 3 examples) |
| `fix-ticket-generator.ts` | Cursor prompts per group |
| `report-writers.ts` | CSV / MD / JSON + console summary |

MVP collection: **direct builder output** only. Future: `--base-url http://localhost:3000` for DOM checks against an already-running app.

## Surfaces

Court Today (aggregate), Control Room, Hearing War Room, Disclosure Chase, Documents (source contract), Pilot UI (pilot-mode flags when env set).

## No silent passes

Missing / failed collection → `ui.surface_not_collected` (HIGH). `collectionStatus` on every issue.

## Artifacts (gitignored)

`artifacts/casebrain-auditor/` — `results.json`, `failures.csv`, `weak.csv`, `grouped-failures.md`, `fix-prompts-by-group.md`, `scoreboard.md`

## Release gate

- **GREEN** — no CRITICAL/HIGH  
- **AMBER** — MEDIUM/LOW only  
- **RED** — CRITICAL/HIGH present  

Exit **0** unless CRITICAL/HIGH (or `--fail-on-medium` / `--strict`).

## Protected (auditor must not auto-fix)

DB, auth, upload/parsing, route engines, Court Today admin runtime, Golden/Battleboard sweeps, eval baselines, migrations, pilot profile logic unless explicitly approved.

## Baseline

`--baseline artifacts/casebrain-auditor/results.json` — new / fixed / repeated fingerprints.
