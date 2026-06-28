# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-28  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk)

**Decision:** No design-partner trial yet. Finish H2 → H3 → H4 confidence stack first.

## Done

| Item | Result |
|------|--------|
| H1 — weirdness / dangerous bleed hardening | Done |
| H2 P1 — chase finalization | Prod |
| H2 P2/P3 — display polish (overflow labels, court lines, Court Today junk) | Prod (`bda9975`) |
| **H2 Verification** | **Gate PASS** — 102 runnable, **0 fail**, polish-only |
| Golden pack + truth-key v2 | **100 dirs**, 99% avg coverage, 99/102 at 100% |
| H2 confidence report | **WARNING** (polish-only — not blocked) |
| Level 1 corpus | **2,200 / 2,200** — 0 dangerous, worst50 dangerous **0** |
| Modules 1–7 | Live; kill switches per module |
| CB-FRESH Taylor + Jordan | Codex Layer 7 **PASS WITH MINOR WARNINGS** |
| Fresh-user prod smoke | Green |
| Paywall/trial clarity (pilot) | Banner + upload trial limits |
| Brain 1 + frozen cores | Untouched |

## Next (engineering) — H3 Trust layer

1. Matter confidence header — safe / provisional / needs review
2. Source-state badges — served / referred only / missing / provisional
3. Copy-safe controls — CPS chase vs court line vs client summary
4. Feedback capture → Bad Output Memory tests

Then **H4 Real-world confidence**, then design-partner firm.

## Not started

- H4 — deploy smoke gate, account smoke, export check, red-team bundle pack
- Design-partner approach (blocked until H2–H4)

## Known polish (not pilot-blocking)

- `duplicate_chase_label` on all 102 golden cases + 2200 corpus — P2 leftover; optional Codex/output dedupe pass if we want zero polish warnings

## Honest limit

Automated 2,200 scan catches patterns; it cannot certify every line solicitor-perfect. Proof = scan + golden truth keys + worst50 review + (later) solicitor feedback loop.

## Key scripts

```powershell
npx tsx scripts/grow-golden-pack.ts --target 100
npx tsx scripts/backfill-golden-truth-keys-v2.ts
npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable 100 --max-polish-rate 1
npx tsx scripts/h2-confidence-report.ts --run-gate --target 100
npx tsx scripts/build-h2-review-queue.ts
npx tsx scripts/.tmp-cb-fresh-audit.ts
```

Full plan: `docs/CRIMINAL_PILOT_MASTER_PLAN.md`
