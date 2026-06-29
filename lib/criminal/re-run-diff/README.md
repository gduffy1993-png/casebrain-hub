# H5 Re-run Diff

Review-only “what changed?” layer on Overview. Compares current H5 outputs to a **localStorage baseline** per case (`casebrain:rerunDiff:v1:{caseId}`).

## Comparison scope

- Evidence existence states (from Five Answers / chase)
- Chase items outstanding vs resolved
- Matter confidence / sendability labels
- Risk warnings and contradictions (labels only)
- Export pack version stamp (`exportId`, `generatedAt`, `bundleVersionLabel`)

## Not in this slice

- No DB migration (optional `evidence_change_snapshots` is separate NECD flow)
- No automatic baseline update or export mutation
- No Brain / Guardian / classification changes

## Persistence note

True server-side processed-version history is **not** stored yet. Solicitor saves baseline via “Save version baseline” after review. Planned: hook baseline on upload completion / processed version id.
