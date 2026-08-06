/**
 * Stage-300 authority repair + Stage-3000 calibration-readiness artefacts (review only).
 * No Stage-3000 selection/freeze/run. No programme PASS.
 */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const PROTECTED_BASELINE = "a831a631f3050e096b89633176f023bee2fd6a5f";
const NOW = new Date().toISOString();
const OUT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-authority-repair-stage3000-calibration-auth";
const PACKET =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-canonical-freeze-packet";
const FREEZE_V2 =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2/frozen-membership-v2.json";
const CAND_V2 =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2/candidate-freeze-receipt.json";

const EXPECTED_FREEZE_FILE_SHA =
  "11f350bc9ee73125b3cd512d3acf6ab745aa2ee56cac8dc0f24de1456757a7f7";
const EXPECTED_ORDERED =
  "23ae1b9df0a09b80b9ab51e3f597aad9103360f5f11c26606e1633b2c82c3c5a";
const S150_ORDERED = "54aeb9f1663ad8290dff9daddad1539f0778c8c38f9b833fbc99901ce7d918b1";
const S150_CAND = "4d94bb27a6b4716b1badb91015c9ca916006f71af839a9557a51d2227c83f202";

function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}
function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")) as T;
}
function writeJson(rel: string, obj: unknown): void {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}
function blobId(commit: string, file: string): string {
  return execSync(`git rev-parse ${commit}:${file}`, { encoding: "utf8" }).trim();
}
function worktreeBlob(file: string): string {
  return execSync(`git hash-object ${file}`, { encoding: "utf8" }).trim();
}

const freeze = readJson<{
  populationCount: number;
  productionOutputCases: number;
  projectionOnlyCases: number;
  orderedMembershipSha256V2: string;
  stage150OrderedMembershipSha256Pin: string;
  stage150CandidateFreezeSha256Pin: string;
  membership: Array<{ caseId: string; projectionOnly: boolean }>;
  runId: string;
  frozenAt: string;
}>(FREEZE_V2);
const cand = readJson<{ freezeSha256: string; candidateCount: number; runId: string }>(CAND_V2);
const honesty = readJson<{
  genuineQualifiedLegalReviewCount: number;
  unresolvedOwnershipCount: number;
  totalRemaining: number;
}>(`${PACKET}/remaining-review-honesty-split.json`);
const legal = readJson<{ count: number }>(`${PACKET}/remaining-qualified-legal-review-items.json`);
const ownership = readJson<{ count: number; byOwnership: Record<string, number> }>(
  `${PACKET}/remaining-unresolved-ownership-items.json`,
);

const freezeFileSha = sha256File(path.join(ROOT, FREEZE_V2));
const ids = freeze.membership.map((m) => m.caseId);
const uniqueIds = new Set(ids);
const freezeOk =
  freezeFileSha === EXPECTED_FREEZE_FILE_SHA &&
  freeze.orderedMembershipSha256V2 === EXPECTED_ORDERED &&
  freeze.populationCount === 300 &&
  freeze.productionOutputCases === 270 &&
  freeze.projectionOnlyCases === 30 &&
  freeze.membership.length === 300 &&
  uniqueIds.size === 300 &&
  freeze.membership.filter((m) => m.projectionOnly).length === 30 &&
  freeze.membership.filter((m) => !m.projectionOnly).length === 270 &&
  freeze.stage150OrderedMembershipSha256Pin === S150_ORDERED &&
  freeze.stage150CandidateFreezeSha256Pin === S150_CAND;

const reconciliation = {
  schemaVersion: "stage300-canonical-freeze-300-270-30-reconciliation@1.0.0",
  generatedAt: NOW,
  headCommit: HEAD,
  frozenMembershipPath: FREEZE_V2,
  frozenMembershipSha256: freezeFileSha,
  expectedFrozenMembershipSha256: EXPECTED_FREEZE_FILE_SHA,
  orderedMembershipSha256V2: freeze.orderedMembershipSha256V2,
  expectedOrderedMembershipSha256V2: EXPECTED_ORDERED,
  populationCount: freeze.populationCount,
  productionOutputCases: freeze.productionOutputCases,
  projectionOnlyCases: freeze.projectionOnlyCases,
  uniqueCaseIds: uniqueIds.size,
  duplicateCaseIds: ids.length - uniqueIds.size,
  stage150OrderedMembershipSha256Pin: freeze.stage150OrderedMembershipSha256Pin,
  stage150CandidateFreezeSha256Pin: freeze.stage150CandidateFreezeSha256Pin,
  stage150PinsPreserved:
    freeze.stage150OrderedMembershipSha256Pin === S150_ORDERED &&
    freeze.stage150CandidateFreezeSha256Pin === S150_CAND,
  candidateFreezeReceiptPath: CAND_V2,
  candidateFreezeSha256: cand.freezeSha256,
  candidateCount: cand.candidateCount,
  ok: freezeOk,
};

