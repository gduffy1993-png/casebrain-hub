import type { ProofMapOffenceLens } from "@/lib/eval/casebrain-auditor/proof-map-types";

/** Coverage tier — every criminal matter must land in exactly one. */
export type ProductProofMapTier = "A" | "B" | "C" | "D";

export type ProductProofMapConfidence =
  | "on_papers"
  | "likely"
  | "provisional"
  | "needs_solicitor_review"
  | "insufficient";

export type ProductProofMapProofPoint = {
  id: string;
  label: string;
  crownMustProve: string;
  confidence: ProductProofMapConfidence;
  humanReviewRequired: boolean;
  sourceSection: string;
  sourceBasis?: string;
  doNotOverstate?: string;
};

export type ProductProofMapLink = {
  proofPointId: string;
  linkType: "supports" | "weakens" | "missing" | "disclosure_chase" | "contradiction" | "other";
  label: string;
  sourceSection: string;
  sourceBasis?: string;
  status: "served" | "partial" | "outstanding" | "conflicting" | "unclear";
  disclosureChase?: string;
  doNotOverstate?: string;
  confidence: ProductProofMapConfidence;
};

export type ProductProofMapViewModel = {
  available: true;
  tier: ProductProofMapTier;
  tierLabel: string;
  offenceLensLabel: string;
  charge: string;
  stage: string | null;
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  proofPoints: ProductProofMapProofPoint[];
  supportsLinks: ProductProofMapLink[];
  missingLinks: ProductProofMapLink[];
  disclosureChaseLinks: ProductProofMapLink[];
  solicitorReviewNote: string;
  doNotRelyWarning: string;
};

export type ProductProofMapBlocked = {
  available: false;
  tier: "D";
  message: string;
};

export type ProductProofMapResult = ProductProofMapViewModel | ProductProofMapBlocked;

export const PROOF_MAP_UNAVAILABLE_MESSAGE =
  "Proof map unavailable until charge and core case papers are on file.";

export const PROOF_MAP_DO_NOT_RELY =
  "Working proof map on current papers — not final legal advice. Solicitor review before reliance.";

export const FAMILY_OFFENCE_LENSES: ProofMapOffenceLens[] = [
  "fraud",
  "pwits",
  "robbery_id",
  "motoring",
  "violence_gbh",
];
