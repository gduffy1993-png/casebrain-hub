# CASE-20 — OCR/date/court mismatch

**Source case:** `demo-audit-30-layout-hearing-date`  
**Risk focus:** Layout / hearing date / court listing drift across papers  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 3/5 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** At least one proof receipt carries a page/anchor
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-30-layout-hearing-date/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| cctv still images | served | N | N | 6 |
| master cctv footage | missing | Y | N | — |
| full cctv export | referred_only | Y | N | — |
| continuity/provenance | missing | Y | N | — |
| audit trail | missing | Y | N | — |
| recognition/ID basis | missing | Y | N | — |

---

## Expected missing material

- master cctv footage
- full cctv export
- continuity/provenance
- audit trail
- recognition/ID basis

## Expected unsafe-to-say

- CCTV proves identity
- CCTV proves offence
- positive identification from stills
- phone download
- Encro handle

## Expected CPS chase

- master cctv footage
- full cctv export
- continuity/provenance
- CCTV audit trail / source hash record
- recognition/ID basis

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-30 Devon Walsh — layout/OCR hearing date trap
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: master cctv footage; full cctv export; continuity/provenance; audit trail
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| cctv still images | served | 6 | N |
| master cctv footage | missing | — | Y |
| full cctv export | referred_only | — | Y |
| continuity/provenance | missing | — | Y |
| audit trail | missing | — | Y |
| recognition/ID basis | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968
- **Client label:** Devon Walsh
- **Court line:** The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage and continuity/provenance remain outstanding.
- **Chase items:** Master CCTV footage; Full CCTV export; CCTV Continuity / provenance; CCTV audit trail / source hash record; Recognition / ID basis
- **Do-not-overstate (sample):** CCTV proves identity · CCTV proves offence · positive identification from stills · phone download
- **Proof receipts (sample):** 9 rows; first: Master CCTV footage

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-30-layout-hearing-date/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-30-layout-hearing-date/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-30-layout-hearing-date/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-30-layout-hearing-date/overview-truth-map.json`

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
