# Stage-50 evidence-state triage

**Status:** STOP — uncommitted for Codex review
**Run:** `maa-50-2026-07-29T18-48-49-771Z`
**Frozen membership hash:** `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832` (verified)
**Findings triaged:** 93

## Disposition counts (occurrence findings)

| Disposition | Count |
|---|---:|
| confirmed_app_defect | 43 |
| detector_false_positive | 22 |
| unresolved_source | 21 |
| truth_key_defect | 7 |

## Unit counts (kept separate)

| Unit | Count |
|---|---:|
| Occurrence findings | 93 |
| Unique strings | 76 |
| Templates | 76 |
| Cases | 44 |

## Root-cause families

### F01_mg6_referred_not_served_as_missing — 26 occurrence(s)

Dispositions: {"confirmed_app_defect":26} · Cases: sim-120, sim-250, sim-345, sim-104, sim-373, sim-321, sim-182, sim-142, sim-063, sim-038, sim-138, sim-387, sim-128, sim-329, sim-198, sim-337, sim-366, sim-286, sim-199, sim-354, sim-145, sim-271, sim-389

### F03_outstanding_alone_vs_referred_only — 21 occurrence(s)

Dispositions: {"unresolved_source":20,"detector_false_positive":1} · Cases: sc-0002d, sc-00025, sc-0006a, sc-0002e

### F02_referred_only_label_as_incomplete — 15 occurrence(s)

Dispositions: {"confirmed_app_defect":15} · Cases: sim-377, sim-224, sim-222, sim-190, sim-055, sim-172, sim-048, sim-073, sim-265, sim-072, sim-332, sim-336, sim-257, sim-395, sim-360

### F05_unit_conflation_aggregate_or_meta_row — 11 occurrence(s)

Dispositions: {"detector_false_positive":11} · Cases: sc-0002d, sc-00025, sim-055, sim-063, sim-073, sim-332, sim-329, sim-257, sc-0006a

### F04_partial_incomplete_vs_served — 7 occurrence(s)

Dispositions: {"truth_key_defect":7} · Cases: sc-0002d, sc-00025, sc-0006a, sc-0002e

### F07_recording_transcript_or_unknown_identity — 5 occurrence(s)

Dispositions: {"unresolved_source":1,"detector_false_positive":4} · Cases: sim-055, sim-073, sim-072, sim-145

### F06_mg6_clarification_vs_mg6_document — 4 occurrence(s)

Dispositions: {"detector_false_positive":4} · Cases: sc-0002d, sc-0006a, sc-0002e, sim-024

### F08_co_defendant_only_more_precise — 2 occurrence(s)

Dispositions: {"detector_false_positive":2} · Cases: sim-245, sim-389

### F10_other_edge — 1 occurrence(s)

Dispositions: {"confirmed_app_defect":1} · Cases: sim-104

### F09_truth_expects_served_source_partial_or_absent — 1 occurrence(s)

Dispositions: {"confirmed_app_defect":1} · Cases: sim-138

## Per-finding triage

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-47e3fc02fd54

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `Full CCTV master footage — outstanding` ↔ truth `Full CCTV master footage` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Full CCTV master footage — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Full CCTV master footage → referred_only`
- **supporting source excerpt:** "losure chase (outstanding on export) - Full CCTV master footage — outstanding - CCTV continuity / export log — outstanding - ID procedure material — outstanding - 999 / CAD timing material — outstanding - 999 summary without audio recording —"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-d29b8110de4b

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `CCTV continuity / export log — outstanding` ↔ truth `CCTV continuity / export log` (sameUnitVersion=true)
- **CaseBrain wording/state:** `CCTV continuity / export log — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `CCTV continuity / export log → referred_only`
- **supporting source excerpt:** "ull CCTV master footage — outstanding - CCTV continuity / export log — outstanding - ID procedure material — outstanding - 999 / CAD timing material — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-2043a759b85c

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `ID procedure material — outstanding` ↔ truth `ID procedure material` (sameUnitVersion=true)
- **CaseBrain wording/state:** `ID procedure material — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `ID procedure material → referred_only`
- **supporting source excerpt:** "continuity / export log — outstanding - ID procedure material — outstanding - 999 / CAD timing material — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant interviewed under caution — no comment"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-7a829dc32cab

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `999 / CAD timing material — outstanding` ↔ truth `999 / CAD timing material` (sameUnitVersion=true)
- **CaseBrain wording/state:** `999 / CAD timing material — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `999 / CAD timing material → referred_only`
- **supporting source excerpt:** "- ID procedure material — outstanding - 999 / CAD timing material — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: CONTRA"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-c8f3e39c3e33

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `999 summary without audio recording — outstanding` ↔ truth `999 summary without audio recording` (sameUnitVersion=true)
- **CaseBrain wording/state:** `999 summary without audio recording — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `999 summary without audio recording → referred_only`
- **supporting source excerpt:** "9 / CAD timing material — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: CONTRADICTIONS === # Contradictions on served papers (Fic"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-e30b96d9a0ed

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `*Source section:** Charge sheet / MG5 / witness material` ↔ truth `charge sheet` (sameUnitVersion=false)
- **CaseBrain wording/state:** `*Source section:** Charge sheet / MG5 / witness material · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `charge sheet → served`
- **supporting source excerpt:** "** conflicting — unresolved on papers **Source section:** Charge sheet / MG5 / witness material **Source basis:** Particulars date: 14 March 2024 (charge sheet) conflicts with MG5 narrative: evening of 15 March 2024 **Source A (Charge sheet particulars):** Par"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Contradiction meta-row / source-section citation was fuzzy-matched to a different evidence unit (e.g. charge sheet or MG5 narrative). Actual and expected do not refer to the same evidence unit.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-d3d1cbc2f835

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `MG6 / unused schedule clarification` ↔ truth `mg6` (sameUnitVersion=false)
- **CaseBrain wording/state:** `MG6 / unused schedule clarification · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `mg6 → served`
- **supporting source excerpt:** "ort 3. **MG5** — partial on export 4. **MG6** — served on export 5. **MG11 officer** — partial on export ## Disclosure chase (outstanding on export) - Full CCTV master footage — outstanding - CCTV continuity / export log"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F06_mg6_clarification_vs_mg6_document
- **disposition:** **detector_false_positive**
- **reason:** Truth expects the MG6 schedule document as served, but the detector compared against the chase row 'MG6 / unused schedule clarification' — different evidence units.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-a21728817d67

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `5. **MG11 officer** — partial on export` ↔ truth `mg11 officer` (sameUnitVersion=true)
- **CaseBrain wording/state:** `5. **MG11 officer** — partial on export · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 officer → served`
- **supporting source excerpt:** "port 4. **MG6** — served on export 5. **MG11 officer** — partial on export ## Disclosure chase (outstanding on export) - Full CCTV master footage — outstanding - CCTV continuity / export log — outstanding - ID procedure material — outstanding - 999 / CA"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002d-truth_map-e288055ba799

- **caseId:** sc-0002d
- **evidence-unit identity:** CB `6. MG11 witness (partial)` ↔ truth `mg11 witness` (sameUnitVersion=true)
- **CaseBrain wording/state:** `6. MG11 witness (partial) · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 witness → served`
- **supporting source excerpt:** "MG6 (served) 5. MG11 officer (partial) 6. MG11 witness (partial) 7. Full CCTV master footage (outstanding) 8. CCTV continuity / export log (outstanding) 9. ID procedure material (outstanding) 10. 999 / CAD timing material (outstanding)"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002d/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sim-120-truth_map-11586a2d88bb

- **caseId:** sim-120
- **evidence-unit identity:** CB `MG6C/FUL — full lab report — referred on MG6 — export not served.` ↔ truth `full lab report` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/FUL — full lab report — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `full lab report → referred_only`
- **supporting source excerpt:** "rotated lab summary — served on bundle. MG6C/FUL — full lab report — referred on MG6 — export not served. MG6C/LAB — lab report — outstanding — not on bundle. MG6C/BLO — blood procedure — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT/WITNESS STATEMENT Witnes"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-120/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-250-truth_map-7d7ef59ef631

- **caseId:** sim-250
- **evidence-unit identity:** CB `MG6C/CAL — calibration certificate — Wade Cleft — referred on MG6 — export not served.` ↔ truth `calibration certificate — Wade Cleft` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/CAL — calibration certificate — Wade Cleft — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `calibration certificate — Wade Cleft → referred_only`
- **supporting source excerpt:** "(folio 250 — Cleft) — served on bundle. MG6C/CAL — calibration certificate — Wade Cleft — referred on MG6 — export not served. MG6C/CAL — calibration — Wade Cleft — outstanding — not on bundle. MG6C/DEV — device record — Wade Cleft — outstanding — not on bundle. MG6C/PUB — public order clip segregation (C"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-250/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-345-truth_map-d0341edd2e12

- **caseId:** sim-345
- **evidence-unit identity:** CB `MG6C/DIG — digital export — Ozzy Vail — referred on MG6 — export not served.` ↔ truth `digital export — Ozzy Vail` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/DIG — digital export — Ozzy Vail — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `digital export — Ozzy Vail → referred_only`
- **supporting source excerpt:** "(folio 345 — Vail) — served on bundle. MG6C/DIG — digital export — Ozzy Vail — referred on MG6 — export not served. MG6C/HAN — handset download — Ozzy Vail — outstanding — not on bundle. MG6C/ATT — attribution — Ozzy Vail — outstanding — not on bundle. MG6C/DIS — disclosure officer certificatio"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-345/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-78bc4b000259

- **caseId:** sc-00025
- **evidence-unit identity:** CB `Full bank export / source statements — outstanding` ↔ truth `Full bank export / source statements` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Full bank export / source statements — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Full bank export / source statements → referred_only`
- **supporting source excerpt:** "losure chase (outstanding on export) - Full bank export / source statements — outstanding - Device / login audit material — outstanding - Mailbox export — outstanding - MG6 schedule incomplete — outstanding - Custody / PACE material limited on export — ou"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-9dffe859a684

