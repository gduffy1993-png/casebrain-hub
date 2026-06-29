# Evidence-State Accuracy Audit — controlled harness report

> **Controlled audit harness run — not solicitor-reviewed real-world audit.**

- Generated: 2026-06-29T17:04:17.196Z
- Harness: evidence-state-audit-v1
- Fixtures: cb-found-2001-ellis, cb-found-2002-smith, cb-found-2003-nguyen, cb-found-2004-clarke, cb-found-2005-okafor, cb-found-2006-carter, cb-found-2007-morrison, cb-fresh-001-taylor-brookes, cb-fresh-002-jordan-hale, crown-court-patterson, fictional-theft-ashleigh-merritt, gbh-pike-jordan-pike, generic-provisional-sam-okonkwo, motoring-thin-ella-shaw, pilot-3-kian-doyle, pilot-3-leon-marsh, pilot-3-marcus-vale, proof-pack-01, s18-charge-reduction-jordan-clarke, sc-00001, sc-00002, sc-00003, sc-00007, sc-00008, sc-00009, sc-0000a, sc-0000b, sc-0000c, sc-0000d, sc-0000e, sc-0000f, sc-00013, sc-00014, sc-00015, sc-00016, sc-00018, sc-00019, sc-0001a, sc-0001b, sc-0001f, sc-00020, sc-00021, sc-00022, sc-00023, sc-00024, sc-00025, sc-00026, sc-00027, sc-0002b, sc-0002c, sc-0002d, sc-0002e, sc-0002f, sc-00030, sc-00031, sc-00032, sc-00033, sc-00037, sc-00038, sc-00039, sc-0003a, sc-0003b, sc-0003c, sc-0003d, sc-0003e, sc-0003f, sc-00043, sc-00044, sc-00045, sc-00046, sc-00047, sc-00048, sc-00049, sc-0004a, sc-0004b, sc-0004f, sc-00050, sc-00051, sc-00052, sc-00054, sc-00055, sc-00056, sc-00057, sc-0005b, sc-0005c, sc-0005d, sc-0005e, sc-00060, sc-00061, sc-00062, sc-00063, sc-00067, sc-00068, sc-00069, sc-0006a, sc-0006b, sc-0006c, sc-0006d, sc-0006e, sc-0006f, sc-00073, sc-00074, sc-00075, sim-001, sim-002, sim-003, sim-004, sim-005, sim-006, sim-007, sim-008, sim-009, sim-010, sim-011, sim-012, sim-013, sim-014, sim-015, sim-016, sim-017, sim-018, sim-019, sim-020, sim-021, sim-022, sim-023, sim-024, sim-025, sim-026, sim-027, sim-028, sim-029, sim-030, sim-031, sim-032, sim-033, sim-034, sim-035, sim-036, sim-037, sim-038, sim-039, sim-040, sim-041, sim-042, sim-043, sim-044, sim-045, sim-046, sim-047, sim-048, sim-049, sim-050, sim-051, sim-052, sim-053, sim-054, sim-055, sim-056, sim-057, sim-058, sim-059, sim-060, sim-061, sim-062, sim-063, sim-064, sim-065, sim-066, sim-067, sim-068, sim-069, sim-070, sim-071, sim-072, sim-073, sim-074, sim-075, sim-076, sim-077, sim-078, sim-079, sim-080, sim-081, sim-082, sim-083, sim-084, sim-085, sim-086, sim-087, sim-088, sim-089, sim-090, sim-091, sim-092, sim-093, sim-094, sim-095, sim-096, sim-097, sim-098, sim-099, sim-100, sim-101, sim-102, sim-103, sim-104, sim-105, sim-106, sim-107, sim-108, sim-109, sim-110, sim-111, sim-112, sim-113, sim-114, sim-115, sim-116, sim-117, sim-118, sim-119, sim-120, sim-121, sim-122, sim-123, sim-124, sim-125, sim-126, sim-127, sim-128, sim-129, sim-130, sim-131, sim-132, sim-133, sim-134, sim-135, sim-136, sim-137, sim-138, sim-139, sim-140, sim-141, sim-142, sim-143, sim-144, sim-145, sim-146, sim-147, sim-148, sim-149, sim-150

## Summary

| Metric | Value |
|--------|-------|
| Total cases | 253 |
| Total evidence items | 2010 |
| Matched items | 1604 |
| Unmatched items | 406 |
| False-served count | 0 |
| False-served rate | 0.0% |
| Referred-only accuracy | 89.9% |
| Missing accuracy | 98.6% |
| Incomplete accuracy | 80.2% |
| Not-safely-confirmed accuracy | 2.4% |
| Unsafe reliance count | 0 |
| Unsafe reliance rate | 0.0% |
| Wrong-defendant bleed count | 0 |
| Wrong-defendant bleed rate | 0.0% |
| Chase accuracy | 86.9% |
| Over-cautious rate | 4.6% |
| Blocking failures | 0 |
| Warnings | 406 |

### Chase mapping breakdown

- Expected chase items (all cases): 1479
- Matched via label/family mapping: 1298
- Unmatched — no chase candidate on surface: 181
- Unmatched — surfaced but wrong/missing family: 0

## Blocking failures

_None detected on this controlled run._

## Warnings

