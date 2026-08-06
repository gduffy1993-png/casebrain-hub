/**
 * Stage-300 new-150 control-coverage pipeline.
 * Checkpoints 5 → 20 → 150 automatic. Preserves frozen Stage-150. No Stage-300 freeze/run.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { materialiseStructuredPacket } from "@/lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise";
import {
  FROZEN_150_CANDIDATE_FREEZE_SHA256,
  FROZEN_150_ORDERED_MEMBERSHIP_SHA256,
  NEW150_ARTIFACT_ROOT,
  NEW150_CANDIDATE_ROOT,
  NEW150_SCHEMA,
  NEW150_SOURCE_ROOT,
  NEW150_TARGET,
} from "./constants";
import { buildNew150Catalog, coverageMatrixFromCatalog } from "./coverage-catalog";
import { captureNew150Case } from "./production-capture";
import { buildNew150Source } from "./source-builder";
import {
  buildPerControlDenominatorReport,
  scanCaseCapability,
  type CaseCapabilitySnapshot,
} from "./named-prerequisite-scan";
import {
  checkpointGates,
  detectNearDuplicates,
  nearDuplicateFingerprint,
  validateAcceptedCase,
} from "./validators";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function verifyFrozen150(repoRoot: string): { unchanged: boolean; details: Record<string, unknown> } {
  const manifestPath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json",
  );
  const freezePath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/candidate-freeze-receipt.json",
  );
  const details: Record<string, unknown> = {
    manifestExists: fs.existsSync(manifestPath),
    freezeExists: fs.existsSync(freezePath),
  };
  if (!fs.existsSync(manifestPath) || !fs.existsSync(freezePath)) {
    return { unchanged: false, details: { ...details, error: "frozen artefacts missing" } };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    orderedMembershipSha256?: string;
  };
  const freeze = JSON.parse(fs.readFileSync(freezePath, "utf8")) as {
    freezeSha256?: string;
    candidateFreezeSha256?: string;
  };
  const membershipSha = manifest.orderedMembershipSha256;
  const candidateSha = freeze.freezeSha256 ?? freeze.candidateFreezeSha256;
  details.membershipSha = membershipSha;
  details.candidateSha = candidateSha;
  details.expectedMembership = FROZEN_150_ORDERED_MEMBERSHIP_SHA256;
  details.expectedCandidate = FROZEN_150_CANDIDATE_FREEZE_SHA256;
  const unchanged =
    membershipSha === FROZEN_150_ORDERED_MEMBERSHIP_SHA256 &&
    candidateSha === FROZEN_150_CANDIDATE_FREEZE_SHA256;
  return { unchanged, details };
}

export type New150PipelineResult = {
  schemaVersion: typeof NEW150_SCHEMA;
  accepted: Array<{ caseId: string; packetSha256: string; relativePath: string; coverageTag: string }>;
  rejected: Array<{ caseId: string; reasons: string[] }>;
  coverage: ReturnType<typeof coverageMatrixFromCatalog>;
  snapshots: CaseCapabilitySnapshot[];
  perControl: ReturnType<typeof buildPerControlDenominatorReport>;
  nearDuplicates: ReturnType<typeof detectNearDuplicates>;
  frozen150: ReturnType<typeof verifyFrozen150>;
  checkpoints: Array<{ at: number; pass: boolean; reasons: string[] }>;
  stoppedEarly: boolean;
  stopReason: string | null;
  uniqueness: {
    uniqueCaseIds: number;
    uniqueSourcePdfHashes: number;
    uniqueFingerprints: number;
    normalisedTemplateId: string;
  };
  truthBlinding: { truthOpenedDuringOutput: false; receipts: number };
  runtimeMs: number;
};

export async function runNew150Pipeline(args?: {
  limit?: number;
  resume?: boolean;
}): Promise<New150PipelineResult> {
  const started = Date.now();
  const repoRoot = process.cwd();
  const frozen150 = verifyFrozen150(repoRoot);
  if (!frozen150.unchanged) {
    throw new Error(`Frozen Stage-150 lineage check failed: ${JSON.stringify(frozen150.details)}`);
  }

  const limit = args?.limit ?? NEW150_TARGET;
  const catalog = buildNew150Catalog(limit);
  const coverage = coverageMatrixFromCatalog(catalog);
  const sourceRoot = path.join(repoRoot, NEW150_SOURCE_ROOT);
  const candidateRoot = path.join(repoRoot, NEW150_CANDIDATE_ROOT);
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(candidateRoot, { recursive: true });

  const checkpointPath = path.join(sourceRoot, "_checkpoint.json");
  const processed = new Set<string>();
  if (args?.resume && fs.existsSync(checkpointPath)) {
    const ck = JSON.parse(fs.readFileSync(checkpointPath, "utf8")) as { processedCaseIds: string[] };
    for (const id of ck.processedCaseIds ?? []) processed.add(id);
  }

  const accepted: New150PipelineResult["accepted"] = [];
  const rejected: New150PipelineResult["rejected"] = [];
  const snapshots: CaseCapabilitySnapshot[] = [];
  const seenCaseIds = new Set<string>();
  const seenPdfHashes = new Set<string>();
  const seenFingerprints = new Map<string, string>();
  const fpRows: Array<{ caseId: string; fingerprint: string; coverageTag: string; family: string }> = [];
  const checkpoints: New150PipelineResult["checkpoints"] = [];
  let stoppedEarly = false;
  let stopReason: string | null = null;

  const autoPoints = [5, 20, 150].filter((n) => n <= limit);

  for (const spec of catalog) {
    if (processed.has(spec.caseId)) continue;

    const source = buildNew150Source(spec);
    const capture = await captureNew150Case({ spec, source, sourceRootAbs: sourceRoot });
    const sourceDir = path.join(sourceRoot, spec.caseId);
    const snapshot = scanCaseCapability({ spec, capture, sourceDir });

    const gate = validateAcceptedCase({
      spec,
      capture,
      snapshot,
      sourceDir,
      seenCaseIds,
      seenPdfHashes,
      seenFingerprints,
      bundleText: source.canonicalBundle,
    });

    if (!gate.ok) {
      rejected.push({ caseId: spec.caseId, reasons: gate.reasons });
      processed.add(spec.caseId);
      writeJson(checkpointPath, { processedCaseIds: [...processed] });
      continue;
    }

    // Materialise structured packet (reuses Batch-10 extractor; no truth open).
    const mat = materialiseStructuredPacket({
      caseId: spec.caseId,
      sourceLaneId: "stage300-new150",
      sourceDir,
    });
    if (!mat.ok || !("packet" in mat) || !mat.packet) {
      rejected.push({
        caseId: spec.caseId,
        reasons: "reasons" in mat && mat.reasons?.length ? mat.reasons : ["materialise_failed"],
      });
      processed.add(spec.caseId);
      writeJson(checkpointPath, { processedCaseIds: [...processed] });
      continue;
    }

    const packetPath = path.join(candidateRoot, spec.caseId, "structured-case-packet.json");
    writeJson(packetPath, mat.packet);
    const packetSha = sha256(fs.readFileSync(packetPath));

    seenCaseIds.add(spec.caseId);
    seenPdfHashes.add(capture.bundlePdfSha256);
    const fp = nearDuplicateFingerprint(spec, source.canonicalBundle);
    seenFingerprints.set(fp, spec.caseId);
    fpRows.push({
      caseId: spec.caseId,
      fingerprint: fp,
      coverageTag: spec.coverageTag,
      family: spec.family,
    });

    accepted.push({
      caseId: spec.caseId,
      packetSha256: packetSha,
      relativePath: path.relative(repoRoot, packetPath).replace(/\\/g, "/"),
      coverageTag: spec.coverageTag,
    });
    snapshots.push(snapshot);
    processed.add(spec.caseId);
    writeJson(checkpointPath, {
      processedCaseIds: [...processed],
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
    });

    // Automatic checkpoints
    if (autoPoints.includes(accepted.length)) {
      const frozenRecheck = verifyFrozen150(repoRoot);
      const cg = checkpointGates({
        accepted: accepted.length,
        rejected: rejected.length,
        snapshots,
        frozen150Unchanged: frozenRecheck.unchanged,
      });
      checkpoints.push({ at: accepted.length, pass: cg.pass, reasons: cg.reasons });
      writeJson(path.join(repoRoot, NEW150_ARTIFACT_ROOT, `checkpoint-${accepted.length}.json`), {
        at: accepted.length,
        pass: cg.pass,
        reasons: cg.reasons,
        accepted: accepted.length,
        rejected: rejected.length,
      });
      if (!cg.pass) {
        stoppedEarly = true;
        stopReason = `checkpoint_${accepted.length}_failed: ${cg.reasons.join(";")}`;
        break;
      }
    }
  }

  const perControl = buildPerControlDenominatorReport({ repoRoot, snapshots });
  const nearDuplicates = detectNearDuplicates(fpRows);

  return {
    schemaVersion: NEW150_SCHEMA,
    accepted,
    rejected,
    coverage,
    snapshots,
    perControl,
    nearDuplicates,
    frozen150,
    checkpoints,
    stoppedEarly,
    stopReason,
    uniqueness: {
      uniqueCaseIds: seenCaseIds.size,
      uniqueSourcePdfHashes: seenPdfHashes.size,
      uniqueFingerprints: seenFingerprints.size,
      normalisedTemplateId: "stage300-new150-disclosure-v1",
    },
    truthBlinding: { truthOpenedDuringOutput: false, receipts: accepted.length },
    runtimeMs: Date.now() - started,
  };
}
