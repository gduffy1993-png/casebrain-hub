# CASE-06 — mixed-defendant material

**Source case:** `demo-audit-04-co-def-interview`  
**Source kind:** `evidence_state_local`  
**Risk focus:** Co-defendant interview served; target defendant interview missing  
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
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-04-co-def-interview/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| officer statement | served | N | Y | — |
| co-defendant Tara Vale interview summary | other_defendant_only | N | N | 6 |
| Morgan Reid interview summary | missing | Y | N | — |
| Morgan Reid interview audio | missing | Y | N | — |
| Morgan Reid interview transcript | missing | Y | N | — |
| co-defendant attribution/continuity | missing | Y | N | — |

---

## Expected missing material

- Morgan Reid interview summary
- Morgan Reid interview audio
- Morgan Reid interview transcript
- co-defendant attribution/continuity

## Expected unsafe-to-say (family-filtered)

- Morgan Reid admitted
- defendant's interview shows
- import co-defendant interview
- Morgan Reid said
- defendant admitted

## Expected CPS chase

- target defendant interview summary
- target defendant interview audio
- target defendant interview transcript
- co-defendant attribution/continuity

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-04 Morgan Reid — co-defendant interview served / target interview missing
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: Morgan Reid interview summary; Morgan Reid interview audio; Morgan Reid interview transcript; co-defendant attribution/continuity
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

> Some chase rows may require source verification; page/source anchors are review aids, not solicitor sign-off.

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| officer statement | served | — | N |
| co-defendant Tara Vale interview summary | other_defendant_only | 6 | N |
| Morgan Reid interview summary | missing | — | Y |
| Morgan Reid interview audio | missing | — | Y |
| Morgan Reid interview transcript | missing | — | Y |
| co-defendant attribution/continuity | missing | — | Y |

---

## Actual builder snapshot

- **Allegation:** Burglary in a dwelling, contrary to section 9(1)(b) of the Theft Act 1968
- **Client label:** Morgan Reid
- **Court line:** The defence asks the court to record per MG6C that co-defendant interview material is segregated and target defendant interview summary/audio remain outstanding.
- **Chase items:** Target defendant interview summary; Target defendant interview audio; Target defendant interview transcript; Co-defendant attribution / continuity
- **Do-not-overstate (sample, family-filtered):** Morgan Reid admitted · defendant's interview shows · import co-defendant interview · Do not import co-defendant interview into the target defendant account.
- **Proof receipts (sample):** 9 rows; first: Target defendant interview summary

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-04-co-def-interview/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-04-co-def-interview/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-04-co-def-interview/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-04-co-def-interview/overview-truth-map.json`

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
