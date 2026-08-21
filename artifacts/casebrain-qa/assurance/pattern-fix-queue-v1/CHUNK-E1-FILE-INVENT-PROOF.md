# CHUNK E1 PROOF — File invent_court tip re-sweep @ `627789b1e`

**Verdict:** `E1_PROOF_INVENT_COURT_CLEARED`  
**E0 freeze:** tip docs `eaeddc839` · invent_court **43** · pack `file-criminal-sweep-v1/`  
**Tip product:** `627789b1e` · pack `file-criminal-sweep-v1/tip-resweep-627789b1e/`  
**Armour chunk:** `CHUNK-E05-E1-FILE-CHROME-ARMOUR.md`  
**Opposite / regression:** PASS  
**Captured:** 2026-08-21

---

## Before / after (`invent_court_header` cohort)

| Metric | E0 | Tip `627789b1e` | Δ |
|--------|---:|----------------:|--:|
| `invent_court_header` | **43** | **0** | **−43** |
| Cohort PDFs present | 43 | 43 | 0 |
| Trailing `Hearing` in court cell | 43 | **0** | cleared |

Corpus: offline re-extract of the E0 invent_court hitlist only (not full 2600 re-score).

---

## Read

Shared-root File chrome armour **cleared the E0 invent target**:

- Court cell no longer absorbs trailing `Hearing` from `ManchesterHearing24 June…` glue
- Tip sample earlier: invent_court **12/12**; full invent_court cohort **43→0**

Mute residuals (Arden/charge no-date; thin custody) remain WATCH — not this invent hop.

## Next

Live AUTH canaries on tip Preview → **DONE** (`live-auth-e1-file/` · **E1_LIVE_AUTH_PASS**)  
Merge only on explicit ask

---

## Live AUTH (tip Preview)

**Preview:** https://casebrain-l632o48mf-gduffy1993-pngs-projects.vercel.app  
**Pack:** `live-auth-e1-file/`  
**Verdict:** `E1_LIVE_AUTH_PASS`

| Gate | Result |
|------|--------|
| Grant CCTV master invent TN | PASS |
| Arden CCTV master TP | PASS |
| Trap invent TN | PASS |
| Brookes phone TP | PASS |
| Dunn BWV full-export invent TN | PASS |
| Trap File no court`Hearing` glue | PASS |
| Trap File hearing/court present | PASS |
| Arden File defendant | PASS |

Soft notes (not gate fails): Brookes/Patel `Charge not safely identified` still WATCH; Trap shows `Hearing date passed` (listing recovered).
