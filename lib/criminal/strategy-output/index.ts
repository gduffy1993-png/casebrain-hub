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

// Defence Strategy Builder
export type {
  DefenceStrategyPlan,
} from "./defence-strategy";

export {
  buildDefenceStrategyPlan,
} from "./defence-strategy";

// CPS Pressure Lens Builder
export type {
  CPSPressureLens,
} from "./cps-pressure";

export {
  buildCPSPressureLens,
} from "./cps-pressure";
