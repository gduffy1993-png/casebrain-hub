# EXPORT-LOG FIX NOTES

**Commit:** `3fa12f9d6e7c7aa179d8308f2686e0cc62463f73` — `fix(truth): do not promote export log from CCTV master alone`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Preview (git-linked SHA):** https://casebrain-o0y9c5fq9-gduffy1993-pngs-projects.vercel.app  
**CLI twin:** https://casebrain-psxv1trat-gduffy1993-pngs-projects.vercel.app  

## Root cause (shared transition)

`lib/eval/casebrain-auditor/explanation-fidelity-generate.ts` → `detectCctvStillsVsMaster`

Product path: explanation fidelity → proof map → battleboard/reasoning → pre-hearing readiness blockers (`build-pre-hearing-readiness.ts` formats `{label} — outstanding or partial on served papers ({sourceSection})`).

Bug: stills+master detector always set issue to  
`CCTV — stills served; full master footage / export log outstanding`  
and always called `safeNextActionForIssue("CCTV export log")`, even when papers never established an export-log exhibit. Trigger also treated `export log.*outstanding` as a proxy for master.

Not Arden-specific. Robbery chase pack already source-gated export-log actions in `pilot-workflow.ts` (`PROFILE_SOURCE_SUPPORT_RULES`); residual was readiness WHY only.

## Fix

- Detect master outstanding and export-log presence separately.
- Include “export log” in issue / next-action / do-not-overstate **only** when `/\bexport\s+log\b/i` is in source.
- Keep stills-vs-master pressure when master is outstanding without export log.

## Tests

`scripts/f167-surgical-truth-opposite-direction.test.ts` section F:

- Arden snippet → missing-material issues match stills/master, **no** export log.
- Arden + `CCTV export log outstanding.` → export log **still** surfaces.

Prior sections A–E (CAD, phone, interview, chase export-log gate) unchanged — PASS.

## Live proof (Arden `99090c69-5d78-41e3-946d-119b4bc335ba`)

| Surface | BEFORE (`02d912547…`) | AFTER (`3fa12f9d6…`) |
|---------|----------------------|----------------------|
| Court WHY | `… master footage / export log outstanding` | `… master footage outstanding` |
| Papers / Client WHY | same FP | same fix |
| Chase export-log card | absent (already TN) | absent |
| CCTV master outstanding | present | present |
| ID route | present | present |
| Phone download / interview recording | absent | absent |

Captures: `_live/after-export-log-sha/` (git-linked SHA Preview).

## Opposite-direction live (Ahmed)

Backend Ahmed `ba22e8bb-832c-43b8-8986-20ea5f5bf7c4` shows exhibit provenance text `CCTV/3 CCTV export logshort note` (OCR join) on disclosure chase — export-log exhibit remains visible when papers establish it. Court WHY does not invent an outstanding export-log blocker from master alone (Ahmed pattern is exhibit-note, not Arden stills/master composite). Unit opposite remains the hard gate for “export log outstanding” wording.
