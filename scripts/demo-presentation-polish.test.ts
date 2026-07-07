#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  displayChaseBulletLine,
  displayChaseCardLabel,
  displayChaseItemText,
  filterBundleFamilyWarnings,
  polishPresentationBlock,
  polishPresentationLine,
  resolveDemoPresentationHearingLabel,
} from "../lib/criminal/demo-presentation-polish";

const taylorHay =
  "Harassment screenshot message pack phone extraction summary subscriber MG11 complainant";

assert.equal(
  displayChaseCardLabel({
    label: "MG6 / unused schedule clarification",
    mergedFrom: ["MG6C/001 — Phone extraction — summary only"],
    whyItMatters: "Attribution",
  }),
  "Full phone download / source extraction",
);

assert.equal(
  displayChaseCardLabel({
    label: "mG6 / unused schedule clarification",
    mergedFrom: ["MG6C/003 — Subscriber data — outstanding"],
  }),
  "Subscriber / account data",
);

assert.ok(!/mg6\s*\/\s*unused/i.test(displayChaseCardLabel({ label: "MG6 / unused schedule clarification", mergedFrom: ["screenshot pack served"] })));

const filtered = filterBundleFamilyWarnings(
  [
    "Do not import BWV unless the papers support it.",
    "Do not state the defendant sent messages unless attribution is served and safe.",
    "Do not assume drug continuity without forensic continuity.",
  ],
  taylorHay,
);

assert.ok(!filtered.some((l) => /bwv/i.test(l)));
assert.ok(!filtered.some((l) => /drug continuity/i.test(l)));
assert.ok(filtered.some((l) => /attribution|messages/i.test(l)));

assert.match(displayChaseBulletLine("MG6 / unused schedule clarification — Attribution"), /phone|subscriber|message|digital/i);

const courtLine = polishPresentationLine(
  "Attribution / second male / source-material pressure: second-male involvement remains conditional on served bank/device material.",
  taylorHay,
);
assert.equal(courtLine, "Digital attribution / phone harassment pressure: sender attribution remains conditional on served message export material.");

const detailText = displayChaseItemText(
  "MG6 / unused schedule clarification may affect CAD/999 timing.",
  {
    label: "MG6 / unused schedule clarification",
    mergedFrom: ["MG6C/001 — Phone extraction — summary only"],
    whyItMatters: "Phone harassment attribution",
  },
);
assert.ok(!/MG6 \/ unused|mG6|CAD\/999/i.test(detailText));
assert.match(detailText, /phone|digital|source/i);

const exportPreview = polishPresentationBlock(
  [
    "MG6 / unused schedule clarification",
    "Do not import BWV unless the papers support it.",
    "Do not import custody safeguards unless the papers support it.",
    "Do not import drugs continuity unless the papers support it.",
    "Do not state the defendant sent messages unless attribution is served and safe.",
  ].join("\n"),
  taylorHay,
);
assert.ok(!/MG6 \/ unused|BWV|custody safeguards|drugs continuity/i.test(exportPreview));
assert.match(exportPreview, /phone|digital|attribution|messages/i);

assert.equal(
  resolveDemoPresentationHearingLabel({
    caseId: "4e22fb0f-8631-4cda-9aef-fea6a24f6163",
    currentLabel: "Hearing · 1 Jan 2026",
    bundleHay: "PTPH listed — 15 July 2026, 10:00, Northgate Magistrates' Court.",
  }),
  "PTPH · 15 Jul 2026 at 10:00",
);

console.log("demo-presentation-polish.test.ts: PASS");
