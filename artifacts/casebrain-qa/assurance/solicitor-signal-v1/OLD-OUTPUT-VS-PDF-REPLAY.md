# Old output vs the PDF — every changed row, and why it happened

Method: the material normaliser as it stood at `2619fc740` (before the status-truth fix) was
replayed side by side with the version shipped now, over **the exact text CaseBrain analyses**
for each case (`bundle-source` → `frontMatterScan`, the same input the live app uses). Every row
where the two disagree is listed with the PDF page and the printed cells behind it.

- snapshot of the old code: `_replay/old-normalizer-2619fc740.ts`
- harness: `_replay/replay-old-vs-new.ts`
- full row-by-row output: `_replay/REPLAY-OLD-VS-NEW.txt`
- app input text per case: `_replay/app-source/*.app-source.txt`
- PDF reference text: `artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts/*.full.txt`

## Totals

| | |
| --- | --- |
| cases replayed | 7 |
| material rows after the fix | 507 |
| rows whose status moved | 74 |
| **rows falsely marked served** | **10** |
| rows genuinely served that were hidden | 15 |
| rows dropped from the inventory entirely | 42 |

| cluster | rows |
| --- | --- |
| row was dropped entirely (P1) | 42 |
| vague "Not safely confirmed" sharpened to the status the schedule states (P2) | 12 |
| **claimed served, is not (P0)** | **8** |
| status corrected between gap states (P2) | 8 |
| unconfirmed row shown as on file (P1) | 2 |
| row no longer produced | 2 |

## The P0 rows — claimed served, paper says otherwise

Each of these was showing a green **Served / on file** to a solicitor.

| Case | Row as shown | Old | Now | What the PDF prints |
| --- | --- | --- | --- | --- |
| Layla Davies | `MG6/04 bank source statements` | **served** | outstanding | p.7 `MG6/04 \| bank source statements \| Outstanding \| Not in papers supplied` |
| Imani Tobin | `CCTV/3 Body worn video` | **served** | outstanding | p.5 `CCTV/3 \| Body worn video \| not served` |
| Imani Tobin | `BWV/4 Photo still` | **served** | outstanding | p.7 `BWV/4 \| Photo still \| not served` |
| Leon Hale | `Full 999 audio` | **served** | outstanding | row text: "Not yet served. Required to test source" |
| Leon Hale | `Full CAD incident log` | **served** | outstanding | row text: "Not yet served. Required to test source" |
| Leon Hale | `BWV from first attending officers` | **served** | outstanding | row text: "Not yet served. Required to test source" |
| Leon Hale | `Full interview audio/transcript` | **served** | outstanding | row text: "Not yet served. Required to test source" |
| Leon Hale | `Any forensic contamination notes` | **served** | outstanding | row text: "Not yet served. Required to test source" |

Plus two rows that were only ever prose, now dropped rather than shown as service:
Davies `Witnesses ... where served`, Hale `statement when served.`

Five of the eight are on the **murder** case, and every one of them is core material —
999 audio, CAD log, body-worn video, the interview, forensic contamination notes.

## The rows that never appeared at all

Genuinely served material, printed as Served in the schedule, missing from the inventory:

| Case | Row | PDF |
| --- | --- | --- |
| Layla Davies | `MG6/01 custody record extract` | p.7 `Served \| Contained in papers` |
| Layla Davies | `MG6/02 old charge sheet` | p.7 `Served \| Contained in papers` |
| Layla Davies | `MG6/03 bank schedule extract` | p.7 `Served \| Contained in papers` |
| Isaac Patel | `MG6/01 forensic submission note` | p.7 `served \| listed as served` |
| Isaac Patel | `MG6/02 charge sheet` | p.7 `served \| available in bundle` |
| Isaac Patel | `MG6/03 MG5 case summary` | p.7 `served \| available in bundle` |
| Ellis Dunn | `S01 BWV stills` | p.8 `Served \| Included in present papers` |
| Ellis Dunn | `S02 interview summary` | p.8 `Served \| Included in present papers` |
| Ellis Dunn | `S04 CAD incident log extract` | p.8 `Served \| Included in present papers` |
| Ellis Dunn | `S05 CCTV stills` | p.8 `Served \| Included in present papers` |

