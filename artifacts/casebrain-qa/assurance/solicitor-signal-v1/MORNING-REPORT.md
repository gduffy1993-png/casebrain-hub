# Morning report — 25 Aug 2026

Everything is on PR #101. Nothing merged, nothing near production.

## What to read first

Two real bugs fixed and proved live, two measurement problems in my own earlier work corrected, an
audit runner built that does twenty cases in two minutes, and one new systemic issue found that is
bigger than anything fixed so far — the app only reads the first 80,000 characters of a bundle.

Two of the three loose ends from last night are closed. The scan cap needs a decision from you
before I touch it.

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

## 5. Also fixed: a listed item is not the schedule it sits on

Davies' board had been showing "MG6 / unused schedule clarification" twice. The cause was one line:
any label opening with `MG6` was rewritten into that wording. So `MG6/04 bank source statements` and
`MG6/06 analyst certificate` — two different documents — arrived as the same generic, unsendable card,
and appeared twice because there were two of them.

`MG6/04` is an item the schedule lists. `MG6 disclosure schedule` is the schedule itself. Only the
second is a clarification request. Now narrowed accordingly.

This also closed the loose end that had been open longest. Davies' live board reads:

```
MG6/05 CCTV Continuity log
MG6/07 final medical report
MG6/04 bank source statements
MG6/06 analyst certificate
CCTV/2 External camera export Store manager Export log
Body-worn video (BWV)
DIG/4 Phone screenshot bundle DC Morgan Raw extraction
```

Zero clarification cards, and `MG6/04` on the live screen — which until now had only ever appeared
offline. All five of Davies' stated gaps now reach the board. Commit `9ac0989a9`.

## 6. Still open

- **Hale's outstanding CCTV, CAD and custody rows still do not reach the board.** Narrowed but not
  fixed. The ledger holds them correctly marked outstanding (`probe-hale-ledger.ts`):
  `EX-MUR-009` CCTV master, `EX-MUR-012` original CAD audio, `EX-MUR-022` full custody record. By
  the time the board is assembled they are gone entirely — not ranked low, absent
  (`probe-hale-board.ts`). Something between the ledger merge and the shortlist is removing them.

  I tried two fixes and **both had exactly no effect**, measured across all twenty cases: stripping
  the table row number from labels, and ranking absence ahead of everything rather than only within
  source-named items. Because neither did anything, I reverted the ranking change rather than ship
  unproven churn, and kept the row-number strip only because it is independently right and now has
  a test. Worth knowing before someone tries either again — I have ruled them out.

  Two candidates remain, both needing a trace through the twelve reconcile-and-gate steps between
  merge and shortlist: either the family collapse is folding them into a card that is then removed
  for naming an unaffirmed modality, or one of the reconcile steps is dropping them. This wants a
  proper instrumented trace, which is the first thing I would do next.
- **`MG6C/002` medical anchor** still fails at `bundle-truth-ledger.test.ts:378`. Baseline, unchanged.
- **Interview recording/transcript** still fails at
  `f167-surgical-truth-opposite-direction.test.ts`. Pre-existing, confirmed by stashing.

## 7. You said raise the cap. I tried it, and it needs a second piece of work

You chose "just raise the limit so the whole bundle is read". I did exactly that, measured it, and it
does not stand up on its own — so it is reverted for now and nothing slow has shipped.

There were two caps, not one: the API only builds 80,000 characters of scan text, and the ledger only
reads 250,000 of whatever it gets. Raised both to 2,000,000 and deployed. **The reading worked.**
Hale went from 80,000 characters to all 167,149. The big case went from 79,806 to 1,614,176 — from
5% of its papers to all of them.

Then the timings:

| Case | Bundle | Ledger | Chase board |
| --- | --- | --- | --- |
| Davies | 8,104 chars | 30 ms | 1.2 s |
| Hale | 167,149 | 131 ms | 48 s |
| `f57a2750` | 1,614,176 | 1.1 s | 334 s |

Reading the bundle is cheap — a second for 1.6 million characters. Building the board is what
collapses, and it runs in the browser, so a solicitor opening the biggest case would get a hung tab.

The cause is not the amount of text but how the board uses it. The presentation gates re-scan the
whole bundle with dozens of patterns, once per card, across a dozen passes. Text length multiplies
through all three.

I fixed the two parts that were plainly wasteful and kept them: a heavy bundle was producing about
two thousand cards to fill a board of eight, so the rows turned into cards are now bounded at 300 —
taking stated, referenced gaps first, so only the weakest evidence of a gap is ever dropped — and a
linear lookup inside the merge loop is now indexed. Necessary, not sufficient.

**The remaining work is to give those gates a distilled haystack instead of the raw bundle.** They
only ever ask "do the papers affirm this?", and the ledger rows already answer that, having been
built from the whole bundle. Then the cap can go up and stay up. That is a real piece of work on the
hot path of every case, and I would rather agree it with you than start it unsupervised.

Worth saying plainly: this is the same answer as the option I recommended, but now it is measured
rather than argued.

## 8. The two decisions, now answered

1. **The scan cap — read the whole bundle.** Attempted and measured; reverted pending the gate work
   in section 7. The reading is cheap, the board build is not.
2. **Board size — stays at 8.** No change needed; that is what it already does.

Next thing I need from you is whether to start the gate work described in section 7.

## Where the numbers stand

Across all twenty cases with a source PDF, on commit `7d3cd1788`:

- **15 of 26** gaps the schedules state by reference reach the chase board.
- **1** rule finding in total, and it is a P1 wording issue, not a false statement about evidence.
- **Davies 5/5, Dunn 4/4** — every stated gap on the board, named, with its reference.
- **Hale 1/4** — the truncated bundle and the dropped rows above.
- **Patel 3/4, Tobin 1/3, `cf18354a` 2/6** — the remaining shortfall, and worth a look next.
- Six cases have bundles of 240 characters or less and boards of 0–2 items. Those are almost
  certainly documents that never processed properly rather than clean cases, and the runner cannot
  tell the difference. That is worth checking before anyone reads a low board as good news.

## Checks run

- `npx tsc --noEmit` — 67 seconds, not hanging. Errors only in pre-existing QA scripts, none in
  anything touched.
- `source-truth-guardian` 23/23, `pdf-output-comparator` 6/6, `schedule-reference-truth` 35/35,
  `material-status-truth`, `chase-source-named-truth`, `chase-request-wording-truth`,
  `cps-chase-review-status`, `demo-overview-adapter`, `live-ui-wording-regression` — all pass.
- Two known baseline failures unchanged, both listed above.
- Vercel preview Ready, live capture taken against it.
