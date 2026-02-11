# Option 3: AI Strategy Suggestion – Monitoring (Phase 3.5)

Use this to tune prompts, confidence thresholds, and reliability. No PII in logs.

---

## What we log

All events are prefixed `[strategy-suggest]` and include only `caseId` (internal ID, not client name).

| Event      | Log line example | When |
|-----------|-------------------|------|
| `request` | `[strategy-suggest] request caseId=<uuid>` | User clicked "Get suggestion" |
| `fallback`| `[strategy-suggest] fallback caseId=<uuid> reason=<reason>` | No suggestion shown (see reasons below) |
| `success` | `[strategy-suggest] success caseId=<uuid> offenceType=<type>` | Suggestion returned to user |
| `rejected`| `[strategy-suggest] rejected caseId=<uuid>` | User clicked "Reject" on a suggestion |
| `approved`| `[strategy-suggest] approved caseId=<uuid>` | User clicked "Use this" and position was saved (Phase 4.3; also stored in `case_positions.source` / `ai_approved_at`) |

**Fallback reasons:** `invalid_input` | `ai_disabled` | `timeout` | `ai_unavailable` | `low_confidence`

---

## Weekly checks

1. **Fallback rate** – Count `fallback` vs `success` over the period. If fallback rate is high, check:
   - `invalid_input` → encourage adding charge/summary to case.
   - `timeout` / `ai_unavailable` → check provider status, consider retry or longer timeout.
   - `low_confidence` → consider relaxing confidence threshold or improving prompt.

2. **Reject rate** – Count `rejected` vs `success`. High reject rate may mean suggestions are off-topic or unhelpful; review prompt and offence/angle lists.

3. **Errors** – Search logs for `[strategy-suggest] Error:` and fix underlying issues.

---

## How to run the checks

- **Log storage:** Use your existing log aggregation (e.g. Vercel logs, CloudWatch, Datadog). Filter by `[strategy-suggest]`.
- **Ad-hoc:** `grep '\[strategy-suggest\]' <log-file>` then count events manually or with a short script.

No dashboard is implemented; this doc is the checklist. Add a minimal dashboard later if needed (e.g. counts per reason over last 7 days).