writeJson(`${PACKET}/300-270-30-reconciliation.json`, reconciliation);

const freezeReceipt = {
  schemaVersion: "stage300-v2-membership-freeze-receipt@1.0.0",
  generatedAt: NOW,
  headCommit: HEAD,
  runId: freeze.runId,
  frozenAt: freeze.frozenAt,
  frozenMembershipPath: FREEZE_V2,
  frozenMembershipSha256: freezeFileSha,
  orderedMembershipSha256V2: freeze.orderedMembershipSha256V2,
  populationCount: freeze.populationCount,
  productionOutputCases: freeze.productionOutputCases,
  projectionOnlyCases: freeze.projectionOnlyCases,
  stage150OrderedMembershipSha256Pin: freeze.stage150OrderedMembershipSha256Pin,
  stage150CandidateFreezeSha256Pin: freeze.stage150CandidateFreezeSha256Pin,
  candidateFreezeReceiptPath: CAND_V2,
  candidateFreezeSha256: cand.freezeSha256,
  freezeAuthorityOk: freezeOk,
  note: "Canonical freeze recovered byte-identically from preserved Stage-300 V2 run; rematerialised-outputs excluded.",
};
writeJson(`${PACKET}/membership-freeze-receipt.json`, freezeReceipt);
writeJson(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2/membership-freeze-receipt.json",
  freezeReceipt,
);

const regenerableExcluded = {
  schemaVersion: "stage300-canonical-freeze-excluded-regenerable-hashes@1.0.0",
  generatedAt: NOW,
  policy: "Bulk rematerialised solicitor outputs are regenerable and excluded from the canonical freeze packet.",
  excludedPaths: [
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2/rematerialised-outputs/",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment/rematerialised-outputs/",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/sources/",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-sources/",
  ],
  includedCompactEvidence: [
    `${PACKET}/frozen-membership-v2.json`,
    `${PACKET}/candidate-freeze-receipt.json`,
    `${PACKET}/membership-freeze-receipt.json`,
    `${PACKET}/300-270-30-reconciliation.json`,
    `${PACKET}/remaining-review-honesty-split.json`,
    `${PACKET}/remaining-qualified-legal-review-items.json`,
    `${PACKET}/remaining-unresolved-ownership-items.json`,
    `${PACKET}/uniqueness-and-pins-validation-v2.json`,
  ].map((p) => ({
    path: p,
    sha256: fs.existsSync(path.join(ROOT, p)) ? sha256File(path.join(ROOT, p)) : null,
    byteLength: fs.existsSync(path.join(ROOT, p)) ? fs.statSync(path.join(ROOT, p)).size : null,
  })),
  remainingHonestySplit: honesty,
  qualifiedLegalReviewItemCount: legal.count,
  unresolvedOwnershipItemCount: ownership.count,
  unresolvedOwnershipByClass: ownership.byOwnership,
};
writeJson(`${PACKET}/excluded-regenerable-population-material.json`, regenerableExcluded);

