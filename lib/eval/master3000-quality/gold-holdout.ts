export const STRATIFICATION_AXES = [
  "offence_family",
  "procedural_stage",
  "bundle_size",
  "document_mix",
  "source_quality",
  "evidence_family",
  "entity_complexity",
  "charge_count_complexity",
  "disclosure_gap_density",
  "workflow_surface_risk",
] as const;

export type StratificationAxis = (typeof STRATIFICATION_AXES)[number];

export interface GoldHoldoutPolicy {
  schemaVersion: "casebrain-master3000-gold-holdout-policy@1.0.0";
  goldTargetMin: number;
  goldTargetMax: number;
  holdoutTargetMin: number;
  holdoutTargetMax: number;
  axes: readonly StratificationAxis[];
  truthSourcesAllowed: readonly string[];
  truthSourcesForbidden: readonly string[];
  selectionRules: readonly string[];
  nonClaims: {
    selected: false;
    groundTruthInvented: false;
    casebrainOutputUsedAsTruth: false;
  };
}

export const GOLD_HOLDOUT_POLICY: GoldHoldoutPolicy = {
  schemaVersion: "casebrain-master3000-gold-holdout-policy@1.0.0",
  goldTargetMin: 150,
  goldTargetMax: 250,
  holdoutTargetMin: 50,
  holdoutTargetMax: 100,
  axes: STRATIFICATION_AXES,
  truthSourcesAllowed: [
    "source_pdf_or_source_text",
    "independent_truth_key",
    "qualified_human_review",
    "documented_source_limitation_or_unavailable_status",
  ],
  truthSourcesForbidden: [
    "current_casebrain_output",
    "model_summary_without_source_reference",
    "case_id_specific_patch",
    "cosmetic_salt_or_name_variation_only",
  ],
  selectionRules: [
    "Gold and Holdout must be disjoint.",
    "Holdout must not be tuned directly after failures unless promoted into a new gold version with lineage.",
    "Every selected matter needs independent source/truth provenance or an explicit unresolved/unavailable label.",
    "A stratum can intentionally repeat public forms/layouts, but meaningful distinctness must come from substantive axes.",
    "No broad corpus PASS can be claimed from green exercised controls without reporting unexercised controls.",
  ],
  nonClaims: {
    selected: false,
    groundTruthInvented: false,
    casebrainOutputUsedAsTruth: false,
  },
};

export function validateGoldHoldoutPolicy(policy: GoldHoldoutPolicy = GOLD_HOLDOUT_POLICY): string[] {
  const issues: string[] = [];
  if (policy.goldTargetMin < 150 || policy.goldTargetMax > 250 || policy.goldTargetMin > policy.goldTargetMax) {
    issues.push("gold target must stay within 150-250");
  }
  if (policy.holdoutTargetMin < 50 || policy.holdoutTargetMax > 100 || policy.holdoutTargetMin > policy.holdoutTargetMax) {
    issues.push("holdout target must stay within 50-100");
  }
  for (const axis of STRATIFICATION_AXES) {
    if (!policy.axes.includes(axis)) issues.push(`missing stratification axis: ${axis}`);
  }
  if (!policy.truthSourcesForbidden.includes("current_casebrain_output")) {
    issues.push("policy must forbid current CaseBrain output as ground truth");
  }
  if (!policy.selectionRules.some((rule) => /disjoint/i.test(rule))) {
    issues.push("policy must require disjoint gold and holdout");
  }
  if (policy.nonClaims.selected || policy.nonClaims.groundTruthInvented || policy.nonClaims.casebrainOutputUsedAsTruth) {
    issues.push("policy non-claims must remain false");
  }
  return issues;
}

