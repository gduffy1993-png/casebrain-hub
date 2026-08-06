export {
  CANONICAL_MATTER_STATE_VERSION,
  type CanonicalMatterStateV1,
  type CanonicalEvidenceCounts,
  type CanonicalEvidenceExistence,
  type CanonicalEvidenceItem,
  type CanonicalChaseCounts,
} from "./schema";
export {
  buildCanonicalMatterStateV1,
  fingerprintCanonicalMatter,
  assertSameCanonicalFingerprint,
  mapRawExistenceToCanonical,
  EXISTENCE_MAPPING_POLICY_ID,
  type BuildCanonicalMatterInput,
} from "./build";
export type { UploadedDocumentUnit, UploadedPageUnit, LiveCanonicalPipelineResult, DerivedEvidenceRow } from "@/lib/criminal/build-from-document-units";
export { buildCanonicalPipelineFromDocumentUnits } from "@/lib/criminal/build-from-document-units";
export {
  buildLiveProductionSurfacesFromDocumentUnits,
  findingSummariesForProductionSurfaces,
} from "@/lib/criminal/canonical-live-surface-adapter";
export type { LiveProductionSurfaces } from "@/lib/criminal/canonical-live-surface-adapter";
export {
  mapCaseDocumentsToUploadedUnits,
  buildAuthenticatedMatterCanonicalFromDocuments,
  composeAuthenticatedBundleSourceWithCanonical,
} from "@/lib/criminal/authenticated-matter-canonical";
export type {
  CaseDocumentRow,
  AuthenticatedMatterCanonicalPayload,
} from "@/lib/criminal/authenticated-matter-canonical";
export {
  adaptFiveAnswersAndChaseToCanonical,
  projectCanonicalToLegacyMatterVm,
  adaptTruthKeyEvidenceToRows,
} from "./adapters";
