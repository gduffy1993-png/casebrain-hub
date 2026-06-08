/** Export review persistence — metadata only, no export bodies. */

export const EXPORT_REVIEW_STORAGE_KEY = "casebrain:exportReviews";
export const EXPORT_REVIEW_SCHEMA_VERSION = "export-review-v1";

export type ExportReviewType =
  | "disclosure_chase"
  | "hearing_prep"
  | "case_handover"
  | "client_explanation";

export type ExportReviewStatus =
  | "generated"
  | "copied"
  | "reviewed"
  | "needs_review"
  | "superseded";

export type ExportReviewRecord = {
  id: string;
  caseId: string;
  exportType: ExportReviewType;
  reviewStatus: ExportReviewStatus;
  routeLabel: string | null;
  readinessLevel: "green" | "amber" | "red" | null;
  humanReviewRequired: boolean;
  solicitorReviewRequired: boolean;
  exportHash: string | null;
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
  appVersion: string;
};

export type BuildExportReviewInput = {
  caseId: string;
  exportType: ExportReviewType;
  reviewStatus: ExportReviewStatus;
  routeLabel?: string | null;
  readinessLevel?: "green" | "amber" | "red" | null;
  humanReviewRequired?: boolean;
  solicitorReviewRequired?: boolean;
  exportHash?: string | null;
  note?: string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  appVersion?: string;
};

export const EXPORT_REVIEW_TYPES: ReadonlySet<ExportReviewType> = new Set([
  "disclosure_chase",
  "hearing_prep",
  "case_handover",
  "client_explanation",
]);

export const EXPORT_REVIEW_STATUSES: ReadonlySet<ExportReviewStatus> = new Set([
  "generated",
  "copied",
  "reviewed",
  "needs_review",
  "superseded",
]);
