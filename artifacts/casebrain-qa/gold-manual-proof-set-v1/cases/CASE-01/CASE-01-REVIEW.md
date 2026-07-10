# CASE-01 — phone harassment / attribution

**Source case:** `demo-audit-01-phone-harassment`  
**Source kind:** `evidence_state_local`  
**Risk focus:** Screenshots served vs full download / subscriber gap; attribution overstatement  
**Target review time:** ≤ 8 minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.

---

## Pass / warn / fail (provisional)

- [PASS] **Hard safety:** No outcome/plea/legal-advice claim patterns in assembled surfaces
- [PASS] **CPS chase coverage:** 5/6 expected chase themes reflected in builder output
- [PASS] **Court line present:** Safe court / position line generated
- [PASS] **False-missing risk:** No obvious served→missing inversion in sampled truth-map rows
- [PASS] **Source/page anchors:** At least one proof receipt carries a page/anchor
- [PASS] **Provisional pack score (pre-solicitor):** Not solicitor-validated — Ged/solicitor must complete checklist

---

## Input bundle

`artifacts/evidence-state-audit-local/cases/demo-audit-01-phone-harassment/bundle-text.md`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
| charge sheet | served | N | Y | — |
| mg5 | served | N | Y | — |
| mg6 | served | N | Y | — |
| screenshot and message pack | served | N | Y | 7 |
| phone extraction summary | served | N | N | — |
| full phone download | missing | Y | N | — |
| subscriber/account data | missing | Y | N | — |
| full message export | missing | Y | N | — |
| call logs | missing | Y | N | — |
| device metadata | referred_only | Y | N | — |
| complainant MG11 | incomplete | Y | N | — |
| attribution material | not_safely_confirmed | Y | N | — |

---

## Expected missing material

- full phone download
- subscriber/account data
- full message export
- call logs
- device metadata
- complainant MG11
- attribution material

## Expected unsafe-to-say (family-filtered)

- defendant sent the messages
- Riley Moss sent
- attribution is proved
- full phone download served
- defendant sent

## Expected CPS chase

- full phone download
- subscriber/account data
- full message export
- call logs
- device metadata export
- final signed MG11

## Expected court line (intent)

Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).

## Expected client summary points

- Controlled matter: DA-01 Riley Moss — phone harassment / screenshots served
- Served on papers (examples): charge sheet; mg5; mg6
- Outstanding / chase candidates: full phone download; subscriber/account data; full message export; call logs
- Plain English only — solicitor review required before client use

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
| charge sheet | served | — | N |
| mg5 | served | — | N |
| mg6 | served | — | N |
| screenshot and message pack | served | 7 | N |
| phone extraction summary | served | — | N |
| full phone download | missing | — | Y |
| subscriber/account data | missing | — | Y |
| full message export | missing | — | Y |
| call logs | missing | — | Y |
| device metadata | referred_only | — | Y |
| complainant MG11 | incomplete | — | Y |
| attribution material | not_safely_confirmed | — | Y |

---

## Actual builder snapshot

- **Allegation:** Harassment, contrary to section 2 of the Protection from Harassment Act 1997
- **Client label:** Riley Moss
- **Court line:** The defence asks the court to record per MG6C that screenshot/message material is served but full phone download, subscriber/account data, and final MG11 remain outstanding.
- **Chase items:** Full phone download; Subscriber / account data; Full message export; Call logs; Final signed MG11
- **Do-not-overstate (sample, family-filtered):** defendant sent the messages · Riley Moss sent · attribution is proved · Do not state the defendant sent messages unless attribution is served and safe.
- **Proof receipts (sample):** 9 rows; first: Full phone download

### Precomputed demo-audit artifacts
- cps-chase.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-01-phone-harassment/cps-chase.json`
- court-tab.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-01-phone-harassment/court-tab.json`
- client-summary.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-01-phone-harassment/client-summary.json`
- overview-truth-map.json: `artifacts/casebrain-qa/demo-audit-five/demo-audit-01-phone-harassment/overview-truth-map.json`

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
