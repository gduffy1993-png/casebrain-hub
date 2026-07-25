/**
 * Contract smoke for scale-3000 solicitor materialisation helpers + runner CLI presence.
 * Run: npx tsx scripts/scale3000-solicitor-materialisation.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normaliseSolicitorTemplate,
  renderCopyableSolicitorText,
  sha256Hex,
  SOLICITOR_MATERIALISE_PIPELINE_VERSION,
  SOLICITOR_MATERIALISE_SCHEMA_VERSION,
} from "@/lib/criminal/solicitor-visible-materialise";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import { CANONICAL_MATTER_STATE_VERSION } from "@/lib/criminal/canonical-matter-state";

assert.equal(SOLICITOR_MATERIALISE_SCHEMA_VERSION, CANONICAL_MATTER_STATE_VERSION);
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("canonical-evidence-view"));
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("family-quarantine"));
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("charge-model"));
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("compatible-disclosure"));
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("safe-provenance"));
assert.ok(SOLICITOR_MATERIALISE_PIPELINE_VERSION.includes("run-v9"));
assert.equal(phase2CentralSurfaceIds().length, 31);

const absoluteBlocked = renderCopyableSolicitorText({
  rawText: "fully proved on current disclosure",
  allegation: "Theft",
  surfaceId: "defence_plan_safe_wording",
  mode: "copy",
  itemLabel: "Defence plan",
});
assert.equal(absoluteBlocked.canCopy, false);
assert.equal(absoluteBlocked.gateStatus, "absolute_proof_blocked");

const safe = renderCopyableSolicitorText({
  rawText: "Attribution remains outstanding on the served screenshots.",
  allegation: "Harassment contrary to Protection from Harassment Act",
  bundleHay: "phone WhatsApp screenshots MG11",
  auditFamily: "domestic-harassment",
  surfaceId: "scale3000_copy_preview",
  mode: "copy",
});
assert.equal(safe.canCopy, true);
assert.equal(safe.blockedNotRepaired, false);

const truncated = renderCopyableSolicitorText({
  rawText:
    "CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\nWe are reviewing.\n\n[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS us",
  allegation: "Sexual assault",
  bundleHay: "ABE MG11",
  auditFamily: "sexual_offences",
  surfaceId: "scale3000_client_summary",
  mode: "copy",
  itemLabel: "Client-safe summary wording",
});
assert.equal(truncated.canCopy, false);
assert.equal(truncated.blockedNotRepaired, true);
assert.match(truncated.gateStatus, /boundary|integrity|qualified/i);

const a = "Please provide ANPR image export for Jordan Hale by 12 March 2026.";
const b = "Please provide ANPR image export for Maya Singh by 9 February 2026.";
assert.equal(normaliseSolicitorTemplate(a), normaliseSolicitorTemplate(b));
assert.notEqual(sha256Hex(a), sha256Hex(b));

const runner = path.resolve(__dirname, "integrity-programme/scale3000-solicitor-materialisation.ts");
assert.ok(fs.existsSync(runner), "runner script must exist");

const summary = path.resolve(
  __dirname,
  "../artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
);
assert.ok(fs.existsSync(summary));
const n = (JSON.parse(fs.readFileSync(summary, "utf8")) as { cases: unknown[] }).cases.length;
assert.equal(n, 3000);

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaVersion: SOLICITOR_MATERIALISE_SCHEMA_VERSION,
      centralSurfaces: 31,
      scaleIdentities: n,
      pipelineVersion: SOLICITOR_MATERIALISE_PIPELINE_VERSION,
    },
    null,
    2,
  ),
);
