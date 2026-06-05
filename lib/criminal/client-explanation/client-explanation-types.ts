/** Client Explanation Mode — slice 1 (draft for solicitor review, no DB). */

export type ClientExplanationResult = {
  available: true;
  plainEnglishCasePosition: string;
  whatPapersCurrentlySay: string[];
  missingOrNeedsChecking: string[];
  disputedOrUnresolved: string[];
  questionsForClient: string[];
  whatHappensNext: string;
  whatNotToOverstate: string[];
  solicitorReviewFooter: string;
  fullText: string;
};

export type ClientExplanationUnavailableReason = "no_reasoning";

export type ClientExplanationOutcome =
  | { available: false; reason: ClientExplanationUnavailableReason }
  | ClientExplanationResult;

export type ClientExplanationContext = {
  caseLabel?: string | null;
  clientLabel?: string | null;
  stage?: string | null;
  hearingDateIso?: string | null;
};
