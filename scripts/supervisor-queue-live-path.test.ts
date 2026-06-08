/**
 * Supervisor Queue live-path regression — practice_area criminal without criminal_cases row.
 * Run: npx tsx scripts/supervisor-queue-live-path.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import {
  buildSupervisorQueueRow,
  filterSupervisorQueueRows,
} from "../lib/criminal/supervisor-queue/build-supervisor-queue";
import {
  buildComputedSupervisorQueueBundle,
  computedSupervisorSignalsQualifyForQueue,
  buildControlRoomComputedSupervisorSignals,
} from "../lib/criminal/supervisor-queue/build-computed-supervisor-queue-bundle";
import {
  isCriminalSupervisorQueueCase,
  resolveSupervisorQueueComputedCaseIds,
} from "../lib/criminal/supervisor-queue/criminal-queue-case-eligibility";
import { mergeSupervisorQueuePersistenceBundles } from "../lib/criminal/supervisor-queue/merge-supervisor-queue-bundles";
import { resolveSupervisorQueueOpenCaseHref } from "../lib/criminal/supervisor-queue/supervisor-queue-links";

const TARA_CASE_ID = "2964506f-b6df-4194-afec-52fad0aa84e6";

const visibleCases = [
  {
    id: TARA_CASE_ID,
    title: "R v Tara Coleman",
    practice_area: "criminal",
  },
];

const criminalRowsFromDb = new Set<string>();

assert.equal(
  isCriminalSupervisorQueueCase(
    { id: TARA_CASE_ID, practice_area: "criminal" },
    criminalRowsFromDb,
  ),
  true,
  "practice_area criminal qualifies even without criminal_cases row",
);

assert.deepEqual(
  resolveSupervisorQueueComputedCaseIds(visibleCases, criminalRowsFromDb),
  [TARA_CASE_ID],
  "computed case ids include practice_area criminal cases",
);

const generic = loadGoldPack().find((e) => e.truthKey.bundleId === "generic-provisional-sam-okonkwo");
assert.ok(generic?.bundleTextPaths.length, "gold pack fixture for live-like bundle text");
const bundleText = readBundleText(generic!.bundleTextPaths);

const meta = {
  caseId: TARA_CASE_ID,
  title: "R v Tara Coleman",
  hearingDate: null,
};

const docs = [
  {
    id: "doc-live-1",
    name: "bundle.txt",
    updated_at: "2026-06-01T10:00:00.000Z",
    raw_text: bundleText,
    extracted_text: null,
    extracted_json: null,
  },
];

const signals = buildControlRoomComputedSupervisorSignals(meta, docs);
assert.ok(signals, "control-room computed signals available on document bundle");
assert.equal(signals!.qa.status, "required", "supervisor QA required matches case page");
assert.equal(signals!.readiness.available && signals!.readiness.level, "red", "readiness red matches case page");
assert.ok(
  signals!.qa.reasonsForReview.some((r) => /not ready to rely/i.test(r)),
  "includes pre-hearing not-ready reason label",
);
assert.ok(computedSupervisorSignalsQualifyForQueue(signals!), "qualifies for queue inclusion");

const computedBundle = buildComputedSupervisorQueueBundle(meta, docs, {
  now: new Date("2026-06-01T12:00:00.000Z"),
});
assert.ok(computedBundle, "computed bundle built without criminal_cases row");

const row = buildSupervisorQueueRow(
  meta,
  mergeSupervisorQueuePersistenceBundles(null, computedBundle),
  new Date("2026-06-01T12:00:00.000Z"),
);
assert.ok(row, "queue row built for live-path fixture");
assert.ok(row!.buckets.includes("review_required"), "review_required bucket");
assert.ok(row!.buckets.includes("hearing_soon_red"), "hearing_soon_red bucket");
assert.ok(
  row!.reviewReasonLabels.some((l) => /not ready to rely|supervisor review required/i.test(l)),
  "row reason labels include safe review/readiness text",
);

const allRows = filterSupervisorQueueRows([row!], "all");
const redRows = filterSupervisorQueueRows([row!], "red_readiness");
assert.equal(allRows.length, 1, "All filter includes case");
assert.equal(redRows.length, 1, "Red readiness filter includes case");
assert.equal(
  resolveSupervisorQueueOpenCaseHref(row!),
  `/cases/${TARA_CASE_ID}?tab=strategy&controlRoom=1`,
);

console.log("supervisor-queue-live-path.test.ts: ok");
