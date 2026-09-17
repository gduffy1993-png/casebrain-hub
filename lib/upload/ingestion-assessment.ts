export const INGESTION_ASSESSMENT_VERSION = "ingestion-gate-v1" as const;

export type IngestionDecision =
  | "accepted"
  | "degraded"
  | "needs_ocr"
  | "parser_conflict"
  | "quarantined";

export type IngestionReasonCode =
  | "parser_failure"
  | "parser_xref_failure"
  | "parser_diagnostic_placeholder"
  | "parser_error_stub"
  | "no_usable_text_layer"
  | "partial_text_layer"
  | "ocr_required"
  | "page_units_unavailable"
  | "page_count_mismatch"
  | "missing_or_dropped_pages"
  | "table_layout_unreadable"
  | "materially_incomplete"
  | "fallback_recovered_content"
  | "parser_output_conflict"
  | "legacy_metadata_inferred"
  | "genuine_short_document_accepted";

export type IngestionParserRoute =
  | "pdf_page_units"
  | "pdf_text_fallback"
  | "pdf_stream_fallback"
  | "docx"
  | "plain_text"
  | "legacy_stored_text"
  | "unknown";

export type IngestionAssessment = {
  version: typeof INGESTION_ASSESSMENT_VERSION;
  decision: IngestionDecision;
  reasonCodes: IngestionReasonCode[];
  parserRoute: IngestionParserRoute;
  sourceTextUsable: boolean;
  substantiveOutputsAllowed: boolean;
  textLength: number;
  reportedPageCount: number | null;
  extractedPageCount: number;
  pagesWithoutTextLayer: number;
  parserError: string | null;
  summary: string;
};

export type CaseDocumentIngestionAssessment = {
  documentId: string;
  documentName: string | null;
  assessment: IngestionAssessment;
};

export type CaseIngestionAssessment = {
  version: typeof INGESTION_ASSESSMENT_VERSION;
  decision: IngestionDecision;
  reasonCodes: IngestionReasonCode[];
  substantiveOutputsWithheld: boolean;
  summary: string;
  documents: CaseDocumentIngestionAssessment[];
};

type PageUnitLike = {
  text?: string | null;
  textLayerEmpty?: boolean | null;
};

type AssessmentInput = {
  fileName?: string | null;
  mimeType?: string | null;
  text?: string | null;
  pageCount?: number | null;
  pageUnits?: PageUnitLike[] | null;
  parserRoute: IngestionParserRoute;
  parserError?: string | null;
  comparisonText?: string | null;
  tableLayoutReadable?: boolean | null;
  materiallyIncomplete?: boolean;
};

const PARSER_DIAGNOSTIC_RE =
  /^\s*(?:\[PDF extraction failed:|Document uploaded but text extraction failed:|PDF parsing failed:|(?:Error:\s*)?(?:bad|missing|invalid)\s+XRef\b|Warning:\s*Indexing all PDF objects\b)/i;

function compact(text: string | null | undefined): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

export function isParserDiagnosticPlaceholder(text: string | null | undefined): boolean {
  return PARSER_DIAGNOSTIC_RE.test(String(text ?? ""));
}

function uniqueReasons(reasons: IngestionReasonCode[]): IngestionReasonCode[] {
  return Array.from(new Set(reasons));
}

function parserFailureReason(error: string | null | undefined): IngestionReasonCode {
  return /\bxref\b/i.test(String(error ?? "")) ? "parser_xref_failure" : "parser_failure";
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );
}

function parserOutputsMateriallyConflict(primary: string, comparison: string): boolean {
  const a = tokenSet(primary);
  const b = tokenSet(comparison);
  if (a.size < 4 || b.size < 4) return compact(primary) !== compact(comparison);
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const containment = intersection / Math.min(a.size, b.size);
  return containment < 0.72;
}

