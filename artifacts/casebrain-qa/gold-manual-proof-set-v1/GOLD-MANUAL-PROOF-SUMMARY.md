# Gold Manual Proof Set v1 — Summary

**Generated:** 2026-07-10T17:46:31.046Z  
**Branch intent:** `feature/gold-manual-proof-set-v1`  
**Cases:** 20/20 packets  
**Provisional scores (pre-solicitor):** 20 pass · 0 warn · 0 fail  
**Hard safety failures across pack:** 0  
**Ready for human solicitor review:** **YES** (full pack — see `INTERNAL-GOLD-QA-REPORT.md`)  
**Wave A (CASE-01, 02, 04, 06):** see internal QA report

## Claim discipline

This pack is a **gold manual review** framework on **controlled/PDF-backed** demo-audit families.  
It does **not** claim real-world solicitor validation. Each case remains **solicitor review required** until the checklist is signed.  
v9 catalog cases are controlled fictional bundles included in this human-review set (catalog origin noted on packets).

## Case index

| Gold ID | Family | Source case | Provisional | Packet |
|---------|--------|-------------|-------------|--------|
| CASE-01 | phone harassment / attribution | `demo-audit-01-phone-harassment` | PASS | [CASE-01](./cases/CASE-01/CASE-REVIEW.md) |
| CASE-02 | BWV referred-only | `demo-audit-03-bwv-custody` | PASS | [CASE-02](./cases/CASE-02/CASE-REVIEW.md) |
| CASE-03 | custody extract vs full custody | `demo-audit-27-custody-pace-missing` | PASS | [CASE-03](./cases/CASE-03/CASE-REVIEW.md) |
| CASE-04 | CCTV stills vs master footage | `demo-audit-02-cctv-stills` | PASS | [CASE-04](./cases/CASE-04/CASE-REVIEW.md) |
| CASE-05 | Encro handle attribution | `demo-audit-05-encro-attribution` | PASS | [CASE-05](./cases/CASE-05/CASE-REVIEW.md) |
| CASE-06 | mixed-defendant material | `demo-audit-04-co-def-interview` | PASS | [CASE-06](./cases/CASE-06/CASE-REVIEW.md) |
| CASE-07 | bad redaction | `demo-audit-44-bad-redaction` | PASS | [CASE-07](./cases/CASE-07/CASE-REVIEW.md) |
| CASE-08 | charge mismatch | `demo-audit-69-charge-mg5-hearing` | PASS | [CASE-08](./cases/CASE-08/CASE-REVIEW.md) |
| CASE-09 | domestic order / restraining order breach | `demo-audit-32-restraining-order-breach` | PASS | [CASE-09](./cases/CASE-09/CASE-REVIEW.md) |
| CASE-10 | translated messages | `demo-audit-41-translated-messages` | PASS | [CASE-10](./cases/CASE-10/CASE-REVIEW.md) |
| CASE-11 | youth / appropriate adult / intermediary | `demo-audit-22-youth-interview` | PASS | [CASE-11](./cases/CASE-11/CASE-REVIEW.md) |
| CASE-12 | ABE / first account / third-party records | `demo-audit-21-historic-sexual-abe` | PASS | [CASE-12](./cases/CASE-12/CASE-REVIEW.md) |
| CASE-13 | drugs lab / continuity | `demo-audit-50-lab-continuity-conflict` | PASS | [CASE-13](./cases/CASE-13/CASE-REVIEW.md) |
| CASE-14 | fraud bank/device attribution | `demo-audit-16-fraud-bank-statements` | PASS | [CASE-14](./cases/CASE-14/CASE-REVIEW.md) |
| CASE-15 | motoring SJP thin evidence | `demo-audit-18-motoring-sjp-thin` | PASS | [CASE-15](./cases/CASE-15/CASE-REVIEW.md) |
| CASE-16 | ANPR / vehicle ID | `demo-audit-49-anpr-trap` | PASS | [CASE-16](./cases/CASE-16/CASE-REVIEW.md) |
| CASE-17 | medical injury report missing | `demo-audit-61-medical-triage-partial` | PASS | [CASE-17](./cases/CASE-17/CASE-REVIEW.md) |
| CASE-18 | prison calls / call logs | `demo-audit-46-prison-calls` | PASS | [CASE-18](./cases/CASE-18/CASE-REVIEW.md) |
| CASE-19 | social handles / subscriber gap | `demo-audit-47-social-media-handles` | PASS | [CASE-19](./cases/CASE-19/CASE-REVIEW.md) |
| CASE-20 | OCR/date/court mismatch | `demo-audit-30-layout-hearing-date` | PASS | [CASE-20](./cases/CASE-20/CASE-REVIEW.md) |

## How to review

**Provisional pack cleared for human gold-manual review.** Still not solicitor-validated until per-case checklists are signed.

Human solicitor review pack: [HUMAN-SOLICITOR-REVIEW.md](./HUMAN-SOLICITOR-REVIEW.md) → `docs/gold-manual-proof-pack/human-solicitor-review-v1/`

1. Open a case folder under `cases/CASE-XX/`.
2. Read `CASE-REVIEW.md` (≤10 minutes).
3. Complete `manual-review-checklist.md`.
4. Compare `expected.json` vs `actual-summary.json`.
5. Promote to gold only after solicitor/Ged sign-off.

## Rebuild / zip

```bash
npx tsx scripts/build-gold-manual-proof-set-v1.ts
npx tsx scripts/build-gold-manual-proof-set-v1.ts --zip-only
```

Review zip: `gold-manual-proof-set-v1-review-pack.zip` (per-case `expected.json`, `actual-summary.json`, checklist, review md; excludes `_source/`).

## Spec references

- `docs/gold-manual-proof-pack/human-solicitor-review-v1/`
- `docs/gold-manual-proof-pack/README.md`
- `docs/gold-manual-proof-pack/GOLD_PACK_COVERAGE_TARGETS.md`
- `lib/eval/gold-manual-proof-set/catalog.ts`
