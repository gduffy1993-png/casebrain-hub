# Proof Receipt UI — Specification Pack

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/proof-receipt-ui-spec`  
**Do not build product UI, routes, export builders, audit runners, or deploy changes until explicitly approved.**

---

## Purpose

This folder defines the future **solicitor-facing Proof Receipt** experience and the **upgraded Evidence Truth Map** — how a fee-earner sees what CaseBrain said, where it came from, and what may safely be relied on in each output channel.

These specs are **review aids**, not legal advice. They do not replace independent solicitor judgment or claim that proof has been solicitor-reviewed unless a separate review step is completed.

---

## Documents

| File | Scope |
|------|-------|
| [PROOF_RECEIPT_UI_SPEC.md](./PROOF_RECEIPT_UI_SPEC.md) | Receipt drawer, row layout, surfaces, safe actions, guard wording |
| [EVIDENCE_TRUTH_MAP_UI_SPEC.md](./EVIDENCE_TRUTH_MAP_UI_SPEC.md) | Colour states, row actions, map-to-receipt linking |
| [EXPORTABLE_PROOF_APPENDIX_SPEC.md](./EXPORTABLE_PROOF_APPENDIX_SPEC.md) | Court, CPS, client, gaps, brief, and appendix export shapes |
| [FAMILY_SPECIFIC_CARDS_SPEC.md](./FAMILY_SPECIFIC_CARDS_SPEC.md) | Offence-family proof cards (CCTV, BWV, youth, motoring, etc.) |
| [DEMO_CASE_SELECTION_CRITERIA.md](./DEMO_CASE_SELECTION_CRITERIA.md) | Pilot/demo matter selection for UI walkthroughs |

---

## Global guardrails

- **No dev labels** in solicitor-facing copy (no internal enum names, pipeline ids, or raw JSON dumps).
- **No legal advice replacement** — no guilty/not guilty guidance, plea recommendations, or win/loss predictions.
- **Source-linked throughout** — every output line traces to document, page, and excerpt where available.
- **Controlled audit wording only** — use provisional, review-oriented language aligned with existing export copy gates.
- **No false review claims** — do not state that proof was solicitor-reviewed unless that review is recorded separately.
- **Do not invent** solicitor quotes, endorsements, reviewer outcomes, or real-world accuracy claims.

---

## Relationship to other work

| Layer | Role |
|-------|------|
| Evidence Truth Map | Matter-wide evidence state index |
| Proof Receipt | Per-output-line provenance and safe-action anchor |
| CPS Chase / Court / Client Summary / Export | Separate output channels; receipts explain what each line may use |
| Plea / Trial Pressure Map (separate spec) | Aggregates pressure signals; links back to receipts |

This pack **does not** modify Brain 1, Guardian, chase core, Supabase, auth, deploy config, or audit runners.

---

## Acceptance (pack-level)

A supervising solicitor can open any matter receipt or truth-map row and understand **what was said, where it came from, and what to do next** in **under two minutes**, without reading raw pipeline output.

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Author | CaseBrain product spec |
