# Stage-50 Sample Freeze — Coverage Report

- **policyVersion:** esa-stage50-sample-v1
- **adapterId:** esa-local-materialised
- **frozenAt:** 2026-07-29T18:36:43.939Z
- **sampleSize:** 50
- **populationUniqueValid:** 499
- **excludedPopulationCount:** 31
- **orderedMembershipHash:** `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832`
- **controlsExecuted:** false
- **findingsGenerated:** false
- **blindToAuditorOutcomes:** true

## Excluded population

- missing_casebrain_output: 30
- missing_bundle_text: 1

## Family coverage

| Bucket | Count |
|---|---:|
| motoring | 7 |
| drugs | 7 |
| violence | 7 |
| fraud | 5 |
| mixed_generic | 5 |
| robbery | 3 |
| sexual | 3 |
| encro_digital | 3 |
| harassment_domestic | 2 |
| youth | 2 |
| weapons | 1 |
| public_order | 1 |
| custody_pace | 1 |
| breach | 1 |
| perverting | 1 |
| other | 1 |

Buckets covered: breach, custody_pace, drugs, encro_digital, fraud, harassment_domestic, mixed_generic, motoring, other, perverting, public_order, robbery, sexual, violence, weapons, youth

## Evidence-type coverage

| Bucket | Count |
|---|---:|
| mg5 | 34 |
| unknown_only | 13 |
| digital | 10 |
| interview | 8 |
| inference | 8 |
| bwv | 5 |
| cctv | 5 |
| witness_statement | 5 |
| custody_pace | 5 |
| encro | 4 |
| other_typed | 1 |

## Evidence-state flags

- has_incomplete
- has_inferred_only
- has_missing
- has_not_safely_confirmed
- has_other_defendant_only
- has_referred_only
- has_served

## Issue / historical-class tags

- attribution
- chronology
- clip_vs_master
- document_version
- draft_vs_signed
- extract_vs_full
- fn_incomplete_disclaimer_class
- hearing
- recording_vs_transcript

## Complexity / copyability / shapes

- simple/moderate/complex: 0 / 5 / 45
- copyable / non-copyable: 50 / 50
- fiveAnswers / chase / courtNote / DNO / missing-heavy: 50 / 50 / 50 / 50 / 0

## Exit applicability

| Exit | Cases | Status |
|---|---:|---|
| view | 50 | exercisable |
| copy | 50 | exercisable |
| export | 0 | not_exercised |
| api | 0 | not_exercised |
| pdf | 0 | not_exercised |
| composed_prose | 0 | not_exercised |

## Lane exercise potential

- **evidence_state**: covered — state flags covered: has_referred_only, has_served, has_missing, has_not_safely_confirmed, has_incomplete, has_inferred_only, has_other_defendant_only
- **attribution_parties**: covered — attribution-tagged cases present
- **chronology_hearing**: covered — chronology=true hearing=true
- **document_version_identity**: covered — draft/signed/extract/full/version tags
- **completeness_disclaimer**: covered — FN-INCOMPLETE-DISCLAIMER / GOLD-11-039 class markers in output
- **cross_surface_chase**: covered — chase + fiveAnswers present
- **defence_lens_dno**: covered — doNotOverstate surfaces present
- **copyable_vs_containment**: covered — copyable=50 non_copyable=50
- **export_api_pdf_composed**: not covered — ESA format cannot exercise these exits — remain not_exercised

## Membership (ordered)

1. `sc-0002d` — strata:offence_family_bucket=robbery
2. `sim-120` — strata:offence_family_bucket=motoring
3. `sim-250` — strata:offence_family_bucket=drugs
4. `sim-345` — strata:offence_family_bucket=violence
5. `sc-00025` — strata:offence_family_bucket=fraud
6. `sim-104` — strata:offence_family_bucket=sexual
7. `sim-373` — strata:offence_family_bucket=harassment_domestic
8. `sim-377` — strata:offence_family_bucket=weapons
9. `sim-321` — strata:offence_family_bucket=youth
10. `sim-182` — strata:offence_family_bucket=public_order
11. `sim-224` — strata:offence_family_bucket=custody_pace
12. `sim-222` — strata:offence_family_bucket=breach
13. `sim-190` — strata:offence_family_bucket=encro_digital
14. `sim-142` — strata:offence_family_bucket=perverting
15. `sim-018` — strata:offence_family_bucket=mixed_generic
16. `sim-055` — strata:offence_family_bucket=other
17. `sim-172` — strata:evidence_type=encro
18. `sim-048` — strata:evidence_type=other_typed
19. `sim-063` — strata:evidence_state=incomplete
20. `sim-038` — strata:evidence_state=other_defendant_only
21. `sim-017` — strata:complexity=moderate
22. `sim-014` — strata:complexity=moderate
23. `sim-015` — strata:complexity=moderate
24. `sim-020` — strata:complexity=moderate
25. `sim-007` — strata:complexity=moderate
26. `sim-073` — fill:deterministic_selection_key
27. `sim-138` — fill:deterministic_selection_key
28. `sim-265` — fill:deterministic_selection_key
29. `sim-072` — fill:deterministic_selection_key
30. `sim-387` — fill:deterministic_selection_key
31. `sim-128` — fill:deterministic_selection_key
32. `sim-332` — fill:deterministic_selection_key
33. `sim-329` — fill:deterministic_selection_key
34. `sim-198` — fill:deterministic_selection_key
35. `sim-337` — fill:deterministic_selection_key
36. `sim-366` — fill:deterministic_selection_key
37. `sim-336` — fill:deterministic_selection_key
38. `sim-286` — fill:deterministic_selection_key
39. `sim-199` — fill:deterministic_selection_key
40. `sim-354` — fill:deterministic_selection_key
41. `sim-145` — fill:deterministic_selection_key
42. `sim-257` — fill:deterministic_selection_key
43. `sim-245` — fill:deterministic_selection_key
44. `sim-395` — fill:deterministic_selection_key
45. `sim-271` — fill:deterministic_selection_key
46. `sim-389` — fill:deterministic_selection_key
47. `sim-360` — fill:deterministic_selection_key
48. `sc-0006a` — fill:deterministic_selection_key
49. `sc-0002e` — fill:deterministic_selection_key
50. `sim-024` — fill:deterministic_selection_key

## Do not

- run stage 50 / execute controls / generate findings
- commit / push / merge / deploy / claim PASS
