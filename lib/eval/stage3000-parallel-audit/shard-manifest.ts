/**
 * Consume and validate frozen shard manifests.
 * Manifests are immutable inputs — never rewritten by the runner.
 */

import fs from "node:fs";
import path from "node:path";

import {
  S3000_SHARD_MANIFEST_SCHEMA,
  SURFACE_IDS,
  type SurfaceId,
} from "./constants";
import { orderedMembershipSha256 } from "./hashes";
import type { FrozenShardManifest, ShardCaseRow, SurfaceAvailability } from "./types";

function isSurfaceAvailability(v: unknown): v is SurfaceAvailability {
  return (
    v === "available" ||
    v === "unavailable" ||
    v === "not_exercised" ||
    v === "partial"
  );
}

function assertSurfaces(
  caseId: string,
  surfaces: unknown,
): Record<SurfaceId, SurfaceAvailability> {
  if (surfaces == null || typeof surfaces !== "object") {
    throw new Error(`shard case ${caseId}: surfaces missing`);
  }
  const s = surfaces as Record<string, unknown>;
  const out = {} as Record<SurfaceId, SurfaceAvailability>;
  for (const id of SURFACE_IDS) {
    if (!isSurfaceAvailability(s[id])) {
      throw new Error(`shard case ${caseId}: surface ${id} missing or invalid`);
    }
    out[id] = s[id];
  }
  return out;
}

function parseCaseRow(raw: unknown, expectedShardId: string): ShardCaseRow {
  if (raw == null || typeof raw !== "object") throw new Error("invalid case row");
  const r = raw as Record<string, unknown>;
  const caseId = String(r.caseId ?? "");
  if (!caseId) throw new Error("case row missing caseId");
  if (String(r.shardId ?? "") !== expectedShardId) {
    throw new Error(`case ${caseId}: shardId mismatch`);
  }
  return {
    orderIndex: Number(r.orderIndex),
    caseId,
    shardId: expectedShardId,
    packetRelativePath: String(r.packetRelativePath ?? ""),
    packetSha256: String(r.packetSha256 ?? ""),
    sourceRelativePath: (r.sourceRelativePath as string | null) ?? null,
    sourceSha256: (r.sourceSha256 as string | null) ?? null,
    outputRelativePath: (r.outputRelativePath as string | null) ?? null,
    outputSha256: (r.outputSha256 as string | null) ?? null,
    truthRelativePath: (r.truthRelativePath as string | null) ?? null,
    truthSha256: (r.truthSha256 as string | null) ?? null,
    surfaces: assertSurfaces(caseId, r.surfaces),
  };
}

export function loadFrozenShardManifest(absPath: string): FrozenShardManifest {
  if (!fs.existsSync(absPath)) {
    throw new Error(`shard manifest not found: ${absPath}`);
  }
  const doc = JSON.parse(fs.readFileSync(absPath, "utf8")) as Record<string, unknown>;
  if (doc.schemaVersion !== S3000_SHARD_MANIFEST_SCHEMA) {
    throw new Error(
      `unexpected shard schema ${String(doc.schemaVersion)} (want ${S3000_SHARD_MANIFEST_SCHEMA})`,
    );
  }
  const shardId = String(doc.shardId ?? "");
  if (!shardId) throw new Error("shard manifest missing shardId");
  const casesRaw = Array.isArray(doc.cases) ? doc.cases : [];
  const cases = casesRaw.map((c) => parseCaseRow(c, shardId));
  if (cases.length !== Number(doc.shardCaseCount)) {
    throw new Error(
      `shardCaseCount ${String(doc.shardCaseCount)} ≠ cases.length ${cases.length}`,
    );
  }
  // Verify order indexes are contiguous from 0
  for (let i = 0; i < cases.length; i++) {
    if (cases[i]!.orderIndex !== i) {
      throw new Error(`case orderIndex gap at ${i}: got ${cases[i]!.orderIndex}`);
    }
  }
  const expectedMembership = orderedMembershipSha256(
    cases.map((c) => c.caseId),
    cases.map((c) => c.packetSha256),
  );
  if (expectedMembership !== String(doc.orderedMembershipSha256)) {
    throw new Error(
      `orderedMembershipSha256 mismatch: manifest=${String(doc.orderedMembershipSha256)} recomputed=${expectedMembership}`,
    );
  }
  return {
    schemaVersion: S3000_SHARD_MANIFEST_SCHEMA,
    shardId,
    frozenAt: String(doc.frozenAt ?? ""),
    baselineCommit: String(doc.baselineCommit ?? ""),
    populationTarget: Number(doc.populationTarget),
    shardCaseCount: cases.length,
    orderedMembershipSha256: expectedMembership,
    cases,
    note: String(doc.note ?? ""),
  };
}

export function resolveCasePath(
  repoRoot: string,
  relativePath: string | null,
): string | null {
  if (!relativePath) return null;
  return path.join(repoRoot, relativePath);
}
