# Slice 1 — Layer 0 Ingestion Gate v1

PR #101 only. No merge. No production deploy.

## Result

Unreadable PDF extraction is now a visible withhold, not a quiet empty case.

Liam Parker (`883193c5-7eb2-433a-827d-d58c1b8874da`) is `quarantined`. Leon Hale known-16 (`9b555b7b-d520-4c33-a661-9ed93acc0fe1`) remains usable.

## Commit / deploy

- Branch: `ui/demo-overview-shell-v1`
- Product commits: `fa8ee39c8` (gate) plus the follow-up in this folder’s git log
- SHA: see `CAPTURE.json` generatedAt and `git log -2 --oneline`
- Vercel: preview only after push; production deploy not requested
- Merge: not performed

## Tests run

| Test | Result |
|---|---|
| `npx tsx scripts/ingestion-gate-v1.contract.test.tsx` | 12/12 passed |
| `npx tsx scripts/pdf-xref-fallback-truth.test.ts` | 4/4 passed |
| `npx tsx scripts/ingestion-gate-known16-smoke.test.ts` | 20 PDFs assessed; 19 `accepted`, 1 `degraded`, 0 withheld |
| `npx tsx scripts/ingestion-gate-liam-local-proof.ts` | Liam `quarantined` / withheld; Hale not withheld |
| `node scripts/capture-ingestion-gate-v1-proof.cjs` | Liam PASS, Hale PASS against `http://localhost:3100` |

## Proof folder

`artifacts/casebrain-qa/assurance/certified-claim-lineage-v1/slice1-ingestion-gate-v1/`

- `CAPTURE.json` — live UI pass/fail
- `liam-parker/` and `known16-leon-hale/` screenshots + body text
- `liam-parker-bundle-source.json` — API `quarantined`, `combinedTextLength: 0`
- `known16-leon-hale-bundle-source.json` — API not withheld, 167149 chars
- `LIAM-LOCAL.json` — stored 233-char stub → 0 units / 0 chase labels
- `KNOWN16-SMOKE.json` — visual-pack PDF extraction decisions

## Liam Parker before / after

Before (`mixed-pdf-fresh-10-v1`, SHA `fb7af2928`):

- Stored source: 233-character `[PDF extraction failed: … bad XRef entry …]`
- File: `Text extracted (233 chars)`
- Overview: `0 items` / `No chase board needed` / `No outstanding attention items on this extract`
- Chase TOTAL `0`
- Quiet-case conclusion from parser diagnostic, not from papers

After (this slice, local Gold20, no re-upload):

- Decision: `quarantined`
- Reason codes: `parser_diagnostic_placeholder`, `parser_error_stub`, `parser_xref_failure`
- Combined source text length: `0`
- Document units: `0`
- Chase labels: `0`
- Overview / Chase / Court Today: `Source extraction incomplete` · `PDF could not be safely read` · `Reprocess/OCR/solicitor review required` · `Substantive outputs withheld`
- File: same withhold banner + `PDF could not be safely read — reprocess/review required`
- No `0 items`, no `no chase needed`, no `bad XRef` / parser diagnostic as source text

## Known healthy regression

- Live Leon Hale: Overview still shows `Leon Hale` / Murder; File not withheld; `combinedTextLength` 167149
- 20 visual-pack `source.pdf` files: none withheld; one `degraded` (`case-07-case-20`); rest `accepted`
- Known-16 live cases were not re-scored as a 16-way mixed proof in this pass; Hale is the live representative, plus the 20-PDF extraction smoke

Stored Hale is marked `degraded` + `legacy_metadata_inferred` because the live row has no persisted `ingestionAssessment` yet. Outputs remain allowed. Fresh uploads persist the assessment.

## Remaining risks / next slice

1. **Case-level withhold is conservative.** One blocked document withholds the whole matter. Mixed packs with one scanned page and one readable bundle will go review-only.
2. **Live dual-parser conflict is unit-tested, not run on every upload.** Page-units vs stream fallback are not compared on the hot path, to avoid false quarantine of healthy compiled PDFs.
3. **Table/layout unreadability is a flag, not a detector.** `table_layout_unreadable` exists; no layout classifier was added.
4. **Legacy stored rows stay `degraded`** until re-extract persists `ingestionAssessment`.
5. **Control Room / strategy-analysis still see the 233-char stub** for completeness gates. Slice 1 only cut Overview, File, Chase, Court Today, and bundle-source canonical. Do not treat that as certified identity/charge.
6. **This does not recover Liam’s readable nine-page PDF.** It stops the stub becoming a quiet case. Recovering the real text needs a later parser/OCR path.

**Next slice:** defendant identity certified claim (Slice 2). Do not start charge, chase, or Court Today certification until identity has a published / review-only / withheld lineage.
