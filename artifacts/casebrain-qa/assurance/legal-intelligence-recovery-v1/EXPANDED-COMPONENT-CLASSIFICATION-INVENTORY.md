# Expanded Component Classification Inventory

**Programme:** Legal Intelligence Recovery V1  
**Baseline product HEAD:** `170bfcee48c5e3777df6c3dda588102e2c9928ce`  
**Recovery branch:** `programme/legal-intelligence-recovery-v1`  
**Recovery worktree:** `C:\Users\gduff\casebrain-hub-wt-legal-intelligence-recovery-v1`  
**Case Moves source:** `6de1c4c249cec7fcf688c05293e0b09f7c3d81b4` (`feature/case-moves-engine`)  
**Generated:** 2026-08-20

Classification legend: `PRESENT_ACTIVE` | `PRESENT_BUT_GATED` | `PRESENT_BUT_NEUTERED` | `PRESENT_BUT_BYPASSED` | `DELETED_BUT_RECOVERABLE` | `REPLACED_BY_NEW_IMPLEMENTATION` | `DUPLICATE` | `UNSAFE_TRUTH_AUTHORITY` | `OBSOLETE`

---

## Summary counts

| Class | Count |
|-------|------:|
| PRESENT_ACTIVE | 9 |
| PRESENT_BUT_GATED | 4 |
| PRESENT_BUT_NEUTERED | 2 |
| PRESENT_BUT_BYPASSED | 2 |
| DELETED_BUT_RECOVERABLE | 1 |
| REPLACED_BY_NEW_IMPLEMENTATION | 1 |
| DUPLICATE | 1 |
| UNSAFE_TRUTH_AUTHORITY (behaviour closed; knowledge retained as advisory) | 3 |
| OBSOLETE | 0 |
| **Total inventoried** | **23** |

Net finding (expanded beyond forensic map): richness remains ~70% gated/neutered-in-place, ~20% orphaned/unmerged (now partly restored as advisory), ~10% intentional demotion of unsafe stock assertions. No mass deletion of legal engines found.

---

## Inventory

| ID | Component | Class | Notes / restore action |
|----|-----------|-------|------------------------|
| C1 | `lib/criminal/case-moves-engine.ts` @ `6de1c4c24` | **DELETED_BUT_RECOVERABLE** → restored | Unmerged advisory engine; restored on recovery branch as library + `PRACTITIONER_CONSIDERATION` adapter |
| C2 | `strategy-fight-engine.ts` + generators | **PRESENT_BUT_BYPASSED** | Orphaned vs runtime `strategy-fight-generators.ts`; valuable templates re-homed via `fight-engine-advisory.ts` |
| C2b | `strategy-fight-generators.ts` | **PRESENT_ACTIVE** / **REPLACED_BY_NEW_IMPLEMENTATION** (vs C2) | Current runtime fight path |
| C3 | `brief-plan/playbooks.ts` + `build-brief-plan.ts` | **PRESENT_BUT_NEUTERED** | Claim-truth wording demotion retained; consideration language restored in offence-family layer |
| C4 | `strategy-battleboard.ts` | **PRESENT_BUT_GATED** | Keep gates; route intelligence preserved |
| C5 | `chase-source-gate.ts` | **PRESENT_ACTIVE** | Keep; advisory channel separate |
| C6 | `solicitor-output-gate.ts` | **PRESENT_BUT_GATED** | Fail-closed for fact exits; advisory labelled separately |
| C7 | Canonical evidence authority / auth guard | **PRESENT_ACTIVE** | **Do not reopen**; advisory overlays only |
| C8 | `get-aggressive-defense.ts` | **PRESENT_ACTIVE** | Ensure claim-class labelling when surfaced |
| C9 | `lib/strategic/move-sequencing/*` | **PRESENT_ACTIVE** | Behind canonical |
| C10 | `docs/REAL_LIFE_STRATEGIES_AND_OUTCOMES_BY_CHARGE.md` | **PRESENT_BUT_BYPASSED** | Docs-only; consumed via `real-life-strategies-advisory.ts` |
| C11 | Offence-family concept registry | **PRESENT_ACTIVE** | Containment allow-list |
| C12 | Claim support taxonomy | **PRESENT_ACTIVE** | Preferred restore pattern — used throughout |
| C13 | Defence-plan chat integrity | **PRESENT_BUT_GATED** | Keep fail-closed for fact claims |
| C14 | `demo-presentation-polish.ts` | **PRESENT_ACTIVE** | Prior false-loss already fixed |
| C15 | `playbooks-by-offence.ts` | **PRESENT_ACTIVE** | Key disclosure lists — must not auto-chase |
| C16 | `strategy-output/defence-strategy.ts` | **PRESENT_ACTIVE** | Large strategy corpus intact |
| C17 | `strategy-output/route-playbooks.ts` | **PRESENT_ACTIVE** | Intact |
| C18 | Affray→self-defence-live stock rule | **UNSAFE_TRUTH_AUTHORITY** | Knowledge split: consideration only |
| C19 | CAD→999 outstanding stock rule | **UNSAFE_TRUTH_AUTHORITY** | Knowledge split: CAD check consideration |
| C20 | Offence→BWV missing stock rule | **UNSAFE_TRUTH_AUTHORITY** | Knowledge split: BWV investigative consideration |
| C21 | `lib/criminal/legal-intelligence/*` (new) | **PRESENT_ACTIVE** (recovery) | Advisory orchestrator + firewall |
| C22 | Duplicate fight-engine stack | **DUPLICATE** | C2 vs C2b; advisory prefers filtered C2 templates |

---

## Useful knowledge recovered from the “missing” ~30%

1. **Case Moves Engine** — full deterministic move library (disclosure, ID, interview, self-defence framing, lawful excuse, forensic/phone, no-safe-strategy) with `unsupportedAssumptions`.
2. **Fight-engine attack paths** — identification, PACE/custody, medical/causation, disclosure request packs as labelled hypotheses.
3. **Real-life strategies pack** — charge-category strategy menus as considerations.
4. **Offence-family split knowledge** — self-defence / CAD / BWV / medical / clip-master / interview modality as considerations without evidence-state mutation.
5. **Safe promotion path** — consideration → SOURCE_FACT/SAFE_DERIVATION only with explicit source support.

---

## Explicit non-restores

- Competing factual truth engines
- Chase-derived canonical rehydration
- Compound CCTV/BWV/999 authorisation from offence shape
- “Self-defence remains live” as asserted case theory
- Auto-promotion of advisory into CPS chase counters
