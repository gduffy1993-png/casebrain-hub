# Stage-20 detector remediation — old vs new

| | Old | New |
|---|---:|---:|
| Run | maa-20-2026-07-29T01-17-19-470Z | maa-20-2026-07-29T02-06-10-674Z |
| Findings | 781 | 799 |
| pass | 607 | 629 |
| defect | 31 | 6 |
| unresolved | 106 | 127 |
| not_exercised | 37 | 37 |
| containment | 0 | 0 |

## Counts

| Metric | Value |
|---|---:|
| genuine-candidate defects | **6** |
| detector-FP (of prior 31) | **25** |
| unresolved | 127 |
| FP denominator | **31** (Codex-reviewed prior defects) |
| explicit FP rate | **25/31 = 80.6%** |

## Retained-ID verdict changes (exact findingId)

- **None** — defect remediation changes the `code` segment inside findingId (`state_mismatch` → `candidate_pending_source` / `state_domain_equivalent`), so cleared FPs and candidates appear as removed+added IDs rather than same-ID flips.

## Semantic prior-defect dispositions (Codex 31)

- CASE-01 / MAA-EVIDENCE-STATE: **genuine_candidate** — Retained as candidate_pending_source (`MAA-EVIDENCE-STATE-state_mismatch-CASE-01-truth_map-fabcca1bab8f` → `MAA-EVIDENCE-STATE-candidate_pending_source-CASE-01-truth_map-fabcca1bab8f`)
- CASE-01 / MAA-CROSS-EXIT: **detector_fp_now_pass** — Unit-bound filter / honest sibling — no longer defect (`MAA-CROSS-EXIT-served_state_contradicted-CASE-01-copy-6f13ee0a91cd` → `MAA-CROSS-EXIT-no_cross_exit_hit-CASE-01-packet-b863a925371f`)
- CASE-02 / MAA-EVIDENCE-STATE: **genuine_candidate** — Retained as candidate_pending_source (`MAA-EVIDENCE-STATE-state_mismatch-CASE-02-truth_map-596b41fa5f48` → `MAA-EVIDENCE-STATE-candidate_pending_source-CASE-02-truth_map-596b41fa5f48`)
- CASE-02 / MAA-CROSS-EXIT: **detector_fp_now_pass** — Unit-bound filter / honest sibling — no longer defect (`MAA-CROSS-EXIT-served_state_contradicted-CASE-02-copy-2c84a5dcf002` → `MAA-CROSS-EXIT-no_cross_exit_hit-CASE-02-packet-b863a925371f`)
- CASE-02 / MAA-CROSS-SURFACE: **detector_fp_now_pass** — Now pass (distinct_unit_chase_allowed) (`MAA-CROSS-SURFACE-served_item_chased-CASE-02-disclosure_chase-0e99216b364b` → `MAA-CROSS-SURFACE-distinct_unit_chase_allowed-CASE-02-disclosure_chase-0e99216b364b`)
- CASE-03 / MAA-EVIDENCE-STATE: **genuine_candidate** — Retained as candidate_pending_source (`MAA-EVIDENCE-STATE-state_mismatch-CASE-03-truth_map-596b41fa5f48` → `MAA-EVIDENCE-STATE-candidate_pending_source-CASE-03-truth_map-596b41fa5f48`)
- CASE-03 / MAA-CROSS-EXIT: **detector_fp_now_pass** — Unit-bound filter / honest sibling — no longer defect (`MAA-CROSS-EXIT-served_state_contradicted-CASE-03-copy-2c84a5dcf002` → `MAA-CROSS-EXIT-no_cross_exit_hit-CASE-03-packet-b863a925371f`)
- CASE-03 / MAA-CROSS-SURFACE: **detector_fp_now_pass** — Now pass (distinct_unit_chase_allowed) (`MAA-CROSS-SURFACE-served_item_chased-CASE-03-disclosure_chase-0e99216b364b` → `MAA-CROSS-SURFACE-distinct_unit_chase_allowed-CASE-03-disclosure_chase-0e99216b364b`)
- CASE-07 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-07-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-07-truth_map-998b72c6657a`)
- CASE-07 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-07-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-07-truth_map-f933adb40907`)
- CASE-08 / MAA-EVIDENCE-STATE: **genuine_candidate** — Retained as candidate_pending_source (`MAA-EVIDENCE-STATE-state_mismatch-CASE-08-truth_map-7b7fe09d4a8a` → `MAA-EVIDENCE-STATE-candidate_pending_source-CASE-08-truth_map-7b7fe09d4a8a`)
- CASE-08 / MAA-EVIDENCE-STATE: **genuine_candidate** — Retained as candidate_pending_source (`MAA-EVIDENCE-STATE-state_mismatch-CASE-08-truth_map-d34843a648b5` → `MAA-EVIDENCE-STATE-candidate_pending_source-CASE-08-truth_map-d34843a648b5`)
- CASE-08 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-08-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-08-truth_map-998b72c6657a`)
- CASE-08 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-08-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-08-truth_map-f933adb40907`)
- CASE-09 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-09-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-09-truth_map-998b72c6657a`)
- CASE-09 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-09-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-09-truth_map-f933adb40907`)
- CASE-10 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-10-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-10-truth_map-998b72c6657a`)
- CASE-10 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-10-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-10-truth_map-f933adb40907`)
- CASE-11 / MAA-CROSS-EXIT: **detector_fp_now_pass** — Unit-bound filter / honest sibling — no longer defect (`MAA-CROSS-EXIT-served_state_contradicted-CASE-11-copy-988808303ca1` → `MAA-CROSS-EXIT-no_cross_exit_hit-CASE-11-packet-b863a925371f`)
- CASE-12 / MAA-EVIDENCE-STATE: **genuine_candidate** — Retained as candidate_pending_source (`MAA-EVIDENCE-STATE-state_mismatch-CASE-12-truth_map-fabcca1bab8f` → `MAA-EVIDENCE-STATE-candidate_pending_source-CASE-12-truth_map-fabcca1bab8f`)
- CASE-12 / MAA-CROSS-EXIT: **detector_fp_now_pass** — Unit-bound filter / honest sibling — no longer defect (`MAA-CROSS-EXIT-served_state_contradicted-CASE-12-copy-5e44a3358967` → `MAA-CROSS-EXIT-no_cross_exit_hit-CASE-12-packet-b863a925371f`)
- CASE-13 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-13-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-13-truth_map-998b72c6657a`)
- CASE-13 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-13-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-13-truth_map-f933adb40907`)
- CASE-16 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-16-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-16-truth_map-998b72c6657a`)
- CASE-16 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-16-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-16-truth_map-f933adb40907`)
- CASE-17 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-17-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-17-truth_map-998b72c6657a`)
- CASE-17 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-17-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-17-truth_map-f933adb40907`)
- CASE-18 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-18-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-18-truth_map-998b72c6657a`)
- CASE-18 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-18-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-18-truth_map-f933adb40907`)
- CASE-19 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-19-truth_map-998b72c6657a` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-19-truth_map-998b72c6657a`)
- CASE-19 / MAA-EVIDENCE-STATE: **detector_fp_now_pass** — Now pass (state_domain_equivalent) (`MAA-EVIDENCE-STATE-state_mismatch-CASE-19-truth_map-f933adb40907` → `MAA-EVIDENCE-STATE-state_domain_equivalent-CASE-19-truth_map-f933adb40907`)

