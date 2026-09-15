# Evidence-state align v1

Generated: 2026-08-24
Branch tip base: invent-mute collapsed (~0eba89ab3 / 2b1af18cf)
Lane: evidence-state misalign / Overview wording (non-invent)

## Wave summary

| Wave | Focus | Result |
|------|-------|--------|
| W0 inventory | Surfaces + 50-board | 86× EVIDENCE_STATE_MISALIGN (mostly MG6 clarification false-bind + referred↔outstanding noise) |
| W1 LICK | overview/demo/integrity/stage50 | integrity FAIL (phone alias 4≠3); stage50 PASS |
| W2 FIND | Brookes live rebuild | Screenshot pack forced incomplete; MG6 chase bound as mg6=served; chrome prose in evidence rows; Overview stats from chase OR evidence |
| W3 FIX | shared-root | partial-media, MG6 meta, truth bind, alias collapse, Overview counts, charge/MG5, chrome filter |
| W4 RELICK | 50-board + contracts | EVIDENCE_STATE_MISALIGN **86 → 18**; Brookes **0** findings; stage50 34/34; integrity PASS |

## Ranked findings (severity)

1. **P0 product** — `isPartialMediaLedgerLabel`: bare `screenshot` in PARTIAL+MEDIA forced every screenshot pack → incomplete (File/Overview lied vs served packs).
2. **P0 audit/UI bind** — truth `mg6=served` falsely bound to chase meta `MG6 / unused (/) schedule clarification`.
3. **P1 Overview wording** — `buildDemoStatCounts` preferred chase attention counts over canonical evidence counts (`||` fallback) → Missing/Incomplete chips ≠ File.
4. **P1 counts** — phone extract + full download both missing did not collapse → double outstanding.
5. **P2 ledger chrome** — PDF narrative / `=== SECTION ===` / limited-bucket TOC polluted fiveAnswers evidence rows.
6. **P2 residuals (18)** — referred_only vs missing/NSC on family chase labels without explicit “outstanding” (CCTV continuity, BWV, custody, dashcam master). Outside invent; next wave.

Invent residuals: **none** (do not reopen invent-mute).

## Fixes (shared-root)

- `lib/eval/evidence-state-audit/partial-media.ts` — screenshot pack served stays served; MG6 meta regex; charge/MG5 TOC → served; chrome filter; ledger explicit-served
- `lib/eval/evidence-state-audit/build-audit-snapshot.ts` — bindTruthMapRowForExpectation; pass bundleText+truthKey; soft outstanding align (board-only); chrome drop
- `lib/criminal/evidence-alias-dedupe.ts` — extract↔full collapse when non-served
- `components/criminal/demo-shell/demoOverviewAdapter.ts` — Overview Missing/Incomplete from canonical evidence counts
- `lib/criminal/five-answers/expand-truth-map-rows.ts` — Complainant MG11 → referred_only
- `lib/eval/master-assurance-auditor/evidence-state-compare.ts` — served↔incomplete partial family

## Board delta (50-case identity)

| Metric | Before | After |
|--------|--------|-------|
| Total findings | 93 | 25 |
| EVIDENCE_STATE_MISALIGN | 86 | **18** |
| Brookes findings | 1 (MG6 misalign) | **0** |
| Invent fails | 3 | 3 (listing/invent — out of lane) |

## PASS / FAIL

- Local contracts: **PASS** (stage50, integrity, overview, demo-adapter, expand-truth-map, cps-chase-review)
- Evidence-state misalign cluster: **PASS** (major reduction; 18 residuals ranked)
- Live Preview: **PASS** for Wave A count root — https://casebrain-nabot0fl5-gduffy1993-pngs-projects.vercel.app (`39c318c4c`) — see WAVE-LIVE.md

## Next recommendation

1. Wave B: referred_only preservation on chase family labels (CCTV continuity / BWV / custody) when papers say referred/listed without “outstanding”.
2. Chase attention phone extract+full download still double-listed (evidence alias collapse ≠ chase list).
3. Listing identity P0 (hearing date clear but absent) — separate lane.
4. Do not reopen invent-mute unless invent regression appears.
