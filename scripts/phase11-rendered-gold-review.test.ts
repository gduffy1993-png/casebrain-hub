/**
 * Phase 11 — focused contracts (freeze/render/awaiting-human; no fabricated sign-off).
 * Run: npx tsx scripts/phase11-rendered-gold-review.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CANONICAL_MATTER_STATE_VERSION } from "@/lib/criminal/canonical-matter-state";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";

assert.equal(CANONICAL_MATTER_STATE_VERSION, "1.1.0");
assert.equal(phase2CentralSurfaceIds().length, 31);

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11");

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

const frozen = JSON.parse(fs.readFileSync(path.join(OUT, "gold-sample-frozen.json"), "utf8")) as {
  frozen: boolean;
  freezeHash: string;
  samples: Array<{ goldId: string; stratum: string }>;
};
assert.equal(frozen.frozen, true);
assert.ok(frozen.freezeHash.length >= 32);
assert.ok(frozen.samples.length >= 30 && frozen.samples.length <= 50);

const strata = new Set(frozen.samples.map((s) => s.stratum));
for (const required of [
  "accepted_clean",
  "blocked_containment",
  "review_required",
  "uncertain_family",
  "offence_family",
  "provenance",
  "omission_truncation",
  "hearing_time",
  "copy_export_api",
  "composed_prose",
]) {
  assert.ok(strata.has(required), `missing stratum ${required}`);
}

for (const s of frozen.samples) {
  assert.ok(fs.existsSync(path.join(OUT, "rendered", `${s.goldId}.md`)), `missing render ${s.goldId}`);
}

const human = JSON.parse(fs.readFileSync(path.join(OUT, "human-judgment-workbook.json"), "utf8")) as {
  status: string;
  judgments: Array<{
    reviewerIdentity: string | null;
    reviewerDecision: string | null;
    expectedClassification: string | null;
    actualClassification: string | null;
  }>;
  reviewerRoster: { completedBy: string | null };
};
assert.equal(human.status, "AWAITING_HUMAN_GOLD_REVIEW");
assert.equal(human.reviewerRoster.completedBy, null);
assert.ok(human.judgments.every((j) => j.reviewerIdentity == null && j.reviewerDecision == null));
assert.ok(human.judgments.every((j) => j.expectedClassification == null && j.actualClassification == null));

const auto = JSON.parse(fs.readFileSync(path.join(OUT, "automated-predictions.json"), "utf8")) as {
  separationRule: string;
  predictions: unknown[];
};
assert.match(auto.separationRule, /AUTOMATED ONLY/i);
assert.equal(auto.predictions.length, frozen.samples.length);

const report = JSON.parse(fs.readFileSync(path.join(OUT, "phase11-rendered-gold-report.json"), "utf8")) as {
  status: string;
  programmePassSupported: boolean;
  contractPass: boolean;
};
assert.equal(report.status, "AWAITING_HUMAN_GOLD_REVIEW");
assert.equal(report.programmePassSupported, false);
assert.equal(report.contractPass, true);

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaVersion: CANONICAL_MATTER_STATE_VERSION,
      centralSurfaces: phase2CentralSurfaceIds().length,
      ledgerStatus: ledger.status,
      sampleSize: frozen.samples.length,
      status: report.status,
      programmePassSupported: report.programmePassSupported,
    },
    null,
    2,
  ),
);
