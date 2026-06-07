/**
 * Supervisor sign-off persistence — slice 2 tests.
 * Run: npx tsx scripts/supervisor-signoff.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isSupervisorSignoffPersistenceEnabled,
  isPersistenceEnabled,
} from "../lib/criminal/persistence/persistence-flag";
import { buildSupervisorSignoffRecord } from "../lib/criminal/supervisor-qa/build-supervisor-signoff-record";
import {
  sanitizeSupervisorSignoffLabels,
  sanitizeSupervisorSignoffNote,
  signoffRecordContainsForbiddenContent,
} from "../lib/criminal/supervisor-qa/supervisor-signoff-sanitize";
import {
  saveSupervisorSignoff,
  saveSupervisorSignoffLocal,
} from "../lib/criminal/supervisor-qa/supervisor-signoff-storage";
import { validateSupervisorSignoffPostBody } from "../lib/criminal/supervisor-qa/supervisor-signoff-validate";

const params = (q: Record<string, string | null>) => ({
  get: (key: string) => q[key] ?? null,
});

async function main() {
  assert.equal(isPersistenceEnabled(params({ persistence: "0" }), true), false);
  assert.equal(isSupervisorSignoffPersistenceEnabled(true, false), true);
  assert.equal(isSupervisorSignoffPersistenceEnabled(false, false), false);
  assert.equal(isSupervisorSignoffPersistenceEnabled(true, true), false);

  const record = buildSupervisorSignoffRecord({
    caseId: "case-abc",
    status: "reviewed",
    qaStatus: "required",
    reasonLabels: ["Missing core disclosure", "Unsafe feedback mark"],
    readinessLevel: "amber",
    humanReviewRequired: true,
    evidenceChangeStatus: "Material source change detected",
    note: "Spot-checked before hearing",
    appVersion: "test-v1",
  });

  assert.equal(record.status, "reviewed");
  assert.equal(record.qaStatus, "required");
  assert.equal(record.reasonLabels.length, 2);
  assert.equal(signoffRecordContainsForbiddenContent(record as unknown as Record<string, unknown>), false);

  assert.equal(sanitizeSupervisorSignoffNote("See artifacts/casebrain-auditor/run/foo"), null);
  assert.equal(sanitizeSupervisorSignoffLabels(["pp-gold-pack route"]).length, 0);

  const validBody = validateSupervisorSignoffPostBody(
    {
      status: "escalated",
      qaStatus: "suggested",
      reasonLabels: ["Contradiction unresolved"],
      readinessLevel: "red",
      humanReviewRequired: false,
      evidenceChangeStatus: "New snapshot differs",
      note: "Escalated to partner",
    },
    "case-abc",
  );
  assert.equal(validBody.ok, true);

  const rejectedBody = validateSupervisorSignoffPostBody(
    {
      status: "reviewed",
      qaStatus: "none",
      note: "C:\\Users\\secret\\bundle.pdf",
    },
    "case-abc",
  );
  assert.equal(rejectedBody.ok, false);

  const local = saveSupervisorSignoffLocal({
    caseId: "case-local",
    status: "no_issue",
    qaStatus: "none",
    humanReviewRequired: false,
  });
  assert.equal(local.caseId, "case-local");

  const asyncLocal = await saveSupervisorSignoff(
    {
      caseId: "case-async",
      status: "reviewed",
      qaStatus: "suggested",
      humanReviewRequired: false,
    },
    { persistenceEnabled: false },
  );
  assert.equal(asyncLocal.persisted, false);

  const migrationSql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260602120000_supervisor_signoffs.sql"),
    "utf8",
  );
  assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"));
  assert.ok(migrationSql.includes("supervisor_signoffs"));
  assert.ok(migrationSql.includes("append-only"), "migration documents append-only strategy");

  console.log("supervisor-signoff.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
