# Gold Manual Proof Set v1 — WARN review

**Reviewed:** 2026-07-10  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Scope:** Reporting / packet review only — no Brain, chase core, export, Supabase, or UI changes.  
**Claim discipline:** Not real-world solicitor validation.

---

## Verdict

**Ready for human solicitor review: YES — with caveats**

- 20/20 packets present, readable in under 10 minutes (~120 lines / ~4–5 KB each).
- Hard safety failures: **0**.
- Every case has pass/warn/fail boxes + adversarial questions + checklist.
- `expected.json` and `actual-summary.json` align structurally (same gold id, family, chase/court/receipt surfaces).
- The original **8 WARN** cases are almost all **v9 catalog** families without PDF-backed precomputed demo-audit artifacts. WARNs are mostly **product cautions for reviewers** (generic MG6 chase / occasional court-line template drift), not pack-blocking defects.
- After a **reporting-only** rescoring pass (clearer chase wording; page-anchor N/A when truth key has none; court-line family-fit check), provisional pack is **13 pass · 7 warn · 0 fail**. CASE-17 cleared to PASS.

**Do not** treat WARN as “do not send to reviewers.” Send with this note so reviewers know what to hunt.

---

## Original 8 WARN cases (from first pack summary)

| Gold ID | Family | Source | Why it warned (original) | Classification | Fix before human review? |
|---------|--------|--------|--------------------------|----------------|--------------------------|
| CASE-07 | bad redaction | `demo-audit-44-bad-redaction` (v9) | Chase: generic MG6 only vs expected unredacted MG11 / redaction schedule / police note; no page anchors; court line used message/account wording | **Real product issue** (chase + court template drift) + **proof/reporting** (anchors N/A on catalog truth key) | **No code fix required for review.** Flag for reviewers. |
| CASE-09 | restraining order breach | `demo-audit-32-restraining-order-breach` (v9) | Page anchors missing; court line digital/message-account wording on order family (chase partially matched) | **Real product issue** (court-line family drift) | **No.** Reviewer should confirm order/service gaps vs digital template. |
| CASE-10 | translated messages | `demo-audit-41-translated-messages` (v9) | Chase labels (interview / MG6) vs expected certified translation / interpreter note / language export | **Real product issue** (chase not family-specific) + **expected solicitor caution** | **No.** Ask: did useful translation chase get suppressed? |
| CASE-13 | drugs lab / continuity | `demo-audit-50-lab-continuity-conflict` (v9) | Chase (MG6 / exhibit mapping) vs expected lab intake / continuity / SFR | **Real product issue** (chase theme miss) | **No.** Reviewer checks lab/continuity chase quality. |
| CASE-16 | ANPR / vehicle ID | `demo-audit-49-anpr-trap` (v9) | Generic MG6 only vs ANPR image / audit trail / keeper response; no page anchors | **Real product issue** (generic chase) + **proof/reporting** (anchors N/A) | **No.** |
| CASE-17 | medical injury report missing | `demo-audit-61-medical-triage-partial` (v9) | Chase label match weak vs hospital / consultant / photos (original) | Was **proof/reporting** scoring noise; medical chase now partially reflected | **No.** Cleared to **PASS** after reporting rescoring. Still worth a quick human glance. |
| CASE-18 | prison calls / call logs | `demo-audit-46-prison-calls` (v9) | Generic MG6 only vs recordings / PIN attribution / telecom export | **Real product issue** (generic chase) | **No.** |
| CASE-19 | social handles / subscriber gap | `demo-audit-47-social-media-handles` (v9) | Chase (MG6 / exhibit mapping) vs platform disclosure / handle mapping / IP-subscriber | **Real product issue** (chase theme miss) | **No.** Court line is on-family (extraction outstanding). |

### Pattern

All eight are **`sourceKind: v9_catalog`**. The 12 original PASS cases are almost all **evidence_state_local** PDF-backed demo-audit fixtures with richer precomputed chase/court artifacts.

So WARN ≠ “packet broken.” WARN ≈ “thin catalog bundle + live builders → generic MG6 / template court risk — good solicitor stress cases.”

---

## Per-WARN detail (current packets after reporting fix)

