/**
 * Truth-open gate — allowed only after candidate freeze.
 * Verifies truth file hashes; does not rewrite freeze receipts.
 */

import fs from "node:fs";

import { sha256File } from "./hashes";
import { resolveCasePath } from "./shard-manifest";
import type { CandidateFreezeReceipt, FrozenShardManifest, HashVerificationResult } from "./types";

export type TruthOpenResult = {
  opened: true;
  openedAfterCandidateFreeze: true;
  candidateFreezeSha256: string;
  truthVerifications: HashVerificationResult[];
};

export function openTruthAfterFreeze(input: {
  repoRoot: string;
  manifest: FrozenShardManifest;
  freeze: CandidateFreezeReceipt;
}): TruthOpenResult {
  if (input.freeze.truthOpened !== false) {
    throw new Error("refuse truth open: freeze receipt already marked truthOpened");
  }
  if (input.freeze.shardId !== input.manifest.shardId) {
    throw new Error("refuse truth open: freeze shardId mismatch");
  }

  const truthVerifications: HashVerificationResult[] = [];
  for (const row of input.manifest.cases) {
    if (!row.truthRelativePath || !row.truthSha256) {
      truthVerifications.push({
        kind: "truth",
        relativePath: row.truthRelativePath ?? "",
        expectedSha256: row.truthSha256 ?? "",
        actualSha256: null,
        ok: true,
        reason: "truth not declared — skip open",
      });
      continue;
    }
    const abs = resolveCasePath(input.repoRoot, row.truthRelativePath);
    if (!abs || !fs.existsSync(abs)) {
      truthVerifications.push({
        kind: "truth",
        relativePath: row.truthRelativePath,
        expectedSha256: row.truthSha256,
        actualSha256: null,
        ok: false,
        reason: "truth file missing at open",
      });
      continue;
    }
    // Hash verify, then read (open) contents to prove sequencing — foundation only.
    const actual = sha256File(abs);
    const ok = actual === row.truthSha256;
    // Touch-read to mark open without retaining bulk in memory beyond this call.
    if (ok) fs.readFileSync(abs, "utf8");
    truthVerifications.push({
      kind: "truth",
      relativePath: row.truthRelativePath,
      expectedSha256: row.truthSha256,
      actualSha256: actual,
      ok,
      reason: ok ? null : "truth hash mismatch at open",
    });
  }

  return {
    opened: true,
    openedAfterCandidateFreeze: true,
    candidateFreezeSha256: input.freeze.candidatesSha256,
    truthVerifications,
  };
}

export function refuseTruthOpenWithoutFreeze(): never {
  throw new Error("truth open refused: candidate freeze required first");
}
