# Morning report — 25 Aug 2026

Everything is on PR #101. Nothing merged, nothing near production.

## What to read first

One real bug fixed and proved live, one measurement problem in my own earlier work corrected, one
audit runner built, and one new systemic issue found that is bigger than anything fixed so far.

## 1. The bug: the app was asking for material the papers say is served

On Jordan Hale's murder bundle, six of the eight chase cards read like this:

> EX-MUR-002 MG5 Case Summary Served summary/draft

That is a request that states the item is served in the middle of asking for it. Nobody can send it.

The papers say, on page 53:

> `EX-MUR-002MG5 Case SummaryServed summary/draft`

Three columns — code, description, status — flattened into one string with the spaces lost. The app
restored the spaces correctly, but then used the whole string as the label of the request. So the
status became part of what was being asked for.

Worse, those six cards had pushed the real gaps off the board. The same bundle's index states the
CCTV master footage, the original CAD audio, the full custody record and the full photograph set are
all outstanding. None of them were on the board.

**Fixed.** The description is now what gets asked for, and the status is what the schedule says about
it. The status still travels with the row, so Papers keeps showing it. Alongside that:

- A reference welded to its description now parses. `EX-MUR-001Charge Sheet` was returning nothing,
  so the app could not tell one exhibit from another on that page.
- Where the papers name material a generic template card already covers, the template now becomes
  that row and carries the reference and the stated status. Previously the real row was dropped as a
  duplicate, and then the template it deferred to was deleted for naming a modality the papers never
  confirm — so the gap was lost twice over.
- Material the schedule records as absent now outranks material served in summary or draft form. An
  eight-slot board should not be eight "served summary/draft" rows.

**Proved live** on Davies, Hale and Dunn: no board contains that wording any more, and Dunn's board
now names `O03`, `O04` and `EX/03` individually.

Commit `7d89cd53e`. Test: `scripts/chase-request-wording-truth.test.ts`, which fails if any card
states an item is served while asking for it, or names a reference without naming the material.

## 2. A correction to my own earlier work

Two of my earlier measurements were not measuring what I said they were. Both are now fixed, but the
conclusions they produced should be treated as withdrawn.

**The cross-tab consistency check compared a page with itself.** I was capturing tabs called
`court-position` and `client-summary`. Neither exists. In pilot mode there are four zones —
`overview`, `today`, `papers`, `file` — plus `disclosure-chase`. Both invented names silently fell
back to the same page, so "no contradictions found across tabs" was three copies of one page
agreeing with each other. It was not evidence of consistency.

**The offline replay was not comparable to the screen.** I had assumed the difference was the bundle
text. It was not — the Chase tab passes exactly the text the replay used. What the replay lacked was
everything else the live tab passes: the canonical evidence rows, the canonical findings, the
battleboard and the matter. The canonical rows in particular drive a filter that suppresses requests
for material already served, so a row could survive offline and be dropped live. That is why Davies'
`MG6/04` appeared in one and not the other.

Both are now closed. `capture-builder-inputs.cjs` saves every input the live builder receives, and
`chase-live-parity.ts` replays the board from them.

## 3. The audit runner

One command now does what took five scripts and a lot of squinting:

```
npx tsx artifacts/casebrain-qa/assurance/solicitor-signal-v1/_audit/audit-run.ts --cases all
```

It captures the live inputs, replays every board, checks each never-allowed rule, writes a file per
case and a summary board, and stamps the commit it ran against — and refuses to let a board be read
against the wrong code by marking the run dirty if the working tree has changed.

Twenty cases in about two minutes. The never-allowed rules are now permanent checks, one per root
already fixed, so a fix cannot rot quietly:

1. No request may state the item is served.
2. No request may name a reference without naming the material.
3. No request may carry a raw status cell.
4. No case may show another case's material.
5. The schedule itself must never become a request.

Across all twenty cases there is now **one** rule finding. Fifteen of twenty-six gaps the schedules
state by reference reach the chase board.

## 4. The new systemic issue, and it is the big one

The app reads only the first 80,000 characters of a bundle. Everything below that is invisible — not
weighed and set aside, but never read.

| Case | Bundle | Read | Share |
| --- | --- | --- | --- |
| `f57a2750` | 1,614,418 chars | 79,806 | 5% |
| `14823d9e` Hale | 167,149 | 80,000 | 48% |
| `99090c69` | 145,270 | 80,000 | 55% |

This is the worst kind of failure, because it is silent and it gets worse exactly where the stakes
are highest: the heavy Crown Court cases with the most papers are the ones read least. On `f57a2750`
the board has one item, and there is no way to know whether that is because the case is clean or
because the app never reached the schedule.

It also explains part of Hale. Some of what I was hunting may simply sit past the cut.

**I have not touched this.** It is a change to how bundles are read, it affects every case, and it
is not something to attempt unsupervised overnight. It is the next root, and I would want to agree
the approach with you first — the choice is between raising the cap, reading the schedule sections
specifically wherever they sit, or processing in passes.

## 5. Still open

- **Davies shows "MG6 / unused schedule clarification" twice.** Generic, unsendable, and it is the
  schedule itself appearing as a request — rule 5. The guard rewrites a card it cannot verify into
  that wording. Filtering it afterwards also removes a legitimate medical anchor, so the fix belongs
  where the rewrite happens. Not yet fixed.
- **Hale's outstanding CCTV, CAD and custody rows still do not reach the board.** The ledger holds
  them, correctly marked outstanding — `probe-hale-ledger.ts` shows this. They are dropped further
  down the pipeline than I traced before stopping to verify the fixes I already had.
- **`MG6C/002` medical anchor** still fails at `bundle-truth-ledger.test.ts:378`. Baseline, unchanged.
- **Interview recording/transcript** still fails at
  `f167-surgical-truth-opposite-direction.test.ts`. Pre-existing, confirmed by stashing.

## 6. Two decisions I need from you

1. **The scan cap.** Which way do you want it: raise the limit, hunt out the schedule sections
   wherever they sit in the document, or read in passes? This is the biggest single accuracy win
   available and it needs your call.
2. **Board size.** The cap is 8 cards. Now that stated gaps take slots ahead of templates, a heavy
   case fills all 8 with real gaps and the templates drop off entirely. Is 8 the right number?

## Checks run

- `npx tsc --noEmit` — 67 seconds, not hanging. Errors only in pre-existing QA scripts, none in
  anything touched.
- `source-truth-guardian` 23/23, `pdf-output-comparator` 6/6, `schedule-reference-truth` 35/35,
  `material-status-truth`, `chase-source-named-truth`, `chase-request-wording-truth`,
  `cps-chase-review-status`, `demo-overview-adapter`, `live-ui-wording-regression` — all pass.
- Two known baseline failures unchanged, both listed above.
- Vercel preview Ready, live capture taken against it.
