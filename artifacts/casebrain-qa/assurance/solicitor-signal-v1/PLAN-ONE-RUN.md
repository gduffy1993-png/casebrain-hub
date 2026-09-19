# The one-run plan

Agreed with Ged at 05:20 on 25 Aug 2026. Everything here lands on PR #101. Nothing is merged and
nothing goes near production. Where a step needs a decision that is his to make, it goes on the
open-questions list at the bottom rather than being guessed at.

## The three levels of truth

Naming these matters, because "checked" has meant different things in different reports.

| Level | Question it answers | State |
| --- | --- | --- |
| 1 | Does the screen agree with the app's own reading of the papers? | automated, running |
| 2 | Does the app's reading agree with the PDF text? | done by hand for a few dozen rows |
| 3 | Does a line cite the document and page a human could check it against? | does not exist yet |

Level 1 passing tells you nothing about level 2. The status bug proved it: the PDF said
`Outstanding — not served`, flattening welded it to `OutstandingNot`, the app read served, and the
screen faithfully showed served. Every level 1 check would have passed green.

## Order of work

Each step has a definition of done, so "finished" is not a matter of opinion.

### 1. Close the harness gap
The offline replay feeds `frontMatterScan`; the live app passes a longer `bundleText`. Davies'
`MG6/04` reaches the chase list offline and not live, and that discrepancy makes every number
suspect — including the ones already reported. Nothing else is trustworthy until this is closed.

**Done when:** the replay input is byte-identical to what `buildDisclosureChaseBrief` receives live,
and the offline result for all seven cases matches the live capture.

### 2. The three loose ends from root 4
- `MG6/04 bank source statements` must appear on Davies' live board.
- Davies must stop showing `MG6 / unused schedule clarification`. The guard rewrites a card it
  cannot verify into that wording; the fix belongs where the rewrite happens, not in a filter
  afterwards, because filtering it out also removes the anchor it carries.
- `MG6C/002` medical anchor must hold while the guardian's schedule-header rule still holds. These
  two have been trading places; they need to pass together.

**Done when:** all three hold live, and the full suite is green except the pre-existing interview
failure at `f167-surgical-truth-opposite-direction.test.ts:686`.

### 3. Build the audit runner
One command, a list of case IDs, and it does the lot: capture every tab from the live preview, run
every checker, write a per-case evidence file and a summary board, and stamp the commit it ran
against. Replaces five scripts run by hand and read by eye.

**Done when:** one command reproduces every number in tonight's reports without manual steps.

### 4. Level 2 — compare the app's reading to the PDF
All twenty QA cases have a `source.pdf` under `artifacts/casebrain-qa/pr101-live-20-visual-pdf-review/`.
Extract each independently of the app's own pipeline, so the app is not marked with its own answers,
and diff the schedule rows the app believes against the rows the PDF actually contains.

**Done when:** the runner reports, per case, rows the app invented, rows it missed, and rows whose
status it read differently from the PDF — with a page number for each.

### 5. The never-allowed list
Every fixed root becomes a rule checked on every run forever, so a fix cannot rot quietly.

1. No surface may show material as served when the papers do not say so.
2. No case may display another case's charge, client or profile.
3. No request may be made for material the schedule records as already served.
4. A gap the schedule states by reference must reach the chase board carrying that reference.
5. The schedule itself, page chrome, and witness-statement boilerplate must never become a request.

**Done when:** all five run as assertions inside the runner, and each cites the root it came from.

### 6. Baseline the seven known cases
Full run at levels 1 and 2, stored as the comparison point for every future run.

### 7. Five new cases, picked for untested templates
Bugs live in the family-specific templates, so these are chosen to exercise templates the worked
seven never touch — not for variety's sake.

| Case | Charge | Templates it exercises that nothing else has |
| --- | --- | --- |
| `case-11-case-19` police station | Burglary | burglary forensics, identification |
| `case-17-case-9` CB-TB-039_Vale | Theft | property continuity, low-value forensics |
| `case-12-case-18` CB-TB-1573_Ahmed | Bladed article | recovery, forensic submission |
| `case-05` LIVE-02 Taylor Reed | Harassment | message packs, phone attribution |
| `case-03` LIVE-03 Jordan Hale | Assault on emergency worker | body-worn video, custody |

**Done when:** each has a findings report at levels 1 and 2. Faults that are the same roots wearing
different clothes get fixed. A genuinely new root gets written up with evidence rather than
half-fixed unsupervised.

### 8. Widen and summarise
Remaining cases at levels 1 and 2, then one summary at the top so nobody has to read six files.

## Method, from Ged, tightened

- Snapshot the output **before** fixing, so the fix can be proved rather than remembered.
- The checker reads everything; I read only failures and shapes I have not seen before. Seven cases
  by eye does not become two thousand by eye.
- Every fix that makes the app say more ships with a test that it does not say too much. Fixing
  silence is how a quiet app becomes a lying one.
- Fix the root, not the case. A fix that only fixes one case is the wrong fix.
- Audit the copy-out text hardest — the draft chase wording and the court line are what actually
  leave the building.
- Look at the real screen, not just the captured text. The Papers row cap was invisible in text.

## Open questions for Ged

Nothing is blocked on these; they are recorded rather than guessed.

1. When a schedule row is genuinely ambiguous, is the safer output to show it as review-only, or to
   leave it off the board? Current behaviour is review-only.
2. How many chase cards do you actually want on screen? The cap is 8. Stated gaps now take slots
   ahead of templates, so on a heavy case the templates get pushed off entirely.
