/** Disclosure / Export Builder — slices 1–2 (client-side drafts only, no DB). */

export type SolicitorExportType = "disclosure_chase" | "hearing_prep" | "case_handover";

export type DisclosureChaseDraftItem = {
  materialLabel: string;
  whyItMatters: string;
  sourceBasis: string;
  requestedAction: string;
  deadlineWording: string | null;
};

export type DisclosureChaseDraft = {
  exportType: "disclosure_chase";
  heading: string;
  caseLabel: string;
  clientLabel: string | null;
  items: DisclosureChaseDraftItem[];
  doNotOverstateNote: string;
  solicitorReviewFooter: string;
  fullText: string;
};

export type HearingPrepNote = {
  exportType: "hearing_prep";
  heading: string;
  caseLabel: string;
  safeHearingLine: string;
  readinessSection: string;
  disclosureAsks: string[];
  doNotConcedePoints: string[];
  clientInstructionGaps: string[];
  evidenceChangesSummary: string | null;
  solicitorReviewRequired: boolean;
  solicitorReviewFooter: string;
  fullText: string;
};

export type CaseHandoverSummary = {
  exportType: "case_handover";
  heading: string;
  matterLabel: string;
  clientLabel: string | null;
  chargeLabel: string | null;
  provisionalRoute: string;
  safePositionHearingLine: string;
  servedMaterialLabels: string[];
  missingMaterial: string[];
  disclosureChasePriorities: string[];
  contradictions: string[];
  clientAccountPoints: string[];
  clientInstructionGaps: string[];
  doNotConcedePoints: string[];
  readinessLevel: string;
  readinessBlockers: string[];
  evidenceChangesSummary: string | null;
  nextAction: string;
  solicitorReviewRequired: boolean;
  solicitorReviewFooter: string;
  fullText: string;
};

export type SolicitorExportResult = DisclosureChaseDraft | HearingPrepNote | CaseHandoverSummary;

export type SolicitorExportContext = {
  caseLabel: string;
  clientLabel?: string | null;
  stage?: string | null;
  hearingDateIso?: string | null;
};

export const SOLICITOR_REVIEW_FOOTER =
  "DRAFT FOR SOLICITOR REVIEW ONLY — not a final court document, not legal advice, and not for automatic sending.";
