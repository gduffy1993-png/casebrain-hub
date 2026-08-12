/**
 * Real-PDF Live Pilot v1 — per-case materialisation helper.
 *
 * Reads one real source PDF byte-for-byte (never modifies it), extracts real text/page
 * units with the same extractor the app uses, runs the real production surface builder,
 * generates a genuine strategy-summary output PDF via the real pdfkit generator, and
 * performs simple (non-raster) visual sanity checks.
 *
 * Honesty: every field here is either directly measured or explicitly null/NOT_EXERCISED.
 * Nothing here computes or claims a corpus/programme/solicitor PASS.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { extractTextAndMetaFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import { pageUnitsFromExtractedText, type ExtractedPageUnit } from "@/lib/upload/pdf-page-units";
import type { UploadedDocumentUnit, UploadedPageUnit } from "@/lib/criminal/build-from-document-units";
import {
  buildLiveProductionSurfacesFromDocumentUnits,
  type LiveProductionSurfaces,
} from "@/lib/criminal/canonical-live-surface-adapter";
import {
  generateCriminalStrategyPdf,
  type CriminalStrategyChargeRow,
} from "@/lib/pdf/criminal-strategy-pdf";
import { isMidWordSolicitorTruncation } from "@/lib/criminal/charge-allegation-completeness";
import {
  professionalizeSolicitorPressurePoint,
  sanitizeSolicitorProse,
} from "@/lib/criminal/solicitor-visible-sanitization";
import type {
  MaterialisedSurface,
  MasterExitMode,
  SavedCaseMaterialisation,
} from "@/lib/eval/master-assurance-auditor/types";

import { ARTEFACT_ROOT, type PilotEntry } from "./pilot-20-definition";

export function sha256Buffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function readSourceBytes(entry: PilotEntry): Buffer {
  // Read-only. Never writes to entry.absoluteSourcePath.
  return fs.readFileSync(entry.absoluteSourcePath);
}

export type SourceHashRow = {
  id: string;
  absolutePath: string;
  sha256: string;
  byteLength: number;
  readAt: string;
};

export function hashSource(entry: PilotEntry): SourceHashRow {
  const buf = readSourceBytes(entry);
  return {
    id: entry.id,
    absolutePath: entry.absoluteSourcePath,
    sha256: sha256Buffer(buf),
    byteLength: buf.length,
    readAt: new Date().toISOString(),
  };
}

function toUploadedPageUnit(u: ExtractedPageUnit): UploadedPageUnit {
  return {
    // Source-document pagination only when actually printed on the page; compiledPage
    // alone still counts as a known page identity (see isPageIdentityKnown).
    pageNumber: u.sourcePage,
    compiledPage: u.compiledPage,
    text: u.text,
    pageIdentityKnown: true,
  };
}

export type ExtractionResult = {
  ok: boolean;
  error: string | null;
  text: string;
  pageCount: number | null;
  pageUnits: UploadedPageUnit[];
  textLayerLimitation: string | null;
  pagesWithText: number;
  pagesWithoutText: number;
};

export async function extractPilotPdf(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
  try {
    const meta = await extractTextAndMetaFromFileBuffer(fileName, "application/pdf", buffer);
    let extractedPages = meta.pageUnits;
    // Explicit fallback path per spec: if the primary extractor returned no page units
    // but did return text, try splitting on form-feed/page markers before giving up.
    if (!extractedPages.length && meta.text) {
      extractedPages = pageUnitsFromExtractedText(meta.text) ?? [];
    }
    const pageUnits = extractedPages.map(toUploadedPageUnit);
    const pagesWithoutText = extractedPages.filter((p) => p.textLayerEmpty).length;
    return {
      ok: true,
      error: null,
      text: meta.text,
      pageCount: meta.pageCount,
      pageUnits,
      textLayerLimitation: meta.textLayerLimitation,
      pagesWithText: extractedPages.length - pagesWithoutText,
      pagesWithoutText,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      text: "",
      pageCount: null,
      pageUnits: [],
      textLayerLimitation: null,
      pagesWithText: 0,
      pagesWithoutText: 0,
    };
  }
}

export type SolicitorVisibleStringRow = { caseId: string; surface: string; text: string };

/**
 * Collect solicitor-visible strings for wording triage from every named surface:
 * copyLines, composedProse, keyFacts summaries, chase text, war room, charge warnings.
 * This is pilot-output triage only — not a review of historical occurrences at scale.
 */
