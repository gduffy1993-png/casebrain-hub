# Local bundle fidelity (real PDFs — never commit)

Use this lane for **your 5 real bundles** on your machine only. Nothing here goes in git.

## Gitignored folder

Create on your PC (auto-ignored):

```text
artifacts/bundle-fidelity-local/
  cases/
    my-motoring-001/
      truth-key.json
      bundle-text.md
      bundle.pdf          ← optional on disk; runner does not read PDF in slice 3
```

**Never commit:**

- `artifacts/bundle-fidelity-local/` (entire tree)
- Real PDFs, client names, or truth keys with real data

## Quick start

1. Copy `docs/bundle-fidelity-set/local/truth-key.template.json` →  
   `artifacts/bundle-fidelity-local/cases/<your-id>/truth-key.json`
2. Fill the truth key from your PDF (defendant, charge, court, docs present/missing).
3. Paste **extracted text** (not the PDF file) into `bundle-text.md` in the same folder.  
   Slice 3 compares text extract only; PDF upload/OCR is a later slice.
4. **Or automate from PDF paths** (text extract only; PDF stays outside repo):

```powershell
npx tsx scripts/bundle-fidelity-ingest-local-pdfs.ts
```

Edit paths in that script, or duplicate the pattern for your own PDFs.

5. Run:

```powershell
$env:NEXT_PUBLIC_CRIMINAL_PILOT_MODE="true"
npx tsx scripts/bundle-fidelity.ts --pack local
```

Report (local only, gitignored):

`artifacts/casebrain-auditor/latest/bundle-fidelity/local/`

## Suggested 5 slots

See `FIVE_SLOT_GUIDE.md` — one folder per slot (medium violence, thin, motoring, messy, serious provisional).

## Warnings

- Redact or use initials in truth keys if you share your screen.
- Do not put real client material in repo paths or commits.
- If only `bundle.pdf` exists, the runner **skips** until you add `bundle-text.md`.

## Gold repo bundles

Repo-safe fiction stays on `--pack gold`. Local pack is additive only.
