export type {
  AdvisoryConsideration,
  AdvisoryEpistemicKind,
  AdvisoryScope,
  EstablishedFact,
  LegalIntelligenceResult,
  NotEstablishedClaim,
  SafePromotionRequest,
  SafePromotionResult,
} from "./types";

export {
  buildLegalIntelligence,
  considerationsForSurface,
  extractEstablishedFromBundle,
  buildNotEstablishedClaims,
  type BuildLegalIntelligenceInput,
} from "./build-legal-intelligence";

export { buildOffenceFamilyConsiderations } from "./offence-family-considerations";
export { buildCaseMovesAdvisory, caseMoveToConsideration } from "./case-moves-advisory";
export { buildFightEngineAdvisoryConsiderations } from "./fight-engine-advisory";
export { buildRealLifeStrategyConsiderations } from "./real-life-strategies-advisory";
export {
  attemptSafePromotion,
  offenceTypeCannotCreateEvidenceTruth,
} from "./safe-promotion";
