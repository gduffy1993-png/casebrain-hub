#!/usr/bin/env npx tsx
/**
 * CB-HIST-PRESENTATION-MUST-PRESERVE-SEMANTICS
 * CB-HIST-PRESENTATION-CANNOT-SUPPRESS-SOURCE-BACKED-FAMILY
 * Run: npx tsx scripts/demo-presentation-polish.test.ts
 */
import assert from "node:assert/strict";
import {
  displayChaseCardLabel,
  filterBundleFamilyWarnings,
  polishPresentationBlock,
  polishPresentationLine,
  resolveDemoPresentationHearingLabel,
} from "../lib/criminal/demo-presentation-polish";

const taylorHay =
  "Harassment screenshot message pack phone extraction summary subscriber MG11 complainant";

// MG6 / unused schedule must remain schedule family — must NOT become phone download.
assert.match(
  displayChaseCardLabel({
    label: "MG6 / unused schedule clarification",
    mergedFrom: ["MG6C/001 — Phone extraction — summary only"],
    whyItMatters: "Attribution",
  }),
  /MG6|unused schedule/i,
);
assert.ok(
  !/full phone download|source extraction/i.test(
    displayChaseCardLabel({
      label: "MG6 / unused schedule clarification",
      mergedFrom: ["MG6C/001 — Phone extraction — summary only"],
    }),
  ),
);

// Concrete phone chase label still humanises as phone (positive / opposite).
assert.match(
  displayChaseCardLabel({
    label: "Phone extraction source download",
    whyItMatters: "Attribution",
  }),
  /phone|extraction|download/i,
);

// Auxiliary why prose must not reclassify the displayed family.
assert.match(
  displayChaseCardLabel({
    label: "Complainant MG11",
    whyItMatters: "Phone attribution still unclear on the papers",
  }),
  /MG11|complainant/i,
);
assert.ok(
  !/phone download|source extraction/i.test(
    displayChaseCardLabel({
      label: "Complainant MG11",
      whyItMatters: "Phone attribution still unclear on the papers",
    }),
  ),
);

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

// Mixed families: digital context must not suppress source-backed CCTV/BWV/custody.
{
  const mixed = polishPresentationBlock(
    [
      "Phone extraction summary remains relevant.",
      "CCTV of the street is on the papers.",
      "BWV of the arrest is on the papers.",
      "Custody record covers the detention clock.",
    ].join("\n"),
    "harassment phone screenshot CCTV BWV custody record",
  );
  assert.match(mixed, /phone|extraction/i);
  assert.match(mixed, /CCTV/i);
  assert.match(mixed, /BWV/i);
  assert.match(mixed, /custody/i);
}

// Lexical shorten OK; family rewrite NOT OK.
const shortened = polishPresentationLine(
  "appears outstanding on the current papers. remains outstanding",
  taylorHay,
);
assert.equal(shortened, "appears outstanding");

const mg6Line = polishPresentationLine("MG6 / unused schedule clarification remains outstanding", taylorHay);
assert.match(mg6Line, /MG6|unused schedule/i);
assert.ok(!/full phone download|source export/i.test(mg6Line));

const secondMale = polishPresentationLine(
  "Attribution / second male / source-material pressure: second-male involvement remains conditional on served bank/device material.",
  taylorHay,
);
assert.match(secondMale, /second male/i);
assert.ok(!/phone harassment pressure|sender attribution|message export material/i.test(secondMale));

// Without explicit demo env, hearing label must not invent a hard-coded date.
delete process.env.NEXT_PUBLIC_DEMO_PRESENTATION_CASE_ID;
assert.equal(
  resolveDemoPresentationHearingLabel({
    caseId: "4e22fb0f-8631-4cda-9aef-fea6a24f6163",
    currentLabel: "Hearing · 1 Jan 2026",
    bundleHay: "no listing here",
  }),
  "Hearing · 1 Jan 2026",
);

console.log("demo-presentation-polish.test.ts: PASS");
