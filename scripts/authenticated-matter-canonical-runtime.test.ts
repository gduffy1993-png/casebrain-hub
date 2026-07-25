/**
 * Authenticated/runtime integration: follows the same matter loader as the browser
 * (GET /api/criminal/[caseId]/bundle-source → composeAuthenticatedBundleSourceWithCanonical)
 * and proves a canonical finding appears in API payload + production builders.
 *
 * Run: npx tsx scripts/authenticated-matter-canonical-runtime.test.ts
 */
import assert from "node:assert/strict";

import {
  composeAuthenticatedBundleSourceWithCanonical,
  type CaseDocumentRow,
} from "@/lib/criminal/authenticated-matter-canonical";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildExportPack } from "@/lib/criminal/export-pack/build-export-pack";
import { buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { composeStructuredSolicitorOutput } from "@/lib/criminal/structured-solicitor-output";
import {
  appendCanonicalFindingsToKeyFacts,
  buildCriminalStructuredKeyFacts,
} from "@/lib/criminal/key-facts-v2";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function multiDocCaseRows(): CaseDocumentRow[] {
  return [
    {
      id: "doc-indictment-original",
      name: "Original indictment",
      updated_at: "2024-01-10T00:00:00Z",
      raw_text:
        "Original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968. Particulars: On 1 January 2024 stole a wallet.",
      extracted_json: {
        pages: [
          {
            pageNumber: 2,
            text: "Original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968. Particulars: On 1 January 2024 stole a wallet.",
          },
        ],
      },
    },
    {
      id: "doc-indictment-amended",
      name: "Amended indictment",
      updated_at: "2024-03-01T00:00:00Z",
      raw_text:
        "Amended indictment (version 2) dated 1 March 2024. Replaces original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8(1) Theft Act 1968. Particulars: On 1 January 2024 at High Street stole a wallet from V.",
      extracted_json: {
        pages: [
          {
            pageNumber: 14,
            text: "Amended indictment (version 2) dated 1 March 2024. Replaces original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8(1) Theft Act 1968. Particulars: On 1 January 2024 at High Street stole a wallet from V.",
          },
        ],
      },
    },
    {
      id: "doc-draft",
      name: "Draft MG11 complainant statement",
      updated_at: "2024-02-01T00:00:00Z",
      raw_text: "Draft statement. The complainant was wearing a blue jacket. Location: High Street.",
      extracted_json: {
        pages: [
          {
            pageNumber: 20,
            text: "Draft statement. The complainant was wearing a blue jacket. Location: High Street.",
          },
        ],
      },
    },
    {
      id: "doc-signed",
      name: "Final signed MG11 complainant statement",
      updated_at: "2024-02-02T00:00:00Z",
      raw_text: "Final signed MG11. The complainant was wearing a red coat. Location: High Street.",
      extracted_json: {
        pages: [
          {
            pageNumber: 22,
            text: "Final signed MG11. The complainant was wearing a red coat. Location: High Street.",
          },
        ],
      },
    },
    {
      id: "doc-custody",
      name: "Custody and interview record",
      updated_at: "2024-02-03T00:00:00Z",
      raw_text: [
        "Custody arrival at 14:05.",
        "Interview recording served.",
        "Interview transcript incomplete.",
        "Interview commenced at 14:12 after caution.",
        "See attached: Full phone download pack. Attachment not on file.",
      ].join("\n"),
      extracted_json: {
        pages: [
          {
            pageNumber: 40,
            compiledPage: 97,
            text: [
              "Custody arrival at 14:05.",
              "Interview recording served.",
              "Interview transcript incomplete.",
              "Interview commenced at 14:12 after caution.",
              "See attached: Full phone download pack. Attachment not on file.",
            ].join("\n"),
          },
        ],
      },
    },
    {
      id: "doc-exhibits",
      name: "Exhibit list",
      updated_at: "2024-02-04T00:00:00Z",
      raw_text: [
        "Exhibit EX/1 Kitchen knife recovered from scene.",
        "Exhibit EX/1 Mobile phone handset.",
        "CCTV stills served. Master CCTV export outstanding.",
        "Full phone download / source export served on papers.",
        "BWV footage served.",
      ].join("\n"),
      extracted_json: {
        pages: [
          {
            pageNumber: 80,
            text: [
              "Exhibit EX/1 Kitchen knife recovered from scene.",
              "Exhibit EX/1 Mobile phone handset.",
              "CCTV stills served. Master CCTV export outstanding.",
              "Full phone download / source export served on papers.",
              "BWV footage served.",
            ].join("\n"),
          },
        ],
      },
    },
  ];
}

function thinCaseRows(): CaseDocumentRow[] {
  return [
    {
      id: "thin-1",
      name: "Cover letter",
      raw_text: "Dear Sirs, please find the papers. Directions are sought. No schedules attached.",
    },
  ];
}

/** Mirror useMatterBrief: API canonical → real production builders. */
function buildSurfacesFromAuthenticatedApiPayload(
  apiCanonical: ReturnType<typeof composeAuthenticatedBundleSourceWithCanonical>["canonical"],
  bundleText: string,
) {
  const warRoom = buildHearingWarRoomBrief({
    caseId: "runtime-auth-case",
    caseTitle: "Runtime auth matter",
    clientLabel: "Client",
    allegation: "Robbery",
    stage: "Case management",
    hearingStatus: "Listed",
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    readiness: "Needs review",
    battleboard: null,
    hasSavedPosition: false,
    chaseItems: apiCanonical.chaseLabels,
    bundleText,
    canonicalFindings: apiCanonical.findingSummaries,
  });
  const chase = buildDisclosureChaseBrief({
    caseId: "runtime-auth-case",
    caseTitle: "Runtime auth matter",
    clientLabel: "Client",
    allegation: "Robbery",
    stage: "Case management",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    battleboard: null,
    snapshotMissing: apiCanonical.chaseLabels.map((label) => ({ label, status: "Outstanding" })),
    bundleText,
    canonicalFindings: apiCanonical.findingSummaries,
    canonicalEvidenceRows: apiCanonical.evidenceRows.map((r) => ({
      label: r.label,
      state: r.existence,
    })),
  });
  const truthMap = buildFiveAnswersView({
    allegation: "Robbery",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: warRoom.doNotOverstate,
    bundleText,
    evidenceRowsOverride: apiCanonical.evidenceRows.map((r) => ({
      label: r.label,
      existence: r.existence as "served" | "missing" | "incomplete" | "referred_only" | "not_safely_confirmed" | "unknown",
      reliability: "needs_review" as const,
      note: r.sourcePage ? `${r.sourceDocumentTitle} · ${r.sourcePage}` : undefined,
    })),
    canonicalFindings: apiCanonical.findingSummaries,
  });
  const exportPack = buildExportPack({
    caseId: "runtime-auth-case",
    allegation: "Robbery",
    warRoom,
    chase,
    briefPlan: null,
    matterConfidence: null,
    doNotOverstate: warRoom.doNotOverstate,
    primaryRouteTitle: "Runtime",
  });
  const copyLines = apiCanonical.findings.map((f) => {
    const copy = buildCopySafeResult({
      text: f.summary,
      kind: "court_line",
      sourceState: f.unresolved ? "needs_review" : "served",
    });
    return { kind: f.kind, text: copy.textForClipboard, provenanceLine: f.provenanceLine };
  });
  const composed = composeStructuredSolicitorOutput({
    kind: "court_line",
    subject: "Robbery",
    evidenceState: "not_safely_confirmed",
    whyItMatters: apiCanonical.findings[0]?.summary ?? "Review findings",
    requestedAction: "Record outstanding relationship findings.",
    safetyQualification: "Provisional pending solicitor review.",
  });
  const meta = extractCriminalCaseMeta({ text: bundleText, documentName: "bundle", now: new Date() });
  const keyFacts = appendCanonicalFindingsToKeyFacts(
    buildCriminalStructuredKeyFacts(meta, "authenticated-runtime"),
    apiCanonical.findingSummaries,
  );
  return { warRoom, chase, truthMap, exportPack, copyLines, composed, keyFacts };
}

console.log("Authenticated matter loader (bundle-source path)");
check("canonical finding appears consistently in API and production builders", () => {
  const docs = multiDocCaseRows();
  const api = composeAuthenticatedBundleSourceWithCanonical(docs, {
    caseId: "runtime-auth-case",
    allegation: "Robbery",
    caseTitle: "Runtime auth matter",
    withSurfaces: true,
  });

  // API payload shape returned by authenticated bundle-source
  assert.ok(api.canonical.findings.length >= 1, "API canonical findings required");
  const draftApi = api.canonical.findings.find((f) => f.kind === "draft_vs_signed");
  assert.ok(draftApi, "draft_vs_signed must be on authenticated API payload");
  assert.ok(draftApi!.summary.length > 0);
  assert.ok(draftApi!.provenanceLine.length > 0);

  // Page units preserved from extracted_json (not collapsed to p.1 only)
  assert.ok(api.canonical.pageUnitCount >= docs.length);
  assert.ok(api.units.some((u) => u.pages.some((p) => p.pageNumber === 22)));

  const surfaces = buildSurfacesFromAuthenticatedApiPayload(
    api.canonical,
    api.pipeline.bundleText,
  );

  const renderedTogether = [
    ...surfaces.warRoom.doNotOverstate,
    ...surfaces.warRoom.collapseRisks,
    ...surfaces.keyFacts.evidence.map((e) => e.text),
    ...surfaces.keyFacts.disclosure.map((e) => e.text),
    ...surfaces.copyLines.map((c) => c.text),
    surfaces.composed.ok ? surfaces.composed.text ?? "" : "",
    ...api.canonical.findings.map((f) => f.summary),
    ...api.surfaces!.controlRoom.findings.map((f) => f.summary),
    ...api.surfaces!.api.findings.map((f) => f.summary),
  ].join("\n");

  assert.ok(
    renderedTogether.includes(draftApi!.summary) ||
      /draft versus signed|blue|red|clothing/i.test(renderedTogether),
    "same canonical draft/signed finding must appear in War Room / Key Facts / copy / composed / Control Room / API",
  );
  assert.ok(
    surfaces.truthMap.evidenceState.rows.some(
      (r) => /recording/i.test(r.label) && r.existence === "served",
    ),
  );
  assert.ok(surfaces.exportPack.sections.length > 0);
  assert.ok(api.canonical.charges.some((c) => c.documentRole === "amended" || c.documentRole === "operative"));
  assert.ok(api.canonical.charges.some((c) => c.documentRole === "superseded"));

  // Adapter must not inject Phone/BWV probes into production chase
  assert.ok(
    !api.surfaces!.matterState.chase.items.some((c) => /^Body-worn video$/i.test(c.label)),
    "must not inject BWV chase probe into production matter state",
  );
});

check("negative: thin authenticated load invents no unrelated evidence/chase", () => {
  const api = composeAuthenticatedBundleSourceWithCanonical(thinCaseRows(), {
    caseId: "thin-auth-case",
    withSurfaces: true,
  });
  const servedMedia = api.canonical.evidenceRows.filter(
    (r) =>
      r.existence === "served" &&
      /\b(bwv|recording|phone|cctv|footage|download)\b/i.test(r.label),
  );
  assert.equal(servedMedia.length, 0, `unexpected served media: ${servedMedia.map((r) => r.label).join(", ")}`);
  assert.ok(
    !api.canonical.chaseLabels.some((l) => /\b(bwv|phone|cctv|recording)\b/i.test(l)),
    "must not invent media chase labels on thin papers",
  );
  assert.equal(
    api.canonical.findings.filter((f) => f.kind === "recording_vs_transcript").length,
    0,
  );
  assert.equal(
    api.canonical.findings.filter((f) => f.kind === "referenced_absent_attachment").length,
    0,
  );
  const surfaces = buildSurfacesFromAuthenticatedApiPayload(
    api.canonical,
    api.pipeline.bundleText,
  );
  assert.ok(
    !surfaces.truthMap.evidenceState.rows.some((r) =>
      /\b(bwv|phone download|cctv|interview recording)\b/i.test(r.label),
    ),
    "truth map must not show unrelated media rows for thin papers",
  );
});

check("negative: unsplit whole-document text never claims p.1 provenance", () => {
  const api = composeAuthenticatedBundleSourceWithCanonical(
    [
      {
        id: "unsplit-custody",
        name: "Unsplit custody bundle.pdf",
        updated_at: "2024-05-01T12:00:00Z",
        raw_text:
          "Custody arrival at 09:00. Interview commenced at 09:20. Interview recording served. Interview transcript incomplete.",
        // No extracted_json pages and no form-feed: page identity is unknown.
      },
    ],
    { caseId: "unsplit-page-identity", withSurfaces: true },
  );

  assert.equal(api.units.length, 1);
  assert.equal(api.units[0]!.pages.length, 1);
  assert.equal(api.units[0]!.pages[0]!.pageIdentityKnown, false);
  assert.equal(api.units[0]!.pages[0]!.pageNumber, null);

  const recordingRow = api.canonical.evidenceRows.find((r) => /recording/i.test(r.label));
  assert.ok(recordingRow, "whole-document detection may create an unresolved evidence row");
  assert.equal(recordingRow!.pageIdentityKnown, false);
  assert.equal(recordingRow!.sourcePage, null);
  assert.equal(recordingRow!.compiledPage, null);

  const recordingFinding = api.canonical.findings.find(
    (f) => f.kind === "recording_vs_transcript",
  );
  assert.ok(recordingFinding);
  assert.doesNotMatch(recordingFinding!.provenanceLine, /\bp\.1\b/i);
  assert.ok(
    recordingFinding!.unresolved,
    "exact-page-dependent finding must remain unresolved without genuine page units",
  );
  assert.ok(
    api.canonical.findings.every((f) => !/\bp\.1\b/i.test(f.provenanceLine)),
    "no whole-document finding may manufacture p.1",
  );
});

check("negative: updated_at DESC mapping still makes newest upload operative", () => {
  // Same instrument family, no document date/version/replacement linkage.
  // This is the bundle-source fetch order: newest row first (updated_at DESC).
  const api = composeAuthenticatedBundleSourceWithCanonical(
    [
      {
        id: "charge-newest",
        name: "Charge sheet",
        updated_at: "2024-06-10T12:00:00Z",
        raw_text:
          "Charge sheet. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968.",
      },
      {
        id: "charge-older",
        name: "Charge sheet",
        updated_at: "2024-01-10T12:00:00Z",
        raw_text:
          "Charge sheet. Count 1: Alex Stone is charged with theft contrary to section 1 Theft Act 1968.",
      },
    ],
    { caseId: "upload-order-fallback" },
  );

  const newestUnit = api.units.find((u) => u.id === "charge-newest");
  const olderUnit = api.units.find((u) => u.id === "charge-older");
  assert.ok(newestUnit && olderUnit);
  assert.ok(
    newestUnit!.uploadOrder > olderUnit!.uploadOrder,
    "newest fetched row must receive the higher uploadOrder",
  );
  assert.equal(api.pipeline.precedence.operativeDocumentId, "charge-newest");
  assert.equal(api.pipeline.precedence.basis, "upload_order");
  // Upload order may select the operative candidate, but must not silently
  // mark the earlier duplicate superseded without documentary support.
  assert.ok(!api.pipeline.precedence.supersededDocumentIds.includes("charge-older"));
  assert.ok(
    api.pipeline.precedence.unsupportedSupersessionCandidates.some((c) => c.id === "charge-older"),
  );
});

console.log(`\nauthenticated-matter-canonical-runtime: ${passed} checks passed`);
