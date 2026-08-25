# Root 3 — same status everywhere: result

Question: now that Papers reads the schedule correctly, does any other solicitor surface
disagree with it — upgrading a gap to "on file", or writing off material the schedule records
as served?

Captured all six surfaces (Papers, Overview, Court, Client Summary, CPS Chase, File) for seven
cases on preview `casebrain-jifw0ew6e`, then compared claims per evidence family against the
Papers ledger.

- capture: `_live/cross-tab-status-1/`
- checker: `_replay/cross-tab-status-check.cjs`
- output: `_replay/CROSS-TAB-STATUS.txt`

## Answer: no surface contradicts Papers

| | |
| --- | --- |
| case/family pairs checked | 52 |
| surfaces upgrading a gap to "on file" | **0** |
| surfaces writing off served material | 1 (see below) |

The checker was canary-tested before the result was trusted: two false claims were injected into
the captured text (`The CCTV continuity log is served and on file`, `The custody record extract is
missing and must be chased`) and both were caught. So the zero is a real zero, not a blind checker.

Fourteen lines flagged on the first pass were all the app being careful, not lying — wording like
"cannot be finally assessed **until** the full custody and interview material **is served**" and
"**Avoid stating** MG11 / witness statement is served". Conditional and guard wording is now
excluded rather than counted.

The single remaining flag is Davies Client Summary: Papers records `MG6/01 custody record extract`
as **Served**, while the summary says "Custody/PACE material is referred to in limited form — chase
the full record". An extract being served does not make the full record served, so this is not a
contradiction. It is, however, not stated in the source either — the Davies PDF only ever refers to
a "custody record extract". It is a generic chase line, which belongs to Root 4.

**Root 3 needs no code fix.** The shared ledger is doing its job; the surfaces follow it.

## But the surfaces are largely silent

A correct status is only worth something if the surfaces a solicitor works from carry it.

- checker: `_replay/gap-coverage-check.cjs` · output: `_replay/GAP-COVERAGE.txt`

| Papers gap carried onto Overview / Court / Client Summary / CPS Chase | count |
| --- | --- |
| all four | 9 |
| some | 17 |
| **none — Papers only** | **10** |
| total case/family gaps | 36 |

Gaps a solicitor would never see unless they opened Papers:

| Case | Gap |
| --- | --- |
| Layla Davies | `MG6/04 bank source statements` — Outstanding, "Not in papers supplied" |
| Layla Davies | `MG6/05 CCTV continuity log` — Outstanding, awaiting export |
| Ellis Dunn | `O03 independent witness statement`, `O04 forensic continuity statement`, `EX/03 continuity note` |
| Leon Hale | CAD / 999 (4 rows), full phone download, final MG11 statements |
| Imani Tobin | bank / account material |
| Arden (robbery) | witness / MG11 |

The Davies bank statements are the exact row this whole root started from. Its status is now right
on Papers, and it is on no other surface.

## What that opens — Root 4

- checker: `_replay/chase-vs-schedule-check.cjs` · output: `_replay/CHASE-VS-SCHEDULE.txt`

| | |
| --- | --- |
| gaps the schedule states with a reference | 26 |
| items the chase surface offers | 24 |
| **stated gaps actually named on the chase list** | **6** |
| **stated gaps never offered** | **20** |

The chase list is not built from the schedule. It is built from offence-family templates, so it
offers the same generic items case after case while the named gaps sit unmentioned:

**Davies** — chase offers "Full phone download / source extraction", "Full custody record / PACE
material", "Medical / expert source report". The schedule states `MG6/04 bank source statements`
Outstanding, `MG6/05 CCTV continuity log` Outstanding, `MG6/06 analyst certificate` Outstanding,
`CCTV/2 external camera export log` absent. None of those four are offered. The custody record it
does offer is recorded as **Served** on the schedule.

**Isaac Patel** — chase offers "CCTV full window / master footage", "CAD / dispatch log material".
The schedule states `MG6/04 signed final MG11`, `MG6/06 custody record pages 3-5` and `MG6/07 full
interview transcript` all outstanding and "requested / not attached". None offered.

**Ellis Dunn** — chase offers "CAD / dispatch log material" and the custody template. The schedule
states four outstanding items by reference (`O02` CAD log full print, `O03` independent witness
statement, `O04` forensic continuity statement, `EX/03` continuity note). One is loosely matched.

**Imani Tobin** — nine stated gaps by reference, one loosely matched.

Chase items also carry provenance saying "Source reference present; exact document title/type and
page still need checking" on cases where the schedule gives the exact reference and wording.

So the root for the next job is not "too much noise on screen". It is **what is allowed to become a
solicitor-facing chase row**: templates are, and the schedule's own stated gaps are not. Fixing it
by hiding rows would make it worse — the fix belongs in row-source classification.

## Honest limits

- Chase item titles are scraped from rendered text, so roughly one "item" per case is a parse
  artefact ("Copy court line", or a description line counted as a title). Real chase lists are
  2–4 items. The direction of the finding is unaffected.
- Hale and the robbery case report 0 "stated gaps" because their schedule rows carry no reference
  in the form the checker matches (their gaps read as prose, e.g. "Full 999 audio Not yet served").
  The true count of stated gaps is therefore higher than 26, not lower.
- Coverage is measured by evidence family, not row by row. A surface mentioning "CCTV" counts as
  carrying a CCTV gap even if it discusses a different CCTV item.
