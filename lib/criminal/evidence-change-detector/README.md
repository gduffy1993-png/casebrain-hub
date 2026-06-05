# New Evidence Change Detector

**Slice 1:** Local snapshot compare — what changed on papers, not prediction or legal advice.

**Slice 2 (shipped):** Upload/text-change-aware source metadata — detects when document count, combined text length, snippet count, or matter update marker changes and prompts compare before relying.

**Flags:** `?reasoningV2=1` **and** `?evidenceChanges=1`. `localStorage: casebrain:evidenceChanges=true`.

**Stored locally:** `casebrain:evidenceChanges:snapshot:{caseId}` — sanitized labels/metadata only.

**Snapshot includes (safe metadata only):**
- Route, readiness, missing material, contradictions, disclosure chase, client instructions, do-not-concede, War Room hearing line
- **Slice 2:** `sourceState` — documentCount, combinedTextLength, sourceSnippetCount, bundleAvailabilityReason, matterUpdatedMarker

**Not stored:** bundle text, evidence text, PDF/artifact paths, file names, client papers, proof IDs, compare output bodies.

**Not in slice 2:** DB persistence, upload backend rewrite, auto-overwrite without user action, supervisor multi-case queue.

**Future:** Production upload hook integration, supervisor queue feed — see master plan §9.6.2.
