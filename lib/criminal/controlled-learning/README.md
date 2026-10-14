# Controlled learning — first bounded implementation

This is supervised learning of **explicit field labels**, not autonomous legal reasoning,
model retraining, an accuracy guarantee, or a solicitor-readiness claim.

## Implemented flow

1. A solicitor/owner selects an owned original PDF, compiled page, field and printed label.
2. The server downloads the original PDF bytes, extracts pages, and checks the supplied
   value against an explicit labelled row. It records the PDF SHA-256 and source line.
3. The reviewer checks the PDF and separately verifies the correction.
4. A proposal stores only a field/label rule. No training case name, charge or expected
   answer is placed into the reusable rule.
5. Evaluation re-extracts 5–12 verified PDFs from other cases. PDF hashes and case IDs
   must be distinct and must exclude the training source. Expected values are used by
   the scorer only, after extraction.
6. Approval requires all tested target-field answers to match, at least two improvements,
   and zero regressions. It re-runs extraction/evaluation instead of trusting the browser.
7. Database approval locks the organisation, checks the active-rule baseline, and records
   the approval atomically. Revocation is also atomic and removes the rule from retrieval.
8. Only approved current-version rules for that organisation are retrieved at runtime.

## Runtime connections

- `app/api/upload/route.ts`: passes approved rules to criminal structured extraction.
  That extractor uses learned defendant labels and charge labels immediately preceded
  on the same page by an explicit `Count: N` or `Count number: N` row. Unnumbered charge wording can still appear in learned header metadata;
  no count number or hearing type is invented by the learning adapter.
- `app/api/criminal/[caseId]/bundle-source/route.ts`: approved rules can fill missing
  defendant/charge/court/hearing metadata and are passed into per-instrument charge extraction.
- `lib/bundle/parse-bundle-display.ts`: original text is retained; applied rules retain
  the source document, line, line number and a compiled page when the stored raw text
  preserves page boundaries. Learning does not use `extracted_json` AI summaries.
- `components/criminal/workflow/PilotCaseDocumentsPanel.tsx`: correction/review panel in File.
- `/learning`: organisation review queue, testing, separate approval and revocation.

Rules do not overwrite a non-empty baseline field. Conflicting recognised rows abstain.
The labelled value must be on one line, with colon, tab or vertical-bar separation.
Wrapped/glued rows, OCR learning, layout classifiers, legal-analysis learning and knowledge
retrieval are not implemented by this first version. Existing wrong-but-nonempty facts
can still need a separate extraction repair.

## Reader change

The upload extractor now uses the page API of PDF.js v2.0.550 already bundled in `pdf-parse`,
directly, with a fresh document for the original bytes. The legacy parser remains a fallback.
This addresses valid small PDF fixtures for which the older wrapper recovered text but
lost page units. Scanned pages still require OCR; fallback text is never assigned fake pages.
This is not a table-layout or OCR overhaul.

## Activation — separate test database first

The inspected Vercel preview configuration and main checkout use the same Supabase URL.
The user explicitly requested **local completion for Cursor review**. No remote migration,
approval, deployment or production activation was performed.

1. Review against clean base `f7f4df94a89fe313700aead6602336da552f0e0c`.
2. Run `supabase/migrations/20261014120000_controlled_learning.sql` only against a verified
   separate test database. It adds three tables and two service-only transaction functions.
3. Configure the preview's Supabase credentials/storage for that separate database.
4. Set `CASEBRAIN_CONTROLLED_LEARNING=1`. Default is disabled. A missing schema yields an
   unavailable status and zero learned rules rather than a pretend successful learning run.
5. Sign in with a solicitor/owner account, upload independently checked PDFs and use File.
6. Exercise the full browser/upload/copy/export journey before considering promotion.

Public/authenticated database clients have no direct access to the learning tables or RPCs.
Server routes enforce organisation and reviewer role. Original storage paths must match
the case and organisation. The training/test snippets remain private within that organisation;
there is no model-training service call or cross-organisation example sharing.

## Tests

`npm run test:controlled-learning` runs core checks and a real handler/SQL workflow with a
local PGlite PostgreSQL engine. Authentication and storage are test adapters; SQL transactions
and original-PDF extraction are real. Six synthetic PDFs provide one teaching source and five
held-out documents, with different names and page placements. This is a bounded label-learning
demonstration, not proof of general layout or legal reasoning accuracy.

The test requires:

- npm dependencies, including development-only `@electric-sql/pglite@0.5.9`;
- Python with ReportLab for generating synthetic source PDFs;
- optional `LEARNING_TEST_PYTHON` for the Python executable;
- optional `LEARNING_TEST_RUNTIME` for an external npm prefix containing PGlite.

`npm run test:learning-pdfs -- --pdf-root=... --tracker=... --limit=24 --out=...`
reads the user's original PDF bytes through the production text extractor and metadata
processor. Tracker values enter scoring only. The selection covers different recorded
layouts first and then tracker order, and is not claimed representative or random. It does
not test hosted auth, AI extraction, actual browser wording, copy/export or legal analysis.
The tracker itself must be independently verified before using its scores for readiness.

## Review limitations and next acceptance work

- The 24-file user sample had 77/95 exact metadata matches, both before and after the
  proposed `Defendant named` rule. Zero improvements means that proposal is not justified
  for this sample. No rule was approved from these offline scores.
- Five held-out synthetic label cases improved in the handler/SQL workflow; keep this
  evidence separate from real-corpus accuracy.
- Complete browser testing requires the separate test database. It has not been performed.
- `pdf-xref-fallback-truth.test.ts` cannot complete because its historical `case-17-case-9/source.pdf`
  fixture is absent in the inspected checkouts. Do not report it as passing.
- Existing overview issue heuristics, interview negation, disclosure-reader error reporting,
  and broader legal analysis remain outside this milestone.
- Three earlier uncommitted charge/display fixes were carried into this isolated checkout
  for review; they are not silently accepted or merged into the original release worktree.
- Long-document evaluation is capped at twelve PDFs and 16 MiB per PDF; hosted performance
  and timeout behaviour still need testing. No 3,000-case or solicitor-ready claim is made.
