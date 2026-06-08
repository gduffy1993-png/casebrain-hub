# Pack A and Pack B (eval bundles)

## Pack A (frozen)

The original **Northshire-style 40-pack** is the **regression / stability** benchmark.

- **Do not** modify, rewrite, replace, or “improve” those bundle files as part of generalisation work.
- Changes to routing, grounding, or prompts must **preserve** Pack A behaviour (strict MG6, interview, exhibits, deterministic allegation paths, etc.).

## Pack B (generalisation)

Pack B uses **generic criminal bundle wording** (including CB-TEST-style layouts): varied headings, disclosure shapes, and evidence mixes that are **not** tied to Northshire-only patterns.

- Golden Sweep and similar runs on Pack B measure **generalisation**, not regression against the frozen 40-pack.
- Goal: answer quality and routes should work on **both** Pack A and Pack B without requiring Northshire-only hooks where the bundle already supplies charge, MG5, MG6, interview, and exhibits.

## When editing code

1. Prefer logic that accepts **generic** charge/MG6/dispute labels **and** the legacy Northshire markers.
2. After changes, compare **Pack A** sweep results (must stay stable) with **Pack B** sweep results (should improve).