export function collectSolicitorVisibleStrings(
  caseId: string,
  surfaces: LiveProductionSurfaces,
): SolicitorVisibleStringRow[] {
  const rows: SolicitorVisibleStringRow[] = [];
  const push = (surface: string, text: string | null | undefined) => {
    if (text && text.trim()) rows.push({ caseId, surface, text });
  };

  for (const line of surfaces.copyLines) push(`copy:${line.kind}`, line.text);

  push("composed_prose:court_line", surfaces.composedProse.courtLine);
  push("composed_prose:cps_chase", surfaces.composedProse.cpsChase);
  push("composed_prose:client_disclaimer", surfaces.composedProse.clientDisclaimer);
  for (const lim of surfaces.composedProse.limitations) push("composed_prose:limitation", lim);

  for (const cat of Object.keys(surfaces.keyFacts) as Array<keyof typeof surfaces.keyFacts>) {
    for (const fact of surfaces.keyFacts[cat]) push(`key_facts:${cat}`, fact.text);
  }

  for (const item of surfaces.disclosureChase.items) {
    push("chase:label", item.label);
    push("chase:why_it_matters", item.whyItMatters);
    push("chase:draft_wording", item.draftChaseWording);
    push("chase:court_line", item.courtLine);
  }
  push("chase:disclosure_summary", surfaces.disclosureChase.disclosureSummary);
  push("chase:safe_court_line", surfaces.disclosureChase.safeCourtLine);

  push("war_room:allegation", surfaces.warRoom.allegation);
  push("war_room:safe_position_today", surfaces.warRoom.safePositionToday);
  for (const s of surfaces.warRoom.sayThis) push("war_room:say_this", s);
  for (const s of surfaces.warRoom.doNotOverstate) push("war_room:do_not_overstate", s);
  for (const s of surfaces.warRoom.askCourtToRecord) push("war_room:ask_court_to_record", s);
  for (const s of surfaces.warRoom.instructionsNeeded) push("war_room:instructions_needed", s);
  for (const s of surfaces.warRoom.nextHearingMoves) push("war_room:next_hearing_moves", s);
  push("war_room:draft_disclosure_timetable", surfaces.warRoom.draftWording.disclosureTimetable);
  push("war_room:draft_adjournment", surfaces.warRoom.draftWording.adjournment);
  push("war_room:draft_client_explanation", surfaces.warRoom.draftWording.clientExplanation);

  if (surfaces.chargeCompleteness.warning) push("charge:warning", surfaces.chargeCompleteness.warning);
  if (surfaces.chargeCompleteness.requiredAction)
    push("charge:required_action", surfaces.chargeCompleteness.requiredAction);
  push("charge:displayed_text", surfaces.chargeCompleteness.displayedChargeText);
  for (const c of surfaces.charges) push("charges:offence", c.offence);

  for (const line of surfaces.pdf.provenanceLines) push("pdf:provenance_line", line);
  for (const lim of surfaces.pdf.limitations) push("pdf:limitation", lim);

  for (const f of surfaces.api.findings) {
    push("api:summary", f.summary);
    push("api:provenance_line", f.provenanceLine);
  }

  return rows;
}

export type ChargeExitName =
  | "charges"
  | "keyFacts"
  | "warRoom"
  | "fiveAnswers"
  | "copy"
  | "export"
  | "api"
  | "pdf"
  | "composedProse";

export type ChargeReadinessRow = {
  caseId: string;
  completenessStatus: string;
  warning: string | null;
  requiredAction: string | null;
  perExit: Record<
    ChargeExitName,
    { checked: true; incompleteMarkerPresent: boolean | "not_applicable" }
  >;
  incompleteStaysIncomplete: boolean;
};

function blobFor(exit: ChargeExitName, surfaces: LiveProductionSurfaces): string {
  switch (exit) {
    case "charges":
      return surfaces.charges
        .map((c) => `${c.offence} ${c.status} ${c.confirmationLabel}`)
        .join(" | ");
    case "keyFacts":
      return surfaces.keyFacts.charge.map((f) => f.text).join(" | ");
    case "warRoom":
      return [
        surfaces.warRoom.allegation,
        ...surfaces.warRoom.sayThis,
        ...surfaces.warRoom.doNotOverstate,
      ].join(" | ");
    case "fiveAnswers":
      return JSON.stringify(surfaces.truthMap);
    case "copy":
      return surfaces.copyLines.map((l) => l.text).join(" | ");
    case "export":
      return JSON.stringify(surfaces.exportPack);
    case "api":
      return `${surfaces.api.allegation ?? ""} ${JSON.stringify(surfaces.api.charges)}`;
    case "pdf":
      return `${surfaces.pdf.allegation ?? ""} ${surfaces.pdf.provenanceLines.join(" | ")}`;
    case "composedProse":
      return JSON.stringify(surfaces.composedProse);
    default:
      return "";
  }
}

