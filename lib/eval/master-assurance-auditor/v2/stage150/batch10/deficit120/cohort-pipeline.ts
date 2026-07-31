/**
 * Deficit-120 cohort pipeline: preserve 30 → build 120 → strict validate → manifests.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { materialiseStructuredPacket } from "../materialise";
import type { Batch10StructuredCasePacket } from "../schemas";
import {
  BATCH10_COHORT_A_EXPECTED,
  BATCH10_COHORT_A_ROOT,
  BATCH10_COHORT_B_TARGET,
  BATCH10_DEFICIT_CANDIDATE_ROOT,
  BATCH10_DEFICIT_SOURCE_ROOT,
  BATCH10_POPULATION_TARGET,
} from "./constants";
import { buildDeficit120Catalog, coverageMatrixFromCatalog } from "./coverage-catalog";
import { captureDeficit120Case } from "./production-capture";
import { buildDeficit120Source } from "./source-builder";
import {
  adapterDryRun,
  detectNearDuplicates,
  nearDuplicateFingerprint,
  strictValidateDeficitPacket,
} from "./strict-validators";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type CohortALock = {
  caseId: string;
  relativePath: string;
  expectedSha256: string;
  actualSha256: string;
  unchanged: boolean;
};

export function lockCohortA(repoRoot: string): {
  locks: CohortALock[];
  allUnchanged: boolean;
  count: number;
} {
  const acceptedPath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10/accepted-rejected-packets.json",
  );
  const accepted = JSON.parse(fs.readFileSync(acceptedPath, "utf8")) as {
    accepted: Array<{ caseId: string; packetSha256: string; relativePath: string }>;
  };
  const locks: CohortALock[] = accepted.accepted.map((a) => {
    const abs = path.join(repoRoot, a.relativePath);
    const actual = fs.existsSync(abs) ? sha256(fs.readFileSync(abs)) : "MISSING";
    return {
      caseId: a.caseId,
      relativePath: a.relativePath,
      expectedSha256: a.packetSha256,
      actualSha256: actual,
      unchanged: actual === a.packetSha256,
    };
  });
  return {
    locks,
    allUnchanged: locks.length === BATCH10_COHORT_A_EXPECTED && locks.every((l) => l.unchanged),
    count: locks.length,
  };
}

export async function runDeficit120Pipeline(args?: {
  limit?: number;
  resume?: boolean;
}): Promise<{
  cohortA: ReturnType<typeof lockCohortA>;
  acceptedB: Array<{ caseId: string; packetSha256: string; relativePath: string }>;
  rejectedB: Array<{ caseId: string; reasons: string[] }>;
  coverage: ReturnType<typeof coverageMatrixFromCatalog>;
  nearDuplicates: ReturnType<typeof detectNearDuplicates>;
  adapterDryRunSample: unknown;
  populationCount: number;
  /** Alias meaning: populationPacketReadinessMet only — not Stage-150/detector/programme PASS. */
  readinessMet: boolean;
  populationPacketReadinessMet: boolean;
  deficit: number;
  uniqueness: {
    uniqueCaseIds: number;
    uniqueSourcePdfHashes: number;
    uniqueChargeWordingHashes: number;
    uniqueFingerprints: number;
    normalisedTemplateId: "deficit120-disclosure-v1";
  };
  truthBlinding: { truthOpenedDuringOutput: false; receipts: number };
}> {
  const repoRoot = process.cwd();
  const cohortA = lockCohortA(repoRoot);
  if (!cohortA.allUnchanged) {
    throw new Error("Cohort A (existing 30) hash lock failed — aborting without modifying originals");
  }

  const catalog = buildDeficit120Catalog().slice(0, args?.limit ?? BATCH10_COHORT_B_TARGET);
  const coverage = coverageMatrixFromCatalog(catalog);
  const sourceRoot = path.join(repoRoot, BATCH10_DEFICIT_SOURCE_ROOT);
  const candidateRoot = path.join(repoRoot, BATCH10_DEFICIT_CANDIDATE_ROOT);
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(candidateRoot, { recursive: true });

  const checkpointPath = path.join(sourceRoot, "_checkpoint.json");
  const processed = new Set<string>();
  if (args?.resume && fs.existsSync(checkpointPath)) {
    const ck = JSON.parse(fs.readFileSync(checkpointPath, "utf8")) as { processedCaseIds: string[] };
    for (const id of ck.processedCaseIds ?? []) processed.add(id);
  }

  const acceptedB: Array<{ caseId: string; packetSha256: string; relativePath: string }> = [];
  const rejectedB: Array<{ caseId: string; reasons: string[] }> = [];
  const packetsB: Batch10StructuredCasePacket[] = [];
  const truthReceipts: Array<{ caseId: string; truthKeySha256: string }> = [];
  const pdfHashes = new Set<string>();
  const wordingHashes = new Set<string>();

  for (const spec of catalog) {
    if (processed.has(spec.caseId)) {
      const existing = path.join(candidateRoot, spec.caseId, "structured-case-packet.json");
      if (fs.existsSync(existing)) {
        const packet = JSON.parse(fs.readFileSync(existing, "utf8")) as Batch10StructuredCasePacket;
        const reasons = strictValidateDeficitPacket(packet);
        if (!reasons.length) {
          packetsB.push(packet);
          if (packet.preservedOriginalHashes.bundlePdfSha256) {
            pdfHashes.add(packet.preservedOriginalHashes.bundlePdfSha256);
          }
          for (const c of packet.chargeInstruments) {
            if (c.exactWording) wordingHashes.add(sha256(c.exactWording));
          }
          acceptedB.push({
            caseId: spec.caseId,
            packetSha256: sha256(fs.readFileSync(existing)),
            relativePath: path.relative(repoRoot, existing).replace(/\\/g, "/"),
          });
        } else {
          rejectedB.push({ caseId: spec.caseId, reasons });
        }
      }
      continue;
    }

    const source = buildDeficit120Source(spec);
    let capture;
    try {
      capture = await captureDeficit120Case({
        spec,
        source,
        sourceRootAbs: sourceRoot,
      });
    } catch (e) {
      rejectedB.push({
        caseId: spec.caseId,
        reasons: [`capture_failed:${e instanceof Error ? e.message : String(e)}`],
      });
      processed.add(spec.caseId);
      writeJson(checkpointPath, {
        schemaVersion: "deficit120-checkpoint@1.0.0",
        processedCaseIds: [...processed].sort(),
      });
      continue;
    }
    truthReceipts.push({ caseId: spec.caseId, truthKeySha256: capture.truthKeySha256 });
    pdfHashes.add(capture.bundlePdfSha256);

    const mat = materialiseStructuredPacket({
      caseId: spec.caseId,
      sourceLaneId: "stage150_deficit120_controlled",
      sourceDir: capture.sourceDir,
    });
    if (!mat.ok) {
      rejectedB.push({ caseId: spec.caseId, reasons: mat.reasons });
      processed.add(spec.caseId);
      writeJson(checkpointPath, {
        schemaVersion: "deficit120-checkpoint@1.0.0",
        processedCaseIds: [...processed].sort(),
      });
      continue;
    }

    const stable = { ...mat.packet, materialisedAt: "STABLE" };
    const packetSha = sha256(`${JSON.stringify(stable, null, 2)}\n`);
    const deterministic: Batch10StructuredCasePacket = {
      ...mat.packet,
      materialisedAt: `deterministic:${packetSha.slice(0, 16)}`,
      sourceLaneId: "stage150_deficit120_controlled",
    };

    const reasons = strictValidateDeficitPacket(deterministic);
    if (reasons.length) {
      rejectedB.push({ caseId: spec.caseId, reasons });
      // Still write rejected packet for audit, outside accepted count
      writeJson(path.join(candidateRoot, "_rejected", spec.caseId, "structured-case-packet.json"), deterministic);
      writeJson(path.join(candidateRoot, "_rejected", spec.caseId, "reject-reasons.json"), { reasons });
    } else {
      for (const c of deterministic.chargeInstruments) {
        if (c.exactWording) wordingHashes.add(sha256(c.exactWording));
      }
      const outPath = path.join(candidateRoot, spec.caseId, "structured-case-packet.json");
      writeJson(outPath, deterministic);
      packetsB.push(deterministic);
      acceptedB.push({
        caseId: spec.caseId,
        packetSha256: sha256(fs.readFileSync(outPath)),
        relativePath: path.relative(repoRoot, outPath).replace(/\\/g, "/"),
      });
    }

    processed.add(spec.caseId);
    writeJson(checkpointPath, {
      schemaVersion: "deficit120-checkpoint@1.0.0",
      processedCaseIds: [...processed].sort(),
      acceptedCount: acceptedB.length,
      rejectedCount: rejectedB.length,
    });
  }

  // Near-duplicate rejection among accepted B
  const dups = detectNearDuplicates(packetsB);
  if (dups.length) {
    for (const g of dups) {
      // keep first, reject rest
      for (const id of g.caseIds.slice(1)) {
        rejectedB.push({ caseId: id, reasons: [`near_duplicate_of:${g.caseIds[0]}`] });
        const idx = acceptedB.findIndex((a) => a.caseId === id);
        if (idx >= 0) acceptedB.splice(idx, 1);
        const pidx = packetsB.findIndex((p) => p.caseId === id);
        if (pidx >= 0) packetsB.splice(pidx, 1);
      }
    }
  }

  const populationCount = cohortA.count + acceptedB.length;
  const fingerprints = new Set(packetsB.map(nearDuplicateFingerprint));

  return {
    cohortA,
    acceptedB,
    rejectedB,
    coverage,
    nearDuplicates: detectNearDuplicates(packetsB),
    adapterDryRunSample: packetsB[0] ? adapterDryRun(packetsB[0]!) : null,
    populationCount,
    readinessMet:
      populationCount >= BATCH10_POPULATION_TARGET && acceptedB.length >= BATCH10_COHORT_B_TARGET,
    populationPacketReadinessMet:
      populationCount >= BATCH10_POPULATION_TARGET && acceptedB.length >= BATCH10_COHORT_B_TARGET,
    deficit: Math.max(0, BATCH10_POPULATION_TARGET - populationCount),
    uniqueness: {
      uniqueCaseIds: acceptedB.length,
      uniqueSourcePdfHashes: pdfHashes.size,
      uniqueChargeWordingHashes: wordingHashes.size,
      uniqueFingerprints: fingerprints.size,
      normalisedTemplateId: "deficit120-disclosure-v1",
    },
    truthBlinding: { truthOpenedDuringOutput: false, receipts: truthReceipts.length },
  };
}

export function cohortAPaths(repoRoot: string): string[] {
  return lockCohortA(repoRoot).locks.map((l) => l.relativePath);
}
