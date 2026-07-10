# CASE-19 — social handles / subscriber gap

**Source case:** `demo-audit-47-social-media-handles`  
**Source kind:** `v9_catalog`  
**Risk focus:** Handle / social material vs subscriber / account attribution gap  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

> **INTERNAL PRODUCT-HUNT CASE (v9 catalog)** — Not a clean solicitor example. Use to hunt generic MG6 chase, off-family court templates, and thin-catalog gaps. Do **not** present as a polished gold exemplar for external solicitor review.

---

## Pass / warn / fail (provisional)

- [PASS] **Reviewer lane:** v9 catalog source — packet banner still marks catalog origin; chase is not generic-only
- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 3/3 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** N/A — truth key has no page anchors on this catalog case (confirm against bundle text in review)
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`catalog:demo-audit-47-social-media-handles (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| platform disclosure response | missing | Y | N | — |
| handle mapping report | missing | Y | N | — |
| ip/subscriber data | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- platform disclosure response
- handle mapping report
- ip/subscriber data

## Expected unsafe-to-say (family-filtered)

- fully proved on current disclosure
- safely confirms guilt

## Expected CPS chase

- platform disclosure response
- handle mapping report
- ip/subscriber data

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-047 Nadia Pike — Social media handles attribution
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; platform disclosure response; handle mapping report
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| platform disclosure response | missing | — | Y |
| handle mapping report | missing | — | Y |
| ip/subscriber data | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Malicious communications, contrary to section 1 of the Malicious Communications Act 1988
- **Client label:** Nadia Pike
- **Court line:** The defence asks the court to record that the full extraction/source material remains outstanding.
- **Chase items:** platform disclosure response; handle mapping report; ip/subscriber data
- **Do-not-overstate (sample, family-filtered):** fully proved on current disclosure · safely confirms guilt · Do not import ABE unless the papers support it. · Do not state "witness statement is final" — Witness statement is draft or unsigned on papers
- **Proof receipts (sample):** 7 rows; first: platform disclosure response



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
