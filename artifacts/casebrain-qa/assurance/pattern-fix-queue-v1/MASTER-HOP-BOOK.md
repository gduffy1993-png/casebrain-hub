# MASTER HOP BOOK — Pattern fix queue

**Freeze product SHA:** `55c41d8956c044d20f4265cccc6fd8669349d2ae`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Preview (freeze):** https://casebrain-8h2c8ennr-gduffy1993-pngs-projects.vercel.app  
**Rule:** Overview-sweep **volume = triage**, not guilt. Gym / PDF-verify drives fix order.  
**Do not regress:** Arden export-log TN · Trap CCTV invent TN · Brookes phone-download TP · Arden phone-property TN · Arden/Patel CCTV master TP

Sources merged: `overview-criminal-sweep-v1`, `surface-findonly-v1/papers-chase`, `surface-findonly-v1/court-client-file`, `family-pdf-accuracy-v1` Friday canaries / FIXED hops.

---

## Scoreboard

| Status | N |
|--------|--:|
| FIXED (prior surgical + Trap CCTV + this wave) | 17 |
| OPEN (remaining) | 0 |
| STOP (UI redesign) | 2 |
| WATCH (UI / soft / volume triage) | 4 |

---

## FIXED (keep green)

| ID | Surfaces | Class | Example cases | PDF verify | Notes |
|----|----------|-------|---------------|------------|-------|
| `EXPORT_LOG_FROM_CCTV_MASTER_ALONE` | Court/Papers/Client WHY | invent | Arden | Arden PDF: no export log; master outstanding | Commit `3fa12f9d6` — do not promote export log from master alone |
| `TRAP_CCTV_MASTER_FROM_INVENT_ADVISORY` | Overview/Chase/Court | invent | Trap-0030 | Thin file: do-not-assume CCTV | Commit `55c41d895` — invent-advisory strip + gate |
| `ARDEN_PHONE_DOWNLOAD_FROM_PROPERTY` | Overview/Chase | invent | Arden | Stolen phone ≠ download | F167 surgical `70314a041` |
| `ARDEN_INTERVIEW_RECORDING_FROM_SUMMARY` | Overview/Chase | invent / modality | Arden | Summary served; recording not outstanding | F167 surgical `c400b76ba` |
| `TRAP_INTERVIEW_RECORDING_INVENT` | Overview/Court/Papers/Chase | invent | Trap-0030 | No PACE recording/transcript | LIVE TN on freeze Preview |

---

## OPEN — fix order (gym / PDF-true)

### 1. `INTERVIEW_SUMMARY_VS_RECORDING_LUMP` · FIXED · order **1**
- **Surfaces:** Chase (+ Overview gaps volume)
- **Class:** invent + modality lump
- **Gym:** Tobin, Ahmed, Patel (lump); Trap invent already FIXED
- **PDF verify:** Summary ≠ recording/transcript; chase as one card collapses modalities
- **Fix:** `reconcileInterviewModalityItems` + modality-true family labels (`d228df56e`) — no slash-blend identity
- **Opposite:** Patel/Tobin recording|transcript outstanding must still surface when PDF establishes it — **PASS**

### 2. `CAD_EXTRACT_PRESENT_STILL_CHASED` · FIXED · order **2**
- **Surfaces:** Chase (+ Overview gaps); Papers court-line CAD language
- **Class:** modality lump / present→chase
- **Gym:** Grant, Tobin, Dunn
- **PDF verify:** Grant MERGED FROM shows `CAD / 999 extractPresent` while card still Outstanding “CAD / 999 audio…”
- **Suggested fix:** CAD extract served ≠ chase whole CAD/999 family; split extract vs 999 audio vs full print
- **Opposite:** Dunn — extract served + **999 audio outstanding** + CAD full print outstanding must remain chaseable as those modalities

### 3. `CAD_999_INVENT_WITHOUT_SOURCE` · OPEN · order **2b** (same root)
- **Surfaces:** Court/Overview
- **Class:** invent
- **Sweep triage:** invent_cad_999 ~94
- **Gym / canary:** Arden TN already; residual volume
- **Suggested fix:** Keep source-gate; ensure extract-only language does not invent 999 audio
- **Opposite:** Dunn/Patel/Grant CAD pressure when PDF establishes CAD/999