const BRAIN1 = [
  "lib/criminal/strategy-fight-engine.ts",
  "lib/criminal/strategy-fight-engine-generators.ts",
  "lib/criminal/get-aggressive-defense.ts",
  "lib/criminal/strategy-battleboard.ts",
  "lib/criminal/strategy-routes.ts",
  "lib/criminal/bundle-truth-ledger.ts",
  "lib/criminal/bundle-material-normalizer.ts",
];
const GUARDIAN = [
  "lib/criminal/source-truth-guardian/fingerprint.ts",
  "lib/criminal/source-truth-guardian/guardian.ts",
  "lib/criminal/source-truth-guardian/index.ts",
  "lib/criminal/source-truth-guardian/types.ts",
];
const brainRows = [...BRAIN1, ...GUARDIAN].map((f) => {
  const baselineBlobId = blobId(PROTECTED_BASELINE, f);
  const headBlobId = worktreeBlob(f);
  return {
    path: f,
    class: GUARDIAN.some((g) => f === g) ? "guardian" : "brain1",
    baselineBlobId,
    headBlobId,
    blobUnchanged: baselineBlobId === headBlobId,
  };
});
const brainCompare = {
  schemaVersion: "brain1-guardian-blob-compare@3.0.0",
  generatedAt: NOW,
  protectedBaselineCommit: PROTECTED_BASELINE,
  headCommit: HEAD,
  worktreeIncludesUncommittedAuthorityRepair: true,
  rows: brainRows,
  brain1Count: BRAIN1.length,
  guardianCount: GUARDIAN.length,
  brain1AllUnchanged: brainRows.filter((r) => r.class === "brain1").every((r) => r.blobUnchanged),
  guardianAllUnchanged: brainRows.filter((r) => r.class === "guardian").every((r) => r.blobUnchanged),
  allProtectedUnchanged: brainRows.every((r) => r.blobUnchanged),
  battleboardRestoredTo: "7d1391a81281f735c27e9e28edbb5058c0a95ecb",
  solicitorWordingMovedTo: "lib/criminal/solicitor-visible-sanitization.ts (presentSolicitorBattleboard / sanitizeSolicitorProse)",
};
writeJson(`${OUT}/brain1-guardian-blob-compare.json`, brainCompare);

const stage300FreezeAuthorityOk = freezeOk;
const stage300ProtectedCoreAuthorityOk = brainCompare.allProtectedUnchanged;
const stage3000SampleSelectionAllowed = stage300FreezeAuthorityOk && stage300ProtectedCoreAuthorityOk;
const stage3000CalibrationExecutionAllowed = stage3000SampleSelectionAllowed;
const stage3000CompletionAllowed = false;
const programmePassSupported = false;

const blockerRegister = {
  schemaVersion: "stage300-authority-repair-blocker-register@1.0.0",
  generatedAt: NOW,
  baselineCommit: HEAD,
  scaleGateModel:
    "Calibration authority (selection + evidence gathering) is separated from completion/PASS authority.",
  blockers: [
    {
      id: "CAL-PENDING-ESSENTIAL-43",
      title: "43 essential controls not closed as genuinely evaluated",
      blocksCompletion: true,
      blocksCalibrationEvidenceCollection: false,
      authorityDisposition: "blocks_stage3000_completion_not_calibration",
      emitAs: "not_exercised_or_unresolved_never_PASS",
    },
    {
      id: "CAL-PENDING-SPECIALTY-6",
      title: "Six harness-only specialty controls (no CaseBrain specialty emitters)",
      blocksCompletion: true,
      blocksCalibrationEvidenceCollection: false,
      authorityDisposition: "blocks_stage3000_completion_not_calibration",
      emitAs: "not_exercised_or_unresolved_never_PASS",
      controlIds: [
        "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
        "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
        "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
        "MAA2-PRC-03-YOUTH-STATE",
        "MAA2-PRC-04-FITNESS-PARTICIPATION",
        "MAA2-PRC-07-DISCLOSURE-PII-STATE",
      ],
    },
    {
      id: "CAL-PENDING-LEGAL-2",
      title: "Two qualified legal-review items remain pending",
      count: honesty.genuineQualifiedLegalReviewCount,
      blocksCompletion: true,
      blocksCalibrationEvidenceCollection: false,
      blocksPromotion: true,
      authorityDisposition: "human_or_external_review_required",
      emitAs: "unresolved_pending_human_review",
    },
    {
      id: "CAL-PENDING-OWNERSHIP-20",
      title: "Twenty unresolved source-ownership items remain pending",
      count: honesty.unresolvedOwnershipCount,
      blocksCompletion: true,
      blocksCalibrationEvidenceCollection: false,
      blocksPromotion: true,
      authorityDisposition: "human_or_external_review_required",
      emitAs: "unresolved_pending_ownership_triage",
    },
    {
      id: "CAL-DEFER-BROWSER",
      title: "Authenticated browser lane not exercised",
      blocksCompletion: true,
      blocksCalibrationEvidenceCollection: false,
      authorityDisposition: "safe_to_defer_to_heavy_or_browser_lane",
      emitAs: "not_exercised",
    },
  ],
};
writeJson(`${OUT}/updated-blocker-register.json`, blockerRegister);

