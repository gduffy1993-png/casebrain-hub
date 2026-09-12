/**
 * What building the board costs on a bundle the size of a real Crown Court case.
 *
 * The gates each ask the papers whether a family is established, every card asks separately, and the
 * pipeline runs a dozen passes: on the case with the most papers that came to 859 gate calls reading
 * 110 million characters between them, and the board took 31 seconds. That is a hung tab, in front of
 * a solicitor, on the case that needs the board most. So the cost is asserted here rather than left to
 * be discovered live — the ceiling is generous, and still an order of magnitude below the failure.
 *
 * The bundle below is synthetic but shaped like the real thing: schedule rows carrying references and
 * flattened status cells, and advisory prose that names CCTV only to forbid inventing it.
 */
import assert from "node:assert/strict";

import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { stripDoNotInventAdvisory } from "../lib/criminal/chase-source-gate";

// Correctness first: the advisory clause goes, the real CCTV wording stays.
const stripped = stripDoNotInventAdvisory(
  "Do not invent CCTV that the papers do not establish. Canal Store exterior CCTV continuity log remains outstanding.",
);
assert.ok(!/do not invent/i.test(stripped), "advisory clause should be stripped");
assert.ok(
  stripped.includes("continuity log remains outstanding"),
  "real CCTV wording should survive stripping",
);

const scheduleRows = Array.from({ length: 900 }, (_, i) => {
  const n = String(i + 1).padStart(3, "0");
  const status = i % 3 === 0 ? "OutstandingNot served" : "Served summary/draft";
  return `MG6/${n} Exhibit ${n} statement and continuity note for listed item ${n}${status}`;
});
const advisoryProse = Array.from(
  { length: 60 },
  () =>
    "Do not invent CCTV or BWV coverage that the served papers do not establish, and do not assume missing footage. " +
    "The officer should not be approached directly about listed exhibits pending disclosure review.",
);
const bundleText = [...advisoryProse, ...scheduleRows].join("\n");

const started = Date.now();
const brief = buildDisclosureChaseBrief({
  caseId: "cost-guard",
  caseTitle: "Cost Guard",
  clientLabel: null,
  allegation: "Murder",
  stage: null,
  hearingStatus: null,
  hearingDateIso: null,
  bundleHealth: "partial",
  positionStatus: null,
  battleboard: null,
  snapshotMissing: [],
  bundleText,
  profileHint: null,
} as never);
const ms = Date.now() - started;

assert.ok(brief.primaryItems.length > 0, "a bundle full of stated gaps should produce a board");
assert.ok(ms < 5_000, `board build over ${bundleText.length} chars took ${ms}ms`);

console.log(
  `chase-gate-cost-truth: PASS (${bundleText.length} chars, ${brief.primaryItems.length} cards, ${ms}ms)`,
);
