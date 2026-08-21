# CHUNK D2 PROOF — CLIENT TIP RE-SWEEP invent_phone 166→7

**Verdict:** `D2_CLIENT_TIP_RESWEEP_PROOF`  
**Code tip:** `e20e0b1da` (fix) / recovery merge `c13facdac` / programme cherry-pick PR #74  
**Pack:** `client-criminal-sweep-v1/tip-resweep-d2-e20e0b1da/`  
**Method:** offline-only · reuse criminal unique index 2600 · concurrency 5  
**Note:** runner stamped productSha `627789b1e` from Preview env — code under test is tip with D2 armour  

---

## Before → after

| Metric | D0 find-only (`7b900de22`) | D2 tip re-sweep |
|--------|---------------------------:|----------------:|
| Criminal unique scored | 2600 | 2600 |
| Invent-flag events (sum) | 200 | **20** |
| `invent_phone_download` | **166** | **7** |
| `invent_phone_download_from_property` | 8 | **1** |
| Hitlist rows | 1118 | 1047 |

Tip sample (prior invent 40): still **40/40** cleared (see `tip-sample-d1-phone.json`).

---

## Residual invent_phone (7)

Triage next only if PDF-true invent remains (not detector noise). Leave mute volume / soft WATCH alone.

Protected canaries unchanged: Brookes TP · Grant mid-state · Arden property TN · Mercer SIM≠download · opposite PASS.
