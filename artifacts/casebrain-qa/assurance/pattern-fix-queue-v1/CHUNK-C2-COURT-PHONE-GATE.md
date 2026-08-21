# CHUNK C2 — COURT PHONE DOWNLOAD MODALITY GATE

**Verdict:** `C2_COURT_PHONE_DOWNLOAD_GATE`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Prior:** Court C1 left `invent_phone_download` **99** unchanged  
**Tip sample:** `court-criminal-sweep-v1/tip-sample-c2-phone.json` — **40/40** prior invent cases cleared (no Full download without download-family source)  
**Opposite:** PASS (Mercer SIM≠download · Brookes TP)  
**Captured:** 2026-08-21

---

## Triage

| Shape | Class |
|-------|--------|
| drugs_pwits playbook `phone download` + SIM/IMEI/subscriber only (Mercer) | **REAL invent** — family mention too broad |
| Graves `full phone extractionOutstanding` | **TP** — must keep Full download chase |
| Khan `DownloadLogical download summary` | **TP mid-state** — glued `\b` before Logical failed |
| Hale download-report summary | mid-state OK |

---

## Armour

1. **`isPhoneDownloadEstablished` / `lineClaimsPhoneDownload`** in `chase-source-gate` — SIM/subscriber ≠ download modality  
2. **`gateMaterialLine` / `filterModalitySpecificChaseLine` / `gateChaseLine`** drop phone-download seeds unless established  
3. **`drugs_pwits` playbook** — `phone download` → `phone attribution material`  
4. **`reconcilePhoneDownloadModalityItems`** — drop phoneish seeds without download-family affirmation; glued mid-state / extractionOutstanding inject fixes  

Protected: Brookes full download TP · Grant mid-state · Arden property TN · Graves extraction TP.

## Next

Optional full Court tip re-sweep invent_phone 99→N · Client phone residual · programme merge only on explicit ask
