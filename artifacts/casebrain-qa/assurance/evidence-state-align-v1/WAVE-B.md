# Evidence-state align — Wave B

Generated: 2026-08-24
Base: Wave A PASS (86→18) @ 39c318c4c

## Scope
1. referred_only vs missing/NSC on chase family labels
2. Brookes phone extract + full download attention dedupe
3. Brookes Papers 0 served — **skipped** (needs live matter reprocess)
4. Listing P0 — out of lane

## Results

| Metric | Wave A end | Wave B |
|--------|------------|--------|
| EVIDENCE_STATE_MISALIGN (selected 50) | 18 | **0** |
| Total findings (selected 50) | 25 | 7 (listing+invent only) |
| Brookes phone double attention | FAIL | **PASS** (live) |

## Fixes / SHAs
- `e40bd6e86` — referred_only via whyItMatters; Outstanding chip no longer poisons hay; phone attention collapse; chase why templates
- `46dbe1191` — phone collapse across MISSING/UNCLEAR
- `62db5bf2f` — stop MG6→phone polish rewrite (root of Brookes double); post-polish phone filter

## Live Preview
https://casebrain-7ht2iuzej-gduffy1993-pngs-projects.vercel.app (`62db5bf2f`)

Brookes Overview attention: Exhibit · Phone extraction/download status · digital disclosure schedule item (no second phone).

## Verdict
**Wave B PASS** — evidence misalign 18→0 on selected 50; phone double fixed live.

## Next
- Listing P0 / invent P1 — separate lanes
- Optional Brookes Papers reprocess for served counts
- Invent-mute stays closed
