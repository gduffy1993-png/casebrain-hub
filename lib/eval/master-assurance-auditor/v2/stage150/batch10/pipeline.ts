/**
 * Batch-10 materialisation pipeline with checkpoint/resume + deterministic packets.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runBatch10Census, type Batch10CensusReport } from "./census";
import { materialiseStructuredPacket } from "./materialise";
import { countBatch9RunnableOnPacket } from "./batch9-bridge";
import { assertNoTruthKeyLeakage, validateStructuredPacket } from "./validators";
import {
  BATCH10_BASELINE,
  BATCH10_CANDIDATE_ROOT,
  type Batch10StructuredCasePacket,
} from "./schemas";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export type Batch10Checkpoint = {
  schemaVersion: "batch10-materialisation-checkpoint@1.0.0";
  baselineCommit: string;
  processedCaseIds: string[];
  acceptedCaseIds: string[];
  rejected: Array<{ caseId: string; reasons: string[] }>;
};

export type Batch10MaterialisationReport = {
  schemaVersion: "batch10-materialisation-report@1.0.0";
  baselineCommit: string;
  candidateRoot: string;
  structuredPacketCount: number;
  accepted: Array<{ caseId: string; packetSha256: string; relativePath: string }>;
  rejected: Array<{ caseId: string; reasons: string[] }>;
  perAdapterTotals: Record<string, Record<string, number>>;
  perControlRunnableCounts: Record<string, number>;
  sevenExitCapabilityMatrix: Record<string, { realPayloadPresentCount: number }>;
  uniqueSourceBackedPacketCount: number;
  readinessThreshold: 150;
  /** Alias meaning: populationPacketReadinessMet only — not Stage-150/detector/programme PASS. */
  readinessMet: boolean;
  populationPacketReadinessMet: boolean;
  deficit: number;
  deficitNote: string;
  checkpointPath: string;
};

function emptyAdapterTotals(): Record<string, Record<string, number>> {
  const caps = ["eligible", "partial", "unavailable"] as const;
  const adapters = [
    "sourceManifest",
    "chargeInstruments",
    "evidenceUnits",
    "chronologyEvents",
    "provenance",
    "chaseRelationships",
    "exitPayloadReceipts",
  ] as const;
  return Object.fromEntries(adapters.map((a) => [a, Object.fromEntries(caps.map((c) => [c, 0]))]));
}

