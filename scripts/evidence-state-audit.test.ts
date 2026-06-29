/**
 * Evidence-State Accuracy Audit — unit tests (controlled fixtures only).
 * Run: npx tsx scripts/evidence-state-audit.test.ts
 */
import assert from "node:assert/strict";

import { compareTruthItem } from "../lib/eval/evidence-state-audit/compare";
import { isProperlySegregatedCoDefPrediction } from "../lib/eval/evidence-state-audit/co-def-segregation";
import { isWrongDefendantBleedMatch } from "../lib/eval/evidence-state-audit/defendant-relevance";
import { isFalseServed, statesMatchForAccuracy } from "../lib/eval/evidence-state-audit/normalize";
import { isPartialMediaLedgerLabel } from "../lib/eval/evidence-state-audit/partial-media";
import { parseTruthKeyJson } from "../lib/eval/evidence-state-audit/truth-key-parse";
import { adaptCaseBrainOutput } from "../lib/eval/evidence-state-audit/output-adapter";
import { PROOF_PACK_FIXTURE, loadFixture } from "../lib/eval/evidence-state-audit/fixtures";
import type { CaseBrainAuditOutput, TruthKeyEvidenceItem } from "../lib/eval/evidence-state-audit/types";

function syntheticOutput(rows: CaseBrainAuditOutput["fiveAnswersEvidenceRows"]): CaseBrainAuditOutput {
  return adaptCaseBrainOutput({
    caseId: "synthetic",
    fiveAnswersEvidenceRows: rows,
    evidenceStates: [],
    warningsAndGaps: { chaseItems: [] },
  });
}

function item(
  label: string,
  state: TruthKeyEvidenceItem["correct_evidence_state"],
  extra: Partial<TruthKeyEvidenceItem> = {},
): TruthKeyEvidenceItem {
  return { evidence_item: label, correct_evidence_state: state, ...extra };
}

// false-served detection
assert.equal(isFalseServed("referred_only", "served"), true);
assert.equal(isFalseServed("missing", "served"), true);
assert.equal(isFalseServed("served", "served"), false);
assert.equal(isFalseServed("other_defendant_only", "served"), false);

// co-def MG6C/CO row with explicit segregation is tracked, not client bleed
const coDefSegregated = compareTruthItem(
  item("Co-defendant Lee Marsh interview", "other_defendant_only", {
    defendant_relevance: "co_defendant_only",
    evidence_type: "interview",
  }),
  syntheticOutput([
    {
      label: "MG6C/CO — co-defendant-only — co-defendant interview summary — not this defendant — served on bundle.",
      existence: "other_defendant_only",
      reliability: "needs_review",
    },
  ]),
);
assert.equal(coDefSegregated.falseServed, false);
assert.equal(coDefSegregated.wrongDefendantBleed, false);
assert.equal(coDefSegregated.stateAccurate, true);

// co-def in aggregate served line is still bleed
const coDefAggregateBleed = compareTruthItem(
  item("Co-defendant Lee Marsh interview", "other_defendant_only", {
    defendant_relevance: "co_defendant_only",
    evidence_type: "interview",
  }),
  syntheticOutput([
    {
      label: "Served on bundle: MG5; co-defendant interview summary.",
      existence: "served",
      reliability: "needs_review",
    },
  ]),
);
assert.equal(coDefAggregateBleed.wrongDefendantBleed, true);

// non-segregated co-def attribution to client workflow still bleeds
const coDefServed = compareTruthItem(
  item("Co-defendant Lee Marsh interview", "other_defendant_only", {
    defendant_relevance: "co_defendant_only",
    evidence_type: "interview",
  }),
  syntheticOutput([
    {
      label: "Co-defendant Lee Marsh interview transcript — served on bundle.",
      existence: "served",
      reliability: "needs_review",
    },
  ]),
);
assert.equal(coDefServed.falseServed, false);
assert.equal(coDefServed.wrongDefendantBleed, true);
assert.equal(
  isProperlySegregatedCoDefPrediction("MG6C/CO — co-defendant chat export — referred on MG6 — export not served."),
  true,
);

