/**
 * Phase 4 adversarial offence-family concept registry tests.
 * Run: npx tsx scripts/offence-family-concept-registry.test.ts
 */
import assert from "node:assert/strict";
import {
  classifyTextsAgainstConceptRegistry,
  OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
} from "@/lib/criminal/offence-family-concept-registry";
import {
  classifyWrongFamilyHits,
  resolveSolicitorOffenceFamily,
} from "@/lib/criminal/solicitor-offence-family";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";

assert.equal(OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION, "1.0.0");

const HARASS_ALLEGATION =
  "Harassment contrary to Protection from Harassment Act via WhatsApp messages";
const HARASS_HAY = "WhatsApp screenshots MG11 phone extraction subscriber";

// 1) Harassment blocks unsupported drugs / vehicle / self-defence concepts
{
  const fam = resolveSolicitorOffenceFamily({
    allegation: HARASS_ALLEGATION,
    bundleHay: HARASS_HAY,
  });
  assert.equal(fam.family, "harassment_digital");
  const hits = classifyWrongFamilyHits(
    "Consider defensive force, PWITS continuity and vehicle ownership.",
    fam,
    HARASS_HAY,
    { evidence: [], allegation: HARASS_ALLEGATION },
  );
  const leaks = hits.filter((h) => h.kind === "unsupported_template_leakage").map((h) => h.label);
  assert.ok(leaks.some((l) => /defensive|self-defence/i.test(l)), `expected defensive block: ${leaks}`);
  assert.ok(leaks.some((l) => /drugs|pwits/i.test(l)), `expected drugs block: ${leaks}`);
  assert.ok(leaks.some((l) => /vehicle/i.test(l)), `expected vehicle block: ${leaks}`);
}

// 2) Source-backed mixed cases pass (structured evidence IDs)
{
  const evidence = [
    { evidenceId: "ev_wraps", label: "PWITS wraps controlled drug intent to supply", existence: "referred_only" },
  ];
  const c = classifyTextsAgainstConceptRegistry(
    ["Chase PWITS continuity on the referred wraps."],
    {
      allegation: HARASS_ALLEGATION,
      bundleHay: HARASS_HAY,
      evidence,
    },
  );
  assert.equal(c.mixedFamily, true);
  assert.ok(c.activatedFamilies.some((a) => a.family === "harassment_digital"));
  assert.ok(c.activatedFamilies.some((a) => a.family === "drugs_supply" && a.source === "evidence_item"));
  assert.equal(c.hasUnsupportedLeakage, false);
  assert.ok(c.conditionalAllowed.length >= 1 || c.conceptVerdicts.some((v) => v.kind === "source_backed_ok" || v.tier === "allowed"));
}

// 3) Keyword alone cannot activate another family
{
  const c = classifyTextsAgainstConceptRegistry(
    ["Chase PWITS continuity on the schedule."],
    {
      allegation: HARASS_ALLEGATION,
      bundleHay: `${HARASS_HAY} PWITS wraps controlled drug intent to supply`,
      evidence: [], // keyword in hay only
    },
  );
  assert.equal(c.hasUnsupportedLeakage, true);
  assert.ok(c.unsupportedBlocked.some((v) => /drugs|pwits/i.test(v.label)));
  assert.ok(!c.activatedFamilies.some((a) => a.family === "drugs_supply"));
}

// 4) Missing family blocks substantive copy/API/export
{
  const g = gateSolicitorOutput({
    surfaceId: "api_defence_plan_chat",
    texts: ["Ask the court to record that disclosure remains outstanding."],
    mode: "api",
    data: { texts: ["Ask the court to record that disclosure remains outstanding."] },
  });
  assert.equal(g.status, "integrity_blocked");
  assert.ok(g.ruleIds.includes("offence_family_uncertain"));
}

// 5) Neutral non-substantive responses remain usable
{
  const g = gateSolicitorOutput({
    surfaceId: "api_defence_plan_chat",
    texts: ["Acknowledged."],
    mode: "api",
    data: { texts: ["Acknowledged."] },
  });
  assert.notEqual(g.status, "integrity_blocked");
}

// 6) Scoped view: one leaked advanced line does not wipe clean lines
{
  const g = gateSolicitorOutput({
    surfaceId: "overview_advanced_panel",
    texts: [
      "Attribution remains outstanding on the served screenshots.",
      "Consider defensive force and PWITS continuity.",
    ],
    allegation: HARASS_ALLEGATION,
    bundleHay: HARASS_HAY,
    evidence: [],
    mode: "view",
    scopeBlockToAffectedTexts: true,
    data: {
      texts: [
        "Attribution remains outstanding on the served screenshots.",
        "Consider defensive force and PWITS continuity.",
      ],
    },
  });
  assert.equal(g.status, "degraded");
  assert.ok(g.data);
  assert.equal(g.data.texts.length, 1);
  assert.ok(/Attribution remains outstanding/i.test(g.data.texts[0]!));
}

// 7) Pending composer repair: raw marker + truncated stay blocked on copy
{
  const raw = gateSolicitorOutput({
    surfaceId: "export_case_qa_pack",
    texts: ["MG6C disclosure schedule | 4 | remains outstanding."],
    allegation: HARASS_ALLEGATION,
    bundleHay: HARASS_HAY,
    mode: "copy",
    data: { texts: ["MG6C disclosure schedule | 4 | remains outstanding."] },
  });
  assert.equal(raw.status, "integrity_blocked");
  assert.ok(raw.ruleIds.includes("sentence.raw_extraction_marker"));

  const trunc = gateSolicitorOutput({
    surfaceId: "client_explanation_panel",
    texts: ["Chase the and"],
    allegation: HARASS_ALLEGATION,
    bundleHay: HARASS_HAY,
    mode: "copy",
    data: { texts: ["Chase the and"] },
  });
  assert.equal(trunc.status, "integrity_blocked");
  assert.ok(trunc.ruleIds.includes("sentence.truncated_fragment"));
}

// 8) Evidence ID alone (shell label) cannot activate another family
{
  const fam = resolveSolicitorOffenceFamily({
    allegation: HARASS_ALLEGATION,
    bundleHay: HARASS_HAY,
  });
  const hits = classifyWrongFamilyHits(
    "Chase PWITS continuity on the schedule.",
    fam,
    HARASS_HAY,
    {
      evidence: [{ evidenceId: "ev_shell_only", label: "item 1" }],
      allegation: HARASS_ALLEGATION,
    },
  );
  assert.ok(hits.some((h) => h.kind === "unsupported_template_leakage"));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      registryVersion: OFFENCE_FAMILY_CONCEPT_REGISTRY_VERSION,
      adversarialAssertions: 8,
    },
    null,
    2,
  ),
);
console.log("offence-family-concept-registry.test.ts: PASS");
