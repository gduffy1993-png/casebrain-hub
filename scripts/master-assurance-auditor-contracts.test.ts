/**
 * Master Assurance Auditor — focused contracts (calibration foundation).
 * Run: npx tsx scripts/master-assurance-auditor-contracts.test.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  ALL_LANE_IDS,
  MASTER_CONTROL_REGISTRY,
  MIGRATION_REGISTER,
  assertFindingsValid,
  buildControlExerciseRecords,
  buildFindingId,
  deriveHumanRateKnowledge,
  deriveSafetyFnKnowledge,
  emitFinding,
  evaluateCalibrationGate,
  isValidReviewedRow,
  listMasterControlIds,
  loadGoldCorpus,
  resolveCorpusForStage,
  runAllControls,
  SEED_KNOWN_FN_REGISTER,
  validateManifestHashes,
  validateMasterFinding,
  validateResume,
  buildInputManifest,
  wordingHash,
  compareEvidenceStates,
  matchCandidateDefect,
  CANDIDATE_DEFECTS_PENDING_SOURCE,
  evidenceUnitsAreDistinct,
  sameEvidenceUnitIdentity,
  servedRowSatisfiesChase,
  confirmUnitBoundContradiction,
  isHonestSiblingServedMissingWording,
  assessDisclaimerCompleteness,
  type HumanDispositionBatch,
  type KnownFnRegister,
  type SavedCaseMaterialisation,
} from "@/lib/eval/master-assurance-auditor";
import { assessSolicitorVisibleBoundaryForSurface } from "@/lib/criminal/solicitor-visible-boundary-profiles";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  ok  ${name}`);
  passed += 1;
}

function baseCase(over: Partial<SavedCaseMaterialisation> & { caseId: string }): SavedCaseMaterialisation {
  return {
    sourceCaseId: null,
    familyLabel: null,
    allegation: "Theft",
    clientLabel: "X",
    surfaces: [
      {
        surfaceId: "truth_map",
        text: "Charge · served · needs_review",
        exitModes: ["view", "copy"],
        canCopy: true,
      },
    ],
    truthExpectations: [],
    truthMapRows: [{ label: "Charge", existence: "served", reliability: "needs_review" }],
    cpsChase: [],
    doNotOverstate: ["guard"],
    inputBundlePath: null,
    packetPath: "mut",
    builtAt: null,
    ...over,
  };
}

async function main() {
  console.log("1 — REGISTRY / MIGRATION");
  await check("24 lanes and 24 controls registered", () => {
    assert.equal(ALL_LANE_IDS.length, 24);
    assert.equal(MASTER_CONTROL_REGISTRY.length, 24);
    assert.equal(listMasterControlIds().length, 24);
  });
  await check("migration register retains rejected generic mid-sentence heuristic", () => {
    assert.ok(MIGRATION_REGISTER.some((m) => m.migrationId === "MIG-019"));
  });

  console.log("\n2 — CORPUS PLAN / STAGE SIZING");
  await check("stage 20 resolves 20 unique gold cases", () => {
    const { resolution, cases } = resolveCorpusForStage({ stage: "20" });
    assert.equal(resolution.refused, false);
    assert.equal(resolution.requiredUniqueCases, 20);
    assert.equal(resolution.uniqueCaseCount, 20);
    assert.equal(cases.length, 20);
    assert.equal(resolution.membership.length, 20);
    assert.equal(new Set(resolution.membership.map((m) => m.caseId)).size, 20);
  });
  await check("stage 50 refuses a 20-case gold corpus", () => {
    const { resolution, cases } = resolveCorpusForStage({
      stage: "50",
      corpusRootOverride: "artifacts/casebrain-qa/gold-manual-proof-set-v1",
    });
    assert.equal(resolution.refused, true);
    assert.ok((resolution.refuseReason ?? "").match(/requires 50|insufficient|not yet binding/i));
    assert.equal(cases.length, 0);
    assert.ok(resolution.uniqueCaseCount < 50);
  });
  await check("duplicate case membership cannot inflate stage count", () => {
    const { resolution } = resolveCorpusForStage({ stage: "20" });
    assert.equal(resolution.denominators.uniqueCases, resolution.membership.length);
    assert.equal(new Set(resolution.membership.map((m) => m.caseId)).size, resolution.membership.length);
  });

  console.log("\n3 — SAFETY FN / HUMAN RATES");
  await check("unknown safety-FN state blocks progression", () => {
    const safety = deriveSafetyFnKnowledge(SEED_KNOWN_FN_REGISTER, null);
    assert.equal(safety.knowledgeState, "unknown");
    assert.equal(safety.knownSafetyCriticalFn, null);
    const gate = evaluateCalibrationGate({
      stage: "50",
      casesProcessed: 50,
      expectedCases: 50,
      crashCount: 0,
      corruptRecordCount: 0,
      manifestValid: true,
      hashesValid: true,
      corpusRefused: false,
      corpusRefuseReason: null,
      controls: MASTER_CONTROL_REGISTRY.map((c) => ({
        controlId: c.id,
        laneId: c.laneId,
        status: "fully_exercised" as const,
        casesApplicable: 50,
        casesFullyExercised: 50,
        casesPartiallyExercised: 0,
        casesNotExercised: 0,
        findingsEmitted: 1,
        passCount: 1,
        defectCount: 0,
        unresolvedCount: 0,
        containmentCount: 0,
        notExercisedFindingCount: 0,
        notExercisedReason: null,
      })),
      findings: [],
      safetyFn: safety,
      humanRates: {
        humanConfirmationRate: 1,
        detectorFalsePositiveRate: 0,
        knowledgeState: "reviewed_samples",
        reviewedSampleCount: 10,
        confirmedDefectCount: 10,
        detectorFalsePositiveCount: 0,
        blankOrUnverifiedCount: 0,
        reviewerIds: ["r1"],
        denominators: { reviewedSamples: 10, dispositionedSamples: 10 },
      },
    });
    assert.equal(gate.allowedToProgress, false);
    assert.match(gate.stopReason ?? "", /unknown/i);
  });
  await check("blank/unverified human reviews do not produce rates", () => {
    const batch: HumanDispositionBatch = {
      schemaVersion: "1.0.0",
      batchId: "b1",
      rows: [
        {
          findingId: "f1",
          textHash: "a",
          disposition: null,
          reviewer: null,
          reviewedAt: null,
          blinded: true,
        },
        {
          findingId: "f2",
          textHash: "b",
          disposition: "confirmed_defect",
          reviewer: null,
          reviewedAt: null,
          blinded: true,
        },
      ],
    };
    const rates = deriveHumanRateKnowledge([batch]);
    assert.equal(rates.knowledgeState, "unavailable");
    assert.equal(rates.humanConfirmationRate, null);
    assert.equal(rates.detectorFalsePositiveRate, null);
    assert.ok(rates.blankOrUnverifiedCount >= 1);
  });
  await check("valid reviewed samples produce correct FP/FN denominators", () => {
    const batch: HumanDispositionBatch = {
      schemaVersion: "1.0.0",
      batchId: "b2",
      rows: [
        {
          findingId: "f1",
          textHash: "a",
          disposition: "confirmed_defect",
          reviewer: "alice",
          reviewedAt: "2026-07-29T00:00:00Z",
          blinded: true,
        },
        {
          findingId: "f2",
          textHash: "b",
          disposition: "detector_false_positive",
          reviewer: "alice",
          reviewedAt: "2026-07-29T00:00:00Z",
          blinded: true,
        },
        {
          findingId: "f3",
          textHash: "c",
          disposition: "detector_false_positive",
          reviewer: "bob",
          reviewedAt: "2026-07-29T00:00:00Z",
          blinded: true,
        },
      ],
    };
    assert.ok(isValidReviewedRow(batch.rows[0]!));
    const rates = deriveHumanRateKnowledge([batch]);
    assert.equal(rates.knowledgeState, "reviewed_samples");
    assert.equal(rates.reviewedSampleCount, 3);
    assert.equal(rates.confirmedDefectCount, 1);
    assert.equal(rates.detectorFalsePositiveCount, 2);
    assert.equal(rates.denominators.reviewedSamples, 3);
    assert.equal(rates.denominators.dispositionedSamples, 3);
    assert.equal(rates.humanConfirmationRate, 1 / 3);
    assert.equal(rates.detectorFalsePositiveRate, 2 / 3);
    assert.deepEqual(rates.reviewerIds.sort(), ["alice", "bob"]);
  });
  await check("reviewed register with open critical FN blocks with count", () => {
    const reg: KnownFnRegister = {
      ...SEED_KNOWN_FN_REGISTER,
      reviewed: true,
      reviewedAt: "2026-07-29T00:00:00Z",
      reviewer: "codex",
    };
    const safety = deriveSafetyFnKnowledge(reg, "x");
    assert.equal(safety.knowledgeState, "reviewed");
    assert.equal(safety.knownSafetyCriticalFn, 1);
  });

  console.log("\n4 — EXERCISE ACCOUNTING");
  await check("not_exercised-only lanes are not reported fully exercised", () => {
    const cases = [baseCase({ caseId: "CASE-A" })];
    const findings = [
      emitFinding({
        controlId: "MAA-LEGAL-CURRENTNESS",
        caseId: "CASE-A",
        surface: "allegation",
        exactWording: "",
        code: "no_citation_signal",
        verdict: "not_exercised",
        plainEnglish: "No citation.",
        expectedProfessionalBehaviour: "Validate when present.",
        rootCauseFamily: "legal_currentness",
        suggestedRemediation: "None.",
        humanReviewRequired: false,
      }),
    ];
    const records = buildControlExerciseRecords({ cases, findings });
    const legal = records.find((r) => r.controlId === "MAA-LEGAL-CURRENTNESS")!;
    assert.equal(legal.status, "not_exercised");
    assert.equal(legal.casesFullyExercised, 0);
    assert.equal(legal.notExercisedFindingCount, 1);
  });

  console.log("\n5 — WORDING SEPARATION");
  await check("actual / expected / source extract cannot be conflated for defects", () => {
    const f = emitFinding({
      controlId: "MAA-EVIDENCE-STATE",
      caseId: "CASE-A",
      surface: "truth_map",
      exactWording: "",
      expectedWording: "full phone download → missing",
      code: "expected_item_absent",
      verdict: "defect",
      plainEnglish: "Expected item absent.",
      expectedProfessionalBehaviour: "Cite actual output.",
      rootCauseFamily: "evidence_state",
      suggestedRemediation: "Unresolved without actual.",
    });
    // emitFinding must demote empty-actual defects to unresolved
    assert.equal(f.verdict, "unresolved");
    assert.equal(f.exactWording, "");
    assert.equal(f.expectedWording, "full phone download → missing");
  });
  await check("runAllControls does not put expected inventory labels in exactWording as defects", () => {
    const cases = [
      baseCase({
        caseId: "CASE-B",
        truthExpectations: [
          {
            evidenceItem: "phantom evidence widget",
            evidenceType: "other",
            correctEvidenceState: "missing",
            chaseNeeded: true,
            safeToRelyOn: false,
            mustNotSay: [],
            sourcePageAnchor: null,
          },
        ],
        truthMapRows: [{ label: "Charge", existence: "served", reliability: "needs_review" }],
      }),
    ];
    const { findings } = runAllControls(cases);
    const absent = findings.filter((f) => f.rootCauseFamily === "evidence_state" && /phantom/i.test(f.expectedWording ?? ""));
    assert.ok(absent.length >= 1);
    for (const f of absent) {
      assert.notEqual(f.verdict, "defect");
      assert.ok(!f.exactWording.toLowerCase().includes("phantom evidence widget"));
      assert.ok((f.expectedWording ?? "").toLowerCase().includes("phantom"));
    }
  });

  console.log("\n6 — FINDING SCHEMA / GOVERNANCE");
  await check("emitFinding leaves human fields blank", () => {
    const f = emitFinding({
      controlId: "MAA-PROVENANCE",
      caseId: "CASE-TEST",
      surface: "view",
      exactWording: "exact page unavailable",
      verdict: "pass",
      plainEnglish: "Unknown page remains unknown.",
      expectedProfessionalBehaviour: "Never synthesise p.1.",
      rootCauseFamily: "provenance",
      suggestedRemediation: "None.",
      humanReviewRequired: false,
    });
    assert.equal(f.humanReviewDisposition, null);
    assert.equal(validateMasterFinding(f).length, 0);
  });
  await check("finding IDs are stable across reruns", () => {
    const a = buildFindingId({
      controlId: "MAA-HALLUCINATION",
      caseId: "CASE-01",
      surface: "court_line",
      wording: "identical wording",
      code: "absolute_proof",
    });
    const b = buildFindingId({
      controlId: "MAA-HALLUCINATION",
      caseId: "CASE-01",
      surface: "court_line",
      wording: "identical wording",
      code: "absolute_proof",
    });
    assert.equal(a, b);
    assert.equal(wordingHash("identical wording"), wordingHash("identical wording"));
  });

  console.log("\n7 — BOUNDARY FP + MUTATIONS");
  await check("bullet/list surface does not revive generic mid-sentence FP", () => {
    const bullet =
      "• Full phone download — missing\n• Subscriber data — missing\n• Screenshots — served";
    const r = assessSolicitorVisibleBoundaryForSurface(bullet, "truth_map");
    assert.equal(r.ok, true, `unexpected issues: ${r.issues.join(",")}`);
  });
  await check("absolute-proof on copyable surface → defect", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-ABS",
        surfaces: [
          {
            surfaceId: "truth_map",
            text: "Guilt is proved on current disclosure.",
            exitModes: ["copy"],
            canCopy: true,
          },
        ],
      }),
    ]);
    assertFindingsValid(findings);
    assert.ok(findings.some((f) => f.controlId === "MAA-HALLUCINATION" && f.verdict === "defect"));
  });
  await check("internal fixture path leak → defect", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-LEAK",
        allegation: "Theft Act 1968",
        surfaces: [
          {
            surfaceId: "case_header",
            text: "Source pack esa (demo-audit-01-phone-harassment)",
            exitModes: ["view", "copy"],
            canCopy: true,
          },
        ],
      }),
    ]);
    assert.ok(findings.some((f) => f.controlId === "MAA-SECURITY-PRIVACY" && f.verdict === "defect"));
  });

  console.log("\n8 — RESUME / MANIFEST");
  await check("resume validates corpus membership and hashes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "maa-resume-"));
    const { resolution, cases } = resolveCorpusForStage({ stage: "20" });
    const manifest = buildInputManifest({
      runId: "tmp",
      stage: "20",
      corpusRoot: "artifacts/casebrain-qa/gold-manual-proof-set-v1",
      cases,
      resolution,
    });
    fs.writeFileSync(path.join(tmp, "INPUT-MANIFEST.json"), JSON.stringify(manifest, null, 2));
    const ok = validateResume({ outDir: tmp, resolution });
    assert.equal(ok.ok, true);
    const hash = validateManifestHashes(manifest);
    assert.equal(hash.ok, true);

    // Tamper membership for same stage
    const tampered = {
      ...resolution,
      membership: resolution.membership.map((m, i) =>
        i === 0 ? { ...m, caseId: "CASE-TAMPERED" } : m,
      ),
    };
    const bad = validateResume({ outDir: tmp, resolution: tampered });
    assert.equal(bad.ok, false);
    assert.match(bad.reason ?? "", /membership/i);
  });

  console.log("\n9 — GOLD LOAD");
  await check("loads 20 gold-manual packets", () => {
    const cases = loadGoldCorpus({ limit: 20 });
    assert.equal(cases.length, 20);
  });

  console.log("\n10 — STAGE 20 GATE STILL STOPS");
  await check("stage 20 never auto-progresses", () => {
    const gate = evaluateCalibrationGate({
      stage: "20",
      casesProcessed: 20,
      expectedCases: 20,
      crashCount: 0,
      corruptRecordCount: 0,
      manifestValid: true,
      hashesValid: true,
      corpusRefused: false,
      corpusRefuseReason: null,
      controls: MASTER_CONTROL_REGISTRY.map((c) => ({
        controlId: c.id,
        laneId: c.laneId,
        status: "fully_exercised" as const,
        casesApplicable: 20,
        casesFullyExercised: 20,
        casesPartiallyExercised: 0,
        casesNotExercised: 0,
        findingsEmitted: 1,
        passCount: 1,
        defectCount: 0,
        unresolvedCount: 0,
        containmentCount: 0,
        notExercisedFindingCount: 0,
        notExercisedReason: null,
      })),
      findings: [],
      safetyFn: {
        knownSafetyCriticalFn: 0,
        knowledgeState: "reviewed",
        registerPath: null,
        entries: [],
      },
      humanRates: {
        humanConfirmationRate: 1,
        detectorFalsePositiveRate: 0,
        knowledgeState: "reviewed_samples",
        reviewedSampleCount: 10,
        confirmedDefectCount: 10,
        detectorFalsePositiveCount: 0,
        blankOrUnverifiedCount: 0,
        reviewerIds: ["r"],
        denominators: { reviewedSamples: 10, dispositionedSamples: 10 },
      },
    });
    assert.equal(gate.allowedToProgress, false);
    assert.match(gate.stopReason ?? "", /CODEX REVIEW/i);
  });

  console.log("\n11 — STATE-DOMAIN EQUIVALENCE");
  await check("raw not_safely_confirmed ≠ incomplete (positive distinction)", () => {
    const r = compareEvidenceStates({
      actualRaw: "not_safely_confirmed",
      expected: "incomplete",
    });
    assert.equal(r.equivalent, false);
    assert.equal(r.reason, "mismatch");
    assert.equal(r.actualRaw, "not_safely_confirmed");
    assert.equal(r.actualDisplay, "not_safely_confirmed");
    assert.equal(r.expectedDisplay, "incomplete");
  });
  await check("NSC matches NSC exactly", () => {
    const r = compareEvidenceStates({
      actualRaw: "not_safely_confirmed",
      expected: "not_safely_confirmed",
    });
    assert.equal(r.equivalent, true);
    assert.equal(r.reason, "exact");
  });
  await check("served vs incomplete remains a mismatch (negative)", () => {
    const r = compareEvidenceStates({ actualRaw: "served", expected: "incomplete" });
    assert.equal(r.equivalent, false);
    assert.equal(r.reason, "mismatch");
  });
  await check("exact incomplete pair is pass via runAllControls", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "CASE-07",
        truthExpectations: [
          {
            evidenceItem: "witness MG11",
            evidenceType: "witness_statement",
            correctEvidenceState: "incomplete",
            chaseNeeded: true,
            safeToRelyOn: false,
            mustNotSay: [],
            sourcePageAnchor: null,
          },
        ],
        truthMapRows: [
          {
            label: "witness MG11",
            existence: "incomplete",
            reliability: "unsafe",
          },
        ],
      }),
    ]);
    const hit = findings.find(
      (f) =>
        f.controlId === "MAA-EVIDENCE-STATE" &&
        (f.code === "state_exact" || f.verdict === "pass"),
    );
    assert.ok(hit, "expected evidence-state pass for exact incomplete");
    assert.equal(hit!.verdict, "pass");
  });
  await check("six retained candidate defects are listed and matchable", () => {
    assert.equal(CANDIDATE_DEFECTS_PENDING_SOURCE.length, 6);
    const m = matchCandidateDefect({
      caseId: "CASE-01",
      expectedItem: "complainant MG11",
      actualExistence: "served",
      expectedState: "incomplete",
    });
    assert.ok(m);
    assert.match(m!.note, /draft complainant MG11/i);
  });

  console.log("\n12 — CROSS-EXIT UNIT BINDING");
  await check("honest extract-served / full-missing is not a contradiction (positive)", () => {
    const text =
      "Per MG6C custody extract is served, BWV is referred only, and full custody record remains outstanding.";
    assert.equal(isHonestSiblingServedMissingWording(text), true);
    const confirmed = confirmUnitBoundContradiction({
      text,
      subject: "Full custody record",
      code: "served_state_contradicted",
      items: [
        { label: "Custody record extract", state: "served" },
        { label: "Full custody record", state: "missing" },
      ],
    });
    assert.equal(confirmed, false);
  });
  await check("same unit served-in-text vs canonical missing is confirmed (negative)", () => {
    const text = "The full custody record is served on the papers.";
    const confirmed = confirmUnitBoundContradiction({
      text,
      subject: "Full custody record",
      code: "served_state_contradicted",
      items: [{ label: "Full custody record", state: "missing" }],
    });
    assert.equal(confirmed, true);
  });
  await check("runAllControls suppresses honest sibling cross-exit FP", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "CASE-02",
        surfaces: [
          {
            surfaceId: "court_lines",
            text: "Record per MG6C that custody extract is served and full custody record is missing.",
            exitModes: ["copy"],
            canCopy: true,
          },
        ],
        truthMapRows: [
          { label: "Custody record extract", existence: "served", reliability: "needs_review" },
          { label: "Full custody record", existence: "missing", reliability: "needs_review" },
        ],
      }),
    ]);
    const defects = findings.filter(
      (f) =>
        f.controlId === "MAA-CROSS-EXIT" &&
        f.verdict === "defect" &&
        /served_state_contradicted|missing_state_contradicted/.test(f.code ?? ""),
    );
    assert.equal(defects.length, 0);
  });

  console.log("\n13 — EVIDENCE-UNIT IDENTITY");
  await check("extract ≠ full; draft ≠ signed; recording ≠ transcript; clip ≠ master (positive)", () => {
    assert.ok(evidenceUnitsAreDistinct("Custody record extract", "Full custody record"));
    assert.ok(evidenceUnitsAreDistinct("Draft complainant MG11", "Final signed MG11"));
    assert.ok(evidenceUnitsAreDistinct("Interview recording", "Interview transcript"));
    assert.ok(evidenceUnitsAreDistinct("CCTV clips", "CCTV master"));
    assert.ok(evidenceUnitsAreDistinct("Message extract", "Full phone download"));
  });
  await check("same-label identity matches (negative distinct)", () => {
    assert.equal(evidenceUnitsAreDistinct("Full custody record", "Full custody record"), false);
    assert.equal(sameEvidenceUnitIdentity("Full custody record", "Full custody record"), true);
  });
  await check("chase for full record not satisfied by served extract (positive)", () => {
    const hit = servedRowSatisfiesChase({
      chaseLabel: "Full custody record",
      servedRows: [
        { label: "Custody record extract", existence: "served" },
      ],
    });
    assert.equal(hit.satisfied, false);
  });
  await check("broad token overlap does not create served_item_chased defect", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "CASE-02",
        truthMapRows: [
          { label: "Custody record extract", existence: "served", reliability: "needs_review" },
          { label: "Full custody record", existence: "missing", reliability: "needs_review" },
        ],
        cpsChase: [
          {
            label: "Full custody record",
            draft: "Please provide Full custody record or confirm why it is not available.",
          },
        ],
      }),
    ]);
    assert.ok(
      !findings.some(
        (f) => f.controlId === "MAA-CROSS-SURFACE" && f.code === "served_item_chased",
      ),
    );
    assert.ok(
      findings.some(
        (f) =>
          f.controlId === "MAA-CROSS-SURFACE" && f.code === "distinct_unit_chase_allowed",
      ),
    );
  });

  console.log("\n14 — FN-INCOMPLETE-DISCLAIMER");
  await check("complete disclaimer → pass", () => {
    const a = assessDisclaimerCompleteness(
      "Summary incomplete.\n[CaseBrain — client-safe summary. Not legal advice. Not for court or CPS use.]",
    );
    assert.equal(a.status, "complete");
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-DISC-OK",
        surfaces: [
          {
            surfaceId: "client_summary",
            text: "Materials are incomplete.\n[CaseBrain — client-safe summary. Draft only. Not for court or CPS use.]",
            exitModes: ["copy"],
            canCopy: true,
          },
        ],
      }),
    ]);
    assert.ok(
      findings.some(
        (f) =>
          f.controlId === "MAA-COMPLETENESS" &&
          f.code === "incomplete_disclaimer_complete" &&
          f.verdict === "pass",
      ),
    );
  });
  await check("mid-disclaimer truncation → defect", () => {
    const truncated =
      "Overview text.\n[CaseBrain — client-safe summary. Not for court or CP";
    const a = assessDisclaimerCompleteness(truncated);
    assert.equal(a.status, "truncated");
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-DISC-TRUNC",
        surfaces: [
          {
            surfaceId: "client_summary",
            text: truncated,
            exitModes: ["copy"],
            canCopy: true,
          },
        ],
      }),
    ]);
    assert.ok(
      findings.some(
        (f) =>
          f.controlId === "MAA-COMPLETENESS" &&
          f.code === "incomplete_disclaimer_truncated" &&
          f.verdict === "defect",
      ),
    );
  });
  await check("disclaimer absent with incompleteness → defect", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-DISC-ABS",
        surfaces: [
          {
            surfaceId: "overview",
            text: "Disclosure remains incomplete and not safely confirmed on several units.",
            exitModes: ["copy"],
            canCopy: true,
          },
        ],
      }),
    ]);
    assert.ok(
      findings.some(
        (f) =>
          f.controlId === "MAA-COMPLETENESS" &&
          f.code === "incomplete_disclaimer_absent" &&
          f.verdict === "defect",
      ),
    );
  });
  await check("non-copyable containment recorded separately", () => {
    const truncated =
      "Blocked surface.\n[CaseBrain — client-safe summary. Not for court or CP";
    const a = assessDisclaimerCompleteness(truncated, { canCopy: false });
    assert.equal(a.nonCopyableContainment, true);
    assert.equal(a.status, "truncated");
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-DISC-NC",
        surfaces: [
          {
            surfaceId: "client_summary",
            text: truncated,
            exitModes: ["view"],
            canCopy: false,
          },
        ],
      }),
    ]);
    assert.ok(
      findings.some(
        (f) =>
          f.controlId === "MAA-COMPLETENESS" &&
          f.code === "non_copyable_containment_recorded" &&
          f.verdict === "containment",
      ),
    );
    assert.ok(
      !findings.some(
        (f) =>
          f.controlId === "MAA-COMPLETENESS" &&
          f.code === "incomplete_disclaimer_truncated" &&
          f.verdict === "defect",
      ),
    );
  });
  await check("known-FN register stays unreviewed (no invented sign-off)", () => {
    assert.equal(SEED_KNOWN_FN_REGISTER.reviewed, false);
    assert.equal(SEED_KNOWN_FN_REGISTER.reviewer, null);
    const safety = deriveSafetyFnKnowledge(SEED_KNOWN_FN_REGISTER, null);
    assert.equal(safety.knowledgeState, "unknown");
    assert.equal(safety.knownSafetyCriticalFn, null);
    assert.ok(
      SEED_KNOWN_FN_REGISTER.entries.some((e) => e.id === "FN-INCOMPLETE-DISCLAIMER"),
    );
  });

  console.log("\n15 — CANDIDATE_PENDING_SOURCE CANNOT BE DEFECT");
  await check("candidate_pending_source is forced to unresolved by finding-builder", () => {
    const f = emitFinding({
      controlId: "MAA-EVIDENCE-STATE",
      caseId: "CASE-X",
      surface: "truth_map",
      exactWording: "Something · served · needs_review",
      expectedWording: "something → incomplete",
      code: "candidate_pending_source",
      verdict: "defect",
      plainEnglish: "This should be forced to unresolved.",
      expectedProfessionalBehaviour: "candidate_pending_source cannot be defect.",
      rootCauseFamily: "evidence_state_candidate",
      suggestedRemediation: "Confirm identity/version binding first.",
    });
    assert.equal(f.verdict, "unresolved");
    assert.equal(f.code, "candidate_pending_source");
  });
  await check("candidate_pending_source via runAllControls is unresolved (not defect)", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "CASE-01",
        truthExpectations: [
          {
            evidenceItem: "complainant MG11",
            evidenceType: "witness_statement",
            correctEvidenceState: "incomplete",
            chaseNeeded: true,
            safeToRelyOn: false,
            mustNotSay: [],
            sourcePageAnchor: null,
          },
        ],
        truthMapRows: [
          {
            label: "Complainant MG11 (draft)",
            existence: "served",
            reliability: "needs_review",
          },
        ],
      }),
    ]);
    const candidates = findings.filter((f) => f.code === "candidate_pending_source");
    assert.ok(candidates.length >= 1, "expected at least one candidate_pending_source");
    for (const c of candidates) {
      assert.equal(c.verdict, "unresolved", `candidate ${c.findingId} must be unresolved`);
      assert.notEqual(c.verdict, "defect");
    }
  });
  await check("non-candidate state_mismatch stays defect", () => {
    const { findings } = runAllControls([
      baseCase({
        caseId: "MUT-MISMATCH",
        truthExpectations: [
          {
            evidenceItem: "Charge",
            evidenceType: "charge",
            correctEvidenceState: "missing",
            chaseNeeded: true,
            safeToRelyOn: false,
            mustNotSay: [],
            sourcePageAnchor: null,
          },
        ],
        truthMapRows: [
          { label: "Charge", existence: "served", reliability: "needs_review" },
        ],
      }),
    ]);
    const mismatch = findings.find(
      (f) => f.controlId === "MAA-EVIDENCE-STATE" && f.code === "state_mismatch",
    );
    assert.ok(mismatch, "expected a state_mismatch finding");
    assert.equal(mismatch!.verdict, "defect");
  });

  console.log(`\nmaster-assurance-auditor-contracts: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