- **caseId:** sc-00025
- **evidence-unit identity:** CB `Device / login audit material — outstanding` ↔ truth `Device / login audit material` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Device / login audit material — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Device / login audit material → referred_only`
- **supporting source excerpt:** "ort / source statements — outstanding - Device / login audit material — outstanding - Mailbox export — outstanding - MG6 schedule incomplete — outstanding - Custody / PACE material limited on export — outstanding ## Defendant account Defendant int"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-a01278cea7c6

- **caseId:** sc-00025
- **evidence-unit identity:** CB `Mailbox export — outstanding` ↔ truth `Mailbox export` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Mailbox export — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Mailbox export → referred_only`
- **supporting source excerpt:** "/ login audit material — outstanding - Mailbox export — outstanding - MG6 schedule incomplete — outstanding - Custody / PACE material limited on export — outstanding ## Defendant account Defendant interviewed under caution — no com"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-95f380e7efc1

- **caseId:** sc-00025
- **evidence-unit identity:** CB `MG6 schedule incomplete — outstanding` ↔ truth `MG6 schedule incomplete` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6 schedule incomplete — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `MG6 schedule incomplete → referred_only`
- **supporting source excerpt:** "anding - Mailbox export — outstanding - MG6 schedule incomplete — outstanding - Custody / PACE material limited on export — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION:"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-6a1d17104678

- **caseId:** sc-00025
- **evidence-unit identity:** CB `Custody / PACE material limited on export — outstanding` ↔ truth `Custody / PACE material limited on export` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Custody / PACE material limited on export — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Custody / PACE material limited on export → referred_only`
- **supporting source excerpt:** "MG6 schedule incomplete — outstanding - Custody / PACE material limited on export — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: CONTRADICTIONS === # Contradictions on served papers (Fic"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-fccd721a5a4c

- **caseId:** sc-00025
- **evidence-unit identity:** CB `*Source B (Officer MG11):** MG5 narrative: evening of 15 March 2024` ↔ truth `MG5 narrative` (sameUnitVersion=false)
- **CaseBrain wording/state:** `*Source B (Officer MG11):** MG5 narrative: evening of 15 March 2024 · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `MG5 narrative → referred_only`
- **supporting source excerpt:** "rs date: 14 March 2024 (charge sheet) **Source B (Officer MG11):** MG5 narrative: evening of 15 March 2024 === SECTION: MG6 === # MG6 — partial schedule (Fictional) | Item | Status | Notes | |------|--------|-------| | Full bank export / source statements O"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Contradiction meta-row / source-section citation was fuzzy-matched to a different evidence unit (e.g. charge sheet or MG5 narrative). Actual and expected do not refer to the same evidence unit.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-e30b96d9a0ed

