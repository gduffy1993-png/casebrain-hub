/**
 * Focused run-v9 acceptance: safe provenance + full-surface internal-language scan.
 * Run: npx tsx scripts/scale3000-run-v9-acceptance-contracts.test.ts
 */
import assert from "node:assert/strict";
import {
  buildSolicitorChargeModel,
  containsSolicitorForbiddenInternalLanguage,
  GENERAL_SUPPLIED_PAPERS_PROVENANCE,
  isDetachedDisputedChargeCopy,
  resolveSolicitorChargeProvenance,
} from "@/lib/criminal/solicitor-charge-model";
import {
  formatCompatibleChaseBrief,
  formatCompatibleEvidenceCounts,
  missingCompatibleEvidenceDisclosure,
} from "@/lib/criminal/solicitor-partial-view-disclosure";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import { SOLICITOR_MATERIALISE_PIPELINE_VERSION } from "@/lib/criminal/solicitor-visible-materialise";

assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("run-v9"));
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("safe-provenance"));

const MUTATION_PAYLOADS = [
  "demo-audit-18-motoring-sjp-thin",
  "messy-pdf-v9-001-foo",
  "Source pack esa (demo-audit-01-phone-harassment)",
  "v9_catalog#demo-audit-40",
  "C:\\Users\\gduff\\casebrain-hub\\artifacts\\evidence-state-audit-local\\cases\\demo-audit-01",
  "artifacts/casebrain-qa/demo-audit-thirty/demo-audit-01",
  "lib/eval/demo-audit-packs/v9-forty-case-catalog#x",
];

// Mutation: every charge rendering route must detect injected internal language
for (const payload of MUTATION_PAYLOADS) {
  assert.equal(
    containsSolicitorForbiddenInternalLanguage(payload),
    true,
    `detector missed payload: ${payload}`,
  );
  const poisoned = buildSolicitorChargeModel({
    sourceChargeText: "Theft contrary to section 1 of the Theft Act 1968",
    sourceReference: payload,
    clientLabel: "Jordan Hale",
  });
  assert.equal(poisoned.provenanceQuality, "general_supplied_papers");
  assert.match(poisoned.displayText, new RegExp(GENERAL_SUPPLIED_PAPERS_PROVENANCE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(containsSolicitorForbiddenInternalLanguage(poisoned.displayText), false);
  assert.equal(containsSolicitorForbiddenInternalLanguage(poisoned.copyText), false);
  assert.match(poisoned.displayText, /Client: Jordan Hale/);
  assert.match(poisoned.copyText, /Client: Jordan Hale/);
  // Internal audit may retain the raw ref; solicitor text must not.
  assert.equal(poisoned.internalAuditReference, payload);

  const disc = buildSolicitorChargeModel({
    sourceChargeText: "Fraud by false representation contrary to section 1 of the Fraud Act 2006",
    sourceReference: `Source pack esa (${payload}) — charge wording as recorded`,
    clientLabel: "Alex Taylor",
  });
  assert.equal(disc.verificationStatus, "discrepancy");
  assert.equal(containsSolicitorForbiddenInternalLanguage(disc.displayText), false);
  assert.equal(containsSolicitorForbiddenInternalLanguage(disc.copyText), false);
  assert.match(disc.copyText, /Client: Alex Taylor/);
  assert.match(disc.copyText, /Citation discrepancy/);
  assert.match(disc.copyText, /Possible citation discrepancy:/);
  assert.equal(isDetachedDisputedChargeCopy(disc.copyText), false);
}

{
  const exact = resolveSolicitorChargeProvenance({
    documentTitle: "MG5",
    documentId: "MG5/001",
    pageOrSection: "page 2",
  });
  assert.equal(exact.provenanceQuality, "exact_document_page");
  assert.match(exact.solicitorReference, /MG5/);
  assert.match(exact.solicitorReference, /page 2/);
  assert.equal(containsSolicitorForbiddenInternalLanguage(exact.solicitorReference), false);

  const fromSafeRaw = resolveSolicitorChargeProvenance({ rawSourceReference: "MG5 p.2" });
  assert.equal(fromSafeRaw.provenanceQuality, "exact_document_page");

  const fallback = resolveSolicitorChargeProvenance({
    rawSourceReference: "Source pack esa (demo-audit-01)",
  });
  assert.equal(fallback.provenanceQuality, "general_supplied_papers");
  assert.equal(fallback.solicitorReference, GENERAL_SUPPLIED_PAPERS_PROVENANCE);
}

// Prior v8 acceptance still holds structurally
{
  const fraud = buildSolicitorChargeModel({
    sourceChargeText: "Fraud by false representation contrary to section 1 of the Fraud Act 2006",
    sourceReference: "Charge sheet p.1",
    clientLabel: "Alex Taylor",
  });
  assert.equal(fraud.verificationStatus, "discrepancy");
  assert.match(fraud.displayText, /Charge recorded on the papers:/);
  assert.match(fraud.copyText, /Client: Alex Taylor/);
  assert.doesNotMatch(fraud.displayText, /blocked\s*≠\s*repaired/i);
}

{
  const withQ = formatCompatibleEvidenceCounts({
    overviewCountsLine: "Served 4 · Referred 0 · Missing 0 · Incomplete 0 · Not safely confirmed 0",
    quarantinedCount: 4,
    rawSourceCount: 8,
    compatibleCount: 4,
  });
  assert.equal(missingCompatibleEvidenceDisclosure(withQ, 4), false);
  const chase = formatCompatibleChaseBrief({
    supportedLabels: ["MG11"],
    quarantinedLabels: ["CCTV download"],
  });
  assert.match(chase, /excluded/);
}

assert.equal(containsAbsoluteProofWording("fully proved on current disclosure"), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      contracts: [
        "internal_language_mutations_detected",
        "charge_provenance_never_renders_fixture_ids",
        "general_supplied_papers_fallback",
        "exact_document_page_when_available",
        "client_consistent_verified_and_discrepancy_copy",
        "discrepancy_warning_inseparable",
        "compatible_evidence_disclosure",
      ],
      mutationPayloads: MUTATION_PAYLOADS.length,
      pipeline: SOLICITOR_MATERIALISE_PIPELINE_VERSION,
    },
    null,
    2,
  ),
);
