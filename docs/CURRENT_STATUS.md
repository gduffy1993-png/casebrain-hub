# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-28  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk)

**Decision:** No design-partner trial yet. H3 ✅ → **H4** → H5 → H6 → then firm.

**Scale gates (primary):** golden 102 + Level 1 2,200 + worst50 + simulator pack (when live). **Taylor/Jordan:** fresh-user deploy smoke only.

## Done

| Item | Result |
|------|--------|
| H1 — safety / weirdness | Done — 2,200 clean |
| H2 — display polish + verification | Done — golden 102, 0 fail |
| Modules 1–7 | Live |
| H3 chunks 1–3 | Prod — trust layer **complete** |
| Brain 1 + frozen cores | Untouched |

### H3 accepted complete

- Chunks 1–3 deployed (`895a905` · `f3703a2` · `4735efa`)
- CB-FRESH smoke **9/9 PASS**
- Golden 102 H3 trust gate: **0 blocking / 0 confusing**
- Feedback panels live on Today / Chase / Summary
- Pending ops: Supabase migration `20260628120000_trust_feedback.sql`

## H4 — Real-World Confidence ⏳ **NEXT**

**Criminal Bundle Simulator Library** — fake/anonymised bundles; test by shape, not identity.

| Step | Work |
|------|------|
| 1 | Apply trust feedback DB migration |
| 2 | Export/copy gate |
| 3 | Fresh-account smoke (ongoing) |
| 4 | Account/permission smoke |
| 5 | Simulator manifest v1 — 30 cases |
| 6 | Simulator pack v1 — run 30 fake bundles |
| 7 | Expand 30 → 75 → 150+ |
| 8 | Worst50 + simulator → Bad Output Memory |

**Docs:** `docs/h4/H4_SIMULATOR_LIBRARY.md` · `docs/h4/H4_BUILD_ORDER.md`

## Key scripts

```powershell
npx tsx scripts/h3-golden-trust-gate.ts
npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable 100 --max-polish-rate 1
npx tsx scripts/build-h2-review-queue.ts
npx tsx scripts/trust-feedback.test.ts
npx tsx scripts/.tmp-cb-fresh-audit.ts   # deploy smoke only
```
