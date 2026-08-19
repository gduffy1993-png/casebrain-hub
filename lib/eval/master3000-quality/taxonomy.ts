export const FAILURE_TAXONOMY = [
  ["A", "extraction_failure", "Source contains information but CaseBrain fails to extract it correctly."],
  ["B", "semantic_role_failure", "Text was extracted but assigned the wrong semantic role."],
  ["C", "evidence_state_failure", "Material is found but service/completeness state is wrong."],
  ["D", "provenance_family_failure", "A claim receives evidence belonging to another evidence family."],
  ["E", "unsupported_promotion_failure", "A heuristic/practice expectation becomes an asserted case fact."],
  ["F", "cross_panel_consistency_failure", "One canonical item receives contradictory states across surfaces."],
  ["G", "workflow_stage_failure", "A matter is routed through the wrong procedural stage."],
  ["H", "entity_attribution_failure", "Facts cross defendant, witness, count, allegation or exhibit boundaries."],
  ["I", "dedupe_alias_failure", "The same issue is duplicated under aliases or distinct issues are merged."],
  ["J", "counter_denominator_failure", "Counters represent incompatible or unexplained sets."],
  ["K", "certainty_escalation_failure", "Downstream wording is more certain than its source state."],
  ["L", "solicitor_visible_internal_language_failure", "Internal, test, taxonomy or telemetry language is visible to users."],
  ["M", "ui_rendering_failure", "Rendering hides, clips or damages trust-critical information."],
  ["N", "stale_derived_state_failure", "One surface uses stale fallback/cache while another has current truth."],
  ["O", "source_conflict_failure", "Conflicting source documents are silently collapsed."],
  ["P", "document_identity_failure", "Filename/wrapper incorrectly determines document type or completeness."],
  ["Q", "partial_processing_failure", "Only part of a bundle processed but output presents analysis as complete."],
  ["R", "cross_case_leakage", "One matter output contains another matter's data."],
  ["S", "repeatability_nondeterminism_failure", "Same unchanged matter produces materially different canonical truth."],
  ["T", "numerical_fidelity_failure", "Dates, times, page numbers, counts or quantities are altered incorrectly."],
  ["U", "quote_fidelity_failure", "A paraphrase appears as a quote or quote text does not match source."],
  ["V", "prompt_injection_content_control_failure", "Instructions inside uploaded papers influence system behaviour."],
] as const;

export type FailureClassCode = (typeof FAILURE_TAXONOMY)[number][0];
export type FailureClassId = (typeof FAILURE_TAXONOMY)[number][1];

export const FAILURE_CLASS_IDS = FAILURE_TAXONOMY.map(([, id]) => id) as FailureClassId[];
export const FAILURE_CLASS_CODES = FAILURE_TAXONOMY.map(([code]) => code) as FailureClassCode[];

export const SEVERITY_LEVELS = [
  {
    level: "P0",
    rank: 0,
    description: "Potentially unsafe, confidential, cross-case, or fundamental truth failure.",
  },
  {
    level: "P1",
    rank: 1,
    description: "Serious legal-meaning/trust failure requiring root-cause fix or explicit quarantine.",
  },
  {
    level: "P2",
    rank: 2,
    description: "Workflow/product clarity problem that should not derail P0/P1 truth work.",
  },
  {
    level: "P3",
    rank: 3,
    description: "Cosmetic polish for later UI/design work unless it affects meaning or trust.",
  },
] as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]["level"];

export function isFailureClassId(value: string): value is FailureClassId {
  return (FAILURE_CLASS_IDS as readonly string[]).includes(value);
}

export function isSeverityLevel(value: string): value is SeverityLevel {
  return SEVERITY_LEVELS.some((entry) => entry.level === value);
}

export function severityRank(level: SeverityLevel): number {
  return SEVERITY_LEVELS.find((entry) => entry.level === level)?.rank ?? Number.POSITIVE_INFINITY;
}

