# Multi-case Supervisor Queue (slice 1)

**Status:** Read-only queue — safe metadata from existing persistence tables.

**Route:** `/supervisor-queue`

**API:** `GET /api/criminal/supervisor-queue?filter=…`

**Flags:** Visible when `?supervisor=1` or `?persistence=1` (localStorage mirrors apply).

**Not stored:** no new table; no bundle/evidence/export bodies.

**Not in slice 1:** sign-off actions in queue, multi-org views, eval/dev tooling.
