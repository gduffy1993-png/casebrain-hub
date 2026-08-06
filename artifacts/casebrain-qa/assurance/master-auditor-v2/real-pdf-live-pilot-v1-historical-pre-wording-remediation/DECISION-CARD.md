# Real-PDF Live Pilot v1 — Decision Card

**Worktree:** `C:\Users\gduff\casebrain-hub-wt-real-pdf-live-pilot`  
**Branch:** `programme/real-pdf-live-pilot-v1`  
**Baseline HEAD:** `2c09d58f57840dd1fca0a9e7e329268460d0964b`  
**Status:** stopped **uncommitted** for Codex review. No corpus / programme / solicitor PASS.

---

## 1. What genuinely worked?

- All **20** frozen real PDFs ran as separate matters through **real local production builders** (`buildLiveProductionSurfacesFromDocumentUnits`) and produced **20 genuine CaseBrain strategy output PDFs** (not source copies).
- Source PDFs were opened read-only; membership SHA-256 `5849004206b9e35246e1248908ac9b68d97fa64e9ece608a532435f4c14cd383` matched before and after (`allUnchanged: true`).
- **24/361** implemented+runnable MAA controls were exercised against live-surface adapters (**815** findings). Evidence classes kept separate.
- Malik shared-root / strategy-PDF contracts: **47/47 pass**. `next build`: **exit 0**.

## 2. What genuine CaseBrain defects were found?

- **Incomplete-charge markers dropped** on some solicitor exits (`charges` / previously also keyFacts/warRoom/export) while surviving on others — incomplete state was not consistently visible across exits.
- Pilot-output wording triage (not the historical 1.7M corpus): **359** flagged occurrences — mainly truncation (**238**) and snake_case enum leaks (**112**), plus **9** acronym-casing issues. Absolute-proof claims: **0** in this sample.
- Deterministic sample rerun reported semantic mismatch from embedded timestamps in export text (honest fail, not papered over).

## 3. What shared roots were fixed?

- Shared production adapter `lib/criminal/canonical-live-surface-adapter.ts`: incomplete charge warning+action now propagates onto War Room, Key Facts, Export, Charges, API, PDF and composed prose; empty charge arrays get an explicit incomplete row so the charges exit cannot go silent.
- Five-case preflight re-run after the fix: **gate PASS**; full 20 then completed with `anyIncompleteMarkerDropped: false`.

## 4. What remains blocked or NOT_EXERCISED?

- **Authenticated HTTP / browser** matter creation, upload, cockpit and UI workflow: **NOT_EXERCISED** — no QA credentials; entitlement bypass forbidden.
- Full PDF page raster / clipping visual lane: **NOT_EXERCISED**.
- **337/361** registry controls: **NOT_EXERCISED** (SNI / browser / external / human per registry).
- Live authenticated payload path remains open as a product-proof gap (local builders ≠ authenticated HTTP/browser).

## 5. Did the five-case preflight pass?

**Yes** (RP-08 OCR, RP-09 trap, RP-03 ordinary, RP-11 multi-defendant, RP-07 500-page heavy). Zero crashes; hashes intact; incomplete stayed incomplete after shared fix.

## 6. Did the frozen 20 complete?

**Yes** — 0 crashes, 0 source-hash mismatches, 20/20 output PDFs generated.

## 7. Are the PDFs unchanged?

**Yes** — all 20 source SHA-256 values unchanged before vs after. Output PDFs are separate CaseBrain-generated artefacts.

## 8. What is the single next recommended action?

**Enable a legitimate authenticated QA path** (credentials + entitlement within policy) and re-exercise the same frozen 20 through real HTTP/browser exits — without collapsing that evidence class into local-builder results — then triage the wording truncation / enum-leak roots on live surfaces.

---

Human/legal review fields: blank. No merge, deploy, corpus PASS, Stage-3000 completion, programme PASS or solicitor approval is claimed.
