# Real-PDF Live Pilot v1 — Decision Card (post wording + raster remediation)

**Worktree:** `C:\Users\gduff\casebrain-hub-wt-real-pdf-live-pilot`  
**Branch:** `programme/real-pdf-live-pilot-v1`  
**Baseline HEAD:** `2c09d58f57840dd1fca0a9e7e329268460d0964b`  
**Frozen membership:** `5849004206b9e35246e1248908ac9b68d97fa64e9ece608a532435f4c14cd383`  
**Historical pre-remediation pack:** `artifacts/.../real-pdf-live-pilot-v1-historical-pre-wording-remediation/`  
**Status:** Codex final acceptance check reconciled — commit/push of reviewed Real-PDF Pilot v1 scope authorized. No corpus / programme / solicitor PASS. No authenticated browser claim.

---

## 1. What genuinely worked?

- Same frozen **20** real PDFs rematerialised through real local production builders; **20 genuine strategy output PDFs** regenerated.
- Source PDFs unchanged (`allUnchanged: true`).
- Wording gate: **0** confirmed solicitor-visible truncations, snake_case/enums, or bad BWV/CCTV/MG casing.
- PDF raster: **20/20 EXERCISED** (Puppeteer + pdf.js CDN) — no blank pages, no tiny/clipped bbox, no tofu/broken fonts; incomplete-charge warnings present in rendered text where expected.
- Incomplete-charge markers: **no drops** across view/copy/export/API/PDF/composed prose.
- **24/361** controls **invoked** via `runAllControls`; honest reclassification: **11 fully / 8 partially / 5 not_exercised** (6 are phrase-proxy/negative-scan — see `control-exercise-audit-24.json`). Contracts **47/47** + solicitor-visible **2/2**. **Build exit 0**. `tsc` **56 / Δ0 / 0 changed-path**.

## 2. What genuine CaseBrain defects were found?

- **Historical (pre-remediation):** snake_case enum leaks in provenance (`case_document`, `charge_sheet`, `not_safely_confirmed`, etc.) and bad MG acronym casing — genuine product defects.
- **Historical “238 truncations”:** overwhelmingly **detector false positives** (complete endings like proof/page/record/pace flagged by an over-broad mid-word heuristic) — not mid-word product cuts.
- Authenticated HTTP/browser still unavailable (honest blocker, not a silent pass).

## 3. What shared roots were fixed?

- `isMidWordSolicitorTruncation` — stem/allowlist rewrite (false-positive truncations eliminated).
- `formatFindingProvenanceLine` — stop interpolating raw document-type/evidence-state enums.
- `sanitizeSolicitorProse` / live-surface adapter — humanize snake_case + `preserveProtectedAcronyms` on solicitor-visible exits.
- Prior charge-readiness cross-exit fix retained.

## 4. What remains blocked or NOT_EXERCISED?

- **Authenticated HTTP/browser** — NOT_EXERCISED (no QA credentials; no entitlement bypass).
- **337/361** registry controls — NOT_EXERCISED per registry status (SNI / browser / external / human).
- Repo-wide `tsc --noEmit` still reports **56 pre-existing baseline errors** unrelated to touched files (exit 1).

## 5. Did the five-case preflight pass?

**Yes.**

## 6. Did the frozen 20 complete?

**Yes** — 0 crashes, 0 source-hash mismatches, wording gate pass, raster exercised.

## 7. Are the PDFs unchanged?

**Yes** — all 20 source SHA-256 values match freeze before and after. Output PDFs are separate CaseBrain-generated artefacts (rasterised).

## 8. What is the single next recommended action?

Enable a **legitimate authenticated QA path** and re-exercise this same frozen 20 through real HTTP/browser exits — without collapsing that evidence class into local-builder results.

---

Human/legal review fields: blank. No commit, push, merge, deploy, corpus PASS, Stage-3000 completion, programme PASS or solicitor approval is claimed.
