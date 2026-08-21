# CHUNK 3 — FAMILY ARMOUR (opposite-direction thicken)

**Verdict:** `CHUNK_3_ARMOUR_STRONG`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Worktree HEAD (docs tip pre-commit):** `2ab432c3e`  
**Product tip before this chunk:** `2e6d6d3447d5398980a2c0b7aa3f983b73deb8b2`  
**Chunk 3 Preview (BWV fix deploy):** https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app  
**Prior Chunk 2 Preview:** https://casebrain-2r0jobmh3-gduffy1993-pngs-projects.vercel.app  
**Opposite suite:** **PASS** (`npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts` — includes new **I3** BWV contracts)  
**Live AUTH AFTER:** `artifacts/.../pattern-fix-queue-v1/live-auth-chunk3-after-bwv/`  
**Live AUTH BEFORE (tip 2e6d6d344):** `artifacts/.../pattern-fix-queue-v1/live-auth-chunk3-armour/`  
**QA:** `gduffy1993+casebrain@gmail.com` — login OK (no password reset)  
**Captured:** 2026-08-21  
**Merge / Master-3000 / holdout:** **NOT DONE** (scoped out)

---

## Method

1. Reused `FAMILY-GYM-LOCKED.csv`, gym `source-map.md` files, `MASTER-CASE-INDEX.csv`, hop book WATCH list.
2. Selected **10** under-covered opposite pairs (prefer EXISTING_BACKEND).
3. PDF source-map stance → live AUTH Overview/Papers/Chase on tip Preview (or offline projection where no accessible backend).
4. Named hops; **≥2 / shared-root** → product FIX + opposite tests + redeploy + re-shot.
5. Soft one-offs → **WATCH** only.

---

## Pairs covered (10)

