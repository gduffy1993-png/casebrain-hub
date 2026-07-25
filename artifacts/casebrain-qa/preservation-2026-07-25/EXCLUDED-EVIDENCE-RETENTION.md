# Excluded evidence retention — 2026-07-25

Generated during the post-foundation preservation checkpoint on branch
`programme/criminal-defence-integrity-corpus` at HEAD
`b9d30c12afb31fbe3f0ed351c663017aed2f79a4` (pre-checkpoint commits may follow).

## Policy

Large generated corpora, screenshot packs and duplicate PDF outputs remain **on disk
in the working tree** and are **not deleted**. They are intentionally excluded from
git. Hash manifests under
`artifacts/casebrain-qa/preservation-2026-07-25/` record path, size, mtime and
sha256 for every file in each evidence root.

## Excluded roots (preserve in place)

| Root | Files | Size | Recommended retention |
| --- | ---: | ---: | --- |
| `artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/` | 228 | ~883 MB | External object store / LFS / archive drive; keep run manifests + hashes in git |
| `output/` | 1211 | ~113 MB | Archive as generated PDF page corpus; reproduce via pilot generators |
| `artifacts/casebrain-qa/malik-price-generation-v2-untouched-run/` | 141 | ~42 MB | Keep with Malik freeze; do not rerun |
| `artifacts/casebrain-qa/malik-price-generation-v2-cursor-fixes-rerun-2026-07-25/` | 135 | ~31 MB | Keep as QA delta evidence; do not rerun |
| `artifacts/casebrain-qa/malik-price-generation-v2-authorised-fresh-analysis-2026-07-25/` | 73 | ~13 MB | Keep as authorised fresh-analysis evidence; do not rerun |
| UI smoke screenshot packs under `artifacts/casebrain-qa/*smoke*` / `*five-tab*` / `taylor-*` / `overview-*` | ~44 | ~10 MB | Optional short-term local retention; screenshots are regenerable |
| Scratch `artifacts/build-*.txt`, `artifacts/tsc-*.txt`, `artifacts/ver-*.txt`, `debug.log`, `__pycache__` | — | small | Safe to ignore; do not commit |

Full per-file hashes: see `manifest-*.json` beside this note.

## Reproduction pointers

- Scale-3000 solicitor materialisation runner:
  `npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts`
- Malik–Price heavy-bundle generators:
  `scripts/pilots/generate-malik-price-heavy-bundle*.py`
- Strategy PDF smoke (already regenerable from committed contracts):
  `npx tsx scripts/canonical-finding-model-contracts.test.ts`

## Do not

- Delete these roots to “clean” the tree.
- Rerun Malik.
- Commit 85MB+ corpora or thousands of screenshots into PR #65.
