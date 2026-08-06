/**
 * Phase 6 contract + mutation tests for shared validator and canonical migration.
 * Run: npx tsx scripts/phase6-validator-contracts.test.ts
 */
import assert from "node:assert/strict";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import {
  assertConsumerRejectsIntegrityBlocked,
  validateSolicitorSurface,
  SHARED_SOLICITOR_VALIDATOR_VERSION,
} from "@/lib/criminal/shared-solicitor-validator";
import { integrityBlockedApiBody } from "@/lib/criminal/solicitor-output-gate";
import {
  adaptFiveAnswersAndChaseToCanonical,
  assertSameCanonicalFingerprint,
  buildCanonicalMatterStateV1,
} from "@/lib/criminal/canonical-matter-state";
import { buildSolicitorMatterStateVmFromCanonical } from "@/lib/criminal/solicitor-matter-state";
import { countEvidenceStatesForDisplay } from "@/lib/criminal/overview-presentation";
import { displayForSafelyOmitted, REVIEW_REQUIRED_NEUTRAL, migrateLegacySolicitorString } from "@/lib/criminal/structured-solicitor-output";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

assert.equal(SHARED_SOLICITOR_VALIDATOR_VERSION, "1.0.0");

const FAMILY = {
  allegation: "Harassment contrary to Protection from Harassment Act",
  bundleHay: "WhatsApp screenshots MG11 phone extraction subscriber",
};
const SAFE = "Attribution remains outstanding on the served screenshots.";
const BLOCK = "Consider defensive force and PWITS continuity | 4 |.";

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return { label, existence, reliability: "unknown" };
}

const evidenceRows = [
  row("Complainant MG11", "served"),
  row("Phone download", "missing"),
  row("Screenshots", "referred_only"),
];

const canonical = adaptFiveAnswersAndChaseToCanonical({
  caseId: "p6-test",
  allegation: FAMILY.allegation,
  evidenceRows,
  chase: {
    items: [{ id: "c1", label: "Full phone download", baseStatus: "Overdue", whyItMatters: "Attribution" }],
    primaryItems: [],
  },
});

// Canonical migration: no dual truth
{
  const counts = countEvidenceStatesForDisplay(evidenceRows);
  assert.equal(counts.served, canonical.evidence.counts.served);
  assert.equal(counts.referred, canonical.evidence.counts.referred);
  assert.equal(counts.missing, canonical.evidence.counts.missing);
  const vm = buildSolicitorMatterStateVmFromCanonical(canonical, evidenceRows);
  assert.equal(assertSameCanonicalFingerprint(vm.fingerprint, canonical.fingerprint), true);
}

// Contracts for all central surfaces
let pass = 0;
for (const surfaceId of phase2CentralSurfaceIds()) {
  const mode = surfaceId.startsWith("api_")
    ? "api"
    : /export|copy|explanation|assistant|qa_pack/i.test(surfaceId)
      ? "copy"
      : "view";
  const bad = validateSolicitorSurface({
    surfaceId,
    texts: [BLOCK],
    ...FAMILY,
    mode: mode as "api" | "copy" | "view",
    data: { texts: [BLOCK] },
    canonicalFingerprint: canonical.fingerprint,
    expectedCanonicalFingerprint: canonical.fingerprint,
  });
  assert.equal(bad.status, "integrity_blocked", surfaceId);
  const good = validateSolicitorSurface({
    surfaceId,
    texts: [SAFE],
    ...FAMILY,
    mode: mode as "api" | "copy" | "view",
    data: { texts: [SAFE] },
    canonicalFingerprint: canonical.fingerprint,
    expectedCanonicalFingerprint: canonical.fingerprint,
  });
  assert.notEqual(good.status, "integrity_blocked", surfaceId);
  assert.equal(good.fingerprintRule, "ok");
  assert.equal(assertConsumerRejectsIntegrityBlocked(integrityBlockedApiBody(surfaceId, ["sentence.raw_extraction_marker"])), true);
  pass += 1;
}

// Scoped view — wrong-family leak without raw marker (sentence hard rules force full block)
{
  const leakOnly = "Consider defensive force and PWITS continuity on the papers.";
  const scoped = validateSolicitorSurface({
    surfaceId: "overview_advanced_panel",
    texts: [SAFE, leakOnly],
    ...FAMILY,
    mode: "view",
    scopeBlockToAffectedTexts: true,
    data: { texts: [SAFE, leakOnly] },
  });
  assert.equal(scoped.status, "degraded");
  assert.equal(scoped.data?.texts.length, 1);
}

// Safely omitted substantive → review message
{
  const omit = displayForSafelyOmitted("Chase the and outstanding MG11");
  assert.equal(omit.display, REVIEW_REQUIRED_NEUTRAL);
  const mig = migrateLegacySolicitorString("Chase the and", { kind: "cps_chase" });
  assert.equal(mig.disposition, "safely_omitted");
  assert.equal(mig.omitDisplay, REVIEW_REQUIRED_NEUTRAL);
}

// Mutations
{
  const a = buildCanonicalMatterStateV1({ evidenceRows, chaseItems: [] });
  const b = buildCanonicalMatterStateV1({
    evidenceRows: [...evidenceRows, row("Extra", "served")],
    chaseItems: [],
  });
  assert.equal(assertSameCanonicalFingerprint(a.fingerprint, b.fingerprint), false);
}
{
  const mismatch = validateSolicitorSurface({
    surfaceId: "overview_snapshot_boxes",
    texts: [SAFE],
    ...FAMILY,
    mode: "view",
    data: { texts: [SAFE] },
    canonicalFingerprint: "v1.0.0:deadbeefdeadbeefdeadbeef",
    expectedCanonicalFingerprint: canonical.fingerprint,
  });
  assert.equal(mismatch.status, "integrity_blocked");
  assert.equal(mismatch.fingerprintRule, "mismatch");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      validatorVersion: SHARED_SOLICITOR_VALIDATOR_VERSION,
      surfacesContracted: pass,
      expected: phase2CentralSurfaceIds().length,
    },
    null,
    2,
  ),
);
console.log("phase6-validator-contracts.test.ts: PASS");
