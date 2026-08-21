# CHUNK C0.5 + C1 — COURT INVENT TRIAGE + ARMOUR

**Verdict:** `C1_COURT_INVENT_ARMOUR`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Base find-only:** `CHUNK-C0-COURT-FINDONLY.md` (2600 scored @ tip `713a056b4`)  
**Opposite suite:** `scripts/f167-surgical-truth-opposite-direction.test.ts` → **PASS**

---

## C0.5 PDF / claim triage (not volume-guilt)

| Family (C0 N) | Triage | Shared root? |
|---------------|--------|--------------|
| `invent_bwv` **520** | **519/520 = DETECTOR_NOISE** — `DO_NOT \| Do not import BWV…` scored as invent | Detector only (exclude DO_NOT from invent blob) |
| `invent_cad_999` **194** | **164/194 = DO_NOT noise**; **30 = REAL invent** — CAD chase from bare `999` / schedule noise | Yes — CAD mention used `\b999\b` |
| `invent_interview_recording` **261** | **261/261 = REAL invent** — `CHASE \| Interview recording` without recording modality on papers | Yes — custody_pace playbook template + PACE interview → recording label |

Protected opposites still green: Trap interview TN · Tobin recording-vs-transcript · Dunn CAD TP · Brookes/Arden phone · Dunn BWV stills.

---

## C1 product armour (shared-root only)

1. **`chase-source-gate`:** `isCad999Established` / `isInterviewRecordingEstablished` / `isInterviewTranscriptEstablished`; CAD mention no longer bare `999`; modality filters for CAD lump + interview recording.
2. **`buildDisclosureChaseBrief`:** CAD family match tightened; `reconcileInterviewModalityItems` drops/relabels recording invent; custody canonical no longer invents recording from playbook lump; re-reconcile interview+CAD after finalize.
3. **`brief-plan/playbooks` `custody_pace`:** chase template no longer bakes `interview recording`.
4. **Court sweep detector:** invent scoring uses `inventClaimBlob` (excludes `DO_NOT` lines); interview source no longer bare `tape`.

---

## Next

- Optional tip Court re-sweep sample / full 2600 to measure invent_bwv / interview / CAD drop  
- Then Client (D0) / File (E0)  
- Merge to programme only on explicit ask
