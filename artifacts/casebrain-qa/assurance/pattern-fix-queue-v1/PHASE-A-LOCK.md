# PHASE A LOCK — Surgical Chase residuals

**Verdict contribution:** Phase A closed for hard canaries; soft Chase-inject mutes documented.  
**Branch:** `fix/f167-surgical-truth-v1`  
**Phase-A-lock SHA:** `cbf40f08f381d1e39d7326059dbe24cb71beacce`  
**Preview:** https://casebrain-jo16a5tt0-gduffy1993-pngs-projects.vercel.app  
**Prior tip (pre-lock product):** `ca1e4a832` / ium3  
**Locked:** 2026-08-21  
**No caseId product hardcodes · no mute-everything · no Master-3000/holdout · no password resets**

---

## Commits (Phase A closeout)

| SHA | Subject |
|-----|---------|
| `b68f07c1b` | close Phase A Chase residuals for subscriber, phone mid-state, CAD |
| `cbf40f08f` | inject full phone download chase and Tobin CAD extract-on-file drop |

Opposite suite: **PASS** (`scripts/f167-surgical-truth-opposite-direction.test.ts`)  
Also: `demo-presentation-polish.test.ts` PASS · `chase-source-gate.test.ts` PASS

---

## Live AUTH board @ `jo16` / `cbf40f08f`

| Canary | Gate | Result |
|--------|------|--------|
| Arden export-log TN | Chase/Overview | **PASS** |
| Arden phone-property TN | Chase/Overview | **PASS** |
| Arden CCTV master TP | Chase/Overview | **PASS** |
| Trap subscriber invent | Chase | **PASS** (cleared vs ium3 FAIL) |
| Trap CCTV invent | Chase | **PASS** |
| Tobin CAD extract soft-drop | Chase | **PASS** (CAD audio lump gone @ jo16) |
| Brookes phone full Chase inject | Chase | **SOFT MUTE** (Overview/Papers still show phone/subscriber language) |
| Brookes subscriber Chase inject | Chase | **SOFT MUTE** (same) |
| Ahmed subscriber Chase inject | Chase | **SOFT MUTE** |
| Grant/Tobin phone mid-state Chase | Chase | **SOFT MUTE** (unit + gold-extract PASS; live Chase bundle hay may omit schedule cells) |
| Dunn stills≠master | Chase | **PASS** (no master card) |
| Opposite suite | unit | **PASS** |

Dumps: `artifacts/.../_live/wave-rip-reshot-jo16/` (+ Arden retry on mou21)

---

## Soft residuals (not blockers for B)

Chase inject for Brookes/Ahmed/Grant mid-state remains muted on live Chase cards even when Overview/Papers surface the PDF-true language. Unit contracts with gold extracts PASS. Likely live Chase `bundleText` / post-gate path truncation — **not** solved by mute-everything. Track as watch; do not reopen Phase A architecture.

---

## Do not regress

Arden export-log TN · Trap CCTV invent TN · Trap subscriber invent TN · Brookes phone TP on Papers/Overview · Arden phone-property TN · Arden/Patel CCTV master TP · Tobin CAD extract soft-drop