const deferredRegister = {
  schemaVersion: "stage300-authority-repair-deferred-lane-register@1.0.0",
  generatedAt: NOW,
  lanes: [
    {
      laneId: "authenticated_browser",
      status: "not_exercised",
      note: "Separate deferred lane; non-browser exits may gather Stage-3000 calibration evidence.",
    },
    {
      laneId: "heavy_ocr_binary",
      status: "deferred",
      note: "Heavy PDF/OCR/binary controls remain deferred; emit not_exercised — never PASS.",
    },
    {
      laneId: "specialty_product_emitters",
      status: "product_gap_harness_expectations_only",
      note: "Harness specialty bags are not production PASS.",
    },
    {
      laneId: "qualified_legal_review",
      status: "pending",
      count: 2,
    },
    {
      laneId: "unresolved_source_ownership",
      status: "pending",
      count: 20,
    },
  ],
};
writeJson(`${OUT}/updated-deferred-lane-register.json`, deferredRegister);

const selectionPolicy = stage3000SampleSelectionAllowed
  ? {
      schemaVersion: "stage3000-selection-policy-proposed@1.0.0",
      status: "designed_not_executed",
      generatedAt: NOW,
      authorisation: "stage3000SampleSelectionAllowed=true — design only; do not select/freeze/run yet",
      purpose:
        "First frozen 3,000-case selection policy for Stage-3000 evidence-gathering/calibration. Not a completion or programme PASS authorisation.",
      membership: {
        targetUniqueCaseIdentities: 3000,
        preserveStage300Lineage: true,
        stage300OrderedMembershipSha256V2Pin: EXPECTED_ORDERED,
        noSilentCorpusSubstitution: true,
        forbiddenCorpora: [
          "ESA-499 as Stage-3000 census",
          "Malik Price generation runs",
          "gold-manual-proof-set",
          "any prior Stage-50/150/300 subsample silently relabelled as Stage-3000",
        ],
        deterministicOrderedMembershipHash: {
          algorithm: "sha256",
          formula: "orderIndex|caseId|cohort|lineage|packetSha256|casebrainOutputSha256",
          freezeBeforeDetectors: true,
        },
      },
      stratification: {
        offenceCaseFamilies: [
          "homicide_causation",
          "violence_robbery_weapons",
          "firearms",
          "sexual_abe",
          "domestic_abuse",
          "youth_participation",
          "county_lines_nrm",
          "fraud_poca",
          "digital_attribution",
          "identification_code_d",
          "mental_health_fitness",
          "disclosure_pii",
          "road_traffic_fatal",
          "magistrates_procedure",
          "bail_remand",
          "sentencing_newton",
          "appeals",
          "multi_defendant_attribution",
        ],
        variantsRequired: [
          "clean",
          "messy",
          "ocr_scan",
          "mixed_format",
          "later_disclosure",
          "amended_document",
        ],
        minimumPerFamilyVariantCell: 1,
        reportOriginalAndAddedCohortsSeparately: true,
      },
      audienceAndExitCoverage: {
        genuineNonBrowserExits: ["view", "copy", "export", "api", "pdf", "composed_prose"],
        audiences: ["defence_solicitor", "client", "court", "cps", "supervisor"],
        authenticatedBrowser: "deferred_separate_lane_not_exercised_unless_authorised",
        unimplementedControlsEmit: ["not_exercised", "unresolved"],
        neverEmitPassForUnavailable: true,
      },
      blinding: {
        sourceOutputTruthSeparation: true,
        truthKeyNeverOpenedBeforeFreeze: true,
        truthKeyNeverUsedToPopulateCaseBrainOutput: true,
        detectorBlindToSelectionUntilMembershipFrozen: true,
      },
      checkpoints: {
        resumePoints: [20, 50, 150, 300, 500, 1000, 3000],
        requireReceiptPerCheckpoint: true,
        noOverwritePriorCheckpointArtefacts: true,
      },
      retentionAndEvidenceSize: {
        retainFrozenMembershipAndCandidateReceipts: true,
        retainPerCheckpointHashesAndDispositionLedgers: true,
        excludeBulkRematerialisedOutputsFromDefaultCommit: true,
        regenerableOutputsDocumentedByHashManifest: true,
        maxCommitBulkPolicy: "hash-only for regenerable population material unless Codex authorises bulk",
      },
      deferredNotExercisedLanes: deferredRegister.lanes.map((l) => l.laneId),
      pendingHumanItemsCannotSupportPromotion: {
        qualifiedLegalReview: 2,
        unresolvedOwnership: 20,
      },
      executionNote:
        "Policy only. Do not select, freeze, or run the 3,000 until a separate Codex-authorised selection execution unit.",
    }
  : {
      schemaVersion: "stage3000-selection-policy-proposed@1.0.0",
      status: "not_designed",
      reason: "freeze/protected-core authority not both ok",
    };