const falseServedCompare = compareTruthItem(
  item("Body-worn video", "referred_only"),
  syntheticOutput([{ label: "Body-worn video (BWV)", existence: "served", reliability: "strong" }]),
);
assert.equal(falseServedCompare.falseServed, true);
assert.equal(falseServedCompare.stateAccurate, false);

// referred-only match (over-cautious missing is acceptable)
const referredOk = compareTruthItem(
  item("Body-worn video", "referred_only"),
  syntheticOutput([{ label: "Body-worn video", existence: "missing", reliability: "needs_review" }]),
);
assert.equal(referredOk.falseServed, false);
assert.equal(referredOk.stateAccurate, true);

// missing match
const missingOk = compareTruthItem(
  item("Custody / PACE record", "missing"),
  syntheticOutput([{ label: "Custody record", existence: "missing", reliability: "needs_review" }]),
);
assert.equal(missingOk.falseServed, false);
assert.equal(missingOk.stateAccurate, true);

// incomplete match
const incompleteOk = compareTruthItem(
  item("Phone screenshots (partial)", "incomplete"),
  syntheticOutput([{ label: "Phone screenshots", existence: "incomplete", reliability: "needs_review" }]),
);
assert.equal(incompleteOk.falseServed, false);
assert.equal(incompleteOk.stateAccurate, true);

// wrong-defendant bleed — generic interview must NOT match co-def-only truth
const genericInterviewNoBleed = compareTruthItem(
  item("Co-defendant Lee Marsh interview", "other_defendant_only", {
    defendant_relevance: "co_defendant_only",
    evidence_type: "interview",
  }),
  syntheticOutput([
    { label: "Interview recording / transcript", existence: "missing", reliability: "needs_review" },
  ]),
);
assert.equal(genericInterviewNoBleed.wrongDefendantBleed, false);

// explicit co-defendant label in output should still bleed
const explicitCoDefBleed = compareTruthItem(
  item("Co-defendant Lee Marsh interview", "other_defendant_only", {
    defendant_relevance: "co_defendant_only",
    evidence_type: "interview",
  }),
  syntheticOutput([
    {
      label: "Co-defendant Lee Marsh interview transcript",
      existence: "missing",
      reliability: "needs_review",
    },
  ]),
);
assert.equal(explicitCoDefBleed.wrongDefendantBleed, true);

// partial BWV clip is incomplete, not false-served
const partialBwvOk = compareTruthItem(
  item("short BWV clip transcript", "incomplete", { evidence_type: "bwv" }),
  syntheticOutput([
    {
      label: "MG6C/SHO — short BWV clip transcript — served on bundle.",
      existence: "incomplete",
      reliability: "needs_review",
    },
  ]),
);
assert.equal(partialBwvOk.falseServed, false);
assert.equal(partialBwvOk.stateAccurate, true);

assert.equal(isPartialMediaLedgerLabel("short BWV clip transcript"), true);
assert.equal(
  isWrongDefendantBleedMatch(
    item("Co-defendant Lee Marsh interview", "other_defendant_only", {
      defendant_relevance: "co_defendant_only",
    }),
    "Interview recording / transcript",
    null,
    true,
  ),
  false,
);

assert.equal(statesMatchForAccuracy("inferred_only", "provisional"), true);

// proof-pack fixture loads and runs without throw
const { truthKey, output } = loadFixture(PROOF_PACK_FIXTURE);
assert.equal(truthKey.caseId, "proof-pack-01");
assert.ok(truthKey.evidenceItems.length >= 5);
assert.equal(output.caseId, "proof-pack-01");

const v2 = parseTruthKeyJson({
  caseId: "sim-test",
  servedEvidence: ["MG5"],
  referredOnlyEvidence: ["BWV"],
  missingEvidence: ["PACE record"],
});
assert.equal(v2.evidenceItems.length, 3);
assert.equal(v2.evidenceItems.find((i) => i.evidence_item === "BWV")?.correct_evidence_state, "referred_only");

console.log("evidence-state-audit.test.ts: ok");
