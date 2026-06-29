# H4 Simulator v2 plan — 37 → 75

**Prerequisite:** v1 (30 locked) + v1.1 (7) + v2 (38) ✅ — **75 cases**, combined gate **0 blocking**.

**Next expansion:** 75 → 150+ (layout variants / depth).

---

## Goal

Expand to **75 runnable fake bundles** with **layout/PDF variants** and depth on v1/v1.1 shapes — not identity testing.

---

## Build approach

1. **Manifest v2 draft** — add `sim-038`..`sim-075` (38 new cases)  
2. **Variant matrix** — for each serious shape, add 1–2 layout traps (scanned, OCR-poor, index-only, mixed defendants, large messy)  
3. **Family coverage gaps** — fill from `H4_SIMULATOR_LIBRARY.md` matrices not yet dedicated in v1/v1.1  
4. **Generate pack** — `docs/h4/simulator-pack-v2/` (or incremental folders; keep v1 + v1.1 paths unchanged)  
5. **Gate** — same blocking rules + serious-case hard rules; **0 dangerous fail** alongside golden 102 + export/copy  

---

## Suggested v2 additions (outline)

| Source | Target new cases | Notes |
|--------|------------------|-------|
| v1 layout matrix | ~15 | OCR, rotation, tables, thin, large messy |
| v1.1 serious shapes × variants | ~14 | Encro/co-def, county lines cellsite, conspiracy telecom, multi-hand BWV, CCTV poor quality, historic third-party, phone scope |
| Evidence pattern gaps | ~9 | MG6C detail, duplicate pages, conflicting dates, expert-only, placeholder metadata |

---

## Gates (unchanged)

- Golden 102 — 0 blocking  
- Level 1 2,200 — 0 dangerous critical  
- H4 export/copy — 0 blocking  
- Simulator combined (75) — 0 blocking dangerous  
- Worst50 — no repeated dangerous cluster  

Taylor/Jordan = deploy smoke only.

---

## Docs

- `docs/h4/H4_SIMULATOR_LIBRARY.md` — coverage matrices  
- `docs/h4/simulator-manifest.v1.json` — locked  
- `docs/h4/simulator-manifest.v1.1.json` — serious supplement  
