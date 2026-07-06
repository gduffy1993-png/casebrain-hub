# Demo audit thirty — PDF-backed proof pack

Thirty fictional prosecution bundles (DA-01..30) with served and outstanding material, run through the real CaseBrain H5 builders and line-source proof pipeline.

## Scope statement

- **Brain/core changes:** None — presentation polish in `lib/eval/demo-audit-packs/` only.
- **Scale cap:** 30 cases — do not extend beyond this pack without explicit review.

## Aggregate metrics

| Metric | Value |
|--------|------:|
| Ready | 30/30 |
| FAIL lines (total) | 0 |
| Unsupported emitted (total) | 0 |
| Case-facing wrong-family (total) | 0 |
| Generic MG6 labels (total) | 0 |

## Summary table

| Case | Pages | PDF+text | FAIL | Wrong-family | Generic | Ready |
|------|------:|---------:|-----:|-------------:|--------:|:-----:|
| 01-phone-harassment | 11 | 65 | 0 | 0 | 0 | yes |
| 02-cctv-stills | 9 | 55 | 0 | 0 | 0 | yes |
| 03-bwv-custody | 7 | 74 | 0 | 0 | 0 | yes |
| 04-co-def-interview | 8 | 42 | 0 | 0 | 0 | yes |
| 05-encro-attribution | 9 | 59 | 0 | 0 | 0 | yes |
| 06-domestic-stalking | 11 | 61 | 0 | 0 | 0 | yes |
| 07-phone-ocr-trap | 11 | 60 | 0 | 0 | 0 | yes |
| 08-cctv-night-stills | 9 | 55 | 0 | 0 | 0 | yes |
| 09-cctv-index-only | 9 | 55 | 0 | 0 | 0 | yes |
| 10-bwv-public-order | 7 | 60 | 0 | 0 | 0 | yes |
| 11-custody-pace-ocr | 7 | 60 | 0 | 0 | 0 | yes |
| 12-multi-def-burglary | 8 | 61 | 0 | 0 | 0 | yes |
| 13-co-def-index-trap | 8 | 42 | 0 | 0 | 0 | yes |
| 14-encro-retail | 9 | 54 | 0 | 0 | 0 | yes |
| 15-county-lines-runners | 9 | 54 | 0 | 0 | 0 | yes |
| 16-fraud-bank-statements | 9 | 39 | 0 | 0 | 0 | yes |
| 17-fraud-transaction-export | 9 | 39 | 0 | 0 | 0 | yes |
| 18-motoring-sjp-thin | 7 | 41 | 0 | 0 | 0 | yes |
| 19-motoring-breath-specimen | 7 | 41 | 0 | 0 | 0 | yes |
| 20-domestic-harassment | 11 | 61 | 0 | 0 | 0 | yes |
| 21-historic-sexual-abe | 9 | 34 | 0 | 0 | 0 | yes |
| 22-youth-interview | 8 | 33 | 0 | 0 | 0 | yes |
| 23-duplicate-pages | 11 | 61 | 0 | 0 | 0 | yes |
| 24-missing-pages-index | 9 | 55 | 0 | 0 | 0 | yes |
| 25-charge-bundle-mismatch | 9 | 54 | 0 | 0 | 0 | yes |
| 26-phone-referred-metadata | 11 | 61 | 0 | 0 | 0 | yes |
| 27-custody-pace-missing | 7 | 60 | 0 | 0 | 0 | yes |
| 28-fraud-subscriber-trap | 9 | 47 | 0 | 0 | 0 | yes |
| 29-youth-yjs-material | 8 | 33 | 0 | 0 | 0 | yes |
| 30-layout-hearing-date | 9 | 55 | 0 | 0 | 0 | yes |

## Coverage table

| Case | Themes |
|------|--------|
| 01-phone-harassment | phone/digital, domestic/harassment |
| 02-cctv-stills | CCTV |
| 03-bwv-custody | BWV/custody |
| 04-co-def-interview | co-def/multi-def |
| 05-encro-attribution | Encro/county lines |
| 06-domestic-stalking | phone/digital, domestic/harassment |
| 07-phone-ocr-trap | phone/digital, OCR/layout/index traps |
| 08-cctv-night-stills | CCTV |
| 09-cctv-index-only | CCTV, OCR/layout/index traps |
| 10-bwv-public-order | BWV/custody |
| 11-custody-pace-ocr | BWV/custody, OCR/layout/index traps |
| 12-multi-def-burglary | co-def/multi-def |
| 13-co-def-index-trap | co-def/multi-def, OCR/layout/index traps |
| 14-encro-retail | Encro/county lines |
| 15-county-lines-runners | Encro/county lines |
| 16-fraud-bank-statements | fraud/bank |
| 17-fraud-transaction-export | fraud/bank |
| 18-motoring-sjp-thin | CCTV, motoring/SJP |
| 19-motoring-breath-specimen | motoring/SJP |
| 20-domestic-harassment | phone/digital, domestic/harassment |
| 21-historic-sexual-abe | historic sexual/ABE |
| 22-youth-interview | youth/vulnerability |
| 23-duplicate-pages | phone/digital, OCR/layout/index traps |
| 24-missing-pages-index | phone/digital, CCTV, OCR/layout/index traps |
| 25-charge-bundle-mismatch | Message extracts served / charge wording |
| 26-phone-referred-metadata | phone/digital, motoring/SJP |
| 27-custody-pace-missing | BWV/custody |
| 28-fraud-subscriber-trap | phone/digital, fraud/bank |
| 29-youth-yjs-material | youth/vulnerability |
| 30-layout-hearing-date | CCTV, OCR/layout/index traps |

