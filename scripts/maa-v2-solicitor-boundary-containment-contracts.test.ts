/**
 * Focused contracts for solicitor-boundary containment (fixture IDs + raw supervisor source).
 * Run: npx tsx scripts/maa-v2-solicitor-boundary-containment-contracts.test.ts
 */

import assert from "node:assert/strict";

import {
  extractSourceBackedUrn,
  isInternalCorpusOrFixtureCaseId,
  makeSolicitorVisibleExportId,
  resolveSolicitorVisibleMatterReference,
  stripInternalCorpusIdentifiers,
  looksLikeHarnessOrMalformedSource,
} from "../lib/criminal/solicitor-visible-matter-reference";
import {
  audiencePackCopyablePayloadText,
  buildContainedSupervisorAudienceBundle,
  buildContainedSupervisorAudiencePayload,
  containsInternalOrHarnessLanguage,
  containsSupervisorCopyMachineTerminology,
  formatSupervisorProfessionalCopyText,
  RAW_SOURCE_EXTRACT_LABEL,
} from "../lib/criminal/supervisor-raw-source-containment";
import { WORDING_INTERNAL_FIXTURE_TOKENS_RE } from "../lib/eval/master-assurance-auditor/v2/stage300/essential/constants";

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

check("fixture case IDs are detected", () => {
  assert.equal(isInternalCorpusOrFixtureCaseId("s150-d120-001-homicide-causation-clean"), true);
  assert.equal(isInternalCorpusOrFixtureCaseId("s300-n150-001-homicide"), true);
  assert.equal(isInternalCorpusOrFixtureCaseId("demo-audit-12"), true);
});

check("export id never embeds fixture case id", () => {
  const id = makeSolicitorVisibleExportId({
    generatedAt: "2026-08-01T12:00:00.000Z",
    internalCaseId: "s150-d120-001-homicide-causation-clean",
  });
  assert.ok(!/s150-/i.test(id));
  assert.ok(!/s300-/i.test(id));
  assert.match(id, /^exp-[a-f0-9]+-\d+/);
});

check("matter reference prefers source URN and omits fixture case id", () => {
  const urn = extractSourceBackedUrn("URN: 01AB100001726 Defendant: Avery");
  assert.equal(urn, "01AB100001726");
  const visible = resolveSolicitorVisibleMatterReference({
    caseId: "s150-d120-001-homicide-causation-clean",
    urnCandidates: ["RESTRICTED BUNDLE URN: 01AB100001726"],
  });
  assert.equal(visible, "URN 01AB100001726");
  const omitted = resolveSolicitorVisibleMatterReference({
    caseId: "s150-d120-001-homicide-causation-clean",
  });
  assert.equal(omitted, null);
});

check("strip removes S300/s150 tokens from labels", () => {
  assert.equal(
    stripInternalCorpusIdentifiers("Interview recording S300-0001-homi-ocr_bi"),
    "Interview recording",
  );
  assert.equal(
    stripInternalCorpusIdentifiers("CCTV master export S300-0001-homi-ocr_bi - Subscriber/account"),
    "CCTV master export — Subscriber/account",
  );
  assert.ok(!/matter token/i.test(stripInternalCorpusIdentifiers("Matter token UQ-0001-homi. Evidence on file")));
  assert.ok(!/UQ-/i.test(stripInternalCorpusIdentifiers("Exhibit pack UQ-0001-homi served")));
});

check("harness/malformed source detection", () => {
  assert.equal(
    looksLikeHarnessOrMalformedSource(
      "Format notes: Stage-300 new-150 control-coverage materialisation Coverage tag: specialty_fitness",
    ),
    true,
  );
  assert.equal(looksLikeHarnessOrMalformedSource('decision "` guilt'), true);
  assert.equal(looksLikeHarnessOrMalformedSource("CCTV remains outstanding on the current papers."), false);
});

check("supervisor containment retains exact raw separately and professional payload has no raw text", () => {
  const raw =
    "RESTRICTED — PROSECUTION DISCLOSURE BUNDLE URN: 01AB100001726 Format notes: Stage-300 materialisation Coverage tag: specialty_fitness Matter token UQ-0001-homi decision \"` guilt S300-0001-homi";
  const bundle = buildContainedSupervisorAudienceBundle({ exactRawSource: raw });
  assert.equal(bundle.protectedRawSource?.text, raw);
  assert.equal(bundle.protectedRawSource?.canCopy, false);
  assert.equal(bundle.protectedRawSource?.sendability, "blocked");
  assert.equal(bundle.protectedRawSource?.excludedFromExport, true);
  assert.equal(bundle.protectedRawSource?.label, RAW_SOURCE_EXTRACT_LABEL);
  assert.ok(bundle.protectedRawSource?.pointer?.startsWith("protected-raw:"));
  assert.equal(bundle.professionalPayload.protectedRawSourcePointer, bundle.protectedRawSource?.pointer);
  const professionalJson = JSON.stringify(bundle.professionalPayload);
  assert.ok(!professionalJson.includes(raw));
  assert.ok(!/Stage-300/i.test(bundle.professionalPayload.professionalSummary));
  assert.ok(bundle.professionalPayload.audit.exactRawSourceRetained);
  const legacy = buildContainedSupervisorAudiencePayload({ exactRawSource: raw });
  assert.ok(!("rawSourceExtract" in legacy));
});

