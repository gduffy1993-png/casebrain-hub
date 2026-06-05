# Real-matter Auditor Lane (slice 1)

**Status:** Private, gitignored, discovery-first lane for 10–20 anonymised local matters.

**Not:** Supabase full-960, bulk 960 PDF import, production upload, or committed client data.

## Committed templates (repo-safe)

- `docs/real-matter-auditor/manifest.template.json`
- This README

## Local gitignored layout

```text
artifacts/casebrain-auditor/local-real-matters/
  rm-001-motoring-thin/
    manifest.json          ← from template; anonymised labels only
    bundle-text.md         ← minimum viable (pasted/anonymised extract)
    bundle.pdf             ← optional; extract in memory only
    human-truth.json       ← optional; strict-truth pass only
```

**Never commit** anything under `artifacts/`.

## `--pack local`

Means matters under `artifacts/casebrain-auditor/local-real-matters/` only.

Does **not** mean gold, pilot-3, Supabase, or full-960.

## Commands

```powershell
npx tsx scripts/real-matter-auditor.ts --list-local
npx tsx scripts/real-matter-auditor.ts --pack local --discovery
npx tsx scripts/real-matter-auditor.ts --pack local --case rm-001-motoring-thin
npx tsx scripts/real-matter-auditor.ts --pack local --strict-truth
npx tsx scripts/real-matter-auditor.test.ts
```

## Reports (gitignored)

`artifacts/casebrain-auditor/latest/real-matter-auditor/`

- SUMMARY.md, summary.json, fingerprint-rollup.md
- weak-fail-cases.csv, needs-review.csv
- by-offence-family.json, by-document-type.json
- holdout-summary.json
- strict-truth-summary.json (when human-truth files exist)

## Holdout

Aim for **10–12 discovery** matters + **2 holdout**. Discovery runs skip holdout by default. Use `--include-holdout` at milestone only.

## Redaction

- Use `rm-XXX` localIds and anonymised labels (Defendant A, etc.)
- No real names, URNs, DOB, addresses, or police refs in committed files
- User confirms lawful basis to process matters locally

## PDF without bundle-text.md

If `bundle.pdf` exists and `bundle-text.md` absent:

- Existing `extractTextFromFileBuffer` runs **in memory only**
- Extracted text is **not** written to repo
- No new OCR service

## Pre-commit gate checklist

Before commit/PR, run gates with pilot mode set (required for `pilot-3`; without it the auditor reports false RED):

```powershell
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/casebrain-auditor.ts --pack pilot-3 --user-role pilot-non-admin
npx tsx scripts/casebrain-auditor-overnight.ts production-pass
```

See also the full gate list in the slice PR description.

## Slice 2+ (out of scope)

- Supabase full-960 batch discovery
- DB persistence / sign-off
- Multi-case supervisor queue
