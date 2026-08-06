/**
 * run-v5 contracts: all-exit family gate, s172 quarantine, youth venue provenance.
 * Run: npx tsx scripts/run-v5-blocker-contracts.test.ts
 */
import assert from "node:assert/strict";
import {
  assessChaseLabelFamilyCompatibility,
  assessFamilyEvidenceCompatibility,
  classifyMatterFamily,
  containsDrinkDriveDeviceWording,
  partitionEvidenceForSolicitorDisplay,
  violatesDrinkDriveCopyInvariant,
} from "@/lib/criminal/solicitor-family-provenance";
import { assessYouthVenueWording, hasSourceBackedYouthVenue } from "@/lib/criminal/solicitor-youth-venue";
import { buildSolicitorVisibleEvidenceView } from "@/lib/criminal/solicitor-visible-evidence-view";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

const s172 = "Fail to provide driver details, contrary to section 172(2) of the Road Traffic Act 1988";

assert.equal(classifyMatterFamily({ allegation: s172, auditFamily: "motoring_road_traffic" }), "driver_information");
assert.equal(
  classifyMatterFamily({ allegation: "Driving with excess alcohol", auditFamily: "motoring" }),
  "drink_driving",
);

const rows: FiveAnswersEvidenceRow[] = [
  { label: "Charge sheet", existence: "served", reliability: "needs_review" },
  { label: "Officer MG11", existence: "served", reliability: "needs_review" },
  { label: "Breath/device procedure summary", existence: "served", reliability: "needs_review" },
  { label: "Device calibration certificate", existence: "missing", reliability: "needs_review" },
  { label: "Full intoxilyser record", existence: "missing", reliability: "needs_review" },
  { label: "CCTV/dashcam export", existence: "referred_only", reliability: "needs_review" },
];

const part = partitionEvidenceForSolicitorDisplay({ allegation: s172, auditFamily: "motoring_road_traffic", evidenceRows: rows });
assert.equal(part.matterFamily, "driver_information");
assert.ok(part.quarantined.length >= 4);
assert.ok(part.compatible.every((r) => !containsDrinkDriveDeviceWording(r.label)));
assert.ok(part.contradiction);
assert.equal(part.contradiction!.status, "review_required");
assert.equal(part.contradiction!.allegationFamily, "driver_information");
assert.match(part.contradiction!.evidenceFamily, /drink-driving/i);

const view = buildSolicitorVisibleEvidenceView(rows, { allegation: s172, auditFamily: "motoring_road_traffic" });
assert.ok(view.displayItems.every((i) => !containsDrinkDriveDeviceWording(i.label)));
assert.ok(view.quarantinedItems.length >= 4);
assert.equal(containsDrinkDriveDeviceWording(view.truthMapText), false);

assert.equal(
  assessChaseLabelFamilyCompatibility({ allegation: s172, label: "CCTV / dashcam export" }).ok,
  false,
);
assert.equal(
  assessChaseLabelFamilyCompatibility({ allegation: s172, label: "Medical / expert source report" }).ok,
  false,
);
assert.equal(
  assessChaseLabelFamilyCompatibility({ allegation: s172, label: "Device calibration certificate" }).ok,
  false,
);

assert.equal(
  violatesDrinkDriveCopyInvariant({
    allegation: s172,
    text: "• Breath/device procedure summary — Served",
    canCopy: true,
  }),
  true,
);
assert.equal(
  violatesDrinkDriveCopyInvariant({
    allegation: "Driving with excess alcohol contrary to RTA",
    text: "• Full intoxilyser record — Missing",
    canCopy: true,
  }),
  false,
);

// Youth venue
assert.equal(hasSourceBackedYouthVenue("YJS report extract; aged 17 years"), false);
assert.equal(hasSourceBackedYouthVenue("Listed at Manchester Youth Court on 12 March 2026"), true);
{
  const a = assessYouthVenueWording({
    prose:
      "Your case is in the youth court and needs age-appropriate disclosure before a provisional strategy can safely be fixed.",
    bundleHay: "YJS report extract. Defendant is 17 years.",
  });
  assert.equal(a.unsafeYouthCourtAssertion, true);
  assert.equal(a.venueSourceBacked, false);
  assert.match(a.displayProse, /recorded as 17|venue must be confirmed/i);
  assert.equal(/you are in the youth court|your case is in the youth court/i.test(a.displayProse), false);
}
{
  const a = assessYouthVenueWording({
    prose: "Your case is in the youth court.",
    bundleHay: "Court: Youth Court at Riverside. Hearing 16 June 2026.",
  });
  assert.equal(a.unsafeYouthCourtAssertion, false);
  assert.equal(a.venueSourceBacked, true);
}

const fam = assessFamilyEvidenceCompatibility({
  allegation: s172,
  prose: "Please provide medical / expert source report.",
});
assert.equal(fam.ok, false);
assert.ok(fam.issues.includes("medical_chase_on_driver_information"));

console.log(JSON.stringify({ ok: true, contract: "run-v5-blocker-contracts" }, null, 2));
