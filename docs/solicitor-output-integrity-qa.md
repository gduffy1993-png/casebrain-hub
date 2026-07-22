# Solicitor output integrity — before / after QA

**Branch:** `fix/solicitor-output-integrity`  
**Status:** Preview only — **do not merge** until multi-case drawer/copy inspection passes.  
**Date:** 2026-07-21

## Verdict (Codex-aligned)

| Area | Before | After (this PR) |
|------|--------|-----------------|
| Main five tabs (read-only) | Usable | Unchanged intent — still primary safe surface |
| Copy / export drafts | Partial gates; War Room / export often ungated | Shared integrity forces `canCopy=false` on family / sentence / confidence / state failures |
| Deep drawers | Always expandable | Marked unavailable when integrity fails |
| Offence-family isolation | Ad-hoc polish filters | Shared fail-closed family resolver + wrong-family term rejection |
| Counts | Divergent helpers | Canonical `SolicitorMatterStateVm` (fingerprint) |
| Sentences | Concat / polish only | Composer rejects `\| n \|`, `.|;`, placeholders, truncations |
| Hearing status | Multiple formatters | Shared listed / upcoming / passed / snapshot |

## What shipped

### Temporary safety gating
- `lib/criminal/solicitor-output-integrity.ts` — matter + text integrity result (`canCopy`, `deepDetailAvailable`, banner).
- `lib/criminal/trust/copy-safe.ts` — applies integrity override.
- Deep gates: Overview proof drawer, Court more-detail, Papers deep, Summary full workspace, War Room draft copy, export builder copy.
- `SolicitorDeepDetailGate` UI for unavailable deep output.

### Shared layers
- `solicitor-offence-family.ts` — harassment / violence / drugs / theft / motoring; fail closed when uncertain.
- `solicitor-sentence-composer.ts` — structured integrity assessment.
- `solicitor-matter-state.ts` — one evidence + chase + MG11 VM; alias dedupe.
- `solicitor-hearing-status.ts` — one status formatter.

### Tests
- `scripts/solicitor-output-integrity.test.ts` — wrong-family, incomplete sentences, identical fingerprints, hearing kinds, copy disabled on integrity fail.

## Before (Codex findings)

1. Harassment surfaces could inherit possession / supply / vehicle / defensive-force templates.  
2. Evidence / chase counts disagreed across tabs.  
3. Copyable War Room / export drafts could include raw fragments and wrong-family concepts.  
4. Deep drawers always opened with no integrity prop.  
5. Hearing date could be consistent while status wording drifted.

## After (expected on preview)

1. Wrong-family / malformed / uncertain-family → **copy disabled** + **deep unavailable**.  
2. Tabs that consume `useMatterBrief().matterStateVm` / `outputIntegrity` share one gate.  
3. Draft copy buttons show blocked reason when integrity fails.  
4. Hearing status kind is shared (`upcoming` etc.) for a given ISO + as-of date.

## Preview inspection checklist (required before approval)

For **each** of: harassment (Taylor), drugs/PWITS, violence, theft, mixed-evidence:

- [ ] Overview landing cards only (no wrong-family terms)  
- [ ] Expand Overview proof/audit — either clean or “unavailable”  
- [ ] Court “More detail” + draft Copy buttons  
- [ ] Papers “More papers detail”  
- [ ] Summary copy + “Full summary workspace”  
- [ ] Chase expanded item + CPS/court copy  
- [ ] Assert identical served/referred/missing/incomplete counts where VM is shown  
- [ ] Assert hearing status string agrees Overview ↔ Court ↔ Papers strip  
- [ ] Confirm Copy disabled when any integrity banner is present  

## Explicit non-goals in this PR

- No Brain / chase-core algorithm rewrite.  
- No merge to `master`.  
- Legacy classic StrategyCommitment / DefencePlan copy paths not fully rewired (pilot five-tab path is the containment surface).