- **caseId:** sc-00025
- **evidence-unit identity:** CB `*Source section:** Charge sheet / MG5 / witness material` ↔ truth `charge sheet` (sameUnitVersion=false)
- **CaseBrain wording/state:** `*Source section:** Charge sheet / MG5 / witness material · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `charge sheet → served`
- **supporting source excerpt:** "** conflicting — unresolved on papers **Source section:** Charge sheet / MG5 / witness material **Source basis:** Particulars date: 14 March 2024 (charge sheet) conflicts with MG5 narrative: evening of 15 March 2024 **Source A (Partial CAD extract):** Particul"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Contradiction meta-row / source-section citation was fuzzy-matched to a different evidence unit (e.g. charge sheet or MG5 narrative). Actual and expected do not refer to the same evidence unit.

### MAA-EVIDENCE-STATE-state_mismatch-sc-00025-truth_map-a21728817d67

- **caseId:** sc-00025
- **evidence-unit identity:** CB `5. **MG11 officer** — partial on export` ↔ truth `mg11 officer` (sameUnitVersion=true)
- **CaseBrain wording/state:** `5. **MG11 officer** — partial on export · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 officer → served`
- **supporting source excerpt:** "ort 4. **MG6** — partial on export 5. **MG11 officer** — partial on export ## Disclosure chase (outstanding on export) - Full bank export / source statements — outstanding - Device / login audit material — outstanding - Mailbox export — outstanding - MG"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-00025/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sim-104-truth_map-8061a6796568

- **caseId:** sim-104
- **evidence-unit identity:** CB `MG6C/ABE — ABE — referred on MG6 — export not served.` ↔ truth `ABE` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/ABE — ABE — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `ABE → referred_only`
- **supporting source excerpt:** "related fraud index — served on bundle. MG6C/ABE — ABE — referred on MG6 — export not served. MG6C/ABE — ABE — outstanding — not on bundle. MG6C/MED — medical — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT (not served — first account outstanding)"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-104/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-104-truth_map-3b0fe9ad645d

- **caseId:** sim-104
- **evidence-unit identity:** CB `Medical / expert source report` ↔ truth `medical` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Medical / expert source report · referred_only · weak` (raw=referred_only)
- **truth-key expectation:** `medical → missing`
- **supporting source excerpt:** "outstanding — not on bundle. MG6C/MED — medical — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT (not served — first account outstanding) Historic context noted — do not treat summary as served stateme"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-104/bundle-text.md`
- **family:** F10_other_edge
- **disposition:** **confirmed_app_defect**
- **reason:** Source marks the unit outstanding — not on bundle (supports missing). CaseBrain recorded referred_only without source referred/listed language. Outstanding alone must not become referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-373-truth_map-62a10105f91a

- **caseId:** sim-373
- **evidence-unit identity:** CB `MG6C/FUL — full unused material — Ria Yew — referred on MG6 — export not served.` ↔ truth `full unused material — Ria Yew` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/FUL — full unused material — Ria Yew — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `full unused material — Ria Yew → referred_only`
- **supporting source excerpt:** "e (folio 373 — Yew) — served on bundle. MG6C/FUL — full unused material — Ria Yew — referred on MG6 — export not served. MG6C/UNR — unredacted unused — Ria Yew — outstanding — not on bundle. MG6C/PRI — primary witness account — Ria Yew — outstanding — not on bundle. MG6C/APP — appropriate adult sign"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-373/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-377-truth_map-291e8ae5b385

- **caseId:** sim-377
- **evidence-unit identity:** CB `Referred only: BWV per index — Vim Calder.` ↔ truth `BWV per index — Vim Calder` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: BWV per index — Vim Calder. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `BWV per index — Vim Calder → referred_only`
- **supporting source excerpt:** "Calder) — served on bundle. MG6C/BWV — BWV per index — Vim Calder — referred on MG6 — export not served. MG6C/BWV — BWV file — Vim Calder — outstanding — not on bundle. MG6C/CON — continuity — Vim Calder — outstanding — not on bundle. MG6C/SEA —"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-377/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-321-truth_map-51f52c928876

- **caseId:** sim-321
- **evidence-unit identity:** CB `MG6C/FUL — full unused material — Quenby Xanthe — referred on MG6 — export not served.` ↔ truth `full unused material — Quenby Xanthe` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/FUL — full unused material — Quenby Xanthe — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `full unused material — Quenby Xanthe → referred_only`
- **supporting source excerpt:** "folio 321 — Xanthe) — served on bundle. MG6C/FUL — full unused material — Quenby Xanthe — referred on MG6 — export not served. MG6C/UNR — unredacted unused — Quenby Xanthe — outstanding — not on bundle. MG6C/PRI — primary witness account — Quenby Xanthe — outstanding — not on bundle. MG6C/CEL — cellsite r"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-321/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-182-truth_map-8e3e8a83db8a

- **caseId:** sim-182
- **evidence-unit identity:** CB `MG6C/HAN — handset download — Forrest Loom — referred on MG6 — export not served.` ↔ truth `handset download — Forrest Loom` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/HAN — handset download — Forrest Loom — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `handset download — Forrest Loom → referred_only`
- **supporting source excerpt:** "(folio 182 — Loom) — served on bundle. MG6C/HAN — handset download — Forrest Loom — referred on MG6 — export not served. MG6C/SUB — subscriber data — Forrest Loom — outstanding — not on bundle. MG6C/MES — message export — Forrest Loom — outstanding — not on bundle. MG6C/DEF — defendant interview par"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-182/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-224-truth_map-840e7f13872e

- **caseId:** sim-224
- **evidence-unit identity:** CB `Referred only: master CCTV timeline — Wynn Calder.` ↔ truth `master CCTV timeline — Wynn Calder` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: master CCTV timeline — Wynn Calder. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `master CCTV timeline — Wynn Calder → referred_only`
- **supporting source excerpt:** "Calder) — served on bundle. MG6C/MAS — master CCTV timeline — Wynn Calder — referred on MG6 — export not served. MG6C/MAS — master footage — Wynn Calder — outstanding — not on bundle. MG6C/CON — continuity — Wynn Calder — outstanding — not on bundle. MG"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-224/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-222-truth_map-338bc97ffe54

- **caseId:** sim-222
- **evidence-unit identity:** CB `Referred only: CCTV CE/01 — Ulric Ash.` ↔ truth `CCTV CE/01 — Ulric Ash` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: CCTV CE/01 — Ulric Ash. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `CCTV CE/01 — Ulric Ash → referred_only`
- **supporting source excerpt:** "2 — Ash) — served on bundle. MG6C/CCT — CCTV CE/01 — Ulric Ash — referred on MG6 — export not served. MG6C/CCT — CCTV export — Ulric Ash — outstanding — not on bundle. MG6C/CON — continuity — Ulric Ash — outstanding — not on bundle. MG6C/LAT"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-222/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-190-truth_map-eba365a1c20d

- **caseId:** sim-190
- **evidence-unit identity:** CB `Referred only: BWV addendum — Nico Tarn.` ↔ truth `BWV addendum — Nico Tarn` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: BWV addendum — Nico Tarn. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `BWV addendum — Nico Tarn → referred_only`
- **supporting source excerpt:** "— Tarn) — served on bundle. MG6C/BWV — BWV addendum — Nico Tarn — referred on MG6 — export not served. MG6C/BWV — BWV export — Nico Tarn — outstanding — not on bundle. MG6C/PRI — prior missing MG11 — Nico Tarn — outstanding — not on bundle. MG"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-190/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-142-truth_map-2c5122f9a790

- **caseId:** sim-142
- **evidence-unit identity:** CB `MG6C/EMA — email export — referred on MG6 — export not served.` ↔ truth `email export` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/EMA — email export — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `email export → referred_only`
- **supporting source excerpt:** "raud-style exhibits — served on bundle. MG6C/EMA — email export — referred on MG6 — export not served. MG6C/CHR — chronology — outstanding — not on bundle. MG6C/INT — intent evidence — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT/WITNESS STATEMENT Witnes"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-142/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-055-truth_map-6837ee55474b

- **caseId:** sim-055
- **evidence-unit identity:** CB `Served material | 5+ | MG5; officer MG11; custody summary extract` ↔ truth `MG5` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Served material | 5+ | MG5; officer MG11; custody summary extract · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `MG5 → served`
- **supporting source excerpt:** "ument | Pages | Note Charge sheet | 1 | MG5 case summary | 2-3 | MG6C disclosure schedule | 4 | Served material | 5+ | MG5; officer MG11; custody summary extract === SECTION: CHARGE === R v Noah Venn Statement of Offence"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-055/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Aggregate 'Served material | …' summary row was matched to a single truth-key evidence item. Different units conflated; incomplete on an aggregate is not a unit-level served defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-055-truth_map-bdc2eb65e76a

- **caseId:** sim-055
- **evidence-unit identity:** CB `Body-worn video (BWV)` ↔ truth `BWV` (sameUnitVersion=uncertain)
- **CaseBrain wording/state:** `Body-worn video (BWV) · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `BWV → referred_only`
- **supporting source excerpt:** "es' Court Simulator trap: referred_only_bwv_as_served Layout: custody_extract_with_referred_media === SECTION: COVER_INDEX === INDEX Document | Pages | Note Charge sheet | 1 | MG5 case summary | 2-3 | MG6C disclosure sch"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-055/bundle-text.md`
- **family:** F07_recording_transcript_or_unknown_identity
- **disposition:** **unresolved_source**
- **reason:** Source has both a referred-on-MG6 line and an outstanding-not-on-bundle line for similarly named material; CaseBrain unknown cannot be confirmed as a same-version defect without tighter unit binding.

### MAA-EVIDENCE-STATE-state_mismatch-sim-055-truth_map-be3c721fbe1b

- **caseId:** sim-055
- **evidence-unit identity:** CB `Referred only: BWV; full custody record; PACE interview recording.` ↔ truth `full custody record` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: BWV; full custody record; PACE interview recording. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `full custody record → referred_only`
- **supporting source excerpt:** "on MG6 — export not served. MG6C/FUL — full custody record — referred on MG6 — export not served. MG6C/PAC — PACE interview recording — referred on MG6 — export not served. MG6C/BWV — BWV export — outstanding — not on bundle. MG6C/FUL — f"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-055/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-055-truth_map-157cc0935d67

- **caseId:** sim-055
- **evidence-unit identity:** CB `Interview recording / transcript` ↔ truth `interview recording` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Interview recording / transcript · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `interview recording → missing`
- **supporting source excerpt:** "G6 — export not served. MG6C/PAC — PACE interview recording — referred on MG6 — export not served. MG6C/BWV — BWV export — outstanding — not on bundle. MG6C/FUL — full custody record — outstanding — not on bundle. MG6C/RIS — risk"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-055/bundle-text.md`
- **family:** F07_recording_transcript_or_unknown_identity
- **disposition:** **detector_false_positive**
- **reason:** CaseBrain row conflates recording and transcript as one label with unknown state. Recording ≠ transcript; detector compared a blended identity to a single truth-key unit.

### MAA-EVIDENCE-STATE-state_mismatch-sim-172-truth_map-e135e03c17ed

- **caseId:** sim-172
- **evidence-unit identity:** CB `Referred only: master CCTV timeline — Vance Birch.` ↔ truth `master CCTV timeline — Vance Birch` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: master CCTV timeline — Vance Birch. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `master CCTV timeline — Vance Birch → referred_only`
- **supporting source excerpt:** "— Birch) — served on bundle. MG6C/MAS — master CCTV timeline — Vance Birch — referred on MG6 — export not served. MG6C/MAS — master footage — Vance Birch — outstanding — not on bundle. MG6C/CON — continuity — Vance Birch — outstanding — not on bundle. MG"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-172/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-048-truth_map-54dc6ac97320

