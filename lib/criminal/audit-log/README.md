# H5 Audit Log (read-only)

Internal review queue for persisted `trust_feedback` records. Does **not** alter live solicitor outputs, Bad Output Memory, or Guardian gates.

## Deferred this slice

- Review status workflow (`open` / `reviewed` / `dismissed` / `converted_to_fixture`)
- Reviewer notes persistence
- Action category persistence

Suggested action categories are computed at display time only (`suggest-action-category.ts`).

## API

`GET /api/criminal/audit-log` — org-scoped; query params via `parse-audit-log-filters.ts`.
