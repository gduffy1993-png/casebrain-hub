# Client Account Stress-Test (slice 1)

**Status:** Local only — structured account options + comparison to Reasoning V2 view model. No DB.

**Flags:** `?clientStress=1` and `?reasoningV2=1` (both required for panel). `localStorage: casebrain:clientStress=true`.

**Stored locally:** `casebrain:clientStress:selection:{caseId}` — selected options + sanitized short note only.

**Not stored:** bundle text, evidence, PDF paths, artifact paths, stress output bodies (recomputed on run).

**Slice 2 (planned):** optional org-scoped persistence after schema approval.
