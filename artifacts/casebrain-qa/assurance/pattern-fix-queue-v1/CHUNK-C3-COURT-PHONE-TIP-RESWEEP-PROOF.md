# CHUNK C3 — COURT TIP RE-SWEEP invent_phone 99→0

**Verdict:** `C3_COURT_TIP_RESWEEP_PHONE_CLEAR`  
**Code tip:** `5d679c77a` (D3) / recovery has D3 via PR #76  
**Pack:** `court-criminal-sweep-v1/tip-resweep-d2-e20e0b1da/`  
**Method:** offline-only · reuse index 2600 · concurrency 5  
**Note:** runner Preview env stamp `627789b1e` — ignore; code under test is tip with C2+D2+D3  

---

## Before → after

| Metric | C0 find-only | C1 tip (`7b900de22`) | C3 tip (D2/D3 armour) |
|--------|-------------:|---------------------:|----------------------:|
| Invent-flag events (sum) | 1084 | 114 | **13** |
| `invent_phone_download` | 99 | **99** | **0** |
| Hitlist rows | 1478 | (C1 pack) | 1206 |

C2 tip sample (40 prior invent): already **40/40**. Full corpus now clear for invent_phone.

Protected: Brookes TP · Mercer SIM≠download · Graves extraction · Grant mid-state · opposite PASS.