/**
 * Verify chargeCompleteness travels honestly onto every named exit: when the recorded
 * charge is incomplete, the incompleteness marker (warning/requiredAction) must not be
 * silently dropped on any of the nine surfaces. Never upgrades an incomplete charge to
 * complete — this only checks whether the incompleteness signal is still visible.
 */
export function chargeReadinessForCase(
  caseId: string,
  surfaces: LiveProductionSurfaces,
): ChargeReadinessRow {
  const cc = surfaces.chargeCompleteness;
  const isIncomplete = cc.completenessStatus !== "complete";
  const marker = (cc.warning ?? cc.requiredAction ?? "").slice(0, 40).toLowerCase();
  const exits: ChargeExitName[] = [
    "charges",
    "keyFacts",
    "warRoom",
    "fiveAnswers",
    "copy",
    "export",
    "api",
    "pdf",
    "composedProse",
  ];
  const perExit = {} as ChargeReadinessRow["perExit"];
  for (const exit of exits) {
    if (!isIncomplete || !marker) {
      perExit[exit] = { checked: true, incompleteMarkerPresent: "not_applicable" };
      continue;
    }
    const blob = blobFor(exit, surfaces).toLowerCase();
    perExit[exit] = { checked: true, incompleteMarkerPresent: blob.includes(marker) };
  }
  // Honest signal: when the recorded charge is incomplete, every checked exit must
  // still carry the incompleteness marker. A false here is a genuine shared-layer defect.
  const incompleteStaysIncomplete =
    !isIncomplete ||
    Object.values(perExit).every(
      (v) => v.incompleteMarkerPresent === true || v.incompleteMarkerPresent === "not_applicable",
    );
  return {
    caseId,
    completenessStatus: cc.completenessStatus,
    warning: cc.warning,
    requiredAction: cc.requiredAction,
    perExit,
    incompleteStaysIncomplete,
  };
}

export type OutputPdfResult = {
  generated: boolean;
  relativePath: string | null;
  sha256: string | null;
  byteLength: number | null;
  pageCount: number | null;
  error: string | null;
  generatedAt: string | null;
  /** Text independently extracted from the generated CaseBrain PDF, never the source PDF. */
  extractedText: string | null;
  extractedTextSha256: string | null;
};

export type VisualChecks = {
  pageCountPositive: boolean | null;
  startsWithPdfMagic: boolean | null;
  nonZeroByte: boolean | null;
  pageRenderLane: "NOT_EXERCISED";
  pageRenderNotExercisedReason: string;
  notes: string[];
};

function bulkOutputDir(root: string): string {
  return path.join(root, ARTEFACT_ROOT, "bulk", "output-pdfs");
}

function printablePageNumber(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const clean = String(value).trim().replace(/^p\.?\s*/i, "");
  return clean || null;
}

function professionalChargeForPdf(charge: LiveProductionSurfaces["charges"][number]): {
  offence: string;
  particulars: string | null;
} {
  const offence = charge.offence.trim();
  if (!charge.particulars && /\bdishonestly handled stolen goods\b/i.test(offence)) {
    return { offence: "Handling stolen goods", particulars: offence };
  }
  return { offence, particulars: charge.particulars ?? null };
}

/** Build charge rows for the strategy PDF straight from the real canonical charges. */
function chargeRowsFromSurfaces(surfaces: LiveProductionSurfaces): CriminalStrategyChargeRow[] {
  return surfaces.charges.map((c) => {
    const professionalCharge = professionalChargeForPdf(c);
    return ({
    count: c.count,
    offence: professionalCharge.offence,
    particulars: professionalCharge.particulars,
    defendants: c.defendants,
    documentRole: c.documentRole,
    status: c.status,
    // Pilot source filenames contain evaluation IDs. The exact title remains in audit
    // metadata; ordinary solicitor copy gets a stable document label plus real page.
    sourceLabel: c.sourceDocumentTitle
      ? (() => {
          const sourcePage = printablePageNumber(c.sourcePage);
          const compiledPage = printablePageNumber(c.compiledPage);
          return `Source bundle${
            sourcePage
              ? ` · source p.${sourcePage}`
              : compiledPage
                ? ` · compiled p.${compiledPage}`
                : ""
          }`;
        })()
      : null,
  });
  });
}