- **caseId:** sim-048
- **evidence-unit identity:** CB `Referred only: ABE interview; first complaint record; school/social records.` ↔ truth `ABE interview` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: ABE interview; first complaint record; school/social records. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `ABE interview → referred_only`
- **supporting source excerpt:** "ge sheet — served on bundle. MG6C/ABE — ABE interview — referred on MG6 — export not served. MG6C/FIR — first complaint record — referred on MG6 — export not served. MG6C/SCH — school/social records — referred on MG6 — export not ser"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-048/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-063-truth_map-a7f5dc239de8

- **caseId:** sim-063
- **evidence-unit identity:** CB `Served material | 5+ | MG5; DWP summary; interview summary` ↔ truth `MG5` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Served material | 5+ | MG5; DWP summary; interview summary · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `MG5 → served`
- **supporting source excerpt:** "ument | Pages | Note Charge sheet | 1 | MG5 case summary | 2-3 | MG6C disclosure schedule | 4 | Served material | 5+ | MG5; DWP summary; interview summary === SECTION: CHARGE === R v Hannah Crewe Statement of Offence: Di"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-063/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Aggregate 'Served material | …' summary row was matched to a single truth-key evidence item. Different units conflated; incomplete on an aggregate is not a unit-level served defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-063-truth_map-602364eac3a1

- **caseId:** sim-063
- **evidence-unit identity:** CB `MG6C/BEN — benefit claim records — referred on MG6 — export not served.` ↔ truth `benefit claim records` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/BEN — benefit claim records — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `benefit claim records → referred_only`
- **supporting source excerpt:** "— interview summary — served on bundle. MG6C/BEN — benefit claim records — referred on MG6 — export not served. MG6C/NOT — notification logs — referred on MG6 — export not served. MG6C/OVE — overpayment calculation — referred on MG6 — export not served. MG6C/FUL — full claim history — outst"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-063/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-063-truth_map-d5495e3018d9

- **caseId:** sim-063
- **evidence-unit identity:** CB `MG6C/NOT — notification logs — referred on MG6 — export not served.` ↔ truth `notification logs` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/NOT — notification logs — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `notification logs → referred_only`
- **supporting source excerpt:** "— referred on MG6 — export not served. MG6C/NOT — notification logs — referred on MG6 — export not served. MG6C/OVE — overpayment calculation — referred on MG6 — export not served. MG6C/FUL — full claim history — outstanding — not on bundle. MG6C/NOT — notification logs — outstanding —"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-063/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-063-truth_map-bd1a940b72d5

- **caseId:** sim-063
- **evidence-unit identity:** CB `MG6C/OVE — overpayment calculation — referred on MG6 — export not served.` ↔ truth `overpayment calculation` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/OVE — overpayment calculation — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `overpayment calculation → referred_only`
- **supporting source excerpt:** "— referred on MG6 — export not served. MG6C/OVE — overpayment calculation — referred on MG6 — export not served. MG6C/FUL — full claim history — outstanding — not on bundle. MG6C/NOT — notification logs — outstanding — not on bundle. MG6C/OVE — overpayment calculation — outstanding — not on"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-063/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-038-truth_map-6bc3406f3753

- **caseId:** sim-038
- **evidence-unit identity:** CB `MG6C/FUL — full extraction report — referred on MG6 — export not served.` ↔ truth `full extraction report` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/FUL — full extraction report — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `full extraction report → referred_only`
- **supporting source excerpt:** "officer statements — served on bundle. MG6C/FUL — full extraction report — referred on MG6 — export not served. MG6C/HAN — handle attribution report — referred on MG6 — export not served. MG6C/CO- — co-defendant chat export — referred on MG6 — export not served. MG6C/DEV — device attributio"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-038/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-038-truth_map-ceec74273f8c

- **caseId:** sim-038
- **evidence-unit identity:** CB `MG6C/HAN — handle attribution report — referred on MG6 — export not served.` ↔ truth `handle attribution report` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/HAN — handle attribution report — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `handle attribution report → referred_only`
- **supporting source excerpt:** "— referred on MG6 — export not served. MG6C/HAN — handle attribution report — referred on MG6 — export not served. MG6C/CO- — co-defendant chat export — referred on MG6 — export not served. MG6C/DEV — device attribution evidence — outstanding — not on bundle. MG6C/DOW — download continuity — o"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-038/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-073-truth_map-2b412d6035bd

- **caseId:** sim-073
- **evidence-unit identity:** CB `Served material | 5+ | MG5; youth court charge sheet; short interview summary` ↔ truth `MG5` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Served material | 5+ | MG5; youth court charge sheet; short interview summary · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `MG5 → served`
- **supporting source excerpt:** "ument | Pages | Note Charge sheet | 1 | MG5 case summary | 2-3 | MG6C disclosure schedule | 4 | Served material | 5+ | MG5; youth court charge sheet; short interview summary === SECTION: CHARGE === R v Mason Reeve Statem"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-073/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Aggregate 'Served material | …' summary row was matched to a single truth-key evidence item. Different units conflated; incomplete on an aggregate is not a unit-level served defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-073-truth_map-79ed8d7ea32d

- **caseId:** sim-073
- **evidence-unit identity:** CB `Referred only: full custody record; appropriate adult notes; mental health triage; interview recording.` ↔ truth `full custody record` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: full custody record; appropriate adult notes; mental health triage; interview recording. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `full custody record → referred_only`
- **supporting source excerpt:** "summary — served on bundle. MG6C/FUL — full custody record — referred on MG6 — export not served. MG6C/APP — appropriate adult notes — referred on MG6 — export not served. MG6C/MEN — mental health triage — referred on MG6 — export not ser"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-073/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-073-truth_map-157cc0935d67

- **caseId:** sim-073
- **evidence-unit identity:** CB `Interview recording / transcript` ↔ truth `interview recording` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Interview recording / transcript · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `interview recording → referred_only`
- **supporting source excerpt:** "| MG5; youth court charge sheet; short interview summary === SECTION: CHARGE === R v Mason Reeve Statement of Offence: Robbery Particulars of Offence: Between 1 January 2026 and 28 February 2026 at Middenton Youth Court — pa"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-073/bundle-text.md`
- **family:** F07_recording_transcript_or_unknown_identity
- **disposition:** **detector_false_positive**
- **reason:** CaseBrain row conflates recording and transcript as one label with unknown state. Recording ≠ transcript; detector compared a blended identity to a single truth-key unit.

### MAA-EVIDENCE-STATE-state_mismatch-sim-138-truth_map-bd976983d644

- **caseId:** sim-138
- **evidence-unit identity:** CB `amended indictment` ↔ truth `amended indictment` (sameUnitVersion=true)
- **CaseBrain wording/state:** `amended indictment · missing · needs_review` (raw=missing)
- **truth-key expectation:** `amended indictment → served`
- **supporting source excerpt:** "e schedule | 4 | Served material | 5+ | amended indictment; conflicting listing notices === SECTION: CHARGE === R v Liv Finch Statement of Offence: Offence per amended indictment Particulars of Offence: Between 1 January 2026 and 28 F"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-138/bundle-text.md`
- **family:** F09_truth_expects_served_source_partial_or_absent
- **disposition:** **confirmed_app_defect**
- **reason:** Source indicates amended indictment is served, but CaseBrain marks missing.

### MAA-EVIDENCE-STATE-state_mismatch-sim-138-truth_map-39350a182d53

- **caseId:** sim-138
- **evidence-unit identity:** CB `MG6C/COU — court listing — referred on MG6 — export not served.` ↔ truth `court listing` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/COU — court listing — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `court listing → referred_only`
- **supporting source excerpt:** "ing listing notices — served on bundle. MG6C/COU — court listing — referred on MG6 — export not served. MG6C/CON — confirmed listing — outstanding — not on bundle. MG6C/COU — count linkage — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT/WITNESS STATEMENT W"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-138/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-265-truth_map-52fce672ab4a

