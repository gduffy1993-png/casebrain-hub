# CaseBrain Auditor — full-960 read-only collector specification

**Status:** Phase 1 implemented — `--corpus real` with `EVAL_ORG_ID` (read-only Supabase + `buildStrategyBattleboard`).

This document defines what must exist before `full-960` can move from pattern discovery to safe large-corpus auditing.

## Goals

- Enumerate up to ~960 criminal cases for **read-only** pattern scanning.
- Collect **metadata + safe text snippets** only — never raw PDFs or full bundles.
- Mark uncertain findings **AMBER** (not release-blocking RED).
- Page with `--limit` / `--offset` to avoid noisy runs and memory spikes.

## Non-goals (do not implement here)

- DB writes, auth changes, upload/parsing/extraction changes.
- Route engine or Court Today runtime changes.
- Golden Sweep / Battleboard Sweep / protected eval baseline edits.
- Model training or auto-fix of production code.

## Required collector inputs

| Field | Required | Notes |
|-------|----------|-------|
| `caseId` | yes | Stable internal id |
| `caseTitle` | yes | May be redacted in export |
| `auditorFamily` / profile hint | optional | From case metadata if known; else `uncertain` |
| `documentCount` | yes | Integer only — no file bytes |
| `manifestCertainty` | yes | `confirmed` only when human-reviewed manifest exists |
| `builderOutputs` | yes | Stress battleboard / workflow strings from **existing live-builder** path |
| `safeSnippets` | optional | Short (≤300 char) excerpts of user-visible copy for fingerprinting |

## Explicit exclusions

- Raw PDFs, full MG forms, full witness statements, full interview transcripts.
- Unredacted names, DOBs, addresses, phones, emails, URNs, court references (unless confirmed fictional/eval/demo pack).
- Full allegation paragraphs from real user-uploaded matters.
- Any write to Supabase or case record mutation.

## Redaction requirements

Before persisting collector output to disk:

1. Run the same class of checks as `lib/eval/casebrain-auditor/redaction.ts` (email, UK phone, postcode, URN-like refs, DOB patterns, UUIDs).
2. On hit: replace with `[REDACTED_*]`, set `redactionStatus: needs_review`, do not mark `approvedForTraining`.
3. Real/account cases: **snippets only** — problem pattern, not evidence body.

## Paging and noise control

```powershell
$env:EVAL_ORG_ID="your-org-uuid"
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --corpus real --limit 50 --offset 0 --user-role pilot-non-admin
```

### Full org batch rollup (read-only)

```powershell
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack full-960 --mode discovery --corpus real --batch --chunk-size 50 --max 1000
```

Output: `artifacts/casebrain-auditor/latest/full-960-real-rollup/`

- **Production gate (A+B)** — firm + pilot-visible cases only (north-star metric).
- **Release gate (all)** — includes lab/eval bucket C (AMBER expected).
- Corpus buckets: **A** real work, **B** pilot-visible, **C** lab/eval.

- **`--limit`:** Max cases per run (default: all in discovery corpus).
- **`--offset`:** Skip first N cases for batched runs.
- **`--family`:** Optional filter to one `AuditorFamilyProfile`.
- Console + `scoreboard.md` should summarise counts; avoid dumping full `allText` per case to stdout.

## Discovery mode behaviour (current)

- Uses **family-40 fictional catalog** as stand-in corpus until a safe DB list export exists.
- Fingerprints: universal wording/leakage patterns only — **no strict manifest pass/fail**.
- Issues with `manifestConfirmed: false` do not block release gate.
- Release gate **AMBER** when only uncertain/MEDIUM/LOW discovery hits exist.

## AMBER vs RED

| Gate | Condition |
|------|-----------|
| GREEN | No confirmed CRITICAL/HIGH on confirmed manifests |
| AMBER | Uncertain manifests, discovery-only, or MEDIUM/LOW only |
| RED | Confirmed CRITICAL/HIGH on confirmed manifest |

## Safe read-only case list export (future)

When implementing a real collector:

1. **Read-only** SQL or API: `SELECT id, title, profile, document_count …` — no blob columns.
2. Export to `artifacts/casebrain-auditor/full-960-case-list.json` (gitignored).
3. Auditor loads list + calls existing `surface-collectors` per case id (pilot mode).
4. Human promotes manifests in `manifest-review-queue` before enabling strict mode.

## Acceptance checklist (before strict full-960)

- [ ] Case list export documented and gitignored
- [ ] Redaction pass on all snippets
- [ ] Paging tested at 50/100/200
- [ ] No production routes touched
- [ ] Pilot-3 and family-40 gates still GREEN/AMBER as today
- [ ] Legal/compliance sign-off on training-data export (separate from discovery)

## Related artifacts (local only — never commit)

- `artifacts/casebrain-auditor/results.json`
- `artifacts/casebrain-auditor/training-data.jsonl`
- `artifacts/casebrain-auditor/manifest-review-queue.json`
- `artifacts/casebrain-auditor/failures.csv` / `weak.csv`
