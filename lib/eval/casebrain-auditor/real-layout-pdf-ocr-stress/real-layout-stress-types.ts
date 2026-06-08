export const REAL_LAYOUT_STRESS_SLUG = "real-layout-pdf-ocr-stress";
export const REAL_LAYOUT_STRESS_GENERATOR_VERSION = "rlpdf-slice-2";
export const REAL_LAYOUT_STRESS_MAX_SLICE1 = 25;
export const REAL_LAYOUT_STRESS_MAX_SLICE2 = 50;

/** Slice 1 layout tags (unchanged). */
export const REAL_LAYOUT_STRESS_SLICE1_LAYOUT_TAGS = [
  "bad_index",
  "wrong_page_numbers",
  "duplicate_page",
  "missing_page",
  "mg5_buried_late",
  "mg6_incomplete",
  "mg11_weird_placement",
  "corrected_charge_sheet",
  "cctv_stills_no_master",
  "cad_summary_no_full",
  "999_summary_no_audio",
  "interview_summary_no_transcript",
  "custody_pace_notes",
  "exhibit_continuity_weird",
  "email_screenshot_page",
  "multi_count",
  "multi_defendant",
  "light_ocr_noise",
  "rotated_page_marker",
  "scanned_page_marker",
] as const;

/** Slice 2 harder layout tags. */
export const REAL_LAYOUT_STRESS_SLICE2_LAYOUT_TAGS = [
  "split_bundle_sections",
  "blank_separator_page",
  "repeated_header_footer",
  "broken_charge_wording",
  "mg_label_corrupted",
  "index_body_mismatch",
  "body_not_in_index",
  "defendant_name_variants",
  "co_defendant_name_proximity",
  "charge_sheet_conflict",
  "interview_in_custody_log",
  "cctv_export_log_absent",
  "continuity_separated",
  "heavy_ocr_noise",
  "true_rotated_page",
  "scanned_image_page",
] as const;

export const REAL_LAYOUT_STRESS_LAYOUT_TAGS = [
  ...REAL_LAYOUT_STRESS_SLICE1_LAYOUT_TAGS,
  ...REAL_LAYOUT_STRESS_SLICE2_LAYOUT_TAGS,
] as const;

export type RealLayoutStressLayoutTag = (typeof REAL_LAYOUT_STRESS_LAYOUT_TAGS)[number];

export type RealLayoutOffenceFamily =
  | "motoring_dangerous"
  | "fraud_account"
  | "pwits_phone"
  | "robbery_identification"
  | "violence_gbh_s18"
  | "generic_provisional";

export type RealLayoutMaterialisationMode = "pdf-sampled" | "text-layout-fixture";

export type RealLayoutTrapTier = "hard" | "deliberate_weak" | "deliberate_fail";

export type RealLayoutTrapProfile = {
  tier: RealLayoutTrapTier;
  /** Fingerprints expected when pipeline mishandles the trap layout. */
  expectFingerprintsOnMismatch: string[];
  /** Missing listed in index only — not repeated in body text. */
  indexListsMissingOnly?: boolean;
  /** Contradiction exists only in corrupted/hidden layout text. */
  contradictionLayoutOnly?: boolean;
  /** Charge wording broken across lines / heavy OCR — confident detect is overreach. */
  chargeObscured?: boolean;
  /** Thin scanned page — confident reasoning is unsafe. */
  thinScannedUnsafe?: boolean;
};

export type RealLayoutStressSampleManifest = {
  sampleId: string;
  seed: number;
  offenceFamily: RealLayoutOffenceFamily;
  layoutTags: RealLayoutStressLayoutTag[];
  expectedDefendant: string;
  expectedCharge: string;
  expectedStage: string;
  expectedMissingMaterial: string[];
  expectedContradictions: string[];
  expectedDisclosurePriorities: string[];
  expectedStrategyTags: string[];
  materialisationMode: RealLayoutMaterialisationMode;
  coDefendants?: string[];
  extraCounts?: string[];
  defendantVariants?: string[];
  trapProfile?: RealLayoutTrapProfile;
  fictional: true;
};

export type RealLayoutStressScoreCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type RealLayoutTrapOutcome = {
  expectedTier: RealLayoutTrapTier | null;
  expectedFingerprints: string[];
  actualFingerprints: string[];
  trapMatched: boolean;
};

export type RealLayoutStressSampleResult = {
  sampleId: string;
  seed: number;
  offenceFamily: RealLayoutOffenceFamily;
  layoutTags: RealLayoutStressLayoutTag[];
  materialisationMode: RealLayoutMaterialisationMode;
  extractChars: number;
  overall: "pass" | "weak" | "fail";
  checks: RealLayoutStressScoreCheck[];
  failures: string[];
  fingerprints: string[];
  trapOutcome?: RealLayoutTrapOutcome;
  spineRan: boolean;
  metadataStatus: "ok" | "thin" | "needs_review";
};

export type RealLayoutStressSummary = {
  generatedAt: string;
  generatorVersion: string;
  phase: string;
  count: number;
  canary: boolean;
  scored: number;
  passed: number;
  weak: number;
  failed: number;
  materialisationMode: RealLayoutMaterialisationMode;
  results: RealLayoutStressSampleResult[];
  topFingerprints: Array<{ fingerprint: string; count: number }>;
  byFamily: Array<{ offenceFamily: string; total: number; pass: number; weak: number; fail: number }>;
  byLayoutTag: Array<{ layoutTag: string; total: number; pass: number; weak: number; fail: number }>;
  extractCharDistribution: { min: number; max: number; median: number; p25: number; p75: number };
  deliberateTraps: Array<{
    sampleId: string;
    tier: RealLayoutTrapTier;
    overall: string;
    expectedFingerprints: string[];
    actualFingerprints: string[];
    trapMatched: boolean;
  }>;
};
