# Gold Manual Proof Set v1 — generation notes

**Branch:** `feature/gold-manual-proof-set-v1`  
**Output:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`

## What this is

A **20-case** solicitor-grade manual proof pack built from existing controlled / PDF-backed demo-audit families (DA-01–30 + v9 catalog families). It proves **accuracy in detail**, not scale.

## Rebuild

```bash
npx tsx scripts/build-gold-manual-proof-set-v1.ts
```

Catalog: `lib/eval/gold-manual-proof-set/catalog.ts`  
Spec templates: this folder (`GOLD_CASE_TEMPLATE.md`, etc.)

## Claim discipline

- Gold manual review on controlled bundles
- **Not** real-world solicitor validation
- Solicitor review required per case before gold promotion

## Scope boundary

Evaluation / reporting only. Does not modify Brain 1, chase core, export builders, Supabase, auth, or production UI.
