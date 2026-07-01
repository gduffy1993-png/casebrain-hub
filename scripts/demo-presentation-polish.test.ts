#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  displayChaseBulletLine,
  displayChaseCardLabel,
  filterBundleFamilyWarnings,
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

console.log("demo-presentation-polish.test.ts: PASS");
