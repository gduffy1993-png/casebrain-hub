# Case review audit events (slice 5)

**Status:** Append-only safe metadata audit trail behind persistence API routes.

**Table:** `case_review_audit_events`

**API:** POST/GET `/api/criminal/[caseId]/audit-events`

**Integration:** After successful DB insert on reasoning feedback, supervisor sign-off, evidence snapshot, and export review routes — audit write is fire-and-forget; primary action never fails if audit insert fails.

**Kill switch:** `localStorage: casebrain:persistence:audit=false` (client-side; server audit follows persistence API usage).

**Not stored:** bundle text, evidence text, export bodies, paths, proof IDs, raw notes.

**Not in slice 5:** multi-case supervisor queue, full activity feed UI.
