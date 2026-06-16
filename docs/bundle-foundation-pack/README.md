# CaseBrain Bundle Foundation Pack v2

## Purpose

This folder is the docs-only foundation for producing pilot-believable England and Wales criminal disclosure bundles for CaseBrain.

The goal is not more chaos data. The goal is ordinary, boring, solicitor-recognisable bundle shape: clean magistrates' files, normal disclosure schedules, standard witness statements, hearing/listing notices, and Crown Court indictment/PTPH packs.

CaseBrain uses these shapes to test extraction of:

- client name
- case title
- charge/offence wording
- court
- hearing date and time
- stage
- served material
- missing/outstanding material
- contradiction and truth hierarchy
- safe summary
- safe disclosure chase
- must-not-say traps

## Replica standard

Use official/public wording for short form titles, headings, field labels, column labels, and charge wording patterns where the source is clear.

Do not recreate whole forms wholesale. Long boilerplate or uncertain exact wording must be marked:

`verify against [URL]`

Swap only fictional identifiers and case facts:

- names
- addresses
- URNs
- dates
- times
- courts
- witness names
- exhibit references
- page numbers
- narrative facts

Do not put tracker truth inside the PDF. The tracker CSV is separate.

## What this is not

This is not a production app change.
This is not PDF generation.
This is not a CB-TB chaos factory continuation.
This is not a master index of the whole app.
This is not a legal advice pack.

## Source discipline

Permitted sources:

- GOV.UK criminal casefiles / forms / standards / file structure
- CPS Director's Guidance on Charging 6th edition and National File Standard
- Attorney General's Guidelines on Disclosure 2024
- Judiciary MG5 / Better Case Management material
- CrimPR / Criminal Practice Directions public material
- CPS offence legal guidance for charge wording patterns
- archived BAGT witness statement guidance as a training/specimen warning source

Forbidden sources:

- real client bundles
- real firm PDFs
- leaked disclosure
- live court listings
- BAILII judgments as bundle templates
- forums / Reddit / random blogs
- current identifiable case material

## Folder map

- `SOURCE_REGISTER.md` — official source map and warnings
- `TRACKER_CSV_GUIDE.md` — exact factory tracker columns and example rows
- `SPECIMEN_CHARGE_WORDINGS.md` — charge-line style patterns
- `MUST_NOT_SAY_REGISTER.md` — unsafe output phrases and safe alternatives
- `BELIEVABILITY_CHECKLIST.md` — obvious/bad vs believable/good
- `PILOT_READINESS.md` — how this supports paid pilot polish
- `shapes/` — nine form/layout shape sheets
- `recipes/ALL_RECIPES.md` — 15 whole-bundle recipes

## How this feeds CaseBrain

1. Docs define the source-grounded shape.
2. Cursor generates S1–S6 pilot PDF samples (see `generated/`).
3. Tracker rows record the truth outside the PDFs.
4. CaseBrain upload/extraction is checked against the tracker.
5. Fail means extractor/guard issue.
6. Amber is acceptable only where the tracker expects amber/provisional.
7. No product claims are made from missing material.

## Generated pilot status (local)

| Ref | Shape | Factory |
|-----|-------|---------|
| CB-FOUND-2001 | S1 SJP theft | pass |
| CB-FOUND-2002 | S2 mags theft | pass |
| CB-FOUND-2003 | S3 common assault | pass |
| CB-FOUND-2004 | S4 drink drive | pass |
| CB-FOUND-2005 | S5 drugs possession | pass |
| CB-FOUND-2006 | S6 shop theft | pass |

M1–M5 and B1–B4 remain docs-only until requested.
