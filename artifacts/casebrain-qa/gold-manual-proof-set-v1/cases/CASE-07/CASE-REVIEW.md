# CASE-07 — bad redaction

**Source case:** `demo-audit-44-bad-redaction`  
**Source kind:** `v9_catalog`  
**Risk focus:** Heavy redaction obscuring names/dates; unredacted MG11 outstanding  
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

`catalog:demo-audit-44-bad-redaction (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| unredacted mg11 | missing | Y | N | — |
| redaction schedule | missing | Y | N | — |
| full police note | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- unredacted mg11
- redaction schedule
- full police note

## Expected unsafe-to-say (family-filtered)

- unsafe proof/outcome wording blocked
- Do not rely on redacted text as if the unredacted MG11 and schedule were served.

## Expected CPS chase

- unredacted mg11
- redaction schedule
- full police note

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-044 Farah Kent — Bad redaction hiding names/dates
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; unredacted mg11; redaction schedule
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
| unredacted mg11 | missing | — | Y |
| redaction schedule | missing | — | Y |
| full police note | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Stalking, contrary to section 2A of the Protection from Harassment Act 1997
- **Client label:** Farah Kent
- **Court line:** The defence asks the court to record that redacted papers are served but the unredacted MG11, redaction schedule, and full police note remain outstanding before the defence relies on the redacted text.
- **Chase items:** unredacted mg11; redaction schedule; full police note
- **Do-not-overstate (sample, family-filtered):** unsafe proof/outcome wording blocked · Do not rely on redacted text as if the unredacted MG11 and schedule were served.
- **Proof receipts (sample):** 7 rows; first: unredacted mg11



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
