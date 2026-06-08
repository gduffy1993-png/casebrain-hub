import type { FailureModeTag, OffenceFamily } from "./strategy-corpus-types";

export type OffenceRecipeTemplate = {
  family: OffenceFamily;
  recipePrefix: string;
  chargeVariants: string[];
  stageVariants: string[];
  defaultMissing: string[];
  defaultEvidence: string[];
  compatibleTags: FailureModeTag[];
  expectedOffenceLens: string;
  minProofPoints: number;
  requiresHumanReviewWhenSerious: boolean;
};

export const OFFENCE_RECIPE_TEMPLATES: readonly OffenceRecipeTemplate[] = [
  {
    family: "motoring",
    recipePrefix: "motoring",
    chargeVariants: [
      "Dangerous driving — RTA 1988 s.2",
      "Careless driving — RTA 1988 s.3",
      "Driving without due care and attention — RTA 1988 s.3",
    ],
    stageVariants: ["Magistrates' Court", "First hearing", "Plea and trial preparation"],
    defaultMissing: ["Dashcam / CCTV master", "Full CAD log", "Collision expert report"],
    defaultEvidence: ["ANPR partial log", "Officer notebook summary", "CAD dispatch note"],
    compatibleTags: [
      "thin_bundle",
      "partial_cctv",
      "cad_summary_no_full_cad",
      "999_summary_no_audio",
      "timing_contradiction",
      "causation_dispute",
      "identity_dispute",
      "incomplete_mg6",
      "duplicate_noisy_docs",
      "corrected_charge_sheet",
    ],
    expectedOffenceLens: "motoring",
    minProofPoints: 3,
    requiresHumanReviewWhenSerious: false,
  },
  {
    family: "fraud_account_control",
    recipePrefix: "fraud",
    chargeVariants: [
      "Fraud by false representation, Fraud Act 2006 s.2",
      "Fraud by abuse of position, Fraud Act 2006 s.4",
    ],
    stageVariants: ["Crown Court", "Plea and trial preparation", "Case management"],
    defaultMissing: [
      "Full bank export / source statements",
      "Device / login audit material",
      "Mailbox export",
    ],
    defaultEvidence: ["Bank schedule summary", "MG5 narrative", "Partial transaction list"],
    compatibleTags: [
      "thin_bundle",
      "phone_device_attribution_dispute",
      "timing_contradiction",
      "incomplete_mg6",
      "custody_pace_limited",
      "interview_summary_no_transcript",
      "multi_count",
      "multi_defendant",
      "duplicate_noisy_docs",
    ],
    expectedOffenceLens: "fraud",
    minProofPoints: 4,
    requiresHumanReviewWhenSerious: false,
  },
  {
    family: "pwits_phone",
    recipePrefix: "pwits",
    chargeVariants: [
      "Possession with intent to supply Class A controlled drugs",
      "Possession of a controlled drug with intent to supply — Misuse of Drugs Act 1971 s.5(3)",
    ],
    stageVariants: ["Crown Court", "Magistrates' Court committal", "Plea and trial preparation"],
    defaultMissing: [
      "Full phone extraction",
      "Phone attribution / ownership material",
      "Search BWV export",
      "Drug lab continuity note",
    ],
    defaultEvidence: ["Search summary", "Partial handset notes", "Cash seizure note"],
    compatibleTags: [
      "thin_bundle",
      "phone_device_attribution_dispute",
      "lab_continuity_gap",
      "bwv_outstanding",
      "interview_summary_no_transcript",
      "custody_pace_limited",
      "incomplete_mg6",
      "multi_count",
      "identity_dispute",
    ],
    expectedOffenceLens: "pwits",
    minProofPoints: 4,
    requiresHumanReviewWhenSerious: true,
  },
  {
    family: "robbery_id",
    recipePrefix: "robbery-id",
    chargeVariants: [
      "Robbery, Theft Act 1968 s.8",
      "Robbery — s.8 Theft Act 1968 (alternative count: theft from person)",
    ],
    stageVariants: ["Crown Court", "Plea and trial preparation", "First hearing"],
    defaultMissing: [
      "Full CCTV master footage",
      "CCTV continuity / export log",
      "ID procedure material",
      "999 / CAD timing material",
    ],
    defaultEvidence: ["Complainant first account", "Partial stills", "MG5 summary"],
    compatibleTags: [
      "thin_bundle",
      "partial_cctv",
      "cctv_stills_no_master",
      "cad_summary_no_full_cad",
      "999_summary_no_audio",
      "identity_dispute",
      "timing_contradiction",
      "multi_defendant",
      "bwv_outstanding",
      "weapon_provenance_conflict",
    ],
    expectedOffenceLens: "robbery_id",
    minProofPoints: 5,
    requiresHumanReviewWhenSerious: false,
  },
  {
    family: "violence_gbh_s18",
    recipePrefix: "violence",
    chargeVariants: [
      "Unlawful wounding / GBH, s.20 OAPA 1861",
      "Wounding with intent / s.18 OAPA 1861",
      "Section 20 grievous bodily harm — OAPA 1861",
    ],
    stageVariants: ["Crown Court", "Plea and trial preparation", "Case management"],
    defaultMissing: [
      "CCTV export and continuity",
      "Full 999/CAD",
      "Body worn video",
      "Medical / expert report",
    ],
    defaultEvidence: ["Witness MG11 summary", "Partial CAD extract", "MG5 narrative"],
    compatibleTags: [
      "thin_bundle",
      "partial_cctv",
      "cctv_stills_no_master",
      "cad_summary_no_full_cad",
      "999_summary_no_audio",
      "bwv_outstanding",
      "timing_contradiction",
      "causation_dispute",
      "weapon_provenance_conflict",
      "self_defence_pattern",
      "lab_continuity_gap",
      "identity_dispute",
      "multi_count",
      "incomplete_mg6",
    ],
    expectedOffenceLens: "violence_gbh",
    minProofPoints: 5,
    requiresHumanReviewWhenSerious: true,
  },
  {
    family: "generic_provisional",
    recipePrefix: "generic-provisional",
    chargeVariants: [
      "Perverting the course of justice — common law",
      "Witness intimidation — Criminal Justice and Public Order Act 1994 s.51",
      "Serious offence — provisional charge wording pending review",
    ],
    stageVariants: ["Magistrates' Court", "First hearing", "Case management"],
    defaultMissing: ["Core witness statements", "Exhibit continuity", "Full disclosure schedule"],
    defaultEvidence: ["Partial MG5", "Officer summary", "Draft MG6"],
    compatibleTags: [
      "thin_bundle",
      "missing_mg5",
      "incomplete_mg6",
      "custody_pace_limited",
      "interview_summary_no_transcript",
      "duplicate_noisy_docs",
      "corrected_charge_sheet",
      "timing_contradiction",
      "identity_dispute",
    ],
    expectedOffenceLens: "generic_provisional",
    minProofPoints: 3,
    requiresHumanReviewWhenSerious: true,
  },
] as const;

export function templateForFamily(family: OffenceFamily): OffenceRecipeTemplate {
  const t = OFFENCE_RECIPE_TEMPLATES.find((r) => r.family === family);
  if (!t) throw new Error(`No recipe template for ${family}`);
  return t;
}

export function buildRecipeId(family: OffenceFamily, tags: FailureModeTag[]): string {
  const template = templateForFamily(family);
  const tagSlug = tags.slice(0, 4).sort().join("+") || "baseline";
  return `${template.recipePrefix}__${tagSlug}`;
}

export const FICTIONAL_DEFENDANT_NAMES = [
  "Alex Mercer",
  "Jordan Blake",
  "Sam Okonkwo",
  "Ella Shaw",
  "Marcus Vale",
  "Kian Doyle",
  "Leon Marsh",
  "Morgan Drew",
  "Riley Chen",
  "Taylor Brooks",
  "Casey Quinn",
  "Jamie Patel",
] as const;
