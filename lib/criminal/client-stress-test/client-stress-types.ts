/** Client Account Stress-Test — slice 1 (local only, no DB). */

export type ClientAccountOption =
  | "denies_presence"
  | "denies_participation"
  | "denies_possession"
  | "denies_intent"
  | "accepts_presence_disputes_role"
  | "accepts_possession_disputes_supply"
  | "self_defence"
  | "accident_no_dangerous_standard"
  | "mistaken_identity"
  | "no_comment_limited_instructions"
  | "other_short_note";

export const CLIENT_ACCOUNT_OPTIONS: ReadonlyArray<{
  value: ClientAccountOption;
  label: string;
}> = [
  { value: "denies_presence", label: "Denies presence" },
  { value: "denies_participation", label: "Denies participation" },
  { value: "denies_possession", label: "Denies possession" },
  { value: "denies_intent", label: "Denies intent" },
  { value: "accepts_presence_disputes_role", label: "Accepts presence but disputes role" },
  { value: "accepts_possession_disputes_supply", label: "Accepts possession but disputes supply" },
  { value: "self_defence", label: "Self-defence / defensive force" },
  { value: "accident_no_dangerous_standard", label: "Accident / no dangerous standard" },
  { value: "mistaken_identity", label: "Mistaken identity" },
  { value: "no_comment_limited_instructions", label: "No comment / limited instructions" },
  { value: "other_short_note", label: "Other (short note)" },
] as const;

export type ClientStressInput = {
  selectedOptions: ClientAccountOption[];
  otherNote?: string | null;
};

export type ClientStressResult = {
  available: true;
  accountSummary: string;
  supportsAccount: string[];
  underminesAccount: string[];
  missingBeforeAssessment: string[];
  sourceConflicts: string[];
  clientInstructionQuestions: string[];
  whatWouldChangeRoute: string[];
  whatNotToOverstate: string[];
  solicitorReviewRequired: boolean;
  solicitorReviewReasons: string[];
};

export type ClientStressOutcome =
  | { available: false; reason: "no_reasoning" | "no_account_selected" }
  | ClientStressResult;

export const CLIENT_STRESS_NOTE_MAX_CHARS = 500;
export const CLIENT_STRESS_SELECTION_STORAGE_PREFIX = "casebrain:clientStress:selection:";
