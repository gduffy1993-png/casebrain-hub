# Persistence & Sign-off Proposal — slice 1

**Status:** Design proposal only — **no DB migration, no Supabase implementation, no API routes in this slice.**

**Context:** Criminal pilot spine layers (Reasoning V2, feedback, NECD slice 2, Client Stress, Readiness, Exports/Handover, Supervisor QA, Client Explanation) currently persist **safe metadata in `localStorage` only**. Real-matter auditor lane proof (10 discovery / 6 strict-truth) and NECD slice 2 justify planning firm-visible persistence next — not implementing it yet.

**Principle:** Store **audit and review metadata** only. Never store papers, extracts, or client bodies in these tables.

---

## 1. Purpose

Decide where long-term **safe metadata** should live for firm use:

| Concern | Current (local) | Proposed (DB phase) |
|---------|-----------------|---------------------|
| Solicitor feedback marks | `casebrain:reasoningV2:feedback` | `reasoning_feedback` |
| NECD snapshots | `casebrain:evidenceChanges:snapshot:{caseId}` | `evidence_change_snapshots` |
| Supervisor sign-off | render-only QA panel | `supervisor_signoffs` |
| Export review state | clipboard / ephemeral UI | `export_reviews` |
| Readiness review | computed only | event via `case_review_audit_events` |
| Case handover review | export builder local | `export_reviews` + audit events |
| Audit trail | none cross-device | `case_review_audit_events` (append-only) |

---

## 2. What may be stored (allowed)

- `caseId`, `orgId` / `organisation_id` (matches existing app model)
- `userId` / `reviewerId` / `actorId` (authenticated user)
- Surface name (`control-room-reasoning`, `war-room-reasoning`, etc.)
- Structured enums: feedback option, sign-off status, export type, review status, readiness level
- Sanitized short labels (route, missing material, contradiction, disclosure chase, do-not-concede) — **label strings only**, capped length, linted
- NECD **sourceState counts only**: `documentCount`, `combinedTextLength`, `sourceSnippetCount`, `bundleAvailabilityReason`, `matterUpdatedMarker` (ISO timestamp, not path)
- Timestamps (`created_at`, `reviewed_at`, `snapshot_at`)
- Optional sanitized note (max **400 chars**, same lint as feedback/NECD today)
- Export metadata: `exportType`, `reviewStatus`, optional **content hash** (SHA-256 of generated draft) — not full export body unless explicitly approved in a later slice
- Append-only audit: `eventType`, `surface`, `actor`, `safeLabelSummary`

---

## 3. What must never be stored

| Forbidden | Examples |
|-----------|----------|
| Raw bundle / evidence text | MG5 body, charge sheet paste, OCR extract |
| Client account body text | Client instructions verbatim, stress-test account narrative |
| PDFs or binary blobs | Upload bytes, base64 |
| Extracted text fields | `raw_text`, `extracted_text` copies |
| File / artifact paths | `artifacts/…`, `C:\…`, `.pdf` names |
| Local paths | OneDrive, gitignored real-matter paths |
| Proof / eval / corpus IDs | `pp-*`, `bundleId` from eval hub, truth keys |
| Full export drafts (slice 1 proposal) | Full disclosure letter body in DB — defer; use hash + metadata only |
| Legal advice outcomes | “defence stronger”, “safe to plead”, “guaranteed” |

All writes must pass the same lint patterns as `reasoning-feedback-sanitize`, `evidence-change-sanitize`, and `supervisor-qa-sanitize`.

---

## 4. Entity sketches

### 4.1 `reasoning_feedback`

Stores solicitor feedback marks on Reasoning V2 surfaces.

