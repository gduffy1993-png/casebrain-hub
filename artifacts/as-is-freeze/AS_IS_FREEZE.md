# App as-is freeze — 29 August 2026

Restore point **before** the solicitor fact-record cutover.

Do not treat this as a programme PASS. It is a snapshot of master so we can go back.

## Git

| Field | Value |
|--------|--------|
| Branch frozen | `master` |
| Commit | `55543f604e06016b85291dcf992153bd428f94f8` |
| Message | programme: criminal-defence integrity Phase 0 discovery (preview — do not merge) (#65) |
| How to restore the whole repo | `git checkout 55543f604e06016b85291dcf992153bd428f94f8` |
| How to restore only the packed files | extract `casebrain-hub-as-is-55543f60-solicitor-surfaces.tgz` |

## Tarball

`artifacts/as-is-freeze/casebrain-hub-as-is-55543f60-solicitor-surfaces.tgz`

SHA-256: `52b4f9548f3cea5eb6db636cbb758d02f1b28c503335d80fa4aea355887c0bf5`

Packed paths (solicitor mouths + integrity stack + chat route):

- `lib/criminal/solicitor-output-integrity.ts`
- `lib/criminal/solicitor-output-gate.ts`
- `lib/criminal/solicitor-matter-state.ts`
- `lib/criminal/solicitor-sentence-composer.ts`
- `lib/criminal/solicitor-offence-family.ts`
- `lib/criminal/solicitor-hearing-status.ts`
- `lib/criminal/solicitor-visible-materialise.ts`
- `lib/criminal/solicitor-surface-gate-registry.ts`
- `lib/criminal/canonical-matter-state/`
- `lib/criminal/shared-solicitor-validator.ts`
- `lib/criminal/integrity-blocked-consumer.ts`
- `components/criminal/workflow/useMatterBrief.ts`
- `components/criminal/workflow/PilotSummaryView.tsx`
- `components/criminal/workflow/PilotMatterDesk.tsx`
- `components/criminal/five-answers/FiveAnswersView.tsx`
- `components/criminal/five-answers/OverviewSnapshotBoxes.tsx`
- `app/api/criminal/[caseId]/defence-plan-chat/route.ts`
- `docs/integrity-programme/README.md`
- `docs/solicitor-output-integrity-qa.md`

## How the app spoke facts at this SHA

- **Canonical matter state v1.1.0** already owned counts / fingerprint for migrated tabs.
- **Integrity gate** blocked Copy and deep drawers when family / sentence / state failed. Landing cards could still talk.
- **Chat** (`defence-plan-chat`) used a snapshot + a large prompt. It was gated after the fact, not written from the same slots as the desk.
- **Sexual offences** were mapped to the violence family in `solicitor-offence-family.ts` so a gate could go green.
- Workstream B was still blocked. Programme never claimed corpus PASS.

## What the next commits on this branch are allowed to change

Take the pen away: one `SolicitorFactRecord`, one renderer, desk and chat read the same slots. Unknown is a value. Restore this freeze if that cutover is wrong.