export async function generateOutputPdfForCase(
  repoRoot: string,
  entry: PilotEntry,
  surfaces: LiveProductionSurfaces,
): Promise<{ result: OutputPdfResult; register: Record<string, unknown> | null }> {
  const generatedAt = new Date().toISOString();
  try {
    const futureHearing = surfaces.caseMeta.hearings
      .filter((hearing) => hearing.status === "UPCOMING")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
    const recordedHearing = futureHearing ?? [...surfaces.caseMeta.hearings]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;
    const hearingIsPast = Boolean(recordedHearing && recordedHearing.status === "PAST");
    const defendant = surfaces.caseMeta.defendantName?.trim() || null;
    const chargeRows = chargeRowsFromSurfaces(surfaces);
    const leadingOffence = chargeRows[0]?.offence?.trim() || null;
    const conciseMatterTitle = defendant
      ? `${defendant} — ${leadingOffence && leadingOffence.length <= 90 ? leadingOffence : "Criminal matter"}`
      : leadingOffence && leadingOffence.length <= 90
        ? leadingOffence
        : "Criminal matter";
    const pressurePoints = surfaces.warRoom.collapseRisks
      .map(professionalizeSolicitorPressurePoint)
      .filter((point): point is NonNullable<typeof point> => point !== null)
      .filter((point, index, rows) =>
        rows.findIndex((candidate) =>
          `${candidate.label}\n${candidate.reason}`.toLowerCase() ===
          `${point.label}\n${point.reason}`.toLowerCase()) === index,
      )
      .slice(0, 6);
    const provenanceLimitations = surfaces.pdf.limitations
      .map((line) => sanitizeSolicitorProse(line).trim().replace(/[.;]+$/, ""))
      .filter(Boolean)
      .filter((line, index, rows) =>
        rows.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index,
      )
      .map((line) => `${line}.`);
    const buffer = await generateCriminalStrategyPdf({
      caseId: `real-pdf-live-pilot-v1-${entry.id}`,
      title: sanitizeSolicitorProse(conciseMatterTitle),
      generatedAt,
      offenceLabel:
        chargeRows[0]?.offence ??
        surfaces.pdf.allegation ??
        surfaces.chargeCompleteness.displayedChargeText,
      nextHearingType: recordedHearing?.type,
      nextHearingDate: recordedHearing?.date,
      hearingDisplayLabel: hearingIsPast ? "Recorded hearing" : "Next hearing",
      hearingLifecycleNote: hearingIsPast
        ? "The latest hearing date found in the papers has passed; verify the current listing before relying on it."
        : surfaces.pipeline.hearingLifecycle.conflictDescription,
      charges: chargeRows,
      primaryStrategy: sanitizeSolicitorProse(surfaces.warRoom.safePositionToday),
      pressurePoints,
      hrsChecklist: surfaces.warRoom.nextHearingMoves.slice(0, 8).map(sanitizeSolicitorProse),
      hrsHearingLabel: recordedHearing
        ? `${recordedHearing.type} — ${recordedHearing.court ?? "court not safely confirmed"}`
        : "No current hearing safely confirmed from the supplied papers",
      solicitorInstructions: surfaces.warRoom.instructionsNeeded
        .slice(0, 6)
        .map(sanitizeSolicitorProse)
        .join("\n"),
      provenanceLimitations,
    });
    const dir = bulkOutputDir(repoRoot);
    fs.mkdirSync(dir, { recursive: true });
    const relativePath = path
      .join(ARTEFACT_ROOT, "bulk", "output-pdfs", `${entry.id}.pdf`)
      .split(path.sep)
      .join("/");
    const absPath = path.join(repoRoot, relativePath);
    fs.writeFileSync(absPath, buffer);

    // Independently re-parse the just-written output PDF (never the source PDF) for
    // its own page count — this is the "genuine output" pageCount, not the source's.
    let outPageCount: number | null = null;
    let extractedText: string | null = null;
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer, { max: 0 });
      outPageCount = typeof parsed.numpages === "number" ? parsed.numpages : null;
      extractedText = typeof parsed.text === "string" ? parsed.text : null;
    } catch {
      outPageCount = null;
    }

    const result: OutputPdfResult = {
      generated: true,
      relativePath,
      sha256: sha256Buffer(buffer),
      byteLength: buffer.length,
      pageCount: outPageCount,
      error: null,
      generatedAt,
      extractedText,
      extractedTextSha256: extractedText ? sha256Buffer(Buffer.from(extractedText, "utf8")) : null,
    };
    const register = {
      id: entry.id,
      relativePath,
      sha256: result.sha256,
      byteLength: result.byteLength,
      pageCount: result.pageCount,
      generationReceipt: {
        generatedAt,
        generator: "lib/pdf/criminal-strategy-pdf.ts#generateCriminalStrategyPdf",
        sourceCaseId: entry.id,
        // Explicit: this is a generated output artefact, never the source PDF.
        isSourcePdf: false,
      },
    };
    return { result, register };
  } catch (error) {
    return {
      result: {
        generated: false,
        relativePath: null,
        sha256: null,
        byteLength: null,
        pageCount: null,
        error: error instanceof Error ? error.message : String(error),
        generatedAt,
        extractedText: null,
        extractedTextSha256: null,
      },
      register: null,
    };
  }
}

