# Five local PDF slots (your machine)

Create **five folders** under `artifacts/bundle-fidelity-local/cases/`. Name them how you like; examples:

| Slot | Purpose | Example folder name |
|------|---------|---------------------|
| 1 | Medium full (~50–150 pages) — violence/robbery/GBH | `slot-1-medium-violence` |
| 2 | Thin — charge + little else | `slot-2-thin` |
| 3 | Motoring — RTA / dangerous driving | `slot-3-motoring` |
| 4 | Messy — OCR / cut-off / glued text | `slot-4-messy` |
| 5 | Serious provisional — sexual / racial aggravated / etc. | `slot-5-serious-provisional` |

Each folder needs:

- `truth-key.json` (from `truth-key.template.json`, `"fictional": false`)
- `bundle-text.md` (pasted text from your PDF — required for run)

Optional on disk only (not read by runner yet):

- `bundle.pdf`

Do **not** start with 500-page mega-bundles until gold + these five pass.
