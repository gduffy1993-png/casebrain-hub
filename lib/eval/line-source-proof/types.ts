import type { ProofLedger } from "./proof-ledger-types";

export type SourceDocumentType = "pdf" | "generated_bundle_text" | "extracted_text_only" | "unknown";

export type ExtractionConfidence = "exact" | "fuzzy" | "weak" | "unavailable";

export type ExtractionIssue =
  | "none"
  | "OCR_low_confidence"
  | "page_missing"
  | "mixed_defendant"
  | "label_mismatch"
  | "section_mismatch"
  | "pdf_unavailable_controlled_text_only";

export type ProofChainStatus =
  | "pdf_and_text_support_output"
  | "text_supports_but_pdf_unchecked"
  | "pdf_available_but_text_mismatch"
  | "source_unavailable"
  | "output_unsupported";

export type CaseProofChainAppendix = {
  caseProofMode: "pdf_and_text" | "text_only_controlled";
  originalPdfAvailable: boolean;
  sourceDocuments: Array<{
    name: string;
    type: SourceDocumentType;
    path: string;
    pageReferences: string[];
  }>;
  missingPages: string[];
  ocrWarnings: string[];
  linesJudgedFromExtractedTextOnly: number;
  linesSourceOutputDisagree: number;
  linesPdfUnchecked: number;
  proofChainNote: string;
};

export type LineCategory =
  | "evidence_claim"
  | "evidence_state"
  | "missing_material"
  | "chase_request"
  | "court_note"
  | "client_summary"
  | "safety_warning"
  | "confidence_status"
  | "strategic_review"
  | "contradiction_or_risk"
  | "export_line"
  | "non_evidence_ui";

export type LineSupportStatus =
  | "supported"
  | "partially_supported"
  | "referred_only"
  | "missing"
  | "incomplete"
  | "source_unavailable"
  | "unsupported"
  | "blocked";

export type LineSourceStrength =
  | "strong"
  | "medium"
  | "weak"
  | "index_only"
  | "schedule_only"
  | "ocr_fragile"
  | "no_anchor";

export type LineUsefulnessVerdict =
  | "correct_and_useful"
  | "correct_but_too_vague"
  | "safe_but_not_actionable"
  | "supported_but_useless"
  | "solicitor_review_required"
  | "wrong_or_overstated"
  | "blocked"
  | "excluded";

export type LineVerdict = "PASS" | "WARNING" | "FAIL";

export type ReviewTier =
  | "blocking_review"
  | "source_review"
  | "solicitor_caution"
  | "clean_source_backed"
  | "generic_safety_guard";

export type LineSourceProofRecord = {
  id: string;
  outputSurface: string;
  outputLine: string;
  lineCategory: LineCategory;
  evidenceItem: string | null;
  claimType: string | null;
  evidenceState: string | null;
  reliabilityState: string | null;
  sourceAnchor: string | null;
  sourcePage: string | null;
  sourceSection: string | null;
  sourceSnippet: string | null;
  sourceStrength: LineSourceStrength;
  supportStatus: LineSupportStatus;
  whyThisSupportsTheLine: string;
  whyThisIsLimited: string;
  safeWording: string | null;
  blockedWording: string | null;
  solicitorReviewRequired: boolean;
  usefulnessVerdict: LineUsefulnessVerdict;
  verdict: LineVerdict;
  reviewTier: ReviewTier;
  humanEvidenceLabel: string | null;
  humanOutputLine: string | null;
  sourceDocumentName: string | null;
  sourceDocumentType: SourceDocumentType;
  sourcePageNumber: string | null;
  extractedSnippet: string | null;
  pdfPageAvailable: boolean;
  pdfPageEvidencePath: string | null;
  extractionConfidence: ExtractionConfidence;
  extractionIssue: ExtractionIssue;
  proofChainStatus: ProofChainStatus;
  gedReviewReasons: string[];
};

export type LineSourceProofReport = {
  caseId: string;
  caseTitle: string;
  defendant: string;
  generatedAt: string;
  disclaimer: string;
  bundleSourcePath: string;
  bundleText?: string;
  method: string;
  lines: LineSourceProofRecord[];
  proofChainAppendix: CaseProofChainAppendix;
  summary: {
    totalMeaningfulLines: number;
    pass: number;
    warning: number;
    fail: number;
    excluded: number;
    byCategory: Record<string, number>;
    bySupport: Record<string, number>;
    positiveCorrect: number;
    gedReviewCount: number;
    blockingReview: number;
    unsupportedOutput: number;
    sourceReviewWarnings: number;
    solicitorCaution: number;
    cleanSourceBacked: number;
    genericSafetyGuards: number;
    byTier: Record<string, number>;
    proofChainCoverage: {
      pdfAndTextSupportOutput: number;
      textSupportsButPdfUnchecked: number;
      pdfAvailableButTextMismatch: number;
      sourceUnavailable: number;
      outputUnsupported: number;
      originalPdfAvailable: boolean;
      caseProofMode: "pdf_and_text" | "text_only_controlled";
    };
  };
  proofLedger: ProofLedger;
};
