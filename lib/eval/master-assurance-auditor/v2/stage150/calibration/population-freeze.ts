/**
 * Stage-150 calibration — freeze exact ordered membership of the accepted 150-packet population
 * before any detector execution or truth open. Never rewrite frozen packets.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  POPULATION_MANIFEST_REL,
  POPULATION_TARGET,
  STAGE150_CALIBRATION_BASELINE,
  STAGE150_PACKET_SCHEMA,
} from "./constants";
import type { Batch10StructuredCasePacket } from "../batch10/schemas";
import { BATCH10_EXIT_IDS } from "../batch10/schemas";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export type PopulationManifestEntry = {
  caseId: string;
  cohort: string;
  packetSha256: string;
  relativePath: string;
};

export type FrozenMembershipRow = {
  orderIndex: number;
  caseId: string;
  cohort: "A" | "B";
  packetRelativePath: string;
  packetSha256: string;
  sourceCasePath: string | null;
  pdfSha256: string | null;
  canonicalBundleSha256: string | null;
  casebrainOutputRelativePath: string | null;
  casebrainOutputSha256: string | null;
  sourceFingerprintInputs: {
    bundlePdfSha256: string | null;
    canonicalBundleSha256: string | null;
  };
  family: string | null;
  variant: string | null;
  exitClasses: Record<
    string,
    "genuine_production_payload" | "unavailable" | "not_exercised"
  >;
};

export type PopulationFreezeReceipt = {
  schemaVersion: "stage150-population-freeze@1.0.0";
  runId: string;
  frozenAt: string;
  baselineCommit: typeof STAGE150_CALIBRATION_BASELINE;
  headCommit: string;
  packetSchemaVersion: typeof STAGE150_PACKET_SCHEMA;
  registryNote: "161 Stage-150 registered controls via buildV2Controls / implementation matrix";
  populationTarget: typeof POPULATION_TARGET;
  populationCount: number;
  orderedMembershipSha256: string;
  membership: FrozenMembershipRow[];
  coverage: {
    byCohort: Record<string, number>;
    byFamily: Record<string, number>;
    byVariant: Record<string, number>;
  };
  exitDenominators: {
    sixProductionExits: {
      genuinePerExit: number;
      unavailablePerExit: number;
      note: string;
    };
    authenticated_browser: { not_exercised: number };
  };
  note: string;
};

function classifyExit(
  packet: Batch10StructuredCasePacket,
  exitId: (typeof BATCH10_EXIT_IDS)[number],
): "genuine_production_payload" | "unavailable" | "not_exercised" {
  if (exitId === "authenticated_browser") return "not_exercised";
  const r = packet.exitPayloadReceipts[exitId];
  if (r?.realPayloadPresent && r.payloadIdentity && !r.metadataOnly) return "genuine_production_payload";
  return "unavailable";
}

function loadManifest(repoRoot: string): PopulationManifestEntry[] {
  const abs = path.join(repoRoot, POPULATION_MANIFEST_REL);
  const doc = JSON.parse(fs.readFileSync(abs, "utf8")) as {
    cohortA: PopulationManifestEntry[];
    cohortB: PopulationManifestEntry[];
    populationCount: number;
  };
  if (doc.populationCount !== POPULATION_TARGET) {
    throw new Error(`population-manifest count ${doc.populationCount} ≠ ${POPULATION_TARGET}`);
  }
  // Exact accepted order: Cohort A then Cohort B as recorded in the accepted manifest.
  return [...doc.cohortA, ...doc.cohortB];
}

function resolveOutputPath(
  repoRoot: string,
  packet: Batch10StructuredCasePacket,
  cohort: "A" | "B",
): { relativePath: string | null; abs: string | null; sha256: string | null } {
  if (cohort === "B" && packet.sourceCasePath) {
    const rel = path.join(packet.sourceCasePath, "casebrain-output.json").replace(/\\/g, "/");
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs)) {
      return { relativePath: rel, abs, sha256: sha256(fs.readFileSync(abs)) };
    }
  }
  // Cohort A has no production casebrain-output — detectors use structured-packet projection
  // written later under calibration work/ (never into frozen packet dirs).
  return { relativePath: null, abs: null, sha256: null };
}

function lineageFamily(repoRoot: string, caseId: string, cohort: "A" | "B"): {
  family: string | null;
  variant: string | null;
} {
  if (cohort !== "B") return { family: "esa_demo_audit", variant: null };
  const lineagePath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-sources",
    caseId,
    "lineage.json",
  );
  if (!fs.existsSync(lineagePath)) return { family: null, variant: null };
  const lin = JSON.parse(fs.readFileSync(lineagePath, "utf8")) as {
    family?: string;
    variant?: string;
  };
  return { family: lin.family ?? null, variant: lin.variant ?? null };
}

/**
 * Freeze membership. Does not open truth. Does not run detectors.
 */
