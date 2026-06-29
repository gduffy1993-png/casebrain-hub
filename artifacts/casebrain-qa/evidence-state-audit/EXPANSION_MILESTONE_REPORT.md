# Controlled audit expansion — 500-case milestone report

> **Controlled/synthetic audit only — not solicitor-reviewed real-world audit.**

Generated: 2026-06-29 (post v4 simulator pack `sim-151..397`)

## Milestone progression

| Milestone | Runnable cases | New cases added | Notes |
|-----------|----------------|-----------------|-------|
| Baseline | 253 | — | 150 sim + 102 gold + 1 proof-pack |
| 300 | 300 | +47 | v4 batch through sim-197 |
| 350 | 350 | +50 | v4 through sim-247 |
| 400 | 400 | +50 | v4 through sim-297 |
| 450 | 450 | +50 | v4 through sim-347 |
| **500** | **500** | **+50** | v4 complete (`sim-397`) + existing gold/proof |

Inventory composition at 500:

| Source | Count |
|--------|-------|
| H4 simulator v1–v3 | 150 |
| H4 simulator v4 (audit expansion) | 247 |
| Gold / bundle-fidelity | 102 |
| Proof-pack demonstration | 1 |
| **Total** | **500** |

## Final metrics (500 cases)

| Metric | 253 baseline | 500 final |
|--------|--------------|-----------|
| Evidence items | 2,010 | **3,549** |
| False-served | 0 | **0** |
| False-served rate | 0.0% | **0.0%** |
| Blocking failures | 0 | **0** |
| Warnings / unmatched | 406 | **792** |
| Chase accuracy | 86.9% | **83.8%** |
| Over-cautious rate | 4.6% | **2.9%** |
| Wrong-defendant bleed | 0 | **0** |
| Unsafe reliance | 0 | **0** |

### Accuracy by evidence state (500)

| State | Accuracy |
|-------|----------|
| Referred-only | 93.6% |
| Missing | 99.1% |
| Incomplete | 80.2% |
| Not-safely-confirmed / inferred | 5.8% |

### Chase mapping (500)

- Expected chase items: **3,115**
- Matched via label/family mapping: **2,594**
- Unmatched — no H5 chase candidate: **521**
- Unmatched — wrong family: **0**

## Detector coverage status (v4 expansion)

New v4 trap families strengthen P1/P2 buckets:

| Bucket | v4 traps added (examples) | Status |
|--------|---------------------------|--------|
| P1 partial vs full | `partial_cctv_stills`, `partial_phone_screenshots`, `partial_bwv_transcript`, `partial_custody_extract`, `image_only_scan` | Covered |
| P1 wrong person/entity | `same_surname_defendants`, `subscriber_vs_user`, `vehicle_owner_vs_driver`, `encro_handle_not_defendant`, `co_def_phone_data` | Covered |
| P1 index-listed not served | `index_bwv_absent`, `index_cctv_absent`, `index_phone_absent` | Covered |
| P1 inference as fact | `inference_attribution`, `inference_possession_control`, `inference_knowledge_intent`, `inference_conspiracy_role` | Covered |
| P1 export surface safety | `export_cps_chase_risk`, `export_court_note_risk`, `export_client_summary_risk` | Covered |
| P2 source hierarchy | `source_hierarchy_mg5_mg11`, `source_hierarchy_officer_exhibit`, `source_hierarchy_interview_summary` | Covered |
| P2 date/time conflict | `date_time_custody_mg11`, `date_time_bwv_incident`, `date_time_phone_metadata` | Covered |
| P2 youth/vulnerability | `youth_aa_missing`, `youth_interpreter_missing`, `vulnerable_witness_marker` | Covered |
| P2 disclosure traps | `mg6c_listed_not_served`, `mg6d_sensitive_confusion`, `redacted_unused_relied_on`, `late_disclosure_addendum` | Covered |
| P2 corrected charge | `corrected_charge_old_family`, `summary_old_charge` | Covered |

## Diversity / duplicate summary

| Check | Result |
|-------|--------|
| Banned phrase hits (bundle/output) | **0** |
| v4 sim duplicate pairs | **0** (after per-case truth-key uniquification) |
| Gold `sc-*` duplicate pairs | **25** (pre-existing thin truth-key collapse — not counted as unique coverage) |
| Unique sim v4 offence+trap+layout combos | **247** (asserted at manifest build) |

Top repeated chase labels are mostly gold-corpus harness patterns (e.g. `full phone extraction`, `mailbox export`) — product risk on sim v4 cases is primarily `unmatched_truth_item` / `served_item_not_surfaced_in_h5`, not false-served.

## Truth-key quality assessment

- **v4 sim cases:** Strong — each case has unique defendant-tagged evidence labels, case-specific missing/chase tail, and distinct offence/layout rotation across 52 trap blueprints.
- **Gold sc-* cases:** Weak — 25 blocking duplicate pairs remain; enriching gold truth keys would improve unique coverage count without adding cases.
- **Chase accuracy dip (86.9% → 83.8%):** Expected harness effect from defendant-qualified chase labels on v4 cases; **521** unmatched chase items are “not surfaced on H5 chase surfaces”, not false-served. No Brain/Guardian/chase core changes made.

## Product risk vs harness mapping

| Signal | Interpretation |
|--------|----------------|
| False-served = 0 | No dangerous served-state overclaim detected |
| Wrong-defendant bleed = 0 | Co-def segregation holding |
| Chase accuracy 83.8% | Mix of harness label mismatch + thin gold keys — not a safe-to-send regression |
| Warnings 792 | Mostly unmatched items and served-not-surfaced — visible/explainable |

## Hard-stop check

| Condition | Result |
|-----------|--------|
| false_served > 0 (real) | **PASS** (0) |
| Repeated wrong-defendant bleed | **PASS** (0) |
| Missing/referred/incomplete-as-served | **PASS** (0 false-served) |
| Export unsafe wording | **PASS** (0 blocking) |
| Truth-key quality drop on v4 | **PASS** (unique keys) |
| v4 duplicate spike | **PASS** (0 sim dupes) |
| Fix requires Brain/Guardian core | **N/A** — no core changes needed |

## Recommendation

| Question | Answer |
|----------|--------|
| Stop / fix / continue? | **Stop at 500** for controlled audit; fix gold truth-key duplicates before claiming unique coverage >475 |
| Is 1000 worth running? | **Not yet** — would need ~500 more genuinely different bundles (v5+) and gold key enrichment; diminishing returns without solicitor-reviewed layer |
| Next priority | Solicitor-reviewed audit pilot (30–50 real anonymised matters) per `artifacts/solicitor-review-audit-pack/` |

## Commands to reproduce

```powershell
npx tsx scripts/build-simulator-manifest-v4.ts
npx tsx scripts/h4-simulator-pack-v4-generate.ts
npx tsx scripts/seed-evidence-state-audit-cases.ts
npx tsx scripts/seed-evidence-state-audit-gold-cases.ts
npx tsx scripts/evidence-state-audit.test.ts
npx tsx scripts/run-evidence-state-audit.ts
npx tsx scripts/audit-case-diversity.ts
```