- **caseId:** sim-265
- **evidence-unit identity:** CB `Referred only: ABE interview — Lysander Rill.` ↔ truth `ABE interview — Lysander Rill` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: ABE interview — Lysander Rill. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `ABE interview — Lysander Rill → referred_only`
- **supporting source excerpt:** "— Rill) — served on bundle. MG6C/ABE — ABE interview — Lysander Rill — referred on MG6 — export not served. MG6C/ABE — ABE recording — Lysander Rill — outstanding — not on bundle. MG6C/SPE — special measures application — Lysander Rill — outstandin"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-265/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-072-truth_map-8104b6f618f0

- **caseId:** sim-072
- **evidence-unit identity:** CB `Referred only: Home Office status check; document expert report; interview recording.` ↔ truth `Home Office status check` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: Home Office status check; document expert report; interview recording. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `Home Office status check → referred_only`
- **supporting source excerpt:** "ent copy — served on bundle. MG6C/HOM — Home Office status check — referred on MG6 — export not served. MG6C/DOC — document expert report — referred on MG6 — export not served. MG6C/INT — interview recording — referred on MG6 — export not serve"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-072/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-072-truth_map-157cc0935d67

- **caseId:** sim-072
- **evidence-unit identity:** CB `Interview recording / transcript` ↔ truth `interview recording` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Interview recording / transcript · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `interview recording → referred_only`
- **supporting source excerpt:** "on MG6 — export not served. MG6C/INT — interview recording — referred on MG6 — export not served. MG6C/EXP — expert report — outstanding — not on bundle. MG6C/STA — status check — outstanding — not on bundle. MG6C/INT — intervie"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-072/bundle-text.md`
- **family:** F07_recording_transcript_or_unknown_identity
- **disposition:** **detector_false_positive**
- **reason:** CaseBrain row conflates recording and transcript as one label with unknown state. Recording ≠ transcript; detector compared a blended identity to a single truth-key unit.

### MAA-EVIDENCE-STATE-state_mismatch-sim-387-truth_map-646cbe215156

- **caseId:** sim-387
- **evidence-unit identity:** CB `MG6C/HAN — handset download — Fay Moss — referred on MG6 — export not served.` ↔ truth `handset download — Fay Moss` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/HAN — handset download — Fay Moss — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `handset download — Fay Moss → referred_only`
- **supporting source excerpt:** "(folio 387 — Moss) — served on bundle. MG6C/HAN — handset download — Fay Moss — referred on MG6 — export not served. MG6C/USA — usage attribution — Fay Moss — outstanding — not on bundle. MG6C/HAN — handset download — Fay Moss — outstanding — not on bundle. MG6C/BAN — banking schedule annex B (M"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-387/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-128-truth_map-4d952a0b1ae1

- **caseId:** sim-128
- **evidence-unit identity:** CB `MG6C/BAN — bank data — referred on MG6 — export not served.` ↔ truth `bank data` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/BAN — bank data — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `bank data → referred_only`
- **supporting source excerpt:** "ant account summary — served on bundle. MG6C/BAN — bank data — referred on MG6 — export not served. MG6C/PER — per-defendant map — outstanding — not on bundle. MG6C/FUL — full bank export — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT/WITNESS STATEMENT"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-128/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-332-truth_map-c6e94f994cb3

- **caseId:** sim-332
- **evidence-unit identity:** CB `Served material | 5+ | interview summary (folio 332 — Irks); MG5 supplementary note (folio 332 — Irks)` ↔ truth `interview summary (folio 332 — Irks)` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Served material | 5+ | interview summary (folio 332 — Irks); MG5 supplementary note (folio 332 — Irks) · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `interview summary (folio 332 — Irks) → served`
- **supporting source excerpt:** "e schedule | 4 | Served material | 5+ | interview summary (folio 332 — Irks); MG5 supplementary note (folio 332 — Irks) === SECTION: CHARGE === R v Boden Irks Statement of Offence: Robbery Particulars of Offence: Between 1 January 2026 and 28 February"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-332/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Aggregate 'Served material | …' summary row was matched to a single truth-key evidence item. Different units conflated; incomplete on an aggregate is not a unit-level served defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-332-truth_map-79e3b3b52bbe

- **caseId:** sim-332
- **evidence-unit identity:** CB `Referred only: interview recording — Boden Irks.` ↔ truth `interview recording — Boden Irks` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: interview recording — Boden Irks. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `interview recording — Boden Irks → referred_only`
- **supporting source excerpt:** "— Irks) — served on bundle. MG6C/INT — interview recording — Boden Irks — referred on MG6 — export not served. MG6C/REC — recording — Boden Irks — outstanding — not on bundle. MG6C/TRA — transcript — Boden Irks — outstanding — not on bundle. MG6C/VEH"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-332/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-329-truth_map-e673be6d31bc

- **caseId:** sim-329
- **evidence-unit identity:** CB `Served material | 5+ | handset screenshots (folio 329 — Fjell); MG5 supplementary note (folio 329 — Fjell)` ↔ truth `handset screenshots (folio 329 — Fjell)` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Served material | 5+ | handset screenshots (folio 329 — Fjell); MG5 supplementary note (folio 329 — Fjell) · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `handset screenshots (folio 329 — Fjell) → served`
- **supporting source excerpt:** "e schedule | 4 | Served material | 5+ | handset screenshots (folio 329 — Fjell); MG5 supplementary note (folio 329 — Fjell) === SECTION: CHARGE === R v Yvette Fjell Statement of Offence: Possession with intent to supply Class A drugs Particulars of Offenc"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-329/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Aggregate 'Served material | …' summary row was matched to a single truth-key evidence item. Different units conflated; incomplete on an aggregate is not a unit-level served defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-329-truth_map-d1aece2ea119

- **caseId:** sim-329
- **evidence-unit identity:** CB `MG6C/UFE — UFED extraction — Yvette Fjell — referred on MG6 — export not served.` ↔ truth `UFED extraction — Yvette Fjell` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/UFE — UFED extraction — Yvette Fjell — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `UFED extraction — Yvette Fjell → referred_only`
- **supporting source excerpt:** "(folio 329 — Fjell) — served on bundle. MG6C/UFE — UFED extraction — Yvette Fjell — referred on MG6 — export not served. MG6C/FUL — full download — Yvette Fjell — outstanding — not on bundle. MG6C/SEA — search terms schedule — Yvette Fjell — outstanding — not on bundle. MG6C/UNU — unused material se"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-329/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-198-truth_map-5ef9a3eff6ee

- **caseId:** sim-198
- **evidence-unit identity:** CB `MG6C/CAL — calibration certificate — Wyatt Brine — referred on MG6 — export not served.` ↔ truth `calibration certificate — Wyatt Brine` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/CAL — calibration certificate — Wyatt Brine — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `calibration certificate — Wyatt Brine → referred_only`
- **supporting source excerpt:** "(folio 198 — Brine) — served on bundle. MG6C/CAL — calibration certificate — Wyatt Brine — referred on MG6 — export not served. MG6C/CAL — calibration — Wyatt Brine — outstanding — not on bundle. MG6C/DEV — device record — Wyatt Brine — outstanding — not on bundle. MG6C/MOT — motoring calibration trace (Br"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-198/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-337-truth_map-98cb117423c7

- **caseId:** sim-337
- **evidence-unit identity:** CB `MG6C/PLA — platform extraction — Gwen Noll — referred on MG6 — export not served.` ↔ truth `platform extraction — Gwen Noll` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/PLA — platform extraction — Gwen Noll — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `platform extraction — Gwen Noll → referred_only`
- **supporting source excerpt:** "(folio 337 — Noll) — served on bundle. MG6C/PLA — platform extraction — Gwen Noll — referred on MG6 — export not served. MG6C/HAN — handle mapping certificate — Gwen Noll — outstanding — not on bundle. MG6C/CON — continuity — Gwen Noll — outstanding — not on bundle. MG6C/BRE — breath procedure MGDDB"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-337/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-366-truth_map-ed34b5ecb304

- **caseId:** sim-366
- **evidence-unit identity:** CB `MG6C/ORI — original MG5 — Jade Quench — referred on MG6 — export not served.` ↔ truth `original MG5 — Jade Quench` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/ORI — original MG5 — Jade Quench — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `original MG5 — Jade Quench → referred_only`
- **supporting source excerpt:** "folio 366 — Quench) — served on bundle. MG6C/ORI — original MG5 — Jade Quench — referred on MG6 — export not served. MG6C/CHA — charge sheet clarity — Jade Quench — outstanding — not on bundle. MG6C/OFF — offence date particulars — Jade Quench — outstanding — not on bundle. MG6C/IMA — image-only"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-366/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-336-truth_map-2ec7e6ee8e9c

- **caseId:** sim-336
- **evidence-unit identity:** CB `Referred only: ANPR/CCTV — Fintan Mire.` ↔ truth `ANPR/CCTV — Fintan Mire` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: ANPR/CCTV — Fintan Mire. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `ANPR/CCTV — Fintan Mire → referred_only`
- **supporting source excerpt:** "— Mire) — served on bundle. MG6C/ANP — ANPR/CCTV — Fintan Mire — referred on MG6 — export not served. MG6C/DRI — driver identification — Fintan Mire — outstanding — not on bundle. MG6C/INS — insurance policy — Fintan Mire — outstanding — not"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-336/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-286-truth_map-0625ee459062

- **caseId:** sim-286
- **evidence-unit identity:** CB `MG6C/HAN — handset download — Hattie Onyx — referred on MG6 — export not served.` ↔ truth `handset download — Hattie Onyx` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/HAN — handset download — Hattie Onyx — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `handset download — Hattie Onyx → referred_only`
- **supporting source excerpt:** "(folio 286 — Onyx) — served on bundle. MG6C/HAN — handset download — Hattie Onyx — referred on MG6 — export not served. MG6C/SUB — subscriber data — Hattie Onyx — outstanding — not on bundle. MG6C/MES — message export — Hattie Onyx — outstanding — not on bundle. MG6C/NRM — NRM referral outcome lett"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-286/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-199-truth_map-adf452765859

- **caseId:** sim-199
- **evidence-unit identity:** CB `MG6C/BAN — bank download — Xyla Coven — referred on MG6 — export not served.` ↔ truth `bank download — Xyla Coven` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/BAN — bank download — Xyla Coven — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `bank download — Xyla Coven → referred_only`
- **supporting source excerpt:** "(folio 199 — Coven) — served on bundle. MG6C/BAN — bank download — Xyla Coven — referred on MG6 — export not served. MG6C/BAN — bank export — Xyla Coven — outstanding — not on bundle. MG6C/DEV — device/ownership proof — Xyla Coven — outstanding — not on bundle. MG6C/PER — perverting course email"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-199/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-354-truth_map-c7e884f17d22

- **caseId:** sim-354
- **evidence-unit identity:** CB `MG6C/CAL — calibration certificate — Xia Evers — referred on MG6 — export not served.` ↔ truth `calibration certificate — Xia Evers` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/CAL — calibration certificate — Xia Evers — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `calibration certificate — Xia Evers → referred_only`
- **supporting source excerpt:** "(folio 354 — Evers) — served on bundle. MG6C/CAL — calibration certificate — Xia Evers — referred on MG6 — export not served. MG6C/CAL — calibration — Xia Evers — outstanding — not on bundle. MG6C/DEV — device record — Xia Evers — outstanding — not on bundle. MG6C/ROB — robbery ID parade notes (Evers / f"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-354/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-145-truth_map-04ef5376552d

- **caseId:** sim-145
- **evidence-unit identity:** CB `MG6C/BWV — BWV full export — referred on MG6 — export not served.` ↔ truth `BWV full export` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/BWV — BWV full export — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `BWV full export → referred_only`
- **supporting source excerpt:** "dy extract fragment — served on bundle. MG6C/BWV — BWV full export — referred on MG6 — export not served. MG6C/BWV — BWV download — outstanding — not on bundle. MG6C/FUL — full custody — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT/WITNESS STATEMENT Witness"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-145/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-145-truth_map-d9b6f4b6dac1

- **caseId:** sim-145
- **evidence-unit identity:** CB `Full custody record / PACE material` ↔ truth `full custody` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Full custody record / PACE material · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `full custody → missing`
- **supporting source excerpt:** "e schedule | 4 | Served material | 5+ | custody extract fragment === SECTION: CHARGE === R v Theo Yu Statement of Offence: Assault on emergency worker Particulars of Offence: Between 1 January 2026 and 28 February 2026 at N"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-145/bundle-text.md`
- **family:** F07_recording_transcript_or_unknown_identity
- **disposition:** **detector_false_positive**
- **reason:** CaseBrain blends 'Full custody record / PACE material' into one row. That is not a proven same-unit/version binding to the truth-key 'full custody' item alone.

