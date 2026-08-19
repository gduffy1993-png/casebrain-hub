# Truth/safety hardening v1

Generated: 2026-08-19T03:03:13.223Z
Branch: programme/real-pdf-live-pilot-v1
HEAD: f167c58762c8931aa29bbc3e0ebe3b576372fe55

## Verdict

Shared-root hardening was applied for provisional hearing deadline limitations. This is not a corpus PASS, Stage-3000 completion, programme PASS, merge, or deploy claim.

## Accepted evidence checked

- V2.1.2 accepted matters: 3000
- Candidate ledger: 0 lines / 0 bytes
- Controls exercised: 17/361
- Browser: not_exercised
- PDF: 24/3000 rendered rows; origins {"source_pdf_copy":24}

## Fixes

- **provisional_hearing_deadline_note_dropped_from_item_rows** (evidence-safety) — Disclosure chase items now carry hearingDeadlineNote when deadlineLabel is provisional.

## Still open

- This pass did not rerun the full 3,000 materialisation.
- Authenticated browser remains not exercised in accepted V2.1.2 evidence.
- PDF denominator in accepted V2.1.2 remains 24/3000 and byteOrigin is source_pdf_copy, not genuine app-rendered PDF.
- Only 17/361 controls were exercised in accepted V2.1.2 evidence.
- Cursor UI mockup/redesign is intentionally separate and not assessed by this report.

