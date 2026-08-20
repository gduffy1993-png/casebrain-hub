# PATTERN FIX WAVE — STATUS

**Verdict:** `FIX_WAVE_STRONG_PROGRESS`  
**Branch tip:** `d228df56e102377e468a646f6e84068cac38b147`  
**Freeze baseline (pre-wave product):** `55c41d8956c044d20f4265cccc6fd8669349d2ae`  
**Preview (prior wave):** https://casebrain-5q2rrex15-gduffy1993-pngs-projects.vercel.app  
**Preview (this commit):** _pending Vercel deploy_  
**Hop book:** `artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/MASTER-HOP-BOOK.md`  
**Updated:** 2026-08-21

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
| `INTERVIEW_SUMMARY_VS_RECORDING_LUMP` | `reconcileInterviewModalityItems` + no slash-blend family label | `d228df56e` | Tobin recording-only; Ahmed transcript; Patel both; Trap invent TN held |
| `PHONE_DOWNLOAD_MIDSTATE_MUTE_OR_SPLIT` | `reconcilePhoneDownloadModalityItems` inject mid-state | `d228df56e` | Brookes full TP; Arden property TN |
| `SUBSCRIBER` both-ways residue | `reconcileSubscriberModalityItems` inject + invent strip | `d228df56e` | Ahmed/Brookes TP; Trap assuming TN |

Prior FIXED (held): export-log · Trap CCTV invent · Arden phone-property · Arden/Trap interview invent TN

---

## Remaining OPEN / STOP

| Hop | Why still open |
|-----|----------------|
| `PAPERS_COLLAPSED_NO_DOC_INVENTORY` | **STOP this hop** — Papers deep detail is blocked by `evaluateMatterIntegrity` / `SolicitorDeepDetailGate` and Control Room clone; true doc inventory needs UI/projection redesign beyond surgical truth |
| `CLIENT_TAB_EQUALS_COURT_CONTROL_ROOM` | **STOP this hop** — same shared Control Room projection; no redesign in this wave |
| Volume triage (`mute_phone_download` etc.) | Sweep volume ≠ guilt — leave for next gym pass |
| Live AUTH re-shot on newest Preview | Partial on `5q2rrex15` (Arden/Trap off cases list; Brookes papers timeout); re-shot after new deploy |

---

## Canary scoreboard

| Canary | Expectation | Unit / code | Live on Preview |
|--------|-------------|-------------|-----------------|
| Arden export-log TN | no export log; master kept | PASS | partial (case not on list @5q2; prior freeze green) |
| Arden phone-property TN | no download invent | PASS (`reconcilePhone`) | pending new Preview |
| Arden CCTV master TP | master outstanding | PASS | pending |
| Brookes phone-download TP | download outstanding | PASS | court green @5q2 (`phoneDownload=true`) |
| Brookes subscriber TP | subscriber outstanding | PASS (inject) | court green @5q2 (`subscriber=true`) |
| Trap interview invent TN | no recording invent | PASS | pending (case off list) |
| Trap CCTV invent TN | no master invent | PASS | pending |
| Trap subscriber invent TN | no Subscriber from assuming | PASS | pending |
| Tobin/Ahmed/Patel interview modality | no slash blend; modality-true | PASS | pending new Preview |
| Grant/Tobin phone mid-state | mid-state card, not mute/full invent | PASS | pending new Preview |
| Dunn CAD extract vs audio | extract served; audio/full print chase | PASS | pending |
| Dunn stills ≠ master | stills not master chase | PASS | pending |
| Hearing chase deadline | not ops deadline from listing | code landed | Brookes court still shows listing string in header (OK) |

Opposite suite: `npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts` → **PASS**  
Foundational CAD modality: **PASS** · chase-source-gate: **PASS**

---

## Commits this wave

1. `6c98e5398` — docs: master hop book  
2. `b30c9bda7` — fix: CAD Present split + stills≠master + chase deadline role  
3. `1ff7099d5` — fix: Trap subscriber invent + Brookes digital expand  
4. `bb9620fb0` — test: opposite contracts  
5. `7fd917d6c` — docs: status + Preview SHA  
6. `d228df56e` — fix: interview modality split + phone mid-state + subscriber both-ways  

---

## Do not regress

- Export-log / Trap CCTV / Brookes phone-download / Arden property-phone gates already FIXED  
- No caseId hardcodes · no mute-everything · no Overview redesign · no Master-3000 / holdout / password resets  
- Exclude `casebrain-review-bundle.zip`

---

## Next rip

1. Finish AUTH re-shot on new Preview (force known Arden/Trap IDs if list slots rotate)  
2. Leave Papers/Client STOP unless a tiny shared projection root appears without redesign  
3. Volume triage only after PDF spot-check confirms shared roots  
