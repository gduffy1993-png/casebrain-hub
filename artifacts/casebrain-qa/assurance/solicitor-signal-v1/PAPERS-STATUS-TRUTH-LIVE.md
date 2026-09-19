# Papers status truth — root, fix and live proof

Root worked: **evidence status flip** (Outstanding shown as Served). PR #101 only, no merge, no production.

## Exact root

Schedule cells arrive from flattened PDFs with the whitespace gone:

```
source (Davies, MG6 schedule)   MG6/04 | bank source statements | Outstanding | Not in papers supplied
text reaching CaseBrain          MG6/04bank source statementsOutstandingNot in papers supplied
```

Every status pattern in `lib/criminal/bundle-material-normalizer.ts` is word-boundary based
(`\boutstanding\b`, `\bnot\b`). In `statementsOutstandingNot` there is no boundary before
`Outstanding` or before `Not`, so both went invisible. The only word left with clean boundaries
was `supplied` in "Not in papers supplied" — which `POSITIVE_SERVED_RE` reads as service.

Result: **the row was classified `served` because the words saying it was not served had been
welded to their neighbours.** Proven directly, not inferred:

| input | status before | status after |
| --- | --- | --- |
| `MG6/04bank source statementsOutstandingNot in papers supplied` | `served` | `outstanding` |
| `MG6/04 bank source statements Outstanding Not in papers supplied` | `outstanding` | `outstanding` |
| `MG6/05CCTV continuity logOutstandingAwaiting export` | `unclear` | `outstanding` |
| `MG6/01custody record extractServedContained in papers` | `null` (row dropped) | `served` |

The same root produced three different symptoms, which is why it looked like several separate bugs:
outstanding read as served, outstanding softened to "Not safely confirmed", and genuinely served
rows dropped from the inventory altogether.

Four flattening shapes were found in the real bundles, all fixed:

- capital at the join — `statementsOutstandingNot`
- no capital at the join — `Photo stillnot served`, `continuity noteserved`
- status welded mid-cell — `noteservedavailable in bundle`
- status welded to a digit — `pages 3-5outstanding`

Two further truth problems were fixed in the same pass:

- conditional service (`Witnesses ... where served`) was being counted as proof of service
- the Papers row limit of 40 was applied *before* the served/gap counts were taken, so the header
  under-reported service, and served rows (which sort last) were pushed off the table

## Files changed

- `lib/criminal/bundle-material-normalizer.ts` — de-glue before any status decision; the classifier
  now normalises its own input so a caller cannot hand it glued text and get a false answer;
  conditional-service guard; `referenced only` recognised as the referred-only state
- `components/criminal/papers/PapersDocInventoryPanel.tsx` — counts taken from the whole ledger;
  rows carrying a schedule reference sort ahead of rows inferred from prose so the display limit
  cannot bury the schedule itself; the header says when rows are hidden
- `scripts/material-status-truth.test.ts` — new

## Before / after, live (Papers tab)

| Case | Before | After |
| --- | --- | --- |
| Layla Davies | 2 served: `MG6/04 bank source statements` (source says **Outstanding**) and the prose line `Witnesses ... where served`. All three genuinely served rows absent. | 3 served: `MG6/01 custody record extract`, `MG6/02 old charge sheet`, `MG6/03 bank schedule extract`. `MG6/04` now **Outstanding / missing**. |
| Ellis Dunn | 0 served of 29 rows — every served row hidden | 4 served: `S01 BWV stills`, `S02 interview summary`, `S04 CAD incident log extract`, `S05 CCTV stills`, each "Served Included in present papers" |
| Imani Tobin | 3 served, including `BWV/4 Photo stillnot served` and `CCTV/3 Body worn videonot served` | both now **Outstanding / missing**; referred-only rows read as Referred only instead of "Not safely confirmed" |
| Isaac Patel | 2 served; `MG6/05`–`MG6/07` shown as Referred only although the schedule says outstanding | 5 served; those rows now **Outstanding / missing** |
| Leon Hale | header claimed 40 rows (the display limit, not the count) | 250 rows, 8 served, "showing first 40" |
| Taylor Brookes | — | unchanged status; `WhatsApp` no longer split into `Whats App` |
| Robbery (Arden) | 19 rows, 0 served | unchanged — that bundle has no flattened cells |

Davies was fully inverted before the fix: two rows falsely marked served, and the three rows the
schedule actually marks Served missing from the list.

## Tests added

`scripts/material-status-truth.test.ts` — every case asserted in both directions, glued and spaced
form compared against each other:

- true served stays served, and is not dropped
- true outstanding cannot become served (trailing `supplied` cannot promote it)
- referred-only / referenced-only cannot become served
- partial, unsigned and interim extracts cannot become served
- unclear stays unclear when the source says nothing about service
- conditional service (`where served`, `if served`, `once served`, `subject to service`) is never served
- ordinary words that end in status wording survive: `preserved`, `observed`, `reserved`, `impartial`,
  `depending`
- brand names survive: `WhatsApp`, `iPhone`, `YouTube`
- ledger level: flattening a schedule must not change any row status, and only rows marked Served
  may be counted as served

## Checks

- `npx tsx scripts/material-status-truth.test.ts` — pass
- `cps-chase-review-status`, `demo-overview-adapter`, `live-ui-wording-regression`, `display-labels`,
  `solicitor-shortlist-freeze`, `solicitor-visible-evidence-view`, `gold-manual-proof-set`,
  `scale3000-run-v9-acceptance-contracts`, `malik-shared-root-remediation-round2-contracts` — pass
- `npx vitest run scripts/source-truth-guardian.test.ts scripts/assurance/pdf-output-comparator.test.ts`
  — 29/29 pass
- `npx tsc --noEmit` — no errors in `app/`, `components/` or `lib/criminal/`. The remaining errors are
  pre-existing and confined to offline harnesses in `lib/eval/**` and `scripts/**`, outside the build graph.
- Vercel preview **Ready**: `casebrain-jifw0ew6e`

## Already red before this work (not caused by it, confirmed on a clean tree)

- `scripts/bundle-truth-ledger.test.ts` — "medical chase should anchor MG6C/002"
- `scripts/f167-surgical-truth-opposite-direction.test.ts` — expects "Interview recording", gets
  "Interview transcript"

## What this exposed for the next root

Honest counts made the noise visible: Hale now reports 250 material rows and Brookes 86, most of them
inferred from narrative prose rather than a schedule ("This statement is true to the best of my
knowledge...", "20:04 Initial call opened..."). Tobin has served rows that carry no schedule reference,
so the display limit still cuts them. That is the priority/noise root, deliberately left untouched here.
