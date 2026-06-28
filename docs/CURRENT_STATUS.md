# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-28  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk)

**Decision:** No design-partner trial yet. H3 → H4 → H5 → H6 → then firm.

**Scale gates (primary):** golden 102 + Level 1 2,200 + worst50. **Taylor/Jordan:** fresh-user deploy smoke only — not the main proof surface.

## Done

| Item | Result |
|------|--------|
| H1 — safety / weirdness | Done — 2,200 clean |
| H2 — display polish + verification | Done — golden 102, 0 fail |
| Modules 1–7 | Live |
| H3 chunk 1 | Prod (`895a905`) — Layer 7 PASS WITH WARNINGS |
| Brain 1 + frozen cores | Untouched |

## H3 chunk 2 (local — deploying)

- Full header fields (evidence coverage, sendability labels)
- Today/Summary badges + Don’t Say box + client-safe copy
- Scale gate script: `scripts/h3-golden-trust-gate.ts`
- Header badge cap: 3 visible + overflow (matter status always shown)

## H3 scale report (chunk 2 pre-deploy, 2026-06-28)

| Gate | Result |
|------|--------|
| Golden 102 (Level 2) | **PASS** — 0 fail, 102 polish |
| H3 golden trust (102) | **PASS** — 0 blocking, 0 confusing (badge cap applied) |
| Level 1 2,200 | **0 dangerous** (scan 2026-06-27 — UI-only change, no re-run needed) |
| Worst50 | **0 dangerous** — only `duplicate_chase_label` polish cluster |
| Taylor/Jordan smoke | Fresh-user only — not primary gate |

Sendability on golden chase items: **547/547 provisional_check_source** (none falsely “safe to send”).

## Still to do in H3

Feedback capture (chunk 3).

## Next

Deploy chunk 2 → fresh-user smoke → Codex Layer 7 optional sanity read.

## Key scripts

```powershell
npx tsx scripts/h3-golden-trust-gate.ts
npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable 100 --max-polish-rate 1
npx tsx scripts/build-h2-review-queue.ts
npx tsx scripts/h2-confidence-report.ts --run-gate --target 100
npx tsx scripts/.tmp-cb-fresh-audit.ts   # deploy smoke only
```