- **served_item_not_surfaced_in_h5** (cb-found-2001-ellis · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **served_item_not_surfaced_in_h5** (cb-found-2002-smith · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **served_item_not_surfaced_in_h5** (cb-found-2003-nguyen · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (cb-found-2003-nguyen · mg5): No CaseBrain prediction matched truth item "mg5"
- **served_item_not_surfaced_in_h5** (cb-found-2004-clarke · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (cb-found-2004-clarke · mg5): No CaseBrain prediction matched truth item "mg5"
- **served_item_not_surfaced_in_h5** (cb-found-2005-okafor · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (cb-found-2005-okafor · mg5): No CaseBrain prediction matched truth item "mg5"
- **served_item_not_surfaced_in_h5** (cb-found-2006-carter · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **served_item_not_surfaced_in_h5** (cb-found-2007-morrison · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **served_item_not_surfaced_in_h5** (cb-fresh-001-taylor-brookes · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (cb-fresh-001-taylor-brookes · mg5): No CaseBrain prediction matched truth item "mg5"
- **served_item_not_surfaced_in_h5** (cb-fresh-002-jordan-hale · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (cb-fresh-002-jordan-hale · mg5): No CaseBrain prediction matched truth item "mg5"
- **served_item_not_surfaced_in_h5** (crown-court-patterson · mg11): Served item "mg11" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (crown-court-patterson · charge sheet): No CaseBrain prediction matched truth item "charge sheet"
- **unmatched_truth_item** (fictional-theft-ashleigh-merritt · charge_sheet): No CaseBrain prediction matched truth item "charge_sheet"
- **unmatched_truth_item** (fictional-theft-ashleigh-merritt · mg5): No CaseBrain prediction matched truth item "mg5"
- **unmatched_truth_item** (gbh-pike-jordan-pike · 999 full): No CaseBrain prediction matched truth item "999 full"
- **unmatched_truth_item** (gbh-pike-jordan-pike · charge sheet): No CaseBrain prediction matched truth item "charge sheet"
- **unmatched_truth_item** (gbh-pike-jordan-pike · custody): No CaseBrain prediction matched truth item "custody"
- **unmatched_truth_item** (gbh-pike-jordan-pike · index): No CaseBrain prediction matched truth item "index"
- **served_item_not_surfaced_in_h5** (generic-provisional-sam-okonkwo · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (generic-provisional-sam-okonkwo · mg5): No CaseBrain prediction matched truth item "mg5"
- **unmatched_truth_item** (generic-provisional-sam-okonkwo · index): No CaseBrain prediction matched truth item "index"
- **unmatched_truth_item** (motoring-thin-ella-shaw · anpr): No CaseBrain prediction matched truth item "anpr"
- **served_item_not_surfaced_in_h5** (motoring-thin-ella-shaw · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (motoring-thin-ella-shaw · mg5): No CaseBrain prediction matched truth item "mg5"
- **unmatched_truth_item** (motoring-thin-ella-shaw · index): No CaseBrain prediction matched truth item "index"
- **served_item_not_surfaced_in_h5** (pilot-3-kian-doyle · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **served_item_not_surfaced_in_h5** (pilot-3-leon-marsh · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **served_item_not_surfaced_in_h5** (pilot-3-marcus-vale · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (proof-pack-01 · Complainant MG11 (signed)): No CaseBrain prediction matched truth item "Complainant MG11 (signed)"
- **unmatched_truth_item** (proof-pack-01 · Exhibit / bundle index): No CaseBrain prediction matched truth item "Exhibit / bundle index"
- **unmatched_truth_item** (proof-pack-01 · Phone screenshots (partial)): No CaseBrain prediction matched truth item "Phone screenshots (partial)"
- **unmatched_truth_item** (proof-pack-01 · Custody / PACE record): No CaseBrain prediction matched truth item "Custody / PACE record"
- **unmatched_truth_item** (proof-pack-01 · MG5 attribution inference): No CaseBrain prediction matched truth item "MG5 attribution inference"
- **unmatched_truth_item** (proof-pack-01 · Co-defendant Lee Marsh interview): No CaseBrain prediction matched truth item "Co-defendant Lee Marsh interview"
- **unmatched_truth_item** (s18-charge-reduction-jordan-clarke · mg11): No CaseBrain prediction matched truth item "mg11"
- **unmatched_truth_item** (s18-charge-reduction-jordan-clarke · mg6 incomplete): No CaseBrain prediction matched truth item "mg6 incomplete"
- **unmatched_truth_item** (s18-charge-reduction-jordan-clarke · charge sheet): No CaseBrain prediction matched truth item "charge sheet"
- **unmatched_truth_item** (s18-charge-reduction-jordan-clarke · mg5): No CaseBrain prediction matched truth item "mg5"
- **unmatched_truth_item** (s18-charge-reduction-jordan-clarke · index): No CaseBrain prediction matched truth item "index"
- **unmatched_truth_item** (sc-00001 · MG5 narrative): No CaseBrain prediction matched truth item "MG5 narrative"
- **unmatched_truth_item** (sc-00001 · cover / index): No CaseBrain prediction matched truth item "cover / index"
- **unmatched_truth_item** (sc-00002 · MG5 narrative): No CaseBrain prediction matched truth item "MG5 narrative"
- **unmatched_truth_item** (sc-00002 · cover / index): No CaseBrain prediction matched truth item "cover / index"
- **unmatched_truth_item** (sc-00002 · additional count sheet): No CaseBrain prediction matched truth item "additional count sheet"
- **unmatched_truth_item** (sc-00003 · cover / index): No CaseBrain prediction matched truth item "cover / index"
- **served_item_not_surfaced_in_h5** (sc-00003 · mg11 witness): Served item "mg11 witness" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- … and 356 more (see report.json)

## Per-case breakdown

### cb-found-2001-ellis — R v Morgan Ellis — foundation SJP

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| CCTV continuity | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | missing | no | over_cautious |

### cb-found-2002-smith — R v Jordan Smith — foundation First appearance

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| full CCTV continuity | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | missing | no | over_cautious |

### cb-found-2003-nguyen — R v Priya Nguyen — foundation First appearance

- Items: 6 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| BWV clip | referred_only | missing | yes | — |
| fuller CAD | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |

### cb-found-2004-clarke — R v Daniel Clarke — foundation First appearance

- Items: 6 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| calibration | referred_only | missing | yes | — |
| analyst material | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |

### cb-found-2005-okafor — R v Amara Okafor — foundation First appearance

- Items: 6 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| lab analysis | referred_only | missing | yes | — |
| search record | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |

### cb-found-2006-carter — R v Liam Carter — foundation First appearance

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| retail CCTV | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | missing | no | over_cautious |

### cb-found-2007-morrison — R v Ella Morrison — foundation First appearance

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| CCTV continuity | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | missing | no | over_cautious |

### cb-fresh-001-taylor-brookes — CB-FRESH-001 Taylor Brookes — harassment / digital

- Items: 8 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg6 | served | provisional | no | over_cautious |
| phone extraction | referred_only | missing | yes | — |
| message export | referred_only | missing | yes | — |
| complainant MG11 | referred_only | missing | yes | — |
| attribution material | missing | missing | yes | — |
| screenshot | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |

### cb-fresh-002-jordan-hale — CB-FRESH-002 Jordan Hale — assault emergency worker / BWV

- Items: 9 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| body-worn video (BWV) | referred_only | provisional | yes | — |
| custody record / PACE material | referred_only | provisional | yes | — |
| body worn video | missing | missing | yes | — |
| full custody record | missing | missing | yes | — |
| complainant MG11 | missing | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |

### crown-court-patterson — R v James Patterson — crown court s18 bundle

- Items: 7 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | — | no | no_prediction_match |
| cctv | referred_only | provisional | yes | — |
| 999 | referred_only | provisional | yes | — |
| medical | referred_only | referred_only | yes | — |
| interview | served | served | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| custody | served | missing | no | over_cautious |

### fictional-theft-ashleigh-merritt — R v Ashleigh Merritt — theft

- Items: 3 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| charge_sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |
| CCTV / continuity material if referred | referred_only | provisional | yes | fuzzy_match:0.60 |

### gbh-pike-jordan-pike — R v Pike — s20 GBH messy disclosure

- Items: 13 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | served | yes | — |
| mg5 | served | missing | no | over_cautious |
| cctv continuity | referred_only | provisional | yes | — |
| full cctv export | referred_only | provisional | yes | fuzzy_match:0.53 |
| medical records | referred_only | missing | yes | — |
| 999 full | referred_only | — | no | no_prediction_match |
| bwv | missing | missing | yes | — |
| forensic report | missing | missing | yes | — |
| cad | served | missing | no | over_cautious |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | missing | no | over_cautious |
| custody | served | — | no | no_prediction_match |
| index | served | — | no | no_prediction_match |

### generic-provisional-sam-okonkwo — R v Sam Okonkwo — perverting the course of justice

- Items: 9 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | served | yes | — |
| mg6 | served | missing | no | over_cautious |
| phone download | referred_only | missing | yes | — |
| message export | referred_only | missing | yes | — |
| defendant interview | referred_only | missing | yes | — |
| unused material | referred_only | missing | yes | — |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |
| index | served | — | no | no_prediction_match |

### motoring-thin-ella-shaw — R v Ella Shaw — motoring thin

- Items: 9 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| dashcam | referred_only | missing | yes | — |
| cctv export | referred_only | missing | yes | — |
| collision expert | referred_only | missing | yes | — |
| full cad | referred_only | missing | yes | — |
| 999 log | missing | missing | yes | — |
| anpr | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |
| index | served | — | no | no_prediction_match |

### pilot-3-kian-doyle — R v Kian Doyle — PWITS hero

- Items: 1 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| charge sheet | served | — | no | no_prediction_match |

### pilot-3-leon-marsh — R v Leon Marsh — robbery / ID hero

- Items: 1 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| charge sheet | served | — | no | no_prediction_match |

### pilot-3-marcus-vale — R v Marcus Vale — fraud hero

- Items: 1 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| charge sheet | served | — | no | no_prediction_match |

### proof-pack-01 — Proof Pack 01 — mixed evidence states (fictional)

- Items: 7 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Complainant MG11 (signed) | served | — | no | no_prediction_match |
| Exhibit / bundle index | served | — | no | no_prediction_match |
| Phone screenshots (partial) | incomplete | — | no | no_prediction_match |
| Body-worn video | referred_only | missing | yes | — |
| Custody / PACE record | missing | — | no | no_prediction_match |
| MG5 attribution inference | inferred_only | — | no | no_prediction_match |
| Co-defendant Lee Marsh interview | other_defendant_only | — | no | no_prediction_match |

### s18-charge-reduction-jordan-clarke — R v Jordan Clarke — s18 charge reduction

- Items: 11 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mg11 | served | — | no | no_prediction_match |
| mg6 incomplete | referred_only | — | no | no_prediction_match |
| cctv continuity | referred_only | provisional | yes | — |
| full cctv export | referred_only | incomplete | no | — |
| medical | served | referred_only | no | over_cautious |
| forensic | served | incomplete | no | — |
| interview | served | provisional | no | over_cautious |
| charge sheet | served | — | no | no_prediction_match |
| mg5 | served | — | no | no_prediction_match |
| custody | served | incomplete | no | — |
| index | served | — | no | no_prediction_match |

### sc-00001 — R v Jordan Blake — fraud_account_control corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | other_defendant_only | no | fuzzy_match:0.75 |
| charge sheet | served | incomplete | no | — |

### sc-00002 — R v Sam Okonkwo — pwits_phone corpus

- Items: 14 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00003 — R v Ella Shaw — robbery_id corpus

- Items: 15 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00007 — R v Morgan Drew — fraud_account_control corpus

- Items: 12 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-00008 — R v Riley Chen — pwits_phone corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00009 — R v Taylor Brooks — robbery_id corpus

- Items: 13 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-0000a — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0000b — R v Jamie Patel — generic_provisional corpus

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Core witness statements | referred_only | missing | yes | — |
| Exhibit continuity | referred_only | missing | yes | — |
| Full disclosure schedule | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 case summary not served | referred_only | missing | yes | — |
| MG5 narrative | referred_only | missing | yes | fuzzy_match:0.53 |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0000c — R v Alex Mercer — motoring corpus

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0000d — R v Jordan Blake — fraud_account_control corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0000e — R v Sam Okonkwo — pwits_phone corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0000f — R v Ella Shaw — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00013 — R v Morgan Drew — fraud_account_control corpus

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | other_defendant_only | no | fuzzy_match:0.75 |
| charge sheet | served | — | no | no_prediction_match |

### sc-00014 — R v Riley Chen — pwits_phone corpus

- Items: 14 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00015 — R v Taylor Brooks — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00016 — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| charge sheet | served | incomplete | no | — |

### sc-00018 — R v Alex Mercer — motoring corpus

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00019 — R v Jordan Blake — fraud_account_control corpus

- Items: 11 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0001a — R v Sam Okonkwo — pwits_phone corpus

- Items: 14 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0001b — R v Ella Shaw — robbery_id corpus

- Items: 14 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-0001f — R v Morgan Drew — fraud_account_control corpus

- Items: 12 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-00020 — R v Riley Chen — pwits_phone corpus

- Items: 14 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00021 — R v Taylor Brooks — robbery_id corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00022 — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 14 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00023 — R v Jamie Patel — generic_provisional corpus

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Core witness statements | referred_only | missing | yes | — |
| Exhibit continuity | referred_only | missing | yes | — |
| Full disclosure schedule | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00024 — R v Alex Mercer — motoring corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00025 — R v Jordan Blake — fraud_account_control corpus

- Items: 13 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| additional count sheet | served | — | no | no_prediction_match |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00026 — R v Sam Okonkwo — pwits_phone corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Lab continuity / chain note outstanding | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| charge sheet | served | incomplete | no | — |

### sc-00027 — R v Ella Shaw — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0002b — R v Morgan Drew — fraud_account_control corpus

- Items: 13 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0002c — R v Riley Chen — pwits_phone corpus

- Items: 14 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| Lab continuity / chain note outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0002d — R v Taylor Brooks — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0002e — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 13 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-0002f — R v Jamie Patel — generic_provisional corpus

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Core witness statements | referred_only | missing | yes | — |
| Exhibit continuity | referred_only | missing | yes | — |
| Full disclosure schedule | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 case summary not served | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | missing | yes | fuzzy_match:0.53 |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00030 — R v Alex Mercer — motoring corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| charge sheet | served | incomplete | no | — |

### sc-00031 — R v Jordan Blake — fraud_account_control corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | other_defendant_only | no | fuzzy_match:0.75 |
| charge sheet | served | incomplete | no | — |

### sc-00032 — R v Sam Okonkwo — pwits_phone corpus

- Items: 15 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00033 — R v Ella Shaw — robbery_id corpus

- Items: 13 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-00037 — R v Morgan Drew — fraud_account_control corpus

- Items: 12 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-00038 — R v Riley Chen — pwits_phone corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00039 — R v Taylor Brooks — robbery_id corpus

- Items: 13 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0003a — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| charge sheet | served | incomplete | no | — |

### sc-0003b — R v Jamie Patel — generic_provisional corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Core witness statements | referred_only | missing | yes | — |
| Exhibit continuity | referred_only | missing | yes | — |
| Full disclosure schedule | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0003c — R v Alex Mercer — motoring corpus

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0003d — R v Jordan Blake — fraud_account_control corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0003e — R v Sam Okonkwo — pwits_phone corpus

- Items: 14 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-0003f — R v Ella Shaw — robbery_id corpus

- Items: 13 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-00043 — R v Morgan Drew — fraud_account_control corpus

- Items: 13 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| co-defendant mg5 | served | other_defendant_only | no | fuzzy_match:0.75 |
| charge sheet | served | incomplete | no | — |

### sc-00044 — R v Riley Chen — pwits_phone corpus

- Items: 14 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-00045 — R v Taylor Brooks — robbery_id corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| charge sheet | served | incomplete | no | — |

### sc-00046 — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 13 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00047 — R v Jamie Patel — generic_provisional corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Core witness statements | referred_only | missing | yes | — |
| Exhibit continuity | referred_only | missing | yes | — |
| Full disclosure schedule | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| charge sheet | served | incomplete | no | — |

### sc-00048 — R v Alex Mercer — motoring corpus

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00049 — R v Jordan Blake — fraud_account_control corpus

- Items: 12 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0004a — R v Sam Okonkwo — pwits_phone corpus

- Items: 13 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Lab continuity / chain note outstanding | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-0004b — R v Ella Shaw — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0004f — R v Morgan Drew — fraud_account_control corpus

- Items: 12 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |

### sc-00050 — R v Riley Chen — pwits_phone corpus

- Items: 15 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Lab continuity / chain note outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00051 — R v Taylor Brooks — robbery_id corpus

- Items: 14 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00052 — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 15 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| Lab continuity / chain note outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00054 — R v Alex Mercer — motoring corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00055 — R v Jordan Blake — fraud_account_control corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | other_defendant_only | no | fuzzy_match:0.75 |
| charge sheet | served | incomplete | no | — |

### sc-00056 — R v Sam Okonkwo — pwits_phone corpus

- Items: 13 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-00057 — R v Ella Shaw — robbery_id corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0005b — R v Morgan Drew — fraud_account_control corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0005c — R v Riley Chen — pwits_phone corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| Lab continuity / chain note outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0005d — R v Taylor Brooks — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0005e — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00060 — R v Alex Mercer — motoring corpus

- Items: 12 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-00061 — R v Jordan Blake — fraud_account_control corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00062 — R v Sam Okonkwo — pwits_phone corpus

- Items: 14 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-00063 — R v Ella Shaw — robbery_id corpus

- Items: 14 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CAD summary without full CAD log | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00067 — R v Morgan Drew — fraud_account_control corpus

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00068 — R v Riley Chen — pwits_phone corpus

- Items: 14 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00069 — R v Taylor Brooks — robbery_id corpus

- Items: 12 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-0006a — R v Casey Quinn — violence_gbh_s18 corpus

- Items: 13 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV export and continuity | referred_only | missing | yes | — |
| Full 999/CAD | referred_only | missing | yes | — |
| Body worn video | referred_only | missing | yes | — |
| Medical / expert report | referred_only | missing | yes | — |
| 999 summary without audio recording | referred_only | missing | yes | — |
| MG5 narrative | referred_only | incomplete | no | — |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0006b — R v Jamie Patel — generic_provisional corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Core witness statements | referred_only | missing | yes | — |
| Exhibit continuity | referred_only | missing | yes | — |
| Full disclosure schedule | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 case summary not served | referred_only | missing | yes | — |
| MG5 narrative | referred_only | missing | yes | fuzzy_match:0.53 |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-0006c — R v Alex Mercer — motoring corpus

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Dashcam / CCTV master | referred_only | missing | yes | — |
| Full CAD log | referred_only | missing | yes | — |
| Collision expert report | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0006d — R v Jordan Blake — fraud_account_control corpus

- Items: 11 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG6 schedule incomplete | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-0006e — R v Sam Okonkwo — pwits_phone corpus

- Items: 13 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | — | no | no_prediction_match |

### sc-0006f — R v Ella Shaw — robbery_id corpus

- Items: 14 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV partial extract only | referred_only | incomplete | no | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | missing | no | over_cautious |
| co-defendant mg5 | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00073 — R v Morgan Drew — fraud_account_control corpus

- Items: 12 · matched 9 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full bank export / source statements | referred_only | missing | yes | — |
| Device / login audit material | referred_only | missing | yes | — |
| Mailbox export | referred_only | missing | yes | — |
| Custody / PACE material limited on export | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| additional count sheet | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |

### sc-00074 — R v Riley Chen — pwits_phone corpus

- Items: 14 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full phone extraction | referred_only | missing | yes | — |
| Phone attribution / ownership material | referred_only | missing | yes | — |
| Search BWV export | referred_only | missing | yes | — |
| Drug lab continuity note | referred_only | missing | yes | — |
| Body worn video download outstanding | referred_only | missing | yes | — |
| Interview summary without full transcript | referred_only | missing | yes | — |
| Phone/device attribution material outstanding | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | provisional | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sc-00075 — R v Taylor Brooks — robbery_id corpus

- Items: 12 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Full CCTV master footage | referred_only | missing | yes | — |
| CCTV continuity / export log | referred_only | missing | yes | — |
| ID procedure material | referred_only | missing | yes | — |
| 999 / CAD timing material | referred_only | missing | yes | — |
| CCTV stills without master export log | referred_only | missing | yes | — |
| MG5 narrative | referred_only | — | no | no_prediction_match |
| cover / index | served | — | no | no_prediction_match |
| charge sheet | served | incomplete | no | — |
| mg6 | served | missing | no | over_cautious |
| mg11 officer | served | incomplete | no | — |
| mg11 witness | served | incomplete | no | — |
| charge sheet | served | incomplete | no | — |

### sim-001 — Harassment — screenshots only

- Items: 3 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| subscriber data | missing | missing | yes | — |
| message export | missing | missing | yes | — |
| call logs | missing | missing | yes | — |

### sim-002 — Harassment — wrong second male

- Items: 1 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| second male mentioned | not_safely_confirmed | — | no | no_prediction_match |

### sim-003 — AEW — BWV referred only

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| BWV | referred_only | missing | yes | — |

### sim-004 — AEW — custody/PACE missing

- Items: 3 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| custody mention | referred_only | missing | yes | — |
| full custody record | missing | missing | yes | — |
| interview recording | missing | missing | yes | — |

### sim-005 — Domestic assault — unsigned MG11

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG11 draft | referred_only | missing | yes | — |

### sim-006 — s18 — medical referred only

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| medical evidence | referred_only | missing | yes | — |

### sim-007 — s20 — unsafe win wording trap

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-008 — PWITS — missing continuity

- Items: 3 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| continuity | missing | missing | yes | — |
| lab report | missing | missing | yes | — |
| exhibit list | missing | missing | yes | — |

### sim-009 — Possession — PWITS index bleed

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-010 — Fraud — bank schedule absent

- Items: 2 · matched 2 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| bank schedules | missing | missing | yes | — |
| device extraction | missing | missing | yes | — |

### sim-011 — Perverting justice — fraud bleed

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-012 — Robbery — CCTV missing

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV | referred_only | missing | yes | — |

### sim-013 — Robbery — mixed defendant names

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| witness names conflict | not_safely_confirmed | incomplete | no | — |

### sim-014 — Motoring SJP thin bundle

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-015 — Motoring — fraud word bleed

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-016 — Sexual — ABE referred only

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| ABE interview | referred_only | missing | yes | — |

### sim-017 — Youth/vulnerability marker

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-018 — OCR-poor scanned MG6

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-019 — Weird index only

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| indexed material | referred_only | missing | yes | — |

### sim-020 — Duplicate conflicting MG11s

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two MG11 versions | not_safely_confirmed | incomplete | no | — |

### sim-021 — Conflicting hearing dates

- Items: 1 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| hearing date conflict | not_safely_confirmed | — | no | no_prediction_match |

### sim-022 — Mixed offences in one PDF

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-023 — Police jargon only

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-024 — Missing MG6 — chase still needed

- Items: 2 · matched 2 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG6 | missing | missing | yes | — |
| unused schedule detail | missing | missing | yes | — |

### sim-025 — BWV stills only

- Items: 2 · matched 2 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| BWV stills/screenshots | served | incomplete | no | — |
| full BWV export | missing | missing | yes | — |

### sim-026 — Custody extract only

- Items: 3 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| custody extract | served | incomplete | no | — |
| full custody log | missing | missing | yes | — |
| interview recording | missing | missing | yes | — |

### sim-027 — Large complex fraud

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-028 — Expert report mentioned only

- Items: 1 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| expert report | referred_only | missing | yes | — |

### sim-029 — Bad metadata placeholder charge

- Items: 1 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| placeholder offence in metadata | not_safely_confirmed | — | no | no_prediction_match |

### sim-030 — Late evidence re-run (future)

- Items: 0 · matched 0 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|

### sim-031 — EncroChat — handle attribution disputed

- Items: 9 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| EncroChat message extracts (partial) | served | incomplete | no | — |
| screenshot pages from platform export | served | incomplete | no | — |
| full encrypted platform extraction | referred_only | missing | yes | — |
| handle-to-user mapping certificate | referred_only | missing | yes | — |
| device/user attribution certificate | missing | missing | yes | — |
| extraction continuity log | missing | missing | yes | — |
| co-defendant chat segregation schedule | missing | other_defendant_only | no | fuzzy_match:0.75 |
| co-defendant messages on shared thread | not_safely_confirmed | — | no | no_prediction_match |
| handle nickname overlap | not_safely_confirmed | — | no | no_prediction_match |

### sim-032 — County lines — line/role unclear

- Items: 9 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| phone seizure notes | served | incomplete | no | — |
| partial message screenshots | served | incomplete | no | — |
| cellsite/travel data summary | referred_only | missing | yes | — |
| line attribution material | missing | missing | yes | — |
| cash/drug continuity | missing | missing | yes | — |
| full cellsite download | missing | missing | yes | — |
| role evidence schedule | missing | missing | yes | — |
| exploitation/modern slavery vulnerability marker | not_safely_confirmed | — | no | no_prediction_match |
| runner vs holder role | not_safely_confirmed | — | no | no_prediction_match |

### sim-033 — Multi-defendant drug conspiracy PWITS

- Items: 10 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| message excerpts relating to Samira Khan only | served | incomplete | no | — |
| partial exhibit list | served | incomplete | no | — |
| telecom source downloads | referred_only | missing | yes | — |
| lab analysis summary | referred_only | missing | yes | — |
| per-defendant exhibit map | missing | missing | yes | — |
| continuity for each co-defendant | missing | other_defendant_only | no | fuzzy_match:0.75 |
| telecom/subscriber downloads | missing | missing | yes | — |
| full lab report | missing | missing | yes | — |
| supply chain inferred from group chat | not_safely_confirmed | — | no | no_prediction_match |
| co-defendant A message attribution | not_safely_confirmed | — | no | no_prediction_match |

### sim-034 — Multi-handed assault — participation unclear

- Items: 8 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| BWV stills | served | served | yes | — |
| partial CCTV stills | served | incomplete | no | — |
| full BWV export | referred_only | missing | yes | — |
| CCTV master footage | referred_only | missing | yes | — |
| ID procedure material | missing | missing | yes | — |
| participation/association evidence | missing | missing | yes | — |
| conflicting witness accounts | not_safely_confirmed | incomplete | no | — |
| second male participation | not_safely_confirmed | incomplete | no | — |

### sim-035 — Robbery — CCTV stills, master missing

- Items: 7 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV stills (poor quality) | served | served | yes | — |
| partial scene photos | served | incomplete | no | — |
| CCTV master footage reference | referred_only | missing | yes | — |
| CCTV master full time window | missing | missing | yes | — |
| VIPER/ID procedure material | missing | missing | yes | — |
| continuity log | missing | missing | yes | — |
| identification from stills only | not_safely_confirmed | — | no | no_prediction_match |

### sim-036 — Historic sexual — ABE referred, delay context

- Items: 8 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary only | served | incomplete | no | — |
| ABE interview recording | referred_only | missing | yes | — |
| third-party school/medical records mention | referred_only | missing | yes | — |
| first complainant account/MG11 | missing | missing | yes | — |
| third-party records | missing | missing | yes | — |
| delay/context material | missing | missing | yes | — |
| historic delay context | not_safely_confirmed | — | no | no_prediction_match |
| complainant first account timing | not_safely_confirmed | missing | yes | fuzzy_match:0.57 |

### sim-037 — Phone download — screenshots only, scope missing

- Items: 8 · matched 8 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| message screenshots | served | incomplete | no | — |
| photo pages from handset | served | incomplete | no | — |
| full handset download summary mention | referred_only | missing | yes | — |
| full phone extraction download | missing | missing | yes | — |
| extraction metadata | missing | missing | yes | — |
| search terms/scope schedule | missing | missing | yes | — |
| continuity certificate | missing | missing | yes | — |
| attribution/context of screenshots | not_safely_confirmed | incomplete | no | — |

### sim-038 — EncroChat handle attribution disputed with co-defendant bleed risk

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary | served | served | yes | — |
| schedule of alleged Encro handles | served | served | yes | — |
| two MG11 officer statements | served | served | yes | — |
| full extraction report | referred_only | missing | yes | — |
| handle attribution report | referred_only | missing | yes | — |
| co-defendant chat export | other_defendant_only | other_defendant_only | yes | — |
| device attribution evidence | missing | missing | yes | — |
| download continuity | missing | missing | yes | — |
| cellsite linking defendant to device | missing | missing | yes | — |
| expert methodology | missing | missing | yes | — |
| whether the handle is personal, shared, or inferred from contact names | inferred_only | — | no | no_prediction_match |

### sim-039 — EncroChat extraction continuity and cropped-message trap

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| cropped message screenshots | incomplete | incomplete | yes | — |
| officer exhibit list | served | incomplete | no | — |
| full extraction | referred_only | missing | yes | — |
| hash values | referred_only | missing | yes | — |
| translation/interpretation note | referred_only | missing | yes | — |
| complete conversation thread | missing | missing | yes | — |
| metadata | missing | missing | yes | — |
| export audit trail | missing | missing | yes | — |
| exhibit continuity statement | missing | missing | yes | — |
| whether screenshots are complete, edited, or selected | not_safely_confirmed | incomplete | no | — |

### sim-040 — County lines cellsite and travel gaps

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| arrest circumstances | served | served | yes | — |
| drug seizure statement | served | served | yes | — |
| cellsite schedule | referred_only | missing | yes | — |
| phone download | referred_only | missing | yes | — |
| line attribution note | referred_only | missing | yes | — |
| cellsite map | missing | missing | yes | — |
| train/bus ticket evidence | missing | missing | yes | — |
| full phone extraction | missing | missing | yes | — |
| county line call data | missing | missing | yes | — |
| whether the defendant controlled the line or was merely present | not_safely_confirmed | — | no | no_prediction_match |

### sim-041 — County lines vulnerability and modern slavery marker

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| custody summary | served | served | yes | — |
| drug expert statement | served | served | yes | — |
| NRM referral | referred_only | missing | yes | — |
| youth offending team note | referred_only | missing | yes | — |
| social care record | referred_only | missing | yes | — |
| NRM referral outcome | missing | missing | yes | — |
| appropriate adult notes | missing | missing | yes | — |
| safeguarding chronology | missing | missing | yes | — |
| phone attribution | missing | missing | yes | — |
| whether exploitation is evidenced or only mentioned | not_safely_confirmed | — | no | no_prediction_match |

### sim-042 — Multi-defendant drug conspiracy per-defendant evidence map

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| indictment draft | served | incomplete | no | — |
| selected surveillance log | served | incomplete | no | — |
| co-defendant interview summary | other_defendant_only | other_defendant_only | yes | — |
| full surveillance schedule | referred_only | missing | yes | — |
| telecoms attribution | referred_only | missing | yes | — |
| banking schedule | referred_only | missing | yes | — |
| per-defendant evidence matrix | missing | missing | yes | — |
| full telecoms schedule | missing | missing | yes | — |
| unused material schedule | missing | missing | yes | — |
| surveillance continuity | missing | missing | yes | — |
| which exhibits relate to Omar rather than co-defendants | not_safely_confirmed | — | no | no_prediction_match |

### sim-043 — Drug conspiracy telecoms download missing but summary confident

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| analyst summary | served | — | no | no_prediction_match |
| one call schedule extract | served | — | no | no_prediction_match |
| full call data | referred_only | missing | yes | — |
| download report | referred_only | missing | yes | — |
| cellsite analysis | referred_only | missing | yes | — |
| raw call data | missing | missing | yes | — |
| download search terms | missing | missing | yes | — |
| cellsite maps | missing | missing | yes | — |
| analyst working notes | missing | missing | yes | — |
| whether contact frequency proves supply or ordinary association | not_safely_confirmed | — | no | no_prediction_match |

### sim-044 — Multi-handed assault presence versus participation

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 | served | served | yes | — |
| arresting officer MG11 | served | served | yes | — |
| CCTV | referred_only | referred_only | yes | — |
| body-worn video | referred_only | referred_only | yes | — |
| medical photographs | referred_only | missing | yes | — |
| full CCTV export | missing | missing | yes | — |
| BWV | missing | missing | yes | — |
| medical notes | missing | missing | yes | — |
| scene timeline | missing | missing | yes | — |
| whether Imran struck anyone or was merely present | inferred_only | — | no | no_prediction_match |

### sim-045 — Joint-enterprise violence with partial BWV

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| victim statement | served | served | yes | — |
| short BWV clip transcript | incomplete | incomplete | yes | — |
| full BWV export | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| medical report | referred_only | missing | yes | — |
| complete BWV | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| medical report | missing | missing | yes | — |
| co-defendant interview records | other_defendant_only | other_defendant_only | yes | — |
| whether Leah encouraged, assisted, withdrew, or was present only | inferred_only | — | no | no_prediction_match |

### sim-046 — Robbery CCTV stills only and poor-quality identification

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 | served | served | yes | — |
| CCTV stills | incomplete | incomplete | yes | — |
| full CCTV | referred_only | missing | yes | — |
| CCTV continuity statement | referred_only | missing | yes | — |
| ID procedure record | referred_only | missing | yes | — |
| full CCTV export | missing | missing | yes | — |
| image-quality note | missing | missing | yes | — |
| ID procedure record | missing | missing | yes | — |
| time-window footage | missing | missing | yes | — |
| whether stills fairly represent the footage | not_safely_confirmed | incomplete | no | — |

### sim-047 — Robbery full time-window CCTV missing

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| short CCTV clip description | served | incomplete | no | — |
| victim statement | served | served | yes | — |
| full premises CCTV | referred_only | missing | yes | — |
| street CCTV | referred_only | missing | yes | — |
| CAD/999 call | referred_only | missing | yes | — |
| full CCTV time-window | missing | missing | yes | — |
| approach/departure footage | missing | missing | yes | — |
| continuity logs | missing | missing | yes | — |
| 999 audio | missing | provisional | yes | — |
| whether wider footage undermines identification or timing | not_safely_confirmed | incomplete | no | — |

### sim-048 — Historic sexual allegation with ABE referred only and delay issue

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 summary | served | served | yes | — |
| charge sheet | served | served | yes | — |
| ABE interview | referred_only | missing | yes | — |
| first complaint record | referred_only | missing | yes | — |
| school/social records | referred_only | missing | yes | — |
| ABE video/transcript | missing | missing | yes | — |
| first account material | missing | missing | yes | — |
| third-party records schedule | missing | missing | yes | — |
| disclosure officer note | missing | missing | yes | — |
| whether delay/context material is served or only mentioned | not_safely_confirmed | incomplete | no | — |

### sim-049 — Historic sexual third-party records mentioned but absent

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| police disclosure summary | served | served | yes | — |
| complainant statement | served | served | yes | — |
| counselling records | referred_only | missing | yes | — |
| school records | referred_only | missing | yes | — |
| GP records | referred_only | missing | yes | — |
| third-party record schedule | missing | missing | yes | — |
| disclosure decision log | missing | missing | yes | — |
| applications/correspondence | missing | missing | yes | — |
| ABE transcript | missing | missing | yes | — |
| whether third-party records have been obtained, reviewed, or withheld | not_safely_confirmed | — | no | no_prediction_match |

### sim-050 — Phone download screenshots only with missing scope and metadata

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| complainant screenshots | incomplete | incomplete | yes | — |
| short officer statement | served | served | yes | — |
| phone download | referred_only | missing | yes | — |
| exhibit metadata | referred_only | missing | yes | — |
| device audit log | referred_only | missing | yes | — |
| full phone download | missing | missing | yes | — |
| search terms/scope | missing | missing | yes | — |
| metadata | missing | missing | yes | — |
| device ownership/continuity | missing | missing | yes | — |
| whether messages are complete, attributed, or taken out of context | not_safely_confirmed | — | no | no_prediction_match |

### sim-051 — Phone extraction continuity and search terms unclear

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| digital summary table | served | served | yes | — |
| seizure statement | served | served | yes | — |
| full extraction report | referred_only | missing | yes | — |
| forensic image hash | referred_only | missing | yes | — |
| search terms | referred_only | missing | yes | — |
| full extraction report | missing | missing | yes | — |
| hash values | missing | missing | yes | — |
| forensic methodology | missing | missing | yes | — |
| search scope | missing | missing | yes | — |
| device-user attribution | missing | missing | yes | — |
| whether files were viewed, stored, cached, or attributable to the defendant | not_safely_confirmed | — | no | no_prediction_match |

### sim-052 — ABH medical evidence referred only

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant statement | served | served | yes | — |
| photos index | served | served | yes | — |
| medical notes | referred_only | missing | yes | — |
| injury photographs | referred_only | missing | yes | — |
| doctor statement | referred_only | missing | yes | — |
| medical records | missing | missing | yes | — |
| photographs | missing | missing | yes | — |
| doctor statement | missing | missing | yes | — |
| injury continuity | missing | missing | yes | — |
| whether injuries meet ABH threshold | not_safely_confirmed | — | no | no_prediction_match |

### sim-053 — Section 18 versus section 20 intent trap

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| victim MG11 | served | served | yes | — |
| charge sheet | served | served | yes | — |
| medical report | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| 999 call | referred_only | missing | yes | — |
| medical report | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| intent-specific evidence | missing | missing | yes | — |
| weapon/source continuity | missing | missing | yes | — |
| whether specific intent can be supported on the served papers | not_safely_confirmed | — | no | no_prediction_match |

### sim-054 — Affray or violent disorder mixed participants

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| two civilian statements | served | — | no | no_prediction_match |
| police arrest summary | served | — | no | no_prediction_match |
| CCTV | referred_only | provisional | yes | — |
| BWV | referred_only | provisional | yes | — |
| scene plan | referred_only | missing | yes | — |
| CCTV/BWV | missing | missing | yes | — |
| participant timeline | missing | missing | yes | — |
| scene plan | missing | missing | yes | — |
| identification schedule | missing | missing | yes | — |
| whether Sasha used or threatened violence | inferred_only | — | no | no_prediction_match |

### sim-055 — Police contact public order with BWV and custody sequence gaps

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| officer MG11 | served | served | yes | — |
| custody summary extract | served | incomplete | no | — |
| BWV | referred_only | provisional | yes | — |
| full custody record | referred_only | missing | yes | — |
| PACE interview recording | referred_only | missing | yes | — |
| BWV export | missing | missing | yes | — |
| full custody record | missing | missing | yes | — |
| risk assessment | missing | missing | yes | — |
| interview recording | missing | provisional | yes | — |
| use-of-force record | missing | missing | yes | — |
| sequence before arrest and defendant condition | not_safely_confirmed | — | no | no_prediction_match |

### sim-056 — Burglary forensic fingerprint referred only

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| victim statement | served | served | yes | — |
| scene officer statement | served | served | yes | — |
| fingerprint report | referred_only | missing | yes | — |
| forensic continuity | referred_only | missing | yes | — |
| CCTV | referred_only | provisional | yes | — |
| fingerprint report | missing | missing | yes | — |
| continuity records | missing | missing | yes | — |
| scene photographs | missing | missing | yes | — |
| CCTV | missing | provisional | yes | — |
| whether any forensic evidence links Harvey to entry or only presence | not_safely_confirmed | incomplete | no | — |

### sim-057 — Handling stolen goods property continuity gap

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| owner statement | served | served | yes | — |
| seizure note | served | served | yes | — |
| property register | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| forensic report | referred_only | missing | yes | — |
| property continuity log | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| valuation/proof of theft | missing | missing | yes | — |
| knowledge evidence | missing | missing | yes | — |
| whether item is the stolen property and whether Aimee knew | not_safely_confirmed | — | no | no_prediction_match |

### sim-058 — Going equipped tool possession and lawful purpose trap

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| seizure statement | served | served | yes | — |
| charge sheet | served | served | yes | — |
| BWV | referred_only | missing | yes | — |
| CCTV | referred_only | provisional | yes | — |
| tool photographs | referred_only | missing | yes | — |
| BWV | missing | missing | yes | — |
| CCTV | missing | provisional | yes | — |
| tool photographs | referred_only | missing | yes | — |
| interview record | missing | provisional | yes | — |
| lawful-purpose context | missing | missing | yes | — |
| whether possession was for theft or innocent work/use | inferred_only | — | no | no_prediction_match |

### sim-059 — Drink driving intoxilyzer calibration missing

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| breath result summary | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| MGDD procedure form | referred_only | missing | yes | — |
| device calibration/check record | referred_only | missing | yes | — |
| custody record | referred_only | provisional | yes | — |
| MGDD form | missing | missing | yes | — |
| calibration/check record | missing | missing | yes | — |
| custody/PACE record | missing | missing | yes | — |
| officer statement | missing | missing | yes | — |
| whether procedure and device checks are proved | not_safely_confirmed | — | no | no_prediction_match |

### sim-060 — Drug driving lab and toxicology chain missing

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| custody extract | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| toxicology certificate | referred_only | missing | yes | — |
| blood continuity | referred_only | missing | yes | — |
| MGDD procedure form | referred_only | missing | yes | — |
| toxicology certificate | missing | missing | yes | — |
| sample continuity | missing | missing | yes | — |
| MGDD form | missing | missing | yes | — |
| lab method/accreditation | missing | missing | yes | — |
| whether sample chain and result are admissibly proved | not_safely_confirmed | — | no | no_prediction_match |

### sim-061 — Failure to provide specimen procedure and BWV gaps

- Items: 13 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| officer MG11 | served | served | yes | — |
| charge sheet | served | served | yes | — |
| MGDD form | referred_only | missing | yes | — |
| BWV | referred_only | provisional | yes | — |
| custody record | referred_only | provisional | yes | — |
| medical note | referred_only | missing | yes | — |
| MGDD form | missing | missing | yes | — |
| BWV | missing | provisional | yes | — |
| full custody record | missing | provisional | yes | — |
| medical/fitness note | missing | missing | yes | — |
| warning wording | missing | missing | yes | — |
| whether refusal/warning/reasonable excuse is properly evidenced | not_safely_confirmed | — | no | no_prediction_match |

### sim-062 — No insurance driver identity and keeper trap

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| SJP notice | served | — | no | no_prediction_match |
| vehicle keeper record | served | — | no | no_prediction_match |
| insurance database printout | served | — | no | no_prediction_match |
| police stop BWV | referred_only | missing | yes | — |
| driver admission | referred_only | missing | yes | — |
| policy correspondence | referred_only | missing | yes | — |
| BWV/stop evidence | missing | missing | yes | — |
| driver admission/interview | missing | missing | yes | — |
| insurance policy/cancellation notice | missing | missing | yes | — |
| proof of use | missing | missing | yes | — |
| whether Meera was the driver and whether insurance status is correctly evidenced | inferred_only | — | no | no_prediction_match |

### sim-063 — Benefit fraud agency records missing

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| DWP summary | served | incomplete | no | — |
| interview summary | incomplete | incomplete | yes | — |
| benefit claim records | referred_only | missing | yes | — |
| notification logs | referred_only | missing | yes | — |
| overpayment calculation | referred_only | missing | yes | — |
| full claim history | missing | missing | yes | — |
| notification logs | missing | missing | yes | — |
| overpayment calculation | missing | missing | yes | — |
| interview recording/transcript | missing | provisional | yes | — |
| knowledge, dishonesty, and calculation basis | inferred_only | — | no | no_prediction_match |

### sim-064 — Money laundering bank/source schedule missing

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| financial investigator summary | served | — | no | no_prediction_match |
| bank schedule extract | served | — | no | no_prediction_match |
| full bank statements | referred_only | missing | yes | — |
| source-of-funds analysis | referred_only | missing | yes | — |
| POCA statement | referred_only | missing | yes | — |
| full statements | missing | missing | yes | — |
| source analysis | missing | missing | yes | — |
| exhibit continuity | missing | missing | yes | — |
| spreadsheet formula/source data | missing | missing | yes | — |
| whether funds are criminal property and whether defendant knew/suspected | not_safely_confirmed | — | no | no_prediction_match |

### sim-065 — False documents provenance expert mentioned only

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| seizure statement | served | served | yes | — |
| document photo | served | served | yes | — |
| document examiner report | referred_only | missing | yes | — |
| immigration/status records | referred_only | missing | yes | — |
| interview recording | referred_only | provisional | yes | — |
| expert/document examiner report | missing | missing | yes | — |
| provenance chain | missing | missing | yes | — |
| interview recording | missing | provisional | yes | — |
| status/context records | missing | missing | yes | — |
| knowledge, improper intention, and document status | not_safely_confirmed | — | no | no_prediction_match |

### sim-066 — Perverting justice route bleed from fraud-document paperwork

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| email exhibit summary | incomplete | — | no | no_prediction_match |
| full email export | referred_only | missing | yes | — |
| case chronology | referred_only | missing | yes | — |
| police decision log | referred_only | missing | yes | — |
| full email export | missing | missing | yes | — |
| chronology | missing | missing | yes | — |
| intention evidence | missing | missing | yes | — |
| exhibit continuity | missing | missing | yes | — |
| intent to pervert justice versus administrative/document confusion | inferred_only | — | no | no_prediction_match |

### sim-067 — Bladed article reasonable excuse and location continuity

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| seizure statement | served | served | yes | — |
| charge sheet | served | served | yes | — |
| BWV | referred_only | provisional | yes | — |
| CCTV | referred_only | provisional | yes | — |
| knife photographs | referred_only | missing | yes | — |
| BWV/CCTV | missing | missing | yes | — |
| location plan | missing | missing | yes | — |
| photographs/measurements | missing | missing | yes | — |
| interview/reasonable excuse account | missing | missing | yes | — |
| public place, possession, and reasonable excuse | not_safely_confirmed | — | no | no_prediction_match |

### sim-068 — Imitation firearm forensic/source report missing

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant statement | served | served | yes | — |
| item photograph | served | served | yes | — |
| firearms officer report | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| 999 call | referred_only | missing | yes | — |
| firearms/imitation report | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| 999 audio | missing | provisional | yes | — |
| item continuity | missing | missing | yes | — |
| intent/source context | missing | missing | yes | — |
| whether item meets definition and whether intent is evidenced | not_safely_confirmed | — | no | no_prediction_match |

### sim-069 — Coercive control course of conduct and digital export missing

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| complainant statement | served | served | yes | — |
| selected screenshots | incomplete | incomplete | yes | — |
| full phone download | referred_only | missing | yes | — |
| chronology | referred_only | missing | yes | — |
| third-party statements | referred_only | missing | yes | — |
| full digital export | missing | missing | yes | — |
| course-of-conduct chronology | missing | missing | yes | — |
| third-party statements | missing | missing | yes | — |
| context/counter-allegation material | missing | missing | yes | — |
| pattern, attribution, and context | not_safely_confirmed | — | no | no_prediction_match |

### sim-070 — Malicious communications phone and account attribution

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| message screenshot | served | incomplete | no | — |
| complainant statement | served | served | yes | — |
| account login data | referred_only | missing | yes | — |
| phone download | referred_only | missing | yes | — |
| platform disclosure | referred_only | missing | yes | — |
| account attribution | missing | missing | yes | — |
| device ownership/continuity | missing | missing | yes | — |
| full thread | missing | missing | yes | — |
| platform records | missing | missing | yes | — |
| who sent the message and what context surrounds it | not_safely_confirmed | — | no | no_prediction_match |

### sim-071 — Breach of restraining order service/order proof missing

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| complainant statement | served | served | yes | — |
| contact screenshot | served | incomplete | no | — |
| restraining order | referred_only | missing | yes | — |
| proof of service | referred_only | missing | yes | — |
| phone download | referred_only | missing | yes | — |
| sealed order | missing | missing | yes | — |
| service/knowledge proof | missing | missing | yes | — |
| full contact thread | missing | missing | yes | — |
| phone attribution | missing | missing | yes | — |
| order terms, knowledge, and whether contact was by defendant | not_safely_confirmed | — | no | no_prediction_match |

### sim-072 — Identity document knowledge and expert report missing

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| seizure note | served | — | no | no_prediction_match |
| document copy | served | — | no | no_prediction_match |
| Home Office status check | referred_only | missing | yes | — |
| document expert report | referred_only | missing | yes | — |
| interview recording | referred_only | provisional | yes | — |
| expert report | missing | missing | yes | — |
| status check | missing | missing | yes | — |
| interview recording | missing | provisional | yes | — |
| knowledge/intent evidence | missing | missing | yes | — |
| whether document is false and whether Zara knew/intended improper use | not_safely_confirmed | — | no | no_prediction_match |

### sim-073 — Youth mental health and appropriate adult custody gaps

- Items: 12 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| youth court charge sheet | served | incomplete | no | — |
| short interview summary | served | incomplete | no | — |
| full custody record | referred_only | missing | yes | — |
| appropriate adult notes | referred_only | missing | yes | — |
| mental health triage | referred_only | missing | yes | — |
| interview recording | referred_only | provisional | yes | — |
| full custody record | missing | missing | yes | — |
| appropriate adult attendance record | missing | missing | yes | — |
| mental health triage | missing | missing | yes | — |
| interview recording/transcript | missing | provisional | yes | — |
| fitness, safeguards, and reliability of interview account | not_safely_confirmed | incomplete | no | — |

### sim-074 — Modern slavery exploitation marker in drugs case

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| arrest summary | served | served | yes | — |
| drug expert statement | served | served | yes | — |
| NRM referral | referred_only | missing | yes | — |
| social services note | referred_only | missing | yes | — |
| phone download | referred_only | missing | yes | — |
| NRM referral/outcome | missing | missing | yes | — |
| social services material | missing | missing | yes | — |
| youth/vulnerability chronology | missing | missing | yes | — |
| phone attribution | missing | missing | yes | — |
| whether exploitation is evidenced, alleged, or only a safeguarding concern | not_safely_confirmed | — | no | no_prediction_match |

### sim-075 — Mega-procedure trap with corrected charge sheet, mixed defendants, and missing MG5

- Items: 14 · matched 13 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| corrected charge sheet | served | incomplete | no | — |
| selected MG11s | served | incomplete | no | — |
| partial exhibit list | served | incomplete | no | — |
| MG5 | referred_only | missing | yes | — |
| MG6C | referred_only | missing | yes | — |
| CCTV | referred_only | provisional | yes | — |
| order/service proof | referred_only | missing | yes | — |
| MG5 case summary | missing | missing | yes | — |
| MG6 schedules | missing | missing | yes | — |
| full exhibit list | missing | missing | yes | — |
| defendant-specific allegations | missing | missing | yes | — |
| CCTV | missing | provisional | yes | — |
| order/service proof | missing | missing | yes | — |
| current charge set, which defendant each allegation concerns, and what material is served | not_safely_confirmed | — | no | no_prediction_match |

### sim-076 — EncroChat handle dispute — rotated scanned export

- Items: 7 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| partial EncroChat screenshots | incomplete | incomplete | yes | — |
| rotated scan pages | incomplete | incomplete | yes | — |
| full platform extraction | referred_only | missing | yes | — |
| handle mapping certificate | missing | missing | yes | — |
| device continuity | missing | missing | yes | — |
| co-defendant chat map | other_defendant_only | other_defendant_only | yes | — |
| shared thread messages | not_safely_confirmed | — | no | no_prediction_match |

### sim-077 — EncroChat — bad OCR broken handle labels

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR-broken message screenshots | served | incomplete | no | — |
| platform export | referred_only | missing | yes | — |
| authenticated extraction | missing | missing | yes | — |
| handle mapping | missing | missing | yes | — |

### sim-078 — EncroChat — mixed defendants in one PDF

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mixed defendant message excerpts | served | — | no | no_prediction_match |
| co-defendant schedules | referred_only | other_defendant_only | no | fuzzy_match:0.75 |
| per-defendant exhibit map | missing | missing | yes | — |
| handle mapping | missing | missing | yes | — |
| co-defendant NIGHTHAWK thread | not_safely_confirmed | — | no | no_prediction_match |

### sim-079 — EncroChat — index-only listing without export

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary reference to Encro | served | — | no | no_prediction_match |
| EncroChat platform export | referred_only | missing | yes | — |
| full extraction | missing | missing | yes | — |
| handle-to-user certificate | missing | missing | yes | — |

### sim-080 — Phone download — duplicate rotated pages

- Items: 6 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate screenshot pages | served | — | no | no_prediction_match |
| partial handset notes | served | incomplete | no | — |
| UFED extraction | referred_only | missing | yes | — |
| full download | missing | missing | yes | — |
| search scope schedule | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-081 — Phone attribution — cellsite summary only

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| cellsite summary table | served | — | no | no_prediction_match |
| full cellsite dump | referred_only | missing | yes | — |
| subscriber data | missing | missing | yes | — |
| handset extraction | missing | missing | yes | — |

### sim-082 — Phone scope — search terms schedule missing

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed scan digital summary | served | — | no | no_prediction_match |
| full handset download | referred_only | missing | yes | — |
| search terms | missing | missing | yes | — |
| extraction continuity | missing | missing | yes | — |

### sim-083 — Encro + phone overlap — attribution disputed

- Items: 7 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Encro partial | served | incomplete | no | — |
| phone screenshots | served | incomplete | no | — |
| phone UFED | referred_only | missing | yes | — |
| Encro export | referred_only | missing | yes | — |
| attribution certificate | missing | missing | yes | — |
| per-device map | missing | missing | yes | — |
| same user on Encro and handset | not_safely_confirmed | — | no | no_prediction_match |

### sim-084 — County lines — bad OCR line labels

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR-broken message pages | served | — | no | no_prediction_match |
| cellsite summary | referred_only | missing | yes | — |
| line holder evidence | missing | missing | yes | — |
| full cellsite | missing | missing | yes | — |
| runner vs holder | not_safely_confirmed | missing | yes | fuzzy_match:0.45 |

### sim-085 — Drug conspiracy — corrected indictment pages

- Items: 6 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended indictment | served | missing | no | over_cautious |
| old count pages | served | — | no | no_prediction_match |
| telecom data | referred_only | missing | yes | — |
| per-defendant map | missing | missing | yes | — |
| count linkage schedule | missing | missing | yes | — |
| which counts remain live | not_safely_confirmed | — | no | no_prediction_match |

### sim-086 — Telecom conspiracy — summary without raw data

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| telecom analyst summary | served | — | no | no_prediction_match |
| raw call data | referred_only | missing | yes | — |
| subscriber download | missing | missing | yes | — |
| cellsite dump | missing | missing | yes | — |

### sim-087 — County lines — vulnerability marker OCR scan

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| arrest summary with marker | served | — | no | no_prediction_match |
| safeguarding referral | referred_only | missing | yes | — |
| NRM outcome | missing | missing | yes | — |
| line attribution | missing | missing | yes | — |
| exploitation vs choice | not_safely_confirmed | — | no | no_prediction_match |

### sim-088 — Conspiracy — missing MG6 schedule detail

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG6C header only | served | — | no | no_prediction_match |
| lab summary | referred_only | missing | yes | — |
| detailed MG6 lines | missing | missing | yes | — |
| per-defendant exhibits | missing | missing | yes | — |

### sim-089 — County lines — duplicate message pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate screenshot sets | served | — | no | no_prediction_match |
| handset download | referred_only | missing | yes | — |
| source export | missing | missing | yes | — |
| line map | missing | missing | yes | — |

### sim-090 — Conspiracy PWITS — two-column schedule OCR

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two-column exhibit schedule | served | — | no | no_prediction_match |
| group chat export | referred_only | missing | yes | — |
| per-defendant segregation | missing | missing | yes | — |
| telecom raw | missing | missing | yes | — |

### sim-091 — Telecom conspiracy — skewed large bundle

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed analyst summary | served | — | no | no_prediction_match |
| telecom dump | referred_only | missing | yes | — |
| raw data download | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-092 — Multi-hand assault — skewed BWV stills

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed BWV stills | served | served | yes | — |
| full BWV | referred_only | missing | yes | — |
| full BWV window | missing | missing | yes | — |
| MG11 accounts | missing | missing | yes | — |
| who struck | not_safely_confirmed | — | no | no_prediction_match |

### sim-093 — Joint enterprise — duplicate conflicting MG11

- Items: 6 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two MG11 versions | served | served | yes | — |
| partial BWV | served | incomplete | no | — |
| full BWV | referred_only | missing | yes | — |
| signed final MG11 | missing | missing | yes | — |
| medical | missing | missing | yes | — |
| which MG11 is final | not_safely_confirmed | incomplete | no | — |

### sim-094 — S18 — medical referred only rotated scan

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 injury summary | served | — | no | no_prediction_match |
| medical report | referred_only | missing | yes | — |
| medical report | missing | missing | yes | — |
| imaging | missing | missing | yes | — |

### sim-095 — Violence — corrected charge s20 to s18

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended charge sheet | served | — | no | no_prediction_match |
| old s20 wording | served | — | no | no_prediction_match |
| medical | referred_only | missing | yes | — |
| medical | missing | missing | yes | — |
| intent material | missing | missing | yes | — |

### sim-096 — Multi-defendant — wrong name OCR confusion

- Items: 5 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR witness summary | served | served | yes | — |
| BWV | referred_only | missing | yes | — |
| clear ID accounts | missing | missing | yes | — |
| BWV export | missing | missing | yes | — |
| which male witness means | not_safely_confirmed | incomplete | no | — |

### sim-097 — Robbery — CCTV stills rotated poor quality

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| rotated CCTV stills | served | served | yes | — |
| master footage | referred_only | missing | yes | — |
| full CCTV | missing | missing | yes | — |
| ID procedure | missing | missing | yes | — |

### sim-098 — Assault — BWV referred index-only listing

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 officer account | served | — | no | no_prediction_match |
| BWV full export | referred_only | missing | yes | — |
| BWV download | missing | missing | yes | — |
| custody record | missing | missing | yes | — |

### sim-099 — Public order — group conduct bleed OCR

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR group summary | served | — | no | no_prediction_match |
| BWV clips | referred_only | missing | yes | — |
| per-defendant conduct map | missing | missing | yes | — |
| full BWV | missing | missing | yes | — |

### sim-100 — Robbery — CCTV pages out of order

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| out-of-order CCTV clips | served | incomplete | no | — |
| master timeline | referred_only | missing | yes | — |
| full window export | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-101 — Historic sexual — bad OCR MG5 summary

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR MG5 summary | served | — | no | no_prediction_match |
| ABE interview | referred_only | missing | yes | — |
| ABE recording | missing | missing | yes | — |
| MG11 first account | missing | missing | yes | — |

### sim-102 — Sexual — ABE index-only bundle

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary only | served | incomplete | no | — |
| ABE interview | referred_only | missing | yes | — |
| ABE recording | missing | missing | yes | — |
| transcript | missing | missing | yes | — |

### sim-103 — Historic sexual — third-party hearsay rotated

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| third-party hearsay summary | served | — | no | no_prediction_match |
| complainant ABE | referred_only | missing | yes | — |
| primary complainant account | missing | missing | yes | — |
| ABE | missing | missing | yes | — |

### sim-104 — Sexual — mixed offences PDF bleed

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| sexual MG5 | served | — | no | no_prediction_match |
| unrelated fraud index | served | — | no | no_prediction_match |
| ABE | referred_only | missing | yes | — |
| ABE | missing | missing | yes | — |
| medical | missing | missing | yes | — |

### sim-105 — Robbery ID — VIPER missing skewed bundle

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV stills | served | served | yes | — |
| VIPER | referred_only | missing | yes | — |
| VIPER procedure | missing | missing | yes | — |
| full CCTV | missing | missing | yes | — |

### sim-106 — Domestic assault — unsigned MG11 rotated

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| unsigned MG11 draft | served | incomplete | no | — |
| BWV | referred_only | missing | yes | — |
| signed MG11 | missing | missing | yes | — |
| full BWV | missing | missing | yes | — |

### sim-107 — Coercive control — digital OCR message export

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR message screenshots | served | incomplete | no | — |
| handset download | referred_only | missing | yes | — |
| source export | missing | missing | yes | — |
| chronology | missing | missing | yes | — |

### sim-108 — Harassment — screenshot duplicate pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate screenshots | served | — | no | no_prediction_match |
| platform export | referred_only | missing | yes | — |
| source export | missing | missing | yes | — |
| account data | missing | missing | yes | — |

### sim-109 — Breach non-molestation — service unclear

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| order copy (scan) | served | — | no | no_prediction_match |
| service affidavit | referred_only | missing | yes | — |
| proof of service | missing | missing | yes | — |
| breach timeline | missing | missing | yes | — |
| whether defendant served personally | not_safely_confirmed | — | no | no_prediction_match |

### sim-110 — Stalking — mixed harassment/family bleed

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 stalking summary | served | — | no | no_prediction_match |
| message export | referred_only | missing | yes | — |
| source messages | missing | missing | yes | — |
| attribution | missing | missing | yes | — |

### sim-111 — Domestic — BWV screenshot stills only

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| BWV screenshot stills | served | incomplete | no | — |
| full BWV | referred_only | missing | yes | — |
| BWV download | missing | missing | yes | — |
| signed MG11 | missing | missing | yes | — |

### sim-112 — Coercive control — missing chronology schedule

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 narrative | served | — | no | no_prediction_match |
| message export | referred_only | missing | yes | — |
| chronology schedule | missing | missing | yes | — |
| source export | missing | missing | yes | — |

### sim-113 — Harassment — wrong second account attribution

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| message screenshots | served | incomplete | no | — |
| platform export | referred_only | missing | yes | — |
| subscriber proof | missing | missing | yes | — |
| attribution certificate | missing | missing | yes | — |

### sim-114 — Bladed article — skewed stop/search scan

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed search notes | served | — | no | no_prediction_match |
| search BWV | referred_only | missing | yes | — |
| BWV export | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-115 — Imitation firearm — bad OCR classification

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR expert summary | served | — | no | no_prediction_match |
| ballistics/expert report | referred_only | missing | yes | — |
| expert report | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-116 — Public order — rotated clip bundle

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| rotated video clips | served | — | no | no_prediction_match |
| full clip set | referred_only | missing | yes | — |
| conduct map | missing | missing | yes | — |
| full clips | missing | missing | yes | — |

### sim-117 — Offensive weapon — index-only listing

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 reference to weapon | served | missing | no | over_cautious |
| forensic report | referred_only | missing | yes | — |
| forensic report | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-118 — Motoring SJP — very thin OCR scan

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| single-page SJP notice | served | — | no | no_prediction_match |
| calibration | referred_only | missing | yes | — |
| calibration cert | missing | missing | yes | — |
| device download | missing | missing | yes | — |

### sim-119 — Drink drive — procedure record missing OCR

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR procedure summary | served | missing | no | over_cautious |
| MGDDB | referred_only | missing | yes | — |
| MGDDB printout | missing | missing | yes | — |
| procedure record | missing | missing | yes | — |

### sim-120 — Drug drive — toxicology rotated pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| rotated lab summary | served | — | no | no_prediction_match |
| full lab report | referred_only | missing | yes | — |
| lab report | missing | missing | yes | — |
| blood procedure | missing | missing | yes | — |

### sim-121 — Fail to provide — skewed procedure bundle

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed officer summary | served | — | no | no_prediction_match |
| procedure recording | referred_only | missing | yes | — |
| full procedure record | missing | missing | yes | — |
| warning proof | missing | missing | yes | — |

### sim-122 — No insurance — keeper vs driver confusion

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two-column vehicle schedule | served | — | no | no_prediction_match |
| insurance database | referred_only | missing | yes | — |
| driver proof | missing | missing | yes | — |
| insurance policy | missing | missing | yes | — |
| keeper vs driver | not_safely_confirmed | missing | yes | fuzzy_match:0.53 |

### sim-123 — Motoring — corrected charge duplicate pages

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended charge | served | missing | no | over_cautious |
| duplicate old pages | served | — | no | no_prediction_match |
| device record | referred_only | missing | yes | — |
| live count linkage | missing | missing | yes | — |
| procedure record | missing | missing | yes | — |

### sim-124 — Benefit fraud — duplicate bank statement pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate statement pages | served | — | no | no_prediction_match |
| DWP file | referred_only | missing | yes | — |
| full bank download | missing | missing | yes | — |
| DWP decision records | missing | missing | yes | — |

### sim-125 — Money laundering — two-column account schedule

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two-column account table | served | — | no | no_prediction_match |
| bank download | referred_only | missing | yes | — |
| full bank export | missing | missing | yes | — |
| mapping schedule | missing | missing | yes | — |

### sim-126 — False documents — rotated provenance scan

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| rotated document scans | served | — | no | no_prediction_match |
| expert report | referred_only | missing | yes | — |
| provenance report | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-127 — Account control — OCR poor bank schedules

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR bank schedule fragments | served | — | no | no_prediction_match |
| full bank download | referred_only | missing | yes | — |
| bank export | missing | missing | yes | — |
| device extraction | missing | missing | yes | — |

### sim-128 — Fraud — mixed defendants financial PDF

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mixed defendant account summary | served | — | no | no_prediction_match |
| bank data | referred_only | missing | yes | — |
| per-defendant map | missing | missing | yes | — |
| full bank export | missing | missing | yes | — |

### sim-129 — Expert report — index-only financial case

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 financial summary | served | — | no | no_prediction_match |
| expert report | referred_only | missing | yes | — |
| expert report | missing | missing | yes | — |
| transaction source | missing | missing | yes | — |

### sim-130 — Youth custody — bad OCR safeguard notes

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR custody summary | served | — | no | no_prediction_match |
| interview recording | referred_only | missing | yes | — |
| custody record | missing | missing | yes | — |
| AA attendance | missing | missing | yes | — |

### sim-131 — Youth — appropriate adult missing rotated

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| rotated interview summary | served | incomplete | no | — |
| interview recording | referred_only | missing | yes | — |
| AA record | missing | missing | yes | — |
| custody record | missing | missing | yes | — |

### sim-132 — Vulnerability — mental health triage index-only

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 reference to MH | served | — | no | no_prediction_match |
| MH triage | referred_only | missing | yes | — |
| triage record | missing | missing | yes | — |
| custody record | missing | missing | yes | — |

### sim-133 — Youth interview — skewed safeguard bundle

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed MG5 summary | served | — | no | no_prediction_match |
| interview recording | referred_only | missing | yes | — |
| custody | missing | missing | yes | — |
| AA notes | missing | missing | yes | — |
| recording | missing | missing | yes | — |

### sim-134 — Modern slavery marker — duplicate safeguarding pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate safeguarding notes | served | — | no | no_prediction_match |
| NRM referral | referred_only | missing | yes | — |
| NRM outcome | missing | missing | yes | — |
| chronology | missing | missing | yes | — |

### sim-135 — Large messy bundle — rotated duplicate exhibits

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| partial exhibit subsets | served | incomplete | no | — |
| duplicate pages | served | — | no | no_prediction_match |
| multiple exports | referred_only | missing | yes | — |
| exhibit map | missing | missing | yes | — |
| complete schedules | missing | missing | yes | — |

### sim-136 — Pages out of order — mixed offences

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| out-of-order mixed pages | served | — | no | no_prediction_match |
| full schedules | referred_only | missing | yes | — |
| ordered charge papers | missing | missing | yes | — |
| MG6 detail | missing | missing | yes | — |

### sim-137 — Blank pages noise — placeholder metadata

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| blank pages | served | — | no | no_prediction_match |
| placeholder filename metadata | served | — | no | no_prediction_match |
| core statements | referred_only | missing | yes | — |
| MG5 detail | missing | missing | yes | — |
| schedules | missing | missing | yes | — |

### sim-138 — Corrected indictment — conflicting hearing dates

- Items: 6 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended indictment | served | missing | no | over_cautious |
| conflicting listing notices | served | — | no | no_prediction_match |
| court listing | referred_only | missing | yes | — |
| confirmed listing | missing | missing | yes | — |
| count linkage | missing | missing | yes | — |
| correct hearing date | not_safely_confirmed | — | no | no_prediction_match |

### sim-139 — Missing MG6C detail — vague unused schedule

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG6C header page | served | — | no | no_prediction_match |
| unused material | referred_only | missing | yes | — |
| line-by-line MG6 | missing | missing | yes | — |
| material descriptions | missing | missing | yes | — |

### sim-140 — Duplicate MG11 — conflicting accounts

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two conflicting MG11 drafts | served | — | no | no_prediction_match |
| BWV | referred_only | missing | yes | — |
| signed final MG11 | missing | missing | yes | — |
| clarification | missing | missing | yes | — |
| which account is current | not_safely_confirmed | — | no | no_prediction_match |

### sim-141 — AEW — custody PACE missing skewed scan

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed officer account | served | — | no | no_prediction_match |
| BWV | referred_only | missing | yes | — |
| custody record | missing | missing | yes | — |
| BWV export | missing | missing | yes | — |

### sim-142 — Perverting justice — fraud paperwork bleed OCR

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR fraud-style exhibits | served | — | no | no_prediction_match |
| email export | referred_only | missing | yes | — |
| chronology | missing | missing | yes | — |
| intent evidence | missing | missing | yes | — |

### sim-143 — PWITS — lab report missing bad OCR

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR seizure notes | served | — | no | no_prediction_match |
| lab analysis | referred_only | missing | yes | — |
| lab report | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-144 — PWITS — continuity rotated duplicate pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate seizure pages | served | — | no | no_prediction_match |
| lab | referred_only | missing | yes | — |
| lab | missing | missing | yes | — |
| dealing evidence | missing | missing | yes | — |

### sim-145 — AEW — BWV index-only with custody extract

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| custody extract fragment | served | — | no | no_prediction_match |
| BWV full export | referred_only | missing | yes | — |
| BWV download | missing | missing | yes | — |
| full custody | missing | missing | yes | — |

### sim-146 — Custody PACE — missing interview recording

- Items: 5 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| custody extract | served | incomplete | no | — |
| interview recording | referred_only | missing | yes | — |
| recording | missing | missing | yes | — |
| transcript | missing | missing | yes | — |
| PACE forms | missing | missing | yes | — |

### sim-147 — Drugs — very thin placeholder bundle

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| thin MG5 note | served | — | no | no_prediction_match |
| lab | referred_only | missing | yes | — |
| lab | missing | missing | yes | — |
| continuity | missing | missing | yes | — |
| search material | missing | missing | yes | — |

### sim-148 — Search BWV — screenshot stills duplicate

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| search BWV stills | served | served | yes | — |
| full search BWV | referred_only | missing | yes | — |
| BWV export | missing | missing | yes | — |
| lab | missing | missing | yes | — |

### sim-149 — PWITS — corrected charge possession to PWITS

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended charge | served | — | no | no_prediction_match |
| old possession wording | served | — | no | no_prediction_match |
| lab | referred_only | missing | yes | — |
| intent material | missing | missing | yes | — |
| lab | missing | missing | yes | — |

### sim-150 — Index-only bundle — referred material trap

- Items: 6 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| bundle index pages only | served | — | no | no_prediction_match |
| BWV | referred_only | missing | yes | — |
| MG11 | referred_only | missing | yes | — |
| custody | referred_only | provisional | yes | — |
| medical | referred_only | provisional | yes | — |
| all substantive exports | missing | missing | yes | — |

## Limits

- Controlled/simulator/proof fixtures only — not unseen real-world solicitor bundles.
- `wrong_family_bleed_rate`, `court_note_safety_rate`, and `client_summary_safety_rate` are placeholders in v1.
- Unmatched truth items reduce accuracy denominators only where predictions exist.

