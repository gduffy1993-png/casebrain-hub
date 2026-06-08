/**
 * Front-matter metadata patterns for large murder test bundle (CB-MURDER-TEST-0001).
 * Run: npx tsx scripts/murder-bundle-metadata-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { buildBundleSizeProfile } from "../lib/bundle/bundle-display-profile";
import { formatCaseBundleHealthLabel } from "../lib/criminal/format-case-bundle-health";
import { repairDisplayWordSpacing } from "../lib/criminal/display-text";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const MURDER_FRONT = `
Defendant Leon Hale | DOB 17/09/1996
Charge Murder, contrary to common law
Court Northchester Crown Court
Next hearing 22 May 2026 at 10:00
Stage PTPH / plea and trial preparation
Custody status Remanded in custody
Defence position Not guilty. Self-defence / causation / attribution disputed.
Bundle size: 1 PDF / 1000 pages

Leon Hale is charged with murder after Marcus Vale was fatally stabbed near Eastgate Estate.
Crown route relies on presence, argument, CCTV movement, partial forensic links, blood/phone material and witness accounts.
Key missing material includes full CCTV, CAD/999, BWV, pathology, DNA/fingerprints, phone data, interview transcript and custody material.
`;

const meta = extractBundleCaseMetadata(MURDER_FRONT);
assert.equal(meta.defendantName, "Leon Hale");
assert.equal(meta.offenceDisplay, "Murder, contrary to common law");
assert.equal(meta.court, "Northchester Crown Court");
assert.ok(meta.nextHearingIso);
assert.match(meta.stage ?? "", /PTPH/i);
assert.match(meta.bailStatus ?? "", /Remanded in custody/i);
assert.match(meta.defencePosition ?? "", /Not guilty — self-defence/i);
assert.doesNotMatch(meta.defencePosition ?? "", /^The$/i);

const profile = buildBundleSizeProfile(1, 250_000, [
  { name: "CB-MURDER-TEST-0001_1000_page_criminal_defence_bundle.pdf" },
]);
assert.equal(profile.pageCount, 1000);
assert.ok(profile.isLargeByPages);

const health = formatCaseBundleHealthLabel({
  documentCount: 1,
  combinedTextLength: 250_000,
  capabilityTier: "thin",
  documentRows: [
    {
      id: "1",
      name: "CB-MURDER-TEST-0001_1000_page_criminal_defence_bundle.pdf",
      updatedAt: null,
      lenExtracted: 0,
      lenRaw: 0,
      lenBody: 250_000,
    },
  ],
  bundleTextHint: MURDER_FRONT,
});
assert.match(health, /Large bundle detected/);
assert.match(health, /1000 pages/);
assert.doesNotMatch(health, /Thin \(1 doc\)/);

assert.equal(
  repairDisplayWordSpacing("reliability.Outstanding disclosure"),
  "reliability. Outstanding disclosure",
);
assert.equal(
  repairDisplayWordSpacing("material.Outstanding CCTV"),
  "material. Outstanding CCTV",
);
assert.equal(
  repairDisplayWordSpacing("continuity statement and export logMay affect readiness"),
  "continuity statement and export log. May affect readiness",
);

const bb = buildStrategyBattleboard({
  bundle_text: `${MURDER_FRONT}\nsecond male attribution disputed on file.`,
});
assert.equal(bb.primary_route?.title, "Attribution / second male / source-material pressure");
assert.match(
  bb.primary_route?.hearing_line ?? "",
  /attribution, second-male involvement, and source-material issues remain conditional/i,
);
assert.doesNotMatch(bb.primary_route?.hearing_line ?? "", /separate defendant and count issues/i);
assert.match(
  bb.primary_route?.collapse_risks?.join(" ") ?? "",
  /Crown may link the missing\/source material to Leon Hale if served/i,
);
assert.doesNotMatch(
  bb.primary_route?.collapse_risks?.join(" ") ?? "",
  /Co-defendant evidence|Joint enterprise|this defendant and count/i,
);

console.log("murder-bundle-metadata-extract.test.ts: OK");
