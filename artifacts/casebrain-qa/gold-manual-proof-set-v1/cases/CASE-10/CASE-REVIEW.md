# CASE-10 — translated messages

**Source case:** `demo-audit-41-translated-messages`  
**Source kind:** `v9_catalog`  
**Risk focus:** Screenshots served; certified translation / interpreter note outstanding  
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
- [PASS] **Source/page anchors:** At least one proof receipt carries a page/anchor
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`catalog:demo-audit-41-translated-messages (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| certified translation | missing | Y | N | — |
| interpreter contemporaneous note | missing | Y | N | — |
| original language export | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- certified translation
- interpreter contemporaneous note
- original language export

## Expected unsafe-to-say (family-filtered)

- fully proved on current disclosure
- safely confirms guilt

## Expected CPS chase

- certified translation
- interpreter contemporaneous note
- original language export

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-041 Aiden Cole — Translated messages / interpreter issue
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; certified translation; interpreter contemporaneous note
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| certified translation | missing | — | Y |
| interpreter contemporaneous note | missing | — | Y |
| original language export | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Harassment, contrary to section 2 of the Protection from Harassment Act 1997
- **Client label:** Aiden Cole
- **Court line:** The defence asks the court to record outstanding message/account source material and complainant statement gaps.
- **Chase items:** certified translation; interpreter contemporaneous note; original language export
- **Do-not-overstate (sample, family-filtered):** fully proved on current disclosure · safely confirms guilt · Do not import ABE unless the papers support it. · Do not state the defendant sent messages unless attribution is served and safe.
- **Proof receipts (sample):** 7 rows; first: certified translation



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
