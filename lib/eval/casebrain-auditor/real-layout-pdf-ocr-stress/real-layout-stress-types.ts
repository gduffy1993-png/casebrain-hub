export const REAL_LAYOUT_STRESS_SLUG = "real-layout-pdf-ocr-stress";
export const REAL_LAYOUT_STRESS_GENERATOR_VERSION = "rlpdf-slice-1";
export const REAL_LAYOUT_STRESS_MAX_SLICE1 = 25;

export const REAL_LAYOUT_STRESS_LAYOUT_TAGS = [
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

export type RealLayoutStressLayoutTag = (typeof REAL_LAYOUT_STRESS_LAYOUT_TAGS)[number];

export type RealLayoutOffenceFamily =
  | "motoring_dangerous"
  | "fraud_account"
  | "pwits_phone"
  | "robbery_identification"
  | "violence_gbh_s18"
  | "generic_provisional";

export type RealLayoutMaterialisationMode = "pdf-sampled" | "text-layout-fixture";

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
  fictional: true;
};

export type RealLayoutStressScoreCheck = {
  id: string;
  pass: boolean;
  detail: string;
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
};
