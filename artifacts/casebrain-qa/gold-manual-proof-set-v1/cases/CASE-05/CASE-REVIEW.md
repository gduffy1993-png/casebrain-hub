# CASE-05 — Encro handle attribution

**Source case:** `demo-audit-05-encro-attribution`  
**Source kind:** `evidence_state_local`  
**Risk focus:** Message extracts vs handle-to-defendant mapping not proved  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 5/5 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** At least one proof receipt carries a page/anchor
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-05-encro-attribution/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| message extracts | served | N | N | 6 |
| platform/source extraction | referred_only | Y | N | — |
| handle attribution report | missing | Y | N | — |
| subscriber/account data | missing | Y | N | — |
| device continuity | missing | Y | N | — |
| co-defendant material | missing | Y | N | — |
| full download/export | missing | Y | N | — |
| handle/phone attribution | not_safely_confirmed | Y | N | — |

---

## Expected missing material

- platform/source extraction
- handle attribution report
- subscriber/account data
- device continuity
- co-defendant material
- full download/export
- handle/phone attribution

## Expected unsafe-to-say (family-filtered)

- handle proves defendant
- NIGHTLINE-77 is Liam Craft
- phone proves role
- handle proves
- phone proves defendant's role

## Expected CPS chase

- platform/source extraction
- handle attribution report
- subscriber/account data
- device continuity
- full download/export

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-05 Liam Craft — Encro / county-lines attribution gap
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: platform/source extraction; handle attribution report; subscriber/account data; device continuity
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| message extracts | served | 6 | N |
| platform/source extraction | referred_only | — | Y |
| handle attribution report | missing | — | Y |
| subscriber/account data | missing | — | Y |
| device continuity | missing | — | Y |
| co-defendant material | missing | — | Y |
| full download/export | missing | — | Y |
| handle/phone attribution | not_safely_confirmed | — | Y |

---

## Actual builder snapshot

- **Allegation:** Being concerned in the supply of a controlled drug of Class A, namely cocaine
- **Client label:** Liam Craft
- **Court line:** The defence asks the court to record per MG6C that message extracts are served and handle attribution report and platform extraction remain outstanding.
- **Chase items:** Platform / source extraction; Handle attribution report; Subscriber / account data; Device continuity; Full download / export
- **Do-not-overstate (sample, family-filtered):** handle proves defendant · NIGHTLINE-77 is Liam Craft · phone proves role · Do not treat handle or phone reference as proof of the defendant role without served attribution.
- **Proof receipts (sample):** 9 rows; first: Platform / source extraction

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-05-encro-attribution/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-05-encro-attribution/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-05-encro-attribution/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-05-encro-attribution/overview-truth-map.json`

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