## Added / removed ID explanation

- **Added (83):** New passes for state_domain_equivalent, honest_sibling_served_missing, distinct_unit_chase_allowed, incomplete_disclaimer_*; candidate_pending_source IDs replace state_mismatch for the six retained candidates (code embedded in findingId).
  - By code: {"candidate_pending_source":6,"incomplete_disclaimer_complete":19,"no_cross_exit_hit":5,"missing_not_chased":22,"distinct_unit_chase_allowed":13,"state_domain_equivalent":18}
- **Removed (65):** Removed detector-FP defect IDs (domain mismatch, naive cross-exit, broad-token chase) and IDs that churned because code changed from state_mismatch → candidate_pending_source or state_domain_equivalent.

## Genuine candidates retained (pending source)

- **CASE-01**: Candidate defect pending source confirmation: draft complainant MG11 served vs expected incomplete. Actual raw="served" (display="served"); expected="incomplete
- **CASE-02**: Candidate defect pending source confirmation: custody extract served vs expected incomplete. Actual raw="served" (display="served"); expected="incomplete".
- **CASE-03**: Candidate defect pending source confirmation: custody extract served vs expected incomplete. Actual raw="served" (display="served"); expected="incomplete".
- **CASE-08**: Candidate defect pending source confirmation: corrected charge sheet missing vs expected served. Actual raw="missing" (display="missing"); expected="served".
- **CASE-08**: Candidate defect pending source confirmation: updated MG5 missing vs expected served. Actual raw="missing" (display="missing"); expected="served".
- **CASE-12**: Candidate defect pending source confirmation: draft complainant MG11 served vs expected incomplete. Actual raw="served" (display="served"); expected="incomplete

## Known-FN register disposition

- `FN-INCOMPLETE-DISCLAIMER`: **open**, `reviewed=false`, `reviewer=null`
- Contracts: complete pass · mid-truncation defect · absent defect · non-copyable containment separate
- `knownSafetyCriticalFn` remains **null** (unknown) — **no invented human reviewer or legal sign-off**

## Do not

commit / push / merge / deploy / claim programme PASS / start stage 50+