writeJson(`${OUT}/stage3000-selection-policy-proposed.json`, selectionPolicy);

const readinessGate = {
  schemaVersion: "stage3000-calibration-readiness-gate@1.0.0",
  generatedAt: NOW,
  baselineCommit: HEAD,
  stage300FreezeAuthorityOk,
  stage300ProtectedCoreAuthorityOk,
  stage3000SampleSelectionAllowed,
  stage3000CalibrationExecutionAllowed,
  stage3000CompletionAllowed,
  programmePassSupported,
  stage3000Nature: "evidence_gathering_calibration_run",
  doNotClaimStage300CalibrationCompleteToUnlockDataCollection: true,
  reasons: {
    stage300FreezeAuthorityOk: freezeOk
      ? ["Canonical frozen-membership-v2.json recovered and verified (300/270/30, pins, hashes)."]
      : ["Freeze verification failed — see 300-270-30-reconciliation.json"],
    stage300ProtectedCoreAuthorityOk: brainCompare.allProtectedUnchanged
      ? ["All 7 Brain1 + 4 Guardian blobs match protected baseline a831a631; battleboard restored to 7d1391a8…"]
      : ["Protected-core blob drift remains"],
    stage3000SampleSelectionAllowed: stage3000SampleSelectionAllowed
      ? ["Freeze + protected-core authority valid — selection policy may be designed (not executed)."]
      : ["Blocked until freeze and protected-core authority both ok"],
    stage3000CalibrationExecutionAllowed: stage3000CalibrationExecutionAllowed
      ? [
          "Authorised as evidence-gathering/calibration only after selection freeze unit.",
          "Unimplemented/unavailable/deferred controls must emit not_exercised or unresolved — never PASS.",
          "2+20 human items remain pending and cannot support promotion.",
        ]
      : ["Blocked until selection authority ok"],
    stage3000CompletionAllowed: ["Remains false — essential/specialty/legal/ownership/browser open items block completion."],
    programmePassSupported: ["Programme PASS never supported by this unit."],
  },
  hardNots: [
    "no_stage3000_run_in_this_unit",
    "no_select_freeze_3000_yet",
    "no_programme_pass",
    "no_merge_deploy",
    "no_unavailable_to_pass",
    "no_claim_stage300_calibration_complete_merely_to_unlock_collection",
  ],
};
writeJson(`${OUT}/stage3000-calibration-readiness-gate.json`, readinessGate);

const decisionCard = `# Stage-300 Authority Repair — Stage-3000 Calibration Authorisation Decision Card

**Status:** STOP UNCOMMITTED FOR CODEX REVIEW  
**HEAD / baseline:** \`${HEAD}\`  
**Nature of Stage-3000 (if authorised):** evidence-gathering / calibration run — **not** completion or programme PASS.

## Gates

| Gate | Value |
|---|---|
| stage300FreezeAuthorityOk | **${stage300FreezeAuthorityOk}** |
| stage300ProtectedCoreAuthorityOk | **${stage300ProtectedCoreAuthorityOk}** |
| stage3000SampleSelectionAllowed | **${stage3000SampleSelectionAllowed}** |
| stage3000CalibrationExecutionAllowed | **${stage3000CalibrationExecutionAllowed}** |
| stage3000CompletionAllowed | **false** |
| programmePassSupported | **false** |

## A — Freeze authority

- Recovered \`frozen-membership-v2.json\` sha256 \`${freezeFileSha}\` (expected \`${EXPECTED_FREEZE_FILE_SHA}\`)
- orderedMembershipSha256V2 \`${freeze.orderedMembershipSha256V2}\`
- Population **${freeze.populationCount}** / production **${freeze.productionOutputCases}** / projection **${freeze.projectionOnlyCases}**
- Unique case IDs: ${uniqueIds.size} (duplicates ${ids.length - uniqueIds.size})
- Stage-150 pins preserved: ${reconciliation.stage150PinsPreserved}
- Canonical packet: \`${PACKET}/\` (no bulk rematerialised outputs)

## B — Protected core

- \`strategy-battleboard.ts\` restored to blob \`7d1391a81281f735c27e9e28edbb5058c0a95ecb\`
- Solicitor expansion lives in \`solicitor-visible-sanitization.ts\` (\`presentSolicitorBattleboard\` / \`sanitizeSolicitorProse\`)
- Required visible solicitor wording retained via rendering only
- Brain1/Guardian compare: brain1AllUnchanged=${brainCompare.brain1AllUnchanged}, guardianAllUnchanged=${brainCompare.guardianAllUnchanged}

## C — Scale-gate model

Calibration authority ≠ completion authority. Essential-43, specialty-6, legal-2, ownership-20, and browser remain **completion/PASS blockers** but do **not** automatically block collecting Stage-3000 calibration evidence once freeze + protected-core authority are valid. Emit \`not_exercised\` / \`unresolved\` — never PASS. 2+20 cannot support promotion.

## D — Selection policy

${
  stage3000SampleSelectionAllowed
    ? "Designed in \`stage3000-selection-policy-proposed.json\` — **not selected, frozen, or run**."
    : "Not designed — authority gates not both true."
}

## Hard nots

No Stage-3000 run · no 3000 freeze yet · no programme PASS · no merge/deploy · no Stage-300 “calibration complete” claim merely to unlock collection.
`;
fs.mkdirSync(path.join(ROOT, OUT), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT, "DECISION-CARD.md"), decisionCard, "utf8");

