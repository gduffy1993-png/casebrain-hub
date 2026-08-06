/**
 * Phase 11 remediation focused contracts (v1→v4 chain).
 * Run: npx tsx scripts/phase11-remediation.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CANONICAL_MATTER_STATE_VERSION } from "@/lib/criminal/canonical-matter-state";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { gateSolicitorOutput, resolveGateOffenceFamily } from "@/lib/criminal/solicitor-output-gate";
import { solicitorVisibleEvidenceTitle } from "@/lib/criminal/extraction-provenance-boundary";
import {
  NEUTRAL_SOLICITOR_BLOCKED_BANNER,
  hasMatterFamilyResolvedUnresolvedContradiction,
  requiresQualifiedSolicitorReviewQueue,
  sanitizeSolicitorProse,
} from "@/lib/criminal/solicitor-visible-sanitization";
import { hasIncompleteRequiredDisclaimer } from "@/lib/criminal/solicitor-visible-boundary";

assert.equal(CANONICAL_MATTER_STATE_VERSION, "1.1.0");
assert.equal(phase2CentralSurfaceIds().length, 31);

const ROOT = path.resolve(__dirname, "..");
const V1 = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11-remediation");
const V1_HASH = "619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a";
const V2_HASH = "fcdd13e53f35a61fb1a2bf2f0faa7347ec896b1d28bd9098609ac486ab0b64c0";
const V3_HASH = "de6d04734c9636e49de0fe30ca3422f1750180ae9db8d9f1e75e52b3450c7767";
const V4_HASH = "d887114aac265e00e9a8d66c98c82fa087a85388e60f1fc930a6996b5d6ab883";
const V5_HASH = "3e2479c86769e3cd5342903997eaa548cfdc98a8339a34d0890bfc0178536f5d";

const v1 = JSON.parse(fs.readFileSync(path.join(V1, "gold-sample-frozen.json"), "utf8")) as {
  freezeHash: string;
  samples: unknown[];
};
assert.equal(v1.freezeHash, V1_HASH);
assert.equal(v1.samples.length, 33);

const v3 = JSON.parse(
  fs.readFileSync(path.join(OUT, "v3/gold-sample-frozen-v3.json"), "utf8"),
) as { freezeHash: string };
assert.equal(v3.freezeHash, V3_HASH);

const v4Report = JSON.parse(fs.readFileSync(path.join(OUT, "phase11-remediation-v4-report.json"), "utf8")) as {
  contractPass: boolean;
  v4FreezeHash: string;
  programmePassSupported: boolean;
};
assert.equal(v4Report.v4FreezeHash, V4_HASH);
assert.equal(v4Report.programmePassSupported, false);

const v5Report = JSON.parse(fs.readFileSync(path.join(OUT, "phase11-remediation-v5-report.json"), "utf8")) as {
  contractPass: boolean;
  parentV4FreezeHash?: string;
  v5FreezeHash: string;
  programmePassSupported: boolean;
  substantiveCount: number;
  insufficientSourceContextCount: number;
  scan: { pass: boolean };
  fnChecks: Record<string, boolean>;
  contracts: Array<{ name: string; pass: boolean }>;
};
assert.equal(v5Report.v5FreezeHash, V5_HASH);
assert.equal(v5Report.programmePassSupported, false);
assert.equal(v5Report.contractPass, true);
assert.equal(v5Report.scan.pass, true);
assert.ok(v5Report.substantiveCount >= 30 && v5Report.substantiveCount <= 50);
assert.equal(v5Report.fnChecks["GOLD-11-039_client_summary_not_copyable_truncated"], true);
assert.ok(v5Report.contracts.some((c) => c.name.includes("boundary") && c.pass) || v5Report.scan.pass);

const trunc = assessSolicitorSentence("The attribution remains outstan");
assert.ok(trunc.issues.includes("truncated_fragment"));
const ph = assessSolicitorSentence("Please chase {{MISSING_ITEM}} before the hearing.");
assert.ok(ph.issues.includes("unresolved_placeholder"));
const title = solicitorVisibleEvidenceTitle("WhatsApp extract shows defendant said…");
assert.equal(title.blocked, true);
assert.match(title.display, /withheld/i);
assert.equal(requiresQualifiedSolicitorReviewQueue("Theft Act 1968 s.1 allegation formula"), true);

const withAudit = resolveGateOffenceFamily({
  allegation: "Allegation not safely labelled from source",
  bundleHay: "MG11 charge sheet",
  auditFamily: "harassment_digital",
});
assert.equal(withAudit.failClosed, false);
assert.equal(withAudit.matterFamilyFromAudit, true);

assert.equal(NEUTRAL_SOLICITOR_BLOCKED_BANNER.length > 20, true);
assert.match(sanitizeSolicitorProse("R v X — foundation SJP"), /Single Justice Procedure listing/i);

const g039 = JSON.parse(
  fs.readFileSync(path.join(OUT, "v5/rendered/GOLD-11-039.json"), "utf8"),
) as { surfaces: Array<{ surface: string; canCopy: boolean | null; solicitorVisibleText: string; gateStatus: string }> };
const cs039 = g039.surfaces.find((s) => s.surface === "client_summary")!;
assert.equal(cs039.canCopy, false);
assert.ok(!/Not for court or CPS us\s*$/i.test(cs039.solicitorVisibleText));

assert.equal(fs.existsSync(path.join(OUT, "v5/reviewer-bundle/automated-predictions.json")), false);
assert.equal(fs.existsSync(path.join(OUT, "automated-predictions-v5.json")), true);
assert.equal(fs.existsSync(path.join(OUT, "fixed-length-wording-operations-v5.json")), true);

const human = JSON.parse(
  fs.readFileSync(path.join(OUT, "v5/human-judgment-workbook.json"), "utf8"),
) as { status: string; judgments: Array<{ reviewerDecision: null }> };
assert.equal(human.status, "AWAITING_HUMAN_GOLD_REVIEW");
assert.ok(human.judgments.every((j) => j.reviewerDecision == null));

// Full-corpus contradiction + copyable truncation scan over v5 renders
const renderDir = path.join(OUT, "v5/rendered");
const renderFiles = fs.readdirSync(renderDir).filter((f) => f.endsWith(".json"));
assert.ok(renderFiles.length >= 30);
for (const file of renderFiles) {
  const body = JSON.parse(fs.readFileSync(path.join(renderDir, file), "utf8")) as {
    surfaces: Array<{ solicitorVisibleText: string; canCopy: boolean | null; surface: string }>;
  };
  const texts = body.surfaces.map((s) => s.solicitorVisibleText);
  assert.equal(
    hasMatterFamilyResolvedUnresolvedContradiction(texts),
    false,
    `contradiction in ${file}`,
  );
  for (const s of body.surfaces) {
    if (s.canCopy !== true) continue;
    assert.equal(
      hasIncompleteRequiredDisclaimer(s.solicitorVisibleText),
      false,
      `incomplete disclaimer copyable in ${file}:${s.surface}`,
    );
  }
}

const ledger = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"),
    "utf8",
  ),
) as { status: string; current42RawSources: { count: number }; current55TruncSources: { count: number } };
assert.equal(ledger.status, "LEDGER_BALANCED");
assert.equal(ledger.current42RawSources.count, 42);
assert.equal(ledger.current55TruncSources.count, 55);

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaVersion: CANONICAL_MATTER_STATE_VERSION,
      centralSurfaces: 31,
      v1Preserved: V1_HASH.slice(0, 16),
      v4Hash: V4_HASH.slice(0, 16),
      v5Hash: V5_HASH.slice(0, 16),
      substantive: v5Report.substantiveCount,
      status: human.status,
    },
    null,
    2,
  ),
);
