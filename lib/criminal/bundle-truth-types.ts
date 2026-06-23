/**
 * Bundle Truth Ledger — shared source-truth types.
 */

export type TruthConfidence = "high" | "medium" | "low" | "provisional";

export type DocumentPriority =
  | "charge_sheet"
  | "indictment"
  | "mg5"
  | "mg6"
  | "mg11"
  | "interview"
  | "exhibit"
  | "admin"
  | "unknown";

export type BundleOffenceFamily =
  | "murder"
  | "manslaughter"
  | "gbh_s18"
  | "gbh_s20_abh"
  | "robbery"
  | "burglary"
  | "theft"
  | "pwits"
  | "possession"
  | "fraud"
  | "public_order"
  | "harassment"
  | "sexual"
  | "driving"
  | "motoring"
  | "perverting_justice"
  | "provisional_violence"
  | "unknown";

export type MaterialStatus =
  | "served"
  | "draft"
  | "unsigned"
  | "referred_only"
  | "outstanding"
  | "absent"
  | "partial"
  | "unclear";

export type SourceAnchor = {
  documentPriority: DocumentPriority;
  sectionLabel: string | null;
  excerpt: string | null;
};

export type NormalisedMaterialRow = {
  id: string;
  scheduleRef: string | null;
  label: string;
  detail: string | null;
  status: MaterialStatus;
  displayLine: string;
  sourceAnchor: SourceAnchor;
  confidence: TruthConfidence;
};

export type ForbiddenClaim = {
  id: string;
  phrase: string;
  reason: string;
  relatedMaterialIds: string[];
};

export type BundleTruthHearing = {
  rawLiteral: string | null;
  dateIso: string | null;
  timeLiteral: string | null;
  hearingType: string | null;
  sourceAnchor: SourceAnchor | null;
  confidence: TruthConfidence;
};

export type BundleTruthCharge = {
  wording: string | null;
  countNumber: string | null;
  particulars: string | null;
  sourceAnchor: SourceAnchor | null;
  confidence: TruthConfidence;
};

export type BundleTruthOffenceFamily = {
  family: BundleOffenceFamily;
  confidence: TruthConfidence;
  sourceAnchor: SourceAnchor | null;
  blockedFamilies: BundleOffenceFamily[];
};

export type BundleTruthIdentity = {
  defendant: string | null;
  coDefendants: string[];
  confidence: TruthConfidence;
};

export type BundleTruthLedger = {
  version: "bundle-truth-v1";
  defendant: BundleTruthIdentity;
  court: string | null;
  hearing: BundleTruthHearing;
  stage: string | null;
  charge: BundleTruthCharge;
  offenceFamily: BundleTruthOffenceFamily;
  materials: NormalisedMaterialRow[];
  ocrConfidence: TruthConfidence;
  reviewRequired: boolean;
  forbiddenClaims: ForbiddenClaim[];
  sourceAnchors: SourceAnchor[];
};

export type BuildBundleTruthLedgerInput = {
  bundleText: string;
  parsedHeader?: {
    accused?: string | null;
    shortTitle?: string | null;
    stage?: string | null;
  } | null;
};
