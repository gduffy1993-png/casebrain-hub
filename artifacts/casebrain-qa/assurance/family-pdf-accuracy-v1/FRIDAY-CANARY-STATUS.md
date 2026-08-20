# FRIDAY CANARY STATUS

**Verdict:** `PARTIAL`  
**Export-log micro-fix:** **GREEN** on Arden (Court/Papers/Client WHY)  
**Product SHA:** `3fa12f9d6e7c7aa179d8308f2686e0cc62463f73`  
**Preview:** https://casebrain-o0y9c5fq9-gduffy1993-pngs-projects.vercel.app  
**Trial:** 4d left · **25/25 cases** · 25/100 docs (no fresh uploads)

## Green for Friday video

| Item | Status |
|------|--------|
| Family gym locked (20 slots) | `FAMILY-GYM-LOCKED.csv` |
| Arden export-log FP removed | LIVE AFTER — WHY = master only |
| Arden CCTV master outstanding | preserved |
| Arden ID / participation route | preserved |
| Arden phone-download gate | preserved (TN) |
| Arden interview-recording gate | preserved (TN) |
| Opposite unit: export log when sourced | PASS in `f167-surgical-truth-opposite-direction` |
| Dunn CAD/999 live pressure | LIVE — chase/overview show CAD/999 |
| Patel CCTV master + CAD timing | LIVE — master outstanding; CAD timing language present |

## Still needed / gaps

| Item | Status | Why it matters for video |
|------|--------|---------------------------|
| Brookes phone-download opposite LIVE | **BLOCKED** | Backend PDF extraction failed (`bad XRef entry`). Gold PDF + source-map OK; need re-upload when trial slot free — **no password reset**. |
| Ahmed export-log outstanding WHY | Soft opposite | Exhibit short-note appears in chase provenance (`export logshort` OCR join). Not an outstanding export-log readiness line — expected for served note. Hard opposite covered by unit test. |
| Patel interview recording line | Watch | Overview shows “Interview recording outstanding” — PDF establishes transcript/recording not served; treat as TP vs Trap-0030 hard negative (still GAP_LIVE). |
| Trap-0030 / thin charge live | GAP | PDF gold only — invent-risk canary not live-diffed this pass. |
| Tobin/Grant mid-state phone | Partial live | Cases present; CAD on chase; phone mid-state not fully scored. |

## Live-diffed this pass (EXISTING_BACKEND)

| Canary | caseId | Live tabs | Notes |
|--------|--------|-----------|-------|
| Arden | `99090c69-5d78-41e3-946d-119b4bc335ba` | Court/Papers/Client/Chase/Overview/File | Export-log fix proof |
| Brookes | `1c9afb96-1309-479c-b459-6d9665019663` | same | **PDF extract failed** — not scorable |
| Dunn | `a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01` | same | CAD/999 TP |
| Ahmed | `ba22e8bb-832c-43b8-8986-20ea5f5bf7c4` | same | export-log exhibit in chase text |
| Patel | `ed3c9806-3227-4ee9-ad86-9784e6000084` | same | master + CAD; recording language |
| Tobin | `a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27` | same | mid-state |
| Grant | `e2841289-1ed2-4dc4-9acf-dd22a03b63fc` | same | CAD extract present |

## Recommended Friday sequence

1. Show Arden BEFORE (`export log` in WHY) → AFTER (`master outstanding` only) on SHA Preview.  
2. Show Chase still has CCTV master / continuity — no export-log invention.  
3. Flash Dunn CAD/999 opposite if time.  
4. Call Brookes **BLOCKED_LIVE** honestly until valid PDF re-upload frees a trial slot.
