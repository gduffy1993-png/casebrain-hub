/**
 * Gap-close rematerialisation over the SAME new-150 population.
 * Preserves original hashes; writes additive gap-close-v1 artefacts; updates live capture files.
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
import { materialiseStructuredPacket } from "@/lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise";
import {
  NEW150_ARTIFACT_ROOT,
  NEW150_CANDIDATE_ROOT,
  NEW150_EXIT_IDS,
  NEW150_SCHEMA,
  NEW150_SOURCE_ROOT,
  PRODUCTION_EXITS,
  type New150ExitId,
} from "./constants";
import { buildNew150Catalog } from "./coverage-catalog";
import { buildAudiencePacksFromProductionSurfaces } from "./audience-packs-from-surfaces";
import { captureEldVersionPairFromProduction } from "./eld-version-pair-capture";
import { materialiseSpecialtyBagsFromSource } from "./specialty-from-source";
import {
  buildPerControlDenominatorReport,
  scanCaseCapability,
  type CaseCapabilitySnapshot,
} from "./named-prerequisite-scan";
import type { New150CaptureResult } from "./production-capture";

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

function preserveOriginalHashes(sourceDir: string, gapDir: string): Record<string, string | null> {
  const files = [
    "canonical-bundle.md",
    "truth-key.json",
    "casebrain-output.json",
    "vdr-run-receipt.json",
    "source-capability-inventory.json",
    "lineage.json",
    "bundle.pdf",
    "ocr-page-unit-receipts.json",
  ];
  const hashes: Record<string, string | null> = {};
  for (const f of files) {
    const p = path.join(sourceDir, f);
    hashes[f] = fs.existsSync(p) ? sha256(fs.readFileSync(p)) : null;
  }
  writeJson(path.join(gapDir, "original-capture-hashes.json"), {
    schemaVersion: "stage300-new150-original-capture-hashes@1.0.0",
    preservedAt: new Date().toISOString(),
    hashes,
  });
  // Keep copies of original outputs for audit
  const preservedDir = path.join(gapDir, "preserved-original");
  fs.mkdirSync(preservedDir, { recursive: true });
  for (const f of ["casebrain-output.json", "vdr-run-receipt.json"]) {
    const src = path.join(sourceDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(preservedDir, f));
    }
  }
  return hashes;
}

export async function rematerialiseGapCloseCase(args: {
  caseId: string;
  defendant: string;
  offenceLine: string;
  theme: string;
  coverageTag: string;
  uniqueTokenHint?: string;
}): Promise<{
  caseId: string;
  originalHashes: Record<string, string | null>;
  newCasebrainOutputSha256: string;
  changedOutputStrings: boolean;
  audiencePacksPresent: boolean;
  specialtyHarnessPresent: boolean;
  eldPairPresent: boolean;
  vdrEnriched: boolean;
  capture: New150CaptureResult;
}> {
  const repoRoot = process.cwd();
  const sourceDir = path.join(repoRoot, NEW150_SOURCE_ROOT, args.caseId);
  const gapDir = path.join(sourceDir, "gap-close-v1");
  fs.mkdirSync(gapDir, { recursive: true });

  const originalHashes = preserveOriginalHashes(sourceDir, gapDir);
  const canonical = fs.readFileSync(path.join(sourceDir, "canonical-bundle.md"), "utf8");
  // Never open truth-key for builders.
  const truthKeySha256 = originalHashes["truth-key.json"];

  // Specialty from SOURCE only
  const specialty = materialiseSpecialtyBagsFromSource({
    caseId: args.caseId,
    canonicalBundle: canonical,
    defendant: args.defendant,
  });
  writeJson(path.join(gapDir, "specialty-bags-harness.json"), {
    ...specialty,
    role: "independent_source_side_expectations_for_auditor_testing_only",
    notCaseBrainOutput: true,
    notFromTruthKey: true,
    notFromCaseBrainProductionEmitter: true,
  });
  writeJson(path.join(sourceDir, "specialty-bags-harness.json"), {
    ...specialty,
    role: "independent_source_side_expectations_for_auditor_testing_only",
    notCaseBrainOutput: true,
    notFromTruthKey: true,
    notFromCaseBrainProductionEmitter: true,
  });

  // Production rematerialisation on existing bundle text (rebuild PDF for page units)
  const pdfArtifacts = await buildPdfBackedCaseArtifacts(sourceDir, args.caseId, canonical);
  const bundlePdfSha256 = sha256(fs.readFileSync(pdfArtifacts.pdfPath));
  const documents = documentsFromPdfMeta(args.caseId, pdfArtifacts.meta);
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(documents, {
    caseId: args.caseId,
    allegation: args.offenceLine,
    caseTitle: `${args.defendant} — ${args.theme}`,
    clientLabel: args.defendant,
  });

  const audience = buildAudiencePacksFromProductionSurfaces({
    caseId: args.caseId,
    allegation: args.offenceLine,
    clientLabel: args.defendant,
    surfaces,
  });
  writeJson(path.join(gapDir, "audience-packs.json"), audience);
  writeJson(path.join(sourceDir, "audience-packs.json"), audience);

  // Exits
  const exitHashes: Partial<Record<New150ExitId, string>> = {};
  const exitReceipts: Record<string, unknown> = {};
  for (const exitId of NEW150_EXIT_IDS) {
    const payload = exitPayloadFromSurfaces(exitId, surfaces);
    if (!payload) {
      exitReceipts[exitId] = {
        payloadIdentity: null,
        unavailableReason:
          exitId === "authenticated_browser"
            ? "authenticated_browser unavailable — deferred separate lane"
            : `No production payload for ${exitId}`,
        realPayloadPresent: false,
        metadataOnly: false,
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
      realPayloadPresent: true,
      metadataOnly: false,
    };
  }

  const fiveSerialised = serializeFiveAnswersEvidenceRowsFromSurfaces(surfaces);
  const tokenMatch = canonical.match(/S300-[0-9a-f]+-[A-Za-z0-9_-]+/);
  const token = tokenMatch?.[0] ?? `S300-${args.caseId.slice(-8)}`;
  const linkedExhibit = /evidenceUnitRef=EU-/i.test(canonical) ? `EU-${token}-EXHIBIT` : null;

  const chaseItems = (surfaces.disclosureChase.items ?? []).map((i, idx) => {
    const label = i.label ?? `chase-${idx + 1}`;
    const isServedExhibit =
      linkedExhibit != null && /exhibit pack/i.test(label) && !/outstanding|full signed|subscriber|recording/i.test(label);
    return {
      label,
      requestId: `chase-${args.caseId}-${idx + 1}`,
      evidenceUnitId: isServedExhibit ? linkedExhibit : null,
      linkageStatus: isServedExhibit ? "linked" : "unresolved",
      resolutionState: isServedExhibit ? "served" : "outstanding",
      sendabilityLabel: "review_required",
      copySuggestion: i.draftChaseWording ?? null,
    };
  });

  // Merge specialty bags onto casebrain-output ONLY via harness provenance channel:
  // Bags are written as top-level fields with explicit harness provenance so evaluators
  // can exercise named prerequisites (unlock-path lane = capture_materialisation_harness).
  // They are NOT claimed as CaseBrain production emitters.
  const casebrainOutput = {
    caseId: args.caseId,
    producedBy: "buildLiveProductionSurfacesFromDocumentUnits",
    gapCloseVersion: "gap-close-v1",
    truthKeyOpened: false,
    schemaVersion: NEW150_SCHEMA,
    courtNote: {
      text: surfaces.composedProse.courtLine,
      sendabilityLabel: "Solicitor review required",
      canCopy: surfaces.copyLines.some((c) => c.canCopy),
    },
    exportVersion: {
      exportId: surfaces.exportPack.version.exportId || `export-${args.caseId}`,
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
    warningsAndGaps: { chaseItems, doNotOverstate: surfaces.truthMap.mustNotOverstate ?? [] },
    chronologyEvents: surfaces.pipeline.hearingLifecycle?.latest
      ? [
          {
            eventId: `hearing-${args.caseId}`,
            eventType: "hearing",
            timestamp: surfaces.pipeline.hearingLifecycle.latest.hearingDateIso,
            timezone: "Europe/London",
            source: documents[0]?.id ?? null,
            confidence: "high",
          },
        ]
      : [],
    exitPayloadReceipts: exitReceipts,
    productionSurfaceKeys: Object.keys(surfaces),
    audiencePackSetRef: "audience-packs.json",
    // Specialty bags must NOT appear on CaseBrain output. Independent expectations live in specialty-bags-harness.json only.
    legalStateTaxonomy: null,
    dobAgeCalcLedger: null,
    derivedNumericClaims: null,
    proceduralPartyState: null,
    specialtyBagHonesty: {
      inventedIntoCasebrainOutputFromTruth: false,
      caseBrainProductionEmitter: false,
      harnessBagsWrittenIntoCasebrainOutput: false,
      independentExpectationsArtefact: "specialty-bags-harness.json",
      roleOfHarnessBags: "independent_source_side_expectations_for_auditor_testing_only",
      productGap:
        "CaseBrain does not emit legalStateTaxonomy / dobAgeCalcLedger / proceduralPartyState / derivedNumericClaims",
    },
  };
  const outPath = path.join(sourceDir, "casebrain-output.json");
  writeJson(outPath, casebrainOutput);
  writeJson(path.join(gapDir, "casebrain-output.json"), casebrainOutput);
  const newCasebrainOutputSha256 = sha256(fs.readFileSync(outPath));

  // ELD dual production run for draft-pair cases
  let eldPairPresent = false;
  if (/===\s*SECTION:\s*DRAFT_V1\s*===/i.test(canonical)) {
    const eld = await captureEldVersionPairFromProduction({
      caseId: args.caseId,
      allegation: args.offenceLine,
      defendant: args.defendant,
      theme: args.theme,
      canonicalBundle: canonical,
      workDir: path.join(gapDir, "eld-work"),
    });
    if (eld) {
      writeJson(path.join(gapDir, "eld-version-pair.json"), eld);
      writeJson(path.join(sourceDir, "eld-version-pair.json"), eld);
      writeJson(path.join(sourceDir, "eld-source-draft-pair-inventory.json"), {
        schemaVersion: "stage300-new150-eld-source-draft-pair-inventory@1.1.0",
        caseId: args.caseId,
        sourceDraftPairPresent: true,
        productionEldVersionPairsPresent: true,
        gapClass: null,
        additiveArtefact: "gap-close-v1/eld-version-pair.json",
      });
      eldPairPresent = true;
    }
  }

  // VDR enrichment from production findings + pins
  const findingIds = (surfaces.pipeline.findings ?? []).map(
    (f, i) => `prod-finding:${args.caseId}:${i}:${sha256(f.summary || f.kind).slice(0, 12)}`,
  );
  const dispositions = findingIds.map((id) => ({
    findingId: id,
    disposition: "not_yet_audited",
    recordedAt: new Date().toISOString(),
  }));
  const beforeAfter =
    eldPairPresent || /DRAFT_V1/i.test(canonical)
      ? {
          sourceDraftV1Section: "DRAFT_V1",
          sourceDraftV2Section: "DRAFT_V2",
          productionEldPair: eldPairPresent,
          delta: {
            added: eldPairPresent ? "see eld-version-pair.sentenceReceipts status=added" : [],
            removed: eldPairPresent ? "see eld-version-pair.sentenceReceipts status=removed" : [],
            retained: eldPairPresent ? "see eld-version-pair.sentenceReceipts status=retained" : [],
          },
        }
      : null;

  const vdr = {
    schemaVersion: "stage300-new150-vdr-run-receipt@1.1.0",
    caseId: args.caseId,
    gapCloseVersion: "gap-close-v1",
    sourceBinarySha256: bundlePdfSha256,
    truthKeySha256,
    casebrainOutputSha256: newCasebrainOutputSha256,
    originalCasebrainOutputSha256: originalHashes["casebrain-output.json"],
    exitPayloadSha256: Object.fromEntries(PRODUCTION_EXITS.map((e) => [e, exitHashes[e] ?? null])),
    appCommit: headCommit(),
    corpusSchema: NEW150_SCHEMA,
    templateId: "stage300-new150-disclosure-v1",
    coverageTag: args.coverageTag,
    membershipSequence: Number(args.caseId.match(/s300-n150-(\d+)/)?.[1] ?? 0),
    producedAt: new Date().toISOString(),
    detectorRegistryVersion: "maa-v2-stage150-implemented-registry@1.0.0",
    modelPromptVersion: "deterministic-live-builders@no-llm",
    findingIds,
    dispositions,
    beforeAfterMapping: beforeAfter,
    producer: "stage300-new150-vdr-receipt-harness+gap-close-v1",
  };
  writeJson(path.join(sourceDir, "vdr-run-receipt.json"), vdr);
  writeJson(path.join(gapDir, "vdr-run-receipt.json"), vdr);

  writeJson(path.join(gapDir, "additive-version-manifest.json"), {
    schemaVersion: "stage300-new150-gap-close-additive@1.0.0",
    caseId: args.caseId,
    originalHashes,
    newHashes: {
      casebrainOutputSha256: newCasebrainOutputSha256,
      vdrReceiptSha256: sha256(fs.readFileSync(path.join(sourceDir, "vdr-run-receipt.json"))),
      audiencePacksSha256: sha256(fs.readFileSync(path.join(sourceDir, "audience-packs.json"))),
      specialtyHarnessSha256: sha256(fs.readFileSync(path.join(sourceDir, "specialty-bags-harness.json"))),
      eldPairSha256: eldPairPresent
        ? sha256(fs.readFileSync(path.join(sourceDir, "eld-version-pair.json")))
        : null,
    },
    canonicalBundleUnchanged:
      originalHashes["canonical-bundle.md"] === sha256(fs.readFileSync(path.join(sourceDir, "canonical-bundle.md"))),
    truthKeyUnchanged: true,
  });

  // Rematerialise structured packet + attach specialty bags on packet root for evaluator merge path
  const mat = materialiseStructuredPacket({
    caseId: args.caseId,
    sourceLaneId: "stage300-new150-gap-close-v1",
    sourceDir,
  });
  if (mat.ok && "packet" in mat && mat.packet) {
    const packet = {
      ...mat.packet,
      // Do not attach specialty bags as production packet fields.
      specialtyBagProvenance: {
        notOnStructuredPacketAsProduction: true,
        independentExpectationsArtefact: "specialty-bags-harness.json",
        role: "independent_source_side_expectations_only",
      },
    };
    const candidateDir = path.join(repoRoot, NEW150_CANDIDATE_ROOT, args.caseId);
    writeJson(path.join(candidateDir, "structured-case-packet.json"), packet);
    writeJson(path.join(gapDir, "structured-case-packet.json"), packet);
  }

  const changedOutputStrings =
    originalHashes["casebrain-output.json"] != null &&
    originalHashes["casebrain-output.json"] !== newCasebrainOutputSha256;

  const capture: New150CaptureResult = {
    caseId: args.caseId,
    sourceDir,
    exitHashes,
    casebrainOutputSha256: newCasebrainOutputSha256,
    bundlePdfSha256,
    truthKeySha256: truthKeySha256 || "",
    ocrReceiptSha256: originalHashes["ocr-page-unit-receipts.json"],
    vdrReceiptSha256: sha256(fs.readFileSync(path.join(sourceDir, "vdr-run-receipt.json"))),
    sourceCapabilityInventorySha256: originalHashes["source-capability-inventory.json"] || "",
    truthOpenedDuringOutput: false,
    productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits",
    authenticatedBrowserAvailable: false,
    productionSpecialtyBagsPresent: {
      legalStateTaxonomy: false,
      dobAgeCalcLedger: false,
      proceduralPartyState: false,
    },
    audiencePacksPresent: audience.independentAudiencePacksPresent,
    eldVersionPairsFromProduction: eldPairPresent,
  };

  return {
    caseId: args.caseId,
    originalHashes,
    newCasebrainOutputSha256,
    changedOutputStrings,
    audiencePacksPresent: audience.independentAudiencePacksPresent,
    specialtyHarnessPresent:
      specialty.legalStateTaxonomy != null ||
      specialty.dobAgeCalcLedger != null ||
      specialty.proceduralPartyState != null,
    eldPairPresent,
    vdrEnriched: true,
    capture,
  };
}

export async function runGapCloseRematerialisation(args?: { limit?: number }): Promise<{
  processed: number;
  snapshots: CaseCapabilitySnapshot[];
  perControl: ReturnType<typeof buildPerControlDenominatorReport>;
  changedOutputCount: number;
  runtimeMs: number;
}> {
  const started = Date.now();
  const repoRoot = process.cwd();
  const manifestPath = path.join(repoRoot, NEW150_ARTIFACT_ROOT, "new-150-population-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    cases: Array<{ caseId: string; coverageTag: string }>;
  };
  const catalog = buildNew150Catalog(150);
  const byId = new Map(catalog.map((c) => [c.caseId, c]));
  const cases = manifest.cases.slice(0, args?.limit ?? 150);
  const snapshots: CaseCapabilitySnapshot[] = [];
  let changedOutputCount = 0;

  for (const row of cases) {
    const spec = byId.get(row.caseId);
    if (!spec) continue;
    const result = await rematerialiseGapCloseCase({
      caseId: spec.caseId,
      defendant: spec.defendant,
      offenceLine: spec.offenceLine,
      theme: spec.theme,
      coverageTag: spec.coverageTag,
    });
    if (result.changedOutputStrings) changedOutputCount += 1;
    snapshots.push(
      scanCaseCapability({
        spec,
        capture: result.capture,
        sourceDir: path.join(repoRoot, NEW150_SOURCE_ROOT, spec.caseId),
      }),
    );
  }

  const perControl = buildPerControlDenominatorReport({ repoRoot, snapshots });
  return {
    processed: snapshots.length,
    snapshots,
    perControl,
    changedOutputCount,
    runtimeMs: Date.now() - started,
  };
}
