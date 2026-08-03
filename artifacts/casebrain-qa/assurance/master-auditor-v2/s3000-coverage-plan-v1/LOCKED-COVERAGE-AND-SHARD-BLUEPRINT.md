# LOCKED — 3,000-case coverage & shard blueprint

**Status:** STOP uncommitted for Codex review  
**Baseline:** `308b7cb633f83d7c998bc80adf87356de346b3e9`  
**Worktree:** `C:\Users\gduff\casebrain-hub-wt-s3000-coverage`  
**Branch:** `programme/s3000-coverage-plan`  
**Cases selected/generated:** **none**

This checkpoint locks **coverage design and shard policy only**. It does not create a membership, freeze cases, run CaseBrain/MAA, or support programme PASS.

Honesty bound: target is **broad, measurable England-and-Wales criminal-defence coverage**, not an enumeration of every legal possibility.

---

## 1. Coverage ontology

Machine file: `coverage-ontology.json`

### Counting model
- Exactly one **primaryStratumHome** per case (exclusive; sums to 3,000).
- Cases may carry **secondary tags** on other axes.
- Deliberate absences, referred-only, unsupported formats, and `not_exercised` exits are first-class cells when truth-keyed.
- Cosmetic-only changes do not create coverage.

### Primary homes (exclusive)

| Home | Quota |
|---|---:|
| Routine volume | 600 |
| Serious violence / sexual | 600 |
| Digital / phone / financial / attribution | 450 |
| Disclosure / multi-defendant / procedural | 450 |
| Youth / mental-health / Welsh / interpreter / translation / PII | 300 |
| Heavy / OCR / scanned / malformed / encrypted / mixed-format | 300 |
| Bail / sentencing / Newton / appeal / unusual pathways | 300 |
| **Total** | **3000** |

### Cross-cutting axes (locked)
Document-count bands; page-volume bands; charge-instrument states (amended/superseded/conflicts); evidence served/partial/missing/referred-only/unreliable/later-disclosure; attribution & co-defendant traps; chronology conflicts; defence positions; procedural stages; document layouts & native formats; **six production exits** (`view`, `copy`, `export`, `api`, `pdf`, `composed_prose`) plus **browser availability** tracked separately; deliberate absences/unsupported formats; complexity tiers `easy` / `moderate` / `complex` / `heavy`.

Deferred specialist domains stay **visible and outside claim** (terrorism/NS, extradition, private prosecutions, complex regulatory, prison law, military justice, etc.).

---

## 2. Quota matrix

Machine file: `quota-matrix.json`

- **Home-exclusive axes** must each sum to 3,000 (primary home, complexity, doc band, page band, chronology primary, defence primary, procedural primary).
- **Floor multi-tag axes** set minima (charge states, evidence states, attribution traps, layouts, deliberate absences); sums may exceed 3,000.
- **Exit declaration floors** lock planned exercise intent (not a run).
- **Coupling rules** prevent hollow homes (e.g. digital home must mostly carry non-clean attribution; pathway home must mostly sit in bail/sentence/appeal/unusual stages; routine home cannot be almost-all easy).

---

## 3. Semantic uniqueness dimensions (layered — corrected)

Machine files:
- `semantic-uniqueness-dimensions.json` (`@1.1.0`)
- `cosmetic-uniqueness-rejection-detector.json`
- `routine-600-structure-sharing-proof.json`
- `semantic-uniqueness-before-after.md` / `.json`
- `semantic-uniqueness-validation-contract.json`

**Withdrawn:** blanket semantic cluster max = 1 (manufactured-diversity risk).

| Layer | Rule |
|---|---|
| L1 | Zero duplicate case IDs, packet hashes, complete source/output fingerprints |
| L2 | Combined semantic signature normally unique; IDs/names/dates/salts/cosmetic wording must **not** contribute |
| L3 | Charge family, layout, defence, stage, evidence-state label, public form **may cluster** |
| L4 | Repeated official/public forms expected — must not be rejected |
| L5 | Universal safety wording may repeat — measured separately from substantive output |
| L6 | Document-graph / evidence-graph / combined-signature **dominance % caps by stratum** |
| L7 | Meaningfully distinct only via substantive multi-axis combinations (≥2 axis deltas) |

Cosmetic uniqueness rejection detector (`CUR-01`…`CUR-08`) is mandatory at future selection.  
Routine-600 proof: shared realistic structures are combinatorially separable without ID/salt cosmetics.

---

## 4. Shard allocation — 12 × 250

Machine file: `shard-allocation-policy.json`

| Shard group | Role |
|---|---|
| S01 | Pilot calibration (future dry-run only after acceptance) |
| S02 | Calibration replicate (not a cosmetic mirror of S01) |
| S03–S08 | Main parallel wave |
| S09–S10 | Stress-enriched catch-up (still within envelopes) |
| S11–S12 | Delayed-validation *candidates* (not sealed by this blueprint) |

### Per-shard primary envelope
- Routine 50 · Serious violence/sexual 50 · Youth/MH/Welsh/interpreter/PII 25 · Heavy/OCR/mixed 25 · Bail/sentence/appeal/unusual 25  
- Digital 38 on S01–S06 / 37 on S07–S12  
- Disclosure/multi-def/procedural 37 on S01–S06 / 38 on S07–S12  

### Per-shard complexity
Easy 75 · Moderate 100 · Complex 50 · Heavy 25  

Caps forbid mono-trap or mono-family shards. Global uniqueness remains authoritative.

---

## 5. Anti-overfitting rules

Machine file: `anti-overfitting-rules.json`

Highlights: no case-ID selectors; shared root-cause routing; no trap-cartesian inflation; no equal-ten-per-charge padding; containment ≠ repair; denominator separation from first census / diverse-second / 18-core / holdouts; shard-local “wins” that regress elsewhere fail; no universal-coverage claim.

---

## 6. Prohibited duplicate / cosmetic variation

Machine file: `prohibited-duplicate-rules.json`

Hard rejects include parameter-substitution clones, layout-noise-only clones, trap-axis remix without new assertion, shard-mirror clones, exit-flag-only diffs, tier-relabel-only, family-label-swap-only, prior-corpus identity reuse, and protected-pilot mutation-as-volume.

---

## 7. Coverage-gap report schema

Machine file: `coverage-gap-report-schema.json`

Defines the future gap report shape (`gapCells`, quota/coupling/uniqueness/shard compliance, severity, fill strategy). **No gap instance is populated here.**

---

## 8. Targeted post-3,000 expansion policy

Machine file: `post-3000-expansion-policy.json`

Expand only to close measured gaps after a future freeze; default batches of 100; new shard plan required above +250; deferred specialist domains enter as separately labelled corpora, not silent claim merges.

---

## Denominator separation (explicit)

| Population | Status relative to this blueprint |
|---|---|
| First frozen 3000 census (`dcf6c382…`) | Preserved; not this plan |
| Diverse-second 3000 (`273e5f5f…`) | Separate prior lane; not this plan |
| This blueprint | Coverage/shard policy only — **no membership** |

---

## STOP

No case generation, selection, freeze, CaseBrain run, commit, push, merge, deploy, or PASS.
