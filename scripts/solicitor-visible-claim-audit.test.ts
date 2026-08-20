import assert from "node:assert/strict";
import {
  classifyClaimTextHeuristically,
  extractClaimsFromSurfaceText,
  isHighRiskClaimText,
} from "../lib/eval/master3000-quality/solicitor-visible-claim-audit";

assert.equal(isHighRiskClaimText("Please provide the full CCTV master."), true);
assert.equal(isHighRiskClaimText("Hello world."), false);

assert.equal(
  classifyClaimTextHeuristically("Self-defence remains live on the current papers.").supportClass,
  "UNSUPPORTED_PROMOTION",
);
assert.equal(
  classifyClaimTextHeuristically("Consider whether self-defence arises.").supportClass,
  "PRACTITIONER_CONSIDERATION",
);

const claims = extractClaimsFromSurfaceText({
  caseId: "seed",
  surface: "client",
  section: "summary",
  text: "Interview recording outstanding. Consider whether identification is disputed.",
});
assert.ok(claims.length >= 1);
assert.ok(claims.some((c) => c.claimKind === "evidence_state" || c.supportClass === "PRACTITIONER_CONSIDERATION"));

console.log("solicitor-visible-claim-audit.test.ts: PASS");