function summaryFor(decision: IngestionDecision): string {
  switch (decision) {
    case "accepted":
      return "Source extraction accepted.";
    case "degraded":
      return "Source extraction completed with limitations; review provenance.";
    case "needs_ocr":
      return "PDF could not be safely read from its text layer; OCR or reprocessing is required.";
    case "parser_conflict":
      return "Parser outputs materially conflict; solicitor review or reprocessing is required.";
    case "quarantined":
      return "PDF could not be safely read; substantive outputs are withheld.";
  }
}

export function buildIngestionAssessment(input: AssessmentInput): IngestionAssessment {
  const text = String(input.text ?? "");
  const trimmed = text.trim();
  const pageUnits = input.pageUnits ?? [];
  const reportedPageCount =
    typeof input.pageCount === "number" && input.pageCount >= 0 ? input.pageCount : null;
  const pagesWithoutTextLayer = pageUnits.filter(
    (page) => page.textLayerEmpty === true || compact(page.text).length === 0,
  ).length;
  const isPdf =
    String(input.mimeType ?? "").toLowerCase() === "application/pdf" ||
    String(input.fileName ?? "").toLowerCase().endsWith(".pdf");
  const reasons: IngestionReasonCode[] = [];

  if (isParserDiagnosticPlaceholder(trimmed)) {
    reasons.push("parser_diagnostic_placeholder", "parser_error_stub");
    if (input.parserError) reasons.push(parserFailureReason(input.parserError));
    return {
      version: INGESTION_ASSESSMENT_VERSION,
      decision: "quarantined",
      reasonCodes: uniqueReasons(reasons),
      parserRoute: input.parserRoute,
      sourceTextUsable: false,
      substantiveOutputsAllowed: false,
      textLength: 0,
      reportedPageCount,
      extractedPageCount: 0,
      pagesWithoutTextLayer,
      parserError: compact(input.parserError) || null,
      summary: summaryFor("quarantined"),
    };
  }

  if (input.materiallyIncomplete) {
    reasons.push("materially_incomplete");
    return {
      version: INGESTION_ASSESSMENT_VERSION,
      decision: "quarantined",
      reasonCodes: reasons,
      parserRoute: input.parserRoute,
      sourceTextUsable: false,
      substantiveOutputsAllowed: false,
      textLength: trimmed.length,
      reportedPageCount,
      extractedPageCount: pageUnits.length,
      pagesWithoutTextLayer,
      parserError: compact(input.parserError) || null,
      summary: summaryFor("quarantined"),
    };
  }

  if (isPdf && reportedPageCount != null && pageUnits.length > 0 && reportedPageCount !== pageUnits.length) {
    reasons.push("page_count_mismatch", "missing_or_dropped_pages");
    return {
      version: INGESTION_ASSESSMENT_VERSION,
      decision: "quarantined",
      reasonCodes: reasons,
      parserRoute: input.parserRoute,
      sourceTextUsable: false,
      substantiveOutputsAllowed: false,
      textLength: trimmed.length,
      reportedPageCount,
      extractedPageCount: pageUnits.length,
      pagesWithoutTextLayer,
      parserError: compact(input.parserError) || null,
      summary: summaryFor("quarantined"),
    };
  }

  if (input.comparisonText?.trim() && trimmed && parserOutputsMateriallyConflict(trimmed, input.comparisonText)) {
    reasons.push("parser_output_conflict");
    return {
      version: INGESTION_ASSESSMENT_VERSION,
      decision: "parser_conflict",
      reasonCodes: reasons,
      parserRoute: input.parserRoute,
      sourceTextUsable: false,
      substantiveOutputsAllowed: false,
      textLength: trimmed.length,
      reportedPageCount,
      extractedPageCount: pageUnits.length,
      pagesWithoutTextLayer,
      parserError: compact(input.parserError) || null,
      summary: summaryFor("parser_conflict"),
    };
  }

  if (isPdf && pageUnits.length > 0 && pagesWithoutTextLayer > 0) {
    reasons.push(
      pagesWithoutTextLayer === pageUnits.length ? "no_usable_text_layer" : "partial_text_layer",
      "ocr_required",
    );
    return {
      version: INGESTION_ASSESSMENT_VERSION,
      decision: "needs_ocr",
      reasonCodes: uniqueReasons(reasons),
      parserRoute: input.parserRoute,
      sourceTextUsable: false,
      substantiveOutputsAllowed: false,
      textLength: trimmed.length,
      reportedPageCount,
      extractedPageCount: pageUnits.length,
      pagesWithoutTextLayer,
      parserError: compact(input.parserError) || null,
      summary: summaryFor("needs_ocr"),
    };
  }

  if (!trimmed) {
    const decision: IngestionDecision = isPdf && (reportedPageCount ?? pageUnits.length) > 0
      ? "needs_ocr"
      : "quarantined";
    reasons.push(
      decision === "needs_ocr" ? "no_usable_text_layer" : parserFailureReason(input.parserError),
    );
    if (decision === "needs_ocr") reasons.push("ocr_required");
    return {
      version: INGESTION_ASSESSMENT_VERSION,
      decision,
      reasonCodes: uniqueReasons(reasons),
      parserRoute: input.parserRoute,
      sourceTextUsable: false,
      substantiveOutputsAllowed: false,
      textLength: 0,
      reportedPageCount,
      extractedPageCount: pageUnits.length,
      pagesWithoutTextLayer,
      parserError: compact(input.parserError) || null,
      summary: summaryFor(decision),
    };
  }

  if (input.tableLayoutReadable === false) reasons.push("table_layout_unreadable");
  if (input.parserRoute === "pdf_stream_fallback") {
    reasons.push("fallback_recovered_content", "page_units_unavailable");
  } else if (isPdf && pageUnits.length === 0) {
    reasons.push("page_units_unavailable");
  }
  if (input.parserError) reasons.push(parserFailureReason(input.parserError));
  if (trimmed.length < 100) reasons.push("genuine_short_document_accepted");

  const decision: IngestionDecision = reasons.some((reason) =>
    [
      "fallback_recovered_content",
      "page_units_unavailable",
      "table_layout_unreadable",
      "parser_failure",
      "parser_xref_failure",
    ].includes(reason),
  )
    ? "degraded"
    : "accepted";

  return {
    version: INGESTION_ASSESSMENT_VERSION,
    decision,
    reasonCodes: uniqueReasons(reasons),
    parserRoute: input.parserRoute,
    sourceTextUsable: true,
    substantiveOutputsAllowed: true,
    textLength: trimmed.length,
    reportedPageCount,
    extractedPageCount: pageUnits.length,
    pagesWithoutTextLayer,
    parserError: compact(input.parserError) || null,
    summary: summaryFor(decision),
  };
}

