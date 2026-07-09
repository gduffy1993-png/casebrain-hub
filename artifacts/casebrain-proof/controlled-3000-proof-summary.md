# Controlled 3,000-Case PDF Proof Milestone — v9-scale3000

> **Controlled/synthetic audit only — not solicitor-reviewed real-world audit.**

**Commit:** `3b507ce` (`test(audit): scale messy pdf proof receipts to 3000 cases`)  
**Run completed:** 2026-07-09T03:11:11.814Z  
**Harness:** `scripts/run-messy-pdf-proof-v6-scale1000.ts`  
**Full machine reports:** `artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/`

---

## Headline

On **3,000 controlled fictional PDF-backed messy bundles**, CaseBrain’s line-source proof and acceptance harness reached:

| Gate | Result |
|------|--------|
| Bundles built | **3,000 / 3,000** |
| **FAIL** | **0** |
| **Blocked cases** | **0** |
| **Emitted unsupported** | **0** |
| **Banned words** (bundle text) | **0** |
| **Hard safety failures** (all counters) | **0** |

This is **strong controlled internal validation** across a broad criminal audit corpus. It is **not** independent solicitor-reviewed proof on real client bundles.

---

## What this milestone is

A scaled **messy PDF proof receipt** run: each case is a controlled fictional prosecution disclosure bundle (PDF-backed, OCR/layout trap variants) with a truth key, line-by-line proof audit, per-line proof receipts, and hard acceptance gates.

| Layer | Scope |
|-------|--------|
| Cases | **3,000** messy-pdf audit packs (v1–v9 expansion) |
| Source templates | **70** demo-audit criminal bundle families (30 legacy + 40 v9) |
| Distinct audit families | **58** criminal themes (harassment, CCTV, BWV/custody, mixed-defendant, encro, fraud, motoring, youth, forensic, order breaches, safeguards, etc.) |
| Trap axes | 20 layout/OCR/disclosure traps per v9 family (+ legacy trap sets v1–v8) |
| Meaningful output lines audited | **364,082** proof receipts across overview, chase, court, client, export surfaces |
| Line verdicts | PASS **133,041** · WARNING **231,041** · FAIL **0** |

All defendants, courts, URNs, and bundle text are **fictional**. No real client identifiers.

---

## What was checked

### Proof receipts & source-state checks

For every meaningful output line the harness recorded:

- Output surface and human-readable line
- Source anchor / snippet (where located)
- Evidence state vs bundle support
- Proof-chain status (PDF + text alignment)
- Per-line verdict (PASS / WARNING / FAIL)
- Solicitor-review flags and safe-action classification (`rely` / `check` / `chase` / `do-not-use`)

**Receipt totals:** 364,082 lines · rely 73,481 · check 239,668 · chase 50,064 · do-not-use 869

### Hard safety counters (all zero)

| Counter | Result |
|---------|--------|
| false_served | 0 |
| referred_only_treated_as_served | 0 |
| missing_treated_as_available | 0 |
| incomplete_treated_as_complete | 0 |
| wrong_defendant_bleed | 0 |
| wrong_family_bleed | 0 |
| court_wording_in_cps_chase | 0 |
| cps_chase_wording_in_court_note | 0 |
| unsupported_allegation_stated_as_fact | 0 |
| attribution_overclaim | 0 |
| final_advice_win_loss_wording | 0 |
| unsafe_client_summary | 0 |
| source_page_mismatch | 0 |
| output_with_no_source_anchor | 0 |

### Broad criminal family coverage

v9 added **800 cases** (40 new source templates × 20 trap axes) on top of **2,200** legacy messy-pdf cases, covering bail/order breaches, forensic gaps, BWV/custody timing, translated messages, safeguards, ANPR/telematics, lab continuity, encro/social overlap, charge–MG5–hearing splits, index/MG6C exhibit traps, and related shapes.

Preflight gate before full run: `npx tsx scripts/run-messy-pdf-proof-v6-scale1000.ts --preflight`

---

## What it proves (controlled scope only)

- The **messy PDF proof harness scales to 3,000** controlled bundles without hard safety failures.
- **False-served, bleed, and cross-surface leakage gates** held at zero across the full corpus.
- **Proof receipts** and **source-state alignment checks** run end-to-end on every case.
- **Banned test/synthetic wording** does not appear in extracted bundle text.
- **WARNING pressure remains visible** (partial support, repeated wording, cautious-not-surfaced) — not suppressed to fake a clean headline.

---

## What it does NOT prove

- Performance on **real unseen solicitor bundles**.
- **Independent** truth keys reviewed by practising solicitors.
- Legal correctness of any specific line — all outputs still require **solicitor review**.
- That further **fictional pack scaling** is worthwhile (explicit verdict: **stop at 3,000**; pivot to real-bundle pilot).

---

## Proof layer map (where we stand)

| Layer | Status |
|-------|--------|
| Controlled evidence-state audit (253) | Done — 0 false-served / 0 blocking |
| Messy PDF proof v8 (2,200) | Done — all hard counters 0 |
| **Messy PDF proof v9 (3,000)** | **Done — 0 FAIL / 0 blocked / all hard counters 0** |
| Proof receipt UI / PDF report | Not done — next engineering step |
| **Solicitor-reviewed real-world audit (30–50)** | **Not done — next validation layer** |

---

## Story in one line

> **We have controlled proof on 3,000 fictional PDF-backed messy bundles with zero hard safety failures. The next layer is solicitor-reviewed proof on a small real/redacted bundle pilot — not more fictional scale.**

---

## Regenerating (internal)

```bash
npx tsx scripts/run-messy-pdf-proof-v6-scale1000.ts --preflight   # targeted samples
npx tsx scripts/run-messy-pdf-proof-v6-scale1000.ts               # full 3,000-case run
```

Structured metrics: `artifacts/casebrain-proof/controlled-3000-proof-metrics.json`

---

## Privacy & sharing

- Safe to share **this summary** and **controlled-3000-proof-metrics.json** externally with the disclaimer.
- Do **not** share per-case proof trees (`line-source-proof/`, `cases/`) without review.
- Every external statement must include: **controlled/synthetic audit only — not solicitor-reviewed real-world audit.**
