# Baseline attribution checkpoint — PR #65 vs master

**Status:** ATTRIBUTION COMPLETE — programme regressions addressed; pre-existing failures registered  
**Generated:** 2026-07-21  
**Branch:** `programme/criminal-defence-integrity-corpus` @ after remediation commit  
**Base:** `master` @ `cc7e6bb20945a1ae29333da86645781f6f254e89` (PR #65 base)  
**PR:** #65 — do not merge / do not deploy / **do not start Phase 8** until this checkpoint is acknowledged  

Phase 7 scoped contracts remain valid. This checkpoint addresses **repository-wide** greenness.

## Commands (identical on base worktree and branch)

```text
npm run lint
npm run typecheck
npm run build
npx vitest run
```

Worktree for base: `../casebrain-hub-pr65-base-wt` (detached `cc7e6bb20`), `node_modules` junctioned to branch install.

## Base-versus-branch results

| Command | Base (`cc7e6bb20`) | Branch (pre-fix) | Branch (after programme remediation) |
|---------|--------------------|--------------------|--------------------------------------|
| `npm run lint` | EXIT 0 | EXIT 0 | EXIT 0 |
| `npm run typecheck` | EXIT 2 · **47** `error TS` | EXIT 1 · **47+ programme extras** | EXIT 1 · **47** `error TS` (programme extras cleared; matches base count) |
| `npm run build` | EXIT 1 — webpack **compiled**; failed **collecting page data** for `/api/billing/invoices` (env/runtime) | EXIT 1 — **`node:crypto` UnhandledSchemeError** via `solicitor-output-gate` → `ClientExplanationPanel` | EXIT **0** — production build succeeds |
| `npx vitest run` | ~16 failed / ~113 passed assertion tests; many `scripts/*.test.ts` “No test suite found” | 15 failed / 114 passed assertion tests; same script-suite pattern | Same 15 assertion failures (pre-existing / date-sensitive); Phase 6/7 **tsx** contracts still PASS |
| Playwright E2E | Not run | Not run | Not run |

Raw logs: `artifacts/casebrain-qa/integrity-programme/baseline-attr/`.

## Failure attribution

### A. Introduced by PR #65 (Phases 2–7) — **fixed in this remediation**

| Failure | Evidence | First-bad commit (bisectable) | Fix |
|---------|----------|-------------------------------|-----|
| `node:crypto` UnhandledSchemeError in client bundle | Import trace: `node:crypto` → `lib/criminal/solicitor-output-gate.ts` → `ClientExplanationPanel.tsx` → `CaseControlRoom` → `CriminalCaseView`. Base build compiles past webpack client graph. | Gate landed with integrity work; `node:crypto` present from Phase 2 containment (`1d62f8bb7`) and later phases; client path via gate. | Browser-safe `lib/shared/sha256-hex.ts` (byte-identical SHA-256 to Node for UTF-8); used by gate, canonical fingerprint, extraction provenance IDs. |
| TS: `reliability: "unknown"` not assignable to `EvidenceReliability` | Programme adapters / boundary / scripts | Phase 3–7 programme files | Use `needs_review` |
| TS: `/s` regex flag in `solicitor-sentence-composer.ts` | Target &lt; es2018 | Integrity sentence composer | Remove `/s` (pattern already newline-aware) |
| TS: incomplete `DisclosureChaseItem` in Phase 3/6 adapters | Adapter typed to full chase brief | Phase 3 | Loosen adapter chase input to label/status partials |
| TS: dashboard input casts / null hits map in Phase 6 scripts | Programme scripts | Phase 6 | `as unknown as` + null-safe hit type |
| TS: duplicate `schemaVersion` overwrite in Phase 3 script | Programme script | Phase 3 | Drop redundant key before spread |

### B. Pre-existing on base (not introduced by PR #65)

| Cluster | Examples | Notes |
|---------|----------|-------|
| `lib/eval/**` type drift | `bad-output-memory` missing; `gatePresentationLine` missing; SimulatorV2TruthKey fields; TrapBlueprint; LineSourceProofRecord | Same on base typecheck |
| Demo/gold/messy proof scripts | `build-demo-audit-*.ts`, `run-messy-pdf-proof-v*.ts`, `seed-evidence-state-audit-cases.ts` | Same on base |
| Vitest assertion failures (15) | See table below | Present on base (~16); mostly calendar / copy-string drift |
| Vitest “No test suite found” for `scripts/*.test.ts` | assert/tsx scripts pulled into vitest include | Environment/config — not assertion regressions |
| Base `next build` page-data failure | `/api/billing/invoices` after successful compile | Env/config dependent (Stripe/Clerk secrets at collect time) |

### Exact failing Vitest tests (branch = same class as base)

1. `lib/core/__tests__/limitation.test.ts` › calculateLimitation › should calculate 3-year limitation for PI cases  
2. `lib/core/__tests__/limitation.test.ts` › calculateLimitation › should use date of knowledge if provided  
3. `lib/core/__tests__/limitation.test.ts` › calculateLimitation › should set severity based on days remaining  
4. `lib/core/__tests__/riskCopy.test.ts` › riskCopy › limitation › should build messages with limitation date  
5. `lib/criminal/__tests__/criminal-purity.test.ts` › Criminal purity + probability gating › probabilities are suppressed when completeness is low  
6–13. `lib/criminal/__tests__/structured-extractor.test.ts` › validateCourtName › (8 cases)  
14. `lib/housing/__tests__/awaabs-monitor.test.ts` › Awaab's Law Monitor › should calculate investigation deadline for social landlord  
15. `lib/housing/__tests__/supervision-pack.test.ts` › Supervision Pack Generator › should include disclaimer in all outputs  

**Attribution:** pre-existing / time-dependent (limitation dates anchored to 2024–2025 wall-clock; today is 2026-07-21) or copy-string mismatch (`does not constitute legal advice` vs `not legal advice`). **Not** introduced by Phases 4–7.

### C. Environment / configuration dependent

- Base build collect-page-data for billing invoices  
- Full Playwright E2E not executed  
- Vitest discovering non-vitest `scripts/*.test.ts` files  

### D. Unattributed

None remaining for the reported TypeScript / webpack client-boundary / 15 vitest assertion failures after comparison.

## Remediation register (verified pre-existing)

See `remediation-register-preexisting.json` and summary below. **Do not weaken tests** to greenwash; schedule proper fixes.

| ID | Priority | Item | Proposed owner phase |
|----|----------|------|----------------------|
| PRE-TS-EVAL | P1 | Repair `lib/eval/**` type drift / missing modules | Outside integrity Phases 8–11 or parallel tech-debt |
| PRE-TS-SCRIPTS | P2 | Demo/gold/messy proof script types | Tech-debt |
| PRE-VITEST-DATE | P1 | Freeze clocks in limitation/Awaab tests | Tech-debt (before claiming CI green) |
| PRE-VITEST-COPY | P2 | Align disclaimer / purity / court-name expectations with product copy | Tech-debt |
| PRE-VITEST-CONFIG | P2 | Exclude or adapt `scripts/*.test.ts` from vitest include (run via tsx) | Tooling |
| PRE-BUILD-ENV | P1 | Make `/api/billing/invoices` collect-safe without secrets (or document required env for build) | Platform |
| PRE-E2E | P1 | Run full Playwright and attribute | After CI baseline green |

## Proposed remediation order (programme continues)

1. ~~Attribute base vs branch~~ **DONE**  
2. ~~Fix PR-introduced regressions + `node:crypto` client boundary~~ **DONE**  
3. Record / schedule pre-existing register (**this checkpoint**)  
4. Optionally restore fuller green baseline (PRE-* items) — **not blocking Phase 8 acknowledgement**, but blocking any “production-ready / 100% complete” claim  
5. Continue **Phase 8** only after human ack of this checkpoint  
6. Phases 9–11 → final full-app audit  

## Files changed in this remediation

- `lib/shared/sha256-hex.ts` (new)  
- `lib/criminal/solicitor-output-gate.ts`  
- `lib/criminal/canonical-matter-state/build.ts`  
- `lib/criminal/canonical-matter-state/adapters.ts`  
- `lib/criminal/extraction-provenance-boundary/enforce.ts`  
- `lib/criminal/solicitor-sentence-composer.ts`  
- `scripts/integrity-programme/phase3-canonical-and-corpus.ts`  
- `scripts/integrity-programme/phase4-resolve-unresolved.ts`  
- `scripts/integrity-programme/phase6-*.ts` / `phase7-*.ts` (reliability / casts)  
- `README.md` (remove unsupported production-ready claim)  
- `docs/integrity-programme/*` + `artifacts/.../baseline-attr/*`

## Ledger impact

**None.** Prior **72/28** remain `copyable_exportable_rule_firing_occurrence`; current **42/55** remain `per_string_copyable_hit`. SHA-256 digests verified byte-identical to Node `createHash('sha256')` for sample UTF-8 inputs — fingerprint / diagnostic hashes unchanged.

## Phase 7 checkpoint impact

- Scoped Phase 7 contracts **still PASS** (`phase7-extraction-provenance.test.ts`, Phase 6 surface contracts).  
- Phase 7 remains **COMPLETE (not corpus PASS)**; programme pause is for **repo baseline trust**, not invalidation of Phase 7 evidence.  
- Next work after ack: Phase 8 hearing/time logic.

## Explicit non-goals

No merge. No deploy. No Phase 8 until ack. No test weakening / suite exclusions / suppressions solely to obtain green. No whole-programme PASS claim.
