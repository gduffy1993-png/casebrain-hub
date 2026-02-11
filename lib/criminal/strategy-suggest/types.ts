/**
 * Option 3: AI Strategy Suggestion – API contracts.
 * Phase 1.1 (input) and 1.2 (output). No AI calls from this file.
 */

// -----------------------------------------------------------------------------
// INPUT SCHEMA (Phase 1.1)
// What we send to the strategy-suggest API. All text must be sanitised (no PII)
// before sending – see Phase 2.9 / sanitise step.
// -----------------------------------------------------------------------------

/** Max character lengths for input fields (enforced before sending to AI). */
export const STRATEGY_SUGGEST_INPUT_LIMITS = {
  chargeText: 2000,
  summaryText: 4000,
  docSnippetsPerItem: 1500,
  docSnippetsMaxItems: 5,
  /** Total combined text sent to AI should stay under a reasonable prompt size (e.g. 8k chars). */
  totalApproxMax: 8000,
} as const;

/**
 * One document snippet (e.g. from MG6, custody record). Plain text only.
 * Must be sanitised: no names, DOBs, addresses, custody numbers, station names.
 */
export type DocSnippet = {
  /** Source label for context only (e.g. "MG6", "Custody record"). Max 80 chars. */
  sourceLabel: string;
  /** Plain text excerpt. Max STRATEGY_SUGGEST_INPUT_LIMITS.docSnippetsPerItem. */
  text: string;
};

/**
 * Input payload for POST /api/criminal/strategy-suggest (or under caseId).
 * At least one of chargeText or summaryText should be present for a useful suggestion.
 * All string fields must be sanitised (no PII) before sending.
 */
export type StrategySuggestInput = {
  /**
   * Charge wording or offence description (e.g. from charge sheet).
   * Optional if summaryText is provided. Max 2000 chars.
   */
  chargeText?: string;

  /**
   * Case summary or brief. Optional if chargeText is provided. Max 4000 chars.
   */
  summaryText?: string;

  /**
   * Short excerpts from key documents. Optional. Max 5 items, 1500 chars each.
   * Use for context only; must be sanitised.
   */
  docSnippets?: DocSnippet[];

  /**
   * Pre-classified offence category (if already known from rules). Optional.
   * If provided, AI can use to narrow strategy angles. Must be from fixed offence list.
   */
  offenceCategory?: string;

  /**
   * Disclosure status. Optional. E.g. "complete" | "gaps" | "unknown".
   * Helps AI tailor suggestion (e.g. "reserved pending disclosure" when gaps).
   */
  disclosureStatus?: string;
};

/** Required: at least one of chargeText or summaryText must be non-empty for a valid request. */
export function isStrategySuggestInputValid(input: StrategySuggestInput): boolean {
  const hasCharge = typeof input.chargeText === "string" && input.chargeText.trim().length > 0;
  const hasSummary = typeof input.summaryText === "string" && input.summaryText.trim().length > 0;
  return hasCharge || hasSummary;
}

// -----------------------------------------------------------------------------
// OUTPUT SCHEMA (Phase 1.2)
// Structured only. No free-form advice, no citations. Schema versioned for Phase 3.
// -----------------------------------------------------------------------------

export const STRATEGY_SUGGEST_SCHEMA_VERSION = 1;

export type StrategySuggestConfidence = "high" | "medium" | "low";

/**
 * Successful response from strategy-suggest API.
 * All strategy angles must be from the fixed list; offence type from fixed list.
 */
export type StrategySuggestOutput = {
  /** Schema version for future compatibility (Phase 3 hardening). */
  schemaVersion: number;

  /** Offence type from fixed list (e.g. assault_oapa, robbery, theft). */
  offenceType: string;

  /** Strategy angles from fixed list. Order may reflect relevance. */
  strategyAngles: string[];

  /** Short, structured narrative draft. Optional. Max ~500 chars recommended. */
  narrativeDraft?: string;

  /** Confidence in the suggestion. Low → caller should treat as fallback. */
  confidence: StrategySuggestConfidence;
};

/**
 * Fallback or error response. No suggestion shown; use generic / "Reserved pending disclosure".
 */
export type StrategySuggestFallback = {
  schemaVersion: number;
  /** true = no suggestion; use fallback UI. */
  fallback: true;
  /** Reason for fallback (no PII): e.g. "invalid_input" | "ai_unavailable" | "low_confidence". */
  reason: string;
};

export type StrategySuggestResponse = StrategySuggestOutput | StrategySuggestFallback;

export function isStrategySuggestOutput(r: StrategySuggestResponse): r is StrategySuggestOutput {
  return !("fallback" in r && r.fallback === true);
}

/**
 * Build fallback response (Phase 1.5). Use when AI is off, fails, or input invalid.
 * When the API returns this, the app must show "Reserved pending disclosure" and generic
 * strategy options (from constants.GENERIC_STRATEGY_ANGLES / getStrategyAnglesForOffence("other")).
 */
export function getStrategySuggestFallback(reason: string): StrategySuggestFallback {
  return {
    schemaVersion: STRATEGY_SUGGEST_SCHEMA_VERSION,
    fallback: true,
    reason,
  };
}
