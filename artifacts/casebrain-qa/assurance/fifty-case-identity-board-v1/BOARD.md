# 50-case PDF ↔ CaseBrain identity board

Generated: 2026-08-24T15:57:47.765Z
Compared: **50** cases from local audit corpus
Findings: **93** (P0 3 · P1 4 · P2 86 · P3 0)
Cases with any finding: 42
Identity/listing fail cases: **3**
Invent-family fail cases: **3**

## What this checks
- Defendant name
- Charge / allegation
- Court name (when PDF is clear)
- Hearing / listing date (when PDF is clear)
- Invented CCTV/BWV/CAD/interview/phone/medical when PDF never establishes them
- Truth-key evidence state misalignment + missing expected chase items

## Ranked shared-root clusters (fix these, not case-by-case)

### P0 · HEARING_DATE_CLEAR_BUT_ABSENT · ×3 cases
Family: `listing`
Cases: cb-found-2001-ellis, demo-audit-13-co-def-index-trap, demo-audit-28-fraud-subscriber-trap
- `cb-found-2001-ellis`: PDF listing "2 August 2026" not surfaced in app output
- `demo-audit-13-co-def-index-trap`: PDF listing "12 November 2026, Crown Court at Riverside" not surfaced in app output

### P1 · INVENT_CCTV · ×3 cases
Family: `cctv`
Cases: cb-fresh-002-jordan-hale, cb-found-2003-nguyen, sc-00032
- `cb-fresh-002-jordan-hale`: App surfaces cctv but PDF does not establish it
- `cb-found-2003-nguyen`: App surfaces cctv but PDF does not establish it

### P1 · INVENT_INTERVIEW · ×1 cases
Family: `interview`
Cases: cb-fresh-002-jordan-hale
- `cb-fresh-002-jordan-hale`: App surfaces interview but PDF does not establish it

### P2 · EVIDENCE_STATE_MISALIGN · ×86 cases
Family: `evidence`
Cases: cb-fresh-001-taylor-brookes, cb-fresh-002-jordan-hale, cb-found-2001-ellis, cb-found-2002-smith, cb-found-2003-nguyen, cb-found-2004-clarke, cb-found-2005-okafor, cb-found-2006-carter, cb-found-2007-morrison, demo-audit-07-phone-ocr-trap, demo-audit-13-co-def-index-trap, demo-audit-28-fraud-subscriber-trap…
- `cb-fresh-001-taylor-brookes`: Truth "mg6"=served vs app "MG6 / unused schedule clarification"=not_safely_confirmed
- `cb-fresh-002-jordan-hale`: Truth "mg6"=served vs app "MG6 / unused schedule clarification"=not_safely_confirmed

## Per-case scorecard (fails only)

| Case | Name | Charge | Court | Hearing | #Findings | Top fail |
|------|------|--------|-------|---------|-----------|----------|
| `cb-fresh-002-jordan-hale` | MATCH | MATCH | MATCH | MATCH | 7 | INVENT_CCTV |
| `demo-audit-13-co-def-index-trap` | MATCH | MATCH | MATCH | APP_MISSING_CLEAR_PDF | 6 | HEARING_DATE_CLEAR_BUT_ABSENT |
| `sc-00032` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 5 | INVENT_CCTV |
| `sc-0001a` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 4 | EVIDENCE_STATE_MISALIGN |
| `sc-00022` | MATCH | MATCH | MATCH | MATCH | 4 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2001-ellis` | MATCH | MATCH | MATCH | APP_MISSING_CLEAR_PDF | 3 | HEARING_DATE_CLEAR_BUT_ABSENT |
| `sc-00003` | MATCH | MATCH | MATCH | MATCH | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-0000b` | MATCH | MATCH | MATCH | MATCH | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-0000e` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-00014` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-00020` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-00021` | MATCH | MATCH | MATCH | MATCH | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-00023` | MATCH | MATCH | MATCH | MATCH | 3 | EVIDENCE_STATE_MISALIGN |
| `sc-0002e` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 3 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2002-smith` | MATCH | MATCH | MATCH | MATCH | 2 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2003-nguyen` | MATCH | MATCH | MATCH | MATCH | 2 | INVENT_CCTV |
| `demo-audit-28-fraud-subscriber-trap` | MATCH | MATCH | MATCH | APP_MISSING_CLEAR_PDF | 2 | HEARING_DATE_CLEAR_BUT_ABSENT |
| `sc-00002` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-00009` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-0000a` | MATCH | MATCH | MATCH | MATCH | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-0000f` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-00015` | MATCH | MATCH | MATCH | MATCH | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-00016` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-0001b` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-00026` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 2 | EVIDENCE_STATE_MISALIGN |
| `sc-00027` | MATCH | MATCH | MATCH | MATCH | 2 | EVIDENCE_STATE_MISALIGN |
| `cb-fresh-001-taylor-brookes` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2004-clarke` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2005-okafor` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2006-carter` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `cb-found-2007-morrison` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `demo-audit-07-phone-ocr-trap` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-00007` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-00008` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-0000c` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-0000d` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-00013` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-00018` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-0002c` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-0002d` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-0002f` | MATCH | MATCH | MATCH | PDF_UNCLEAR | 1 | EVIDENCE_STATE_MISALIGN |
| `sc-00031` | MATCH | MATCH | MATCH | MATCH | 1 | EVIDENCE_STATE_MISALIGN |

## Clean cases (no findings)

- `pilot-3-marcus-vale`
- `sc-00001`
- `sc-00019`
- `sc-0001f`
- `sc-00024`
- `sc-00025`
- `sc-0002b`
- `sc-00030`

## Next fix order (recommended)
1. **Listing identity in audit/UI output** — court + hearing date are clear on many PDFs but absent from `casebrain-output` (snapshot currently forces `hearingDateIso: null`).
2. **Evidence state alignment** — truth-key vs app misalign / expected chase missing.
3. **Invent families** — any INVENT_* clusters remaining.

_Audit only. Not committed unless asked._