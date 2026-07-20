# CASE-15 — motoring SJP thin evidence

**Source case:** `demo-audit-18-motoring-sjp-thin`  
**Source kind:** `evidence_state_local`  
**Risk focus:** Thin SJP file; device / CCTV export outstanding  
**Target review time:** ≤ 7 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 5/5 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** Thin/mismatched anchors labelled source verification required (honest review aid)
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-18-motoring-sjp-thin/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| officer MG11 | served | N | N | — |
| breath/device procedure summary | served | N | N | 6 |
| device calibration certificate | missing | Y | N | — |
| full intoxilyser record | missing | Y | N | — |
| cctv/dashcam export | referred_only | Y | N | — |

---

## Expected missing material

- device calibration certificate
- full intoxilyser record
- cctv/dashcam export

## Expected unsafe-to-say (family-filtered)

- Do not treat device summary as proof of reliability

## Expected CPS chase

- Notice / requirement to identify driver
- Proof of service / posting
- Keeper / DVLA record
- Nomination / response record
- Procedure bundle / SJP notice

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-18 Ella Shaw — motoring SJP thin file
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: device calibration certificate; full intoxilyser record; cctv/dashcam export
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

> Some chase rows may require source verification; page/source anchors are review aids, not solicitor sign-off.

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| officer MG11 | served | — | N |
| breath/device procedure summary | served | 6 | N |
| device calibration certificate | missing | — | Y |
| full intoxilyser record | missing | — | Y |
| cctv/dashcam export | referred_only | — | Y |

---

## Actual builder snapshot

- **Allegation:** Fail to provide driver details, contrary to section 172(2) of the Road Traffic Act 1988
- **Client label:** Ella Shaw
- **Court line:** The defence asks the court to record that the s172 notice/requirement to identify the driver, keeper position, and service/nomination records require confirmation before the defence position on driver identification is fixed.
- **Chase items:** Notice / requirement to identify driver; Proof of service / posting; Keeper / DVLA record; Nomination / response record; Procedure bundle / SJP notice
- **Do-not-overstate (sample, family-filtered):** Do not treat device summary as proof of reliability · Do not treat procedure summary alone as proof of device reliability or identity.
- **Proof receipts (sample):** 9 rows; first: Notice / requirement to identify driver

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-18-motoring-sjp-thin/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-18-motoring-sjp-thin/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-18-motoring-sjp-thin/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-18-motoring-sjp-thin/overview-truth-map.json`

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
