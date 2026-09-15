# Solicitor-truth vision (Ged + Cursor)

Saved: 2026-08-25  
Branch / PR: `ui/demo-overview-shell-v1` → PR #101 only (no merge / no prod unless Ged says)

## Core idea (one sentence)

PDF/Papers truth already often knows; other mouthpieces (stale matter fields, template seeds, sticky court lines) were answering. Fix = one papers-backed truth → every screen only projects it.

## Loop (Ged’s vision)

1. Find fails on a small set (~5 cases) → name the pattern  
2. Fix the **root** (not case-specific hacks)  
3. Re-check the **same 5** (regression)  
4. Check **5 new** cases, same *kind* of mess, different PDFs (generalisation)  
5. If clean → next root → same loop  
6. Later widen by **family**: e.g. 5 murder · 5 robbery · 5 rape/sexual · 5 POCA · 5 assault/s18 · 5 digital/phone — not to teach charge-finding from scratch, but to prove the same roots hold across offence shapes  

Per root: **5 + 5** is enough until green twice; don’t jump to 50 early.

## Roots order (current)

| # | Root | Status |
|---|------|--------|
| 1 | Shortlist freeze (Overview = Chase, no Other resurrection) | Done on tip (`419f5f2d8`) — live Dunn/Brookes earlier |
| 2 | Source-backed charge outranks stale matter offence (Hale Fraud-on-Murder) | Done on tip (`a96538d3f`) — unit tests PASS; **live Hale re-lick still TODO** |
| 3 | Papers status truth (Outstanding ≠ Served invent) | Next |
| 4 | Schedule-loud gap ranking (not custody/medical/999 favourites) | After 3 |
| 5 | Court line binds to primary gap | After 4 |
| — | Live prove Tobin / Davies / Patel / Hale / Arden after each root | Required before claiming green |

## What “family packs” are for

- **Not** “after 5 murders the AI magically learns Murder.”  
- **Yes** prove charge / court / dates / gaps / status stay papers-backed when the *shape* of the PDF changes.  
- Charge, court, dates should come from **extract + canonical/header resolve**, not from memorising families. Families are the **exam**, not the textbook.

## Confidence

Better and more accurate than theorist/vacuum era — yes, pattern by pattern.  
Not solicitor-perfect on every thin PDF — uncertain should stay provisional, not invent.

## Hard rules

- PR #101 only until Ged says otherwise  
- No merge / no production deploy without explicit ask  
- Do not patch individual cases; fix roots  
- Leave bulk QA artefacts uncommitted unless asked  
