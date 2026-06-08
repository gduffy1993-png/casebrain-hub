# Family-40 auditor catalog

Source: `docs/fictional-cases-40/NS-CPS-2026-0401.txt` … `0440.txt` (see `scripts/generate-fictional-40-sources.cjs`).

## Confirmed vs uncertain

| Family | Confirmed | Uncertain | Notes |
|--------|-----------|-----------|--------|
| fraud_account_control | 2 | 8 | Only 0411, 0434 are clear fraud offences |
| pwits_phone_attribution | 2 | 8 | 0405, 0421 clear drug possession/supply |
| robbery_identification | 3 | 7 | 0401, 0410, 0423 clear robbery |
| violence_domestic_assault | 0 | 10 | Offence tags clear; strict grade deferred (no `violence_domestic_assault` in pilot-workflow yet) |

**Total:** 7 confirmed strict-grade slots (fraud 2 + PWITS 2 + robbery 3), 33 uncertain scaffold slots.

Uncertain cases emit `manifest.case_family_uncertain` — not release-blocking.

## Approval before full manifests

- Human review of uncertain bucket assignments
- Wire org DB `cases` rows when running against live matters (not in this scaffold)
- Add violence profile to `pilot-workflow` before violence strict grading in production UI
