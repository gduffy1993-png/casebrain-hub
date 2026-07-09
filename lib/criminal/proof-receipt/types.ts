import type { EvidenceExistence, EvidenceReliability } from "@/lib/criminal/five-answers/types";

export type ProofReceiptSurface =
  | "Overview"
  | "Court"
  | "CPS Chase"
  | "Client Summary"
  | "Export";

export type ProofSupportLevel =
  | "Strong"
  | "Partial"
  | "Weak"
  | "Not supported"
  | "Not assessable";

export type ProofSafeAction = "rely" | "check" | "chase" | "do-not-use";

export type ProofReceiptRow = {
  id: string;
  outputLine: string;
  surface: ProofReceiptSurface;
  sourceDocument: string;
  sourcePage: string | null;
  sourceSnippet: string | null;
  evidenceState: string;
  existence: EvidenceExistence;
  reliability: EvidenceReliability;
  supportLevel: ProofSupportLevel;
  safeAction: ProofSafeAction;
  solicitorReviewNote: string | null;
  blockedUnsafeWording: string | null;
  safeAlternativeWording: string | null;
  pending: boolean;
};

export type RefusedOverstatementRow = {
  id: string;
  blockedLine: string;
  reason: string;
  safeAlternative: string;
};

export type FamilyProofCardId =
  | "phone_attribution"
  | "cctv_stills_vs_master"
  | "bwv_referred_only"
  | "co_defendant_only"
  | "youth_safeguards"
  | "medical_report_missing"
  | "encro_handle"
  | "motoring_calibration"
  | "bail_restraining_order"
  | "expert_evidence_missing";

export type FamilyProofCard = {
  id: FamilyProofCardId;
  title: string;
  whyShown: string;
  safeSummary: string;
  defaultAction: ProofSafeAction;
  linkedLabels: string[];
  blockedExamples: string[];
};

export type ProofReceiptViewModel = {
  receipts: ProofReceiptRow[];
  refusedOverstatements: RefusedOverstatementRow[];
  familyCards: FamilyProofCard[];
  stateCounts: {
    served: number;
    partial: number;
    referredOnly: number;
    missing: number;
  };
};
