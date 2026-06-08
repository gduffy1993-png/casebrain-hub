# Real-layout PDF/OCR stress lane (slice 2)

**Status:** Eval-only fictional PDF samples — gitignored output.

**Not:** 50k PDFs, production upload, OCR service integration, or committed client material.

## Commands

```powershell
npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 5 --canary
npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 25
npx tsx scripts/real-layout-pdf-ocr-stress.ts --count 50
npx tsx scripts/real-layout-pdf-ocr-stress.test.ts
```

## Output (gitignored)

- PDFs + layout fixtures: `artifacts/casebrain-auditor/cache/real-layout-pdf-ocr-stress/samples/`
- Reports: `artifacts/casebrain-auditor/latest/real-layout-pdf-ocr-stress/`

## Slice 2

- **50** deterministic fictional recipes (`rlpdf-001` … `rlpdf-050`)
- Harder layout mess: rotation, scanned pages, split sections, OCR noise, index/body mismatch
- **Deliberate weak/fail traps** (`rlpdf-041` … `rlpdf-050`) — fingerprint signal, not vanity 50/50 pass
- Trap-aware scoring + `deliberate-traps.json` report
- Spine safely blocked on thin/scanned extract

**Slice 3 (planned):** 100 samples, image-page OCR stress, optional local real-PDF cross-check.