export function quarantinedIngestionAssessment(input: {
  fileName?: string | null;
  mimeType?: string | null;
  parserError: string;
}): IngestionAssessment {
  return buildIngestionAssessment({
    fileName: input.fileName,
    mimeType: input.mimeType,
    text: "",
    pageCount: null,
    pageUnits: [],
    parserRoute: "unknown",
    parserError: input.parserError,
  });
}

function isDecision(value: unknown): value is IngestionDecision {
  return ["accepted", "degraded", "needs_ocr", "parser_conflict", "quarantined"].includes(
    String(value),
  );
}

export function readPersistedIngestionAssessment(json: unknown): IngestionAssessment | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const raw = root.ingestionAssessment;
  if (!raw || typeof raw !== "object") return null;
  const assessment = raw as Partial<IngestionAssessment>;
  if (assessment.version !== INGESTION_ASSESSMENT_VERSION || !isDecision(assessment.decision)) {
    return null;
  }
  return assessment as IngestionAssessment;
}

function persistedPages(json: unknown): PageUnitLike[] {
  if (!json || typeof json !== "object") return [];
  const root = json as Record<string, unknown>;
  const pages = root.pages;
  return Array.isArray(pages) ? (pages as PageUnitLike[]) : [];
}

function persistedPageCount(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  return typeof root.pageCount === "number" && root.pageCount >= 0 ? root.pageCount : null;
}