// Changed-file manifest for authority-repair worktree delta vs HEAD commit
const porcelain = execSync("git status --porcelain", { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const changed = porcelain.map((line) => {
  const status = line.slice(0, 2).trim();
  const filePath = line.slice(3).replace(/\\/g, "/");
  const abs = path.join(ROOT, filePath);
  const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
  return {
    status,
    path: filePath,
    sha256: exists ? sha256File(abs) : null,
    byteLength: exists ? fs.statSync(abs).size : null,
  };
});
writeJson(`${OUT}/CHANGED-FILE-MANIFEST.json`, {
  schemaVersion: "stage300-authority-repair-changed-file-manifest@1.0.0",
  generatedAt: NOW,
  headCommit: HEAD,
  fileCount: changed.length,
  files: changed,
});

const stop = {
  schemaVersion: "maa-v2-stage300-authority-repair-stage3000-calibration-auth-stop@1.0.0",
  status: "STOP_UNCOMMITTED_FOR_CODEX_REVIEW",
  title: "STAGE-300 AUTHORITY REPAIR AND STAGE-3000 CALIBRATION AUTHORISATION",
  generatedAt: NOW,
  baselineCommit: HEAD,
  stage300FreezeAuthorityOk,
  stage300ProtectedCoreAuthorityOk,
  stage3000SampleSelectionAllowed,
  stage3000CalibrationExecutionAllowed,
  stage3000CompletionAllowed,
  programmePassSupported,
  stage3000Nature: "evidence_gathering_calibration_run",
  freeze: {
    frozenMembershipSha256: freezeFileSha,
    orderedMembershipSha256V2: freeze.orderedMembershipSha256V2,
    population: {
      total: freeze.populationCount,
      production: freeze.productionOutputCases,
      projection: freeze.projectionOnlyCases,
    },
  },
  brain1Guardian: {
    allProtectedUnchanged: brainCompare.allProtectedUnchanged,
    battleboardBlob: worktreeBlob("lib/criminal/strategy-battleboard.ts"),
  },
  remainingHonestySplit: honesty,
  artefacts: [
    `${OUT}/DECISION-CARD.md`,
    `${OUT}/brain1-guardian-blob-compare.json`,
    `${OUT}/updated-blocker-register.json`,
    `${OUT}/updated-deferred-lane-register.json`,
    `${OUT}/stage3000-calibration-readiness-gate.json`,
    `${OUT}/stage3000-selection-policy-proposed.json`,
    `${OUT}/CHANGED-FILE-MANIFEST.json`,
    `${OUT}/STOP-FOR-CODEX-REVIEW.json`,
    `${PACKET}/`,
  ],
  hardNots: readinessGate.hardNots,
  committed: false,
  pushed: false,
  merged: false,
  deployed: false,
  stage3000Run: false,
  programmePassClaimed: false,
};
writeJson(`${OUT}/STOP-FOR-CODEX-REVIEW.json`, stop);

console.log(
  JSON.stringify(
    {
      out: OUT,
      packet: PACKET,
      stage300FreezeAuthorityOk,
      stage300ProtectedCoreAuthorityOk,
      stage3000SampleSelectionAllowed,
      stage3000CalibrationExecutionAllowed,
      stage3000CompletionAllowed,
      programmePassSupported,
      freezeFileSha,
      battleboardBlob: worktreeBlob("lib/criminal/strategy-battleboard.ts"),
      changedFiles: changed.length,
    },
    null,
    2,
  ),
);
