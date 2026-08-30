# Solicitor fact record (cutover)

**Freeze first:** [`AS_IS_FREEZE.md`](./AS_IS_FREEZE.md) — master `55543f60` packed before this work.

## Rule

Wrong facts are illegal. Incomplete is allowed.

One `SolicitorFactRecord` owns charge, family, hearing, evidence counts, chase counts, MG11. Each slot is **confirmed** (value + source) or **unknown**. Unknown renders as `Not confirmed on the file.`

A hearing is only confirmed from a **labelled listing** (PTPH / next hearing / date of hearing). We do not train a model for this.

**Date roles (do not sort “earliest vs latest” and guess):**

- **DOB** = birthday. Never a hearing, even if it is the only date on the page.
- **Particulars** (`On DATE at…`, `Between DATE and DATE`) = when the charge happened. That can be last month or ten years ago. Still not a hearing.
- **Labelled listing** = the court date, and only if it is on or after the latest particulars date. Charge first, listing after.
- **Today** is the clock on the machine. It is never read off the PDF. After a listing is confirmed, today only says passed / upcoming / same-day.
- A later **unlabelled** date (interview, email, statement) is not a hearing just because it is after the charge. Unknown is allowed.

Corpus check: `npx tsx scripts/every-output-vs-pdf-check.ts` — charge and hearing vs every source file in the fresh, foundation, theft, GBH, and Pack A sets.

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
npx tsx scripts/solicitor-hearing-display.test.ts
npx tsx scripts/solicitor-output-integrity.test.ts
```
