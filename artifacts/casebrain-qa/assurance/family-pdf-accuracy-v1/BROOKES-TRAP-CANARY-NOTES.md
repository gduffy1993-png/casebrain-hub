# BROOKES + TRAP CANARY NOTES

**Pass:** Friday close-out (Brookes phone-download opposite + Trap-0030 invent-risk)  
**Product SHA:** `3fa12f9d6e7c7aa179d8308f2686e0cc62463f73` (unchanged — no product micro-fix)  
**Preview:** https://casebrain-o0y9c5fq9-gduffy1993-pngs-projects.vercel.app  
**Verdict contribution:** supports `FRIDAY_CANARIES_STRENGTHENED`

## Slot hygiene (SAFE)

- Trial was 25/25. Permanently deleted disposable QA recovery proofs **LIVE-05 Ella Shaw** + **LIVE-04 Elena Marsh** (not Arden/Patel/Dunn/Ahmed).
- Later permanently deleted failed Brookes attempt + old broken Brookes (`1c9afb96-…` / Case 3) to free re-upload.
- **No password reset / ensureQaUser.**

## Brookes — phone-download opposite LIVE

| Field | Value |
|-------|-------|
| Live caseId | `2dcdc59d-ff44-4bc8-ac31-bd11a954a59e` |
| Extract | **12,101 chars** (clean) |
| PDF used | Rebuilt from `_extracts/RP-17-FRESH-BROOKES.full.txt` → `_live/brookes-trap-closeout/CB-FRESH-001_Taylor_Brookes_CLEAN.pdf` |
| Why rebuild | Downloads gold `CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf` still fails product parse (`bad XRef entry`) |

### Score vs PDF gold

| Claim | Result | Live evidence |
|-------|--------|---------------|
| Phone download / source export outstanding | **TP** | Overview gap: “Phone download / source export referred to, not served on file”; Chase item “Full phone download / source extraction” MISSING; Court/Papers WHY cites “Original download and voice note outstanding” |
| Subscriber / attribution gap | **TP** | Overview + Court “Subscriber data or phone attribution report not served” |
| Screenshot ≠ full export | **TP** | Safe wording notes screenshot pack; chase provenance cites EV/1 cropped WhatsApp screenshots |
| Invent download from property-only | **TN** (pair with Arden) | Brookes promotes download because papers expressly say outstanding — not property-phone pattern |
| Soft noise | Note | Court charge framing drifts toward “possession / intent to supply” wording — not scored as phone-download FP |

**Brookes LIVE:** **PASS** (opposite phone-download control now scorable).

Dumps: `_live/brookes-trap-closeout/brookes/`

## Trap-0030 — thin invent-risk LIVE

| Field | Value |
|-------|-------|
| Live caseId | `ce5bc9f2-f570-411e-bcab-5004d80acf4c` |
| PDF | `CB-TRAP-2026-0030.pdf` (gold path; extract OK ~3k chars) |
| Defendant on live | Leo Greene |

### Score vs PDF gold

| Claim | Result | Live evidence |
|-------|--------|---------------|
| Do **not** invent interview **recording** | **TN** | No “Interview recording outstanding” on Overview/Court/Papers/Chase |
| Interview record absent (PDF-backed) | **TP soft** | Court/Papers surface MG6 “Outstanding/not provided: interview record” / PACE note language |
| Do **not** invent missing CCTV | **FP watch** | Overview “CCTV outstanding / CCTV master outstanding”; Chase drafts CCTV master chase even while anchor quotes PDF “should not be strengthened by assuming missing CCTV” |

**Trap LIVE (primary invent-recording gate):** **PASS**.  
**CCTV invent:** evidence-only this pass — not a confirmed shared-root pair requiring micro-fix (single thin-file FP; opposite CCTV cases remain sourced).

Dumps: `_live/brookes-trap-closeout/trap/`

## Tobin / Grant phone mid-state (existing dumps only)

| Case | Phone mid-state | CAD/999 | Notes |
|------|-----------------|---------|-------|
| Tobin `a42cb20a-…` | **AMBIG** | **TP** | CAD/999 on Overview + Chase; phone download not strongly surfaced (PDF = referenced-only) |
| Grant `e2841289-…` | **TP soft** | **TP / mixed** | Papers/Court chase “full phone extraction”; Overview phone attribution conditional; CAD present on chase (also still listed as outstanding gap — mid-state noise) |

No product fix from mid-state scoring.

## Product changes

**None.** SHA remains `3fa12f9d6`.
