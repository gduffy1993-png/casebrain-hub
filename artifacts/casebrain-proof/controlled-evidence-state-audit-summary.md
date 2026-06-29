# Controlled Evidence-State Audit — Summary Pack

> **Controlled/synthetic audit only — not solicitor-reviewed real-world audit.**

**Generated:** 2026-06-29  
**Status:** Inventory ceiling reached — **253 runnable cases** (no expansion to 500 without new bundles and explicit approval).

---

## Headline

On **controlled, fictional, and anonymised material only**, CaseBrain’s evidence-state accuracy audit reached:

| Metric | Result |
|--------|--------|
| Runnable cases | **253** |
| Evidence items checked | **2,010** |
| Items matched to predictions | **1,604** (80%) |
| **False-served** | **0** |
| **Blocking failures** | **0** |
| Chase label mapping accuracy | **86.9%** |
| Wrong-defendant bleed (blocking) | **0** |
| Unsafe reliance | **0** |
| Warnings (unmatched / explainable gaps) | **406** (visible, not hidden) |

This is **strong controlled internal validation**. It is **not** independent solicitor-reviewed proof on real client bundles.

---

## What this audit is

A harness that compares **expected evidence states** (truth keys) against **CaseBrain H5 presentation output** (Five Answers, chase surfaces, export-oriented builders) on material we already use for internal QA:

- **150** H4 simulator cases (layout/trap variants — encro, co-def bleed, partial media, index-only, youth, motoring, fraud, etc.)
- **102** golden / bundle-fidelity fictional cases (foundation shapes, offence families, corpus scenarios)
- **1** proof-pack demonstration case (also in the public proof folder)

All defendants, courts, and bundle text are **fictional or anonymised**. No real client identifiers.

---

## What it proves (controlled scope only)

- The audit harness **scales** without surfacing false-served on this inventory.
- **False-served stayed at 0** from the 60-case baseline through **253 cases**.
- **Co-defendant MG6C material** is segregated (`other_defendant_only`) — bleed cleanup held after expansion.
- **Partial vs full evidence** handling held (e.g. BWV clips, screenshots, interview summaries not counted as full served).
- **Chase mapping** is materially improved (from ~11% at early 60-case mapping gap to **86.9%** with canonical family mapping).
- **Banned test/synthetic wording** does not leak into bundle text or solicitor-facing output surfaces checked.
- **Diversity tooling** exists — duplicates and near-duplicates are **reported**, not hidden.
- **Coverage gaps** (unmatched items, thin truth keys, chase-not-surfaced) remain **visible** in warnings.

---

## What it does NOT prove

- Performance on **real unseen solicitor bundles**.
- **Independent** truth keys reviewed by practising solicitors.
- **Industry-level** or **near-zero false-served** claims in production.
- **500+ case** coverage (inventory ceiling — see below).
- Legal correctness of any line — all outputs still require **solicitor review**.

---

## Inventory ceiling (why not 500)

We stopped at **253** because that is the maximum **meaningful runnable inventory** with existing simulator + golden material.

| Source | Cases |
|--------|-------|
| H4 simulator (v1, v1.1, v2, v3) | 150 |
| Golden / bundle-fidelity pack | 102 |
| Proof-pack demonstration | 1 |
| **Total** | **253** |

Forcing 500 would require **new bundle authoring** or **counting weak/duplicate cases** — that would create **fake confidence**. We did not do that.

---

## Duplicate caveat

Diversity review flagged **25 near-duplicate pairs** (mostly gold corpus scenarios where derived truth keys collapse to the same item/chase signature). These are **documented** and **do not count as unique coverage** for future expansion until per-case truth-key enrichment is done.

**Banned phrase scan** (e.g. “synthetic bundle”, “test case”, “red team” in user-facing bundle/output): **0 hits**.

---

## Detector coverage (high level)

| Priority | Area | Status |
|----------|------|--------|
| P1 | Partial vs full evidence | Covered |
| P1 | Wrong person / co-def bleed | Covered |
| P1 | False-served prevention | Covered (0 in run) |
| P1 | Export / sendability safety | Partial |
| P1 | Index-only / inference-as-fact | Partial |
| P2 | Source hierarchy, dates, youth safeguards, MG6 traps, charge changes | Partial — needs richer truth keys |
| P3 | Over-cautious rate, template bleed, duplicate output | Partial |

Full checklist (internal): `artifacts/casebrain-qa/evidence-state-audit/COVERAGE_CHECKLIST.md`

---

## Warning clusters (406 — explainable, not hidden)

| Cluster | Nature |
|---------|--------|
| Inference-boundary / “whether…” items | Truth-key + harness — product does not surface every inference row |
| Served MG11/MG5 not on dedicated chase row | Harness note — chase-first H5; benign where ledger anchor exists |
| Thin truth keys (some v1 sim, pilot cases) | Truth-key coverage — low item count |
| Chase expected but not on H5 surface | Product presentation — ~181 chase items have no chase candidate |
| Repeated chase labels in gold corpus families | Corpus clustering — mapping visibility, not false-served |

**No dangerous failures were suppressed** to improve headline numbers.

---

## Accuracy by evidence state (matched items)

| State | Approx. accuracy |
|-------|------------------|
| Referred-only | 89.9% |
| Missing | 98.6% |
| Incomplete | 80.2% |
| Not-safely-confirmed / inferred | 2.4% |

Low inference accuracy reflects **deliberate** inference-boundary items and harness coverage limits — not a hidden pass.

---

## Proof layer map (where we stand)

| Layer | Status |
|-------|--------|
| 2,200 corpus scan | Done |
| Golden 102 | Done |
| Simulator 150 | Done |
| H5 workstation | Live |
| Proof pack | Done |
| **Controlled evidence-state audit (253)** | **Done — 0 false-served / 0 blocking** |
| **Solicitor-reviewed real-world audit** | **Not done — next** |

---

## Story in one line

> **We have strong controlled proof on fictional/anonymised material. The next layer is independent solicitor-reviewed proof on a small real-world sample (30–50 cases).**

---

## Next step: solicitor-reviewed audit (planned)

Not started in this pack. Proposed scope:

1. **Truth-key reviewer guide** — how solicitors mark served / referred / missing / incomplete / do-not-import.
2. **Solicitor review form** — per-case sign-off without exposing CaseBrain internals.
3. **30–50 case pack** — anonymised real or high-fidelity fictional bundles with independent keys.
4. **Anonymisation checklist** — names, dates, firms, court references.
5. **Scoring report template** — false-served, bleed, export safety, with same disclaimer discipline.

---

## Regenerating (internal)

```bash
npx tsx scripts/evidence-state-audit.test.ts
npx tsx scripts/run-evidence-state-audit.ts
npx tsx scripts/audit-case-diversity.ts
```

Full machine report (internal): `artifacts/casebrain-qa/evidence-state-audit/report.json`

---

## Privacy & sharing

- Safe to share **this summary** and the **proof-pack folder** externally.
- Do **not** share raw audit fixture trees, env files, or full case ID lists without review.
- Every external statement must include: **controlled/synthetic audit only — not solicitor-reviewed real-world audit.**
