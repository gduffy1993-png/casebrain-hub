# Master Assurance Auditor V2 — Expansion Specification

**Status:** STOP FOR CODEX REVIEW (registry/spec only)  
**Registry:** `maa-control-registry@v2.1.0` / `2.1.0`  
**Baseline commit:** `7066cb6fe740ef43c98cc0b683ef04f8a7d0b127`  
**PR:** #65  
**Programme PASS supported:** false  
**Stage 150 started:** false  

## Purpose

Expand the accepted Stage-20/50 Master Assurance Auditor (24 lanes) into the **final comprehensive assurance registry** for Stage 150, 300, 3,000, diverse corpus, heavy bundles, authenticated browser testing and human gold review.

This work unit is **additive and versioned**. It does **not**:

- start Stage 150;
- alter frozen samples, runs, findings, migrations or evidence;
- repair CaseBrain application behaviour;
- commit, push, merge, deploy or claim programme PASS.

## Layout

| Layer | Path |
|-------|------|
| V2 library | `lib/eval/master-assurance-auditor/v2/` |
| V1 (preserved) | `lib/eval/master-assurance-auditor/` (unchanged semantics) |
| Spec | `docs/integrity-programme/master-assurance-auditor-v2-spec.md` |
| Protocols | `docs/integrity-programme/master-assurance-auditor-v2/` |
| Registry artefacts | `artifacts/casebrain-qa/assurance/master-auditor-v2/` |
| Contracts | `scripts/master-assurance-auditor-v2-registry-contracts.test.ts` |
| Emit | `scripts/assurance/emit-maa-v2-registry.ts` |

## Invariants

1. All **24 V1 control IDs** preserved (`MAA-*`) at **controlVersion `1.0.0`**.
2. All **24 V1 lane IDs** preserved (`LANE-01`…`LANE-24`).
3. Historical finding interpretation remains `controlId@1.0.0` — unchanged.
4. Allowed verdicts only: `pass` | `defect` | `unresolved` | `containment` | `not_exercised`.
5. Missing evidence, missing tools or missing human judgment → `unresolved` or `not_exercised` — **never** `pass`.
6. Unavailable exits → `not_exercised` — **never** `pass`.
7. No automated control may impersonate a real solicitor, prosecutor, judge or human reviewer.
8. No certification / ISO / SOC 2 / pen-test / legal-approval claim from this registry alone.
9. `knownSafetyCriticalFn` remains **null** until supported by completed human review.
10. Overlapping controls must declare an explicit relationship (`refines` | `extends` | `sibling` | `depends_on` | `roadmap_only` | `preserves`).

## Control contract (every control)

Each control declares: permanent control ID; family and subfamily; purpose; risk addressed; required inputs; exact evidence required; positive and negative examples; verdict rules; allowed verdicts; false-positive risks; known blind spots; applicable case types; procedural stages; audiences; exits; authority (`automated` | `browser` | `security_tool` | `human_review`); activation stage; minimum denominator; blocking severity; remediation ownership; receipt schema; version; effective date.

## Families A–AF

| Code | Family | Primary activation |
|------|--------|--------------------|
| V1 | Preserved 24 lanes | 50 (historical 20/50) |
| SRC | A Source integrity | 150 / heavy_bundle |
| BND | B Bundle completeness | 150 |
| FID | C Exact source fidelity | 150 |
| LSL | D Legal-state language | 150 |
| CHG | E Charge and provision | 150 |
| EVS | F Evidence state and reliability | 150 |
| ATR | G Attribution / multi-defendant | 150 |
| CHR | H Chronology, numbers, deadlines | 150 |
| LEG | I Legal currency and authority | 150 / 300 |
| PRC | J Procedural-stage awareness | 150 / 300 |
| CHS | K Chase quality | 150 |
| WRD | L Professional wording | 150 |
| AUD | M Audience separation | 150 |
| XEX | N Warning attachment / all-exit | 150 |
| PRI | O Completeness, priority, load | 150 / browser |
| CTX | P Contradiction priority | 150 |
| DEF | Q Defence-opportunity coverage | 150 |
| XPP | R Cross-perspective panel | 150 |
| BIA | S Bias, fairness, language | 300 |
| PRV | T Privilege, confidentiality, privacy | 300 / browser / roadmap |
| SEC | U Security and adversarial input | 300 / browser / roadmap |
| IAM | V Identity, SSO, access control | roadmap / browser |
| RES | W Data residency and subprocessors | roadmap |
| OPS | X Operational resilience | 300 / roadmap |
| HVY | Y Large-bundle stress | heavy_bundle |
| BRW | Z Authenticated workflow | browser |
| DSN | AA Design and usability | browser |
| A11Y | AB Accessibility | browser |
| PERF | AC Performance | browser / heavy_bundle / roadmap |
| HUM | AD Human gold and recall | human |
| VDR | AE Version drift and reproducibility | 150 |
| EXT | AF External assurance roadmap | roadmap (non-PASS) |

Exact control lists: `artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json`.

## Registry version

`maa-control-registry@v2.1.0` / `2.1.0` — adds mandatory execution-readiness fields (`implementationStatus`, `detectorEntrypoint`, `receiptValidator`, `positiveNegativeContract`, `exercisePrerequisites`, `currentlyRunnable`, `unavailableReason`, `readinessEvidence`, `historicalActivationStages`, `currentActivationStage`).

Never mark a control **implemented** merely because it has a registry entry or schema contract.

## Stage activation (historical vs future)

See `control-stage-activation-matrix.json`:

- **historicalExecution.stage20** — all **24** V1 controls (historically exercised); evidence preserved under `master-auditor-v1/maa-20-*`.
- **futureActivation** — where controls are scheduled next (V1 → `50`; additive V2 → tagged stages).
- Future Stage **20** count may be **0**; that must not be read as “Stage 20 never ran”.

## Execution-readiness artefacts

Under `artifacts/casebrain-qa/assurance/master-auditor-v2/`:

- `v2-control-execution-status.json`
- `stage20-historical-activation-correction.json`
- `stage150-detector-implementation-map.json`
- `esa-population-input-capability-audit.json`
- `stage150-control-exerciseability.json`
- `stage150-minimum-denominators.json`
- `v2-control-relationship-audit.json`
- `stage150-execution-readiness-gate.json`
- `execution-readiness-report.md`

Commands:

```bash
npx tsx scripts/assurance/emit-maa-v2-execution-readiness.ts
npx tsx --test scripts/maa-v2-execution-readiness-contracts.test.ts
npx tsx --test scripts/master-assurance-auditor-v2-registry-contracts.test.ts
```

## Related documents

- `master-assurance-auditor-v2/cross-perspective-protocol.md`
- `master-assurance-auditor-v2/solicitor-output-quality-suite.md`
- `master-assurance-auditor-v2/security-and-external-assurance-roadmap.md`
- `v1-to-v2-registry-migration.json`
- V1 spec (preserved): `master-assurance-auditor-spec.md`

## Commands (registry only)

```bash
npx tsx scripts/assurance/emit-maa-v2-registry.ts
npx tsx --test scripts/master-assurance-auditor-v2-registry-contracts.test.ts
npm run build
```

## Non-goals (this work unit)

- No Stage 150+ execution
- No CaseBrain application behaviour changes
- No mutation of Brain 1, Guardian, ledger, Phase 11, Malik evidence, or frozen ESA packets
- No commit / push / merge / deploy / programme PASS
