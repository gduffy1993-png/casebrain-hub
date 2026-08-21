# CHUNK C5 — COURT TIP RESIDUALS (INTERVIEW + GLUED BWV)

**Verdict:** `C5_COURT_INTERVIEW_DETECTOR_AND_GLUED_BWV`  
**Prior tip pack:** `court-criminal-sweep-v1/tip-resweep-d2-e20e0b1da/`  
**Residuals:** invent_interview_recording **×4** · invent_bwv **×1** (gauntlet-06)  
**Opposite:** PASS  

---

## Triage

| Case | Flag | Class |
|------|------|--------|
| PDF-0d761… / PDF-37b18… / PDF-ffe7… / RP-07 | invent_interview_recording | **DETECTOR_NOISE** — papers say `INTERVIEW SUMMARY - SUMMARY ONLY / FULL RECORDING OUTSTANDING`; chase correctly claims recording; invent source regex lacked mid-state |
| PDF-287c7211fa15 (gauntlet-06) | invent_bwv | **PRODUCT + DETECTOR** — schedule glue `MG6C/004BWV from … not servedMay` kills `\bBWV\b`; playbook today correctly names BWV while invent source misses it |

---

## Armour

1. **Invent detectors** (Court/Client/File/Papers) — treat `full recording outstanding` / `summary only / full recording` as `interview_recording_source`.
2. **`familySupport("bwv")` + fingerprint** — match glued `004BWV` (`(?:^|[^A-Za-z])BWV(?![A-Za-z])`).
3. **`isBwvFullExportEstablished`** — same glue + `not served` even when glued into next word (`servedMay`).
4. **Invent `bwv_source`/`bwv_claim`** — same non-`\b` BWV token.

Protected: Dunn stills≠full · Trap invent-advisory · opposite suite (incl. C5 glued BWV + summary-only recording).
