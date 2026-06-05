# New Evidence Change Detector (slice 1)

**Status:** Local snapshot compare — what changed on papers, not prediction or legal advice.

**Flags:** `?reasoningV2=1` **and** `?evidenceChanges=1`. `localStorage: casebrain:evidenceChanges=true`.

**Stored locally:** `casebrain:evidenceChanges:snapshot:{caseId}` — sanitized labels/metadata only.

**Not stored:** bundle text, evidence text, PDF/artifact paths, client papers, compare output bodies.

**Slice 2 (planned):** auto-snapshot on upload event hook, supervisor queue feed, auditor probe — see master plan §9.6.2.
