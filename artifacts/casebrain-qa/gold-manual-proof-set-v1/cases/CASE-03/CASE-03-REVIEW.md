# CASE-03 — custody extract vs full custody

**Source case:** `demo-audit-27-custody-pace-missing`  
**Risk focus:** Partial custody / PACE record vs full custody outstanding  
**Target review time:** ≤ 8 minutes  
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

`artifacts/evidence-state-audit-local/cases/demo-audit-27-custody-pace-missing/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| officer MG11 | incomplete | Y | N | — |
| custody record extract | incomplete | Y | N | — |
| body-worn video | referred_only | Y | N | — |
| full custody record | missing | Y | N | — |
| interview audio | missing | Y | N | — |
| PACE safeguards detail | missing | Y | N | — |

---

## Expected missing material

- officer MG11
- custody record extract
- body-worn video
- full custody record
- interview audio
- PACE safeguards detail

## Expected unsafe-to-say

- BWV shows the assault
- full video proves
- phone extraction

## Expected CPS chase

- full bwv export
- full custody record
- interview audio
- PACE safeguards detail

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-27 Sam Okonkwo — custody PACE material missing
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: officer MG11; custody record extract; body-worn video; full custody record
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| officer MG11 | incomplete | — | Y |
| custody record extract | incomplete | — | Y |
| body-worn video | referred_only | — | Y |
| full custody record | missing | — | Y |
| interview audio | missing | — | Y |
| PACE safeguards detail | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018
- **Client label:** Sam Okonkwo
- **Court line:** The defence asks the court to record per MG6C that custody extract is served, BWV is referred only, and full custody record and interview material remain outstanding.
- **Chase items:** Full BWV export; Full custody record; Interview audio; PACE safeguards detail
- **Do-not-overstate (sample):** BWV shows the assault · full video proves · phone extraction · Do not rely on full BWV sequence unless export is served.
- **Proof receipts (sample):** 9 rows; first: Full custody record

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-27-custody-pace-missing/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-27-custody-pace-missing/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-27-custody-pace-missing/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-27-custody-pace-missing/overview-truth-map.json`

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