### 4. `PHONE_DOWNLOAD_MIDSTATE_MUTE_OR_SPLIT` · FIXED · order **3**
- **Surfaces:** Papers TP soft / Chase mute split
- **Class:** mute / mid-state
- **Gym:** Grant, Tobin (Brookes TP + Arden property TN **held**)
- **PDF verify:** Grant “Logical download summary only”; Tobin referenced-only
- **Fix:** `reconcilePhoneDownloadModalityItems` (`d228df56e`) — mid-state inject; Brookes full TP; Arden property TN
- **Opposite:** Brookes full download outstanding TP; Arden property-phone TN — **PASS**

### 5. `PAPERS_COLLAPSED_NO_DOC_INVENTORY` · STOP · order **4** · redesign
- **Surfaces:** Papers
- **Class:** surface mute
- **Gym:** **8/8** (Arden, Brookes, Trap, Dunn, Ahmed, Patel, Tobin, Grant)
- **PDF verify:** All live gym → Control Room + `MORE PAPERS DETAIL UNAVAILABLE`
- **STOP:** Shared projection is Control Room + `SolicitorDeepDetailGate` integrity block — true doc inventory needs UI redesign beyond surgical truth. Continue other hops.

### 6. `CLIENT_TAB_EQUALS_COURT_CONTROL_ROOM` · STOP · order **4b** · redesign
- **Surfaces:** Client Summary ≡ Court Control Room
- **Class:** surface / projection
- **Gym:** Arden, Brookes, Trap
- **STOP:** Same Control Room projection root — no redesign in this wave.

### 7. `HEARING_DATE_USED_AS_OPERATIONAL_DEADLINE` · FIXED · order **5**
- **Surfaces:** Header OK as listing status; **Chase deadlineLabel** reuses same string
- **Class:** date-role
- **Gym:** Ahmed, Brookes, Dunn, Grant
- **PDF verify:** Chase Deadline = `Hearing date passed · <date>` treated as disclosure ops deadline
- **Suggested fix:** Separate listing status vs chase operational deadline wording
- **Opposite:** Same-day / upcoming listing labels still accurate on header

### 8. `SUBSCRIBER_MUTE_AND_INVENT_BOTH_WAYS` · FIXED · order **6**
- **Surfaces:** Chase
- **Class:** mute + invent
- **Gym:** Mute Ahmed/Brookes; invent Trap thin file
- **PDF verify:** Brookes “subscriber report not served” — Chase shows phone download but not subscriber; Trap invents Subscriber/account
- **Fix:** `digitalChaseLabel` word boundaries (`1ff7099d5`) + `reconcileSubscriberModalityItems` (`d228df56e`)
- **Opposite:** Brookes/Ahmed TP when outstanding; Trap TN when absent — **PASS**

### 9. `STILLS_SERVED_PROMOTED_TO_CCTV_MASTER` · FIXED · order **7**
- **Surfaces:** Papers + Chase
- **Class:** invent
- **Gym:** Dunn (opposite-pair of Arden/Patel master TP)
- **PDF verify:** Dunn CCTV stills served; MG6 outstanding list has no CCTV master — stills must not become master chase
- **Suggested fix:** `cctv_master` classify requires master/full-window language (stills alone ≠ master); keep Arden stills+master TP
- **Opposite:** Arden/Patel master outstanding when established; Trap invent TN already FIXED

---

## WATCH (not first wave)

| ID | Why watch |
|----|-----------|
| `mute_phone_download` volume (~695) | Triage noise until Lane B/C confirm |
| `BWV_STILLS_SERVED_PROMOTED_TO_FULL_EXPORT` | Dunn single-case invent; pair with stills≠master |
| `EXPORT_LOG_PRESENT_GLUED_UNDER_MASTER` | Ahmed soft opposite — unit opposite already PASS |
| `HEADER_CHARGE_MUTE_DESPITE_PDF` | Brookes/Patel — identity/extraction; not this truth wave |
| `THIN_TRAP_INVENT_SUBSCRIBER` | Folded into subscriber both-ways (#8) |

---

## Fix-wave priority (execute)

1. Interview summary↔recording residual lump  
2. CAD extract present still chased + CAD/999 invent (shared modality root)  
3. Phone mid-state (preserve Brookes TP + Arden TN)  
4. Papers / Client=Court **only if** shared projection root (no redesign)  
5. Hearing date ≠ chase ops deadline  
6. Subscriber both ways  
7. Dunn stills→master (no Arden/Patel/Trap regress)

Companion: `MASTER-HOP-BOOK.csv` · status after wave: `PATTERN-FIX-WAVE-STATUS.md`
