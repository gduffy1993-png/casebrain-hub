/**
 * Production exit capture — invokes live CaseBrain builders; never opens truth keys.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "@/lib/criminal/build-from-document-units";
import { buildPdfBackedCaseArtifacts } from "@/lib/eval/line-source-proof/pdf-bundle-pipeline";
import { BATCH10_EXIT_IDS, type Batch10ExitId } from "../schemas";
import type { Deficit120CaseSpec } from "./coverage-catalog";
import type { Deficit120SourceArtifacts } from "./source-builder";
import {
  FIVE_ANSWERS_SERIALISATION_INVARIANT,
  serializeFiveAnswersEvidenceRowsFromSurfaces,
} from "./five-answers-serialisation";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function documentsFromPdfMeta(
  caseId: string,
  meta: { pages: Array<{ pageNumber: number; label: string; text: string }>; pdfFileName: string },
  pdfSha: string,
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
        compiledPage: p.pageNumber, // compiled disclosure PDF — source page ≡ compiled page
        text: p.text || `page ${p.pageNumber}`,
        pageIdentityKnown: true,
      })),
      fullText: meta.pages.map((p) => p.text).join("\n\n"),
    },
  ];
}

function exitPayloadFromSurfaces(
  exitId: Batch10ExitId,
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
      return null; // not technically available without authenticated capture session
    default:
      return null;
  }
}

export type Deficit120CaptureResult = {
  caseId: string;
  sourceDir: string;
  exitHashes: Partial<Record<Batch10ExitId, string>>;
  casebrainOutputSha256: string;
  bundlePdfSha256: string;
  truthKeySha256: string;
  truthOpenedDuringOutput: false;
  productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits";
  authenticatedBrowserAvailable: false;
};

/**
 * Materialise one deficit source dir: PDF → production surfaces → exits + casebrain-output.
 * Truth key is written but never read by builders.
 */
export async function captureDeficit120Case(args: {
  spec: Deficit120CaseSpec;
  source: Deficit120SourceArtifacts;
  sourceRootAbs: string;
}): Promise<Deficit120CaptureResult> {
  const { spec, source, sourceRootAbs } = args;
  const sourceDir = path.join(sourceRootAbs, spec.caseId);
  fs.mkdirSync(sourceDir, { recursive: true });

  // 1) Write source + blinded truth first (truth not passed to builders).
  fs.writeFileSync(path.join(sourceDir, "canonical-bundle.md"), source.canonicalBundle, "utf8");
  fs.writeFileSync(path.join(sourceDir, "bundle-text.md"), source.bundleText, "utf8");
  const truthPath = path.join(sourceDir, "truth-key.json");
  writeJson(truthPath, source.truthKey);
  const truthKeySha256 = sha256(fs.readFileSync(truthPath));

  // 2) PDF page units via shared pipeline (no truth).
  const pdfArtifacts = await buildPdfBackedCaseArtifacts(sourceDir, spec.caseId, source.canonicalBundle);
  const bundlePdfSha256 = sha256(fs.readFileSync(pdfArtifacts.pdfPath));

  // 3) Production builders — document units only.
  const documents = documentsFromPdfMeta(spec.caseId, pdfArtifacts.meta, bundlePdfSha256);
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(documents, {
    caseId: spec.caseId,
    allegation: spec.offenceLine,
    caseTitle: `${spec.defendant} — ${spec.theme}`,
    clientLabel: spec.defendant,
  });

  // 4) Capture genuine exit payloads (browser unavailable).
  const exitHashes: Partial<Record<Batch10ExitId, string>> = {};
  const exitReceipts: Record<string, unknown> = {};
  for (const exitId of BATCH10_EXIT_IDS) {
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
    };
  }

  // 5) casebrain-output from production surfaces only (never truth).
  // Five Answers rows = deep copy of the same truthMap rows written to the view exit.
  // Court prose never seeds evidence rows.
  const fiveSerialised = serializeFiveAnswersEvidenceRowsFromSurfaces(surfaces);
  const casebrainOutput = {
    caseId: spec.caseId,
    producedBy: "buildLiveProductionSurfacesFromDocumentUnits",
    truthKeyOpened: false,
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
      chaseItems: (surfaces.disclosureChase.items ?? []).map((i, idx) => ({
        label: i.label,
        requestId: `chase-${spec.caseId}-${idx + 1}`,
        evidenceUnitId: null,
        resolutionState: "outstanding",
        sendabilityLabel: "review_required",
        copySuggestion: i.draftChaseWording ?? null,
      })),
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
              spec.variant === "competing_chrono" ? `compete-${spec.caseId}` : null,
          },
        ]
      : [],
    exitPayloadReceipts: exitReceipts,
    productionSurfaceKeys: Object.keys(surfaces),
  };
  const outPath = path.join(sourceDir, "casebrain-output.json");
  writeJson(outPath, casebrainOutput);

  // Lineage receipt (no truth contents).
  writeJson(path.join(sourceDir, "lineage.json"), {
    schemaVersion: "deficit120-lineage@1.0.0",
    caseId: spec.caseId,
    family: spec.family,
    variant: spec.variant,
    templateId: source.templateId,
    uniqueWordingToken: source.uniqueWordingToken,
    truthKeySha256,
    truthOpenedDuringOutput: false,
    productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits",
  });

  return {
    caseId: spec.caseId,
    sourceDir,
    exitHashes,
    casebrainOutputSha256: sha256(fs.readFileSync(outPath)),
    bundlePdfSha256,
    truthKeySha256,
    truthOpenedDuringOutput: false,
    productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits",
    authenticatedBrowserAvailable: false,
  };
}