function persistedExtractionError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  return typeof root.extractionError === "string" ? root.extractionError : null;
}

export function assessmentForStoredDocument(document: {
  name?: string | null;
  type?: string | null;
  raw_text?: string | null;
  extracted_text?: string | null;
  extracted_json?: unknown;
}): IngestionAssessment {
  const persisted = readPersistedIngestionAssessment(document.extracted_json);
  if (persisted) return persisted;

  const raw = String(document.raw_text ?? "").trim();
  const extracted = String(document.extracted_text ?? "").trim();
  const diagnostic = [raw, extracted].find((text) => isParserDiagnosticPlaceholder(text));
  const extractionError = persistedExtractionError(document.extracted_json);
  if (diagnostic || (extractionError && !raw && !extracted)) {
    return buildIngestionAssessment({
      fileName: document.name,
      mimeType: document.type,
      text: diagnostic ?? "",
      pageCount: persistedPageCount(document.extracted_json),
      pageUnits: persistedPages(document.extracted_json),
      parserRoute: "legacy_stored_text",
      parserError: extractionError,
    });
  }

  const bodyCandidates = [raw, extracted].filter(
    (text) => text && !isParserDiagnosticPlaceholder(text),
  );
  const text = bodyCandidates.sort((a, b) => b.length - a.length)[0] ?? "";
  const pages = persistedPages(document.extracted_json);
  const inferred = buildIngestionAssessment({
    fileName: document.name,
    mimeType: document.type,
    text,
    pageCount: persistedPageCount(document.extracted_json),
    pageUnits: pages,
    parserRoute: "legacy_stored_text",
    parserError: extractionError,
  });
  if (inferred.substantiveOutputsAllowed) {
    return {
      ...inferred,
      decision: inferred.decision === "accepted" ? "degraded" : inferred.decision,
      reasonCodes: uniqueReasons([...inferred.reasonCodes, "legacy_metadata_inferred"]),
      summary:
        inferred.decision === "accepted"
          ? summaryFor("degraded")
          : inferred.summary,
    };
  }
  return inferred;
}

const DECISION_PRIORITY: Record<IngestionDecision, number> = {
  accepted: 0,
  degraded: 1,
  needs_ocr: 2,
  parser_conflict: 3,
  quarantined: 4,
};

export function buildCaseIngestionAssessment(
  documents: Array<{
    id: string;
    name?: string | null;
    type?: string | null;
    raw_text?: string | null;
    extracted_text?: string | null;
    extracted_json?: unknown;
  }>,
): CaseIngestionAssessment {
  const assessed = documents.map((document) => ({
    documentId: String(document.id),
    documentName: document.name ?? null,
    assessment: assessmentForStoredDocument(document),
  }));
  const blocking = assessed.filter((item) => !item.assessment.substantiveOutputsAllowed);
  const decision = assessed.reduce<IngestionDecision>(
    (worst, item) =>
      DECISION_PRIORITY[item.assessment.decision] > DECISION_PRIORITY[worst]
        ? item.assessment.decision
        : worst,
    "accepted",
  );
  const reasonCodes = uniqueReasons(
    assessed.flatMap((item) => item.assessment.reasonCodes),
  );
  return {
    version: INGESTION_ASSESSMENT_VERSION,
    decision,
    reasonCodes,
    substantiveOutputsWithheld: blocking.length > 0,
    summary:
      blocking.length > 0
        ? "Source extraction incomplete. Substantive outputs withheld pending reprocess, OCR or solicitor review."
        : assessed.length > 0
          ? summaryFor(decision)
          : "No uploaded source assets to assess.",
    documents: assessed,
  };
}

export function shouldWithholdSubstantiveOutputs(
  assessment: CaseIngestionAssessment | null | undefined,
): boolean {
  return assessment?.substantiveOutputsWithheld === true;
}
