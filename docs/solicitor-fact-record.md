# Solicitor fact record (cutover)

**Freeze first:** [`AS_IS_FREEZE.md`](./AS_IS_FREEZE.md) — master `55543f60` packed before this work.

## Rule

Wrong facts are illegal. Incomplete is allowed.

One `SolicitorFactRecord` owns charge, family, hearing, evidence counts, chase counts, MG11. Each slot is **confirmed** (value + source) or **unknown**. Unknown renders as `Not confirmed on the file.`

One renderer (`renderSolicitorFacts`) writes the same lines for Overview, Summary, and (non-eval) chat.

## What changed in the app

- Overview and Summary show an **On the file** strip from the same record.
- If Summary copy is integrity-blocked, the landing paragraph is the fact lines — not a dirty essay with Copy disabled.
- Sexual-only files no longer confirm family as “Violence” on this record (legacy resolver still maps that for older gates).
- Chat (live solicitor, not eval headers) answers a narrow set of fact questions from the record and injects the fact sheet into the LLM source-of-truth block. Eval gold routes are untouched.

## Tests

```bash
npx tsx scripts/solicitor-fact-record.test.ts
npx tsx scripts/solicitor-output-integrity.test.ts
```
