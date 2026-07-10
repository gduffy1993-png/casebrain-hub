# Gold Manual Proof Set v1 — WARN review (revised)

**Reviewed:** 2026-07-10  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Scope:** Reporting / packet polish only — no Brain, chase core, export, Supabase, or UI changes.  
**Claim discipline:** Not real-world solicitor validation. **Do not send to human reviewers yet** (see `INTERNAL-GOLD-QA-REPORT.md`).

---

## Verdict

**Ready for human solicitor review: NO**

Stricter provisional scoring after internal Codex QA. Pack is useful for **internal product hunt**, not yet a clean external solicitor pack.

- Cases: 20/20  
- Provisional: **10 pass · 10 warn · 0 fail** (see summary)  
- Hard safety: **0**  
- v9 catalog cases are labelled **INTERNAL PRODUCT-HUNT** on packets/checklists  

---

## Current WARN cases

| Gold ID | Family | Source kind | Why WARN (reporting) |
|---------|--------|-------------|----------------------|
| CASE-01 | phone harassment / attribution | `evidence_state_local` | Partial chase fit 5/6 plus generic MG6/MG6C item(s) — WARN (not clean pass) |
| CASE-07 | bad redaction | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-08 | charge mismatch | `evidence_state_local` | Family slot is charge mismatch but actual surfaces are Encro/handle/platform — not a clean charge-mismatch solicitor example |
| CASE-09 | domestic order / restraining order breach | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-10 | translated messages | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-13 | drugs lab / continuity | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-16 | ANPR / vehicle ID | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-17 | medical injury report missing | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-18 | prison calls / call logs | `v9_catalog` | v9 catalog product-hunt lane |
| CASE-19 | social handles / subscriber gap | `v9_catalog` | v9 catalog product-hunt lane |

### Pattern notes

1. **v9 catalog** cases auto-WARN as internal product-hunt (generic MG6 / thin catalog risk) — not clean solicitor examples.  
2. **CASE-08** charge-mismatch slot vs Encro/handle actual → family/content fit WARN.  
3. **CASE-01** (if WARN): extra generic MG6C clarification clutter alongside substantive chase.  
4. **CASE-17** (if WARN): partial medical chase + generic MG6 — not a clean pass.  
5. Off-family stock do-not-overstate (BWV/custody/drugs/CCTV) filtered unless family-relevant.

---

## What changed in this reporting pass

1. Reclassified generous PASSes where family/content or chase clutter failed the bar.  
2. Partial chase coverage (`<50%` or generic MG6 with incomplete theme hit) → WARN.  
3. Extra generic MG6/MG6C clarification with substantive chase → WARN.  
4. v9 packets/checklists: explicit **INTERNAL PRODUCT-HUNT** banner.  
5. Family-filtered do-not-overstate samples.  
6. Review zip preserves per-case `expected.json`, `actual-summary.json`, checklist, review md.

---

## Before any human send

- [ ] INTERNAL-GOLD-QA-REPORT verdict = YES  
- [ ] Clean PASS exemplars identified for Wave A  
- [ ] WARN set framed as optional stress hunt only (or held back)  
- [ ] Human review pack docs still accurate  

**Do not** treat WARN as “skip forever” for product work — they remain valuable internal hunts.