export function visualChecksFor(buffer: Buffer | null, pageCount: number | null): VisualChecks {
  const notes: string[] = [];
  if (!buffer) {
    notes.push("No output buffer available — output PDF generation failed.");
    return {
      pageCountPositive: null,
      startsWithPdfMagic: null,
      nonZeroByte: null,
      pageRenderLane: "NOT_EXERCISED",
      pageRenderNotExercisedReason:
        "No output PDF was generated for this case; page-render/clipping check skipped.",
      notes,
    };
  }
  const nonZeroByte = buffer.length > 0;
  const startsWithPdfMagic = buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  const pageCountPositive = typeof pageCount === "number" && pageCount > 0;
  if (!nonZeroByte) notes.push("Output buffer is zero bytes.");
  if (!startsWithPdfMagic) notes.push("Output buffer does not start with %PDF- magic bytes.");
  if (!pageCountPositive) notes.push("Output page count could not be confirmed as > 0.");
  return {
    pageCountPositive,
    startsWithPdfMagic,
    nonZeroByte,
    pageRenderLane: "NOT_EXERCISED",
    pageRenderNotExercisedReason:
      "Full raster/page-render (pdf.js + canvas) is not wired into this pilot script; clipping/overflow at the pixel level is unknown and intentionally not claimed.",
    notes,
  };
}

export type MaterialisedCaseResult = {
  id: string;
  fileName: string;
  absoluteSourcePath: string;
  byteLength: number;
  sha256: string;
  expectedSha256: string;
  hashMatches: boolean;
  extraction: {
    ok: boolean;
    error: string | null;
    pageCount: number | null;
    expectedPageCount: number;
    pageCountMatches: boolean | null;
    textLayerLimitation: string | null;
    pagesWithText: number;
    pagesWithoutText: number;
  };
  surfacesBuilt: boolean;
  surfacesError: string | null;
  outputPdf: OutputPdfResult;
  visualChecks: VisualChecks;
  chargeReadiness: ChargeReadinessRow | null;
  solicitorVisibleStringCount: number;
  crashed: boolean;
  crashMessage: string | null;
  finishedAt: string;
};

export type MaterialiseCaseFull = {
  summary: MaterialisedCaseResult;
  surfaces: LiveProductionSurfaces | null;
  documentUnit: UploadedDocumentUnit | null;
  solicitorVisibleStrings: SolicitorVisibleStringRow[];
  adapterProjection: SavedCaseMaterialisation | null;
};

/**
 * Full per-case pipeline: read → hash → extract → build production surfaces →
 * generate output PDF → visual checks → charge-readiness → wording-string collection.
 * Never throws — every failure is captured honestly in the returned summary.
 */
