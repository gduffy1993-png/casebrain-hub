# Full 20 Gold Manual Review — Findings

**Date:** 2026-07-10  
**Branch:** `feature/gold-manual-proof-set-v1`  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Method:** Human-style solicitor review of remaining cases + prior Waves A+B PASS  
**Scope:** Review / findings only — no code changes in this pass.

**Pack rollup (machine):** 20 pass / 0 warn / 0 fail · hard safety 0  
**Waves A+B (prior human):** PASS — see `WAVES-A-B-HUMAN-FEEDBACK-SUMMARY.md`

---

## 1. Overall full-pack verdict

### **WARN (presentation) — no hard-safety blockers**

| Layer | Verdict |
|-------|---------|
| Hard safety | **PASS** — clean across all 20 |
| Waves A+B (7 cases) | **PASS** (already reviewed + fixed) |
| Remainder (13 cases) | **Mixed** — 6 PASS · 7 WARN · 0 FAIL |
| Full 20 as pilot-ready gold | **WARN** until listed presentation polish is done (or pilot scoped to A+B + strong local PASS set) |

**Meaning:** Safe to run a **controlled solicitor pilot** on Waves A+B (and optionally the strong local PASS remainder). Do **not** treat every v9-catalog remainder as gold-complete until client summary / do-not polish lands.

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

### Remainder — this pass

| Case | Family | Mark | Issue class |
|------|--------|------|-------------|
| CASE-03 | custody extract vs full custody | **PASS** | presentation_polish (minor) |
| CASE-05 | Encro handle attribution | **PASS** | expected_solicitor_caution (thin anchors) |
| CASE-07 | bad redaction | **WARN** | presentation_polish |
| CASE-09 | domestic order / restraining order | **WARN** | presentation_polish |
| CASE-10 | translated messages | **WARN** | presentation_polish |
| CASE-11 | youth / AA / intermediary | **PASS** | presentation_polish (minor) |
| CASE-12 | ABE / first account / third-party | **PASS** | presentation_polish (minor) |
| CASE-13 | drugs lab / continuity | **WARN** | presentation_polish |
| CASE-14 | fraud bank/device attribution | **PASS** | none / minor SVR |
| CASE-16 | ANPR / vehicle ID | **WARN** | presentation_polish |
| CASE-17 | medical injury report missing | **PASS** | presentation_polish (null client only) |
| CASE-18 | prison calls / call logs | **WARN** | presentation_polish |
| CASE-19 | social handles / subscriber gap | **WARN** | presentation_polish |

**Remainder tally:** 6 PASS · 7 WARN · 0 FAIL  
**Full 20 human tally (incl. A+B):** 13 PASS · 7 WARN · 0 FAIL

---

## 3. Per-case findings (remainder)

### CASE-03 — custody extract vs full custody — **PASS**
- Family risk surfaced: extract served vs full custody / interview / BWV referred-only.
- Court specific and hearing-safe; chase family-specific (BWV export, full custody, interview, PACE).
- Client summary present, provisional, non-advice.
- Minor: some proof rows `referred_only` vs receipt “Missing”; thin anchors caveated.
- Usable supervised pre-court aid.

### CASE-05 — Encro handle attribution — **PASS**
- Family risk clear: extracts ≠ handle/attribution proved.
- Court/chase Encro-specific; do-not on-family.
- Client clear and provisional.
- Many anchors `source verification required` — honest solicitor caution.
- Usable supervised pre-court aid.

### CASE-07 — bad redaction — **WARN**
- Chase right (unredacted MG11, redaction schedule, full police note).
- Court usable but vaguer (“redaction and unredacted schedule issues”).
- **Client summary null.**
- Stock MG11 do-not triplicate + placeholder guilt block.
- Court/chase usable; not client-ready.

### CASE-09 — domestic order / restraining order — **WARN**
- Court/chase on-family (sealed order, service proof, breach map).
- **Client summary null.**
- Off-family do-not: message-attribution stock (“defendant sent messages”).
- Repeated MG11 draft lines; mismatched proof unit labels + SVR.
- Usable if solicitor uses court/chase only.

### CASE-10 — translated messages — **WARN**
- Strong court line (certified translation / interpreter / source-language export).
- Chase on-family.
- **Client summary null.**
- Do-not stock clutter (MG11 + some message/interview stock).
- Court/chase alone usable.

### CASE-11 — youth / AA / intermediary — **PASS**
- Family risk clear; court/chase/client good.
- Minor: court omits AA while chase includes it.
- Usable supervised pre-court aid.

### CASE-12 — ABE / first account / third-party — **PASS**
- Draft MG11 vs ABE video/transcript/signed MG11 correctly held.
- Court/chase/client strong; do-not on-family.
- Soft: ABE `referred_only` vs receipt “Missing” wording.
- Usable supervised pre-court aid.

### CASE-13 — drugs lab / continuity — **WARN**
- Court/chase good (lab intake, continuity, SFR).
- **Client summary null.**
- Stock MG11 do-not noise alongside one good continuity do-not.
- Court/chase usable; client gap.

