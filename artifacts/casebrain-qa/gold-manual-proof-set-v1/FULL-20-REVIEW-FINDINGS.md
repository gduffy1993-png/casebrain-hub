# Full 20 Gold Manual Review — Findings

**Date:** 2026-07-10  
**Branch:** `feature/gold-manual-proof-set-v1`  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Method:** Human-style solicitor review of remaining cases + prior Waves A+B PASS + WARN presentation polish  
**Scope:** Review / findings + presentation-only polish (no Brain / chase core / export / UI).

**Pack rollup (machine):** 20 pass / 0 warn / 0 fail · hard safety 0  
**Waves A+B (prior human):** PASS — see `WAVES-A-B-HUMAN-FEEDBACK-SUMMARY.md`  
**Full-20 human (after WARN polish):** **PASS** (presentation)

---

## 1. Overall full-pack verdict

### **PASS (presentation) — no hard-safety blockers**

| Layer | Verdict |
|-------|---------|
| Hard safety | **PASS** — clean across all 20 |
| Waves A+B (7 cases) | **PASS** |
| Remainder (13 cases) | **PASS** after WARN presentation polish |
| Full 20 as pilot-ready gold | **PASS (presentation)** — supervised pilot aid on controlled fictional / PDF-backed bundles; not solicitor-validated until checklists signed |

**Meaning:** Safe to run a **controlled solicitor pilot** on the full 20 as a supervised review aid. Do **not** claim live-client accuracy or legal-advice replacement.

---

## 2. Scoreboard (all 20)

### Waves A+B (prior) — PASS

| Case | Family | Mark |
|------|--------|------|
| CASE-01 | phone harassment / attribution | **PASS** |
| CASE-02 | BWV referred-only | **PASS** |
| CASE-04 | CCTV stills vs master | **PASS** |
| CASE-06 | mixed-defendant | **PASS** |
| CASE-08 | charge mismatch | **PASS** |
| CASE-15 | motoring SJP / s172 | **PASS** |
| CASE-20 | OCR/date/court mismatch | **PASS** |

### Remainder — after WARN polish

| Case | Family | Mark | Notes |
|------|--------|------|-------|
| CASE-03 | custody extract vs full custody | **PASS** | minor presentation polish only |
| CASE-05 | Encro handle attribution | **PASS** | thin anchors → SVR (expected caution) |
| CASE-07 | bad redaction | **PASS** | client + family do-not + tighter court |
| CASE-09 | domestic order / restraining order | **PASS** | client; no message/phone stock |
| CASE-10 | translated messages | **PASS** | client + translation do-not |
| CASE-11 | youth / AA / intermediary | **PASS** | minor only |
| CASE-12 | ABE / first account / third-party | **PASS** | minor only |
| CASE-13 | drugs lab / continuity | **PASS** | client + continuity do-not |
| CASE-14 | fraud bank/device attribution | **PASS** | clean |
| CASE-16 | ANPR / vehicle ID | **PASS** | client; no drugs/off-family do-not |
| CASE-17 | medical injury report missing | **PASS** | court/chase strong; client may still be thin |
| CASE-18 | prison calls / call logs | **PASS** | client + PIN/call-log do-not |
| CASE-19 | social handles / subscriber gap | **PASS** | client + handle/subscriber do-not |

**Full 20 human tally:** 20 PASS · 0 WARN · 0 FAIL (presentation)

---

## 3. WARN polish applied (option 1)

Presentation/reporting only in `presentation-gates.ts` + rebuilt packets:

1. **Family client summaries** for redaction / order / translation / lab / ANPR / prison / social (null/thin → provisional family-led text).
2. **Do-not filters:** drop off-family message stock on order (CASE-09); drop drugs continuity on ANPR (CASE-16); collapse MG11 draft triples; prefer family fallbacks (order / redaction / ANPR / prison / social / lab / translation).
3. **CASE-07 court:** redacted papers served vs outstanding unredacted MG11 / schedule / police note.
4. **Proof:** weak/mismatched anchors → `source verification required`.

Spot-check after rebuild: client non-null on former WARNs; CASE-09 free of irrelevant message/phone wording; CASE-16 free of drugs continuity; Waves A+B court/chase unchanged in substance.

---

## 4. Cross-cutting patterns

| Pattern | Observation |
|---------|-------------|
| Hard safety | Clean — no plea/outcome/advice failures |
| Court / chase | Family-correct across pack |
| Client summary | Present on former WARN v9 families after polish |
| Do-not | Family-filtered; stock MG11 collapsed where applicable |
| Proof anchors | Often `source verification required` — honest solicitor caution |
| Machine pack | 20 pass / 0 warn / 0 fail · hard safety 0 |

---

## 5. Remaining expected solicitor caution (no product fix)

- Thin / `source verification required` anchors on catalog cases.
- Supervised use only; checklists unsigned.
- Controlled fictional / PDF-backed claim discipline.
- CASE-17 client may remain thinner than court/chase — still PASS on safety and family surfaces.

---

## 6. Claim discipline

| Claim | Allowed? |
|-------|----------|
| Full-20 human-style findings on controlled fictional/PDF-backed pack | **Yes** |
| Hard safety clean; Waves A+B PASS; full-20 presentation PASS after polish | **Yes** |
| Full pack machine 20/0/0 | **Yes** |
| Real-world solicitor-validated performance | **No** until checklists signed |
| Autonomous court/CPS sending | **No** |
| Legal advice replacement | **No** |

---

*Findings updated after option-1 WARN presentation polish. Reporting/presentation only.*
