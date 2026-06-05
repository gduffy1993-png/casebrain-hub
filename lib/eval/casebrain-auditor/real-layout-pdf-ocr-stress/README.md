# Real-layout PDF/OCR stress lane (slice 1)

**Status:** Eval-only fictional PDF samples — gitignored output.

**Not:** 50k PDFs, production upload, OCR service integration, or committed client material.

## Commands

```powershell
npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 5 --canary
npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 25
npx tsx scripts/real-layout-pdf-ocr-stress.test.ts
```

## Output (gitignored)

- PDFs + layout fixtures: `artifacts/casebrain-auditor/cache/real-layout-pdf-ocr-stress/samples/`
- Reports: `artifacts/casebrain-auditor/latest/real-layout-pdf-ocr-stress/`

## Slice 1

- 25 deterministic fictional recipes (`rlpdf-001` … `rlpdf-025`)
- pdfkit PDF render + pdf-parse extract
- Score: metadata, missing material, explanation → proof map → battleboard → war room → reasoning V2 safety lint

**Slice 2 (planned):** 50 samples, rotation/duplicate index hardening, optional local real-PDF cross-check.
