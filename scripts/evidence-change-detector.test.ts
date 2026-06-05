/**
 * New Evidence Change Detector — slice 1 + slice 2.
 * Run: npx tsx scripts/evidence-change-detector.test.ts
 */
import assert from "node:assert/strict";
import { buildEvidenceChangeSnapshot } from "../lib/criminal/evidence-change-detector/build-evidence-change-snapshot";
import { buildEvidenceSourceState } from "../lib/criminal/evidence-change-detector/build-evidence-source-state";
import { compareEvidenceChanges } from "../lib/criminal/evidence-change-detector/compare-evidence-changes";
import {
  isEvidenceChangesEnabled,
  shouldShowEvidenceChangeDetector,
} from "../lib/criminal/evidence-change-detector/evidence-change-flag";
import {
  lintEvidenceChangeOutput,
  snapshotBlobContainsForbiddenContent,
} from "../lib/criminal/evidence-change-detector/evidence-change-sanitize";
import type { EvidenceChangeSnapshot } from "../lib/criminal/evidence-change-detector/evidence-change-types";
import type { ReasoningV2ViewModel } from "../lib/criminal/reasoning-v2/reasoning-v2-types";

function baseReasoning(overrides: Partial<ReasoningV2ViewModel> = {}): ReasoningV2ViewModel {
  return {
    charge: "Theft",
    stage: "Magistrates",
    primaryRoute: "Dispute identification",
    whyRouteIsLive: "Identification pressure on papers.",
    proofPointsUnderPressure: [{ label: "Identification", pressureCount: 2 }],
    evidenceHelpingDefence: [],
    evidenceHurtingDefence: [],
    missingMaterial: [{ label: "CCTV master export", sourceSection: "MG6", sourceBasis: "Outstanding", confidence: "provisional" }],
    contradictions: [],
    collapseRisks: [],
    routeChangeTriggers: [],
    disclosureChasePriorities: [{ label: "CCTV master/export log", chaseNote: "Chase timetable" }],
    safeNextAction: "Chase CCTV master before hearing.",
    doNotOverstateWarning: "Do not finalise route from stills only.",
    humanReviewRequired: false,
    humanReviewReasons: [],
    warRoom: {
      safeHearingLine: "Identification remains unresolved on served papers.",
      courtRecordRequests: [],
      disclosureTimetableRequests: [],
      doNotConcede: ["Do not concede identification"],
      doNotOverstate: "Provisional only.",
      solicitorReviewRequired: false,
      solicitorReviewReasons: [],
    },
    ...overrides,
  };
}

function assertNoLint(obj: object, label: string) {
  const issues = lintEvidenceChangeOutput(JSON.stringify(obj));
  assert.ok(!issues.length, `${label}: ${issues.join("; ")}`);
}

assert.equal(isEvidenceChangesEnabled({ get: () => null }, false), false);
assert.equal(isEvidenceChangesEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowEvidenceChangeDetector(false, true, true), false, "needs reasoningV2");
assert.equal(shouldShowEvidenceChangeDetector(true, false, true), false, "needs evidenceChanges");
assert.equal(shouldShowEvidenceChangeDetector(true, true, true), true);

const current = buildEvidenceChangeSnapshot({ reasoning: baseReasoning() });
assertNoLint(current, "snapshot");
assert.ok(current.missingMaterialLabels.some((l) => /cctv/i.test(l)));

const noPrev = compareEvidenceChanges(null, current);
assert.equal(noPrev.available, true);
if (!noPrev.available) throw new Error("no prev");
assert.equal(noPrev.hasPreviousSnapshot, false);
assert.ok(/no saved snapshot/i.test(noPrev.changeSummary));

const previous: EvidenceChangeSnapshot = {
  ...current,
  missingMaterialLabels: ["CCTV master export", "Interview transcript"],
  contradictionLabels: [],
  readinessLevel: "amber",
  timestamp: "2024-01-01T00:00:00.000Z",
};

const servedCctv: EvidenceChangeSnapshot = {
  ...current,
  missingMaterialLabels: ["Interview transcript"],
  readinessLevel: "green",
  humanReviewRequired: false,
  timestamp: "2024-02-01T00:00:00.000Z",
};

const closed = compareEvidenceChanges(previous, servedCctv);
assert.equal(closed.available, true);
if (!closed.available) throw new Error("closed");
assert.ok(
  closed.closedMissingItems.some((l) => /cctv|closed/i.test(l)),
  "CCTV closed change",
);
assert.ok(
  closed.readinessImpact.some((l) => /amber|green|readiness changed/i.test(l)),
  "readiness amber→green",
);
assertNoLint(closed, "closed cctv");

const withContradiction: EvidenceChangeSnapshot = {
  ...servedCctv,
  contradictionLabels: ["Witness timing — unresolved on papers"],
  humanReviewRequired: true,
  readinessLevel: "red",
};

const contra = compareEvidenceChanges(servedCctv, withContradiction);
assert.equal(contra.available, true);
if (!contra.available) throw new Error("contra");
assert.ok(
  contra.newOrChangedContradictions.some((l) => /contradiction|review/i.test(l)),
  "new contradiction flagged",
);
assert.equal(contra.solicitorReviewRequired, true);
assertNoLint(contra, "contradiction");

