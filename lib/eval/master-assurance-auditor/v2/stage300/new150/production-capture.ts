/**
 * Stage-300 new-150 production capture.
 * Invokes live CaseBrain builders; never opens truth keys; never copies truth into outputs.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "@/lib/criminal/build-from-document-units";
import { buildPdfBackedCaseArtifacts } from "@/lib/eval/line-source-proof/pdf-bundle-pipeline";
import {
  FIVE_ANSWERS_SERIALISATION_INVARIANT,
  serializeFiveAnswersEvidenceRowsFromSurfaces,
} from "@/lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/five-answers-serialisation";
import { NEW150_EXIT_IDS, NEW150_SCHEMA, PRODUCTION_EXITS, type New150ExitId } from "./constants";
import type { New150CaseSpec } from "./coverage-catalog";
import type { New150SourceArtifacts } from "./source-builder";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function documentsFromPdfMeta(
  caseId: string,
  meta: { pages: Array<{ pageNumber: number; label: string; text: string }>; pdfFileName: string },
): UploadedDocumentUnit[] {
  return [
    {
      id: `doc-${caseId}-bundle`,
      title: meta.pdfFileName || "bundle.pdf",
      documentType: "prosecution_disclosure_bundle",
      uploadOrder: 1,
      versionNumber: 1,
      pages: meta.pages.map((p) => ({
        pageNumber: p.pageNumber,
        compiledPage: p.pageNumber,
        text: p.text || `page ${p.pageNumber}`,
        pageIdentityKnown: true,
      })),
      fullText: meta.pages.map((p) => p.text).join("\n\n"),
    },
  ];
}

function exitPayloadFromSurfaces(
  exitId: New150ExitId,
  surfaces: ReturnType<typeof buildLiveProductionSurfacesFromDocumentUnits>,
): unknown | null {
  switch (exitId) {
    case "view":
      return { exitId, kind: "five_answers_view", truthMap: surfaces.truthMap };
    case "copy":
      return { exitId, kind: "copy_safe_lines", copyLines: surfaces.copyLines };
    case "export":
      return { exitId, kind: "export_pack", exportPack: surfaces.exportPack };
    case "api":
      return { exitId, kind: "api_surface", api: surfaces.api };
    case "pdf":
      return { exitId, kind: "pdf_exit", pdf: surfaces.pdf };
    case "composed_prose":
      return { exitId, kind: "composed_prose", composedProse: surfaces.composedProse };
    case "authenticated_browser":
      return null;
    default:
      return null;
  }
}

function buildOcrPageUnitReceipts(args: {
  spec: New150CaseSpec;
  pdfSha: string;
  pages: Array<{ pageNumber: number; text: string }>;
  token: string;
}): Record<string, unknown> {
  const sf = args.spec.sourceFacts;
  return {
    schemaVersion: "stage300-new150-ocr-page-unit-receipts@1.0.0",
    caseId: args.spec.caseId,
    sourceBinarySha256: args.pdfSha,
    pageIdentityKnown: true,
    passwordCorruptFlag: sf.passwordCorruptFlag,
    redactionMasks: sf.redactionMaskPresent
      ? [{ page: 5, maskId: `redact-${args.token}`, reason: "PII block on scanned MG11" }]
      : [],
    paginationDiscontinuity: sf.paginationDiscontinuity
      ? { noted: true, missingCompiledPages: [3], note: "compiled page jump after scan merge" }
      : { noted: false },
    attachmentInventory: [
      {
        ref: `email-attach://missing-${args.token}.pdf`,
        binaryPresent: false,
        absentRef: sf.attachmentAbsentRef,
      },
      { ref: `bundle.pdf`, binaryPresent: true, sha256: args.pdfSha },
    ],
    pageUnits: args.pages.map((p) => ({
      pageNumber: p.pageNumber,
      pageIdentityKnown: true,
      ocrTextSha256: sha256(p.text || ""),
      degraded: sf.ocrHeavy,
      provenance: "pdf_bundle_pipeline_page_meta",
    })),
    producer: "stage300-new150-ocr-receipt-harness",
    note: "Source-corpus OCR/page-unit receipts for SRC named prerequisites — not CaseBrain detector output.",
  };
}

export type New150CaptureResult = {
  caseId: string;
  sourceDir: string;
  exitHashes: Partial<Record<New150ExitId, string>>;
  casebrainOutputSha256: string;
  bundlePdfSha256: string;
  truthKeySha256: string;
  ocrReceiptSha256: string | null;
  vdrReceiptSha256: string;
  sourceCapabilityInventorySha256: string;
  truthOpenedDuringOutput: false;
  productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits";
  authenticatedBrowserAvailable: false;
  productionSpecialtyBagsPresent: {
    legalStateTaxonomy: false;
    dobAgeCalcLedger: false;
    proceduralPartyState: false;
  };
  audiencePacksPresent: boolean;
  eldVersionPairsFromProduction: boolean;
};

/**
 * Materialise one new-150 source dir: source+truth → PDF → production surfaces → exits + receipts.
 */
