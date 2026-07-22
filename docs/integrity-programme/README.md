# Criminal-defence integrity, corpus & UX programme

Authoritative scope: user programme brief (Workstream A then B).  

**Rules:** branch-only · no master push/merge/deploy · no production data · no case-ID patches · no fixture mutation during discovery · preview PRs only · small commits.

## Progress

| Checkpoint | Status | Artefacts |
|------------|--------|-----------|
| Phase 0 — discovery & baseline | COMPLETE (not PASS) | `docs/integrity-programme/phase-0-checkpoint.md` |
| Phase 1 — surface inventory | COMPLETE (not PASS) | `docs/integrity-programme/phase-1-checkpoint.md` |
| Phase 2 — fail-closed containment | COMPLETE (not corpus PASS) | `docs/integrity-programme/phase-2-checkpoint.md` |
| Phase 3 — canonical model + dual-lane | COMPLETE (not corpus PASS) | `docs/integrity-programme/phase-3-checkpoint.md` |
| Phase 4 — offence-family concept registry | UNRESOLVED ITEMS DISPOSITIONED (not corpus PASS) | `docs/integrity-programme/phase-4-checkpoint.md` |
| Phase 5 — structured composer repair | COMPLETE (not corpus PASS) | `docs/integrity-programme/phase-5-checkpoint.md` |
| Phase 6 — final validator + canonical migration | CLOSED — LEDGER_BALANCED acknowledged (not corpus PASS) | `docs/integrity-programme/phase-6-checkpoint.md` + `docs/integrity-programme/phase-6-occurrence-ledger-balance.md` |
| Phase 7 — extraction & provenance boundary | COMPLETE (not corpus PASS) | `docs/integrity-programme/phase-7-checkpoint.md` |
| Baseline attribution (pre-Phase 8) | COMPLETE | `docs/integrity-programme/baseline-attribution-checkpoint.md` |
| Phase 8 — hearing and time logic | CLOSED — acknowledged (`eadc2db37`) (not corpus PASS) | `docs/integrity-programme/phase-8-checkpoint.md` |
| Phase 9 — N-case corpus | CLOSED — CORPUS_CONTAINMENT_PASS (`4f44530e1`) | `docs/integrity-programme/phase-9-checkpoint.md` | `docs/integrity-programme/phase-9-checkpoint.md` | `docs/integrity-programme/phase-9-checkpoint.md` | `docs/integrity-programme/phase-9-checkpoint.md` | `docs/integrity-programme/phase-9-checkpoint.md` |
| Phase 10 — mutation & adversarial injection | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` | CLOSED — mutation-containment proof (`a88878867`) | `docs/integrity-programme/phase-10-checkpoint.md` |
| Phase 11 — rendered coverage + gold FP–FN | **REMEDIATION_V6_COMPLETE / AWAITING_HUMAN_GOLD_REVIEW** (v1–v5 preserved; GOLD-11-039 substantively repaired; not a PASS) | `docs/integrity-programme/phase-11-remediation-v6-checkpoint.md` |
| Workstream B | BLOCKED until A gates pass | |

## Preserved work

- Solicitor output integrity gate (copy/deep fail-closed, family helper, sentence composer, matter-state VM, hearing status) cherry-picked onto this branch from `fix/solicitor-output-integrity`.
