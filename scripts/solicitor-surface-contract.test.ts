/**
 * Contract tests for all Phase-2 central surfaces + Phase-3 gate tightenings.
 * Run: npx tsx scripts/solicitor-surface-contract.test.ts
 */
import assert from "node:assert/strict";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import { gateSolicitorOutput, integrityBlockedApiBody } from "@/lib/criminal/solicitor-output-gate";
import {
  canUseSolicitorApiResponse,
  isIntegrityBlockedPayload,
  solicitorUiStateFromApiBody,
} from "@/lib/criminal/integrity-blocked-consumer";
import {
  adaptFiveAnswersAndChaseToCanonical,
  assertSameCanonicalFingerprint,
  CANONICAL_MATTER_STATE_VERSION,
} from "@/lib/criminal/canonical-matter-state";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

const SAFE_TEXT = "Attribution remains outstanding on the served screenshots.";
const BLOCK_TEXT = "Consider defensive force and PWITS continuity | 4 |.";
const SUBSTANTIVE_NO_FAMILY = "Ask the court to record that disclosure remains outstanding.";
const NON_SUBSTANTIVE = "Acknowledged.";

const FAMILY = {
  allegation: "Harassment contrary to Protection from Harassment Act",
  bundleHay: "WhatsApp screenshots MG11 phone extraction subscriber",
};

let blockCount = 0;
let passCount = 0;
const surfaceResults: Array<{ surfaceId: string; blocked: boolean; safe: boolean }> = [];

for (const surfaceId of phase2CentralSurfaceIds()) {
  const exposureHint = surfaceId.startsWith("api_")
    ? "api"
    : /export|copy|explanation|assistant|qa_pack/i.test(surfaceId)
      ? "copy"
      : "view";

  const blocked = gateSolicitorOutput({
    surfaceId,
    texts: [BLOCK_TEXT],
    ...FAMILY,
    mode: exposureHint === "view" ? "view" : exposureHint === "api" ? "api" : "copy",
    data: { texts: [BLOCK_TEXT] },
  });
  assert.equal(blocked.status, "integrity_blocked", `${surfaceId} should block unsafe`);
  assert.equal(blocked.canCopy, false);
  assert.equal(blocked.data, null);
  blockCount += 1;

  const safe = gateSolicitorOutput({
    surfaceId,
    texts: [SAFE_TEXT],
    ...FAMILY,
    mode: exposureHint === "view" ? "view" : exposureHint === "api" ? "api" : "copy",
    data: { texts: [SAFE_TEXT] },
  });
  assert.notEqual(safe.status, "integrity_blocked", `${surfaceId} should allow safe`);
  assert.ok(safe.data);
  passCount += 1;

  surfaceResults.push({
    surfaceId,
    blocked: blocked.status === "integrity_blocked",
    safe: safe.status !== "integrity_blocked",
  });
}

{
  const g = gateSolicitorOutput({
    surfaceId: "api_defence_plan_chat",
    texts: [SUBSTANTIVE_NO_FAMILY],
    mode: "api",
    data: { texts: [SUBSTANTIVE_NO_FAMILY] },
  });
  assert.equal(g.status, "integrity_blocked");
  assert.ok(g.ruleIds.includes("offence_family_uncertain"));
  blockCount += 1;
}

{
  const g = gateSolicitorOutput({
    surfaceId: "api_defence_plan_chat",
    texts: [NON_SUBSTANTIVE],
    mode: "api",
    data: { texts: [NON_SUBSTANTIVE] },
  });
  assert.notEqual(g.status, "integrity_blocked");
  passCount += 1;
}

{
  const body = integrityBlockedApiBody("api_letters_draft", ["sentence.raw_extraction_marker"]);
  assert.equal(body.status, "integrity_blocked");
  assert.equal(isIntegrityBlockedPayload(body), true);
  assert.equal(canUseSolicitorApiResponse(body), false);
  const ui = solicitorUiStateFromApiBody(body);
  assert.equal(ui.usable, false);
  assert.equal(ui.canCopy, false);
  passCount += 1;
}

{
  const rows: FiveAnswersEvidenceRow[] = [
    { label: "Complainant MG11", existence: "referred_only", reliability: "unknown" },
    { label: "Phone download", existence: "missing", reliability: "unknown" },
    { label: "Screenshots", existence: "served", reliability: "unknown" },
  ];
  const chase = {
    items: [
      { id: "c1", label: "Full phone download", baseStatus: "Overdue" as const, whyItMatters: "Attribution" },
    ],
    primaryItems: [
      { id: "c1", label: "Full phone download", baseStatus: "Overdue" as const, whyItMatters: "Attribution" },
    ],
  };
  const a = adaptFiveAnswersAndChaseToCanonical({
    caseId: "fixture-a",
    allegation: FAMILY.allegation,
    bundleHay: FAMILY.bundleHay,
    evidenceRows: rows,
    chase,
  });
  const b = adaptFiveAnswersAndChaseToCanonical({
    caseId: "fixture-a",
    allegation: FAMILY.allegation,
    bundleHay: FAMILY.bundleHay,
    evidenceRows: rows,
    chase,
  });
  assert.equal(a.schemaVersion, CANONICAL_MATTER_STATE_VERSION);
  assert.equal(assertSameCanonicalFingerprint(a.fingerprint, b.fingerprint), true);
  assert.equal(a.evidence.counts.served, 1);
  assert.equal(a.evidence.counts.referred, 1);
  assert.equal(a.evidence.counts.missing, 1);
  assert.equal(a.chase.counts.total, 1);
  passCount += 1;
}

assert.equal(surfaceResults.length, phase2CentralSurfaceIds().length);
assert.ok(surfaceResults.every((r) => r.blocked && r.safe));

console.log(
  JSON.stringify(
    {
      ok: true,
      centralSurfaces: surfaceResults.length,
      blockAssertions: blockCount,
      passAssertions: passCount,
    },
    null,
    2,
  ),
);
console.log("solicitor-surface-contract.test.ts: PASS");
