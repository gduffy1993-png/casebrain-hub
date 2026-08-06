# FINAL BATCH-10 POPULATION ACCEPTANCE

**populationPacketReadinessMet:** `true`

This flag means **only** that the packet population passed independent packet validation.
It does **not** imply detector readiness, Stage-150 selection/freeze/execution readiness, corpus PASS, or programme PASS.

## Population

| Cohort | Accepted | Notes |
|--------|----------:|-------|
| A (preserved) | 30 | byte-for-byte unchanged: true |
| B (deficit-120) | 120 | strict/uniqueness rejects: 0 |
| **Total** | **150** | deficit **0** |

## Independent uniqueness

- unique case IDs: 150
- unique source fingerprints: 150
- unique PDF hashes: 150
- unique packet hashes: 150
- unique exact wording hashes: 144
- unique normalised wording hashes: 144

## Truth blinding (ordered)

1. **source_generation_completed**: OK — canonical-bundle + bundle.pdf present per accepted Cohort-B case
2. **outputs_persisted_and_hashed**: OK — casebrain-output.json + production exit payload files persisted
3. **candidate_packets_frozen_on_disk**: OK — structured-case-packet.json present under deficit120-candidates / cohort-A root
4. **truth_content_unopened**: OK — truth-key.json inventoried by path+byte-hash only; lineage.truthOpenedDuringOutput=false; outputs lack truth semantic fields

Truth contents opened: **false**

## Exit authenticity (accepted population)

- **view**: genuine=120, metadata_only=0, unavailable=30, not_exercised=0
- **copy**: genuine=120, metadata_only=0, unavailable=30, not_exercised=0
- **export**: genuine=120, metadata_only=0, unavailable=30, not_exercised=0
- **api**: genuine=120, metadata_only=0, unavailable=30, not_exercised=0
- **pdf**: genuine=120, metadata_only=0, unavailable=30, not_exercised=0
- **composed_prose**: genuine=120, metadata_only=0, unavailable=30, not_exercised=0
- **authenticated_browser**: genuine=0, metadata_only=0, unavailable=0, not_exercised=150

`authenticated_browser` remains **not_exercised** unless a genuine authenticated capture exists.

## Anti-overfitting

Findings: none

## Stage-150 gates (all false)

- sample selection: false
- execution: false
- freeze: false
- programme PASS: false

## Verification

- TypeScript stage150 path errors: 0
- Brain1/Guardian unchanged: true
- Implementation totals: {"stage150ControlCount":161,"partially_implemented":98,"specified_not_implemented":55,"implemented":8,"other":0}

## Regeneration

```
npx tsx scripts/assurance/emit-maa-v2-stage150-batch10.ts
npx tsx scripts/assurance/emit-maa-v2-stage150-batch10-deficit120.ts
npx tsx scripts/assurance/emit-maa-v2-stage150-batch10-final-acceptance.ts
npx tsx --test scripts/maa-v2-stage150-batch10-contracts.test.ts scripts/maa-v2-stage150-batch10-deficit120-contracts.test.ts scripts/maa-v2-stage150-batch10-final-acceptance-contracts.test.ts
npm run build
```

## Retention

- Code bytes (batch10 lib): 217491
- Generated evidence bytes: 14408553
- Hash-lock / untrack large sources+candidates; commit acceptance STOP + lib/scripts.

---
STOP uncommitted. Do not select, freeze or run Stage 150.
