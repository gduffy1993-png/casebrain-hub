# Classification amendments after verification (2026-07-25)

## Committed after verification

- `next.config.mjs` — corrected to `experimental.serverComponentsExternalPackages` (was invalid top-level key). Disposition: COMMIT (commit-5).
- Strategy PDF smoke `%PDF-1.3` regenerated and committed (2400 bytes).

## Incomplete / ambiguous blockers (left uncommitted)

| Path | Reason |
| --- | --- |
| `scripts/scale3000-run-v8-acceptance-contracts.test.ts` | Stale version pin: asserts pipeline includes `run-v8` but module is `@scale3000-run-v9`. Product contracts for charge/disclosure still exist in v9 suite. |
| `scripts/solicitor-visible-boundary-profiles.test.ts` | Expects `case_header` → `structured_header`; module maps `case_header` → `narrative_prose`. Out of sync with evolved profiles; module retained because v4/v5/v9 contracts pass. |
| `docs/integrity-programme/README.md` | Working-tree change is corrupted duplicated Phase 9/10 table cells, not intentional documentation. |

## Excluded generated evidence

See `EXCLUDED-EVIDENCE-RETENTION.md` and `manifest-*.json` in this directory. Nothing deleted.