```sql
-- Sketch only — not applied
CREATE TABLE reasoning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  surface TEXT NOT NULL,  -- control-room-reasoning | war-room-reasoning
  feedback_option TEXT NOT NULL,
  -- useful | missed_key_issue | too_vague | unsafe_overconfident
  -- | needs_solicitor_review | good_enough_hearing_prep
  note TEXT,              -- nullable, max 400, sanitized
  route_label TEXT,       -- nullable, sanitized label only
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Aligns with `ReasoningFeedbackRecord` in `lib/criminal/reasoning-v2/feedback/reasoning-feedback-types.ts`.

---

### 4.2 `evidence_change_snapshots`

Stores NECD safe snapshot metadata (user-initiated save — no auto-overwrite).

```sql
CREATE TABLE evidence_change_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  saved_by TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  route_label TEXT NOT NULL,
  readiness_level TEXT NOT NULL,  -- green | amber | red
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  missing_material_labels JSONB NOT NULL DEFAULT '[]',
  contradiction_labels JSONB NOT NULL DEFAULT '[]',
  proof_pressure_labels JSONB NOT NULL DEFAULT '[]',
  disclosure_chase_labels JSONB NOT NULL DEFAULT '[]',
  do_not_concede_labels JSONB NOT NULL DEFAULT '[]',
  client_instruction_labels JSONB NOT NULL DEFAULT '[]',
  safe_next_action TEXT,
  war_room_hearing_line TEXT,
  source_document_count INT,
  source_combined_text_length INT,
  source_snippet_count INT,
  source_bundle_availability_reason TEXT,
  source_matter_updated_marker TIMESTAMPTZ,
  schema_version TEXT NOT NULL DEFAULT 'evidence-change-v2'
);
```

**Note:** Label arrays are JSONB of **strings only** (max 12 items × 200 chars each at API boundary). No nested text blobs.

Latest snapshot per case: query `ORDER BY snapshot_at DESC LIMIT 1` or maintain pointer in app layer.

Aligns with `EvidenceChangeSnapshot` in `lib/criminal/evidence-change-detector/evidence-change-types.ts`.

---

### 4.3 `supervisor_signoffs`

Stores supervisor review state (per case, per review cycle).

```sql
CREATE TABLE supervisor_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  -- pending | reviewed | escalated | no_issue
  reviewed_at TIMESTAMPTZ,
  note TEXT,              -- nullable, max 400, sanitized
  reason_labels JSONB NOT NULL DEFAULT '[]',  -- linked safe labels only
  readiness_level_at_review TEXT,
  evidence_change_summary TEXT,  -- sanitized one-liner, not compare blob
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Distinct from render-only `SupervisorReviewStatus` (`none | suggested | required`) — DB captures **human sign-off action**.

---

### 4.4 `export_reviews`

Tracks that an export draft was generated and/or reviewed.

```sql
CREATE TABLE export_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  -- disclosure_chase | hearing_prep | case_handover | client_explanation
  review_status TEXT NOT NULL,
  -- draft_generated | solicitor_reviewed | supervisor_reviewed | discarded
  content_hash TEXT,      -- SHA-256 of draft at generation time; optional
  route_label TEXT,
  readiness_level TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
```

**Slice 1 proposal:** store hash + metadata only. Full export text persistence requires explicit later approval and redaction policy.

Aligns with export types in `lib/criminal/disclosure-export/export-types.ts` + client explanation export (planned enum value).

---

### 4.5 `case_review_audit_events`

Append-only metadata event log for firm audit trail.

