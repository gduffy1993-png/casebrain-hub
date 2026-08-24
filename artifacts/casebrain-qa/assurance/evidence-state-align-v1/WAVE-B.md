# Evidence-state align — Wave B

Generated: 2026-08-24
Base: Wave A PASS (86→18) @ 39c318c4c

## Scope
1. referred_only vs missing/NSC on chase family labels
2. Brookes phone extract + full download attention dedupe
3. Brookes Papers 0 served — **skipped** (needs live matter reprocess, not audit rebuild alone)
4. Listing P0 — out of lane

## Results

| Metric | Wave A end | Wave B |
|--------|------------|--------|
| EVIDENCE_STATE_MISALIGN (selected 50) | 18 | **0** |
| Total findings | 25 | 7 (listing+invent only) |
| Phone attention double-list | FAIL | **PASS** (adapter test) |

## Fixes
- `reconcileEvidenceState`: stop Outstanding chip poisoning hay; whyItMatters for referred cues only
- `inferChaseItemSourceState` + five-answers / audit / DisclosureChase: pass whyItMatters
- Chase why templates: drop “appears outstanding” boilerplate on CCTV/BWV/CAD/medical
- Custody referred why → referred_only (product)
- Overview `buildDemoAttentionItems`: collapse phone extract + full download to one attention row
- Board soft align (audit only, not MAA F03): schedule-referred vs missing on chase families

## Live
Redeploy Preview after commit; Brookes Overview should show single phone attention row.

## Verdict
**Wave B PASS** — evidence-state misalign cluster cleared on selected 50 (18→0).

## Next
- Invent/listing residuals (P0 hearing, P1 invent) — separate lanes
- Optional: live Brookes reprocess for Papers served counts
- Do not reopen invent-mute
