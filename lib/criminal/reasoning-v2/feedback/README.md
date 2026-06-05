# Reasoning V2 — solicitor feedback (slice 1)

**Status:** Local capture only (`localStorage` key `casebrain:reasoningV2:feedback`).

**Visibility:** Only when Reasoning V2 flag is on (`?reasoningV2=1` or `localStorage: casebrain:reasoningV2=true`).

**Not stored:** bundle text, evidence text, PDF paths, artifact paths, client papers.

**Slice 2 (planned):** optional DB table + org-scoped API — schema proposal required before migration.

Dev summary: `summarizeReasoningFeedback(listReasoningFeedbackLocal())` in `reasoning-feedback-summary.ts`.
