# CASE-09 — domestic order / restraining order breach

**Source case:** `demo-audit-32-restraining-order-breach`  
**Source kind:** `v9_catalog`  
**Risk focus:** Order extract only; sealed order / service proof outstanding  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

> **Source:** v9 catalog controlled / fictional bundle. Included for gold manual human review. **Not solicitor-validated** until the checklist is signed.

---

## Pass / warn / fail (provisional)

- [PASS] **Reviewer lane:** v9 catalog controlled bundle — included for gold manual human review (not solicitor-validated until signed)
- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 3/3 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** Thin/mismatched anchors labelled source verification required (honest review aid)
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

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

## Expected unsafe-to-say (family-filtered)

- unsafe proof/outcome wording blocked

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

> Some chase rows may require source verification; page/source anchors are review aids, not solicitor sign-off.

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
- **Court line:** The defence asks the court to record that sealed order and service-proof material remain outstanding on the current papers.
- **Chase items:** full sealed restraining order; service proof; breach location map
- **Do-not-overstate (sample, family-filtered):** unsafe proof/outcome wording blocked · Do not state the defendant sent messages unless attribution is served and safe. · Do not state "witness statement is final" — Witness statement is draft or unsigned on papers · Do not state "MG11 is consistent and served" — Witness statement is draft or unsigned on papers
- **Proof receipts (sample):** 7 rows; first: full sealed restraining order



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
