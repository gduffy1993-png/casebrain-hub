# Session snapshot — 12 May 2026

## Goal (Pack A / Pack B)

- **Pack A:** Northshire-style **40-pack** stays **frozen** — regression/stability benchmark only (`docs/PACK_A_AND_PACK_B.md`).
- **Pack B:** Generalisation benchmark — generic criminal wording, CB-TEST-style bundles, no dependence on Northshire-only hooks where the bundle already has charge, MG5, MG6, interview, and exhibits.

## Where we are

- **Routing / grounding** in `app/api/criminal/[caseId]/defence-plan-chat/route.ts` was broadened so golden **Q1, Q3, Q7–Q10** and the eval **grounding gate** tolerate **generic** headings and signals while keeping **strict_mg6 / strict_interview / strict_exhibit** behaviour for Pack A-style bundles.
- **CB-TEST PDFs** (workspace PDFs `CB-TEST-2026-0001` … `0010`) were analysed via extracted text: section headers use **underscores** (e.g. `MG6_DISCLOSURE_SCHEDULE`, `INTERVIEW_SUMMARY`, `EXHIBIT_LIST`), and **pdf-parse** output often has **no pipe (`|`) characters** in the MG6 table (flattened `CategoryServed…None apparent` lines). That combination explained false fallbacks even when the PDF “looked” fine.
- **`npx tsc --noEmit`** was run successfully after the changes below.
- **Golden Sweep 10×5** on Pack B should be **re-run locally** to measure pass rate and fallback counts vs Pack A regression.

## Changes made (this thread — eval / Pack B / CB-TEST)

### New

- **`lib/mg6-schedule-parse.ts`** — Shared MG6 schedule extraction: **pipe tables** (existing behaviour) plus **flattened** row heuristics when the slice is a real MG6 section and there are no pipes (CB-TEST / PDF text loss).
- **`docs/PACK_A_AND_PACK_B.md`** — Documents frozen Pack A vs generalisation Pack B and edit discipline.

### Updated

- **`app/api/criminal/[caseId]/defence-plan-chat/route.ts`**
  - `bundleHasEvalCoreSections` / `passesEvalGroundingGate` / `isGroundedAnswer` — broader **core bundle** and **generic criminal** anchors.
  - **Q1** — `buildStrictPrimaryAllegationAnswer`: more charge heading patterns; order favours tag then generic charge lines; optional colon / merged lines (`Charge wordingOn…`, `Offence(s) as charged…`); fiction tag fallback widened.
  - **Q3** — `GOLDEN_MISSING_EVIDENCE_EXACT_NONE` exact sentence; `isUsableMg6ScheduleForGolden` + explicit MG6 header; uses shared MG6 extract.
  - **Q7–Q10** — deterministic builders use **usable MG6**, **firstDefenceDisputeLine** (incl. `Main factual dispute:`), **extractMg5LeadLineForGolden**, relaxed early exits where appropriate.
  - **MG6 section** regex allows `MG6_*` headers; **interview / MG5 / exhibit** extractors allow `*_SUMMARY`, `*_LIST`, etc.
  - **Primary eval hook** regexes allow **`hookFull…`** style (colon optional / merged).
  - **Fast-eval** slice includes charge wording; tail instructions and Q6 keyword reply less Northshire-specific (`extractMg6AndHeadlinesForFastEval`, `goldenFastEvalBundleTailInstructions`, `buildFastEvalKeywordReply`).
  - **`buildBundleGroundedFallback`** offence line patterns extended.
  - **`extractMg6DisclosureRows`** delegates to **`extractMg6ScheduleRowsFromScope`**.

- **`lib/eval-observability.ts`**
  - **`sliceMg6SectionBody` / `sliceInterviewSectionBody`** — flexible `SECTION: MG6_*` / `INTERVIEW_*` headers.
  - **`fingerprintBundleEvalSources`** — same flexible MG6/interview slice for digests.
  - **`extractMg6PipeTableRows`** — uses shared **`extractMg6ScheduleRowsFromScope`** (pipe + flattened for scoring).
  - **`offenceTagNormalized`** — fallback **`Offence(s) as charged`**.
  - **`primaryEvalHookNormalized`** — merged-hook line support.

## Other modified / untracked files on this branch

The following also appear in `git status` (may be same-day work from other tasks — verify before commit):

| Path | Status |
|------|--------|
| `components/criminal/DefencePlanBox.tsx` | modified |
| `components/eval/GoldenEvalRunner.tsx` | modified |
| `docs/fictional-golden-10/GOLDEN_10_INDEX.md` | modified |
| `lib/eval-golden-sweep.ts` | modified |
| `lib/eval-run-metadata.ts` | modified |
| `lib/eval-sweep-review.ts` | modified |
| `lib/bulk-eval-result-present.ts` | untracked |
| `lib/debug-bundle.ts` | untracked |
| `docs/DEBUG-BUNDLE-ONE-FILE.md` | untracked |
| `docs/GOLDEN_SWEEP_ACCEPTANCE_RUBRIC.md` | untracked |
| `docs/GOLDEN_SWEEP_REGRESSION_LOG.md` | untracked |

## Suggested next steps

1. Re-run **Golden Sweep 10×5 on Pack B** and a **Pack A** regression sweep; compare pass/fail and `*_fallback` routes.
2. **Commit** in logical chunks (e.g. Pack B route + `mg6-schedule-parse` + eval-observability + docs together; eval UI / rubric separately if unrelated).

## Commit (optional)

To persist in git (after review):

```bash
git add app/api/criminal/[caseId]/defence-plan-chat/route.ts lib/mg6-schedule-parse.ts lib/eval-observability.ts docs/PACK_A_AND_PACK_B.md docs/SESSION_2026-05-12_PACK_B_AND_CB_TEST.md
git commit -m "Pack B: CB-TEST section headers, flattened MG6 rows, grounding and golden routes"
```

Add other paths from `git status` if they belong in the same commit.
