/**
 * Language Sanitizer for Strategic Intelligence
 * 
 * Removes defendant-only language from Strategic Intelligence output
 * when caseRole === "claimant"
 */

import type { CaseRole } from "./role-detection";
import type { StrategyPath } from "./strategy-paths";
import type { OpponentWeakSpot } from "./weak-spots";
import type { ProceduralLeveragePoint } from "./procedural-leverage";
import type { StrategicInsightMeta } from "./types";

/**
 * Replace defendant-only phrases with claimant-appropriate equivalents
 */
function sanitizeText(text: string, isClaimant: boolean): string {
  if (!isClaimant) return text;
  
  let sanitized = text;
  
  // Replacements mapping: [defendant phrase pattern, claimant replacement]
  const replacements: Array<[RegExp, string]> = [
    // Defence-related
    [/\byour defence\b/gi, "your case"],
    [/\bstrike out your defence\b/gi, "seek liability admission"],
    [/\bstrike-out your defence\b/gi, "seek liability admission"],
    [/\bresist summary judgment\b/gi, "pursue directions and disclosure"],
    [/\bresist summary judgment\/strike out your defence\b/gi, "pursue directions and disclosure"],
    
    // Challenge liability (defendant tactic)
    [/\bchallenge liability\b/gi, "press for early admission"],
    [/\bchallenge liability at trial\b/gi, "litigate to liability judgment"],
    [/\bchallenge.*liability\b/gi, "press for early admission"],
    
    // Low Part 36 offers (defendant tactic)
    [/\blow Part 36 offer\b/gi, "quantum negotiations"],
    [/\bjustify a low Part 36 offer\b/gi, "use as settlement leverage"],
    [/\bmake.*low.*Part 36\b/gi, "make strategic Part 36 offer"],
    
    // "They can't prove liability" (defendant framing)
    [/\bthey can['']t prove liability\b/gi, "liability is well-founded"],
    [/\bthey cannot prove liability\b/gi, "liability is well-founded"],
    [/\bcannot prove liability\b/gi, "liability is established"],
    [/\bcan['']t prove\b/gi, "cannot discharge"],
    [/\bcannot discharge their burden\b/gi, "must respond to"],
    
  ];
  
  for (const [pattern, replacement] of replacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

/**
 * Sanitize a strategy path for claimant cases
 */
export function sanitizeStrategyPath(path: StrategyPath, caseRole: CaseRole): StrategyPath {
  if (caseRole !== "claimant") return path;
  
  return {
    ...path,
    title: sanitizeText(path.title, true),
    description: sanitizeText(path.description, true),
    approach: sanitizeText(path.approach, true),
    pros: path.pros.map(p => sanitizeText(p, true)),
    cons: path.cons.map(c => sanitizeText(c, true)),
    recommendedFor: sanitizeText(path.recommendedFor, true),
    meta: path.meta ? sanitizeMeta(path.meta, true) : undefined,
  };
}

/**
 * Sanitize a weak spot for claimant cases
 */
export function sanitizeWeakSpot(weakSpot: OpponentWeakSpot, caseRole: CaseRole): OpponentWeakSpot {
  if (caseRole !== "claimant") return weakSpot;
  
  // For claimant cases, admin gaps should be downgraded in severity
  let severity = weakSpot.severity;
  if (
    caseRole === "claimant" &&
    (weakSpot.description.toLowerCase().includes("client id") ||
     weakSpot.description.toLowerCase().includes("retainer") ||
     weakSpot.description.toLowerCase().includes("cfa") ||
     weakSpot.description.toLowerCase().includes("identification"))
  ) {
    // Downgrade admin gaps from CRITICAL/HIGH to MEDIUM
    if (severity === "CRITICAL") severity = "MEDIUM";
    else if (severity === "HIGH") severity = "MEDIUM";
  }
  
  return {
    ...weakSpot,
    severity,
    description: sanitizeText(weakSpot.description, true),
    impact: sanitizeText(weakSpot.impact, true),
    suggestedAction: sanitizeText(weakSpot.suggestedAction, true),
    meta: weakSpot.meta ? sanitizeMeta(weakSpot.meta, true) : undefined,
  };
}

/**
 * Sanitize a leverage point for claimant cases
 */
export function sanitizeLeveragePoint(
  leveragePoint: ProceduralLeveragePoint,
  caseRole: CaseRole
): ProceduralLeveragePoint {
  if (caseRole !== "claimant") return leveragePoint;
  
  return {
    ...leveragePoint,
    description: sanitizeText(leveragePoint.description, true),
    escalationText: sanitizeText(leveragePoint.escalationText, true),
    leverage: sanitizeText(leveragePoint.leverage, true),
    meta: leveragePoint.meta ? sanitizeMeta(leveragePoint.meta, true) : undefined,
  };
}

/**
 * Sanitize meta object
 */
export function sanitizeMeta(meta: StrategicInsightMeta, isClaimant: boolean): StrategicInsightMeta {
  if (!isClaimant) return meta;
  
  return {
    whyRecommended: sanitizeText(meta.whyRecommended, true),
    triggeredBy: meta.triggeredBy.map(t => sanitizeText(t, true)),
    alternatives: meta.alternatives.map(alt => ({
      ...alt,
      label: sanitizeText(alt.label, true),
      description: sanitizeText(alt.description, true),
      unlockedBy: alt.unlockedBy?.map(u => sanitizeText(u, true)),
    })),
    riskIfIgnored: sanitizeText(meta.riskIfIgnored, true),
    bestStageToUse: sanitizeText(meta.bestStageToUse, true),
    howThisHelpsYouWin: sanitizeText(meta.howThisHelpsYouWin, true),
  };
}

