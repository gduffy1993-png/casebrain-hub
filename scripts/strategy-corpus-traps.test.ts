#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { evaluateAllCorpusTraps } from "@/lib/eval/casebrain-auditor/strategy-corpus-traps";
import { evaluateAntiTautology } from "@/lib/eval/casebrain-auditor/strategy-corpus-anti-tautology";
import { generateManifestFromSeed } from "@/lib/eval/casebrain-auditor/strategy-corpus-manifest";
import { renderCorpusBundleText } from "@/lib/eval/casebrain-auditor/strategy-corpus-render";

for (const trap of evaluateAllCorpusTraps()) {
  assert.ok(trap.pass, `${trap.trapId}:\n  ${trap.failures.join("\n  ")}`);
}

// Manifest-only stub must fail anti-tautology
const stubManifest = generateManifestFromSeed(99, "discovery", "manifest-only");
const stubText = renderCorpusBundleText(stubManifest);
const stubAnti = evaluateAntiTautology(stubManifest.caseId, "stub", stubText);
assert.ok(stubAnti.failures.length > 0, "manifest-only stub should fail anti-tautology");

console.log(`strategy-corpus-traps.test.ts: ok (${evaluateAllCorpusTraps().length} traps)`);
