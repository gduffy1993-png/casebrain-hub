/**
 * Phase 7 — extraction / provenance boundary contracts.
 * Run: npx tsx scripts/phase7-extraction-provenance.test.ts
 */
import assert from "node:assert/strict";
import {
  EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
  buildExtractionProvenanceBlock,
  assertSafeEvidenceTitle,
  detectIncompleteQuotation,
  containsRawExtractionSyntax,
  dedupeDisplayLabels,
  stableEvidenceId,
} from "@/lib/criminal/extraction-provenance-boundary";
import { validateSolicitorSurface } from "@/lib/criminal/shared-solicitor-validator";

assert.equal(EXTRACTION_PROVENANCE_BOUNDARY_VERSION, "1.0.0");

// Fields stay separate
{
  const r = buildExtractionProvenanceBlock({
    evidenceTitle: "MG11 complainant statement",
    evidenceStatus: "missing",
    sourceExcerpt: '"The complainant confirmed the messages were unwanted."',
    generatedExplanation: "Attribution continuity may turn on this statement.",
    requestedAction: "Please serve the MG11 or confirm why it is not available.",
    displayLabels: ["MG11", "Witness statement", "Complainant MG11"],
  });
  assert.equal(r.ok, true);
  assert.equal(r.block.evidenceTitle, "MG11 complainant statement");
  assert.ok(r.block.sourceEvidenceId?.startsWith("ev_"));
  assert.notEqual(r.block.evidenceTitle, r.block.sourceExcerpt);
  assert.ok(r.dedupedDisplayLabels.length < 3, `expected alias dedupe, got ${r.dedupedDisplayLabels}`);
}

// Never use truncated excerpt as title
{
  const r = buildExtractionProvenanceBlock({
    evidenceTitle: "Chase the and",
    evidenceStatus: "missing",
  });
  assert.equal(r.block.evidenceTitle, null);
  assert.ok(r.rejections.some((x) => x.code === "boundary.truncated_excerpt_as_title"));
  const gate = assertSafeEvidenceTitle("Chase the and");
  assert.equal(gate.safeTitle, null);
}

// Incomplete quotation omitted (not completed)
{
  assert.equal(detectIncompleteQuotation('"the complainant said'), true);
  const r = buildExtractionProvenanceBlock({
    evidenceTitle: "MG11",
    sourceExcerpt: '"the complainant said',
  });
  assert.equal(r.block.sourceExcerpt, null);
  assert.ok(r.rejections.some((x) => x.code === "boundary.incomplete_quotation"));
}

// Raw extraction blocked
{
  assert.equal(containsRawExtractionSyntax("Phone download | 4 | outstanding"), true);
  const r = buildExtractionProvenanceBlock({
    evidenceTitle: "Phone download | 4 |",
  });
  assert.ok(r.rejections.some((x) => x.code === "boundary.raw_extraction_syntax"));
  assert.equal(r.ok, false);
}

// Alias dedupe
{
  const labels = dedupeDisplayLabels(["Full phone download", "Phone extraction", "CCTV", "Master CCTV"]);
  assert.ok(labels.length <= 3);
}

// Stable ids deterministic
{
  assert.equal(stableEvidenceId("MG11", "served"), stableEvidenceId("MG11", "served"));
}

// Shared validator still fails closed on raw (regression)
{
  const blocked = validateSolicitorSurface({
    surfaceId: "disclosure_chase",
    texts: ["Phone download | 4 | outstanding"],
    allegation: "Harassment contrary to Protection from Harassment Act",
    bundleHay: "WhatsApp MG11",
    mode: "copy",
    data: { texts: ["Phone download | 4 | outstanding"] },
  });
  assert.equal(blocked.status, "integrity_blocked");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      boundaryVersion: EXTRACTION_PROVENANCE_BOUNDARY_VERSION,
      suite: "phase7-extraction-provenance.test.ts",
    },
    null,
    2,
  ),
);
console.log("phase7-extraction-provenance.test.ts: PASS");
