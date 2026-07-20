# Trust pack review

**Date:** 2026-07-10  
**Branch:** `feature/gold-manual-proof-set-v1`  
**Scope:** Review of all docs in `docs/pilot-trust-pack/` — docs only  
**Verdict after fixes:** **PASS with residual honesty gaps** (no fake compliance; residual items are “confirm at kick-off”, not hidden claims)

---

## 1. Executive answer

| Question | Answer in pack |
|----------|----------------|
| Data handling | Firm workspace isolation; TLS in transit; provider encryption at rest (confirm host/region at kick-off) — `SECURITY-AND-DATA-HANDLING.md` |
| Deletion | Written request → live delete + written confirm; backup lag stated with target window — `INCIDENT-AND-DELETION-PROCESS.md` |
| No training on client data | Pilot policy: no public-model training on firm uploads; **block firm uploads until vendor no-training terms confirmed** — security + subprocessors |
| Subprocessors | Placeholder categories only until written schedule — **required before any firm-uploaded matter** (including redacted) |
| Redacted pilot | Gold first → firm-redacted shadows; intake/scoring/deletion — `REDACTED-SHADOW-PILOT-PROCESS.md` |
| Solicitor sign-off | Required before any external use — offer + shadow process + email |

**Claim line held:** controlled fictional proof done; redacted shadow pilot next; not solicitor-validated real-world performance.

---

## 2. Overclaim check

| Risk phrase | Found? | Action |
|-------------|--------|--------|
| Solicitor-validated / real-world proven | Explicitly **denied** throughout | Keep |
| Guaranteed accuracy | Explicitly **denied** | Keep |
| Legal advice replacement | Explicitly **denied** | Keep |
| Autonomous sending | Explicitly **denied** | Keep |
| SOC2 / ISO / pen-test / SRA | Explicitly **not claimed** | Keep |
| Soft overclaim: “can surface… traps” | README — scoped to controlled test sets | Left (qualified) |
| Soft overclaim: “production workspace” | Was in security doc | **Fixed** → pilot-first wording |

No fake compliance claims found.

---

## 3. Weak security wording (found → fixed)

| Gap | Before | After |
|-----|--------|-------|
| Deletion / retention | “short wind-down”, “briefly” | Default **pilot + 14 days** wind-down; backup lag **target ≤ 30 days** (operational target, not a guarantee) |
| Admin access | “firm awareness where practical” | Support access to pilot matters: **notify firm lead** (break-glass → notify ASAP) |
| Audit logging | “may include / where instrumented” | Honest: inventory **confirmed at kick-off**; not every action guaranteed logged |
| No-training | “should” / “prefer” | **Policy + gate:** no firm uploads until no-training terms confirmed in writing |
| AI processing | Vague “may use” | Clarify mix of deterministic / rule surfaces and optional AI API calls; confirm which apply to the pilot |
| Subprocessors vs “live client data” | Implied only unredacted live | **Any firm-uploaded matter** (redacted or not) needs confirmed schedule; gold-only review can start on CaseBrain packets |

---

## 4. Pilot controls check

| Control | Present? |
|---------|----------|
| Redacted-first (after gold) | Yes — aligned kick-off to **gold Waves A+B default**, then redacted |
| Limited users | Yes (typically 1–5 named) |
| Limited matters | Yes (written cap) |
| Solicitor sign-off | Yes |
| Feedback form | Yes |
| Success criteria | Yes |
| No autonomous send | Yes |
| Deletion process | Yes (tightened) |

---

## 5. Tone / hype / scare check

| Issue | Action |
|-------|--------|
| “gaps a busy fee-earner might miss” | Softened — can read as slighting solicitors |
| “CPS chase goes out on a weak footing” | Softened in email — keep disclosure focus, less alarm |
| Marketing magic | Claim discipline already blocks; left intact |
| Feedback “improve the product” | Clarified: **anonymised form themes**, not matter text for model training |

---

## 6. Contradictions (found → fixed)

1. **Offer kick-off** said gold **or** redacted first; other docs said gold first → **fixed** to gold default, redacted after warm-up (unless written exception).  
2. **Subprocessors** “before live client data” vs redacted shadows also being firm data → **fixed** to any firm upload.  
3. **Security “production”** vs pilot-only pack → **fixed**.  
4. No conflict between “hard safety clean on controlled sets” and “not solicitor-validated on live files”.

---

## 7. Residual honesty gaps (acceptable — do not fake-fill)

These remain **kick-off confirmations**, not pack defects:

- Named hosting provider + region  
- Final subprocessor schedule  
- Exact log types available in the deployed environment  
- Exact backup retention of the host  
- Which pilot surfaces call an AI API vs deterministic builders  

Do **not** invent SOC2/ISO/pen-test answers to close these.

---

## 8. Fixes applied in this pass

Docs only (same folder):

- `SECURITY-AND-DATA-HANDLING.md`  
- `SUBPROCESSORS-AND-AI-PROCESSING.md`  
- `CONTROLLED-PILOT-OFFER.md`  
- `INCIDENT-AND-DELETION-PROCESS.md`  
- `REDACTED-SHADOW-PILOT-PROCESS.md`  
- `SOLICITOR-REVIEW-FORM.md`  
- `CLAIM-DISCIPLINE.md`  
- `PILOT-EMAIL-TEMPLATE.md`  
- `README.md` (index + review link)  
- this file: `TRUST-PACK-REVIEW.md`

---

## 9. Acceptance

| Criterion | Status |
|-----------|--------|
| Says what is true, not more | **Met** after fixes |
| No fake compliance claims | **Met** |
| Clear on data handling, deletion, no training, subprocessors, redacted pilot, sign-off | **Met** |
| Controlled fictional done; redacted shadow next | **Met** |
