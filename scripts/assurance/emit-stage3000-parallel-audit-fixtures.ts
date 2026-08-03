/**
 * Materialise tiny synthetic fixtures for the Stage-3000 parallel audit foundation.
 * Does NOT run the real corpus.
 *
 * Usage: npx tsx scripts/assurance/emit-stage3000-parallel-audit-fixtures.ts
 */

import path from "node:path";

import { materialiseSyntheticFixtures } from "../../lib/eval/stage3000-parallel-audit";

const repoRoot = process.cwd();
const out = materialiseSyntheticFixtures(repoRoot);
console.log(
  JSON.stringify(
    {
      status: "fixtures_materialised",
      manifestRel: out.manifestRel,
      shardId: out.manifest.shardId,
      caseCount: out.manifest.shardCaseCount,
      orderedMembershipSha256: out.manifest.orderedMembershipSha256,
      baselineCommit: out.manifest.baselineCommit,
      note: "Synthetic only — no real corpus run, no PASS claim.",
      absManifest: path.join(repoRoot, out.manifestRel),
    },
    null,
    2,
  ),
);
