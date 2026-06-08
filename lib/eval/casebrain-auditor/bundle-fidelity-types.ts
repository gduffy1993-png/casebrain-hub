import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";

export type BundleFidelityLinkStatus = "runnable" | "linked-only" | "placeholder";
/** placeholder = local folder waiting for bundle-text.md */

export type BundleFidelityTruthKey = {
  bundleId: string;
  fictional: boolean;
  label?: string;
  purpose?: string;
  sourceType?: "markdown-bundle" | "single-text-file" | "pilot-3-manifest" | "linked-external";
  sourceRef?: string;
  linkStatus?: BundleFidelityLinkStatus;
  defendant: string;
  aliases?: string[];
  charge: string;
  chargeKeywords?: string[];
  court?: string | null;
  hearingDate?: string | null;
  stage?: string | null;
  documentTypesExpected?: string[];
  documentTypesForbidden?: string[];
  evidenceSignalsExpected?: string[];
  missingMaterialExpected?: string[];
  thinBundleExpected: boolean;
  expectedWorkflowProfile: WorkflowProfile | string;
  expectedRouteFamily?: string | null;
  prohibitedFamilies?: string[];
  expectedProvisionalStatus?: boolean;
  humanReviewExpected?: boolean;
  notes?: string;
};

export type BundleFidelityFieldResult = {
  field: string;
  status: "pass" | "fail" | "needs_review" | "skipped";
  expected: string;
  actual: string;
  message?: string;
};

export type BundleFidelityBundleResult = {
  bundleId: string;
  label: string;
  linkStatus: BundleFidelityLinkStatus;
  skipped: boolean;
  skipReason?: string;
  overall: "pass" | "fail" | "needs_review";
  fields: BundleFidelityFieldResult[];
};

export type BundleFidelitySummary = {
  generatedAt: string;
  pack: string;
  total: number;
  runnable: number;
  passed: number;
  failed: number;
  needsReview: number;
  skipped: number;
  results: BundleFidelityBundleResult[];
};

export const BUNDLE_FIDELITY_SLUG = "bundle-fidelity";