check("NEGATIVE: supervisor clipboard is plain prose — no raw source and no machine/audit terminology", () => {
  const raw =
    "Format notes: Stage-300 new-150 Matter token UQ-0099-homi S300-0099-homi decision \"` guilt specialty_fitness";
  const bundle = buildContainedSupervisorAudienceBundle({
    exactRawSource: raw,
    findings: [
      { kind: "document_role", summary: "Operative papers are on the file." },
      { kind: "draft_vs_signed", summary: "Signed statement service is not safely confirmed." },
    ],
  });
  const copyText = formatSupervisorProfessionalCopyText(bundle.professionalPayload);
  assert.ok(!copyText.trimStart().startsWith("{"));
  assert.ok(!copyText.includes(raw));
  assert.equal(containsInternalOrHarnessLanguage(copyText), false);
  assert.equal(containsSupervisorCopyMachineTerminology(copyText), false);
  assert.ok(!/supervisor_risk_contained/i.test(copyText));
  assert.ok(!/document_role/i.test(copyText));
  assert.ok(!/draft_vs_signed/i.test(copyText));
  assert.ok(!/rawSourceSha256/i.test(copyText));
  assert.ok(!/rawSourceByteLength/i.test(copyText));
  assert.ok(!/harnessOrMalformedDetected/i.test(copyText));
  assert.ok(!/\baudit\b/i.test(copyText));
  assert.ok(!/Stage-300/i.test(copyText));
  assert.ok(!/S300-/i.test(copyText));
  assert.ok(!/matter token/i.test(copyText));
  assert.ok(/Supported findings:/i.test(copyText) || /Supervisor review required/i.test(copyText));
  assert.ok(/Required action:/i.test(copyText));

  const pack = {
    audienceId: "supervisor",
    payloadText: copyText,
    canCopy: true,
    sendability: "provisional_check_source" as const,
    professionalCopyText: copyText,
    machineMetadata: bundle.professionalPayload,
  };
  const copyable = audiencePackCopyablePayloadText(pack);
  assert.equal(copyable, copyText);
  assert.equal(containsSupervisorCopyMachineTerminology(copyable), false);
  // Machine metadata may retain structured fields — but must not be what copy returns.
  assert.ok(pack.machineMetadata?.audit?.rawSourceSha256);
  assert.ok(!JSON.stringify(copyable).includes(pack.machineMetadata!.audit.rawSourceSha256!));
});

check("NEGATIVE: blocked pack copy API returns null (cannot export protected boundary)", () => {
  const blocked = audiencePackCopyablePayloadText({
    payloadText: "should not copy",
    canCopy: false,
    sendability: "blocked",
  });
  assert.equal(blocked, null);
});

check("NEGATIVE: supervisor JSON-shaped payloadText is refused by copy API", () => {
  const refused = audiencePackCopyablePayloadText({
    audienceId: "supervisor",
    payloadText: JSON.stringify({ kind: "supervisor_risk_contained", audit: { rawSourceSha256: "abc" } }),
    canCopy: true,
    sendability: "ok",
  });
  assert.equal(refused, null);
});

check("export identity helpers omit fixture Case ID from visible stamp lines", () => {
  const caseId = "s150-d120-001-homicide-causation-clean";
  const generatedAt = "2026-08-01T12:00:00.000Z";
  const exportId = makeSolicitorVisibleExportId({ generatedAt, internalCaseId: caseId, matterUrn: "01AB100001726" });
  const matterRef = resolveSolicitorVisibleMatterReference({
    caseId,
    urnCandidates: ["URN: 01AB100001726"],
  });
  const versionBlock = [
    "— VERSION STAMP —",
    `Export ID: ${exportId}`,
    matterRef ? `Matter reference: ${matterRef}` : null,
    `Generated: ${generatedAt}`,
  ]
    .filter(Boolean)
    .join("\n");
  assert.ok(!/Case ID:/i.test(versionBlock));
  assert.ok(!/s150-/i.test(versionBlock));
  assert.match(versionBlock, /Matter reference:\s*URN 01AB100001726/);
  assert.match(versionBlock, /Export ID:\s*exp-01AB1000017/);
});

check("expanded internal-language scanner matches Stage-300 / S300 / s150", () => {
  assert.ok(WORDING_INTERNAL_FIXTURE_TOKENS_RE.test("Stage-300 new-150 control-coverage"));
  assert.ok(WORDING_INTERNAL_FIXTURE_TOKENS_RE.test("token S300-0001-homi present"));
  assert.ok(WORDING_INTERNAL_FIXTURE_TOKENS_RE.test("case s150-d120-001-homicide-causation-clean"));
  assert.ok(WORDING_INTERNAL_FIXTURE_TOKENS_RE.test("Coverage tag specialty_fitness"));
});

console.log("All solicitor-boundary-containment contracts passed.");
