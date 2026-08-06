/**
 * Phase 10 — focused contracts.
 * Run: npx tsx scripts/phase10-mutation-adversarial.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CANONICAL_MATTER_STATE_VERSION } from "@/lib/criminal/canonical-matter-state";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";

assert.equal(CANONICAL_MATTER_STATE_VERSION, "1.1.0");
assert.equal(phase2CentralSurfaceIds().length, 31);

const ROOT = path.resolve(__dirname, "..");
const ledger = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"),
    "utf8",
  ),
) as {
  status: string;
  prior72RawMarkerMap: { balanced: boolean };
  prior28TruncMap: { balanced: boolean };
  current42RawSources: { count: number };
  current55TruncSources: { count: number };
};
assert.equal(ledger.status, "LEDGER_BALANCED");
assert.equal(ledger.prior72RawMarkerMap.balanced, true);
assert.equal(ledger.prior28TruncMap.balanced, true);
assert.equal(ledger.current42RawSources.count, 42);
assert.equal(ledger.current55TruncSources.count, 55);

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaVersion: CANONICAL_MATTER_STATE_VERSION,
      centralSurfaces: phase2CentralSurfaceIds().length,
      ledgerStatus: ledger.status,
    },
    null,
    2,
  ),
);