Real gaps were also being dropped — Davies `MG6/06 analyst certificate` (p.7 Outstanding),
Dunn `O02 CAD log full print` (p.8 `Outstanding | Not yet served`), Dunn `EX/03 Continuity note`
(p.9 outstanding), and ten "Not yet served" items on Hale including the **full pathology report**,
the **knife DNA final report** and the **fingerprint report**.

Davies was inverted end to end: the two rows it called served were both wrong, and all three rows
the schedule actually marks Served were absent.

## The pattern — one cause, three faces

The PDF prints each schedule row as separate cells:

```
MG6/04
bank source statements
Outstanding
Not in papers supplied
```

The app's PDF reader joins them with no space:

```
MG6/04bank source statementsOutstandingNot in papers supplied
```

Every status pattern in the normaliser matches whole words. Once the cells are welded, the status
words are no longer whole words. What happened next depended purely on which word survived with
clean edges:

1. **A positive word survived, negatives did not** → false **served**.
   `Not in papers supplied` — `Not` was welded to `Outstanding`, so only `supplied` had clean
   edges. 10 rows, 8 of them P0.
2. **No status word survived** → the row failed to classify and was **binned**. 42 rows, including
   15 genuinely served ones. This is why Dunn read "0 served" when its schedule marks four items Served.
3. **Only a weak word survived** → row shown as **"Not safely confirmed"** or **"Referred only"**
   instead of the Outstanding the schedule states. 20 rows.

Four weld shapes were found in the real bundles: `statementsOutstandingNot` (capital at the join),
`Photo stillnot served` (no capital), `noteservedavailable` (mid-cell), `pages 3-5outstanding`
(after a digit).

## Why it looked random to a solicitor

**Arden: 0 changed rows. Brookes: 0 changed rows.** Those two PDFs extract with their spaces
intact, so they were never affected. The bug tracked the *shape of the PDF*, not the case, the
charge or the offence family — which is exactly why it felt like CaseBrain was fine one minute and
lying the next.

| Case | rows old → new | served old → new | rows changed |
| --- | --- | --- | --- |
| Layla Davies | 20 → 24 | 2 → 3 | 9 |
| Isaac Patel | 39 → 42 | 2 → 5 | 7 |
| Imani Tobin | 36 → 46 | 3 → 7 | 22 |
| Ellis Dunn | 29 → 40 | 0 → 4 | 12 |
| Leon Hale | 238 → 250 | 13 → 8 | 24 |
| Arden (robbery) | 19 → 19 | 0 → 0 | 0 |
| Taylor Brookes | 86 → 86 | 1 → 1 | 0 |

## Honest limits of this check

- The PDF reference is matched by schedule reference. In **Tobin** the same reference (`CCTV/3`,
  `TEL/5`, `BWV/4`) is printed against several different rows, so three Tobin rows now reading
  `served` or `referred_only` are matched to the right reference but not provably the right row.
  Those need a human eye on page 5 and page 7.
- **Leon Hale's** PDF extract is not in the local corpus, so his rows are checked against the row's
  own wording rather than a page number. That wording is unambiguous — "Not yet served" — but it is
  not a page citation.
- Hale's served count fell 13 → 8, and one of the remaining served rows is a narrative sentence
  ("Presence Accepts being at estate ... CCTV stills were disclosed in limited form"), not a
  schedule row. That is the noise root, still open.
- This covers the **Papers material inventory** only. Overview, Court Position, Client Summary and
  CPS Chase read from the same ledger, so they should follow, but that is not proved here.