export async function materialiseCase(repoRoot: string, entry: PilotEntry): Promise<MaterialiseCaseFull> {
  const finishedAtBase = () => new Date().toISOString();
  try {
    const buffer = readSourceBytes(entry);
    const sha256 = sha256Buffer(buffer);
    const extraction = await extractPilotPdf(buffer, entry.fileName);

    let surfaces: LiveProductionSurfaces | null = null;
    let surfacesError: string | null = null;
    let documentUnit: UploadedDocumentUnit | null = null;
    if (extraction.ok) {
      documentUnit = {
        id: entry.id,
        title: entry.fileName,
        documentType: null,
        documentDate: null,
        uploadOrder: 0,
        pages: extraction.pageUnits,
        fullText: extraction.text,
      };
      try {
        surfaces = buildLiveProductionSurfacesFromDocumentUnits([documentUnit], {
          caseId: `real-pdf-live-pilot-v1-${entry.id}`,
          caseTitle: `${entry.id} — ${entry.fileName}`,
        });
      } catch (error) {
        surfacesError = error instanceof Error ? error.message : String(error);
      }
    } else {
      surfacesError = `Extraction failed, surfaces not attempted: ${extraction.error}`;
    }

    let outputPdf: OutputPdfResult = {
      generated: false,
      relativePath: null,
      sha256: null,
      byteLength: null,
      pageCount: null,
      error: surfacesError ? `Surfaces unavailable: ${surfacesError}` : "Not attempted",
      generatedAt: null,
      extractedText: null,
      extractedTextSha256: null,
    };
    let register: Record<string, unknown> | null = null;
    let outputBuffer: Buffer | null = null;
    if (surfaces) {
      const gen = await generateOutputPdfForCase(repoRoot, entry, surfaces);
      outputPdf = gen.result;
      register = gen.register;
      if (outputPdf.relativePath) {
        try {
          outputBuffer = fs.readFileSync(path.join(repoRoot, outputPdf.relativePath));
        } catch {
          outputBuffer = null;
        }
      }
    }

    const visualChecks = visualChecksFor(outputBuffer, outputPdf.pageCount);
    const chargeReadiness = surfaces ? chargeReadinessForCase(entry.id, surfaces) : null;
    const solicitorVisibleStrings = surfaces ? collectSolicitorVisibleStrings(entry.id, surfaces) : [];

    const summary: MaterialisedCaseResult = {
      id: entry.id,
      fileName: entry.fileName,
      absoluteSourcePath: entry.absoluteSourcePath,
      byteLength: buffer.length,
      sha256,
      expectedSha256: entry.expectedSha256,
      hashMatches: sha256 === entry.expectedSha256,
      extraction: {
        ok: extraction.ok,
        error: extraction.error,
        pageCount: extraction.pageCount,
        expectedPageCount: entry.pageCount,
        pageCountMatches:
          extraction.pageCount === null ? null : extraction.pageCount === entry.pageCount,
        textLayerLimitation: extraction.textLayerLimitation,
        pagesWithText: extraction.pagesWithText,
        pagesWithoutText: extraction.pagesWithoutText,
      },
      surfacesBuilt: surfaces !== null,
      surfacesError,
      outputPdf,
      visualChecks,
      chargeReadiness,
      solicitorVisibleStringCount: solicitorVisibleStrings.length,
      crashed: false,
      crashMessage: null,
      finishedAt: finishedAtBase(),
    };

    if (register) {
      // caller persists the register centrally; return it via outputPdf consumer instead
      (summary as unknown as { _register?: unknown })._register = register;
    }

    const adapterProjection = surfaces ? projectForControlAdapter(entry, surfaces) : null;
    return { summary, surfaces, documentUnit, solicitorVisibleStrings, adapterProjection };
  } catch (error) {
    const summary: MaterialisedCaseResult = {
      id: entry.id,
      fileName: entry.fileName,
      absoluteSourcePath: entry.absoluteSourcePath,
      byteLength: 0,
      sha256: "",
      expectedSha256: entry.expectedSha256,
      hashMatches: false,
      extraction: {
        ok: false,
        error: null,
        pageCount: null,
        expectedPageCount: entry.pageCount,
        pageCountMatches: null,
        textLayerLimitation: null,
        pagesWithText: 0,
        pagesWithoutText: 0,
      },
      surfacesBuilt: false,
      surfacesError: null,
      outputPdf: {
        generated: false,
        relativePath: null,
        sha256: null,
        byteLength: null,
        pageCount: null,
        error: "Not attempted — case crashed before output generation",
        generatedAt: null,
        extractedText: null,
        extractedTextSha256: null,
      },
      visualChecks: {
        pageCountPositive: null,
        startsWithPdfMagic: null,
        nonZeroByte: null,
        pageRenderLane: "NOT_EXERCISED",
        pageRenderNotExercisedReason: "Case crashed before an output PDF existed.",
        notes: [],
      },
      chargeReadiness: null,
      solicitorVisibleStringCount: 0,
      crashed: true,
      crashMessage: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      finishedAt: finishedAtBase(),
    };
    return { summary, surfaces: null, documentUnit: null, solicitorVisibleStrings: [], adapterProjection: null };
  }
}