### MAA-EVIDENCE-STATE-state_mismatch-sim-257-truth_map-73e57feaf516

- **caseId:** sim-257
- **evidence-unit identity:** CB `Served material | 5+ | prosecution interview summary (folio 257 — Jest); MG5 supplementary note (folio 257 — Jest)` ↔ truth `prosecution interview summary (folio 257 — Jest)` (sameUnitVersion=false)
- **CaseBrain wording/state:** `Served material | 5+ | prosecution interview summary (folio 257 — Jest); MG5 supplementary note (folio 257 — Jest) · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `prosecution interview summary (folio 257 — Jest) → served`
- **supporting source excerpt:** "e schedule | 4 | Served material | 5+ | prosecution interview summary (folio 257 — Jest); MG5 supplementary note (folio 257 — Jest) === SECTION: CHARGE === R v Dorian Jest Statement of Offence: Drive motor vehicle with excess alcohol Particulars of Offence: Betwee"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-257/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Aggregate 'Served material | …' summary row was matched to a single truth-key evidence item. Different units conflated; incomplete on an aggregate is not a unit-level served defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-257-truth_map-17056effcc38

- **caseId:** sim-257
- **evidence-unit identity:** CB `Referred only: interview recording — Dorian Jest.` ↔ truth `interview recording — Dorian Jest` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: interview recording — Dorian Jest. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `interview recording — Dorian Jest → referred_only`
- **supporting source excerpt:** "— Jest) — served on bundle. MG6C/INT — interview recording — Dorian Jest — referred on MG6 — export not served. MG6C/INT — interview recording — Dorian Jest — outstanding — not on bundle. MG6C/TRA — transcript — Dorian Jest — outstanding — not on bundl"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-257/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-245-truth_map-1220c57ef865

- **caseId:** sim-245
- **evidence-unit identity:** CB `MG6C/CO — co-defendant-only — co-defendant download — Rhea Xenon — not this defendant — referred on MG6 — export not served.` ↔ truth `co-defendant download — Rhea Xenon` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/CO — co-defendant-only — co-defendant download — Rhea Xenon — not this defendant — referred on MG6 — export not served. · other_defendant_only · needs_review` (raw=other_defendant_only)
- **truth-key expectation:** `co-defendant download — Rhea Xenon → referred_only`
- **supporting source excerpt:** "(folio 245 — Xenon) — served on bundle. MG6C/CO- — co-defendant download — Rhea Xenon — referred on MG6 — export not served. MG6C/PER — per-defendant segregation — Rhea Xenon — outstanding — not on bundle. MG6C/ATT — attribution map — Rhea Xenon — outstanding — not on bundle. MG6C/YOU — youth court safeguarding plan (Xenon / folio 245) — outs"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-245/bundle-text.md`
- **family:** F08_co_defendant_only_more_precise
- **disposition:** **detector_false_positive**
- **reason:** CaseBrain records other_defendant_only, which is more precise than collapsing to referred_only/missing. Source marks not-this-defendant; detector treated a precision state as a defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-395-truth_map-88ce6f6c851d

- **caseId:** sim-395
- **evidence-unit identity:** CB `Referred only: CCTV — Ned Ulric; BWV — Ned Ulric.` ↔ truth `CCTV — Ned Ulric` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: CCTV — Ned Ulric; BWV — Ned Ulric. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `CCTV — Ned Ulric → referred_only`
- **supporting source excerpt:** "— Ulric) — served on bundle. MG6C/CCT — CCTV — Ned Ulric — referred on MG6 — export not served. MG6C/BWV — BWV — Ned Ulric — referred on MG6 — export not served. MG6C/CCT — CCTV export — Ned Ulric — outstanding — not on bundle. MG6C/BWV"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-395/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sim-271-truth_map-3b323453d735

- **caseId:** sim-271
- **evidence-unit identity:** CB `MG6C/ORI — original MG5 — Soren Yule — referred on MG6 — export not served.` ↔ truth `original MG5 — Soren Yule` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/ORI — original MG5 — Soren Yule — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `original MG5 — Soren Yule → referred_only`
- **supporting source excerpt:** "(folio 271 — Yule) — served on bundle. MG6C/ORI — original MG5 — Soren Yule — referred on MG6 — export not served. MG6C/COU — count linkage schedule — Soren Yule — outstanding — not on bundle. MG6C/AME — amended particulars — Soren Yule — outstanding — not on bundle. MG6C/MED — medical imaging"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-271/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-389-truth_map-069de7858b03

- **caseId:** sim-389
- **evidence-unit identity:** CB `MG6C/PLA — platform extraction — Hux Oaken — referred on MG6 — export not served.` ↔ truth `platform extraction — Hux Oaken` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/PLA — platform extraction — Hux Oaken — referred on MG6 — export not served. · missing · needs_review` (raw=missing)
- **truth-key expectation:** `platform extraction — Hux Oaken → referred_only`
- **supporting source excerpt:** "(folio 389 — Oaken) — served on bundle. MG6C/PLA — platform extraction — Hux Oaken — referred on MG6 — export not served. MG6C/HAN — handle mapping certificate — Hux Oaken — outstanding — not on bundle. MG6C/CON — continuity — Hux Oaken — outstanding — not on bundle. MG6C/CO- — co-defendant segregati"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-389/bundle-text.md`
- **family:** F01_mg6_referred_not_served_as_missing
- **disposition:** **confirmed_app_defect**
- **reason:** Source/CaseBrain label explicitly says referred on MG6 and export not served, which supports referred_only. CaseBrain existence is missing — same unit/version compared.

### MAA-EVIDENCE-STATE-state_mismatch-sim-389-truth_map-49a5e3981406

- **caseId:** sim-389
- **evidence-unit identity:** CB `MG6C/CO — co-defendant-only — co-defendant segregation map (Oaken / folio 389) — not this defendant — outstanding — not on bundle.` ↔ truth `co-defendant segregation map (Oaken / folio 389)` (sameUnitVersion=true)
- **CaseBrain wording/state:** `MG6C/CO — co-defendant-only — co-defendant segregation map (Oaken / folio 389) — not this defendant — outstanding — not on bundle. · other_defendant_only · needs_review` (raw=other_defendant_only)
- **truth-key expectation:** `co-defendant segregation map (Oaken / folio 389) → missing`
- **supporting source excerpt:** "ux Oaken — outstanding — not on bundle. MG6C/CON — continuity — Hux Oaken — outstanding — not on bundle. MG6C/CO- — co-defendant segregation map (Oaken / folio 389) — outstanding — not on bundle. === SECTION: MG11 === MG11 — COMPLAINANT/WITNESS STATEMENT Witness account on file — attribution and context require review. === SECTION: CASE_NOTE =="
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-389/bundle-text.md`
- **family:** F08_co_defendant_only_more_precise
- **disposition:** **detector_false_positive**
- **reason:** CaseBrain records other_defendant_only, which is more precise than collapsing to referred_only/missing. Source marks not-this-defendant; detector treated a precision state as a defect.