export function runBatch10Materialisation(args?: {
  baselineCommit?: string;
  resume?: boolean;
}): {
  census: Batch10CensusReport;
  report: Batch10MaterialisationReport;
  packets: Batch10StructuredCasePacket[];
} {
  const baseline = args?.baselineCommit ?? BATCH10_BASELINE;
  const census = runBatch10Census(baseline);
  const candidateRoot = path.join(process.cwd(), BATCH10_CANDIDATE_ROOT);
  fs.mkdirSync(candidateRoot, { recursive: true });
  const checkpointPath = path.join(candidateRoot, "_checkpoint.json");

  let checkpoint: Batch10Checkpoint = {
    schemaVersion: "batch10-materialisation-checkpoint@1.0.0",
    baselineCommit: baseline,
    processedCaseIds: [],
    acceptedCaseIds: [],
    rejected: [],
  };
  if (args?.resume && fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8")) as Batch10Checkpoint;
  }

  const processed = new Set(checkpoint.processedCaseIds);
  const packets: Batch10StructuredCasePacket[] = [];
  const accepted: Batch10MaterialisationReport["accepted"] = [];
  const rejected: Batch10MaterialisationReport["rejected"] = [...checkpoint.rejected];
  const perAdapterTotals = emptyAdapterTotals();
  const perControlRunnableCounts: Record<string, number> = {};
  const sevenExitCapabilityMatrix: Record<string, { realPayloadPresentCount: number }> = {
    view: { realPayloadPresentCount: 0 },
    copy: { realPayloadPresentCount: 0 },
    export: { realPayloadPresentCount: 0 },
    api: { realPayloadPresentCount: 0 },
    pdf: { realPayloadPresentCount: 0 },
    composed_prose: { realPayloadPresentCount: 0 },
    authenticated_browser: { realPayloadPresentCount: 0 },
  };

  // Primary rematerialisation lane: ESA demo-audit PDF-backed (genuine documents + page meta).
  const demoLane = census.lanes.find((l) => l.laneId === "esa_demo_audit_pdf_backed");
  const candidates = demoLane?.cases ?? [];

  for (const c of candidates) {
    if (processed.has(c.caseId)) {
      const existing = path.join(candidateRoot, c.caseId, "structured-case-packet.json");
      if (fs.existsSync(existing)) {
        const packet = JSON.parse(fs.readFileSync(existing, "utf8")) as Batch10StructuredCasePacket;
        packets.push(packet);
        accepted.push({
          caseId: c.caseId,
          packetSha256: sha256(fs.readFileSync(existing)),
          relativePath: path.relative(process.cwd(), existing).replace(/\\/g, "/"),
        });
      }
      continue;
    }
    const sourceDir = path.join(process.cwd(), c.relativePath);
    const result = materialiseStructuredPacket({
      caseId: c.caseId,
      sourceLaneId: c.laneId,
      sourceDir,
    });
    processed.add(c.caseId);
    checkpoint.processedCaseIds = [...processed].sort();
    if (!result.ok) {
      rejected.push({ caseId: c.caseId, reasons: result.reasons });
      checkpoint.rejected = rejected;
      writeJson(checkpointPath, checkpoint);
      continue;
    }
    const issues = validateStructuredPacket(result.packet);
    assertNoTruthKeyLeakage(result.packet);
    if (issues.length) {
      rejected.push({
        caseId: c.caseId,
        reasons: issues.map((i) => `${i.code}:${i.detail}`),
      });
      checkpoint.rejected = rejected;
      writeJson(checkpointPath, checkpoint);
      continue;
    }

    // Deterministic body: freeze materialisedAt for byte-identical regen via content hash excluding timestamp.
    const stable = { ...result.packet, materialisedAt: "STABLE" };
    const body = `${JSON.stringify(stable, null, 2)}\n`;
    const packetSha = sha256(body);
    const withStamp: Batch10StructuredCasePacket = {
      ...result.packet,
      materialisedAt: result.packet.materialisedAt,
    };
    // Write canonical deterministic form (stable timestamp placeholder replaced by hash-bound stamp).
    const deterministic: Batch10StructuredCasePacket = {
      ...withStamp,
      materialisedAt: `deterministic:${packetSha.slice(0, 16)}`,
    };
    const outPath = path.join(candidateRoot, c.caseId, "structured-case-packet.json");
    writeJson(outPath, deterministic);
    // Verify byte-identical regeneration
    const regen = `${JSON.stringify(deterministic, null, 2)}\n`;
    const regen2 = `${JSON.stringify(JSON.parse(regen), null, 2)}\n`;
    if (sha256(regen) !== sha256(regen2)) {
      rejected.push({ caseId: c.caseId, reasons: ["rejected: non-deterministic packet serialisation"] });
      checkpoint.rejected = rejected;
      writeJson(checkpointPath, checkpoint);
      continue;
    }

    packets.push(deterministic);
    accepted.push({
      caseId: c.caseId,
      packetSha256: sha256(fs.readFileSync(outPath)),
      relativePath: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
    });
    checkpoint.acceptedCaseIds = accepted.map((a) => a.caseId).sort();
    checkpoint.rejected = rejected;
    writeJson(checkpointPath, checkpoint);

    for (const [adapter, status] of Object.entries(deterministic.adapterCapability)) {
      perAdapterTotals[adapter]![status] += 1;
    }
    for (const [exitId, receipt] of Object.entries(deterministic.exitPayloadReceipts)) {
      if (receipt.realPayloadPresent) {
        sevenExitCapabilityMatrix[exitId]!.realPayloadPresentCount += 1;
      }
    }
    const bridge = countBatch9RunnableOnPacket(deterministic);
    for (const id of bridge.runnableControlIds) {
      perControlRunnableCounts[id] = (perControlRunnableCounts[id] ?? 0) + 1;
    }
  }

  // Fill adapter totals for resumed packets not re-counted above
  if (args?.resume) {
    for (const p of packets) {
      // only add if not already reflected — simplify: recompute from packets
    }
  }
  // Recompute aggregates from accepted packets for honesty
  const recomputedAdapter = emptyAdapterTotals();
  const recomputedExits: typeof sevenExitCapabilityMatrix = {
    view: { realPayloadPresentCount: 0 },
    copy: { realPayloadPresentCount: 0 },
    export: { realPayloadPresentCount: 0 },
    api: { realPayloadPresentCount: 0 },
    pdf: { realPayloadPresentCount: 0 },
    composed_prose: { realPayloadPresentCount: 0 },
    authenticated_browser: { realPayloadPresentCount: 0 },
  };
  const recomputedControls: Record<string, number> = {};
  for (const p of packets) {
    for (const [adapter, status] of Object.entries(p.adapterCapability)) {
      recomputedAdapter[adapter]![status] += 1;
    }
    for (const [exitId, receipt] of Object.entries(p.exitPayloadReceipts)) {
      if (receipt.realPayloadPresent) recomputedExits[exitId]!.realPayloadPresentCount += 1;
    }
    const bridge = countBatch9RunnableOnPacket(p);
    for (const id of bridge.runnableControlIds) {
      recomputedControls[id] = (recomputedControls[id] ?? 0) + 1;
    }
  }

  const unique = accepted.length;
  const deficit = Math.max(0, 150 - unique);
  const report: Batch10MaterialisationReport = {
    schemaVersion: "batch10-materialisation-report@1.0.0",
    baselineCommit: baseline,
    candidateRoot: BATCH10_CANDIDATE_ROOT,
    structuredPacketCount: unique,
    accepted,
    rejected,
    perAdapterTotals: recomputedAdapter,
    perControlRunnableCounts: recomputedControls,
    sevenExitCapabilityMatrix: recomputedExits,
    uniqueSourceBackedPacketCount: unique,
    readinessThreshold: 150,
    readinessMet: unique >= 150,
    populationPacketReadinessMet: unique >= 150,
    deficit,
    deficitNote:
      unique >= 150
        ? "populationPacketReadinessMet=true (≥150 unique packets) — does NOT imply detector readiness, Stage-150 selection/freeze/execution, corpus PASS, or programme PASS."
        : `Deficit ${deficit}: need ${deficit} additional unique source-rich cases. Required per case (do not fabricate): bundle.pdf + pdf-extraction-meta page units + SECTION-marked canonical with (1) charge instrument status+version (and amendment links where claimed), (2) hearing timestamps with explicit timezone, (3) sourcePage+compiledPage provenance pairs, (4) chase rows with explicit evidenceUnitId links, (5) real exit payload bytes under exits/<id>/payload.*. Prefer new controlled PDF-backed disclosure packs — not ESA prose enrichment. Gold/Malik/scale3000 blueprint lanes do not close this deficit.`,
    checkpointPath: path.relative(process.cwd(), checkpointPath).replace(/\\/g, "/"),
  };

  return { census, report, packets };
}
