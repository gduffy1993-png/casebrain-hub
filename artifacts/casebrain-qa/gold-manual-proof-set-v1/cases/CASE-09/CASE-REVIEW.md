# CASE-09 — domestic order / restraining order breach

**Source case:** `demo-audit-32-restraining-order-breach`  
**Risk focus:** Order extract only; sealed order / service proof outstanding  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 1/3 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [WARN] **Source/page anchors:** No page anchors on sampled receipts — confirm against truth-key anchors
- [WARN] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`catalog:demo-audit-32-restraining-order-breach (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| full sealed restraining order | missing | Y | N | — |
| service proof | missing | Y | N | — |
| breach location map | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- full sealed restraining order
- service proof
- breach location map

## Expected unsafe-to-say

- fully proved on current disclosure
- safely confirms guilt

## Expected CPS chase

- full sealed restraining order
- service proof
- breach location map

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-032 Lena Ortiz — Restraining order breach
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; full sealed restraining order; service proof
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| full sealed restraining order | missing | — | Y |
| service proof | missing | — | Y |
| breach location map | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Breach of a restraining order, contrary to section 5(5) of the Protection from Harassment Act 1997
- **Client label:** Lena Ortiz
- **Court line:** The defence asks the court to record outstanding message/account source material and complainant statement gaps.
- **Chase items:** Full custody record / PACE material; MG6 / unused schedule clarification
- **Do-not-overstate (sample):** fully proved on current disclosure · safely confirms guilt · Do not import BWV unless the papers support it. · Do not import drugs continuity unless the papers support it.
- **Proof receipts (sample):** 10 rows; first: Full custody record / PACE material



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
