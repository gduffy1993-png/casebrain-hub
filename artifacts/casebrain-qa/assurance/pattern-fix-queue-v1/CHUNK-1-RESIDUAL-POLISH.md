# CHUNK 1 — RESIDUAL INVENT / MUTE POLISH

**Verdict:** `CHUNK_1_CLEAN_NO_FIX`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Worktree HEAD:** `2ab432c3e` (docs after product tip)  
**Product tip SHA (Preview):** `2e6d6d3447d5398980a2c0b7aa3f983b73deb8b2`  
**Preview:** https://casebrain-2r0jobmh3-gduffy1993-pngs-projects.vercel.app  
**Opposite suite:** **PASS** (`npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts`)  
**Live AUTH dumps:** `artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-chunk1-residual/`  
**QA:** `gduffy1993+casebrain@gmail.com` — login OK (`ProdSmokeOnly!Jun2026`; no restore)  
**Captured:** 2026-08-21  
**Redeploy:** **not required** (no product fix landed)  
**Chunk 2 (full 2600 re-sweep):** **DONE** — see `CHUNK-2-SCALE-PROOF.md` (`CHUNK_2_PROOF_STRONG`)  
**Chunk 3 (new family armour) / merge:** **NOT STARTED**

---

## Scope done

| # | Item | Result |
|---|------|--------|
| 1 | Grant-like leftovers (“listed CCTV/BWV” / thin media review → master/full-window/continuity) | **No peer leftovers requiring fix** |
| 2 | `modality_summary_vs_recording` residual (~7) | **All 7 PDF_TRUE_CONTRAST** — no invent shared-root |
| 3 | `mute_phone_download` WATCH | **Still WATCH** — Brookes Overview still shows phone gap (not muted) |
| 4 | Live AUTH word-for-word | **PASS** Grant TN · Arden master TP · Brookes phone primary · Trap invent TN |
| 5 | Opposite tests | **PASS** |
| 6 | Redeploy if fixes | **Skipped** (clean / no fix) |

---

## 1) Grant-like leftover hunt

**Exact thin phrase** *“Review whether listed CCTV/BWV has been served”* appears in gym extracts **only on Grant** (`RP-02-GRANT`).

Peer “Issues for review” gym cases checked offline:

| Case | Thin listed CCTV/BWV? | Master / continuity on PDF? | Class |
|------|----------------------:|----------------------------:|-------|
| Grant | **Yes** | No | Grant-like TN (already fixed @ `4d01ff2a0`/`2e6d6d344`) |
| Tobin | No (schedule check language only) | **Yes** — Full CCTV master + Continuity | Affirmative TP peer |
| Patel TB-546 | No | **Yes** — full CCTV master outstanding | Affirmative TP peer |
| Vale039 / Patterson / Dunn / Davies | No listed-CCTV thin | N/A / other families | Not Grant-like |

**Live Grant AFTER (this hop):** Papers still correctly surface the PDF review line; Overview / Court / Chase show **no** CCTV master / full-window / Continuity invent. Court TOP CHASE remains BWV / custody — not master.

**Offline contract:** opposite suite I2 still asserts Grant thin ≠ `isCctvMasterEstablished` / continuity; Arden TP; Trap invent TN.

---

## 2) modality_summary_vs_recording residual (7)

Re-PDF-verified all sample leftovers → **`PDF_TRUE_CONTRAST`** (summary + recording/transcript language both on papers):

| PDF | Class |
|-----|-------|
| CB-TB-585_Marsh | PDF_TRUE_CONTRAST |
| CB-TB-193_Clarke | PDF_TRUE_CONTRAST |
| CB-TB-583_Flint | PDF_TRUE_CONTRAST |
| CB-TB-561_Price | PDF_TRUE_CONTRAST |
| CB-TB-554_Mitchell | PDF_TRUE_CONTRAST |
| CB-TB-509_Mitchell | PDF_TRUE_CONTRAST |
| CB-TB-534_Flint | PDF_TRUE_CONTRAST |

Artefact: `artifacts/.../overview-criminal-sweep-v1/modality-leftover-spotcheck-chunk1.json`  
Script: `scripts/assurance/overview-criminal-sweep/chunk1-modality-spotcheck.ts`

**No shared-root invent fix** — driving 7→0 would mute PDF-true summary-vs-recording contrasts.

---

## 3) mute_phone_download WATCH

**Live Brookes Overview** still shows:

> *Phone download / source export referred to, not served on file*

Chase still has **Full phone download / source extraction** on **primary** board (not Other-nested).

→ Overview is **not** muting an established phone gap. Detector hitlist volume ≠ product mute. **Leave WATCH** (no fix this chunk).

---

## 4) Live AUTH canary board (Chunk 1 re-shot)

| Case | Gate | Live result |
|------|------|-------------|
| **Grant** | invent CCTV master TN | **PASS** — no master/full-window/Continuity invent; BWV/custody only |
| **Arden** | CCTV master TP | **PASS** — Overview *CCTV master outstanding*; Chase full window + Continuity; Court chase master |
| **Brookes** | phone primary TP | **PASS** — Full phone download on primary Chase; Overview phone gap visible (WATCH) |
| **Trap** | invent TN | **PASS** — no CCTV master / interview blend / subscriber invent |

`canary-board.json` verdict: `HIGH_VALUE_LEFTOVERS_DONE` (script label) · focus cases all **PASS**.

---

## Product changes this chunk

**None.** No caseId hacks · no mute-everything · no Master-3000/holdout · exclude `casebrain-review-bundle.zip`.

---

## Final

`CHUNK_1_CLEAN_NO_FIX` — residuals confirmed PDF-true or still-WATCH; Grant invent fix held live; Chunk 2/3 not started.