### CASE-14 — fraud bank/device attribution — **PASS**
- Summaries vs full export / source / tracing correctly led.
- Court/chase/client/do-not clean.
- Strongest “clean” remainder case with CASE-05/03.

### CASE-16 — ANPR / vehicle ID — **WARN**
- Court/chase on-family (ANPR images, audit trail, keeper).
- **Client summary null.**
- Off-theme do-not: “Do not import drugs continuity…” on ANPR pack + MG11 triplicate.
- Chase draft template / lowercase labels — polish.
- Usable supervised with eyes open.

### CASE-17 — medical injury report missing — **PASS**
- Best court line in the v9 remainder set (hospital / consultant / injury photos).
- Chase on-family; medical do-not on-family.
- **Client summary null** — only material gap; still PASS on court/chase/safety.
- Usable supervised pre-court aid (court/chase).

### CASE-18 — prison calls / call logs — **WARN**
- Court/chase on-family (recordings, PIN, telecom).
- **Client summary null.**
- Do-not is MG11-only (missed PIN/attribution guards) — polish, not wrong family.
- Usable supervised.

### CASE-19 — social handles / subscriber gap — **WARN**
- Court/chase on-family (platform, handle mapping, IP/subscriber).
- **Client summary null.**
- Do-not MG11-only (missed handle/subscriber overstatement guards).
- Usable supervised.

---

## 4. Cross-cutting patterns

| Pattern | Observation |
|---------|-------------|
| Hard safety | Clean — no plea/outcome/advice failures |
| Court / chase | Generally family-correct; strongest surface across remainder |
| Client summary | Present on most `evidence_state_local` cases; **null on most v9_catalog WARNs** (07, 09, 10, 13, 16, 17, 18, 19) |
| Do-not clutter | Recurring MG11 draft/unsigned triples on v9 cases; off-family samples on **09** (messages) and **16** (drugs continuity) |
| Proof anchors | Often honestly labelled `source verification required` — expected solicitor caution, not fake strength |
| False served/missing | No material inversions found |
| Duplicate wording | MG11 do-not triples; occasional court/chase template sameness |

---

## 5. Fixes needed before full-20 pilot pack

**Stop here — do not implement until approved.**

### A. Hard safety
- **None identified.**

### B. Presentation polish (recommended before calling all 20 pilot-ready)

1. **Client summaries for v9 WARN/PASS-null cases**  
   Add family-led provisional client summaries for: CASE-07, 09, 10, 13, 16, 17, 18, 19 (same pattern as CASE-15/20 secondary-surface polish).

2. **Stricter do-not family filters on remainder**  
   - CASE-09: drop message-attribution stock.  
   - CASE-16: drop drugs-continuity stock.  
   - Collapse repeated MG11 draft/unsigned triples to one line (or family-relevant only) on v9 cases.  
   - CASE-18/19: prefer family-specific do-not (PIN/handle/subscriber) over MG11-only noise where possible.

3. **Court line specificity (light)**  
   - CASE-07: tighten redaction court line (served redacted vs outstanding unredacted schedule / MG11).

4. **Proof presentation (light)**  
   - Prefer honest SVR over wrong unit labels (e.g. CASE-09 “Custody unit” on sealed order).  
   - Align `referred_only` vs receipt “Missing” wording where cheap (CASE-03, 12).

5. **Chase draft casing (cosmetic)**  
   - Title-case family chase labels on v9 packets (CASE-16 etc.).

### C. Expected solicitor caution (no fix required)
- Thin / `source verification required` anchors on catalog cases.
- Supervised use only; checklists unsigned.
- Controlled fictional / PDF-backed claim discipline.

---

## 6. Recommended next gate

**Option 1 (preferred if polishing):**  
Approve presentation polish list above → rebuild → re-spot-check WARN set → then full-20 pilot pack.

**Option 2 (pilot now, scoped):**  
Start controlled solicitor pilot on **Waves A+B + PASS remainder** (CASE-03, 05, 11, 12, 14, and optionally 17), holding WARN v9 cases until client/do-not polish.

**Do not:** claim solicitor-validated real-world performance, or merge/deploy product core from this pack.

---

## 7. Claim discipline

| Claim | Allowed? |
|-------|----------|
| Full-20 human-style findings on controlled fictional/PDF-backed pack | **Yes** |
| Hard safety clean; Waves A+B PASS | **Yes** |
| Full pack machine 20/0/0 | **Yes** |
| All 20 human PASS / gold-complete | **No** — 7 WARN (presentation) |
| Real-world solicitor-validated performance | **No** until checklists signed |
| Autonomous court/CPS sending | **No** |
| Legal advice replacement | **No** |

---

## 8. Ask before implementing

Findings written. **No code changes made.**

If you want fixes next, say whether to:
1. Polish **all WARN cases** (client + do-not + light court/proof), or  
2. Pilot-scope **A+B + PASS remainder** and polish WARNs later.
