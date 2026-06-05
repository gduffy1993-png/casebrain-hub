/** Disclosure / Export Builder — slice 1 (client-side drafts only, no DB). */

export type SolicitorExportType = "disclosure_chase" | "hearing_prep";

/** Planned slice 2 — not generated in slice 1 UI. */
export type SolicitorExportTypePlanned = "case_handover";

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

export type SolicitorExportResult = DisclosureChaseDraft | HearingPrepNote;

export type SolicitorExportContext = {
  caseLabel: string;
  clientLabel?: string | null;
  stage?: string | null;
  hearingDateIso?: string | null;
};

export const SOLICITOR_REVIEW_FOOTER =
  "DRAFT FOR SOLICITOR REVIEW ONLY — not a final court document, not legal advice, and not for automatic sending.";
