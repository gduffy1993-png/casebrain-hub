#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  inferAuditorFamilyFromOffence,
} from "@/lib/eval/casebrain-auditor/real-case-collector";
import {
  isClearMoneyLaunderingFraudText,
  isMotoringOffenceText,
  resolveProvisionalWorkflowFromOffence,
} from "@/lib/eval/casebrain-auditor/provisional-offence-policy";
import { resolveWorkflowProfileFromSignals } from "@/lib/criminal/pilot-workflow";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

function ctx(allegation: string) {
  return { caseTitle: "Test case", clientLabel: "Client", allegation, profileHint: null };
}

assert.equal(
  resolveProvisionalWorkflowFromOffence("Dangerous driving contrary to section 2 Road Traffic Act 1988"),
  "generic_motoring_provisional",
);
assert.equal(
  resolveProvisionalWorkflowFromOffence("Careless driving"),
  "generic_motoring_provisional",
);
assert.equal(
  resolveProvisionalWorkflowFromOffence("Dangerous driving causing serious injury"),
  "generic_motoring_provisional",
);
assert.equal(
  resolveProvisionalWorkflowFromOffence("Taking vehicle without consent"),
  "generic_motoring_provisional",
);

assert.equal(resolveProvisionalWorkflowFromOffence("Murder, contrary to common law"), "generic_serious_violence_provisional");
assert.equal(resolveProvisionalWorkflowFromOffence("Manslaughter, contrary to common law"), "generic_serious_violence_provisional");
assert.equal(
  resolveProvisionalWorkflowFromOffence("Attempted murder, contrary to section 1 Criminal Attempts Act 1981"),
  "generic_serious_violence_provisional",
);

assert.notEqual(inferAuditorFamilyFromOffence("Dangerous driving causing serious injury"), "violence_domestic_assault");
assert.notEqual(inferAuditorFamilyFromOffence("Dangerous driving"), "fraud_account_control");
assert.equal(inferAuditorFamilyFromOffence("Dangerous driving"), null);

assert.equal(
  resolveWorkflowProfileFromSignals(ctx("Dangerous driving causing serious injury by driving")),
  "generic_motoring_provisional",
);

assert.equal(isClearMoneyLaunderingFraudText("Money laundering contrary to Proceeds of Crime Act"), true);
assert.equal(inferAuditorFamilyFromOffence("Money laundering contrary to Proceeds of Crime Act"), "fraud_account_control");
assert.equal(inferAuditorFamilyFromOffence("Doing an act tending to pervert the course of justice"), null);
assert.equal(
  resolveProvisionalWorkflowFromOffence("Witness intimidation"),
  "generic_provisional",
);

assert.equal(isMotoringOffenceText("Dangerous driving"), true);
assert.equal(isMotoringOffenceText("Section 18 GBH"), false);

console.log("provisional-offence-policy.test.ts: ok");
