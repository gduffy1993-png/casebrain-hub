/**
 * Shared contracts: family-compatibility issue codes and internal/system language
 * must never reach solicitor-visible exits (including blocked surfaces).
 * MG5/MG6 provenance titles remain allowed short identifiers.
 *
 * Run: npx tsx scripts/stage3000-enum-boundary-wording-contracts.test.ts
 */
import assert from "node:assert/strict";
import {
  FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY,
  assessFamilyEvidenceCompatibility,
  buildFamilyCompatibilityProtectedMetadata,
  describeFamilyCompatibilityForSolicitor,
  scanSolicitorVisibleInternalLanguageBoundary,
  solicitorVisibleTextContainsFamilyIssueCodes,
  solicitorVisibleTextContainsInternalSystemLanguage,
} from "../lib/criminal/solicitor-family-provenance";
import {
  isDocumentFormTitle,
  isInternalNonSolicitorString,
  formatBlockedCopyPreview,
} from "../lib/criminal/solicitor-visible-sanitization";
import {
  inferSolicitorSurfaceRole,
  scanSolicitorVisibleCopyQuality,
} from "../lib/criminal/solicitor-visible-quality";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const SAMPLE_ISSUES = [
  "intoxilyser_on_non_drink_drive",
  "breath_device_on_non_drink_drive",
  "calibration_on_non_drink_drive",
  "drink_drive_evidence_on_non_drink_drive",
  "cctv_chase_on_driver_information",
] as const;

check("registry covers every FamilyCompatibilityIssue code used in samples", () => {
  for (const code of SAMPLE_ISSUES) {
    assert.ok(FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY.includes(code));
  }
  assert.equal(FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY.length, 10);
});

check("positive: professional family reason has no raw issue codes or system language", () => {
  for (const audience of ["client", "court", "export", "default"] as const) {
    const reason = describeFamilyCompatibilityForSolicitor({
      issues: [...SAMPLE_ISSUES],
      audience,
    });
    assert.equal(solicitorVisibleTextContainsFamilyIssueCodes(reason), false);
    assert.equal(solicitorVisibleTextContainsInternalSystemLanguage(reason), false);
    assert.equal(scanSolicitorVisibleInternalLanguageBoundary(reason).length, 0);
    assert.match(reason, /solicitor review|source bundle|withheld|inconsistent/i);
    assert.match(reason, /Next:|regenerate|Review the source bundle/i);
    assert.doesNotMatch(reason, /internal detector|protected audit|protectedAudit|materialisation|harness/i);
    const display = formatBlockedCopyPreview({ itemLabel: "Export preview", reason });
    assert.equal(scanSolicitorVisibleInternalLanguageBoundary(display).length, 0);
    assert.match(display, /Status: Copy unavailable/);
  }
});

check("positive: export wording has professional what/why/next without audit language", () => {
  const reason = describeFamilyCompatibilityForSolicitor({
    issues: [...SAMPLE_ISSUES],
    audience: "export",
  });
  assert.match(reason, /Export wording has been withheld/i);
  assert.match(reason, /inconsistent with the recorded allegation/i);
  assert.match(reason, /Review the source bundle/i);
  assert.match(reason, /regenerate the export/i);
  assert.doesNotMatch(reason, /detector|protectedAudit|audit metadata|machine metadata/i);
});

check("positive: protected metadata retains exact internal codes", () => {
  const meta = buildFamilyCompatibilityProtectedMetadata({
    issues: [...SAMPLE_ISSUES],
    matterFamily: "driver_information",
  });
  for (const code of SAMPLE_ISSUES) {
    assert.ok(meta.familyCompatibilityIssues.includes(code));
  }
  assert.equal(meta.blockedAt, "family_compatibility");
});

check("negative: snake_case issue codes from registry are detected", () => {
  for (const code of FAMILY_COMPATIBILITY_ISSUE_CODE_REGISTRY) {
    assert.equal(solicitorVisibleTextContainsFamilyIssueCodes(`blocked (${code})`), true);
  }
});

check("negative: system-language phrases are detected on blocked surfaces too", () => {
  const phrases = [
    "Internal detector codes are retained only in protected audit metadata",
    "see protectedAudit field",
    "machine metadata only",
    "from materialisation run",
    "harness expectation",
    "control IDs MAA2-WRD-01",
    "FIND-LEAK-internal",
  ];
  for (const p of phrases) {
    const hits = scanSolicitorVisibleInternalLanguageBoundary(p);
    assert.ok(hits.length > 0, `expected hit for: ${p}`);
  }
});

check("negative: joining issue codes into visible reason is detected", () => {
  const leaked = `Wrong-family wording blocked (${SAMPLE_ISSUES.join(", ")}).`;
  assert.equal(solicitorVisibleTextContainsFamilyIssueCodes(leaked), true);
});

check("negative: assessFamily still emits machine codes (metadata path)", () => {
  const r = assessFamilyEvidenceCompatibility({
    allegation: "Failing to provide driver details contrary to section 172",
    auditFamily: "driver_information",
    prose: "Intoxilyser calibration certificate and CCTV chase required",
  });
  assert.equal(r.ok, false);
  assert.ok(r.issues.length > 0);
  assert.ok(r.issues.some((i) => i.includes("_")));
});

check("positive: ordinary professional words are not stripped/false-flagged", () => {
  const prose =
    "Export wording has been withheld because some source material appears inconsistent with the recorded allegation. Review the source bundle before relying on this content.";
  assert.equal(scanSolicitorVisibleInternalLanguageBoundary(prose).length, 0);
  assert.equal(solicitorVisibleTextContainsInternalSystemLanguage(prose), false);
});

check("positive: MG5/MG6 form titles are not internal strings", () => {
  assert.equal(isDocumentFormTitle("mg5"), true);
  assert.equal(isDocumentFormTitle("MG6"), true);
  assert.equal(isInternalNonSolicitorString("mg5"), false);
  assert.equal(isInternalNonSolicitorString("MG6"), false);
  assert.equal(isInternalNonSolicitorString("abc"), true);
});

check("positive: provenance_title role skips MG casing false positive", () => {
  assert.equal(inferSolicitorSurfaceRole("provenance_title"), "provenance_or_document_title");
  assert.deepEqual(scanSolicitorVisibleCopyQuality("mg5", { surfaceId: "provenance_title" }), []);
  assert.deepEqual(scanSolicitorVisibleCopyQuality("MG6", { surfaceId: "provenance_title" }), []);
});

check("negative: drafting prose still flags protected acronym casing", () => {
  const issues = scanSolicitorVisibleCopyQuality("please send the mg6 schedule to cps", {
    surfaceId: "cps_chase_draft",
  });
  assert.ok(issues.includes("protected_acronym_casing"));
});

check("negative: truncated drafting still flagged on prose surfaces", () => {
  const issues = scanSolicitorVisibleCopyQuality("Charge status | gateStatus_ok", {
    surfaceId: "client_summary",
  });
  assert.ok(issues.includes("pipe_delimited_fragment"));
});

console.log(`OK ${passed} contracts`);