### MAA-EVIDENCE-STATE-state_mismatch-sim-360-truth_map-696aa8e3616a

- **caseId:** sim-360
- **evidence-unit identity:** CB `Referred only: exhibit continuity log — Demi Kest.` ↔ truth `exhibit continuity log — Demi Kest` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Referred only: exhibit continuity log — Demi Kest. · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `exhibit continuity log — Demi Kest → referred_only`
- **supporting source excerpt:** "— Kest) — served on bundle. MG6C/EXH — exhibit continuity log — Demi Kest — referred on MG6 — export not served. MG6C/CON — continuity log — Demi Kest — outstanding — not on bundle. MG6C/SEI — seizure photographs — Demi Kest — outstanding — not on bundl"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-360/bundle-text.md`
- **family:** F02_referred_only_label_as_incomplete
- **disposition:** **confirmed_app_defect**
- **reason:** CaseBrain wording itself says 'Referred only' and source supports referred/not-served, but existence state is incomplete instead of referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-9ec190bb882c

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `CCTV export and continuity — outstanding` ↔ truth `CCTV export and continuity` (sameUnitVersion=true)
- **CaseBrain wording/state:** `CCTV export and continuity — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `CCTV export and continuity → referred_only`
- **supporting source excerpt:** "losure chase (outstanding on export) - CCTV export and continuity — outstanding - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — outstanding - 999 summary without audio recording — outstanding ## Defendan"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-97ea0d131514

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `Full 999/CAD — outstanding` ↔ truth `Full 999/CAD` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Full 999/CAD — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Full 999/CAD → referred_only`
- **supporting source excerpt:** "V export and continuity — outstanding - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant intervie"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-0efe66f30804

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `Body worn video — outstanding` ↔ truth `Body worn video` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Body worn video — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Body worn video → referred_only`
- **supporting source excerpt:** "standing - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant interviewed under caution — no comment."
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-1fbeece45902

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `Medical / expert report — outstanding` ↔ truth `Medical / expert report` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Medical / expert report — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Medical / expert report → referred_only`
- **supporting source excerpt:** "nding - Body worn video — outstanding - Medical / expert report — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: CONTRA"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-c8f3e39c3e33

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `999 summary without audio recording — outstanding` ↔ truth `999 summary without audio recording` (sameUnitVersion=true)
- **CaseBrain wording/state:** `999 summary without audio recording — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `999 summary without audio recording → referred_only`
- **supporting source excerpt:** "Medical / expert report — outstanding - 999 summary without audio recording — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: CONTRADICTIONS === # Contradictions on served papers (Fic"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-fccd721a5a4c

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `*Source B (Officer MG11):** MG5 narrative: evening of 15 March 2024` ↔ truth `MG5 narrative` (sameUnitVersion=false)
- **CaseBrain wording/state:** `*Source B (Officer MG11):** MG5 narrative: evening of 15 March 2024 · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `MG5 narrative → referred_only`
- **supporting source excerpt:** "rs date: 14 March 2024 (charge sheet) **Source B (Officer MG11):** MG5 narrative: evening of 15 March 2024 === SECTION: MG6 === # MG6 (Fictional) | Item | Status | Notes | |------|--------|-------| | CCTV export and continuity Outstanding Chase before fixin"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Contradiction meta-row / source-section citation was fuzzy-matched to a different evidence unit (e.g. charge sheet or MG5 narrative). Actual and expected do not refer to the same evidence unit.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-e30b96d9a0ed

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `*Source section:** Charge sheet / MG5 / witness material` ↔ truth `charge sheet` (sameUnitVersion=false)
- **CaseBrain wording/state:** `*Source section:** Charge sheet / MG5 / witness material · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `charge sheet → served`
- **supporting source excerpt:** "** conflicting — unresolved on papers **Source section:** Charge sheet / MG5 / witness material **Source basis:** Particulars date: 14 March 2024 (charge sheet) conflicts with MG5 narrative: evening of 15 March 2024 **Source A (Partial CAD extract):** Particul"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F05_unit_conflation_aggregate_or_meta_row
- **disposition:** **detector_false_positive**
- **reason:** Contradiction meta-row / source-section citation was fuzzy-matched to a different evidence unit (e.g. charge sheet or MG5 narrative). Actual and expected do not refer to the same evidence unit.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-d3d1cbc2f835

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `MG6 / unused schedule clarification` ↔ truth `mg6` (sameUnitVersion=false)
- **CaseBrain wording/state:** `MG6 / unused schedule clarification · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `mg6 → served`
- **supporting source excerpt:** "ort 3. **MG5** — partial on export 4. **MG6** — served on export 5. **MG11 officer** — partial on export ## Disclosure chase (outstanding on export) - CCTV export and continuity — outstanding - Full 999/CAD — outstanding"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F06_mg6_clarification_vs_mg6_document
- **disposition:** **detector_false_positive**
- **reason:** Truth expects the MG6 schedule document as served, but the detector compared against the chase row 'MG6 / unused schedule clarification' — different evidence units.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-a21728817d67

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `5. **MG11 officer** — partial on export` ↔ truth `mg11 officer` (sameUnitVersion=true)
- **CaseBrain wording/state:** `5. **MG11 officer** — partial on export · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 officer → served`
- **supporting source excerpt:** "port 4. **MG6** — served on export 5. **MG11 officer** — partial on export ## Disclosure chase (outstanding on export) - CCTV export and continuity — outstanding - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — ou"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0006a-truth_map-e288055ba799

- **caseId:** sc-0006a
- **evidence-unit identity:** CB `6. MG11 witness (partial)` ↔ truth `mg11 witness` (sameUnitVersion=true)
- **CaseBrain wording/state:** `6. MG11 witness (partial) · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 witness → served`
- **supporting source excerpt:** "MG6 (served) 5. MG11 officer (partial) 6. MG11 witness (partial) 7. Additional count sheet (served) 8. CCTV export and continuity (outstanding) 9. Full 999/CAD (outstanding) 10. Body worn video (outstanding) 11. Medical / expert report (outstan"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0006a/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-9ec190bb882c

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `CCTV export and continuity — outstanding` ↔ truth `CCTV export and continuity` (sameUnitVersion=true)
- **CaseBrain wording/state:** `CCTV export and continuity — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `CCTV export and continuity → referred_only`
- **supporting source excerpt:** "losure chase (outstanding on export) - CCTV export and continuity — outstanding - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — outstanding - CAD summary without full CAD log — outstanding - CCTV partial"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-97ea0d131514

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `Full 999/CAD — outstanding` ↔ truth `Full 999/CAD` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Full 999/CAD — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Full 999/CAD → referred_only`
- **supporting source excerpt:** "V export and continuity — outstanding - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — outstanding - CAD summary without full CAD log — outstanding - CCTV partial extract only — outstanding #"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-0efe66f30804

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `Body worn video — outstanding` ↔ truth `Body worn video` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Body worn video — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Body worn video → referred_only`
- **supporting source excerpt:** "standing - Full 999/CAD — outstanding - Body worn video — outstanding - Medical / expert report — outstanding - CAD summary without full CAD log — outstanding - CCTV partial extract only — outstanding ## Defendant account Defendant i"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-1fbeece45902

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `Medical / expert report — outstanding` ↔ truth `Medical / expert report` (sameUnitVersion=true)
- **CaseBrain wording/state:** `Medical / expert report — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `Medical / expert report → referred_only`
- **supporting source excerpt:** "nding - Body worn video — outstanding - Medical / expert report — outstanding - CAD summary without full CAD log — outstanding - CCTV partial extract only — outstanding ## Defendant account Defendant interviewed under caution — no comment. S"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-d5c7a6385417

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `CAD summary without full CAD log — outstanding` ↔ truth `CAD summary without full CAD log` (sameUnitVersion=true)
- **CaseBrain wording/state:** `CAD summary without full CAD log — outstanding · missing · needs_review` (raw=missing)
- **truth-key expectation:** `CAD summary without full CAD log → referred_only`
- **supporting source excerpt:** "Medical / expert report — outstanding - CAD summary without full CAD log — outstanding - CCTV partial extract only — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: MG6 === # MG6"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **unresolved_source**
- **reason:** Source only marks the item outstanding (chase/not on export). Outstanding alone does not prove referred/listed/served status required for referred_only. Cannot confirm CaseBrain missing/incomplete as an app defect against that expectation.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-bb0aab79736b

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `CCTV partial extract only — outstanding` ↔ truth `CCTV partial extract only` (sameUnitVersion=true)
- **CaseBrain wording/state:** `CCTV partial extract only — outstanding · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `CCTV partial extract only → referred_only`
- **supporting source excerpt:** "ry without full CAD log — outstanding - CCTV partial extract only — outstanding ## Defendant account Defendant interviewed under caution — no comment. Solicitor attended. === SECTION: MG6 === # MG6 (Fictional) | Item | Status"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F03_outstanding_alone_vs_referred_only
- **disposition:** **detector_false_positive**
- **reason:** Source describes a CCTV partial extract as outstanding/incomplete. Extract ≠ full download; incomplete is more precise than referred_only. Outstanding alone does not prove referred_only.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-a125fd6ea562

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `MG6 / unused schedule clarification` ↔ truth `mg6` (sameUnitVersion=false)
- **CaseBrain wording/state:** `MG6 / unused schedule clarification · missing · needs_review` (raw=missing)
- **truth-key expectation:** `mg6 → served`
- **supporting source excerpt:** "ort 3. **MG5** — partial on export 4. **MG6** — served on export 5. **MG11 officer** — partial on export CCTV footage is being arranged/held by OIC; MG6 lists export/continuity as outstanding or not yet served. Partial CA"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F06_mg6_clarification_vs_mg6_document
- **disposition:** **detector_false_positive**
- **reason:** Truth expects the MG6 schedule document as served, but the detector compared against the chase row 'MG6 / unused schedule clarification' — different evidence units.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-a21728817d67

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `5. **MG11 officer** — partial on export` ↔ truth `mg11 officer` (sameUnitVersion=true)
- **CaseBrain wording/state:** `5. **MG11 officer** — partial on export · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 officer → served`
- **supporting source excerpt:** "port 4. **MG6** — served on export 5. **MG11 officer** — partial on export CCTV footage is being arranged/held by OIC; MG6 lists export/continuity as outstanding or not yet served. Partial CAD extract attached — 00:24 dispatch reference; full CAD log re"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sc-0002e-truth_map-e288055ba799

