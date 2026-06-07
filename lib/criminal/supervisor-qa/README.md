# Supervisor QA View

**Status:** Per-case supervisor review panel with optional sign-off persistence behind `?persistence=1`.

**Flags:** `?reasoningV2=1` **and** `?supervisor=1`. `localStorage: casebrain:supervisor=true`.

**Sign-off persistence (slice 2):** When `?persistence=1`, the panel shows Mark reviewed / Escalate / No obvious issue actions. POST/GET `/api/criminal/[caseId]/supervisor-signoff`. On API success, mirrored to `localStorage` key `casebrain:supervisor:signoffs`. Kill switch: `casebrain:persistence:signoffs=false`.

**DB strategy:** Append-only rows in `supervisor_signoffs`. Latest per case: `ORDER BY created_at DESC LIMIT 1`.

**Not stored:** QA output bodies, bundle/evidence/client text, paths, IDs.

**Slice 3 (planned):** multi-case supervisor queue — not in this slice.

**Tests:** `npx tsx scripts/supervisor-qa-view.test.ts`, `npx tsx scripts/supervisor-signoff.test.ts`
