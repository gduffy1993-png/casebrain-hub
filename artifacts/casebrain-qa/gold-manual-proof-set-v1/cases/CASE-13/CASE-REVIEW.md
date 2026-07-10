# CASE-13 — drugs lab / continuity

**Source case:** `demo-audit-50-lab-continuity-conflict`  
**Source kind:** `v9_catalog`  
**Risk focus:** Drugs schedule served; lab intake / continuity / SFR outstanding  
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

`catalog:demo-audit-50-lab-continuity-conflict (materialized from v9_catalog)`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| witness MG11 | incomplete | Y | N | — |
| custody extract | incomplete | Y | N | — |
| lab intake sheet | missing | Y | N | — |
| full continuity chain | missing | Y | N | — |
| sfr drugs analysis | missing | Y | N | — |

---

## Expected missing material

- witness MG11
- custody extract
- lab intake sheet
- full continuity chain
- sfr drugs analysis

## Expected unsafe-to-say (family-filtered)

- unsafe proof/outcome wording blocked

## Expected CPS chase

- lab intake sheet
- full continuity chain
- sfr drugs analysis

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-050 Holly Reed — Lab continuity conflict
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: witness MG11; custody extract; lab intake sheet; full continuity chain
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| witness MG11 | incomplete | — | Y |
| custody extract | incomplete | — | Y |
| lab intake sheet | missing | — | Y |
| full continuity chain | missing | — | Y |
| sfr drugs analysis | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Possession with intent to supply a controlled drug, contrary to section 5(3) of the Misuse of Drugs Act 1971
- **Client label:** Holly Reed
- **Court line:** The defence asks the court to record that lab intake, continuity chain, and SFR/drugs analysis material remain outstanding before the exhibit position is fixed.
- **Chase items:** lab intake sheet; full continuity chain; sfr drugs analysis
- **Do-not-overstate (sample, family-filtered):** unsafe proof/outcome wording blocked · Do not rely on drug continuity unless lab/continuity material is served. · Do not state "witness statement is final" — Witness statement is draft or unsigned on papers · Do not state "MG11 is consistent and served" — Witness statement is draft or unsigned on papers
- **Proof receipts (sample):** 7 rows; first: lab intake sheet



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
