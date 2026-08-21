# CHUNK C4 — COURT CCTV MASTER FROM “NOT THE FULL CCTV”

**Verdict:** `C4_COURT_CCTV_NOT_FULL_SEQUENCE`  
**Prior:** Court tip invent_cctv_master **8** after C3 phone clear  
**Opposite:** PASS  

---

## Triage

| Shape | Class |
|-------|--------|
| Witness “I have been shown… but not the full CCTV or BWV sequence” (Clarke/Turner/West/Dacre) | **REAL invent** — `full\s+cctv` matched through negation |
| “short CCTV clip… full window missing” / “full CCTV window” outstanding (Francis/Morris/Wells/Thornton) | **TP / detector** — establishment OK; invent scorer lacked `full window` as source |

BWV residual (gauntlet-06) and interview-recording ×4 left WATCH / later hop.

---

## Armour

1. **`isCctvMasterEstablished`** — strip `not the full CCTV…`; require `full CCTV master|window` (not bare `full CCTV or BWV`).
2. **Invent detectors** — treat `full window` / `full CCTV window` as `cctv_master_source`.

Protected: Arden full CCTV master TP · Grant thin listed TN · Trap invent-advisory TN · opposite suite.
