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
- Court, Papers, and Chase show the same **On the file** strip.
- Live chat sends the desk record so counts match the tabs. If the model is integrity-blocked, chat shows the fact sheet instead of a dead banner. Eval gold routes are untouched.
- Letter / PDF / propose-summary APIs still build as before. They all leave through one door (`gatedJsonResponse`). If that door blocks, they do not send. A `factSheet` field is attached for UIs that want the list. Clean letters are unchanged.

## Tests

```bash
npx tsx scripts/solicitor-fact-record.test.ts
npx tsx scripts/solicitor-output-integrity.test.ts
```
