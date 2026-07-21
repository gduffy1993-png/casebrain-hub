# Phase 6 checkpoint — final validator & canonical migration

**Status:** CANONICAL MIGRATION + SHARED VALIDATOR — **not a corpus PASS**  
**Phase 4 status:** safe-but-unresolved (not PASS)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Canonical migrations completed

- confidence_dashboard → CanonicalMatterStateV1 counts + fingerprint
- overview-presentation countEvidenceStates* → canonical adapter (deprecated independent algorithm)
- solicitor-matter-state → build from canonical; fingerprint = canonical.fingerprint

Independent calculators remaining: **none** (legacy helpers deprecated as thin adapters only).

## Validator coverage by surface

Shared validator v1.0.0 on all **31** central surfaces (incl. `api_defence_plan_chat`).

| Assertion | Result |
|-----------|--------|
| Valid output passes | true |
| Invalid output blocks | true |
| Scoped display removes only defective line | 31/31 (view-mode capable) |
| Copy/API/export fails closed | true |
| Consumer recognises integrity_blocked | true |

## Fingerprint consistency

| Check | Result |
|-------|--------|
| Overview counts match canonical | true |
| Matter VM fingerprint = canonical | true |
| Dashboard exposes fingerprint | true |
| Fingerprint mismatch blocks | true |

## Reconciled occurrence ledger

| Stock | Prior (Phase 3 copyable) | Phase 5 scanned | Reconstructed | Safely omitted | Still blocked | Proven duplicate diags |
|-------|-------------------------:|----------------:|--------------:|---------------:|--------------:|-----------------------:|
| Raw marker | 72 | 42 | 41 | 1 | 0 | 39 |
| Truncated | 28 | 55 | 0 | 55 | 0 | 54 |

Prior 72 ≈ dual-mode batch findings. Current 42 unique copyable strings (3 distinct diagnostics; 39 cross-fixture duplicate diagnostics). Delta explained by: (1) removing dual-mode double-count, (2) per-string vs batch, (3) newly discovered strings in deeper walk, (4) retired/reconstructed IDs no longer emitting raw markers in migrated composers.

Prior 28 dual-mode batch. Current 55 includes newly discovered truncated lines from deeper string walk (estimate +41). All truncated dispositions are safely_omitted (never invent completions) with review-required display when substantive.

Every Phase-5 occurrence ends as reconstructed / safely_omitted / still_blocked / proven_duplicate. Phase-3 lacked per-occurrence IDs; dual-mode inflation and deeper walk explain the numeric delta.

## Omitted substantive vs non-substantive

Substantive omissions display: *Solicitor review required — this item could not be safely reconstructed from str…*  
Non-substantive may omit silently. Sample check: substantive-with-message≈56, non-substantive≈0.

## Contract & mutation results

Mutations: conflicting_counts=PASS, conflicting_mg11_states=PASS, raw_markers=PASS, truncation=PASS, wrong_family_terms=PASS, missing_provenance_family=PASS, hearing_conflicts=PASS, broken_punctuation=PASS, fingerprint_mismatch_blocks=PASS  
All mutations pass: **true**

## Compatibility failures

- none

## Remaining gated legacy composers

- defence-plan-chat eval evidence string joins (gated via shared validator; not fully structured-composer migrated)

## Explicit non-goals

No UX redesign. No merge. No deploy. Phase 4 not declared PASS.
