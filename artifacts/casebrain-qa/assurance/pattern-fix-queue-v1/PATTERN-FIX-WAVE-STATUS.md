# PATTERN FIX WAVE — STATUS

**Verdict:** `FIX_WAVE_STRONG_PROGRESS`  
**Branch tip:** `bb9620fb0a4ca92c7dc199cff4f9762b6106f599`  
**Freeze baseline (pre-wave product):** `55c41d8956c044d20f4265cccc6fd8669349d2ae`  
**Preview (this wave):** https://casebrain-5q2rrex15-gduffy1993-pngs-projects.vercel.app  
**Hop book:** `artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/MASTER-HOP-BOOK.md`  
**Updated:** 2026-08-20

---

## FIXED this wave

| Hop | Shared root | Commit | Opposite |
|-----|-------------|--------|----------|
| `CAD_EXTRACT_PRESENT_STILL_CHASED` | `reconcileCad999ModalityItems` + CAD extract≠audio modality | `b30c9bda7` | Grant Present → drop; Dunn 999 audio + full print keep |
| `CAD_999` modality invent path (extract→audio) | evidence-state cad_extract / cad_audio | `b30c9bda7` | foundational: extract ≠ audio |
| `STILLS_SERVED_PROMOTED_TO_CCTV_MASTER` | `cctv_master` classify requires master/full-window | `b30c9bda7` | stills alone ≠ master; stills+master language keeps |
| `HEARING_DATE_USED_AS_OPERATIONAL_DEADLINE` | Chase `deadlineLabel` ≠ listing status string | `b30c9bda7` | Header listing labels unchanged (Phase 8 status) |
| `SUBSCRIBER` invent (Trap `/sim/` in assuming) | `digitalChaseLabel` word boundaries | `1ff7099d5` | assuming ≠ Subscriber; real subscriber still surfaces |
| Phone mid-state humanize | logical download summary wording | `b30c9bda7` | Brookes full-download path untouched in unit suite |
| Brookes subscriber mute (charge-header block) | digital gap expand without harassment allegation | `1ff7099d5` | charge mute must not block papers-true digital gaps |

Prior FIXED (held): export-log · Trap CCTV invent · Arden phone-property · Arden/Trap interview invent TN

---

## Remaining OPEN

| Hop | Why still open |
|-----|----------------|
| `INTERVIEW_SUMMARY_VS_RECORDING_LUMP` | Chase card still titled recording/transcript blend; Arden/Trap invent TN held — residual gym lump on Tobin/Ahmed/Patel |
| `PHONE_DOWNLOAD_MIDSTATE_MUTE_OR_SPLIT` | Humanize mid-state landed; Grant/Tobin live Papers↔Chase split not re-shot |
| `PAPERS_COLLAPSED_NO_DOC_INVENTORY` | UI/projection — deferred (no Overview redesign) |
| `CLIENT_TAB_EQUALS_COURT_CONTROL_ROOM` | Same — deferred careful projection root |
| `SUBSCRIBER` mute live confirm | Expand path fixed; Brookes AUTH re-shot pending on new Preview |
| Volume triage (`mute_phone_download` etc.) | Sweep volume ≠ guilt — leave for next gym pass |

---

## Canary scoreboard

| Canary | Expectation | Unit / code | Live on new Preview |
|--------|-------------|-------------|---------------------|
| Arden export-log TN | no export log; master kept | PASS (prior + suite) | **re-shot pending** (freeze Preview was green) |
| Arden phone-property TN | no download invent | PASS | pending |
| Arden CCTV master TP | master outstanding | PASS | pending |
| Brookes phone-download TP | download outstanding | PASS | pending |
| Brookes subscriber TP | subscriber outstanding | expand path fixed | pending |
| Trap interview invent TN | no recording invent | PASS | pending |
| Trap CCTV invent TN | no master invent | PASS | pending |
| Trap subscriber invent TN | no Subscriber from assuming | PASS (display polish) | pending |
| Dunn CAD extract vs audio | extract served; audio/full print chase | PASS (reconcileCad999) | pending |
| Dunn stills ≠ master | stills not master chase | PASS (classify) | pending |
| Grant CAD extract Present | not outstanding CAD/999 lump | PASS (reconcileCad999) | pending |
| Hearing chase deadline | not `Hearing date passed · date` as ops deadline | code landed | pending |

Opposite suite: `npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts` → **PASS**  
Foundational CAD modality: **PASS** · chase-source-gate: **PASS**

---

## Commits this wave

1. `6c98e5398` — docs: master hop book  
2. `b30c9bda7` — fix: CAD Present split + stills≠master + chase deadline role  
3. `1ff7099d5` — fix: Trap subscriber invent + Brookes digital expand  
4. `bb9620fb0` — test: opposite contracts  

---

## Do not regress

- Export-log / Trap CCTV / Brookes phone-download / Arden property-phone gates already FIXED  
- No caseId hardcodes · no mute-everything · no Overview redesign · no Master-3000 / holdout / password resets  
- Exclude `casebrain-review-bundle.zip`

---

## Next rip

1. AUTH re-shot Arden / Brookes / Trap / Dunn on Preview `casebrain-5q2rrex15…`  
2. Interview Chase card residual lump (Tobin/Ahmed/Patel)  
3. Papers inventory / Client≠Court shared projection (careful)  
4. Grant/Tobin phone mid-state live confirm
