/**
 * Language Sanitizer for Strategic Intelligence
 * 
 * Recursively removes defendant-only language from Strategic Intelligence output
 * when caseRole === "claimant"
 */

import type { CaseRole } from "./role-detection";

/**
 * Replace defendant-only phrases with claimant-appropriate equivalents
 */
function sanitizeText(text: string, isClaimant: boolean): string {
  if (!isClaimant || typeof text !== "string") return text;
  
  let sanitized = text;
  
  // Replacements mapping: [defendant phrase pattern, claimant replacement]
  // IMPORTANT: Order matters - more specific patterns MUST come first to avoid partial matches
  const replacements: Array<[RegExp, string]> = [
    // Defence-related (most specific first)
    [/\bresist summary judgment\/strike out your defence\b/gi, "pursue directions and disclosure"],
    [/\bstrike out your defence\b/gi, "seek liability admission"],
    [/\bstrike-out your defence\b/gi, "seek liability admission"],
    [/\bstrike out.*defence\b/gi, "seek liability admission"],
    [/\byour defence\b/gi, "your case"],
    [/\bresist summary judgment\b/gi, "pursue directions and disclosure"],
    [/\bstrike out\b/gi, "seek admission"],
    
    // Challenge liability (defendant tactic - most specific first)
    [/\bchallenge liability at trial\b/gi, "litigate to liability judgment"],
    [/\bchallenge liability\b/gi, "press for early admission"],
    [/\bchallenge.*liability\b/gi, "press for early admission"],
    
    // Part 36 offers (defendant tactic - most specific first)
    [/\bjustify a low Part 36 offer\b/gi, "use as settlement leverage"],
    [/\blow Part 36 offer\b/gi, "strategic settlement offer"],
    [/\bmake.*low.*Part 36\b/gi, "make strategic settlement offer"],
    [/\bPart 36 offer\b/gi, "settlement offer"],
    [/\bPart 36\b/gi, "settlement"], // Generic Part 36 replacement (less specific, comes last)
    
    // "They can't prove liability" (defendant framing - most specific first)
    [/\bthey can['']t prove liability\b/gi, "liability is well-founded"],
    [/\bthey cannot prove liability\b/gi, "liability is well-founded"],
    [/\bcannot prove liability\b/gi, "liability is established"],
    [/\bcannot discharge their burden\b/gi, "must respond to"],
    [/\bcan['']t prove\b/gi, "cannot discharge"],
    
    // Defendant-specific language
    [/\bchallenge.*case\b/gi, "strengthen your case"],
    [/\battack.*evidence\b/gi, "highlight evidence"],
  ];
  
  for (const [pattern, replacement] of replacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

/**
 * Recursively sanitize any object/array/value
 * Walks the entire object tree and sanitizes all string values
 */
function recursiveSanitize(value: any, isClaimant: boolean): any {
  if (!isClaimant) return value;
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle strings - sanitize them
  if (typeof value === "string") {
    return sanitizeText(value, isClaimant);
  }
  
  // Handle arrays - recursively sanitize each element
  if (Array.isArray(value)) {
    return value.map(item => recursiveSanitize(item, isClaimant));
  }
  
  // Handle objects - recursively sanitize all properties
  if (typeof value === "object") {
    const sanitized: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = recursiveSanitize(value[key], isClaimant);
      }
    }
    return sanitized;
  }
  
  // Handle primitives (number, boolean, etc.) - return as-is
  return value;
}

/**
 * Sanitize a strategy path for claimant cases
 */
export function sanitizeStrategyPath(path: any, caseRole: CaseRole): any {
  if (caseRole !== "claimant") return path;
  return recursiveSanitize(path, true);
}

/**
 * Sanitize a weak spot for claimant cases
 */
export function sanitizeWeakSpot(weakSpot: any, caseRole: CaseRole): any {
  if (caseRole !== "claimant") return weakSpot;
  return recursiveSanitize(weakSpot, true);
}

/**
 * Sanitize a leverage point for claimant cases
 */
export function sanitizeLeveragePoint(
  leveragePoint: any,
  caseRole: CaseRole
): any {
  if (caseRole !== "claimant") return leveragePoint;
  return recursiveSanitize(leveragePoint, true);
}

/**
 * Sanitize meta object
 */
export function sanitizeMeta(meta: any, isClaimant: boolean): any {
  if (!isClaimant) return meta;
  return recursiveSanitize(meta, true);
}

/**
 * Sanitize an entire Strategic Intelligence response object
 * Recursively walks the entire response and sanitizes all strings
 */
export function sanitizeStrategicResponse(
  response: any,
  caseRole: CaseRole
): any {
  if (caseRole !== "claimant") return response;
  return recursiveSanitize(response, true);
}
