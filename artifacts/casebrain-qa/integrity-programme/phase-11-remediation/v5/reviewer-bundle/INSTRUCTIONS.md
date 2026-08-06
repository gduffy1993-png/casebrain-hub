# Phase 11 v5 gold review — instructions

**Status:** AWAITING_HUMAN_GOLD_REVIEW (remediation comparison set)  
**v5 freeze hash:** `3e2479c86769e3cd5342903997eaa548cfdc98a8339a34d0890bfc0178536f5d`  
**Parent v1 freeze hash (preserved):** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`  
**Parent v2 freeze hash (preserved):** `fcdd13e53f35a61fb1a2bf2f0faa7347ec896b1d28bd9098609ac486ab0b64c0`  
**Parent v3 freeze hash (preserved):** `de6d04734c9636e49de0fe30ca3422f1750180ae9db8d9f1e75e52b3450c7767`  
**Parent v4 freeze hash (preserved):** `d887114aac265e00e9a8d66c98c82fa087a85388e60f1fc930a6996b5d6ab883`

## Definitions

- **Accepted** — solicitor-visible wording is appropriate to show/copy.
- **Blocked** — copy/export withheld. Blocked ≠ repaired.
- **Review-required** — neutral review message; not silent omission.
- **Uncertain** — family/hearing/provenance not safely resolved.
- **INSUFFICIENT_SOURCE_CONTEXT** — excluded from substantive FP/FN denominators.
- **FP** — over-block of safe wording.
- **FN** — under-block of unsafe wording (safety FN is a blocker).
- **Substantive correctness** — word-for-word accuracy; separate from "was it blocked?".

## Membership (v5)

- 43 goldIds/fixtures carried forward from v4, UNCHANGED (0 additions, 0 removals; lineage identical to v4).
- Synthetic technical controls (SYN-*) are substantive only where independent expected truth is documented; see each packet's "Controlled source context" surface.
- v5 focuses on RENDER discipline (every copyable prose surface — client_summary, court_line, cps_chase_draft, copy_preview, export_preview, family_leak_probe — now runs sanitize → boundary → assert → gate before canCopy=true) and a repaired SCAN that reads full rendered JSON for every case (see `../fixed-length-wording-operations-v5.json`).

Follow `blinded-review-order.json`. Do not consult automated-predictions-v5.json while judging.
