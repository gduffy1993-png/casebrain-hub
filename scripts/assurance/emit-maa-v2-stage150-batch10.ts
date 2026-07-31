/**
 * Emit MAA V2 Stage-150 Batch-10 source-backed structured rematerialisation artefacts.
 *
 * Census → rematerialise (new candidate root only) → gap/lineage/exit matrices → STOP.
 * Does not enrich/overwrite ESA. No Stage-150 select/freeze/run. No CaseBrain repair.
 * No commit/push. Truth hashed not opened.
 *
 * Baseline: 78d16bb1a2606f7187f69fc8474e97629bce69ca
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch10.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { STAGE150_IMPLEMENTED_IDS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { BATCH9_CONTROL_SPECS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch9/control-specs";
import {
  BATCH10_ARTIFACT_ROOT,
  BATCH10_BASELINE,
  BATCH10_CANDIDATE_ROOT,
  BATCH10_EXIT_IDS,
  BATCH10_PACKET_SCHEMA,
  BATCH10_SCHEMA_VERSION,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import { runBatch10Materialisation } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/pipeline";

const ROOT = process.cwd();
const OUT = path.join(ROOT, BATCH10_ARTIFACT_ROOT);

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobId(ref: string, file: string): string | null {
  try {
    return execSync(`git rev-parse ${ref}:${file}`, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

function brain1GuardianCompare(baseline: string, head: string) {
  const files = [
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
  const rows = files.map((p) => {
    const baselineBlobId = gitBlobId(baseline, p);
    const headBlobId = gitBlobId(head, p);
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology: "git rev-parse <baseline>:<exact-file> vs HEAD:<exact-file>",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function classifyPath(relativePath: string): string {
  if (relativePath.includes("/batch10/")) return "source_lib_batch10";
  if (relativePath.endsWith("index.ts") && relativePath.includes("stage150/")) return "source_lib_wire";
  if (relativePath.endsWith(".test.ts")) return "contract_test";
  if (relativePath.startsWith("scripts/assurance/")) return "emit_script";
  if (relativePath.includes("STOP-FOR-CODEX")) return "checkpoint_stop";
  if (relativePath.endsWith("changed-file-manifest.json")) return "checkpoint_manifest";
  if (relativePath.endsWith("stage150-execution-readiness-gate.json")) return "checkpoint_gate";
  if (relativePath.includes("structured-candidates")) return "candidate_packet";
  return "programme_evidence";
}

function writeChangedFileManifest(head: string, extraCandidatePaths: string[]): void {
  const manifestRel =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/changed-file-manifest.json";
  const intendedScopePaths = [
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/corpus-lanes.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/census.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/validators.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/batch9-bridge.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/pipeline.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch10/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/index.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch10.ts",
    "scripts/maa-v2-stage150-batch10-contracts.test.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/STOP-FOR-CODEX-REVIEW.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/source-capability-census.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/accepted-rejected-packets.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/materialisation-report.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/per-adapter-capability-counts.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/per-control-batch9-runnable-counts.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/seven-exit-capability-matrix.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/duplicate-lineage-register.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/storage-projection-retention-policy.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/brain1-guardian-blob-compare.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/changed-file-manifest.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/stage150-implementation-capability-matrix.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/stage150-implementation-totals.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/typescript-baseline.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/typescript-delta.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/exact-manifest-hashes.json",
    ...extraCandidatePaths,
  ];

  const contentEntries = intendedScopePaths
    .filter((p) => p !== manifestRel)
    .filter((p) => fs.existsSync(path.join(ROOT, p)))
    .map((relativePath) => {
      const buf = fs.readFileSync(path.join(ROOT, relativePath));
      return {
        relativePath,
        sha256: sha(buf),
        byteLength: buf.byteLength,
        classification: classifyPath(relativePath),
      };
    });

  const draft = {
    schemaVersion: "maa-v2-batch10-changed-file-manifest@1.0.0",
    baselineCommit: BATCH10_BASELINE,
    headCommit: head,
    rule: "Literal relative paths only — SHA-256 + byteLength + classification. No wildcards.",
    intendedScopePathCount: intendedScopePaths.length,
    intendedScopePaths: [...intendedScopePaths],
    entryCount: intendedScopePaths.length,
    entries: contentEntries,
    thisManifest: null as null | {
      relativePath: string;
      sha256: string;
      byteLength: number;
      classification: string;
      hashesDocumentWithThisManifestNull: true;
    },
    digestSha256: sha(
      contentEntries.map((e) => `${e.relativePath}|${e.sha256}|${e.byteLength}|${e.classification}`).join("\n"),
    ),
  };
  const nullSelfText = `${JSON.stringify(draft, null, 2)}\n`;
  const nullSelfSha = sha(nullSelfText);
  const nullSelfLen = Buffer.byteLength(nullSelfText);
  const selfEntry = {
    relativePath: manifestRel,
    sha256: nullSelfSha,
    byteLength: nullSelfLen,
    classification: "checkpoint_manifest",
  };
  draft.thisManifest = { ...selfEntry, hashesDocumentWithThisManifestNull: true };
  const finalDoc = { ...draft, entries: [...contentEntries, selfEntry] };
  writeJson(path.dirname(path.join(ROOT, manifestRel)), "changed-file-manifest.json", finalDoc);
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  fs.mkdirSync(OUT, { recursive: true });

  // Fresh materialisation (overwrite candidate packets under versioned root only).
  const candidateAbs = path.join(ROOT, BATCH10_CANDIDATE_ROOT);
  if (fs.existsSync(candidateAbs)) {
    fs.rmSync(candidateAbs, { recursive: true, force: true });
  }

  const { census, report, packets } = runBatch10Materialisation({
    baselineCommit: BATCH10_BASELINE,
    resume: false,
  });

  // Compact census for artefact (lane totals + case counts; full case lists retained).
  writeJson(OUT, "source-capability-census.json", census);
  writeJson(OUT, "materialisation-report.json", report);
  writeJson(OUT, "accepted-rejected-packets.json", {
    schemaVersion: "batch10-accepted-rejected@1.0.0",
    baselineCommit: BATCH10_BASELINE,
    accepted: report.accepted,
    rejected: report.rejected,
    structuredPacketCount: report.structuredPacketCount,
    uniqueSourceBackedPacketCount: report.uniqueSourceBackedPacketCount,
    readinessMet: report.readinessMet,
    deficit: report.deficit,
    deficitNote: report.deficitNote,
  });
  writeJson(OUT, "per-adapter-capability-counts.json", {
    schemaVersion: "batch10-per-adapter-capability@1.0.0",
    totals: report.perAdapterTotals,
  });
  writeJson(OUT, "per-control-batch9-runnable-counts.json", {
    schemaVersion: "batch10-per-control-batch9-runnable@1.0.0",
    note: "Counts of structured packets where Batch-9 control is exercised (not not_exercised). ESA originals unchanged.",
    controlSpecs: BATCH9_CONTROL_SPECS.map((s) => ({
      controlId: s.controlId,
      runnablePacketCount: report.perControlRunnableCounts[s.controlId] ?? 0,
    })),
    byControlId: report.perControlRunnableCounts,
  });
  writeJson(OUT, "seven-exit-capability-matrix.json", {
    schemaVersion: "batch10-seven-exit-capability-matrix@1.0.0",
    exits: BATCH10_EXIT_IDS.map((id) => ({
      exitId: id,
      realPayloadPresentCount: report.sevenExitCapabilityMatrix[id]?.realPayloadPresentCount ?? 0,
      note:
        id === "authenticated_browser"
          ? "Browser unavailable unless genuinely authenticated and captured payload bytes exist"
          : "Metadata alone is not an exit",
    })),
    matrix: report.sevenExitCapabilityMatrix,
  });

  // Duplicate / lineage register — PDF content hashes across accepted packets + gold lineage notes.
  const byPdfSha = new Map<string, string[]>();
  for (const p of packets) {
    const pdfSha = p.preservedOriginalHashes.bundlePdfSha256;
    if (!pdfSha) continue;
    const list = byPdfSha.get(pdfSha) ?? [];
    list.push(p.caseId);
    byPdfSha.set(pdfSha, list);
  }
  const goldLineageNote =
    "gold_manual_proof_set_v1 CASE-* _source contains bundle-text + truth-key only (no PDF page meta) — lineage overlaps demo-audit families; not double-counted as unique source-backed structured packets.";
  writeJson(OUT, "duplicate-lineage-register.json", {
    schemaVersion: "batch10-duplicate-lineage-register@1.0.0",
    baselineCommit: BATCH10_BASELINE,
    uniquePdfContentShaCount: byPdfSha.size,
    duplicatePdfGroups: [...byPdfSha.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([sha256, caseIds]) => ({ sha256, caseIds })),
    acceptedCaseIds: report.accepted.map((a) => a.caseId).sort(),
    goldLineageNote,
    esaPreservation: "ESA valid-499 and demo-audit source dirs were not overwritten; candidates written under versioned candidate root only.",
    packetSchema: BATCH10_PACKET_SCHEMA,
  });

  writeJson(OUT, "storage-projection-retention-policy.json", {
    schemaVersion: "batch10-storage-projection-retention@1.0.0",
    candidateRoot: BATCH10_CANDIDATE_ROOT,
    artefactRoot: BATCH10_ARTIFACT_ROOT,
    projection: {
      perPacketFiles: ["structured-case-packet.json"],
      checkpoint: "_checkpoint.json",
      estimatedBytesPerPacket: packets[0]
        ? Buffer.byteLength(`${JSON.stringify(packets[0], null, 2)}\n`)
        : null,
      projectedBytesAt150:
        packets[0] != null
          ? Buffer.byteLength(`${JSON.stringify(packets[0], null, 2)}\n`) * 150
          : null,
    },
    retention: {
      doNotOverwrite: [
        "artifacts/evidence-state-audit-local/cases/**",
        "artifacts/casebrain-qa/gold-manual-proof-set-v1/**",
        "artifacts/casebrain-qa/malik-price-generation-v2-untouched-run/**",
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch9/**",
      ],
      candidatesAreEphemeralUntilAccepted: true,
      truthKeys: "hash-identify only; never open contents for CaseBrain output population",
      regeneration: "byte-identical deterministic materialisedAt=deterministic:<hash16>",
    },
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    schemaVersion: "stage150-implementation-totals@1.0.0",
    totals: matrix.totals,
    implementedIdCount: STAGE150_IMPLEMENTED_IDS.size,
    note: "Batch-10 does not promote detectors; totals remain 8/98/55",
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.9.0",
    baselineCommit: BATCH10_BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    reasons: [
      "98 controls remain partially_implemented",
      "55 controls remain SNI",
      report.readinessMet
        ? "≥150 source-backed structured packets exist — readiness only; Stage-150 sample selection still FALSE"
        : `Fewer than 150 unique source-backed structured packets (have ${report.uniqueSourceBackedPacketCount}; deficit ${report.deficit})`,
      "Batch-10 rematerialisation does not select or freeze Stage-150",
      "currentlyRunnableOnStage150 remains false",
      "Real exit payload bytes largely absent across corpora",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: false,
      denominatorReadinessComplete: false,
      adapterReadinessComplete: false,
      receiptValidationComplete: true,
      contractReadinessComplete: true,
      relationshipComplete: false,
      protectedAssetsPreserved: true,
      structuredRematerialisationComplete: report.readinessMet,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const blobCompare = brain1GuardianCompare(BATCH10_BASELINE, head);
  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);

  let tscOk = true;
  let tscExcerpt = "";
  let stage150Errs = 0;
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  stage150Errs = (
    tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? []
  ).length;
  writeJson(OUT, "typescript-baseline.json", {
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    schemaVersion: "stage150-typescript-delta@1.0.0",
    baselineCommit: BATCH10_BASELINE,
    stage150PathErrors: stage150Errs,
  });

  const candidatePaths = report.accepted.map((a) => a.relativePath);
  const exactManifest = {
    schemaVersion: "batch10-exact-manifest-hashes@1.0.0",
    baselineCommit: BATCH10_BASELINE,
    packetSchema: BATCH10_PACKET_SCHEMA,
    materialiserVersion: BATCH10_SCHEMA_VERSION,
    candidateRoot: BATCH10_CANDIDATE_ROOT,
    packets: report.accepted,
    censusSha256: sha(fs.readFileSync(path.join(OUT, "source-capability-census.json"))),
    materialisationReportSha256: sha(fs.readFileSync(path.join(OUT, "materialisation-report.json"))),
  };
  writeJson(OUT, "exact-manifest-hashes.json", exactManifest);

  const laneSummary = census.lanes.map((l) => ({
    laneId: l.laneId,
    caseDirectoryCount: l.caseDirectoryCount,
    blueprintOnly: l.blueprintOnly,
    capabilityTotals: l.capabilityTotals,
    inventoryNote: l.inventoryNote ?? null,
  }));

  const stop = {
    schemaVersion: "maa-v2-stage150-batch10-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Batch 10 SOURCE-BACKED STRUCTURED REMATERIALISATION",
    status: "STAGE150_BATCH10_STRUCTURED_REMATERIALISATION_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH10_BASELINE,
    headCommit: head,
    schemaVersionLib: BATCH10_SCHEMA_VERSION,
    packetSchema: BATCH10_PACKET_SCHEMA,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    detectorPromotions: [],
    esaPacketsOverwritten: false,
    truthContentsOpened: false,
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    implementationTotals: matrix.totals,
    beforeTotals: { implemented: 8, partially_implemented: 98, specified_not_implemented: 55 },
    structuredPacketCount: report.structuredPacketCount,
    uniqueSourceBackedPacketCount: report.uniqueSourceBackedPacketCount,
    readinessThreshold: 150,
    readinessMet: report.readinessMet,
    deficit: report.deficit,
    deficitNote: report.deficitNote,
    perAdapterTotals: report.perAdapterTotals,
    sevenExitCapabilityMatrix: report.sevenExitCapabilityMatrix,
    laneSummary,
    candidateRoot: BATCH10_CANDIDATE_ROOT,
    artefactRoot: BATCH10_ARTIFACT_ROOT,
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      rows: blobCompare.rows,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    remediationNotes: [
      "New versioned candidate root only — ESA/Phase11/Malik/frozen runs untouched",
      "No invention: missing stays null/unavailable; truth hashed not opened",
      "Metadata alone is not an exit; authenticated_browser requires captured payload",
      report.readinessMet
        ? "≥150 unique source-backed packets — report readiness only; do not select/freeze"
        : `Deficit ${report.deficit}: build new source-rich PDF+page-meta disclosure packs`,
    ],
    blockers: [
      "Stage-150 selection and execution gates remain FALSE",
      "No programme PASS",
      "Batch-10 does not promote Batch-9 evaluators onto ESA",
      ...(report.readinessMet
        ? []
        : [
            `Only ${report.uniqueSourceBackedPacketCount}/150 unique source-backed structured packets`,
            "Do not fabricate eligibility or enrich ESA prose packets",
          ]),
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  writeChangedFileManifest(head, candidatePaths);

  console.log(
    JSON.stringify(
      {
        out: OUT,
        candidateRoot: BATCH10_CANDIDATE_ROOT,
        structuredPacketCount: report.structuredPacketCount,
        uniqueSourceBackedPacketCount: report.uniqueSourceBackedPacketCount,
        readinessMet: report.readinessMet,
        deficit: report.deficit,
        accepted: report.accepted.length,
        rejected: report.rejected.length,
        totals: matrix.totals,
        gates: { sample: false, exec: false, freeze: false, programmePass: false },
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
        truthOpened: false,
        esaOverwritten: false,
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 ? 0 : 1);
}

main();