## Per-case scorecards

- [DA-01 Riley Moss — phone harassment / screenshots served](./demo-audit-01-phone-harassment/SCORECARD.md)
- [DA-02 Devon Walsh — CCTV stills served / master footage missing](./demo-audit-02-cctv-stills/SCORECARD.md)
- [DA-03 Casey Fry — BWV referred / custody extract only](./demo-audit-03-bwv-custody/SCORECARD.md)
- [DA-04 Morgan Reid — co-defendant interview served / target interview missing](./demo-audit-04-co-def-interview/SCORECARD.md)
- [DA-05 Liam Craft — Encro / county-lines attribution gap](./demo-audit-05-encro-attribution/SCORECARD.md)
- [DA-06 Ava Quinn — domestic stalking / screenshots served](./demo-audit-06-domestic-stalking/SCORECARD.md)
- [DA-07 Noah Pierce — phone OCR / attribution gap](./demo-audit-07-phone-ocr-trap/SCORECARD.md)
- [DA-08 Elena Brooks — CCTV night stills / master missing](./demo-audit-08-cctv-night-stills/SCORECARD.md)
- [DA-09 Marcus Vale — CCTV index-only master trap](./demo-audit-09-cctv-index-only/SCORECARD.md)
- [DA-10 Tessa Lane — BWV referred / custody extract](./demo-audit-10-bwv-public-order/SCORECARD.md)
- [DA-11 Owen Price — custody PACE OCR trap](./demo-audit-11-custody-pace-ocr/SCORECARD.md)
- [DA-12 Harper Knox — multi co-def / target interview missing](./demo-audit-12-multi-def-burglary/SCORECARD.md)
- [DA-13 Finn Doyle — co-def index trap](./demo-audit-13-co-def-index-trap/SCORECARD.md)
- [DA-14 Zara Holt — Encro supply / attribution gap](./demo-audit-14-encro-retail/SCORECARD.md)
- [DA-15 Jayden Cole — county lines Encro attribution](./demo-audit-15-county-lines-runners/SCORECARD.md)
- [DA-16 Isla Grant — fraud / bank summaries served](./demo-audit-16-fraud-bank-statements/SCORECARD.md)
- [DA-17 Caleb Moss — fraud / tracing export referred](./demo-audit-17-fraud-transaction-export/SCORECARD.md)
- [DA-18 Ella Shaw — motoring SJP thin file](./demo-audit-18-motoring-sjp-thin/SCORECARD.md)
- [DA-19 Ryan Marsh — breath specimen / calibration missing](./demo-audit-19-motoring-breath-specimen/SCORECARD.md)
- [DA-20 Sophie Reid — domestic harassment digital](./demo-audit-20-domestic-harassment/SCORECARD.md)
- [DA-21 Daniel Pike — historic sexual / ABE missing](./demo-audit-21-historic-sexual-abe/SCORECARD.md)
- [DA-22 Kian Doyle — youth court / interview outstanding](./demo-audit-22-youth-interview/SCORECARD.md)
- [DA-23 Leon Marsh — duplicate index / phone pack](./demo-audit-23-duplicate-pages/SCORECARD.md)
- [DA-24 Ashleigh Merritt — missing pages index trap](./demo-audit-24-missing-pages-index/SCORECARD.md)
- [DA-25 Jordan Clarke — Encro charge / bundle alignment](./demo-audit-25-charge-bundle-mismatch/SCORECARD.md)
- [DA-26 Taylor Brookes — phone metadata referred only](./demo-audit-26-phone-referred-metadata/SCORECARD.md)
- [DA-27 Sam Okonkwo — custody PACE material missing](./demo-audit-27-custody-pace-missing/SCORECARD.md)
- [DA-28 Patterson Grant — fraud with subscriber cross-trap](./demo-audit-28-fraud-subscriber-trap/SCORECARD.md)
- [DA-29 Marcus Reid — youth YJS vulnerability referred](./demo-audit-29-youth-yjs-material/SCORECARD.md)
- [DA-30 Devon Walsh — layout/OCR hearing date trap](./demo-audit-30-layout-hearing-date/SCORECARD.md)

Generated: 2026-07-06T09:27:34.236Z
