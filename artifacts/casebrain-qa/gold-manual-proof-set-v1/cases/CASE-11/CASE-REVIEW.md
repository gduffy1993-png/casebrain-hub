# CASE-11 — youth / appropriate adult / intermediary

**Source case:** `demo-audit-22-youth-interview`  
**Source kind:** `evidence_state_local`  
**Risk focus:** YJS extract served; youth interview / AA safeguards incomplete  
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

`artifacts/evidence-state-audit-local/cases/demo-audit-22-youth-interview/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| officer statement | served | N | Y | — |
| YJS report extract | served | N | N | 6 |
| full YJS pre-sentence report | missing | Y | N | — |
| vulnerability assessment | missing | Y | N | — |
| youth interview audio | missing | Y | N | — |
| appropriate adult continuity | missing | Y | N | — |

---

## Expected missing material

- full YJS pre-sentence report
- vulnerability assessment
- youth interview audio
- appropriate adult continuity

## Expected unsafe-to-say (family-filtered)

- youth guilt proved
- BWV shows
- full interview shows

## Expected CPS chase

- full YJS pre-sentence report
- vulnerability assessment
- youth interview audio
- appropriate adult continuity

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-22 Kian Doyle — youth court / interview outstanding
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: full YJS pre-sentence report; vulnerability assessment; youth interview audio; appropriate adult continuity
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| officer statement | served | — | N |
| YJS report extract | served | 6 | N |
| full YJS pre-sentence report | missing | — | Y |
| vulnerability assessment | missing | — | Y |
| youth interview audio | missing | — | Y |
| appropriate adult continuity | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968
- **Client label:** Kian Doyle (youth — 17 years)
- **Court line:** The defence asks the court to record per MG6C that YJS extract is served but full pre-sentence report, vulnerability assessment, and youth interview audio remain outstanding.
- **Chase items:** Full YJS pre-sentence report; Vulnerability assessment; Youth interview audio; Appropriate adult continuity
- **Do-not-overstate (sample, family-filtered):** youth guilt proved · BWV shows · full interview shows · Do not import adult-court assumptions — youth interview and YJS material remain provisional.
- **Proof receipts (sample):** 9 rows; first: Vulnerability assessment

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-22-youth-interview/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-22-youth-interview/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-22-youth-interview/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-thirty/demo-audit-22-youth-interview/overview-truth-map.json`

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
