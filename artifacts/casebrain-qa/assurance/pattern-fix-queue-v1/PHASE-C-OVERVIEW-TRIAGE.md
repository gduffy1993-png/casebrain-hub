# PHASE C — Overview@2600 triage

**Verdict contribution:** `TIP_LIVE_PARTIAL` (C invent sample FIXED; live AUTH soft leftover)  
**Branch:** `fix/f167-surgical-truth-v1`  
**Tip SHA:** `d9f2bc152cc1df533535692632f32dac91089c84`  
**Soft Chase SHA:** `925ed950cba9fe9f242f016e6230ecd96e7f0ffc`  
**Phase C invent SHA:** `7f8f9ceb34565e4f476e4d450a0c1ff65ffae828` (+ CAD noise `d9f2bc152`)  
**Preview (tip):** see `PATTERN-FIX-WAVE-STATUS.md`  
**Freeze baseline (Overview sweep):** `55c41d8956c044d20f4265cccc6fd8669349d2ae`  
**Updated:** 2026-08-21  
**Rule:** raw 695/477 ≠ automatic guilt. PDF-verify → shared-root only.

---

## Freeze baseline (honest before)

From `OVERVIEW-SWEEP-STATUS.md` / hitlist stats @ freeze:

| Family (hitlist primary) | N (freeze) |
|--------------------------|----------:|
| mute_phone_download | 445 |
| invent_interview_recording | 419 |
| invent_cctv_master | 177 |
| modality_summary_vs_recording | 117 |
| invent_cad_999 | 82 |
| Hitlist rows | 1298 |

Status event tallies (summed invent flags) can read higher (e.g. mute_phone ~695, invent_interview ~477) — triage queue noise.

---

## PDF spot-check classification

| Family | Spot PDFs | Classification | Notes |
|--------|-----------|----------------|-------|
| `mute_phone_download` | Marsh, Ross (+ Brookes live) | **WATCH** | PDF often has phone download / extraction; Overview claim blob often omits those phrases → mute detector fires. Soft Chase primary promotion fixes Chase soft-mute; Overview mute volume is claim-projector / detector noise until Lane B/C claim surface matches ledger. |
| `invent_interview_recording` | Walker, Bennett, Barlow | **FIXED (shared root)** | Battleboard `"Chase interview recording/transcript…"` survived when only transcript (or “No PACE recording”) was on papers. Expanded + modality-filtered. Sample 25→0. |
| `modality_summary_vs_recording` | Marsh, Nolan | **PARTIAL** | Often co-travels with interview invent; drops when recording invent clears. Residual when summary + recording claim remain for other reasons. Sample 25→7. |
| `invent_cctv_master` | Barlow, Cole, Hughes | **FIXED (shared root)** | Timeline/disclosure templates invented “CCTV master” without master language (thin / no-CCTV / stills). Expand + master-language filter. Sample 25→0. Arden master TP opposite PASS. |
| invent_cad_999 | Archer, Hughes, Barlow | **FIXED (shared root)** | Same compound templates + bare `\b999\b` / “No CAD … 999 audio” negation prose kept CAD audit / 999 audio chases. Affirmative CAD/999-audio filter. Sample 25→**0** after `d9f2bc152`. |

---

## Shared-root product fixes shipped

1. **Soft Chase inject residual** (`925ed950c`): digital modality cards (`familyId: other`) promoted into `primaryItems` so Brookes/Ahmed/Grant phone/subscriber are not buried under collapsed “Other source-material items”. Opposite: Brookes primary TP, Trap invent TN.
2. **Compound battleboard chase expand** (`7f8f9ceb3`): `expandAndGateChaseLines` splits CAD/999/CCTV-master and recording/transcript lumps before source gate; drops master without master language; drops recording without recording modality.
3. **CAD page-999 / negation** (`d9f2bc152`): affirmative CAD audit / 999 audio establishment; strip “No CAD…” clauses. Dunn opposite TP; page-999 TN.

Opposite suite: **PASS** (`scripts/f167-surgical-truth-opposite-direction.test.ts`).

---

## Flag movement (honest)

### Targeted invent rescore (25 PDFs / family from freeze hitlist)

Script: `scripts/assurance/overview-criminal-sweep/rescore-invent-sample.ts`  
Artefact: `artifacts/.../overview-criminal-sweep-v1/phase-c-invent-rescore.json` (+ rescore2 after CAD fix)

| Family | Sample before | Sample after (`7f8f9ceb3`) | After CAD (`d9f2bc152`) |
|--------|--------------:|---------------------------:|------------------------:|
| invent_cctv_master | 25 | **0** | **0** |
| invent_interview_recording | 25 | **0** | **0** |
| modality_summary_vs_recording | 25 | **7** | **7** |
| invent_cad_999 | 25 | 26 (page-999 root) | **0** |

**Preview (C tip):** https://casebrain-8jff5rq5s-gduffy1993-pngs-projects.vercel.app (`d9f2bc152`)

Full corpus 2600 re-sweep **not** re-run end-to-end in this pass (PDF extract cost). Extrapolate: invent_cctv_master ~177 and invent_interview_recording ~419 should largely clear on tip projectors; invent_cad_999 ~82 should drop sharply after `d9f2bc152`; mute_phone_download remains WATCH.

Do **not** treat remaining mute_phone volume as product guilt.

---

## Soft Chase leftover board

| Canary | Expected | Unit / tip | Live AUTH |
|--------|----------|------------|-----------|
| Brookes phone + subscriber Chase inject | primary cards | **PASS** (primaryItems) | Live tip: phone **visible** but under Other (1) soft-primary residual — `LIVE-AUTH-TIP-WALK.md` |
| Ahmed subscriber | primary | covered by same promote | smoke walked; no invent fail |
| Grant/Tobin phone mid-state | primary when hay establishes | unit mid-state PASS | Grant CAD extract not outstanding **PASS** |
| Trap subscriber invent | TN | **PASS** | live AUTH **PASS** |

---

## Live AUTH tip

See `LIVE-AUTH-TIP-WALK.md`. Verdict `TIP_LIVE_PARTIAL`: invent canaries green; Brookes Soft Chase primary nesting leftover; `modality_summary_vs_recording` residual 7 + `mute_phone_download` WATCH unchanged (Overview still shows Brookes phone gap).

---

## Do not regress

Arden export-log TN · Trap CCTV invent TN · Trap subscriber invent TN · Brookes phone TP · Arden phone-property TN · Arden/Patel CCTV master TP · Tobin CAD extract soft-drop · Papers inventory · Client ≠ Court · opposite suite
