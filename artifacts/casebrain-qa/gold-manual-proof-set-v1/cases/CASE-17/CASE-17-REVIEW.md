# CASE-17 — medical injury report missing

**Source case:** `demo-audit-61-medical-triage-partial`  
**Source kind:** `v9_catalog`  
**Risk focus:** Triage / injury note partial; consultant medical report referred missing  
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

`catalog:demo-audit-61-medical-triage-partial (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| hospital records | missing | Y | N | — |
| consultant medical report | missing | Y | N | — |
| injury photographs | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- hospital records
- consultant medical report
- injury photographs

## Expected unsafe-to-say (family-filtered)

- unsafe proof/outcome wording blocked

## Expected CPS chase

- hospital records
- consultant medical report
- injury photographs

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-061 Owen Pike — Medical triage note — full report missing
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; hospital records; consultant medical report
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| hospital records | missing | — | Y |
| consultant medical report | missing | — | Y |
| injury photographs | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Wounding with intent, contrary to section 18 of the Offences Against the Person Act 1861
- **Client label:** Owen Pike
- **Court line:** The defence asks the court to record that hospital records, consultant report, and injury photographs remain outstanding before injury causation or extent is treated as fixed.
- **Chase items:** hospital records; consultant medical report; injury photographs
- **Do-not-overstate (sample, family-filtered):** unsafe proof/outcome wording blocked · Do not state "final medical report" — Medical material is absent, draft, or outstanding · Do not state "medical report proves" — Medical material is absent, draft, or outstanding · Do not state "medical is consistent" — Medical material is absent, draft, or outstanding
- **Proof receipts (sample):** 7 rows; first: hospital records



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
