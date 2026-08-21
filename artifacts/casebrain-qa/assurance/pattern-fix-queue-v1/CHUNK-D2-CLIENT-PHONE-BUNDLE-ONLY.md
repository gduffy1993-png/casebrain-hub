# CHUNK D2 — CLIENT PHONE RESIDUAL (BUNDLE-ONLY MODALITY)

**Verdict:** `D2_CLIENT_PHONE_BUNDLE_ONLY_MODALITY`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Prior:** D1 tip sample **23/40** cleared; post-C2 re-sample **36/40**; D2 armour **40/40**  
**Tip sample:** `client-criminal-sweep-v1/tip-sample-d1-phone.json` — **40/40** cleared  
**Opposite:** PASS (mid-state PDF keeps summary row; chase label ≠ Full download invent; Brookes TP)  
**Court C2 sample:** still **40/40**

---

## Triage (4 residuals after C2)

| Case | Class | Notes |
|------|--------|-------|
| Khan / Hayes / similar | **REAL invent (circular)** | PDF has `DownloadLogical download summary onlyFull report not in this section` (true mid-state). Chase mid-state inject label was fed back into truth-map hay → invented `Full phone download [Missing]` |
| DIG/4Phone screenshot case | **DETECTOR_NOISE** | Gap note “not full phone download…” matched invent claim regex |

---

## Armour

1. **`expandTruthMapRowsForDisplay`** — mid-state / full-outstanding / subscriber from **bundleText only** (never chase inject labels). Screenshots may use row labels + bundle.
2. **Glued mid-state** — `full report not in this section` (+ `the`/`this`) recognised in truth-map + chase reconcile.
3. **Invent detectors / tip sample** — treat `logical download` / `download report` as phone-download **source**; strip “not full phone download” negation notes from claim scoring.

Protected: Brookes full download TP · Grant mid-state · Arden property TN · Mercer SIM≠download · opposite suite.

## Next

- Optional full Client tip re-sweep invent_phone **166→N** proof  
- Soft WATCH (mute volume / charge mute / hearing-date UI) only if PDF-true  
- Programme already landed via PR #72 — follow-up cherry-pick recovery PR for D2
