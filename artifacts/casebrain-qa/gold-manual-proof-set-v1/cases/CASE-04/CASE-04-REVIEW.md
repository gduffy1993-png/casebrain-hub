# CASE-04 — CCTV stills vs master footage

**Source case:** `demo-audit-02-cctv-stills`  
**Source kind:** `evidence_state_local`  
**Risk focus:** Stills served; master export / continuity outstanding  
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

`artifacts/evidence-state-audit-local/cases/demo-audit-02-cctv-stills/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| CCTV still images | served | N | N | 6 |
| master CCTV footage | missing | Y | N | — |
| full CCTV export | referred_only | Y | N | — |
| continuity/provenance | missing | Y | N | — |
| audit trail | missing | Y | N | — |
| recognition/ID basis | missing | Y | N | — |

---

## Expected missing material

- master CCTV footage
- full CCTV export
- continuity/provenance
- audit trail
- recognition/ID basis

## Expected unsafe-to-say (family-filtered)

- CCTV proves identity
- CCTV proves offence
- positive identification from stills

## Expected CPS chase

- master CCTV footage
- full CCTV export
- continuity/provenance
- audit trail

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-02 Devon Walsh — CCTV stills served / master footage missing
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: master CCTV footage; full CCTV export; continuity/provenance; audit trail
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

> Some chase rows may require source verification; page/source anchors are review aids, not solicitor sign-off.

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| CCTV still images | served | 6 | N |
| master CCTV footage | missing | — | Y |
| full CCTV export | referred_only | — | Y |
| continuity/provenance | missing | — | Y |
| audit trail | missing | — | Y |
| recognition/ID basis | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968
- **Client label:** Devon Walsh
- **Court line:** The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage, full export, and continuity/provenance remain outstanding.
- **Chase items:** Master CCTV footage; Full CCTV export; CCTV Continuity / provenance; CCTV audit trail / source hash
- **Do-not-overstate (sample, family-filtered):** CCTV proves identity · CCTV proves offence · positive identification from stills · Do not treat stills alone as proof of identity or offence.
- **Proof receipts (sample):** 9 rows; first: Master CCTV footage

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-02-cctv-stills/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-02-cctv-stills/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-02-cctv-stills/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-02-cctv-stills/overview-truth-map.json`

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
