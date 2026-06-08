# Fictional GBH bundle (R v Pike)

**File:** `FICTIONAL_GBH_BUNDLE_COPY_PASTE.txt`  
**Purpose:** Test CaseBrain on a single realistic initial-disclosure pack: s20 GBH, one-punch + kerb fall, messy disclosure, witness variation, document tensions.

## What was added (Copilot-style hardening)

| Feature | Where |
|--------|--------|
| JSON metadata header | Top of file (`CASEBRAIN_BUNDLE_METADATA`): offence, difficulty, themes, hooks, disclosure/witness issues, document tensions, hallucination traps, `sections_expected` |
| Section delimiters | `=== SECTION: KEY ===` before each major block (stable for parsing) |
| MG5 depth | Crown theory, defence angles, key issues, witness inconsistency summary; disclosure chaos aligned to MG6 |
| MG6(a) | Backlog language, partial 999/CAD, BWV queue, custody CCTV overwrite note, medical **not served** |
| Custody | Intoxication, MH note, injury check, aggression/compliance, requests, custody CCTV 72h overwrite risk |
| MG11s | Messy recollection, lighting/angle, friend bias, Patel aftermath-only, minor typo risk on Vale time range |
| CCTV continuity | Draft continuity: clock drift, 12s gap, vendor buffer note |
| 999 / CAD | Partial extracts: noise, redaction, incomplete timestamps |
| IR-001 | Interview summary: no comment, solicitor interruption, fatigue note |
| Forensic/medical | Schedule note only (no fake full reports) |

## Intentional tensions (do not “fix” without updating metadata)

- Charge particulars **14 March** vs MG5 narrative **15 March**.
- MG5 suggests export “being arranged” vs MG6/CCTV list **awaiting** master file in exhibits.
- CAD fragment **00:24** vs Vale **~00:30** arrival.

Chat alignment: use the **defence-plan-chat** rules — mirror disclosure rows literally; flag contradictions; do not invent served medical/CCTV.

## PDF / print

Strip or hide the `CASEBRAIN_BUNDLE_METADATA` block if you need a clean CPS-style PDF only; keep it for tooling and ingestion tests.
