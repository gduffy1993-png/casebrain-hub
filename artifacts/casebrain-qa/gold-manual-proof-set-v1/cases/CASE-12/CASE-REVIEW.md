# CASE-12 — ABE / first account / third-party records

**Source case:** `demo-audit-21-historic-sexual-abe`  
**Risk focus:** Draft MG11 served; ABE video / transcript referred missing  
**Target review time:** ≤ 9 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 4/4 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** At least one proof receipt carries a page/anchor
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-21-historic-sexual-abe/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| complainant MG11 | incomplete | Y | N | — |
| ABE interview video | referred_only | Y | N | — |
| ABE interview transcript | missing | Y | N | — |
| third-party counselling notes | missing | Y | N | — |
| final signed MG11 | missing | Y | N | — |

---

## Expected missing material

- complainant MG11
- ABE interview video
- ABE interview transcript
- third-party counselling notes
- final signed MG11

## Expected unsafe-to-say

- ABE proves guilt
- complainant proved
- BWV shows

## Expected CPS chase

- ABE interview video
- ABE interview transcript
- final signed MG11
- third-party counselling notes

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-21 Daniel Pike — historic sexual / ABE missing
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: complainant MG11; ABE interview video; ABE interview transcript; third-party counselling notes
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| complainant MG11 | incomplete | — | Y |
| ABE interview video | referred_only | — | Y |
| ABE interview transcript | missing | — | Y |
| third-party counselling notes | missing | — | Y |
| final signed MG11 | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Sexual assault, contrary to section 3 of the Sexual Offences Act 2003
- **Client label:** Daniel Pike
- **Court line:** The defence asks the court to record per MG6C that draft complainant material is served but ABE interview video, transcript, and final signed MG11 remain outstanding.
- **Chase items:** ABE interview video; ABE interview transcript; Final signed MG11; Third-party counselling notes
- **Do-not-overstate (sample):** ABE proves guilt · complainant proved · BWV shows · Do not rely on ABE or complainant account as final proof without served interview material.
- **Proof receipts (sample):** 9 rows; first: ABE interview transcript

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-21-historic-sexual-abe/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-21-historic-sexual-abe/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-21-historic-sexual-abe/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-21-historic-sexual-abe/overview-truth-map.json`

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
