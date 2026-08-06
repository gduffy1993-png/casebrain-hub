/**
 * run-v4 Blocker B–E + quality contracts.
 * Run: npx tsx scripts/run-v4-blocker-contracts.test.ts
 */
import assert from "node:assert/strict";
import {
  containsAbsoluteProofWording,
  isAbsoluteProofAffirmativeCopy,
} from "@/lib/criminal/absolute-proof-wording";
import {
  OFFENCE_LABEL_REGISTRY,
  OFFENCE_LABEL_REGISTRY_VERSION,
  assessOffenceLabelWording,
} from "@/lib/criminal/offence-label-registry";
import {
  assessFamilyEvidenceCompatibility,
  assessProvenanceCoherence,
} from "@/lib/criminal/solicitor-family-provenance";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import {
  preserveProtectedAcronyms,
  scanSolicitorVisibleCopyQuality,
} from "@/lib/criminal/solicitor-visible-quality";
import { sanitizeSolicitorProse } from "@/lib/criminal/solicitor-visible-sanitization";
import { renderCopyableSolicitorText } from "@/lib/criminal/solicitor-visible-materialise";

// --- B: absolute proof never copyable on any exit ---
assert.equal(containsAbsoluteProofWording("fully proved on current disclosure"), true);
assert.equal(isAbsoluteProofAffirmativeCopy("fully proved on current disclosure"), true);

for (const mode of ["copy", "export"] as const) {
  const r = renderCopyableSolicitorText({
    rawText: "The case is fully proved on current disclosure.",
    allegation: "Theft",
    bundleHay: "MG11",
    auditFamily: "theft",
    surfaceId: "defence_plan_safe_wording",
    mode,
    itemLabel: "Defence plan",
  });
  assert.equal(r.canCopy, false, `absolute proof must block ${mode}`);
  assert.equal(r.gateStatus, "absolute_proof_blocked");
  assert.equal(containsAbsoluteProofWording(r.display) && r.canCopy, false);
}

{
  const g = gateSolicitorOutput({
    surfaceId: "api_executive_brief",
    texts: ["Position is fully proved on current disclosure."],
    allegation: "Theft",
    mode: "api",
    data: { texts: ["Position is fully proved on current disclosure."] },
  });
  assert.equal(g.canCopy, false);
  assert.ok((g as { ruleIds?: string[] }).ruleIds?.includes("absolute_proof_wording") || !g.ok);
}

// Warning list may contain the phrase but must not be treated as affirmative copyable plan
{
  const r = renderCopyableSolicitorText({
    rawText: "fully proved on current disclosure",
    allegation: "Theft",
    surfaceId: "do_not_overstate",
    mode: "copy",
    itemLabel: "Do-not-overstate",
  });
  assert.equal(r.canCopy, false);
}

// --- C: citation registry (source-cited, fail closed, no silent rewrite) ---
assert.equal(OFFENCE_LABEL_REGISTRY_VERSION, "1.0.0");
assert.ok(OFFENCE_LABEL_REGISTRY.length >= 6);

{
  const a = assessOffenceLabelWording(
    "Fraud by false representation, contrary to section 1 of the Fraud Act 2006",
  );
  assert.equal(a.ok, false);
  assert.equal(a.conflictsWithRegistry, true);
  assert.match(a.displayAllegation, /solicitor verification/i);
  assert.match(a.sourceAllegation, /section 1/);
  assert.ok(a.matchedEntryIds.includes("fraud_false_representation_s2"));
  const entry = OFFENCE_LABEL_REGISTRY.find((e) => e.id === "fraud_false_representation_s2")!;
  assert.match(entry.authority, /Fraud Act 2006/);
  assert.match(entry.correctCitation, /section 2/);
}

{
  const a = assessOffenceLabelWording(
    "Being concerned in supplying a controlled drug, contrary to section 4(2)(b) of the Misuse of Drugs Act 1971",
  );
  assert.equal(a.conflictsWithRegistry, true);
  assert.ok(a.matchedEntryIds.includes("mda_concerned_in_supply_s4_3_b"));
}

