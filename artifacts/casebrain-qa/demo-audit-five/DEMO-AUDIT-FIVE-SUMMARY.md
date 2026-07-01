# Demo audit five — PDF-backed proof pack

Five realistic fictional prosecution bundles with served and outstanding material, run through the real CaseBrain H5 builders and line-source proof pipeline.

## Scope statement

- **Brain/core changes:** None — eval/demo-audit presentation polish (`lib/eval/demo-audit-packs/presentation-polish.ts`), truth-map routing (`expand-truth-map-rows.ts`), extended `filterBundleFamilyWarnings`, and optional `splitPages` on `buildPdfBackedCaseArtifacts`.
- **Audit/proof only:** Yes — artifacts under `artifacts/evidence-state-audit-local/cases/demo-audit-*` and `artifacts/casebrain-qa/demo-audit-five/`.
- **App presentation labels:** Unchanged — no UI/routing/demo-polish edits in this pass.

## Summary

| Case | Pages | PDF+text | FAIL | Case wrong-family | Generic | Ready |
|------|------:|---------:|-----:|------------------:|--------:|:-----:|
| 01-phone-harassment | 11 | 65 | 0 | 0 | 0 | yes |
| 02-cctv-stills | 9 | 55 | 0 | 0 | 0 | yes |
| 03-bwv-custody | 7 | 74 | 0 | 0 | 0 | yes |
| 04-co-def-interview | 8 | 42 | 0 | 0 | 0 | yes |
| 05-encro-attribution | 9 | 59 | 0 | 0 | 0 | yes |

**Ready for Ged/Codex review:** 5/5 (scorecard blockers are intentional audit signals, not build failures)

## Per-case notes

- **demo-audit-01-phone-harassment**: Truth map: screenshot served, extraction summary served, download/subscriber missing. Chase: human labels with MG6C anchors. Court line cites MG6C digital gaps.
- **demo-audit-02-cctv-stills**: Truth map: stills served, master footage/continuity missing. No CCTV-proves DNO blocking. Chase: master footage, export, continuity.
- **demo-audit-03-bwv-custody**: Truth map: custody extract served (partial), BWV referred_only, interview/PACE missing. 74 pdf+text proof lines.
- **demo-audit-04-co-def-interview**: Truth map: co-def interview segregated, target defendant interview missing. Chase: target interview audio/transcript.
- **demo-audit-05-encro-attribution**: Truth map: message extracts served, handle attribution report missing. Chase anchored to MG6C/ENC lines.

## Per-case scorecards

- [DA-01 Riley Moss — phone harassment / screenshots served](./demo-audit-01-phone-harassment/SCORECARD.md)
- [DA-02 Devon Walsh — CCTV stills served / master footage missing](./demo-audit-02-cctv-stills/SCORECARD.md)
- [DA-03 Casey Fry — BWV referred / custody extract only](./demo-audit-03-bwv-custody/SCORECARD.md)
- [DA-04 Morgan Reid — co-defendant interview served / target interview missing](./demo-audit-04-co-def-interview/SCORECARD.md)
- [DA-05 Liam Craft — Encro / county-lines attribution gap](./demo-audit-05-encro-attribution/SCORECARD.md)

## Verification checklist (15 points)

1. Overview truth map matches PDF bundle content — checked per scorecard truth map rows.
2. Proof packet got-right backed by PDF page/source — see `SOLICITOR-PROOF-PACKET.md` per case.
3. Court tab case-specific — see `court-tab.json`; no cross-family imports expected.
4. CPS Chase human labels — vague MG6 labels counted in scorecard.
5. Client Summary plain English — see `client-summary.json`.
6. File tab/source view — `file-source-view.json` + `bundle.pdf`.
7. Key lines page-backed or marked review — proof chain coverage in `casebrain-output.json`.
8. Unsupported/overstrong visible in proof report — `line-by-line-proof.md`.
9–12. Blocked false-served guards / co-def segregation / wrong-family — metrics in scorecards.
13. No banned PDF wording — enforced at build.
14–15. Bundles contain both served and missing material — see key served/missing lists.

Generated: 2026-07-01T10:42:48.034Z
