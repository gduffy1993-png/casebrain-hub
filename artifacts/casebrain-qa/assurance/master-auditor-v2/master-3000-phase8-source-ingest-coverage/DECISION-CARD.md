# CaseBrain master 3,000 — Phase 8 source / ingest / state-transition coverage

Generated: 2026-08-19T17:52:12.181Z

## Verdict

**SOURCE_INGEST_STATE_TRANSITION_COVERAGE_COMPLETE__NO_SCALE_RUN**

Certified commit: `1c15fc84ec9c36b2b7f293ed8bc227ec05450533`

## Coverage

- Before (Phase 7): **42/361**
- After (Phase 8): **70/361**
- Newly evaluated: **28**
- CRITICAL: **24/116 → 38/116**
- HIGH: **17/158 → 30/158**

## Shared production fixes

1. **LIVE-HOSTILE-INSTRUCTION-NOT-CHASE-LABEL** — prompt-injection instruction lines no longer become solicitor-visible chase labels.
2. **LIVE-OFFENCE-DATE-NOT-HEARING** — offence/statement/arrest date roles no longer populate hearing dates when listing context exists.

## Stop rule

No 100–200 / 500 / 1000 / 3000 corpus run was started automatically.
