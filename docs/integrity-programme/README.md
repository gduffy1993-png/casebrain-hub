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
| Phase 4 — offence-family concept registry | COMPLETE (safe-but-unresolved, not PASS) | `docs/integrity-programme/phase-4-checkpoint.md` |
| Phase 5 — structured composer repair | COMPLETE (not corpus PASS) | `docs/integrity-programme/phase-5-checkpoint.md` |
| Phase 6 — final validator + canonical migration | LEDGER BALANCED — checkpoint open until human ack (not corpus PASS; no Phase 7) | `docs/integrity-programme/phase-6-checkpoint.md` + `docs/integrity-programme/phase-6-occurrence-ledger-balance.md` |
| Phases 7–11 | PENDING | |
| Workstream B | BLOCKED until A gates pass | |

## Preserved work

- Solicitor output integrity gate (copy/deep fail-closed, family helper, sentence composer, matter-state VM, hearing status) cherry-picked onto this branch from `fix/solicitor-output-integrity`.
