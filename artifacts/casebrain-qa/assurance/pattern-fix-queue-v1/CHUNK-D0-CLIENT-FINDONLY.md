# CHUNK D0 — CLIENT SCALE FIND-ONLY

**Verdict:** `D0_COMPLETE_FINDONLY`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip:** `7b900de22`  
**Pack:** `artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/`  
**Runner:** `scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts`  
**Scored:** **2600 / 2600**  
**Hitlist:** **1118**  
**Invent-flag sum:** **200**  
**Product fixes this chunk:** **NONE**  
**Captured:** 2026-08-21

---

## Claim surface

- `buildClientSafeExplanation` · war-room `clientExplanation` · matter-brief `client`
- Export-pack `client_summary` + `evidence_gaps` · `CHASE_BLEED` labels
- DO_NOT excluded from invent scoring

## Top families (volume = triage, not guilt)

| Family | N | Note |
|--------|--:|------|
| `mute_cad_999` | 396 | Honest residual after Court C1 CAD gate |
| `mute_cctv_master` | 320 | |
| `mute_phone_download` | 279 | |
| `invent_phone_download` | **166** | Top Client invent — PDF-spotcheck first |
| `modality_summary_vs_recording` | 103 | Soft |
| `invent_subscriber_thin` | 14 | |
| `invent_cctv_master` | 8 | |
| `invent_phone_download_from_property` | 8 | Arden-shape risk |
| `invent_interview_recording` | 4 | Residual after C1 (Court was 4) |
| `invent_bwv` / `invent_cad_999` | **0** | Cleared on Client claim surface |

Bleed detectors (`client_court_language_bleed` / papers-inventory chrome): **0** on projected client-core text (UI tab chrome may still differ live).

## Next

1. **D0.5/D1 DONE** — see `CHUNK-D05-D1-CLIENT-PHONE-ARMOUR.md` (tip sample **23/40** cleared)  
2. Residual phone invent WATCH **or** File (E0) find-only  
3. Live AUTH canaries when surfaces settle
