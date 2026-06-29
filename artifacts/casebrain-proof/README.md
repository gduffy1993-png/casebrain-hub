# CaseBrain Proof Pack (public-safe)

Shareable proof folder for Copilot / external review. **No real client data.**

## What this is

A controlled demonstration of CaseBrain's:

- Evidence-state engine (served / referred / missing / incomplete / inferred / other-defendant)
- Safety-gate and copy-safe logic
- False-served prevention
- Export Pack separation (CPS chase · court note · client summary · gaps · warnings)
- Versioned export metadata

## Contents

```
artifacts/casebrain-proof/
├── README.md
├── controlled-tests-summary.md
├── controlled-evidence-state-audit-summary.md   # 253-case audit headline (shareable)
├── controlled-audit-metrics.json                # structured metrics (shareable)
├── evidence-states-and-gates-spec.md
└── simulator-bundle-01/
    ├── bundle-text.md          # synthetic criminal bundle
    ├── truth-key.json          # expected states per item
    ├── casebrain-output.json   # output from real CaseBrain builders
    ├── safety-gate-report.md
    ├── export-cps-chase.md
    ├── export-court-note.md
    ├── export-client-summary.md
    ├── export-evidence-gaps.md
    ├── export-do-not-overstate.md
    └── export-version-stamp.json
```

## What it proves

- On **synthetic/anonymised** material, CaseBrain labels evidence states conservatively.
- Export surfaces are **safer than screen text** — separated and footered.
- Controlled corpora (2200 / golden 102 / simulator 150) show **0 dangerous critical survivors** and **0 blocking fails** on safety gates (see `controlled-tests-summary.md`).
- **Evidence-state accuracy audit (253 cases, 2,010 items):** **0 false-served**, **0 blocking failures** on controlled/synthetic material (see `controlled-evidence-state-audit-summary.md`).

## What it does NOT prove

- Performance on **real unseen solicitor bundles** (truth-key audit planned, not run).
- Zero false-served in production on all live cases.
- Legal correctness of any specific line — all outputs require **solicitor review**.

## Regenerating

```bash
npx tsx scripts/build-casebrain-proof-pack.ts
```

Outputs `casebrain-output.json` and export files via **real CaseBrain H5 builders** (brief plan, chase, war room, five answers, export pack). Does not modify Brain 1, Guardian core, or classification logic.

## Privacy

- Fictional defendant **Alex Quinn**, fictional court **Northgate Crown Court**.
- No env vars, secrets, API keys, or full repo dumps included.
- Do not add real client PDFs or identifiers to this folder.

---

Generated: 2026-06-29T13:26:34.086Z
