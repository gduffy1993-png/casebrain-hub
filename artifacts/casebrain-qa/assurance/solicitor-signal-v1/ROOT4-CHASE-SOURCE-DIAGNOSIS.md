# Root 4 — why the schedule's own gaps never reach the chase list

Root 3 proved no surface contradicts Papers, but also showed the surfaces are mostly silent: only
6 of 26 schedule-stated gaps were named on the chase list. This is the diagnosis of why.

Diagnosis is offline, over the exact text the app is handed (`_replay/app-source/`, fetched from
`/api/criminal/[caseId]/bundle-source`), running the real ledger and the real chase builder.

- `_replay/ledger-probe.ts` — what the truth ledger sees
- `_replay/chase-funnel.ts` → `_replay/CHASE-FUNNEL.txt` — which ledger rows reach the list
- `_replay/trace-run.ts` — per-stage trace (used with temporary instrumentation, since reverted)

## The chase builder is not blind

It is handed the same `BundleTruthLedger` that Papers uses, and the ledger is populated:

| Case | ledger rows | rows needing chase |
| --- | --- | --- |
| Davies | 24 | 21 |
| Patel | 42 | 37 |
| Hale | 250 | 242 |

So this is not a missing-data problem. `mergeLedgerDisclosureItems` runs, and it does create items
carrying real schedule references — 6 of them for Davies, 6 for Dunn.

## Most rows *should* be dropped

Across seven cases, 479 rows "need chase" and 11 reach the list. That looks alarming until you read
them: the bulk are prose the extractor could not classify — "Statement of offence", "This statement
is true to the best of my knowledge", "20:04 Initial call opened". Filtering hard is correct.

The measure that matters is narrower: rows the schedule **states** — carrying a reference *and* a
gap status the source asserts.

| | |
| --- | --- |
| stated gaps across the seven cases | 24 |
| reaching the chase list | **1** |
| dropped | **23** |

Those 23 are not noise. They are the sendable chase items:

```
Davies   MG6/04 bank source statements       Outstanding — not in papers supplied
Davies   MG6/05 CCTV continuity log          Outstanding — awaiting export
Davies   MG6/06 analyst certificate          Outstanding — awaiting export
Davies   MG6/07 final medical report         Outstanding — requested from officer in case
Davies   CCTV/2 external camera export       Export log absent
Patel    MG6/04 signed final MG11            Outstanding — requested / not attached
Patel    MG6/06 custody record pages 3-5     Outstanding — requested / not attached
Patel    MG6/07 full interview transcript    Outstanding — requested / not attached
Dunn     O01 full interview transcript       Listed but not attached
Dunn     O02 CAD log full print              Outstanding — not yet served
Dunn     O03 independent witness statement   Outstanding — continuity awaited
Dunn     O04 forensic continuity statement   Outstanding — requested from OIC
Dunn     EX/03 continuity note               Eastmoor Police outstanding
Tobin    CCTV/3 body-worn video not served, BWV/4 + AB/2 photo stills not served,
         AB/2 phone download / CCTV/3 clip / TEL-5 continuity note — referenced only
```

## Where they die

Stage trace, counting items that still carry a schedule reference:

| Stage | Davies | Dunn |
| --- | --- | --- |
| after `mergeLedgerDisclosureItems` | 6 | 6 |
| after `gateItemsAgainstSource` | 4 | 6 |
| after `collapseDisclosureItemsByFamily` | 3 | 1 |
| after `finalizeDisclosureChasePresentation` | **0** | **0** |
| final item count | 5 → 3 shown | 4 → 2 shown |

Three instruments, in order of damage:

1. **`finalizeDisclosureChasePresentation`** — the biggest. Davies goes from 17 items with 3
   referenced rows to 5 items with none. It rewrites real rows into stock family cards, so the
   reference and the paper's wording are discarded at the last step.
2. **`collapseDisclosureItemsByFamily`** — Dunn loses five distinct referenced items (`O01`–`O04`,
   `EX/03`) to one, because `O03`, `O04` and `EX/03` all classify as `exhibit_provenance` and the
   collapse keys on family, not on the item's reference. Distinct items with distinct references
   are treated as duplicates.
