import type { ClientAccountOption } from "./client-stress-types";

export type ReasoningCategory =
  | "presence"
  | "role"
  | "identification"
  | "phone"
  | "possession"
  | "supply"
  | "intent"
  | "cctv"
  | "vehicle"
  | "self_defence"
  | "injury"
  | "causation"
  | "witnesses"
  | "disclosure"
  | "interview"
  | "generic";

export type ClientInstructionChecklistItem = {
  questionText: string;
  whyItMatters: string;
  linkedAccountOption: ClientAccountOption | null;
  reasoningCategory: ReasoningCategory;
  provisional: boolean;
};

export type DoNotConcedeGuardItem = {
  concessionRiskLabel: string;
  whyNotToConcedeYet: string;
  sourceOrMissingBasis: string;
  safeWordingAlternative: string;
  solicitorReviewRequired: boolean;
};
