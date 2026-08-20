# Side-by-Side Behavioural Report

**Recovery vs release candidate:** do **not** merge until this report is accepted.  
**Release candidate:** `programme/real-pdf-live-pilot-v1` @ `170bfcee4`  
**Recovery branch:** `programme/legal-intelligence-recovery-v1`  
**Date:** 2026-08-20

---

## Architecture confirmation

```
SOURCE → OBSERVATIONS → RECONCILIATION → CANONICAL TRUTH 🔒
                                      → LEGAL INTELLIGENCE / CASE MOVES 🧠
                                      → solicitor considerations
```

| Layer | Authority | Recovery change |
|-------|-----------|-----------------|
| Canonical evidence state | Sole factual authority | **Unchanged** (guards preserved) |
| Chase source gate | Fact/chase emission | **Unchanged** |
| Legal intelligence | Advisory only | **Added** (`lib/criminal/legal-intelligence`) |
| Case Moves | Advisory via adapter | **Restored** from `6de1c4c24` |
| CPS Chase surface | Supportable requests only | Advisory **cannot** auto-enter (`considerationsForSurface(..., "cps_chase") === []`) |

Firewall flags (hard-coded false): missing/served counters, readiness, auto-chase, client fact, court assertion, canonical evidence mutation.

---

## Patel proof (seed ID `7e763777-94a8-4958-a190-a35ef6ddb259`)

| Claim | Status |
|-------|--------|
| Affray | **ESTABLISHED** |
| Southford Magistrates' Court | **ESTABLISHED** |
| Hearing 25 Aug 2026 | **ESTABLISHED** |
| Full CCTV master outstanding | **ESTABLISHED** |
| Custody pages 3–5 outstanding | **ESTABLISHED** |
| Final signed MG11 outstanding | **ESTABLISHED** |
| Full interview transcript outstanding | **ESTABLISHED** |
| Interview recording/transcript service issue | **SOURCE-BACKED** |
| CAD/listing timing | **SOURCE REFERENCE** (consider related call material) |
| 999 audio outstanding | **NOT ESTABLISHED** |
| Medical evidence missing | **NOT ESTABLISHED** |
| BWV missing | **NOT ESTABLISHED** |
| CCTV continuity missing (from “to be checked” alone) | **NOT ESTABLISHED** as missing fact |
| Self-defence as established live position | **NOT ESTABLISHED** |
| Self-defence / first-contact / CAD / BWV / clip-master / interview modality | **SENSIBLE CONSIDERATIONS** present |

Regression: `scripts/legal-intelligence-recovery-regression.test.ts` — **PASS**.

---

## Behaviour matrix (representative)

| Matter | Current (pre-restore) | Historical smart | Restored |
|--------|----------------------|------------------|----------|
| Patel Affray | Safe gates; limited issue menus | Self-defence “live”; media invent risk | Considerations without fact invent |
| Phone harassment | Drops unsupported media chase | Attribution intelligence | Attribution considerations + gates |
| BWV/custody | Custody≠interview gate | PACE/BWV fight paths | PACE/BWV advisory; gate kept |
| s.18 | Medical when sourced | Intent reduction stock | Intent + medical considerations |
| Drugs | Phone when sourced | Supply inference | Supply inference advisory |
| Robbery co-def | Interview modality caution | ID/participation paths | ID/participation considerations |

Truth-set: **12/12** both truth-safety and intelligence (`cleverness-recovery-truth-set-results.json`).

---

## Regression wall coverage

| Rule | Test evidence |
|------|---------------|
| Old knowledge preserved as advisory | Case moves considerations emit; offence-family + fight + RLS packs |
| Old unsafe authority not restored | Offence type cannot promote BWV fact; no “remains live” |
| Canonical wins | Absent families stay absent; notEstablished lists |
| Explicit facts not over-conservatively lost | CCTV master / interview outstanding remain established |

---

## Merge recommendation

**Do not merge** into `programme/real-pdf-live-pilot-v1` / PR #66 solely because unit tests pass.  
Behavioural proof on the 12-matter set is green; next human review should inspect solicitor-visible advisory labelling on Overview/Court/Papers before any release-candidate merge.  
**Not** pilot/production ready. **No** giant corpus run performed.
