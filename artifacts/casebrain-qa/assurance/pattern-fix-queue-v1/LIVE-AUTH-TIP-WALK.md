# LIVE AUTH TIP WALK

**Verdict:** `TIP_LIVE_PARTIAL`  
**Preview:** https://casebrain-8jff5rq5s-gduffy1993-pngs-projects.vercel.app  
**Tip product SHA:** `d9f2bc152cc1df533535692632f32dac91089c84`  
**Worktree HEAD (docs tip):** `8e6ae2f38a77156f8941131e3fec994ac76f0343`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Captured:** 2026-08-21  
**QA:** `gduffy1993+casebrain@gmail.com` — login **OK** with `ProdSmokeOnly!Jun2026` (no password restore)  
**Dumps:** `artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-tip/`  
**Harness tabs:** `overview` / `papers` / `summary` (Client) / `disclosure-chase` / `today` (Court) — per Phase B (`court`/`client-summary` URL aliases map to Papers)

---

## Canary board

| Case | Status | Held gates |
|------|--------|------------|
| **Arden** `99090c69-…35ba` | **PASS** | no export-log invent; phone extraction TN; CCTV master TP (Overview + Chase); Papers inventory; Client (`summary`) ≠ Court (`today`) |
| **Brookes** `2dcdc59d-…a59e` | **PASS*** | phone download TP on Chase (**present**; see soft residual); subscriber on Papers/Summary; Overview shows phone gap (mute WATCH not proven); Client ≠ Court |
| **Trap** `ce5bc9f2-…cf4c` | **PASS** | no CCTV master invent; no interview recording/transcript blend invent; no subscriber invent chase; Client ≠ Court |
| **Dunn** | **PASS** (smoke) | walked Overview/Papers/Summary/Chase/Today — no held-gate fails |
| **Grant** | **PASS** | CAD extract **not** chased as outstanding |
| **Ahmed** | **PASS** (smoke) | walked; no invent flags tripped |

\*Brookes soft residual: after expand, `Full phone download / source extraction` sits under **Other source-material items (1)** rather than the default primary list. Unit `primaryItems` promote still **PASS** locally; live nesting is the Soft Chase leftover (not invent-regression). Phone is PDF-true and visible on Chase + Overview.

---

## Auth

| Check | Result |
|-------|--------|
| Sign-in tip Preview | **OK** → landed Court Today |
| Password restore | **not needed** |

---

## Residuals (time-boxed)

| Item | Live / evidence | Action |
|------|-----------------|--------|
| `modality_summary_vs_recording` sample **7** | prior Phase C rescore still **7** after tip | **leave** — no new shared-root PDF-verify this pass; not treated as automatic guilt |
| `mute_phone_download` WATCH | Brookes Overview still shows “Phone download / source export referred to, not served” | **no fix** — live walk does **not** prove Overview mute after Chase promote |
| Brookes Soft Chase primary nesting | phone under Other (1) | **leftover** — do not mute-everything; optional follow-up: reproduce with full live ledger/battleboard inputs |
| Full 2600 re-sweep | not cheap this pass | **skip** |

---

## Fixes this pass

**None.** No invent regressions requiring shared-root product change. No redeploy.

---

## Artefacts

- `canary-board.json` / `gate-scoreboard.json`
- Per-case `overview|papers|summary|disclosure-chase|today.txt`
- `screenshots/*`
- `run-live-auth-tip-v2.cjs` (correct tab map)
- `signin.json`

---

## Do not regress

No caseId product hardcodes · no mute-everything · no Master-3000/holdout · exclude `casebrain-review-bundle.zip` · keep opposite suite + PDF-true discipline
