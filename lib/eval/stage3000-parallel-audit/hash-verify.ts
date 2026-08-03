/**
 * Verify source / output / truth / packet hashes against the frozen shard manifest.
 */

import fs from "node:fs";

import { sha256File } from "./hashes";
import { resolveCasePath } from "./shard-manifest";
import type { FrozenShardManifest, HashVerificationResult, ShardCaseRow } from "./types";

function verifyOne(
  repoRoot: string,
  kind: HashVerificationResult["kind"],
  relativePath: string | null,
  expectedSha256: string | null,
): HashVerificationResult {
  if (!relativePath || !expectedSha256) {
    return {
      kind,
      relativePath: relativePath ?? "",
      expectedSha256: expectedSha256 ?? "",
      actualSha256: null,
      ok: true,
      reason: relativePath ? null : `${kind} not declared on shard row`,
    };
  }
  const abs = resolveCasePath(repoRoot, relativePath);
  if (!abs || !fs.existsSync(abs)) {
    return {
      kind,
      relativePath,
      expectedSha256,
      actualSha256: null,
      ok: false,
      reason: `${kind} file missing: ${relativePath}`,
    };
  }
  const actual = sha256File(abs);
  return {
    kind,
    relativePath,
    expectedSha256,
    actualSha256: actual,
    ok: actual === expectedSha256,
    reason: actual === expectedSha256 ? null : `${kind} hash mismatch`,
  };
}

export function verifyCaseHashes(
  repoRoot: string,
  row: ShardCaseRow,
): HashVerificationResult[] {
  return [
    verifyOne(repoRoot, "packet", row.packetRelativePath, row.packetSha256),
    verifyOne(repoRoot, "source", row.sourceRelativePath, row.sourceSha256),
    verifyOne(repoRoot, "output", row.outputRelativePath, row.outputSha256),
    // Truth hash is verified as a file identity check only — contents are not opened here.
    verifyOne(repoRoot, "truth", row.truthRelativePath, row.truthSha256),
  ];
}

export function verifyShardHashes(
  repoRoot: string,
  manifest: FrozenShardManifest,
): { results: HashVerificationResult[]; failures: HashVerificationResult[] } {
  const results: HashVerificationResult[] = [];
  for (const row of manifest.cases) {
    results.push(...verifyCaseHashes(repoRoot, row));
  }
  return { results, failures: results.filter((r) => !r.ok) };
}
