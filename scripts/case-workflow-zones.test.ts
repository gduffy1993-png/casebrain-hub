/**
 * Case workflow zone routing — layout only.
 * Run: npx tsx scripts/case-workflow-zones.test.ts
 */
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const {
  buildCaseZoneHref,
  buildDefaultCriminalCaseHref,
  normalizeCriminalCaseTabFromUrl,
  resolvePilotWorkflowZone,
  getDefaultCriminalCaseTab,
} = require("../lib/criminal/case-workflow-zones") as typeof import("../lib/criminal/case-workflow-zones");

const { resolveCaseWorkflowActiveTab } =
  require("../components/criminal/workflow/useCaseWorkflowActiveTab") as typeof import("../components/criminal/workflow/useCaseWorkflowActiveTab");

const { buildCaseWorkflowTabHref, buildControlRoomCaseHref } =
  require("../components/criminal/criminalCaseNavigation") as typeof import("../components/criminal/criminalCaseNavigation");

const CASE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

assert.equal(getDefaultCriminalCaseTab(), "today");
assert.equal(buildDefaultCriminalCaseHref(CASE_ID), `/cases/${CASE_ID}?tab=today&controlRoom=1`);
assert.equal(buildControlRoomCaseHref(CASE_ID), `/cases/${CASE_ID}?tab=today&controlRoom=1`);
assert.equal(buildCaseZoneHref(CASE_ID, "papers"), `/cases/${CASE_ID}?tab=papers&controlRoom=1`);

assert.equal(normalizeCriminalCaseTabFromUrl("strategy"), "papers");
assert.equal(normalizeCriminalCaseTabFromUrl("hearing-war-room"), "today");
assert.equal(normalizeCriminalCaseTabFromUrl("documents"), "file");
assert.equal(normalizeCriminalCaseTabFromUrl("disclosure-chase"), "disclosure-chase");

assert.equal(resolvePilotWorkflowZone("strategy", ""), "papers");
assert.equal(resolvePilotWorkflowZone("hearing-war-room", ""), "today");
assert.equal(resolvePilotWorkflowZone("documents", ""), "file");
assert.equal(resolveCaseWorkflowActiveTab({ get: (k) => (k === "tab" ? "documents" : null) }, "", true), "file");
assert.ok(buildCaseWorkflowTabHref(CASE_ID, "documents").includes("tab=file"));

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "false";
assert.equal(getDefaultCriminalCaseTab(), "strategy");
assert.equal(
  buildControlRoomCaseHref(CASE_ID),
  `/cases/${CASE_ID}?tab=strategy&controlRoom=1`,
);

console.log("case-workflow-zones.test.ts: ok");
