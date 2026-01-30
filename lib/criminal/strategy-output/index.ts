/**
 * Strategy Output Model - Public API
 * 
 * Central export point for all strategy output types and functions.
 */

// Types
export type {
  EvidenceAnchor,
  ConditionalLogic,
  SolicitorOverride,
  EvidenceSnapshot,
} from "./types";

// Evidence Anchor Builders
export {
  buildEvidenceAnchorFromDocs,
  buildGapAnchor,
  buildTimelineAnchor,
} from "./anchors";

// Evidence Snapshot Builder
export {
  buildEvidenceSnapshot,
} from "./evidence-snapshot";
