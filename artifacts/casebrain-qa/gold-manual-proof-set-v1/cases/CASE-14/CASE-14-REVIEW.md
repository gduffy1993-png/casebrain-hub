# CASE-14 — fraud bank/device attribution

**Source case:** `demo-audit-16-fraud-bank-statements`  
**Risk focus:** Bank summaries served; full transaction export / device ownership gap  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 3/3 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** At least one proof receipt carries a page/anchor
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-16-fraud-bank-statements/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| bank statement summaries | served | N | N | 6 |
| officer statement | served | N | Y | — |
| full transaction export | missing | Y | N | — |
| source banking records | missing | Y | N | — |
| beneficiary tracing report | referred_only | Y | N | — |

---

## Expected missing material

- full transaction export
- source banking records
- beneficiary tracing report

## Expected unsafe-to-say

- fraud proved from summaries alone
- BWV shows
- CCTV proves

## Expected CPS chase

- full transaction export
- source banking records
- beneficiary tracing report

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-16 Isla Grant — fraud / bank summaries served
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: full transaction export; source banking records; beneficiary tracing report
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| bank statement summaries | served | 6 | N |
| officer statement | served | — | N |
| full transaction export | missing | — | Y |
| source banking records | missing | — | Y |
| beneficiary tracing report | referred_only | — | Y |

---

## Actual builder snapshot

- **Allegation:** Fraud by false representation, contrary to section 1 of the Fraud Act 2006
- **Client label:** Isla Grant
- **Court line:** The defence asks the court to record per MG6C that bank statement summaries are served but full transaction export, source banking records, and tracing material remain outstanding.
- **Chase items:** Full transaction export; Source banking records; Beneficiary tracing report
- **Do-not-overstate (sample):** fraud proved from summaries alone · BWV shows · CCTV proves · Do not treat bank summaries alone as proof of fraud or account attribution.
- **Proof receipts (sample):** 7 rows; first: Full transaction export

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-16-fraud-bank-statements/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-16-fraud-bank-statements/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-16-fraud-bank-statements/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-16-fraud-bank-statements/overview-truth-map.json`

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
