# Phase 8 checkpoint — hearing and time logic

**Status:** CLOSED — human-acknowledged (`eadc2db37`) — **not a corpus PASS**  
**Canonical schema:** 1.1.0 (adds `same_day`)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)  
**Commit:** `eadc2db37f1bc6e795593aa815ca844c005bb207`

## Programme requirements covered

| Requirement | Evidence |
|-------------|----------|
| One deterministic formatter for unknown / listed / upcoming / same-day / passed / snapshot | `resolveSolicitorHearingStatus` |
| Fixed test clock + date boundaries | injectable `asOf` + `utcDayDiff` contracts |
| `as at` / snapshot marker | snapshot statusLabel + `asAtIso` |
| Tabs / copy / exports consume shared status | canonical matter state, chase deadlines, control-room / chase / war-room / matter-brief wiring |
| Phase-8-relevant date failures resolved (not waived) | limitation PI 3yr, DoK copy, severity thresholds, riskCopy ISO, Awaab `asOf` |

## Contracts

| Check | Result |
|-------|--------|
| kind_unknown | PASS — unknown |
| kind_same_day | PASS — Same-day hearing · 15 Jul 2026 |
| kind_upcoming_boundary_day_14 | PASS — kind=upcoming;diff=14 |
| kind_listed_boundary_day_15 | PASS — kind=listed;diff=15 |
| kind_passed | PASS — Hearing date passed · 14 Jul 2026 |
| kind_snapshot_as_at_marker | PASS — Frozen historical snapshot · hearing 20 Jul 2026 (as at 2026-07-15) |
| fixed_test_clock_iso | PASS — 2026-07-15 |
| canonical_hearing_uses_formatter | PASS — schema=1.1.0;kind=same_day;fp=v1.1.0:011a2adb3c3d0 |
| limitation_pi_3yr_deterministic | PASS — date=2025-01-01T00:00:00.000Z;sev=critical |
| risk_copy_iso_date_not_locale | PASS — Possible limitation deadline around 2025-12-31 (90 days remaining). This is proc |
| central_surfaces_unchanged_count | PASS — central=31 |

All contracts pass: **true**

## Before / after comparison

| Metric | Before | After |
|--------|--------|-------|
| TypeScript errors | 47 | 47 (delta 0) |
| Date-anchored Vitest (limitation/riskCopy/Awaab) | 5 failed / 18 passed | 0 failed / 22 passed |
| Branch build | green (post-attribution) | BUILD_OK |
| Phase 6 validator contracts | 31 surfaces | 31 surfaces PASS |
| Residual registered Vitest (sample) | PRE-VITEST-COPY failing | still failing (not waived) |

See `artifacts/casebrain-qa/integrity-programme/phase-8/before-after-comparison.json`.

Phase 8 introduced no additional TypeScript errors and cleared Phase-8-relevant date Vitest failures without weakening tests.

## Remediation register

- **Resolved in Phase 8:** PRE-VITEST-DATE (limitation / Awaab / riskCopy date clocks)
- **Remain registered (unchanged):** PRE-TS-EVAL, PRE-TS-SCRIPTS, PRE-VITEST-COPY, PRE-VITEST-CONFIG, PRE-BUILD-ENV, PRE-E2E

## Remaining risks

- Some UI strips still apply pilot/demo polish after the shared status line
- Unrelated pre-existing TS/Vitest items remain on the remediation register
- Full N-case corpus (Phase 9) not started

## Explicit non-goals

No merge. No deploy. No Phase 9+. No whole-programme PASS. Stop here for review.

Artefact: `artifacts/casebrain-qa/integrity-programme/phase-8/phase8-hearing-time-report.json`