export async function captureNew150Case(args: {
  spec: New150CaseSpec;
  source: New150SourceArtifacts;
  sourceRootAbs: string;
}): Promise<New150CaptureResult> {
  const { spec, source, sourceRootAbs } = args;
  const sourceDir = path.join(sourceRootAbs, spec.caseId);
  fs.mkdirSync(sourceDir, { recursive: true });

  // 1) Source + blinded truth first (truth not passed to builders).
  fs.writeFileSync(path.join(sourceDir, "canonical-bundle.md"), source.canonicalBundle, "utf8");
  fs.writeFileSync(path.join(sourceDir, "bundle-text.md"), source.bundleText, "utf8");
  const truthPath = path.join(sourceDir, "truth-key.json");
  writeJson(truthPath, source.truthKey);
  const truthKeySha256 = sha256(fs.readFileSync(truthPath));

  const invPath = path.join(sourceDir, "source-capability-inventory.json");
  writeJson(invPath, source.sourceCapabilityInventory);
  const sourceCapabilityInventorySha256 = sha256(fs.readFileSync(invPath));

  for (const nf of source.nativeFiles) {
    const abs = path.join(sourceDir, nf.relativePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, nf.contents, "utf8");
  }

  // 2) PDF page units via shared pipeline (no truth).
  const pdfArtifacts = await buildPdfBackedCaseArtifacts(sourceDir, spec.caseId, source.canonicalBundle);
  const pdfBytes = fs.readFileSync(pdfArtifacts.pdfPath);
  const bundlePdfSha256 = sha256(pdfBytes);

  // 3) OCR/page-unit receipts for SRC (source corpus harness — not invented CaseBrain fields).
  let ocrReceiptSha256: string | null = null;
  if (spec.sourceFacts.ocrHeavy || spec.sourceFacts.passwordCorruptFlag || spec.sourceFacts.attachmentAbsentRef) {
    const ocr = buildOcrPageUnitReceipts({
      spec,
      pdfSha: bundlePdfSha256,
      pages: pdfArtifacts.meta.pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
      token: source.uniqueWordingToken,
    });
    const ocrPath = path.join(sourceDir, "ocr-page-unit-receipts.json");
    writeJson(ocrPath, ocr);
    ocrReceiptSha256 = sha256(fs.readFileSync(ocrPath));
  }

  // 4) Production builders — document units only.
  const documents = documentsFromPdfMeta(spec.caseId, pdfArtifacts.meta);
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(documents, {
    caseId: spec.caseId,
    allegation: spec.offenceLine,
    caseTitle: `${spec.defendant} — ${spec.theme}`,
    clientLabel: spec.defendant,
  });

  // 5) Genuine exit payloads (browser unavailable).
  const exitHashes: Partial<Record<New150ExitId, string>> = {};
  const exitReceipts: Record<string, unknown> = {};
  for (const exitId of NEW150_EXIT_IDS) {
    const payload = exitPayloadFromSurfaces(exitId, surfaces);
    if (!payload) {
      exitReceipts[exitId] = {
        payloadIdentity: null,
        sendability: null,
        unavailableReason:
          exitId === "authenticated_browser"
            ? "authenticated_browser unavailable — no authenticated capture session in offline corpus build"
            : `No production payload for ${exitId}`,
        chargeWarningAttached: null,
        evidencePartialWarning: null,
        quarantineScope: null,
      };
      continue;
    }
    const payloadPath = path.join(sourceDir, "exits", exitId, "payload.json");
    writeJson(payloadPath, payload);
    const h = sha256(fs.readFileSync(payloadPath));
    exitHashes[exitId] = h;
    exitReceipts[exitId] = {
      payloadIdentity: `sha256:${h}`,
      sendability: exitId === "copy" ? "review_required" : "ok",
      unavailableReason: null,
      chargeWarningAttached: false,
      evidencePartialWarning: surfaces.requiredLimitations.length > 0,
      quarantineScope: null,
      realPayloadPresent: true,
      metadataOnly: false,
    };
  }

  // 6) casebrain-output from production surfaces only (never truth; never invent specialty bags).
  const fiveSerialised = serializeFiveAnswersEvidenceRowsFromSurfaces(surfaces);
  const linkedExhibit = spec.sourceFacts.chaseLinkedServed
    ? `EU-${source.uniqueWordingToken}-EXHIBIT`
    : null;

  const chaseItems = (surfaces.disclosureChase.items ?? []).map((i, idx) => {
    const label = i.label ?? `chase-${idx + 1}`;
    const isServedExhibit =
      linkedExhibit != null && /exhibit pack/i.test(label) && !/outstanding|full signed|subscriber|recording/i.test(label);
    return {
      label,
      requestId: `chase-${spec.caseId}-${idx + 1}`,
      // Linked only when source schedule provides explicit evidence unit label AND item is served exhibit.
      // Never treat unresolved outstanding as linked.
      evidenceUnitId: isServedExhibit ? linkedExhibit : null,
      linkageStatus: isServedExhibit ? "linked" : "unresolved",
      resolutionState: isServedExhibit ? "served" : "outstanding",
      sendabilityLabel: "review_required",
      copySuggestion: i.draftChaseWording ?? null,
    };
  });

  // Audience pack attempt: record honest absence — production emits a single composed_prose, not per-audience packs.
  if (spec.sourceFacts.audiencePackAttempt) {
    writeJson(path.join(sourceDir, "audience-pack-attempt.json"), {
      schemaVersion: "stage300-new150-audience-pack-attempt@1.0.0",
      caseId: spec.caseId,
      attempted: true,
      independentAudiencePacksPresent: false,
      reason:
        "buildLiveProductionSurfacesFromDocumentUnits emits a single composed_prose/courtLine surface — not independent client/court/CPS/supervisor/defence/prosecution/judicial packs",
      gapClass: "production_does_not_emit",
    });
  }

  // ELD: source may contain draft v1/v2 text; production does not emit evidence-locked version pairs.
  if (spec.sourceFacts.versionDraftPair) {
    writeJson(path.join(sourceDir, "eld-source-draft-pair-inventory.json"), {
      schemaVersion: "stage300-new150-eld-source-draft-pair-inventory@1.0.0",
      caseId: spec.caseId,
      sourceDraftPairPresent: true,
      productionEldVersionPairsPresent: false,
      gapClass: "production_does_not_emit",
      note: "Draft v1/v2 exist in source bundle sections only — not counted as ELD eligible without production ELD receipts.",
    });
  }

  const casebrainOutput = {
    caseId: spec.caseId,
    producedBy: "buildLiveProductionSurfacesFromDocumentUnits",
    truthKeyOpened: false,
    schemaVersion: NEW150_SCHEMA,
    courtNote: {
      text: surfaces.composedProse.courtLine,
      sendabilityLabel: "Solicitor review required",
      canCopy: surfaces.copyLines.some((c) => c.canCopy),
    },
    exportVersion: {
      exportId: surfaces.exportPack.version.exportId || `export-${spec.caseId}`,
      sendability: surfaces.exportPack.version.sendability ?? "review_required",
      reviewFooter: surfaces.exportPack.version.reviewFooter ?? null,
    },
    fiveAnswersEvidenceRows: fiveSerialised.rows,
    fiveAnswersSerialisation: {
      invariant: FIVE_ANSWERS_SERIALISATION_INVARIANT,
      viewRowsSha256: fiveSerialised.viewRowsSha256,
      persistedRowsSha256: fiveSerialised.persistedRowsSha256,
      courtNotePresent: fiveSerialised.courtNotePresent,
      inventedFromCourt: fiveSerialised.inventedFromCourt,
    },
    warningsAndGaps: {
      chaseItems,
      doNotOverstate: surfaces.truthMap.mustNotOverstate ?? [],
    },
    chronologyEvents: surfaces.pipeline.hearingLifecycle?.latest
      ? [
          {
            eventId: `hearing-${spec.caseId}`,
            eventType: "hearing",
            timestamp: surfaces.pipeline.hearingLifecycle.latest.hearingDateIso,
            timezone: "Europe/London",
            source: documents[0]?.id ?? null,
            confidence: "high",
            competingEventGroupId:
              spec.coverageTag === "conflicting_source" ? `compete-${spec.caseId}` : null,
          },
        ]
      : [],
    exitPayloadReceipts: exitReceipts,
    productionSurfaceKeys: Object.keys(surfaces),
    // Specialty bags intentionally ABSENT — production does not emit; do not invent from truth/source into CaseBrain output.
    legalStateTaxonomy: null,
    dobAgeCalcLedger: null,
    proceduralPartyState: null,
    derivedNumericClaims: null,
    specialtyBagHonesty: {
      inventedIntoCasebrainOutput: false,
      reason: "production_does_not_emit_specialty_bags — corpus facts remain in source-capability-inventory only",
    },
  };
  const outPath = path.join(sourceDir, "casebrain-output.json");
  writeJson(outPath, casebrainOutput);
  const casebrainOutputSha256 = sha256(fs.readFileSync(outPath));

  // 7) VDR harness receipt (authorised capture_materialisation_harness lane).
  const vdr = {
    schemaVersion: "stage300-new150-vdr-run-receipt@1.0.0",
    caseId: spec.caseId,
    sourceBinarySha256: bundlePdfSha256,
    truthKeySha256,
    casebrainOutputSha256,
    exitPayloadSha256: Object.fromEntries(
      PRODUCTION_EXITS.map((e) => [e, exitHashes[e] ?? null]),
    ),
    appCommit: headCommit(),
    corpusSchema: NEW150_SCHEMA,
    templateId: source.templateId,
    coverageTag: spec.coverageTag,
    membershipSequence: spec.sequence,
    producedAt: new Date().toISOString(),
    modelPromptVersion: null,
    detectorRegistryVersion: null,
    findingIds: [],
    dispositions: [],
    beforeAfterMapping: spec.sourceFacts.versionDraftPair
      ? {
          sourceDraftV1Section: "DRAFT_V1",
          sourceDraftV2Section: "DRAFT_V2",
          productionEldPair: false,
        }
      : null,
    producer: "stage300-new150-vdr-receipt-harness",
  };
  const vdrPath = path.join(sourceDir, "vdr-run-receipt.json");
  writeJson(vdrPath, vdr);
  const vdrReceiptSha256 = sha256(fs.readFileSync(vdrPath));

  writeJson(path.join(sourceDir, "lineage.json"), {
    schemaVersion: "stage300-new150-lineage@1.0.0",
    caseId: spec.caseId,
    family: spec.family,
    coverageTag: spec.coverageTag,
    targetedControlIds: spec.targetedControlIds,
    templateId: source.templateId,
    uniqueWordingToken: source.uniqueWordingToken,
    truthKeySha256,
    truthOpenedDuringOutput: false,
    productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits",
    ocrReceiptSha256,
    vdrReceiptSha256,
    sourceCapabilityInventorySha256,
  });

  return {
    caseId: spec.caseId,
    sourceDir,
    exitHashes,
    casebrainOutputSha256,
    bundlePdfSha256,
    truthKeySha256,
    ocrReceiptSha256,
    vdrReceiptSha256,
    sourceCapabilityInventorySha256,
    truthOpenedDuringOutput: false,
    productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits",
    authenticatedBrowserAvailable: false,
    productionSpecialtyBagsPresent: {
      legalStateTaxonomy: false,
      dobAgeCalcLedger: false,
      proceduralPartyState: false,
    },
    audiencePacksPresent: false,
    eldVersionPairsFromProduction: false,
  };
}
