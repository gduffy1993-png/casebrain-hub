# Controlled tests summary

Generated: 2026-06-29T13:26:34.086Z

Public-safe proof metrics from existing CaseBrain QA gates (synthetic/fictional corpora only).

| Gate | Scope | Result | Notes |
|------|-------|--------|-------|
| Level-1 corpus lint | 2200 bundles | **0 dangerous critical survivors** | Synthetic corpus |
| Golden trust | 102 bundles | **0 blocking fail** | Fictional/golden pack |
| Simulator combined | 150 cases | **0 blocking fail** | H4 simulator traps |
| Bad Output Memory | 23 blocking rules | **pass** | Golden + simulator + export surfaces |
| Export/copy gate | 102 golden | **0 fail** | CPS/court/client copy |
| H5 prod smoke | Overview walkthrough | **PASS** (19 steps) | www.casebrain.co.uk |
| Evidence-state audit | 253 cases / 2,010 items | **0 false-served / 0 blocking** | Controlled/synthetic only — see `controlled-evidence-state-audit-summary.md` |

## What this proves

- Controlled synthetic corpora do not surface **dangerous critical** false-served / unsafe outcome patterns at scale.
- Export surfaces stay separated (CPS vs court vs client) under lint gates.
- Simulator red-team traps (150) produce warnings but **0 blocking fails** on safety rules.
- Evidence-state audit at **253-case inventory ceiling**: **0 false-served**, **0 blocking failures**, chase mapping **86.9%** on controlled material.

## What this does NOT prove

- **Real-world unseen solicitor bundles** have not been independently truth-key audited.
- Near-zero false-served on messy live disclosure is **not claimed**.
- Next layer: **solicitor-reviewed audit (30–50 cases)** — see `controlled-evidence-state-audit-summary.md`.

## Source reports

- `artifacts/casebrain-qa/bundle-fidelity-corpus-lint/report.json`
- `artifacts/casebrain-qa/h3-confidence/golden-trust-report.json`
- `artifacts/casebrain-qa/h4-simulator-combined/simulator-combined-report.json`
- `artifacts/casebrain-qa/h4-bad-output-memory/bad-output-memory-report.json`
- `artifacts/casebrain-qa/h4-export-copy/export-copy-report.json`
- `artifacts/casebrain-qa/h5-overview-smoke/report.json`
- `artifacts/casebrain-proof/controlled-evidence-state-audit-summary.md` (shareable headline)
- `artifacts/casebrain-qa/evidence-state-audit/report.json` (full internal run)