```sql
CREATE TABLE case_review_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- feedback_submitted | snapshot_saved | supervisor_signoff
  -- | export_generated | export_reviewed | readiness_acknowledged
  -- | handover_reviewed | material_change_detected
  surface TEXT,
  safe_label_summary TEXT NOT NULL,  -- max 240, sanitized
  metadata JSONB NOT NULL DEFAULT '{}',  -- counts/enums only; no text bodies
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Append-only:** no UPDATE/DELETE for standard roles; admin retention job only.

---

## 5. RLS / access assumptions

Follow existing patterns (`organisation_id` / `org_id` on `cases`, `organisation_members`, `case_positions` migrations):

| Role | Access |
|------|--------|
| Org member (fee earner) | INSERT/SELECT own feedback, snapshots, export reviews for cases in org |
| Supervisor / admin | SELECT sign-offs + audit events for org; INSERT supervisor_signoffs |
| Non-admin pilot | Same as fee earner; **no** cross-case supervisor queue until slice 2 |
| Solo workspace | `org_id = 'solo-user_' || auth.uid()` pattern (existing) |

**RLS rules (sketch):**

```sql
-- All tables: organisation_id must match caller org
-- case_id must belong to organisation (FK or subquery on cases)
-- reasoning_feedback: user_id = auth.uid() OR supervisor read
-- supervisor_signoffs: reviewer_id = auth.uid() on INSERT; org supervisors SELECT
-- case_review_audit_events: INSERT via service role or authenticated; SELECT org-scoped
```

**Non-admin pilot restrictions:**

- No bulk export of audit events
- No cross-org reads
- Supervisor sign-off UI remains flag-gated (`?supervisor=1` + `?reasoningV2=1`)
- Feedback/delete: soft policy — append-only audit preferred over hard delete

---

## 6. Retention concerns

| Data | Suggested retention | Notes |
|------|---------------------|-------|
| `reasoning_feedback` | 24 months | Training signal; aggregate for product quality |
| `evidence_change_snapshots` | Latest + 12 monthly | Keep latest always; prune older per case |
| `supervisor_signoffs` | 7 years | Firm compliance — confirm with pilot firm |
| `export_reviews` | 24 months metadata only | Hash without body limits value after retention |
| `case_review_audit_events` | 7 years append-only | Legal audit; export on request |

Retention jobs are **phase 2** — not in first migration.

---

## 7. Audit trail concerns

- Every DB write from API should emit a `case_review_audit_events` row where appropriate
- Audit events must never duplicate bundle text — `safe_label_summary` only
- Cross-device continuity is the main driver (localStorage does not sync)
- Supervisor “who reviewed what when” requires `supervisor_signoffs` + audit events
- Material-change detection (NECD) should log `material_change_detected` event when compare flags review — metadata only

---

## 8. Recommended migration order (after proposal approved)

1. **Migration:** create five tables + indexes + RLS policies (metadata columns only)
2. **API:** `POST/GET /api/criminal/[caseId]/reasoning-feedback` — dual-write local + DB behind flag
3. **API:** `POST/GET /api/criminal/[caseId]/supervisor-signoff`
4. **API:** `POST/GET /api/criminal/[caseId]/evidence-change-snapshot`
5. **API:** `POST /api/criminal/[caseId]/export-review` (metadata + hash)
6. **API:** `GET /api/criminal/[caseId]/audit-events` (supervisor/admin)
7. **Later:** multi-case supervisor queue (slice 2), export PDF download (export slice 3)

---

## 9. Recommended API route order

| Order | Route | Method | Purpose |
|-------|-------|--------|---------|
| 1 | `/api/criminal/[caseId]/reasoning-feedback` | POST, GET | Feedback marks |
| 2 | `/api/criminal/[caseId]/supervisor-signoff` | POST, GET | Sign-off state |
| 3 | `/api/criminal/[caseId]/evidence-change-snapshot` | POST, GET | NECD snapshot save/load |
| 4 | `/api/criminal/[caseId]/export-review` | POST | Export review metadata |
| 5 | `/api/criminal/[caseId]/audit-events` | GET | Append-only log (supervisor) |

All routes: require auth, validate org + case scope, run sanitize lint on body, reject forbidden patterns server-side.

---

## 10. Rollout flags

| Flag | Purpose |
|------|---------|
| `?reasoningV2=1` | Unchanged — spine prerequisite |
| `?persistence=1` or `localStorage: casebrain:persistence=true` | Enable DB read/write when implemented |
| Per-table kill switches | `casebrain:persistence:feedback`, `:snapshots`, `:signoffs`, `:exports` |

**Fallback:** until flags on and migration applied, **localStorage remains source of truth** (current behaviour). DB failure → silent fallback to local with console warning in dev.

---

## 11. Pilot risk notes

| Risk | Mitigation |
|------|------------|
| Accidental PII in notes | 400-char cap + shared sanitize lint + server rejection |
| Storing export bodies too early | Hash-only in slice 1 implementation; explicit later gate |
| Cross-case data leak | Strict RLS on `organisation_id` + case ownership |
| Non-admin seeing other fee earners’ notes | Default: own `user_id` rows; supervisor role for aggregate |
| Over-writing NECD snapshots | User-initiated save only (matches slice 2 UX) |
| Audit log volume | Append-only with retention job; index on `(organisation_id, case_id, created_at)` |
| Pilot firm without DPA | Proposal review before migration; no real client data in dev/staging |

---

## 12. localStorage mapping (until DB live)

| localStorage key | Future table |
|------------------|--------------|
| `casebrain:reasoningV2:feedback` | `reasoning_feedback` |
| `casebrain:evidenceChanges:snapshot:{caseId}` | `evidence_change_snapshots` |
| (none today) | `supervisor_signoffs`, `export_reviews`, `case_review_audit_events` |

Client Stress selections and Readiness levels remain **derived** at render time; persistence captures **acknowledgement events** via audit log rather than recomputing full readiness server-side.

---

## 13. Out of scope (this proposal)

- Supabase storage buckets for PDFs
- Upload backend changes
- OCR / bundle ingest rewrite
- Auth/billing/paywall changes
- Multi-case supervisor queue UI
- Audio lane
- 50k corpus / eval hub IDs in user records
- Real-matter auditor `human-truth.json` (stays gitignored local)

---

## 14. Approval checklist (before migration slice)

- [ ] Firm pilot lead confirms retention periods
- [ ] DPA / lawful basis for metadata-only audit log
- [ ] Security review of RLS policies
- [ ] Confirm export body policy (hash-only vs encrypted store)
- [ ] Non-admin pilot role matrix signed off
- [ ] Rollback plan: disable `?persistence=1`, localStorage continues

---

## 15. Related docs

- `lib/criminal/reasoning-v2/feedback/README.md`
- `lib/criminal/evidence-change-detector/README.md`
- `lib/criminal/supervisor-qa/README.md`
- `lib/criminal/disclosure-export/README.md`
- `docs/real-matter-auditor/README.md`
- `docs/CASEBRAIN_V2_MASTER_PLAN.md` §9.6.2