- **caseId:** sc-0002e
- **evidence-unit identity:** CB `6. MG11 witness (partial)` ↔ truth `mg11 witness` (sameUnitVersion=true)
- **CaseBrain wording/state:** `6. MG11 witness (partial) · incomplete · needs_review` (raw=incomplete)
- **truth-key expectation:** `mg11 witness → served`
- **supporting source excerpt:** "MG6 (served) 5. MG11 officer (partial) 6. MG11 witness (partial) 7. CCTV export and continuity (outstanding) 8. Full 999/CAD (outstanding) 9. Body worn video (outstanding) 10. Medical / expert report (outstanding)"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sc-0002e/bundle-text.md`
- **family:** F04_partial_incomplete_vs_served
- **disposition:** **truth_key_defect**
- **reason:** Source labels the unit partial/incomplete on export. Truth key expects served. Partial extract must not be treated as fully served; CaseBrain incomplete is more precise than the truth key.

### MAA-EVIDENCE-STATE-state_mismatch-sim-024-truth_map-d3d1cbc2f835

- **caseId:** sim-024
- **evidence-unit identity:** CB `MG6 / unused schedule clarification` ↔ truth `MG6` (sameUnitVersion=false)
- **CaseBrain wording/state:** `MG6 / unused schedule clarification · unknown · needs_review` (raw=unknown)
- **truth-key expectation:** `MG6 → missing`
- **supporting source excerpt:** "gate Magistrates' Court Simulator trap: mg6_missing Layout: clean_digital === SECTION: COVER_INDEX === INDEX Document | Pages | Note Charge sheet | 1 | MG5 case summary | 2-3 | MG6C disclosure schedule | 4 | === SECTION"
- **provenance:** `artifacts/evidence-state-audit-local/cases/sim-024/bundle-text.md`
- **family:** F06_mg6_clarification_vs_mg6_document
- **disposition:** **detector_false_positive**
- **reason:** Truth expects MG6→missing, but matched row is 'MG6 / unused schedule clarification' (unknown). Unit identity is not proven same; source does not cleanly bind this clarification row to the MG6 document expectation.
