export const REAL_MATTER_AUDITOR_SLUG = "real-matter-auditor";
export const REAL_MATTER_AUDITOR_VERSION = "rma-slice-1";

export type RealMatterInputType = "bundle-text" | "bundle-pdf" | "mixed";

export type RealMatterOffenceFamily =
  | "motoring_dangerous"
  | "fraud_account"
  | "pwits_phone"
  | "robbery_identification"
  | "violence_gbh_s18"
  | "generic_provisional"
  | "unknown";

export type RealMatterRedactionStatus = "anonymised" | "redacted" | "needs_redaction";

/** Gitignored local manifest — never commit with real client data. */
export type RealMatterLocalManifest = {
  localId: string;
  anonymisedLabel: string;
  offenceFamily: RealMatterOffenceFamily | string;
  stage?: string | null;
  inputType: RealMatterInputType;
  documentTypesExpected?: string[];
  knownMissingMaterial?: string[];
  knownContradictions?: string[];
  redactionStatus: RealMatterRedactionStatus;
  discoveryNotes?: string;
  holdout?: boolean;
  neverCommit: true;
};

/** Gitignored optional strict truth — never commit real facts. */
export type RealMatterHumanTruth = {
  defendant?: string;
  charge?: string;
  stage?: string | null;
  missingMaterialExpected?: string[];
  contradictionsExpected?: string[];
  notes?: string;
};

export type RealMatterListEntry = {
  localId: string;
  anonymisedLabel: string;
  offenceFamily: string;
  holdout: boolean;
  inputType: RealMatterInputType;
  hasBundleText: boolean;
  hasBundlePdf: boolean;
  hasHumanTruth: boolean;
};

export type RealMatterScoreCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type RealMatterOverall =
  | "pass"
  | "weak"
  | "fail"
  | "needs_review"
  | "uncertain"
  | "skipped";

export type RealMatterCaseResult = {
  localId: string;
  anonymisedLabel: string;
  offenceFamily: string;
  holdout: boolean;
  mode: "discovery" | "strict-truth";
  inputSource: "bundle-text" | "bundle-pdf-extract" | "none";
  extractChars: number;
  overall: RealMatterOverall;
  metadataStatus: "ok" | "thin" | "needs_review" | "uncertain";
  spineRan: boolean;
  checks: RealMatterScoreCheck[];
  failures: string[];
  fingerprints: string[];
  humanReviewRequired: boolean;
};

export type RealMatterAuditorSummary = {
  generatedAt: string;
  version: string;
  pack: "local";
  mode: "discovery" | "strict-truth";
  matterCount: number;
  scored: number;
  skippedHoldout: number;
  passed: number;
  weak: number;
  failed: number;
  needsReview: number;
  uncertain: number;
  results: RealMatterCaseResult[];
  topFingerprints: Array<{ fingerprint: string; count: number }>;
  byOffenceFamily: Array<{ offenceFamily: string; total: number; pass: number; weak: number; fail: number; needsReview: number }>;
  byDocumentType: Array<{ documentType: string; total: number; pass: number; weak: number; fail: number }>;
  holdoutSummary: Array<{ localId: string; anonymisedLabel: string; note: string }>;
  strictTruthSummary: Array<{ localId: string; overall: string; matched: number; total: number }>;
};
