/**
 * Strategy Output Model - Core Types
 * 
 * Foundation types for CPS Pressure Lens, Judge Focus Lens, and Defence Strategy.
 * All types are deterministic, evidence-linked, and conditional.
 */

/**
 * Evidence Anchor
 * 
 * Links strategic claims to specific evidence sources, gaps, or timeline entries.
 * Ensures all strategic content is traceable to actual case data.
 */
export type EvidenceAnchor = {
  sources: Array<{
    doc_id?: string;
    doc_name?: string;
    excerpt?: string; // Short quote or reference (max 50 words)
  }>;
  gaps?: string[]; // Evidence items that are missing
  timeline_refs?: Array<{
    item: string;
    action?: string;
    date?: string;
  }>;
};

/**
 * Conditional Logic
 * 
 * Defines if/then conditions for strategic claims.
 * All strategic items must have conditional logic to ensure they're evidence-driven.
 */
export type ConditionalLogic = {
  if: string; // Human-readable condition (deterministic, e.g., "Identification element support is weak")
  then: string; // Effect on risk/strategy (e.g., "Identification challenge route is viable")
  evidence_needed?: string[]; // Evidence items that would change the condition
  anchors?: EvidenceAnchor; // Evidence anchor linking to case data
  severity?: "low" | "medium" | "high"; // Severity of the condition's impact
};

/**
 * Solicitor Override
 * 
 * Allows solicitors to mark strategic items as accepted, ignored, not applicable, or needing review.
 * Overrides are persisted separately (Phase 7).
 */
export type SolicitorOverride = {
  id: string; // Stable key for the claim (e.g., "cps_arg_identification_clear")
  status: "accept" | "ignore" | "not_applicable" | "needs_review";
  note?: string; // Optional note explaining the override
  updated_at?: string; // ISO timestamp
  updated_by?: string; // User ID
};

/**
 * Evidence Snapshot
 * 
 * Captures the current state of evidence, disclosure, and case posture.
 * Used by strategic lenses to make conditional assessments.
 */
export type EvidenceSnapshot = {
  offence: {
    code?: string;
    label?: string;
  };
  posture: {
    has_position: boolean;
    position_summary?: string;
    phase?: number;
  };
  disclosure: {
    required_dependencies: string[];
    required_without_timeline: string[];
    timeline_items_present: string[];
  };
  evidence: {
    docs_count: number;
    extracted_text_chars?: number;
    key_docs_present: string[];
    key_gaps: string[];
  };
  flags: {
    date_conflicts?: boolean;
    id_uncertainty?: boolean;
    weapon_uncertainty?: boolean;
    sequence_missing?: boolean;
  };
};