export function freezeAcceptedPopulation(args: {
  repoRoot: string;
  headCommit: string;
  runId: string;
}): PopulationFreezeReceipt {
  const entries = loadManifest(args.repoRoot);
  if (entries.length !== POPULATION_TARGET) {
    throw new Error(`Expected ${POPULATION_TARGET} manifest entries, got ${entries.length}`);
  }

  const membership: FrozenMembershipRow[] = [];
  const byFamily: Record<string, number> = {};
  const byVariant: Record<string, number> = {};

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    const abs = path.join(args.repoRoot, e.relativePath);
    if (!fs.existsSync(abs)) throw new Error(`Missing frozen packet: ${e.relativePath}`);
    const buf = fs.readFileSync(abs);
    const actual = sha256(buf);
    if (actual !== e.packetSha256) {
      throw new Error(`Packet hash mismatch for ${e.caseId}: expected ${e.packetSha256} got ${actual}`);
    }
    const packet = JSON.parse(buf.toString("utf8")) as Batch10StructuredCasePacket;
    if (packet.schemaVersion !== STAGE150_PACKET_SCHEMA) {
      throw new Error(`Unexpected packet schema for ${e.caseId}: ${packet.schemaVersion}`);
    }
    if (packet.caseId !== e.caseId) throw new Error(`caseId mismatch in ${e.relativePath}`);

    const cohort: "A" | "B" = e.cohort.startsWith("A") ? "A" : "B";
    const out = resolveOutputPath(args.repoRoot, packet, cohort);
    const { family, variant } = lineageFamily(args.repoRoot, e.caseId, cohort);
    if (family) byFamily[family] = (byFamily[family] ?? 0) + 1;
    if (variant) byVariant[variant] = (byVariant[variant] ?? 0) + 1;

    const exitClasses = Object.fromEntries(
      BATCH10_EXIT_IDS.map((id) => [id, classifyExit(packet, id)]),
    ) as FrozenMembershipRow["exitClasses"];

    membership.push({
      orderIndex: i,
      caseId: e.caseId,
      cohort,
      packetRelativePath: e.relativePath.replace(/\\/g, "/"),
      packetSha256: actual,
      sourceCasePath: packet.sourceCasePath,
      pdfSha256: packet.preservedOriginalHashes.bundlePdfSha256,
      canonicalBundleSha256: packet.preservedOriginalHashes.canonicalBundleSha256,
      casebrainOutputRelativePath: out.relativePath,
      casebrainOutputSha256: out.sha256,
      sourceFingerprintInputs: {
        bundlePdfSha256: packet.preservedOriginalHashes.bundlePdfSha256,
        canonicalBundleSha256: packet.preservedOriginalHashes.canonicalBundleSha256,
      },
      family,
      variant,
      exitClasses,
    });
  }

  // Ordered membership hash excludes frozenAt / runId so re-validation is stable.
  const orderedBody = membership
    .map(
      (m) =>
        `${m.orderIndex}|${m.caseId}|${m.cohort}|${m.packetRelativePath}|${m.packetSha256}|${m.pdfSha256 ?? ""}|${m.casebrainOutputSha256 ?? ""}`,
    )
    .join("\n");
  const orderedMembershipSha256 = sha256(orderedBody);

  const cases = membership.length;
  return {
    schemaVersion: "stage150-population-freeze@1.0.0",
    runId: args.runId,
    frozenAt: new Date().toISOString(),
    baselineCommit: STAGE150_CALIBRATION_BASELINE,
    headCommit: args.headCommit,
    packetSchemaVersion: STAGE150_PACKET_SCHEMA,
    registryNote: "161 Stage-150 registered controls via buildV2Controls / implementation matrix",
    populationTarget: POPULATION_TARGET,
    populationCount: cases,
    orderedMembershipSha256,
    membership,
    coverage: {
      byCohort: {
        A: membership.filter((m) => m.cohort === "A").length,
        B: membership.filter((m) => m.cohort === "B").length,
      },
      byFamily,
      byVariant,
    },
    exitDenominators: {
      sixProductionExits: {
        genuinePerExit: membership.filter((m) => m.exitClasses.view === "genuine_production_payload")
          .length,
        unavailablePerExit: membership.filter((m) => m.exitClasses.view === "unavailable").length,
        note: "Each of view/copy/export/api/pdf/composed_prose shares this per-exit case split; never combine unavailable into PASS.",
      },
      authenticated_browser: { not_exercised: cases },
    },
    note:
      "Census of the accepted 150-packet Batch-10 population — not a cherry-picked subsample. stage150ExecutionAllowed remains false; this freeze authorises calibration measurement only.",
  };
}

export function revalidatePopulationFreeze(
  repoRoot: string,
  freeze: PopulationFreezeReceipt,
): { ok: boolean; orderedMembershipSha256: string; mismatches: string[] } {
  const mismatches: string[] = [];
  for (const m of freeze.membership) {
    const abs = path.join(repoRoot, m.packetRelativePath);
    if (!fs.existsSync(abs)) {
      mismatches.push(`missing:${m.caseId}`);
      continue;
    }
    const actual = sha256(fs.readFileSync(abs));
    if (actual !== m.packetSha256) mismatches.push(`hash_changed:${m.caseId}`);
  }
  const orderedBody = freeze.membership
    .map(
      (m) =>
        `${m.orderIndex}|${m.caseId}|${m.cohort}|${m.packetRelativePath}|${m.packetSha256}|${m.pdfSha256 ?? ""}|${m.casebrainOutputSha256 ?? ""}`,
    )
    .join("\n");
  const orderedMembershipSha256 = sha256(orderedBody);
  if (orderedMembershipSha256 !== freeze.orderedMembershipSha256) {
    mismatches.push("ordered_membership_sha_mismatch");
  }
  return { ok: mismatches.length === 0, orderedMembershipSha256, mismatches };
}
