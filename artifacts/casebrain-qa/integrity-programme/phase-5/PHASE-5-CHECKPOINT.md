# Phase 5 checkpoint — structured composer repair

**Status:** STRUCTURED COMPOSER MIGRATION IN PROGRESS — **not a corpus PASS**  
**Phase 4 status:** safe-but-unresolved (not PASS)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Structured composer

| Field | Value |
|-------|-------|
| Version | **1.0.0** |
| Module | `lib/criminal/structured-solicitor-output/` |
| Fields | subject · evidenceState · sourceEvidenceId · whyItMatters · requestedAction · hearingDeadlineState · safetyQualification · sourceQuotation |

Rendering rules enforced: no arbitrary bullet punctuation-joins; no speculative quotation completion; no source excerpts as headings; no raw delimiters/placeholders; no contradictory served/missing; no partial sentences; legitimate abbreviations preserved.

## Phase 4 closure (materialised)

| Metric | Count |
|--------|------:|
| Mixed | 281 |
| Uncertain | 400 |
| **Mixed ∩ uncertain overlap** | **196** |
| Mixed only | 85 |
| Uncertain only | 204 |

### Family / charge coverage (materialised production)

| Family | Resolved | Mixed resolved | Uncertain | Unsupported blocked | Conditional allowed | Copy/export unavailable |
|--------|---------:|---------------:|----------:|--------------------:|--------------------:|------------------------:|
| harassment_digital | 23 | 23 | 0 | 0 | 0 | 6 |
| harassment_other | 8 | 2 | 0 | 0 | 0 | 4 |
| motoring | 47 | 29 | 0 | 0 | 0 | 12 |
| theft | 2 | 1 | 0 | 0 | 0 | 0 |
| unknown | 0 | 0 | 400 | 1 | 10 | 378 |
| violence | 50 | 30 | 0 | 0 | 0 | 7 |

Stratified FP/FN review sample: 17 cases across uncertain / mixed / allowed / blocked strata (see `phase4-closure-coverage.json`).

Provenance: structured evidence ID **and** supporting label content required — ID alone insufficient.

## Actual production vs adversarial

| Lane | Role |
|------|------|
| Production (materialised casebrain-output) | Stock raw/truncated dispositions below |
| Adversarial (scale probes) | Containment only — **never** folded into production defect rates |

Cross-family probe texts per audit family (Phase 4) — containment proof only

## Stock repair (72 raw / 28 truncated prior copyable)

| Stock | Prior (Phase 3 copyable) | Scanned copyable | Reconstructed | Safely omitted | Still blocked |
|-------|-------------------------:|-----------------:|--------------:|---------------:|--------------:|
| Raw marker | 72 | 42 | 41 | 1 | 0 |
| Truncated | 28 | 55 | 0 | 55 | 0 |

Unique cases affected (stock): 92 · Unique surfaces: 1

**Hidden by gate is not counted as repaired.**

### Before / after examples (redacted)

- `cb-fresh-001-taylor-brookes` sentence.raw_extraction_marker: reconstructed — before len=30;hash=4c54c565ecbb → after len=145;hash=ac6f24e8352d
- `cb-fresh-002-jordan-hale` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f
- `sc-00032` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f
- `sc-0003e` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f
- `sc-00044` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f
- `sc-00056` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f
- `sc-00062` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f
- `sc-00068` sentence.raw_extraction_marker: reconstructed — before len=28;hash=e6e25826b9ab → after len=155;hash=14aa2a25de7f

## Composers migrated

- structured-solicitor-output (new v1.0.0)
- buildDisclosureChaseBrief.toCourtLine / draftChaseWording
- pack-aa-messy-parsers MG6 list joins (pipe → semicolon)
- HearingWarRoom sayThis export (pipe → bullets)
- build-client-explanation dedupe + structured field assess
- solicitor-sentence-composer abbreviation-safe truncation

## Legacy composers remaining

- app/api/criminal/[caseId]/defence-plan-chat/route.ts (eval evidence joins — isolated / gated)
- confidence_dashboard countEvidenceStates (canonical migration ≤ Phase 6)
- overview-presentation count helpers (canonical migration ≤ Phase 6)
- solicitor-matter-state display counts (canonical migration ≤ Phase 6)
- Some disclosure-export assembleFullText section joiners (newline OK; migrate to structured blocks next)

## Compatibility failures

- none in smoke checks

## Uncertain-family usability impact

Uncertain cases: 400. Substantive copy/API/export remain fail-closed; neutral non-substantive responses stay usable; scoped view can retain clean lines.

## Canonical migration deadline

Confidence dashboard, overview-presentation helpers, and solicitor-matter-state: **no later than Phase 6**.

## Explicit non-goals

No merge. No deploy. No claim that Phase 4 is PASS. No folding adversarial probe blocks into production defect rates.
