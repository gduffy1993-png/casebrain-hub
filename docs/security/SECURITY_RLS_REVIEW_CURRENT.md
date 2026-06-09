# Security / RLS Review — Criminal Workflow (Current)

**Date:** 2026-06-09  
**Scope:** Post-persistence spine, Supervisor Queue (PR #32/#33), default workflow flags, live queue fixes.  
**Reviewer:** Code review of migrations + API routes + pilot visibility (not live Supabase policy audit).

---

## Executive summary

| Area | Status |
|------|--------|
| New persistence tables RLS enabled | **Yes** — all five tables |
| Org scoping on persistence rows | **Yes** — `org_id` on SELECT/INSERT policies |
| API routes use auth + org checks | **Yes** — persistence routes use `verifyCaseInOrg` |
| Supervisor Queue visibility | **Yes** — org filter + pilot filter + archived exclusion |
| Computed queue bypasses visibility | **No** — computed path only for already-visible cases |
| Critical cross-org data leak found | **No** in API layer |
| Residual risks | **Medium-low** — see findings below |

**No immediate production blockers** identified in application code for pilot use. Recommended SQL hardening is **review-only** (see `rls_followup_REVIEW_ONLY.sql`).

---

## Architecture pattern

CaseBrain criminal workflow uses a **dual-layer** model:

1. **Postgres RLS** on persistence and criminal tables (authenticated policies where defined).
2. **Next.js API routes** using `getSupabaseAdminClient()` (service role, **bypasses RLS**) with manual checks:
   - `requireAuthContextApi()` → `userId`, `orgId`
   - `verifyCaseInOrg(caseId, orgId)` on case-scoped persistence routes
   - `filterCasesForPilotUser()` for pilot caseload visibility

`cases` and `documents` have RLS enabled with **deny anon only** in repo migrations — no authenticated SELECT policies in migrations. Direct browser PostgREST access to case/document bodies is therefore blocked; access is intended via server routes only.

---

## Table-by-table review

### `cases`

- RLS: enabled (`0002_rls_lockdown.sql`) — deny anon.
- App access: admin client + `.eq("org_id", orgId)` (Supervisor Queue, bundle-source, persistence verify).
- Archived: Supervisor Queue excludes `is_archived = true`.
- **Pilot filter:** `filterCasesForPilotUser` hides eval/internal clutter for non-admin pilot users.

### `documents`

- RLS: enabled — deny anon.
- App access: admin client; bundle-source and queue computed path load by `case_id` for org-visible cases only.
- **Note:** `raw_text` / `extracted_text` used server-side for reasoning; **not** returned in Supervisor Queue API response (sanitized metadata only).

### `criminal_cases`, `criminal_charges`, `criminal_hearings`

- RLS: enabled (`0036_criminal_law_system.sql`) — org via `organisation_members`.
- Supervisor Queue uses `criminal_cases` for hearing dates; PR #33 also allows `practice_area === 'criminal'` for computed inclusion.

### Persistence tables (20260601–20260605)

| Table | RLS | Authenticated policies | Append-only |
|-------|-----|------------------------|-------------|
| `reasoning_feedback` | Yes | SELECT + INSERT by org | Yes (no UPDATE/DELETE) |
| `supervisor_signoffs` | Yes | SELECT + INSERT by org | Yes |
| `evidence_change_snapshots` | Yes | SELECT + INSERT by org | Yes |
| `export_reviews` | Yes | SELECT + INSERT by org | Yes |
| `case_review_audit_events` | Yes | SELECT + INSERT by org | Yes |

Org resolution uses `users.org_id` or solo-user `organisations.external_ref` pattern (consistent across all five migrations).

**Metadata-only constraints:** note/route/safe_label length limits; no bundle text columns.

---

## Supervisor Queue API (`GET /api/criminal/supervisor-queue`)

| Check | Result |
|-------|--------|
| Auth required | Yes — `requireAuthContextApi` |
| Org filter on cases | Yes — `.eq("org_id", orgId)` |
| Pilot visibility | Yes — `filterCasesForPilotUser(casesRaw, userId)` |
| Archived hidden | Yes — `.eq("is_archived", false)` |
| Computed inclusion scope | Only `resolveSupervisorQueueComputedCaseIds` (criminal_cases row **or** `practice_area: criminal`) within visible set |
| Cross-org UUID in queue rows | Prevented — rows built only from visible org cases |
| Response sanitization | Yes — `supervisor-queue-sanitize`, no raw bundle text |
| Document text in response | **No** |

Computed inclusion does **not** bypass RLS or pilot filters; it adds server-side signals for cases already in the visible org caseload.

---

## Case workspace / persistence APIs

Reviewed routes (pattern: auth → `verifyCaseInOrg` → org-scoped query):

- `supervisor-signoff`
- `reasoning-feedback`
- `evidence-change-snapshot`
- `export-review`
- `audit-events`
- `bundle-source` (case org check)

Other criminal routes use `buildCaseContext` / inline `caseRow.org_id !== orgId` checks.

---

## Pilot / eval / admin visibility

- `NEXT_PUBLIC_CRIMINAL_PILOT_MODE` — pilot nav and defaults.
- `shouldShowInternalDevTools(userId)` — eval tools, PaywallKiller, OwnerStatusChip hidden for non-admin pilot users.
- `filterCasesForPilotUser` — hides eval-pack and internal test cases from non-admin pilot caseload.
- **Admin:** `NEXT_PUBLIC_ADMIN_USER_ID` sees full org caseload.

---

## Review questions (answers)

1. **All new persistence tables protected by RLS?** — **Yes.**
2. **Rows scoped to org?** — **Yes** (policies + API `org_id`).
3. **Pilot user sees only allowed cases?** — **Yes** (pilot filter on top of org filter).
4. **Cross-org UUID guess?** — **API returns 403/404** on persistence routes; queue won't list foreign cases.
5. **Supervisor Queue respects visibility?** — **Yes.**
6. **Computed inclusion bypass?** — **No.**
7. **Archived/bin hidden?** — **Archived excluded** from queue; bin cases typically archived.
8. **Eval/dev hidden for pilot?** — **Yes** (non-admin pilot filters).
9. **Persistence APIs safe?** — **Yes** with service-role + verifyCaseInOrg pattern.
10. **Sensitive text in wrong place?** — Persistence tables store metadata only; bundle text remains in `documents` (server-side access only).

---

## Findings & recommendations

### F1 — Persistence INSERT policies do not verify `case_id` belongs to `org_id` (Medium)

**Risk:** Authenticated PostgREST client (if used) could INSERT a row with matching `org_id` but a `case_id` from another org (FK only checks case exists).

**Mitigation today:** App routes set both fields after `verifyCaseInOrg`; no client direct insert observed.

**Recommendation:** Harden INSERT policies with `EXISTS (SELECT 1 FROM cases c WHERE c.id = case_id AND c.org_id = persistence.org_id)` — see `rls_followup_REVIEW_ONLY.sql`.

### F2 — Dual org-resolution patterns (Low)

`criminal_cases` policies use `organisation_members`; persistence tables use `users.org_id` / solo external_ref. Works for current solo-firm pilot but should be documented before multi-user firms.

### F3 — `cases` / `documents` lack authenticated RLS SELECT (Informational)

Intentional service-role-only access via API. Any new route using user-scoped Supabase client must enforce org checks manually.

### F4 — Supervisor Queue reads document text server-side (Informational)

Required for computed parity with Control Room. Text never leaves server in queue JSON. Monitor serverless timeout/memory at scale.

---

## What was not changed in this slice

- No Supabase policy migrations applied.
- No queue inclusion logic changes.
- No eval/training architecture.
- No weakening of existing RLS.

---

## Related files

- Migrations: `supabase/migrations/20260601120000_reasoning_feedback.sql` through `20260605120000_case_review_audit_events.sql`
- Queue fetch: `lib/criminal/supervisor-queue/fetch-supervisor-queue.ts`
- Pilot visibility: `lib/pilot-mode.ts`, `scripts/pilot-case-visibility.test.ts`
- Follow-up SQL (review only): `docs/security/rls_followup_REVIEW_ONLY.sql`
