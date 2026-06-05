# Client Account Stress-Test (slices 1–2)

**Status:** Local only — structured account options + comparison to Reasoning V2 view model. No DB.

**Flags:** `?clientStress=1` and `?reasoningV2=1` (both required for panel). `localStorage: casebrain:clientStress=true`.

**Stored locally:** `casebrain:clientStress:selection:{caseId}` — selected options + sanitized short note only.

**Not stored:** bundle text, evidence, PDF paths, artifact paths, checklist/guard output (recomputed on run).

## Slice 1

Nine comparison sections: summary, supports, undermines, missing, conflicts, route change, do-not-overstate, solicitor review.

## Slice 2

- **Client instruction checklist** — `questionText`, `whyItMatters`, `linkedAccountOption`, `reasoningCategory`, `provisional`
- **Do-not-concede guard** — `concessionRiskLabel`, `whyNotToConcedeYet`, `sourceOrMissingBasis`, `safeWordingAlternative`, `solicitorReviewRequired`

UI: collapsible “Questions to take from client” and “Do not concede yet” (show 4, then show more).

**Slice 3+ (planned):** org-scoped persistence after schema approval; NECD; disclosure export — see master plan §9.6.2.