3. **`gateItemsAgainstSource`** — drops Davies' `MG6/04 bank source statements` and `MG6/05 CCTV
   continuity log`. A gate meant to keep items source-backed is deleting the two rows the source
   states most plainly.

Then `canonicalLedgerMaterial` explains the wording: rows that do survive are relabelled into about
a dozen stock items with fixed prose. That is where "Full custody record / PACE material —
custody record extract only, chase the full record" comes from, on a case whose schedule records
the custody extract as **Served**. The prose is fixed text, not read from the paper.

## Fix shape

A chase row's identity should be the schedule row: its reference and the source's own words.

1. Mark a ledger row as **stated** when it carries a reference and a source-asserted gap status.
2. Stated rows are exempt from family collapse — collapse only on matching reference.
3. Stated rows cannot be gated out as unsupported; the source is the thing asserting them.
4. Presentation may reword, not re-identify: the reference survives to the card.
5. Stated rows take first claim on the 8 primary slots, ahead of template items. This is the
   priority half of the same root — the gaps were never buried, they were never added.
6. Family knowledge stays useful for *why it matters* and the draft chase wording, and stays
   blocked from asserting modality the source does not establish (the existing invent guards).

Opposite tests needed, so the fix cannot swing into invention:

- a stated gap with a reference must appear as its own chase row, carrying that reference
- two stated rows with different references must not collapse into one
- a template family item must not survive when it contradicts a served row on the schedule
- a prose fragment without a reference must still be filtered
- an invented modality claim must still be blocked

Sizing: eight assertions across two test files pin the stock labels
(`scripts/bundle-truth-ledger.test.ts`, `scripts/source-truth-guardian.test.ts`).

---

# Result — shipped in `0ff7699ea`

## The deepest cause was below all three instruments

No row carried a reference at all. `parseScheduleRef` matched `MG6` only when followed by three or
four digits, so the `MG6/04` form these schedules actually use returned null, and exhibit forms
(`O03`, `EX/03`, `CCTV/2`, `BWV/4`, `AB/2`, `TEL/5`, `DIG/4`, `EX-MUR-005`) were not recognised at
all. Every ledger row had `scheduleRef: null` — 0 of 24 on Davies, 0 of 42 on Patel, 0 of 250 on
Hale. With nothing to tell two items apart, collapse-by-family was not being careless; it had no
other key available.

This also means the Papers "scheduled rows first" sort added earlier in this branch was sorting on a
field that was always null, and had never had any effect.

## What changed

The reference now travels as data on the chase item (`sourceScheduleRef`), taken from the ledger row
rather than re-parsed from display text. Material the schedule names then keeps its identity: it is
not gated as an unsupported modality, not merged into a family card, not renamed by presentation,
and it takes a board slot ahead of template items. Templates, prose fragments and the schedule
header itself behave exactly as before.

## Measured, offline over the exact app text

| | before | after |
| --- | --- | --- |
| gaps the schedule states | 21 | 21 |
| reaching the chase list | 1 | **16** |
| rows with a parsed reference (Davies / Patel / Hale) | 0 / 0 / 0 | 10 / 9 / 23 |

## Measured live, on preview `casebrain-dvpgymf6a`

Captured Papers and CPS Chase for all seven cases; `chase-vs-schedule-check.cjs` reports stated
gaps actually named on the chase board rising from **6 to 13** of 21, with chase items offered
rising from 24 to 41.

Dunn is the clearest case. Before: two generic cards. After, by name:

```
O03 independent witness statement Outstanding Continuity awaited
O04 forensic continuity statement Outstanding Requested from OIC
EX/03 Continuity note Eastmoor Police outstanding
```

## Known follow-ups, not fixed here

1. **`MG6C/002` medical anchor assertion in `scripts/bundle-truth-ledger.test.ts` still fails.**
   It was already failing on this branch before this work. The reference fix incidentally fixed it;
   restricting source-named status to exclude the schedule header and generic clutter labels — which
   `scripts/source-truth-guardian.test.ts` requires — re-broke it. Net position is unchanged from
   the branch baseline, but the incidental fix was lost and the interaction is understood: a card
   whose label reads as schedule chrome can still be the card carrying a real anchor. Filtering
   those cards at the end of the pipeline removes the anchor with them, so the fix belongs at the
   point the guard rewrites the label, not after it.
2. **Davies gains an `MG6 / unused schedule clarification` card** that was not on the board before.
   Substance is a legitimate unused-material ask, but the wording is not sendable.
3. **Davies' `MG6/04 bank source statements` reaches the list offline but not live.** The offline
   harness feeds `frontMatterScan`; the live app passes a longer `bundleText`. That gap between
   harness input and live input needs closing before the next measurement is trusted.
4. `scripts/f167-surgical-truth-opposite-direction.test.ts` line 686 (interview recording versus
   transcript) fails identically before and after this change — pre-existing, untouched.
