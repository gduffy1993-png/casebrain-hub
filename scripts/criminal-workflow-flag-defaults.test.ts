/**
 * Criminal pilot workflow flag defaults — slice 1 tests.
 * Run: npx tsx scripts/criminal-workflow-flag-defaults.test.ts
 */
import assert from "node:assert/strict";
import { buildControlRoomCaseHref, isValidCaseId } from "../components/criminal/criminalCaseNavigation";
import { isEvidenceChangesEnabled } from "../lib/criminal/evidence-change-detector/evidence-change-flag";
import { isExportsEnabled } from "../lib/criminal/disclosure-export/export-flag";
import { isPersistenceEnabled } from "../lib/criminal/persistence/persistence-flag";
import { isReasoningV2Enabled } from "../lib/criminal/reasoning-v2/reasoning-v2-flag";
import { isSupervisorQAEnabled } from "../lib/criminal/supervisor-qa/supervisor-qa-flag";
import { buildSupervisorQueueCaseHref } from "../lib/criminal/supervisor-queue/supervisor-queue-links";
import { isSupervisorQueuePageEnabled } from "../lib/criminal/supervisor-queue/supervisor-queue-flag";
import {
  isCriminalPilotDefaultWorkflowFlagsOn,
  resolveCriminalWorkflowFlag,
} from "../lib/criminal/workflow/criminal-workflow-flag-defaults";
import {
  CRIMINAL_PILOT_NAV_HREFS,
  shouldShowInternalDevTools,
} from "../lib/pilot-mode";

const params = (q: Record<string, string | null>) => ({
  get: (key: string) => q[key] ?? null,
});

const CASE_ID = "295d9bee-d14a-461a-aa7b-91872b868e99";
const off = { defaultOn: false };

// --- Legacy off (non-pilot) behaviour unchanged ---
process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "false";
assert.equal(isCriminalPilotDefaultWorkflowFlagsOn(), false);
assert.equal(isReasoningV2Enabled(params({}), false, off), false);
assert.equal(isPersistenceEnabled(params({}), false, off), false);
assert.equal(isSupervisorQAEnabled(params({}), false, off), false);
assert.equal(isEvidenceChangesEnabled(params({}), false, off), false);
assert.equal(isExportsEnabled(params({}), false, off), false);

// --- Pilot defaults ON without URL flags ---
process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";
assert.equal(isCriminalPilotDefaultWorkflowFlagsOn(), true);
assert.equal(isReasoningV2Enabled(params({}), false), true, "reasoningV2 defaults ON");
assert.equal(isPersistenceEnabled(params({}), false), true, "persistence defaults ON");
assert.equal(isSupervisorQAEnabled(params({}), false), true, "supervisor defaults ON");
assert.equal(isEvidenceChangesEnabled(params({}), false), true, "evidenceChanges defaults ON");
assert.equal(isExportsEnabled(params({}), false), true, "exports defaults ON");
assert.equal(isSupervisorQueuePageEnabled(true, true), true);

// --- URL overrides still win ---
assert.equal(isReasoningV2Enabled(params({ reasoningV2: "0" }), true), false);
assert.equal(isPersistenceEnabled(params({ persistence: "0" }), true), false);
assert.equal(isSupervisorQAEnabled(params({ supervisor: "0" }), true), false);
assert.equal(isEvidenceChangesEnabled(params({ evidenceChanges: "0" }), true), false);
assert.equal(isExportsEnabled(params({ exports: "0" }), true), false);
assert.equal(isReasoningV2Enabled(params({ reasoningV2: "1" }), false, off), true);
assert.equal(isPersistenceEnabled(params({ persistence: "1" }), false, off), true);

// --- Clean deep links ---
const openHref = buildSupervisorQueueCaseHref(CASE_ID);
assert.equal(openHref, buildControlRoomCaseHref(CASE_ID));
assert.equal(openHref, `/cases/${CASE_ID}?tab=today&controlRoom=1`);
assert.ok(!openHref?.includes("reasoningV2="), "no redundant reasoningV2 in href");
assert.ok(!openHref?.includes("%2F"), "no encoded path segments");
assert.equal(isValidCaseId("CASE_ID"), false);
assert.equal(buildSupervisorQueueCaseHref("CASE_ID"), null);

// --- Nav visibility for pilot non-admin ---
const nonAdminId = "9df92f69-4b0b-4f2b-816a-a041a9853ec2";
assert.equal(shouldShowInternalDevTools(nonAdminId), false);
assert.ok(CRIMINAL_PILOT_NAV_HREFS.includes("/court-today"));
assert.ok(CRIMINAL_PILOT_NAV_HREFS.includes("/cases"));
assert.ok(CRIMINAL_PILOT_NAV_HREFS.includes("/upload"));
assert.ok(CRIMINAL_PILOT_NAV_HREFS.includes("/supervisor-queue"));
assert.ok(CRIMINAL_PILOT_NAV_HREFS.includes("/settings"));
assert.ok(!CRIMINAL_PILOT_NAV_HREFS.includes("/bin"));
assert.ok(!CRIMINAL_PILOT_NAV_HREFS.includes("/eval"));

assert.equal(
  resolveCriminalWorkflowFlag(params({}), "reasoningV2", false, off),
  false,
  "explicit defaultOff in tests",
);

console.log("criminal-workflow-flag-defaults.test.ts: ok");
