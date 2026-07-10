# CASE-16 — ANPR / vehicle ID

**Source case:** `demo-audit-49-anpr-trap`  
**Source kind:** `v9_catalog`  
**Risk focus:** ANPR hit table served; images / national audit trail outstanding  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

> **INTERNAL PRODUCT-HUNT CASE (v9 catalog)** — Not a clean solicitor example. Use to hunt generic MG6 chase, off-family court templates, and thin-catalog gaps. Do **not** present as a polished gold exemplar for external solicitor review.

---

## Pass / warn / fail (provisional)

- [WARN] **Reviewer lane:** INTERNAL PRODUCT-HUNT case (v9 catalog) with generic-only MG6 chase — not a clean solicitor example
- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [WARN] **CPS chase coverage:** Builder fell back to generic MG6 chase; truth key expects family-specific items — product caution
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** N/A — truth key has no page anchors on this catalog case (confirm against bundle text in review)
- [WARN] **Provisional pack score (pre-solicitor):** Not solicitor-validated — WARN means internal caution / product-hunt, not a clean human-review exemplar

---

## Input bundle

`catalog:demo-audit-49-anpr-trap (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| anpr image export | missing | Y | N | — |
| national anpr audit trail | missing | Y | N | — |
| vehicle keeper response | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- anpr image export
- national anpr audit trail
- vehicle keeper response

## Expected unsafe-to-say (family-filtered)

- fully proved on current disclosure
- safely confirms guilt

## Expected CPS chase

- anpr image export
- national anpr audit trail
- vehicle keeper response

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-049 Maya Singh — ANPR hit export partial
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; anpr image export; national anpr audit trail
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| anpr image export | missing | — | Y |
| national anpr audit trail | missing | — | Y |
| vehicle keeper response | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Taking a vehicle without consent, contrary to section 12 of the Theft Act 1968
- **Client label:** Maya Singh
- **Court line:** The defence asks the court to record outstanding device, calibration and procedure records.
- **Chase items:** MG6 / unused schedule clarification
- **Do-not-overstate (sample, family-filtered):** fully proved on current disclosure · safely confirms guilt · Do not import drugs continuity unless the papers support it. · Do not import ABE unless the papers support it.
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
