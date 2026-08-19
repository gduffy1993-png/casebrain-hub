#!/usr/bin/env npx tsx
/**
 * CB-HIST-PRESENTATION-CANNOT-CREATE-EVIDENCE-STATE
 * Run: npx tsx scripts/expand-truth-map-rows.test.ts
 */
import assert from "node:assert/strict";
import { expandTruthMapRowsForDisplay } from "../lib/criminal/five-answers/expand-truth-map-rows";
import { ensureDigitalHarassmentGapRows } from "../lib/criminal/demo-presentation-polish";
import { evidenceRowFromSourceState } from "../lib/criminal/five-answers/evidence-trace";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const allegation = "Harassment, contrary to section 2 of the Protection from Harassment Act 1997";

// Harassment + screenshots only → must NOT invent phone download / subscriber / MG11 states.
const screenshotOnly = [
  evidenceRowFromSourceState(
    "Screenshot / message pack",
    "served",
    "Served on papers — screenshots only.",
  ),
];

const chase = {
  disclosureSummary: "Screenshots referred on papers.",
  safeCourtLine: "Provisional position.",
  primaryItems: [
    {
      label: "MG6 / unused schedule clarification",
      source: "MG6C",
      baseStatus: "outstanding",
      draftChaseWording: "Please clarify the unused schedule.",
      courtLine: "",
      whyItMatters: "Disclosure",
      evidenceAnchor: null,
    },
  ],
  items: [],
} as unknown as DisclosureChaseBrief;

const expanded = expandTruthMapRowsForDisplay({
  rows: screenshotOnly,
  chase,
  allegation,
  doNotOverstate: ["Do not state the defendant sent messages unless attribution is served and safe."],
});

assert.equal(expanded.length, 1, "must not invent additional evidence rows");
assert.equal(expanded[0]!.label, "Screenshot / message pack");
assert.equal(expanded[0]!.existence, "served");
assert.ok(!expanded.some((r) => /full phone download/i.test(r.label)));
assert.ok(!expanded.some((r) => /subscriber/i.test(r.label)));

const gapPass = ensureDigitalHarassmentGapRows(screenshotOnly, "harassment screenshot whatsapp", allegation);
assert.equal(gapPass.length, 1, "gap helper must not invent rows");

// Opposite: explicit outstanding phone extraction / subscriber remain represented.
const withExplicitGaps = [
  ...screenshotOnly,
  evidenceRowFromSourceState("Phone extraction source download", "missing"),
  evidenceRowFromSourceState("Subscriber / attribution data", "missing"),
  evidenceRowFromSourceState("Complainant MG11", "not_safely_confirmed"),
];
const kept = expandTruthMapRowsForDisplay({
  rows: withExplicitGaps,
  chase,
  allegation,
  doNotOverstate: [],
});
assert.ok(kept.some((r) => /phone extraction/i.test(r.label) && r.existence === "missing"));
assert.ok(kept.some((r) => /subscriber/i.test(r.label) && r.existence === "missing"));
assert.ok(kept.some((r) => /screenshot|message pack/i.test(r.label) && r.existence === "served"));
assert.ok(
  kept.some((r) => /mg11/i.test(r.label) && r.existence === "not_safely_confirmed"),
  "MG11 unknown/NSC must not become draft/unsigned via presentation",
);
assert.ok(!kept.some((r) => /mg11/i.test(r.label) && r.existence === "incomplete"));

console.log("expand-truth-map-rows.test.ts: PASS");