const transcriptPrev: EvidenceChangeSnapshot = {
  ...previous,
  missingMaterialLabels: ["Interview transcript summary only", "CCTV master export"],
};
const transcriptCurr: EvidenceChangeSnapshot = {
  ...transcriptPrev,
  missingMaterialLabels: ["CCTV master export"],
  warRoomHearingLine: "Interview content should be reviewed against served transcript.",
};
const transcript = compareEvidenceChanges(transcriptPrev, transcriptCurr);
assert.equal(transcript.available, true);
if (!transcript.available) throw new Error("transcript");
assert.ok(
  transcript.closedMissingItems.some((l) => /interview|closed/i.test(l)),
  "interview item closed",
);
assert.ok(transcript.warRoomHearingLineUpdate, "hearing line update");
assert.ok(
  !JSON.stringify(transcript).match(/proves innocence|defence now wins|safe to advise plea/i),
  "no forbidden phrases",
);

const badBlob = JSON.stringify({
  routeLabel: "artifacts/casebrain-auditor/x",
  missingMaterialLabels: ["pp-abc-123"],
});
assert.equal(snapshotBlobContainsForbiddenContent(badBlob), true);

const goodBlob = JSON.stringify(current);
assert.equal(snapshotBlobContainsForbiddenContent(goodBlob), false);

assert.equal(compareEvidenceChanges(previous, null).available, false);

// --- Slice 2: source-state material change ---
const sourceA = buildEvidenceSourceState({
  documentCount: 3,
  combinedTextLength: 4000,
  snippets: { mg5: "x", mg6: null, exhibits: null },
  documentRows: [{ updatedAt: "2024-01-01T10:00:00.000Z" }],
  frontMatterScan: "MG5 summary on file.",
});
const sourceB = buildEvidenceSourceState({
  documentCount: 5,
  combinedTextLength: 9000,
  snippets: { mg5: "x", mg6: "y", exhibits: null },
  documentRows: [{ updatedAt: "2024-02-01T10:00:00.000Z" }],
  frontMatterScan: "MG5 summary on file with more pages.",
});
assertNoLint(sourceA, "source state A");
assert.ok(!JSON.stringify(sourceA).includes("bundle.pdf"));
assert.ok(!JSON.stringify(sourceA).includes("artifacts/"));

const snapWithSource = buildEvidenceChangeSnapshot({
  reasoning: baseReasoning(),
  sourceStateInput: {
    documentCount: 3,
    combinedTextLength: 4000,
    snippets: { mg5: "x" },
    frontMatterScan: "MG5 summary on file.",
  },
});
assert.ok(snapWithSource.sourceState);
assertNoLint(snapWithSource, "snapshot with source state");

const unchangedLabels: EvidenceChangeSnapshot = {
  ...current,
  sourceState: sourceA,
  timestamp: "2024-01-01T00:00:00.000Z",
};
const unchangedCurrent: EvidenceChangeSnapshot = {
  ...current,
  sourceState: sourceA,
  timestamp: "2024-02-01T00:00:00.000Z",
};
const noMaterial = compareEvidenceChanges(unchangedLabels, unchangedCurrent);
assert.equal(noMaterial.available, true);
if (!noMaterial.available) throw new Error("noMaterial");
assert.equal(noMaterial.sourceMaterialChanged, false);
assert.ok(/no obvious material change/i.test(noMaterial.changeSummary));

const prevSource: EvidenceChangeSnapshot = {
  ...current,
  sourceState: sourceA,
  timestamp: "2024-01-01T00:00:00.000Z",
};
const currSource: EvidenceChangeSnapshot = {
  ...current,
  sourceState: sourceB,
  timestamp: "2024-02-01T00:00:00.000Z",
};
const docUpload = compareEvidenceChanges(prevSource, currSource);
assert.equal(docUpload.available, true);
if (!docUpload.available) throw new Error("docUpload");
assert.equal(docUpload.sourceMaterialChanged, true);
assert.ok(
  docUpload.sourceStateChanges.some((l) => /document count|text length/i.test(l)),
  "doc/text length changes",
);
assert.ok(/source material appears to have changed/i.test(docUpload.changeSummary));
assert.ok(docUpload.supervisorElevationLabel?.includes("Supervisor review suggested"));
assert.equal(docUpload.solicitorReviewRequired, true);
assertNoLint(docUpload, "doc upload compare");

const amberPrev: EvidenceChangeSnapshot = {
  ...prevSource,
  readinessLevel: "amber",
};
const redCurr: EvidenceChangeSnapshot = {
  ...prevSource,
  readinessLevel: "red",
  humanReviewRequired: true,
};
const readinessDrop = compareEvidenceChanges(amberPrev, redCurr);
assert.equal(readinessDrop.available, true);
if (!readinessDrop.available) throw new Error("readinessDrop");
assert.ok(
  readinessDrop.readinessImpact.some((l) => /readiness changed|review required/i.test(l)),
  "amber to red",
);
assert.equal(readinessDrop.solicitorReviewRequired, true);

const forbiddenCompare = compareEvidenceChanges(
  { ...prevSource, routeLabel: "Defence stronger on papers" },
  currSource,
);
assert.equal(forbiddenCompare.available, true);
if (!forbiddenCompare.available) throw new Error("forbiddenCompare");
assert.ok(
  !JSON.stringify(forbiddenCompare).match(/defence stronger|defence weaker|this wins/i),
  "forbidden outcome phrases sanitized",
);

console.log("evidence-change-detector.test.ts: ok");
