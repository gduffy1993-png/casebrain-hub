# CASE-08 — charge mismatch

**Source case:** `demo-audit-69-charge-mg5-hearing`  
**Source kind:** `v9_catalog`  
**Risk focus:** Charge wording vs MG5 offence summary vs listing/hearing date drift  
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
- [PASS] **Source/page anchors:** N/A — truth key has no page anchors on this catalog case (confirm against bundle text in review)
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`catalog:demo-audit-69-charge-mg5-hearing (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| corrected charge sheet | missing | Y | N | — |
| updated mg5 | missing | Y | N | — |
| court listing confirmation | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- corrected charge sheet
- updated mg5
- court listing confirmation

## Expected unsafe-to-say (family-filtered)

- unsafe proof/outcome wording blocked

## Expected CPS chase

- corrected charge sheet
- updated mg5
- court listing confirmation

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-069 Jordan Hale — Charge MG5 hearing contradiction
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; corrected charge sheet; updated mg5
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
| corrected charge sheet | missing | — | Y |
| updated mg5 | missing | — | Y |
| court listing confirmation | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Battery, contrary to section 39 of the Criminal Justice Act 1988
- **Client label:** Jordan Hale
- **Court line:** The defence asks the court to record that the charge wording, MG5 summary, and hearing/listing position require alignment before the defence position is fixed.
- **Chase items:** corrected charge sheet; updated mg5; court listing confirmation
- **Do-not-overstate (sample, family-filtered):** unsafe proof/outcome wording blocked · Do not state "witness statement is final" — Witness statement is draft or unsigned on papers · Do not state "MG11 is consistent and served" — Witness statement is draft or unsigned on papers · Do not state "MG11 served" — Witness statement is draft or unsigned on papers
- **Proof receipts (sample):** 7 rows; first: corrected charge sheet



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