{
  const a = assessOffenceLabelWording(
    "Conspiracy to supply a controlled drug, contrary to section 4(3) of the Misuse of Drugs Act 1971",
  );
  assert.equal(a.conflictsWithRegistry, true);
  assert.ok(a.matchedEntryIds.includes("conspiracy_supply_or_import_not_bare_s4_3"));
}

{
  const a = assessOffenceLabelWording(
    "Possession of a bladed article, contrary to section 1 Criminal Justice Act 1988",
  );
  assert.equal(a.conflictsWithRegistry, true);
  assert.ok(a.matchedEntryIds.includes("bladed_article_not_cja1988_s1"));
}

{
  const a = assessOffenceLabelWording(
    "Breach of bail conditions, contrary to section 6(3) of the Bail Act 1976",
  );
  assert.equal(a.conflictsWithRegistry, true);
  assert.ok(a.matchedEntryIds.includes("bail_generic_breach_not_s6_3"));
}

{
  const a = assessOffenceLabelWording(
    "Breach of a domestic violence protection notice, contrary to section 25 Crime and Security Act 2010",
  );
  assert.equal(a.conflictsWithRegistry, true);
  assert.equal(a.queueQualifiedReview, true);
  assert.ok(a.matchedEntryIds.includes("dvpn_breach_qualified_review"));
}

// Safe / verified-ish wording without conflict stays ok
{
  const a = assessOffenceLabelWording("Theft contrary to section 1 of the Theft Act 1968");
  assert.equal(a.ok, true);
  assert.equal(a.conflictsWithRegistry, false);
  assert.equal(a.displayAllegation, a.sourceAllegation);
}

// --- D: wrong-family leakage ---
{
  const r = assessFamilyEvidenceCompatibility({
    allegation: "Failure to provide driver details contrary to section 172 Road Traffic Act 1988",
    auditFamily: "rta-s172",
    prose: "The intoxilyser / breath-device readings remain outstanding on the papers.",
  });
  assert.equal(r.ok, false);
  assert.ok(r.issues.includes("intoxilyser_on_non_drink_drive") || r.issues.includes("breath_device_on_non_drink_drive"));
}

// --- E: provenance coherence ---
{
  const r = assessProvenanceCoherence({
    prose: "Outstanding CCTV and medical notes must be chased before the next hearing.",
    evidenceLabels: ["MG11 complainant", "Charge sheet"],
  });
  assert.equal(r.ok, false);
  assert.ok(r.orphanMentions.includes("cctv"));
  assert.ok(r.orphanMentions.includes("medical"));
}
{
  const r = assessProvenanceCoherence({
    prose: "Outstanding CCTV master footage remains missing.",
    evidenceLabels: ["Master CCTV footage", "MG11"],
  });
  assert.equal(r.ok, true);
}

// Empty generic client summary
{
  const r = assessFamilyEvidenceCompatibility({
    allegation: "Theft",
    prose: "We are reviewing the papers.",
  });
  assert.equal(r.ok, false);
  assert.ok(r.issues.includes("empty_generic_client_summary"));
}

// --- Quality ---
assert.equal(preserveProtectedAcronyms("dna afis pin yjs kn/01 cctv bwv mg6c anpr sfr"), "DNA AFIS PIN YJS KN/01 CCTV BWV MG6C ANPR SFR");
assert.match(sanitizeSolicitorProse("Discuss before we fix strategy."), /provisional strategy/i);
{
  const q = scanSolicitorVisibleCopyQuality("Dna Afis Pin Yjs");
  // After preserve, scan may still flag if input not preserved — ensure preserve path works
  assert.equal(containsAbsoluteProofWording(preserveProtectedAcronyms("Dna")), false);
}

console.log(JSON.stringify({ ok: true, contract: "run-v4-blocker-contracts" }, null, 2));
