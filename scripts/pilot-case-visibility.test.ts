/**
 * Pilot case visibility — non-admin users see org cases minus eval clutter.
 * Run: npx tsx scripts/pilot-case-visibility.test.ts
 */
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const {
  filterCasesForPilotUser,
  filterCourtTodayCasesForPilotUser,
  isPilotDemoUploadDisabled,
  isPilotReadyCase,
  summarizePilotCaseFilter,
} = require("../lib/pilot-mode") as typeof import("../lib/pilot-mode");

const { isValidCaseId, buildControlRoomCaseHref } =
  require("../components/criminal/criminalCaseNavigation") as typeof import("../components/criminal/criminalCaseNavigation");

const realOrgCase = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "Case 12",
  summary: "Awaiting summary.",
  practice_area: "criminal",
  eval_pack_id: null,
  eval_pack_name: null,
};

const evalCase = {
  id: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "CB-GOLD Case 1 — stress pack",
  summary: "Eval",
  eval_pack_id: "gold",
  eval_pack_name: "Golden Sweep",
};

const internalTestCase = {
  id: "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "Date-control internal QA matter",
  summary: "Internal",
  practice_area: "criminal",
};

const demoMarcus = {
  id: "dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee",
  title: "R v Marcus Vale",
  summary: "Pilot demo",
  practice_area: "criminal",
  defendant_name: "Marcus Vale",
};

const nonAdminId = "9df92f69-4b0b-4f2b-816a-a41a9853ec2";
const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "admin-test-id";
process.env.NEXT_PUBLIC_ADMIN_USER_ID = adminId;

const pool = [realOrgCase, evalCase, internalTestCase, demoMarcus];

const visible = filterCasesForPilotUser(pool, nonAdminId);
assert.ok(visible.some((c) => c.id === realOrgCase.id), "generic org criminal case stays visible");
assert.ok(visible.some((c) => c.id === demoMarcus.id), "demo allowlist matter stays visible");
assert.ok(!visible.some((c) => c.id === evalCase.id), "eval/stress case hidden");
assert.ok(!visible.some((c) => c.id === internalTestCase.id), "internal test title hidden");

assert.equal(filterCasesForPilotUser(pool, adminId).length, pool.length, "admin sees all cases");

const courtVisible = filterCourtTodayCasesForPilotUser(pool, nonAdminId);
assert.equal(courtVisible.length, visible.length, "Court Today uses same non-admin filter");

assert.equal(isPilotDemoUploadDisabled(nonAdminId), false, "upload not disabled for pilot users");

assert.equal(isPilotReadyCase(realOrgCase), false, "legacy pilot-ready filter would hide generic case");
const diag = summarizePilotCaseFilter(pool, nonAdminId);
assert.equal(diag.rawCount, 4);
assert.equal(diag.visibleCount, 2);
assert.ok(diag.hiddenLegacyPilotReady >= 1, "diagnostics report legacy over-filter count");

assert.equal(isValidCaseId("CASE_ID"), false);
assert.equal(isValidCaseId("[CASE_ID]"), false);
assert.equal(isValidCaseId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), true);
assert.equal(buildControlRoomCaseHref("CASE_ID"), "/cases");
assert.equal(
  buildControlRoomCaseHref("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
  "/cases/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee?tab=strategy&controlRoom=1",
);

console.log("pilot-case-visibility.test.ts: ok");
