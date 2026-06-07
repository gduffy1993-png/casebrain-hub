# New Evidence Change Detector

**Slice 1:** Local snapshot compare — what changed on papers, not prediction or legal advice.

**Slice 2 (shipped):** Upload/text-change-aware source metadata — detects when document count, combined text length, snippet count, or matter update marker changes and prompts compare before relying.

**Slice 3 (shipped):** Optional DB persistence behind `?persistence=1`. POST/GET `/api/criminal/[caseId]/evidence-change-snapshot`. On API success, mirrored to `localStorage` key `casebrain:evidenceChanges:snapshot:{caseId}`. Kill switch: `casebrain:persistence:snapshots=false`.

**Flags:** `?reasoningV2=1` **and** `?evidenceChanges=1`. `localStorage: casebrain:evidenceChanges=true`.

**Stored locally:** `casebrain:evidenceChanges:snapshot:{caseId}` — sanitized labels/metadata only.

**Snapshot includes (safe metadata only):**
- Route, readiness, missing material, contradictions, disclosure chase, client instructions, do-not-concede, War Room hearing line
- **Slice 2:** `sourceState` — documentCount, combinedTextLength, sourceSnippetCount, bundleAvailabilityReason, matterUpdatedMarker

**Not stored:** bundle text, evidence text, PDF/artifact paths, file names, client papers, proof IDs, compare output bodies.

**DB strategy:** Append-only rows in `evidence_change_snapshots`. Latest per case: `ORDER BY created_at DESC LIMIT 1`.

**Not in slice 3:** export_reviews, audit events, supervisor multi-case queue, upload backend rewrite.

**Future:** Production upload hook integration, supervisor queue feed — see master plan §9.6.2.
