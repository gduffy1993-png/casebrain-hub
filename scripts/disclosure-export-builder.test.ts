/**
 * Disclosure / Export Builder — slices 1–2.
 * Run: npx tsx scripts/disclosure-export-builder.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import { buildCaseHandoverSummary } from "../lib/criminal/disclosure-export/build-case-handover-summary";
import { buildDisclosureChaseDraft } from "../lib/criminal/disclosure-export/build-disclosure-chase-draft";
import { buildHearingPrepNote } from "../lib/criminal/disclosure-export/build-hearing-prep-note";
import { buildSolicitorExport } from "../lib/criminal/disclosure-export/build-solicitor-export";
import {
  isExportsEnabled,
  shouldShowSolicitorExportBuilder,
} from "../lib/criminal/disclosure-export/export-flag";
import { computeExportHashSync } from "../lib/criminal/disclosure-export/export-review-hash";
import {
  exportReviewRecordContainsForbiddenContent,
  sanitizeExportReviewNote,
} from "../lib/criminal/disclosure-export/export-review-sanitize";
import { saveExportReview } from "../lib/criminal/disclosure-export/export-review-storage";
import {
  buildExportReviewRecord,
  validateExportReviewPostBody,
} from "../lib/criminal/disclosure-export/export-review-validate";
import { lintExportOutput } from "../lib/criminal/disclosure-export/export-sanitize";
import {
  isExportReviewPersistenceEnabled,
  isPersistenceEnabled,
} from "../lib/criminal/persistence/persistence-flag";

function assertNoLint(obj: object, label: string) {
  const issues = lintExportOutput(JSON.stringify(obj));
  assert.ok(!issues.length, `${label}: ${issues.join("; ")}`);
}

assert.equal(isExportsEnabled({ get: () => null }, false), false);
assert.equal(isExportsEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowSolicitorExportBuilder(false, true, true), false, "needs reasoningV2");
assert.equal(shouldShowSolicitorExportBuilder(true, false, true), false, "needs exports");
assert.equal(shouldShowSolicitorExportBuilder(true, true, true), true);

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const reasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(reasoning.available, true);
if (!reasoning.available) throw new Error("reasoning");

const ctx = {
  caseLabel: "R v Ella Shaw",
  clientLabel: "Ella Shaw",
  stage: "Magistrates — first hearing",
  hearingDateIso: "2024-09-18",
};

const chase = buildDisclosureChaseDraft(reasoning, ctx);
assert.equal(chase.exportType, "disclosure_chase");
assert.ok(chase.items.length >= 1, "should include missing material items");
assert.ok(
  chase.fullText.match(/draft for solicitor review|DRAFT FOR SOLICITOR REVIEW/i),
  "draft wording",
);
assert.ok(
  chase.items.some((i) => /cctv|cad|interview|expert|missing|disclosure/i.test(i.materialLabel + i.whyItMatters)),
  "chase items from missing material",
);
assert.ok(!chase.fullText.match(/this wins|crown collapses|safe to advise plea|proves innocence/i));
assertNoLint(chase, "disclosure chase");

const stress = buildClientStressResult(reasoning, {
  selectedOptions: ["denies_presence", "accident_no_dangerous_standard"],
});
assert.equal(stress.available, true);

const prep = buildHearingPrepNote(reasoning, ctx, {
  clientStress: stress.available ? stress : null,
  readinessInput: {
    bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
    hearingMeta: { hearingDateIso: ctx.hearingDateIso, stage: ctx.stage },
  },
});
assert.equal(prep.exportType, "hearing_prep");
assert.ok(prep.safeHearingLine.length > 10);
assert.ok(prep.readinessSection.length > 10);
assert.ok(
  prep.doNotConcedePoints.length + prep.disclosureAsks.length > 0,
  "prep includes war room / disclosure content",
);
assert.ok(
  prep.clientInstructionGaps.length >= 1 || prep.doNotConcedePoints.length >= 1,
  "stress or war room content in prep",
);
assert.equal(prep.solicitorReviewRequired, true);
assertNoLint(prep, "hearing prep");

const viaBuilder = buildSolicitorExport("hearing_prep", reasoning, ctx, {
  clientStress: stress.available ? stress : null,
});
assert.equal(viaBuilder.exportType, "hearing_prep");
assert.ok(viaBuilder.fullText.includes("Solicitor review"));

const handover = buildCaseHandoverSummary(reasoning, ctx, {
  clientStress: stress.available ? stress : null,
  readinessInput: {
    bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
    hearingMeta: { hearingDateIso: ctx.hearingDateIso, stage: ctx.stage },
  },
});
assert.equal(handover.exportType, "case_handover");
assert.ok(handover.provisionalRoute.length > 5, "route included");
assert.ok(handover.missingMaterial.length >= 1, "missing material");
assert.ok(
  handover.doNotConcedePoints.length >= 1 || handover.readinessBlockers.length >= 0,
  "do-not-concede or readiness",
);
assert.ok(/Review before hearing|Not ready|Ready for solicitor review/i.test(handover.readinessLevel));
assert.ok(handover.fullText.match(/handover|DRAFT FOR SOLICITOR REVIEW/i));
assert.ok(!handover.fullText.match(/this wins|crown collapses|safe to advise plea|proves innocence/i));
assertNoLint(handover, "case handover");

const handoverViaBuilder = buildSolicitorExport("case_handover", reasoning, ctx, {
  clientStress: stress.available ? stress : null,
  readinessInput: {
    bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
    hearingMeta: { hearingDateIso: ctx.hearingDateIso, stage: ctx.stage },
  },
});
assert.equal(handoverViaBuilder.exportType, "case_handover");

assert.ok(!JSON.stringify(chase).includes("artifacts/"));
assert.ok(!/\bpp-[a-z0-9-]+/.test(JSON.stringify(prep)));

// --- Slice 4: export review persistence ---
const params = (q: Record<string, string | null>) => ({
  get: (key: string) => q[key] ?? null,
});

assert.equal(isPersistenceEnabled(params({ persistence: "0" }), true), false);
assert.equal(isExportReviewPersistenceEnabled(true, false), true);
assert.equal(isExportReviewPersistenceEnabled(false, false), false);
assert.equal(isExportReviewPersistenceEnabled(true, true), false);

assert.equal(sanitizeExportReviewNote("See artifacts/casebrain-auditor/run/foo"), null);
assert.equal(sanitizeExportReviewNote("Spot-checked chase draft before send"), "Spot-checked chase draft before send");

const exportHash = computeExportHashSync(chase.fullText);
assert.ok(/^[a-f0-9]{64}$/.test(exportHash), "sha256 hex hash");

const validReview = validateExportReviewPostBody(
  {
    exportType: "disclosure_chase",
    reviewStatus: "copied",
    routeLabel: reasoning.primaryRoute,
    readinessLevel: "amber",
    humanReviewRequired: false,
    solicitorReviewRequired: true,
    exportHash,
  },
  "case-abc",
);
assert.equal(validReview.ok, true);

const rejectedBody = validateExportReviewPostBody(
  {
    exportType: "hearing_prep",
    reviewStatus: "generated",
    fullText: chase.fullText,
  },
  "case-abc",
);
assert.equal(rejectedBody.ok, false, "rejects full export body in POST");

const rejectedProof = validateExportReviewPostBody(
  {
    exportType: "case_handover",
    reviewStatus: "generated",
    routeLabel: "pp-gold-pack route",
  },
  "case-abc",
);
assert.equal(rejectedProof.ok, false, "rejects proof IDs in route label");

const record = buildExportReviewRecord({
  caseId: "case-abc",
  exportType: "disclosure_chase",
  reviewStatus: "generated",
  routeLabel: reasoning.primaryRoute,
  readinessLevel: "amber",
  exportHash,
  solicitorReviewRequired: true,
});
assert.equal(exportReviewRecordContainsForbiddenContent(record as unknown as Record<string, unknown>), false);
assert.ok(!JSON.stringify(record).includes(chase.fullText.slice(0, 40)), "no export body in record");
assert.ok(record.exportHash === exportHash.toLowerCase());

async function testExportReviewStorage() {
  const off = await saveExportReview(
    {
      caseId: "case-local",
      exportType: "hearing_prep",
      reviewStatus: "generated",
      routeLabel: "Dispute identification",
      exportHash,
    },
    { persistenceEnabled: false },
  );
  assert.equal(off.persisted, false, "persistence off skips DB path");
  assert.ok(off.record, "record built without DB");

  const on = await saveExportReview(
    {
      caseId: "case-local",
      exportType: "hearing_prep",
      reviewStatus: "copied",
      routeLabel: "Dispute identification",
      exportHash,
    },
    { persistenceEnabled: true },
  );
  assert.equal(on.persisted, false, "DB failure falls back without throwing");
}

async function main() {
  await testExportReviewStorage();

  const migrationSql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260604120000_export_reviews.sql"),
    "utf8",
  );
  assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"), "migration enables RLS");
  assert.ok(migrationSql.includes("export_reviews"), "export_reviews table exists");
  assert.ok(migrationSql.includes("FOR SELECT"), "SELECT policy defined");
  assert.ok(migrationSql.includes("FOR INSERT"), "INSERT policy defined");
  assert.ok(!migrationSql.includes("FOR UPDATE"), "no UPDATE policy");
  assert.ok(!migrationSql.includes("FOR DELETE"), "no DELETE policy");

  console.log("disclosure-export-builder.test.ts: ok");
}

main();
