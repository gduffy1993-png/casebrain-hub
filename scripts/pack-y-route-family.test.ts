/**
 * Pack Y 40x40 offence-family route detection.
 * Run: npx tsx scripts/pack-y-route-family.test.ts
 */
import assert from "node:assert/strict";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const AFFRAY_SNIPPET = `
Offence: Affray, contrary to common law
Defendant Jordan Price
Crowd disorder near station. Multiple suspects on CCTV obstructed.
Presence accepted but violence disputed. Role disputed. Identification disputed.
Police BWV not served. Witness viewpoint poor.
`;

const FRAUD_SNIPPET = `
Offence: Fraud by false representation
Dishonesty disputed. Account control disputed.
Banking schedules outstanding. Device extraction not served.
Email/IP logs missing. Account ownership disputed. Document attribution in issue.
`;

const PWITS_SNIPPET = `
Offence: Possession with intent to supply Class A drugs
Possession disputed. Knowledge disputed. Intent to supply disputed.
Phone attribution disputed. Shared address. Multiple occupants. Room ownership disputed.
Phone extraction outstanding. Cash/drugs continuity incomplete.
`;

const ROBBERY_SNIPPET = `
Offence: Robbery
Identification disputed. Masked suspect. Poor lighting.
Unknown male seen on CCTV. Participation disputed.
Stolen property recovered elsewhere. ID procedure issue on file.
`;

function assertPrimary(bundleText: string, offence: string, expectedTitle: string, notCausation = true) {
  const bb = buildStrategyBattleboard({
    case_id: "test",
    bundle_text: bundleText,
    offence_label: offence,
  });
  assert.equal(bb.primary_route?.title, expectedTitle, `offence=${offence}`);
  if (notCausation) {
    assert.notEqual(bb.primary_route?.title, "Causation / injury route pressure");
  }
}

assertPrimary(
  AFFRAY_SNIPPET,
  "Affray, contrary to common law",
  "Public-order participation / identification / role pressure",
);
assertPrimary(
  FRAUD_SNIPPET,
  "Fraud by false representation",
  "Fraud / account-control / dishonesty pressure",
);
assertPrimary(
  PWITS_SNIPPET,
  "Possession with intent to supply Class A drugs",
  "Possession / knowledge / phone-attribution pressure",
);
assertPrimary(
  ROBBERY_SNIPPET,
  "Robbery",
  "Identification / participation / attribution pressure",
);

const affray = buildStrategyBattleboard({
  case_id: "test",
  bundle_text: AFFRAY_SNIPPET,
  offence_label: "Affray",
});
assert.match(
  affray.primary_route?.hearing_line ?? "",
  /Participation, identification, and role remain conditional/i,
);
assert.doesNotMatch(affray.primary_route?.hearing_line ?? "", /separate defendant and count/i);

console.log("pack-y-route-family.test.ts: OK");
