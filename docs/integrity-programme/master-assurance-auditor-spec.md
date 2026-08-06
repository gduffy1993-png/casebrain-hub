# Master Assurance Auditor — Architecture & Specification (v1)

**Status:** STOP FOR CODEX REVIEW  
**Pipeline:** `master-assurance-auditor@v1`  
**Programme PASS supported:** false  

## Purpose

One reusable master assurance auditor that inspects saved Casebrain materialisations (and later fresh authenticated runs) and emits **evidence-backed findings**, not vague scores.

## Layout

| Layer | Path |
|-------|------|
| Library | `lib/eval/master-assurance-auditor/` |
| Controls | `lib/eval/master-assurance-auditor/controls/` |
| CLI | `scripts/assurance/run-master-assurance-auditor.ts` |
| Contracts | `scripts/master-assurance-auditor-contracts.test.ts` |
| Artefacts | `artifacts/casebrain-qa/assurance/master-auditor-v1/` |

## Finding contract

Every finding includes: stable ID, case, surface, exact wording, source/doc/page when known, supporting extract/hash, control+version, severity, confidence, verdict (`pass|defect|containment|unresolved|not_exercised`), plain English, expected professional behaviour, root-cause family, affected exits, remediation, human/legal review flags. **Human disposition fields stay blank** until a person fills them.

## 24 lanes / controls

See `control-registry.json` emitted per run. Controls **reuse** existing `lib/criminal` detectors (provenance, boundary profiles, absolute-proof, cross-exit scanner, attribution, evidence-state, PACE gate) — they do not create a competing stack.

## Migration register

`migration-register.ts` maps Phases 1–11, scale-3000 dispositions, foundation assurance controls, Malik remediations, and known FP/FN classes into retained / upgraded / superseded / rejected entries. Rejected: generic mid-sentence heuristic without surface profiles (MIG-019).

## Calibration pipeline

```
contracts → 20 → 50 → 150 → 300 → 3000
```

Progression requires: valid manifests/hashes, zero crashes/corrupt records, required controls exercised, human-confirmation threshold, no known safety-critical FN, FP rate within threshold. **Otherwise stop with resumable checkpoint.**

**This checkpoint:** architecture + all controls + focused contracts + **20-case only**. Do not start 50+.

## Primary corpus

`artifacts/casebrain-qa/gold-manual-proof-set-v1` (CASE-01…20 preserved saved outputs).

## Blocked vs repaired

Containment (`verdict=containment`, `blockedNotRepaired`) preserves integrity-programme meaning: unsafe wording blocked from copy is not the same as a repaired copyable surface.

## Commands

```bash
npx tsx scripts/master-assurance-auditor-contracts.test.ts
npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=20
```

Next (after Codex clearance only):

```bash
npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=50
```

## Non-goals (this task)

- No live app wiring
- No Brain 1 / Guardian / Phase 11 / ledger / Malik evidence mutation
- No billing/entitlement changes
- No fixture-specific expected-answer patches
- No commit / push / merge / deploy / programme PASS