### CASE-07 — bad redaction
- **Why warn now:** Generic MG6 chase; court line family-fit WARN (message/account on redaction matter).
- **Class:** Product issue for human hunt; not a packet defect.
- **Fix before review:** None. Reviewer should ask adversarial Qs on over-warn, wrong chase, clutter.

### CASE-09 — restraining order breach
- **Why warn now:** Court line family-fit WARN (digital wording). Chase partially OK (1/3).
- **Class:** Product issue (court template).
- **Fix before review:** None.

### CASE-10 — translated messages
- **Why warn now:** Chase theme miss (interview/MG6 vs translation/interpreter).
- **Class:** Product issue + solicitor caution.
- **Fix before review:** None.

### CASE-13 — drugs lab / continuity
- **Why warn now:** Chase theme miss (MG6/exhibit vs lab/SFR).
- **Class:** Product issue.
- **Fix before review:** None.

### CASE-16 — ANPR / vehicle ID
- **Why warn now:** Generic MG6 chase fallback.
- **Class:** Product issue.
- **Fix before review:** None. Anchors N/A (truth key has none).

### CASE-17 — medical (original WARN → now PASS)
- **Why it warned originally:** Weak chase string match.
- **Class:** Was reporting noise; medical chase now visible.
- **Fix before review:** None.

### CASE-18 — prison calls
- **Why warn now:** Generic MG6 chase fallback.
- **Class:** Product issue.
- **Fix before review:** None.

### CASE-19 — social handles / subscriber
- **Why warn now:** Chase theme miss vs handle/subscriber expectations.
- **Class:** Product issue.
- **Fix before review:** None.

---

## Pack quality checks

| Check | Result |
|-------|--------|
| CASE-XX-REVIEW.md readable &lt; 10 min | **Yes** — ~119 lines / ~4 KB for WARN cases; PASS cases ~140 lines |
| expected.json ↔ actual-summary.json align | **Yes** — same ids; truth states drive expected; actual carries builder chase/court/receipts/truth-map |
| Pass/warn/fail boxes on every case | **Yes** |
| Adversarial questions on every case | **Yes** (review + checklist) |
| Hard safety failures | **0** |
| Real-world solicitor validation claimed | **No** |

### Alignment notes (not blockers)
- Expected court line is an **intent paraphrase**; actual is a **generated** line — compare for family fit, not string equality.
- Expected chase is from **truth-key outstanding list**; actual chase is from **builders** (and precomputed artifacts when present).
- v9 catalog truth keys often have **null** `source_page_anchor` — missing receipt pages is then N/A, not a false fail.

---

## Reporting fixes applied (this review)

1. Chase WARN wording distinguishes **generic MG6 fallback** vs vague mismatch.
2. Source/page WARN suppressed when truth key has **no** anchors (N/A pass).
3. Added **Court line family fit** WARN when digital/message-account wording appears on non-digital families.
4. Regenerated pack → **13 pass / 7 warn / 0 fail**.

No Brain / chase core / export / Supabase / UI changes.

---

## Fixes needed before sending to reviewers

**Required**
1. Attach this file (`GOLD-MANUAL-WARN-REVIEW.md`) when sending the pack.
2. Tell reviewers: WARN cases are intentional stress cases — hunt generic MG6 chase and off-family court lines; do not treat WARN as “skip.”
3. Remind: **not** solicitor-validated yet; complete `manual-review-checklist.md` per case.

**Optional (not blocking)**
1. Later product work (out of this pack): improve chase specificity on v9 thin families; stop digital court templates on order/redaction matters.
2. Later proof work: add page anchors to v9 truth keys where PDF layouts exist.
3. Prefer starting human review on PASS PDF-backed cases (CASE-01–06, 08, 11–12, 14–15, 20), then WARN v9 cases.

**Not required**
- Do not block human review on the remaining 7 WARNs.
- Do not scale the pack.

---

## Suggested reviewer order

1. PASS PDF-backed exemplars: CASE-01, CASE-02, CASE-04, CASE-06  
2. PASS edge: CASE-08 (charge mismatch), CASE-20 (OCR/date)  
3. WARN product-hunt set: CASE-07, CASE-09, CASE-10, CASE-16, CASE-18  
4. Remaining WARN/PASS as time allows
