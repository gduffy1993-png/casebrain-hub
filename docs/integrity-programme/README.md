# Criminal-defence integrity, corpus & UX programme

Authoritative scope: user programme brief (Workstream A then B).  

**Rules:** branch-only · no master push/merge/deploy · no production data · no case-ID patches · no fixture mutation during discovery · preview PRs only · small commits.

## Progress

| Checkpoint | Status | Artefacts |
|------------|--------|-----------|
| Phase 0 — discovery & baseline | COMPLETE (not PASS) | `docs/integrity-programme/phase-0-checkpoint.md` |
| Phase 1 — surface inventory | PENDING | |
| Phase 2 — fail-closed containment | PARTIAL (preserved from integrity gate) | `lib/criminal/solicitor-output-integrity.ts` |
| Phases 3–11 | PENDING | |
| Workstream B | BLOCKED until A gates pass | |

## Preserved work

- Solicitor output integrity gate (copy/deep fail-closed, family helper, sentence composer, matter-state VM, hearing status) cherry-picked onto this branch from `fix/solicitor-output-integrity`.
