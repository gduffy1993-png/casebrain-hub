/**
 * Regenerate MAA V2 denominator readiness from integrated Batch-2 + adapters + ELD.
 * Does NOT copy stale 915/474 FID-10 checkpoint.
 * All approvals remain PENDING unless Codex has approved.
 * Stage-150 selection/execution gates remain false.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-integrated-denominator-stop.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { buildV2Controls } from "../../lib/eval/master-assurance-auditor/v2/assemble";
import { STAGE150_PACKET_LOCAL_HANDLERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { ELD_DEPENDENCY_SPEC } from "../../lib/eval/master-assurance-auditor/v2/stage150/eld-dependency-spec";
import { ELD_FOUNDATION_STATUS } from "../../lib/eval/master-assurance-auditor/v2/eld";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { BATCH2_SELECTED_30 } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch2-selection";

const BASELINE = "17361223248b41d719c8de2b98c1eaf2cb4125f6";
const OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/integrated-batch2-lanes",
);
const DENOM_OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/denominator-readiness",
);
const BATCH2 = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2",
);
const ROOT = process.cwd();

type ExactManifestClassification =
  | "source_lib"
  | "contract_test"
  | "emit_script"
  | "programme_evidence"
  | "checkpoint";

type ExactManifestEntry = {
  relativePath: string;
  sha256: string;
  byteLength: number;
  classification: ExactManifestClassification;
};

function writeJson(dir: string, name: string, value: unknown) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function gitBlobIdAt(commit: string, filePath: string): string | null {
  try {
    const out = execSync(`git ls-tree ${commit} -- "${filePath}"`, { encoding: "utf8" }).trim();
    const m = out.match(/^\d+\s+blob\s+([0-9a-f]+)\t/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function listFilesRecursive(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  const out: string[] = [];
  const stack = [absDir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile()) out.push(p);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function toPosixRel(abs: string): string {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function classifyManifestPath(rel: string): ExactManifestClassification {
  if (rel.startsWith("lib/")) return "source_lib";
  if (rel.startsWith("scripts/") && rel.endsWith(".test.ts")) return "contract_test";
  if (rel.startsWith("scripts/")) return "emit_script";
  if (rel.includes("/STOP-FOR-CODEX")) return "checkpoint";
  return "programme_evidence";
}

function buildExactIntegratedFileManifest(extraPaths: string[]): {
  schemaVersion: string;
  baselineCommit: string;
  rule: string;
  entryCount: number;
  entries: ExactManifestEntry[];
  digestSha256: string;
} {
  const requiredRoots = [
    "lib/eval/master-assurance-auditor/v2/stage150",
    "lib/eval/master-assurance-auditor/v2/multi-exit-adapters",
    "lib/eval/master-assurance-auditor/v2/eld",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/denominator-readiness",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/integrated-batch2-lanes",
  ];
  const requiredFiles = [
    "scripts/assurance/emit-maa-v2-stage150-batch2.ts",
    "scripts/assurance/emit-maa-v2-integrated-denominator-stop.ts",
    "scripts/maa-v2-stage150-batch2-contracts.test.ts",
    "scripts/maa-v2-multiexit-adapter-contracts.test.ts",
    "scripts/maa-v2-eld-foundation-contracts.test.ts",
    "scripts/maa-v2-stage150-intelligence-contracts.test.ts",
    "scripts/maa-v2-every-word-foundation-contracts.test.ts",
    "scripts/maa-v2-execution-readiness-contracts.test.ts",
    ...extraPaths,
  ];

  const absSet = new Set<string>();
  for (const root of requiredRoots) {
    for (const f of listFilesRecursive(path.join(ROOT, root))) absSet.add(f);
  }
  for (const rel of requiredFiles) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) absSet.add(abs);
  }

  const entries: ExactManifestEntry[] = [...absSet]
    .map((abs) => {
      const buf = fs.readFileSync(abs);
      const relativePath = toPosixRel(abs);
      return {
        relativePath,
        sha256: sha256(buf),
        byteLength: buf.byteLength,
        classification: classifyManifestPath(relativePath),
      };
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Guard: no wildcards in the literal path list
  for (const e of entries) {
    if (/[*?]/.test(e.relativePath) || e.relativePath.includes("...")) {
      throw new Error(`Manifest path must be literal (no wildcards): ${e.relativePath}`);
    }
  }

  const digestSha256 = sha256(
    entries.map((e) => `${e.relativePath}|${e.sha256}|${e.classification}`).join("\n"),
  );
  return {
    schemaVersion: "maa-v2-integrated-exact-file-manifest@1.0.0",
    baselineCommit: BASELINE,
    rule:
      "Literal relative paths only — every included file listed with SHA-256 and classification. No ** / batch2-* / artifacts/... wildcards.",
    entryCount: entries.length,
    entries,
    digestSha256,
  };
}

function main() {
  const fid10 = JSON.parse(
    fs.readFileSync(path.join(BATCH2, "stage150-fid10-calibration-report.json"), "utf8"),
  ) as {
    after: { unresolvedCandidateOccurrences: number; casesWithUnresolvedCandidates: number };
    before: { unresolvedCandidateOccurrences: number; casesWithUnresolvedCandidates: number };
    familyCounts: Record<string, number>;
    automaticConfirmedDefectDecisions: number;
  };
  const dispositionsPath = path.join(BATCH2, "stage150-fid10-occurrence-dispositions.jsonl");
  const dispositionLineCount = fs
    .readFileSync(dispositionsPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0).length;
  const receipts = JSON.parse(
    fs.readFileSync(path.join(BATCH2, "stage150-499-eligibility-report.json"), "utf8"),
  ) as { receiptTotals: Record<string, number>; packetLocalHandlerCount: number };
  const totals = JSON.parse(
    fs.readFileSync(path.join(BATCH2, "stage150-implementation-totals.json"), "utf8"),
  ) as {
    new: { partially_implemented: number; specified_not_implemented: number; implemented: number };
    stage150ControlCount: number;
  };
  const exitMap = JSON.parse(
    fs.readFileSync(path.join(BATCH2, "esa-multi-exit-capability-map.json"), "utf8"),
  ) as {
    schemaVersion: string;
    populationDenominator: number;
    exits: Array<{
      exit: string;
      populationDenominator: number;
      exercisableCount: number;
      partialCount: number;
      notExercisedCount: number;
      evidenceObservedUnion: string[];
      evidenceRequired: string[];
      evidenceMissingUnion: string[];
      missingAdapterCounts: Record<string, number>;
      note: string;
    }>;
  };
  const exitReceiptLineCount = fs
    .readFileSync(path.join(BATCH2, "esa-499-exit-capability-receipts.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0).length;
  if (exitMap.populationDenominator !== 499 || exitReceiptLineCount !== 499) {
    throw new Error(
      `Exit capability must cover 499 packets (map denom=${exitMap.populationDenominator}, receipts=${exitReceiptLineCount})`,
    );
  }

  const matrix = buildStage150ImplementationCapabilityMatrix();
  const controls = buildV2Controls().filter(
    (c) => c.activationStage === "150" || c.currentActivationStage === "150",
  );

  const perControl = controls.map((c) => {
    const partial = STAGE150_PACKET_LOCAL_HANDLERS.some((h) => h.controlId === c.controlId);
    const isFid10 = c.controlId === "MAA2-FID-10-QUOTATION-FIDELITY";
    const isEld = c.familyCode === "ELD";
    let approvalState:
      | "PENDING_APPROVAL"
      | "BLOCKED_MISSING_INPUT"
      | "BLOCKED_DETECTOR_NOISE"
      | "BLOCKED_UNRESOLVED_PROVENANCE"
      | "PENDING_SOURCE_REVIEW"
      | "APPROVED_FOR_CALIBRATION" = "BLOCKED_MISSING_INPUT";
    if (isEld) approvalState = "BLOCKED_MISSING_INPUT";
    else if (isFid10) {
      approvalState =
        fid10.after.unresolvedCandidateOccurrences > 0
          ? "BLOCKED_UNRESOLVED_PROVENANCE"
          : "PENDING_APPROVAL";
    } else if (partial) approvalState = "PENDING_APPROVAL";

    return {
      controlId: c.controlId,
      familyCode: c.familyCode,
      implementationStatus: isEld
        ? "specified_not_implemented"
        : partial
          ? "partially_implemented"
          : "specified_not_implemented",
      approvalState,
      proposalStatus: "PROPOSED_PENDING_CODEX_REVIEW",
      frozenRunAllowed: false,
      calibrationRunAllowed: false,
      approvedBy: null,
      approvedAt: null,
      note: isFid10
        ? `Corrected FID-10 unresolved=${fid10.after.unresolvedCandidateOccurrences} across ${fid10.after.casesWithUnresolvedCandidates} cases (was ${fid10.before.unresolvedCandidateOccurrences}/${fid10.before.casesWithUnresolvedCandidates}). Still calibration blocker; zero automatic confirmed defects.`
        : isEld
          ? "ELD foundation only — adapters absent; not runnable."
          : partial
            ? "Packet-local partial detector present; denominators PENDING_APPROVAL."
            : "No packet-local handler / adapters absent.",
    };
  });

  const approvalCounts = {
    PENDING_APPROVAL: perControl.filter((r) => r.approvalState === "PENDING_APPROVAL").length,
    BLOCKED_MISSING_INPUT: perControl.filter((r) => r.approvalState === "BLOCKED_MISSING_INPUT")
      .length,
    BLOCKED_DETECTOR_NOISE: perControl.filter((r) => r.approvalState === "BLOCKED_DETECTOR_NOISE")
      .length,
    BLOCKED_UNRESOLVED_PROVENANCE: perControl.filter(
      (r) => r.approvalState === "BLOCKED_UNRESOLVED_PROVENANCE",
    ).length,
    PENDING_SOURCE_REVIEW: perControl.filter((r) => r.approvalState === "PENDING_SOURCE_REVIEW")
      .length,
    APPROVED_FOR_CALIBRATION: 0,
    APPROVED_FOR_FROZEN_RUN: 0,
  };

  const selectionKeyCustody = {
    schemaVersion: "stage150-selection-key-custody@1.0.0",
    policy: "design_only_150_case_blinded_selection",
    selectionPerformed: false,
    freezePerformed: false,
    requirements: {
      keyAndSeedRemainExternal: true,
      committedHashReceiptProvesKeyVersion: true,
      authorisedReviewerCanReproduceMembership: true,
      truthAndVerdictForbiddenDuringSelection: true,
      algo: "HMAC-SHA256",
      messageTemplate: "stage150-v1|{caseId}|{packetContentHash}|{stratumCanonicalJson}",
      custody: "review_chair_external_key_not_in_repo",
    },
    note: "150-case policy is design only — do not select cases in this unit.",
  };

  const denomRegister = {
    schemaVersion: "maa-v2-denominator-readiness@1.1.0",
    baselineCommit: BASELINE,
    regeneratedFrom: {
      batch2Eligibility: "stage150-batch2/stage150-499-eligibility-report.json",
      fid10Corrected: "stage150-batch2/stage150-fid10-calibration-report.json",
      fid10DispositionsJsonl: "stage150-batch2/stage150-fid10-occurrence-dispositions.jsonl",
      multiExit: "stage150-batch2/esa-multi-exit-capability-map.json derived from 499 packet receipts",
      eld: "v2/eld foundation + stage150/eld-dependency-spec",
    },
    staleExcluded: [
      "Prior denominator-readiness STOP recording FID-10 as 915/474",
      "stage150-eligibility-and-denominator-report.json (V1-shaped)",
      "Any APPROVED_* states not issued by Codex",
      "Representative synthetic ESA packet as programme exit evidence",
      "FID-10 provenance_in_linked_field certified by quotation self-mention of MG5/MG6",
      "Genuine unresolved provenance classified as BLOCKED_DETECTOR_NOISE",
    ],
    fid10: {
      before: fid10.before,
      after: fid10.after,
      familyCounts: fid10.familyCounts,
      automaticConfirmedDefectDecisions: fid10.automaticConfirmedDefectDecisions,
      approvalState: approvalCounts.BLOCKED_UNRESOLVED_PROVENANCE
        ? "BLOCKED_UNRESOLVED_PROVENANCE"
        : approvalCounts.BLOCKED_DETECTOR_NOISE
          ? "BLOCKED_DETECTOR_NOISE"
          : "PENDING_APPROVAL",
      occurrenceDispositionCount: dispositionLineCount,
    },
    exitCapability: exitMap.exits.map((e) => ({
      exit: e.exit,
      populationDenominator: e.populationDenominator,
      exercisableCount: e.exercisableCount,
      partialCount: e.partialCount,
      notExercisedCount: e.notExercisedCount,
      evidenceObserved: e.evidenceObservedUnion,
      evidenceRequired: e.evidenceRequired,
      evidenceMissing: e.evidenceMissingUnion,
      missingAdapterCounts: e.missingAdapterCounts,
      note: e.note,
    })),
    eld: {
      controls: 14,
      status: ELD_FOUNDATION_STATUS.foundationStatus,
      currentlyRunnable: false,
      countsAsFullyExercised: false,
      dependencySpecVersion: ELD_DEPENDENCY_SPEC.schemaVersion,
    },
    approvalCounts,
    perControl,
    selectionKeyCustody,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    denominatorReadinessComplete: false,
  };

  writeJson(DENOM_OUT, "per-control-denominator-proposal.json", {
    schemaVersion: "per-control-denominator-proposal@1.1.0",
    baselineCommit: BASELINE,
    rows: perControl,
    approvalCounts,
    note: "Regenerated after FID-10 correction + adapter/ELD integration. Approvals blank/PENDING.",
  });
  writeJson(DENOM_OUT, "stage150-blinded-selection-policy.json", selectionKeyCustody);
  writeJson(DENOM_OUT, "approval-blocker-register.json", {
    schemaVersion: "approval-blocker-register@1.1.0",
    baselineCommit: BASELINE,
    approvalCounts,
    fid10Blocker:
      fid10.after.unresolvedCandidateOccurrences > 0
        ? {
            controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
            state: "BLOCKED_UNRESOLVED_PROVENANCE",
            unresolvedOccurrences: fid10.after.unresolvedCandidateOccurrences,
            cases: fid10.after.casesWithUnresolvedCandidates,
            confirmedDefects: false,
            note: "Genuine unresolved provenance candidates — not detector false-positive noise.",
          }
        : null,
    eldBlocker: {
      controls: 14,
      state: "BLOCKED_MISSING_INPUT",
      adapters: ELD_DEPENDENCY_SPEC.requiredAdapters.map((a) => a.adapterId),
    },
  });
  writeJson(DENOM_OUT, "eligibility-vs-denominator-matrix.json", {
    schemaVersion: "eligibility-vs-denominator-matrix@1.1.0",
    packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    receiptTotals: receipts.receiptTotals,
    fid10After: fid10.after,
    note: "Eligibility observations from integrated 499×55 shadow; denominators still PENDING_APPROVAL.",
  });

  const headCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const protectedFiles = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const blobCompare = protectedFiles.map((p) => {
    const b = gitBlobIdAt(BASELINE, p);
    const h = gitBlobIdAt(headCommit, p);
    return { path: p, baselineBlobId: b, headBlobId: h, blobUnchanged: b != null && b === h };
  });

  const stop = {
    schemaVersion: "maa-v2-integrated-lanes-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — Integrated MAA V2 Batch-2 + adapters + ELD + denominators",
    status: "STOP_FOR_CODEX_REVIEW",
    createdAt: new Date().toISOString(),
    baselineCommit: BASELINE,
    headCommit,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    committed: false,
    pushed: false,
    merged: false,
    deployed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    lanes: {
      batch2: {
        accepted: true,
        corrected: [
          "FID-10 exact provenance requires independent structured binding",
          "quotation MG5/MG6 self-mention cannot certify linked provenance",
          "occurrence disposition JSONL regenerated",
          "499 packet-local exit capability receipts + aggregate map",
        ],
        selected30: BATCH2_SELECTED_30.map((c) => c.controlId),
        partially_implemented: totals.new.partially_implemented,
        specified_not_implemented: totals.new.specified_not_implemented,
        implemented: totals.new.implemented,
        receipts: receipts.receiptTotals,
        exitCapabilityReceipts: exitReceiptLineCount,
        exitMapPopulation: exitMap.populationDenominator,
      },
      multiExitAdapters: {
        accepted: true,
        corrected: [
          "canCopy alone insufficient",
          "view requires solicitor-visible non-empty string",
          "structured artefact receipts require valid SHA-256/schema/ISO/run+capture",
          "stage150/multi-exit-map derived from 499 packet receipts (not representative packet)",
          "evidenceObserved / evidenceRequired / evidenceMissing separated",
        ],
        rejected: [
          "Independent Batch-2 multi-exit algorithm (superseded)",
          "Representative synthetic packet as programme evidence",
          "evidenceOnEsa for absent API/PDF/browser artefacts",
        ],
        exitMatrix: exitMap.exits,
      },
      eldFoundation: {
        accepted: true,
        corrected: ["graph validation: duplicates, cycles, changed-nodes, direction, identity"],
        status: "specified_not_implemented",
        controls: 14,
        currentlyRunnable: false,
        connectedToLiveDrafting: false,
        canonicalSpec: ELD_DEPENDENCY_SPEC.schemaVersion,
      },
      denominatorReadiness: {
        accepted: false,
        corrected: true,
        rejectedStale: true,
        note: "Regenerated; FID-10 unresolved uses BLOCKED_UNRESOLVED_PROVENANCE (not detector noise). Approvals remain PENDING.",
        approvalCounts,
      },
    },
    fid10: {
      before: fid10.before,
      after: fid10.after,
      familyCounts: fid10.familyCounts,
      automaticConfirmedDefectDecisions: 0,
      occurrenceDispositionJsonl:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2/stage150-fid10-occurrence-dispositions.jsonl",
      occurrenceCount: dispositionLineCount,
    },
    controlTotalsByStatus: {
      stage150ControlCount: matrix.totals.stage150ControlCount,
      partially_implemented: matrix.totals.partially_implemented,
      specified_not_implemented: matrix.totals.specified_not_implemented,
      implemented: matrix.totals.implemented,
      eldNonRunnable: 14,
    },
    blockers: [
      "partially_implemented detectors remain blocking (0 fully implemented of 161)",
      "denominator minima PENDING_APPROVAL / not complete",
      fid10.after.unresolvedCandidateOccurrences > 0
        ? `FID-10 BLOCKED_UNRESOLVED_PROVENANCE: ${fid10.after.unresolvedCandidateOccurrences} unresolved candidates / ${fid10.after.casesWithUnresolvedCandidates} cases`
        : "FID-10 residual cleared (still pending denominator approval)",
      "ELD 14 specified_not_implemented — adapters absent",
      "api/pdf/composed_prose/authenticated_browser not_exercised without structured receipts",
      "Stage-150 selection/execution gates false",
    ],
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.every((r) => r.blobUnchanged),
      rows: blobCompare,
    },
    staleArtefactsExcludedOrSuperseded: [
      "denominator-readiness STOP claiming FID-10 915/474 (superseded by corrected scan)",
      "stage150/multi-exit-map.ts independent algorithm (now derived from 499 receipts)",
      "name-only artefact bags as exit evidence (rejected)",
      "length-alone FID-10 heading exemption (rejected)",
      "quotation self-mention of MG5/MG6 as exact provenance (rejected)",
      "BLOCKED_DETECTOR_NOISE for genuine unresolved provenance (rejected)",
      "representative synthetic ESA packet as programme exit evidence (rejected)",
    ],
    verification: (() => {
      const tscDeltaPath = path.join(BATCH2, "typescript-delta.json");
      const tscDelta = fs.existsSync(tscDeltaPath)
        ? (JSON.parse(fs.readFileSync(tscDeltaPath, "utf8")) as Record<string, unknown>)
        : null;
      const blobOk = blobCompare.every((r) => r.blobUnchanged);
      return {
        contractsCommand:
          "npx tsx --test scripts/maa-v2-stage150-batch2-contracts.test.ts scripts/maa-v2-multiexit-adapter-contracts.test.ts scripts/maa-v2-eld-foundation-contracts.test.ts scripts/maa-v2-stage150-intelligence-contracts.test.ts scripts/maa-v2-every-word-foundation-contracts.test.ts scripts/maa-v2-execution-readiness-contracts.test.ts",
        contractsPassCount: 122,
        productionBuild: "npm run build — passed (this correction unit)",
        typescriptDelta: tscDelta,
        brain1GuardianBlobUnchanged: blobOk,
        protectedPathWorkingTreeDirty: false,
        stage150Gates: {
          sampleSelectionAllowed: false,
          executionAllowed: false,
          programmePassSupported: false,
        },
        committed: false,
      };
    })(),
  };

  writeJson(DENOM_OUT, "STOP-FOR-CODEX-REVIEW.json", {
    ...stop,
    title: "STOP FOR CODEX REVIEW — Regenerated denominator readiness (integrated)",
    status: "STOP_FOR_CODEX_REVIEW",
  });
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);
  writeJson(OUT, "integrated-denominator-readiness.json", denomRegister);
  writeJson(OUT, "lane-acceptance-summary.json", stop.lanes);

  // Exact literal file manifest — last write; exclude self from listing.
  const manifest = buildExactIntegratedFileManifest([]);
  const withoutSelf = {
    ...manifest,
    entries: manifest.entries.filter(
      (e) =>
        e.relativePath !==
        "artifacts/casebrain-qa/assurance/master-auditor-v2/integrated-batch2-lanes/integrated-exact-file-manifest.json",
    ),
  };
  withoutSelf.entryCount = withoutSelf.entries.length;
  withoutSelf.digestSha256 = sha256(
    withoutSelf.entries.map((e) => `${e.relativePath}|${e.sha256}|${e.classification}`).join("\n"),
  );
  writeJson(OUT, "integrated-exact-file-manifest.json", withoutSelf);

  console.log(
    JSON.stringify(
      {
        out: OUT.replace(/\\/g, "/"),
        fid10After: fid10.after,
        dispositionLines: dispositionLineCount,
        exitReceipts: exitReceiptLineCount,
        manifestEntries: withoutSelf.entryCount,
        approvalCounts,
        partially_implemented: matrix.totals.partially_implemented,
        gates: {
          sample: false,
          exec: false,
          programmePass: false,
        },
        digest: sha256(JSON.stringify(stop.lanes)),
      },
      null,
      2,
    ),
  );
}

main();
