# CASE-18 — prison calls / call logs

**Source case:** `demo-audit-46-prison-calls`  
**Source kind:** `v9_catalog`  
**Risk focus:** Call log summary served; recordings / PIN attribution outstanding  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

> **INTERNAL PRODUCT-HUNT CASE (v9 catalog)** — Not a clean solicitor example. Use to hunt generic MG6 chase, off-family court templates, and thin-catalog gaps. Do **not** present as a polished gold exemplar for external solicitor review.

---

## Pass / warn / fail (provisional)

- [WARN] **Reviewer lane:** INTERNAL PRODUCT-HUNT case (v9 catalog) — not a clean solicitor example; hunt generic chase / template drift
- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [WARN] **CPS chase coverage:** Builder fell back to generic MG6 chase; truth key expects family-specific items — product caution
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** N/A — truth key has no page anchors on this catalog case (confirm against bundle text in review)
- [WARN] **Provisional pack score (pre-solicitor):** Not solicitor-validated — WARN means internal caution / product-hunt, not a clean human-review exemplar

---

## Input bundle

`catalog:demo-audit-46-prison-calls (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| prison call recordings | missing | Y | N | — |
| pin attribution report | missing | Y | N | — |
| full prison telecom export | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- prison call recordings
- pin attribution report
- full prison telecom export

## Expected unsafe-to-say (family-filtered)

- fully proved on current disclosure
- safely confirms guilt

## Expected CPS chase

- prison call recordings
- pin attribution report
- full prison telecom export

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-046 Reece Nolan — Prison calls attribution
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; prison call recordings; pin attribution report
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| prison call recordings | missing | — | Y |
| pin attribution report | missing | — | Y |
| full prison telecom export | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Conspiracy to import a controlled drug, contrary to section 4(3) of the Misuse of Drugs Act 1971
- **Client label:** Reece Nolan
- **Court line:** Position remains provisional on the current papers — listed material families are not safely confirmed in the bundle yet.
- **Chase items:** MG6 / unused schedule clarification
- **Do-not-overstate (sample, family-filtered):** fully proved on current disclosure · safely confirms guilt · Do not import ABE unless the papers support it. · Do not import phone extraction/metadata unless the papers support it.
- **Proof receipts (sample):** 8 rows; first: MG6 / unused schedule clarification



---

## Adversarial review questions

Complete in `manual-review-checklist.md`. Focus:

1. Did CaseBrain **over-warn**?
2. Did it **suppress useful wording**?
3. Did it call **served material missing**?
4. Did it create **unnecessary chase**?
5. Did it cite **wrong source/page**?
6. Did it **repeat or clutter** output?

---

## Files in this packet

- `expected.json`
- `actual-summary.json`
- `manual-review-checklist.md`
- `_source/` (working bundle + truth key copy for rebuild)