/**
 * Project a LiveProductionSurfaces result into the existing
 * `SavedCaseMaterialisation` shape expected by the real V1 control detectors
 * (lib/eval/master-assurance-auditor/controls/run-all-controls.ts). This is a
 * best-effort adapter: fields the pilot cannot honestly populate (e.g. per-string
 * source page anchors beyond what the charge model already tracks) are left null
 * rather than guessed, so missing-evidence controls correctly fall back to
 * not_exercised/unresolved instead of a false pass.
 */
export function projectForControlAdapter(
  entry: PilotEntry,
  surfaces: LiveProductionSurfaces,
): SavedCaseMaterialisation {
  const rows: MaterialisedSurface[] = [];
  let n = 0;
  const add = (text: string | null | undefined, exitModes: MasterExitMode[], extra?: Partial<MaterialisedSurface>) => {
    if (!text || !text.trim()) return;
    rows.push({ surfaceId: `${entry.id}-s${n++}`, text, exitModes, ...extra });
  };

  for (const line of surfaces.copyLines) {
    add(line.text, ["copy", "view"], { canCopy: line.canCopy });
  }
  add(surfaces.composedProse.courtLine, ["composed_prose", "view"]);
  add(surfaces.composedProse.cpsChase, ["composed_prose", "view"]);
  add(surfaces.composedProse.clientDisclaimer, ["composed_prose", "view"]);
  for (const line of surfaces.pdf.provenanceLines) add(line, ["pdf"]);
  for (const f of surfaces.api.findings) {
    add(f.summary, ["api"]);
    add(f.provenanceLine, ["api"]);
  }
  for (const s of surfaces.warRoom.sayThis) add(s, ["view"]);
  for (const s of surfaces.warRoom.askCourtToRecord) add(s, ["view", "export"]);
  for (const s of surfaces.warRoom.instructionsNeeded) add(s, ["view"]);
  for (const s of surfaces.warRoom.nextHearingMoves) add(s, ["view"]);
  for (const item of surfaces.disclosureChase.items) {
    add(item.draftChaseWording, ["view", "export"]);
    add(item.courtLine, ["view"]);
  }
  for (const cat of Object.keys(surfaces.keyFacts) as Array<keyof typeof surfaces.keyFacts>) {
    for (const fact of surfaces.keyFacts[cat]) add(fact.text, ["view"]);
  }
  for (const c of surfaces.charges) {
    add(`${c.offence} (${c.status})`, ["view", "pdf", "export"], {
      sourceDocument: c.sourceDocumentTitle,
      documentType: c.sourceDocumentType,
      sourcePage: c.sourcePage,
      compiledPage: c.compiledPage,
      pageIdentityKnown: c.pageIdentityKnown,
    });
  }
  add(JSON.stringify(surfaces.exportPack), ["export"]);

  const truthMapRows = surfaces.api.evidenceState.items.map((item) => ({
    label: item.label,
    existence: item.state,
    reliability: item.unresolved ? "needs_review" : "reviewed_ok",
  }));
  const cpsChase = surfaces.disclosureChase.items.map((item) => ({
    label: item.label,
    draft: item.draftChaseWording,
  }));

  return {
    caseId: `real-pdf-live-pilot-v1-${entry.id}`,
    sourceCaseId: entry.id,
    familyLabel: entry.primaryTest,
    allegation: surfaces.pdf.allegation ?? surfaces.chargeCompleteness.displayedChargeText,
    clientLabel: "Client",
    surfaces: rows,
    truthExpectations: [],
    truthMapRows,
    cpsChase,
    doNotOverstate: surfaces.warRoom.doNotOverstate,
    inputBundlePath: entry.absoluteSourcePath,
    packetPath: `${ARTEFACT_ROOT}/bulk/case-results/${entry.id}.json`,
    builtAt: new Date().toISOString(),
  };
}

export { isMidWordSolicitorTruncation };
