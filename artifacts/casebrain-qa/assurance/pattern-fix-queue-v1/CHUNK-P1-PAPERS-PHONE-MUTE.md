# CHUNK P1 — PAPERS PHONE DOWNLOAD MUTE ARMOUR

**Verdict:** `P1_PHONE_MUTE_ARMOURED`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Opposite suite:** **PASS** (`scripts/f167-surgical-truth-opposite-direction.test.ts` — L2 Papers inventory + Brookes Chase TP)  
**Product fixes:** YES (shared-root)  
**Merge / Master-3000:** **NOT DONE**  
**Captured:** 2026-08-21

---

## Hop

`PAPERS_PHONE_DOWNLOAD_MUTE` — outstanding phone download / source export on papers not collected into Papers inventory when outside MG6 head (ITEM_RE gap), and Chase could rewrite a combined download+subscriber schedule line into Subscriber-only.

## Opposite

| Direction | Case | Expectation | Result |
|-----------|------|-------------|--------|
| TP | Brookes | Full phone download on Papers inventory **and** primary Chase | **PASS** |
| TN | Arden | Stolen / property phone + “no phone download” must **not** invent download row | **PASS** |
| TP | Brookes Chase | Subscriber remains distinct (not eaten by phone card) | **PASS** |

## Product fix

1. `lib/criminal/bundle-material-normalizer.ts` — treat phone download / source export / handset·device download / digital extraction / subscriber report as material items; deny property-only / “no phone download” lines (without killing other materials on the same line).
2. `components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts` — do not rewrite Full phone download cards into Subscriber when mergedFrom mentions subscriber; canonical ledger label for download lines → `Full phone download / source extraction`.

No caseId hacks · no mute-everything · no architecture rewrite.

## Next

Optional tip re-score Papers mute_phone family (find-only) to measure Δ. Date-role / Court lanes still later.
