# CHUNK C1 PROOF — Court tip re-sweep @ `7b900de22`

**Verdict:** `C1_PROOF_COURT_INVENT_CLEARED`  
**Freeze (C0):** tip product `e3179fa74` / docs `713a056b4` · pack `court-criminal-sweep-v1/`  
**Tip product:** `7b900de22` · pack `court-criminal-sweep-v1/tip-resweep-7b900de22/`  
**Compare:** `chunk-c1-before-after.json`  
**Opposite suite:** PASS (prior)  
**Captured:** 2026-08-21

---

## Before / after (unique cases with invent flag)

| Family | C0 freeze | Tip `7b900de22` | Δ |
|--------|----------:|----------------:|--:|
| `invent_bwv` | **520** | **1** | **−519** |
| `invent_interview_recording` | **261** | **4** | **−257** |
| `invent_cad_999` | **194** | **0** | **−194** |
| `invent_cctv_master` | 8 | 8 | 0 |
| `invent_phone_download` | 99 | 99 | 0 |
| Invent-flag sum | **1084** | **114** | **−970** |
| Hitlist rows | 1478 | 1113 | −365 |

Corpus: **2600 / 2600** both sides (offline Court projection; compare tallies exclude SKIP).

---

## Read

Shared-root Court invent armour **cleared the C0.5 triage targets** without mute-everything:

- BWV invent volume was almost entirely DO_NOT detector noise → gone
- Interview recording invent from PACE/custody playbook → **261→4** residual WATCH
- CAD invent from bare page-999 → **194→0**; `mute_cad_999` rose (honest residual when CAD not established)

Phone download invent **99** and CCTV master invent **8** unchanged this chunk — separate triage later (not this hop).

## Next

Client (D0) find-only running · then File (E0)