| # | Opposite pair | POS / NEG cases | Backend | Live / offline | Result |
|---|----------------|-----------------|---------|----------------|--------|
| 1 | **MG6 extract on file vs MG6C/unused invent** | Arden (MG6 extract; no MG6C) vs CASE-02 (MG6C unused present) | Arden LIVE · CASE-02 offline bundle | LIVE Arden TN (no unused chase) · CASE-02 unit TP via I3 hay | **ARMOURED** (no new invent hop) |
| 2 | **MG11 extract vs complete signed outstanding** | Arden (one MG11 extract + complete signed outstanding) vs Trap (officer MG11 served; no invent signed-complete) | Both LIVE | Chase surfaces Complainant MG11 / source on both — soft attribution | **WATCH** (label soft; not invent of “complete signed” on Trap) |
| 3 | **BWV stills served vs full BWV export invent** | Dunn (S01 BWV stills Served) vs Tobin (U1 BWV clip Outstanding) / CASE-02 (full export referred) | Dunn+Tobin LIVE · CASE-02 offline | BEFORE: Dunn invent full-export WHY · AFTER: **TN** | **FIXED** + opposite I3 |
| 4 | **ID live vs not live** | Leverage (ID procedure + weak CCTV) vs Trap (no invent ID) | Leverage ID `d9798c34…` **wrong workspace** · Trap LIVE | Offline PDF map Leverage · Trap live TN | **WATCH** (no QA-workspace Leverage; offline OK) |
| 5 | **Multi-defendant co-blame vs single defendant** | Dunn (co-defendant blames) vs Arden (single) | Both LIVE | Papers surface co-defendant on Dunn; no invent on Arden | **ARMOURED** (surface-true; no shared invent hop) |
| 6 | **Huge / monster bundle vs thin trap** | Arden 300p / Z-500 hitlist vs Trap thin | Arden LIVE · Z500Abh wrong workspace | Arden pages/refs on Papers · Trap thin invent TN held | **ARMOURED** (truncation invent not observed on Arden) |
| 7 | **Export log ABSENT note vs PRESENT** | Davies (export log absent) vs Ahmed (export log present) | Ahmed LIVE · Davies GAP_LIVE | Ahmed Papers export log TP · Davies PDF-only | **WATCH** (Davies no backend; Ahmed soft opposite OK) |
| 8 | **Date-role: hearing listing vs chase ops deadline** | Ahmed / Brookes / Dunn / Grant | All LIVE | Header “Hearing date passed” + Chase deadline reuse | **WATCH** (prior hop #7 FIXED wording path; residual soft UI reuse) |
| 9 | **MG11 signed outstanding TP** | Patel (final signed MG11 outstanding) vs Arden extract+signed | Both LIVE | Patel Papers “Final signed MG11 is outstanding” TP | **ARMOURED** |
| 10 | **Grant thin listed CCTV/BWV vs Tobin BWV outstanding** | Grant invent TN (Chunk 1) vs Tobin BWV clip outstanding | Both LIVE | Grant master invent TN held · Tobin Overview shows BWV; Chase board soft-mute BWV | **ARMOURED** + Tobin chase BWV **WATCH** (capacity / priority soft mute, not invent) |

---

## Hop named → disposition

| Hop ID | Class | Evidence | Disposition |
|--------|-------|----------|-------------|
| `BWV_STILLS_SERVED_PROMOTED_TO_FULL_EXPORT` | invent / modality | Dunn live BEFORE: Chase “Body-worn video (BWV)” + “chase the full export…”. PDF: S01 BWV stills **Served**. Code: `canonicalLedgerMaterial(bwv)` always full-export WHY; family match any BWV. Opposite Tobin/CASE-02 need full-export TP. | **FIXED** — `isBwvFullExportEstablished` + chase family match tighten + `gateItemsAgainstSource` BWV drop + expand-gate. Opposite I3. Live AFTER Dunn TN. |
| `MG11_COMPLAINANT_LABEL_SOFT` | soft attribution | Trap + Arden both show “Complainant MG11 / source material” | **WATCH** |
| `TOBIN_BWV_CHASE_BOARD_SOFT_MUTE` | soft mute | Tobin PDF U1 BWV outstanding; Overview mentions BWV; Chase primary board has medical/phone/exhibit — no BWV card | **WATCH** (not mute-everything) |
| `LEVERAGE_ID_LIVE_NO_QA_ACCESS` | access gap | Backend case in other workspace | **WATCH** — offline PDF map only |
| `DAVIES_EXPORT_ABSENT_NO_BACKEND` | coverage gap | Gym GAP_LIVE | **WATCH** |
| `HEARING_DATE_DEADLINE_UI_REUSE` | date-role soft | Listing “Hearing date passed” still frames Chase Deadline | **WATCH** (prior product hop fixed; residual UI) |
| `PATEL_MASTER_EXPORT_LOG_GLUE` | soft glue | Papers: “full CCTV master footage/export log” | **WATCH** (hop book already had export-log glue) |
| `MUTE_PHONE_DOWNLOAD_VOLUME` | volume WATCH | Unchanged from Chunk 1/2 | **WATCH** |

---

## Product fix landed

**`BWV_STILLS_SERVED_PROMOTED_TO_FULL_EXPORT`**

- `lib/criminal/chase-source-gate.ts` — `isBwvFullExportEstablished`, `lineClaimsBwvFullExport`; expand-gate drops BWV lines without affirmative full-export/clip/outstanding establishment; stills-served-only → false.
- `components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts` — BWV family match rejects stills-only lines; `gateItemsAgainstSource` drops `familyId === "bwv"` when not established.
- `scripts/f167-surgical-truth-opposite-direction.test.ts` — **I3** Dunn TN · Tobin TP · CASE-02 TP · expand-gate contracts.

**Redeploy:** Preview https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app  
**Re-shot:** `live-auth-chunk3-after-bwv/` · canary board **PASS**

No caseId hacks · no mute-everything · no architecture rewrite · no Master-3000/holdout · exclude `casebrain-review-bundle.zip`.

---

## Canary board (AFTER @ `76gk8`)

| Gate | Status |
|------|--------|
| Opposite suite (incl. I3) | **PASS** |
| Dunn BWV full-export invent TN | **PASS** |
| Grant CCTV master invent TN | **PASS** |
| Arden CCTV master TP | **PASS** |
| Trap invent TN | **PASS** |
| Brookes phone download TP | **PASS** |
| Chunk 1/2 wins held | **YES** |

---

## Still open after Chunk 3

- Tobin BWV chase soft mute (board priority) — WATCH  
- Leverage ID live (QA workspace access) — WATCH / next live if slot  
- Davies export-absent backend — WATCH  
- MG11 complainant label soft — WATCH  
- Hearing-date deadline UI reuse — WATCH  
- Patel master↔export-log glue — WATCH  
- `mute_phone_download` detector volume — WATCH (Chunk 1/2)  
- Product fix **not yet git-committed** on branch tip (deployed from worktree) — parent should commit when ready  
- Merge / release / Master-3000 — **out of scope**

---

## Final

`CHUNK_3_ARMOUR_STRONG` — ten opposite pairs mapped; shared-root BWV stills→full-export invent fixed + opposite I3 + live Dunn TN; prior canaries green; remaining items honest WATCH.
