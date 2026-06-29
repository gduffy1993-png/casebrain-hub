# Evidence-State Audit — Milestone Report

> **Controlled/synthetic audit only — not solicitor-reviewed real-world audit.**

Generated after expansion pass on master (post `226b569` co-def/chase cleanup commit).

## Commits

| Commit | Description |
|--------|-------------|
| `226b569` | `test(audit): segregate co-def material and improve chase evidence mapping` — 60-case cleanup |
| Expansion commit | `test(audit): expand controlled audit to 253-case inventory ceiling` |
| `test(audit): expand controlled evidence-state audit to 500 cases` | v4 simulator `sim-151..397` (+247 cases) |

## Milestone summary

| Milestone | Runnable cases | Evidence items | False-served | Blocking | Chase accuracy | Warnings |
|-----------|----------------|----------------|--------------|----------|----------------|----------|
| **60** (baseline) | 60 | 471 | 0 | 0 | 84.7% | 76 |
| **100** (target) | 151 sim | 858 | 0 | 0 | 87.2% | 142 |
| **200** (target) | 151 sim + 49+ gold | — | 0 | 0 | — | — |
| **253** (inventory ceiling) | 151 sim + 102 gold | 2,010 | 0 | 0 | 86.9% | 406 |
| **500** | 397 sim + 102 gold + 1 proof | 3,549 | 0 | 0 | 83.8% | 792 |

See [EXPANSION_MILESTONE_REPORT.md](./EXPANSION_MILESTONE_REPORT.md) for v4 expansion detail (`sim-151..397`).

`proof-pack-01` remains a separate fixture when present under `content/casebrain-proof/`.

## 500-case milestone (v4 expansion)

**Reached 500 runnable cases** via H4 simulator v4 (`sim-151..397`, +247 cases).

Inventory at 500:
- 397 H4 simulator cases (v1–v4)
- 102 bundle-fidelity gold cases
- 1 proof-pack fixture

Gold `sc-*` duplicate pairs (25) remain — see diversity report; do not count as unique coverage.

## Safety gates (253-case run)

- `false_served_count = 0` ✓
- `blocking_failures = 0` ✓
- No Brain 1 / Guardian / chase core changes ✓
- Co-def MG6C segregation preserved ✓

## Diversity summary (253 cases)

**Offence families:** broad spread across drugs (conspiracy/PWITS), violence, robbery, motoring, fraud, domestic, sexual/ABE, weapons, public order, youth, mixed/provisional.

**Evidence traps (profile field):** encro, county lines, co-def bleed, partial media, index-only, corrected charge, youth safeguards, wrong-family bleed, etc. (simulator v3 specs).

**Layouts:** rotated scan, bad OCR, duplicate pages, index-only, corrected indictment, mixed defendants, thin SJP, etc. (simulator metadata; gold corpus uses bundle text only).

**Duplicate candidates (25):** mostly gold `sc-*` corpus cases where H2-derived truth keys collapse to identical item/chase signatures. These are **reported, not hidden** — they should not count as unique coverage for future expansion without richer per-corpus truth-key enrichment.

**Banned synthetic phrases in bundle/output:** 0 hits ✓

**Top repeated chase labels:** harness-level repetition in gold fraud/PWITS/robbery corpus (e.g. “full phone extraction”, “full cctv master”) — mapping issue / corpus family clustering, not false-served.

## Warning clusters (406 at 253)

| Cluster | Type | Notes |
|---------|------|-------|
| Inference / “whether…” items | Harness + truth-key | Simulator curated items; product does not surface inference rows |
| Served MG11/MG5 not on chase row | Harness (`served_item_not_surfaced_in_h5`) | Benign for chase-first H5 |
| Gold corpus thin keys | Truth-key coverage | `pilot-3-*` (1 item), some v1 sim (0–3 items) |
| Chase not surfaced | Product surface | 181 expected chase items have no H5 candidate |

## Detector coverage

See [COVERAGE_CHECKLIST.md](./COVERAGE_CHECKLIST.md).

## Recommendation

| Milestone | Verdict |
|-----------|---------|
| **100** | **Continue** — clean safety gates |
| **200** | **Continue** — clean safety gates at 253 ceiling |
| **500** | **Stop at 500** — v4 expansion complete; enrich gold truth keys before claiming >475 unique coverage |

Do **not** claim solicitor-reviewed or real-world proof.
