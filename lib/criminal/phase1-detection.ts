/**
 * Phase 1 detection: evidence-driven offence, stance, and procedural stage from the bundle.
 * Acknowledges every case (uses charge text when offence is unknown). No manual pickers.
 *
 * s.18 vs s.20: CPS MG5 often says "intentionally inflicted GBH" for any GBH — that is NOT s.18 intent.
 * One-punch / fall / kerb / fracture cases without weapon, repeated blows, or explicit intent evidence default to s.20.
 */

import { detectOffence } from "./offence-elements";
import type { DisclosureState } from "./disclosure-state";

/** Display label when refining charge s.18 down to s.20 from bundle facts. */
export const S20_GBH_DETECTED_LABEL = "s.20 OAPA 1861 – Grievous Bodily Harm";

/**
 * When the charge sheet says s.18 / wounding with intent but the bundle describes a typical
 * one-punch (or single-blow) GBH without s.18-level intent evidence, treat as s.20 for Phase 1.
 * CPS boilerplate ("intentionally inflicted GBH") must not alone support s.18.
 */
export function refineS18ToS20FromBundleFacts(input: {
  offenceCode: string;
  offenceLabel: string;
  factualText: string;
}): { code: string; label: string } {
  if (input.offenceCode !== "s18_oapa") {
    return { code: input.offenceCode, label: input.offenceLabel };
  }
  const t = (input.factualText || "").toLowerCase();
  if (t.length < 80) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  // Strong factual markers that support keeping s.18 (weapon, repeated violence, clear intent, etc.)
  if (
    /(repeatedly|several times|multiple times|on multiple occasions).{0,60}(punch|kicked|struck|hit|kick)/i.test(t) ||
    /(punch|kick|struck).{0,40}(repeatedly|again|second time|third time)/i.test(t)
  ) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  if (
    /\b(second|third|fourth|fifth)\s+(punch|blow|kick)\b/.test(t) ||
    /\bmultiple\s+(punches|blows|kicks|strikes)\b/.test(t) ||
    /\bcontinued\s+to\s+(punch|kick|strike)\b/.test(t)
  ) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  if (/\bstamped\s+on\b|\bstomped\b|\bkicked\s+(him|her|them|complainant|victim)\s+in\s+the\s+head\b/.test(t)) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  if (
    /\b(knife|machete|blade|hammer|iron bar|bottle used as|offensive weapon)\b/.test(t) &&
    /\b(used|wielded|struck|stabbed|hit with)\b/.test(t)
  ) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  // Explicit intent to cause serious harm / GBH (interview or clear narrative — not CPS charging formula)
  if (
    /\b(admitted|accepts?|accepted)\b.{0,120}\b(intend(ed|ing)?|intention)\b.{0,70}\b(serious|gbh|grievous|really hurt|really injur)/i.test(
      t
    )
  ) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }
  if (
    /\b(threatened\s+to\s+kill|threat\s+to\s+kill)\b/.test(t) &&
    /\b(then|before|after|subsequently)\b.{0,80}\b(punch|assault|attack|struck)\b/.test(t)
  ) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  // Targeting head with repeated / severe force (beyond single punch fall)
  if (
    /\baimed\s+(at|for)\b.{0,30}\bhead\b/.test(t) &&
    /\b(repeated|several|multiple|forceful|full force)\b/.test(t)
  ) {
    return { code: input.offenceCode, label: input.offenceLabel };
  }

  // One-punch / single-blow GBH pattern → default s.20
  const singleBlow =
    /\bone\s+punch\b|\bsingle\s+punch\b|\bpunched\s+once\b|\bone\s+blow\b|\bsingle\s+blow\b|\ba\s+single\s+punch\b|\bone\s+act\s+of\s+violence\b/.test(
      t
    );
  const punchFallMechanism =
    /\b(punch(ed)?|struck|hit|push(ed)?|shov(ed)?)\b/.test(t) &&
    /\b(fell|falling|stumbled|to\s+the\s+ground|onto\s+the\s+(ground|floor|pavement)|kerb|curb)\b/.test(t) &&
    /\b(head|face|skull)\b/.test(t);
  const injuryGbh =
    /\b(fracture|skull fracture|laceration|depressed fracture|gbh|grievous bodily|serious bodily harm)\b/.test(t);

  const onePunchGbhPattern =
    singleBlow ||
    (punchFallMechanism && injuryGbh) ||
    (punchFallMechanism && !/\b(repeated|second|third|again)\s+(punch|blow)\b/.test(t) && injuryGbh);

  // Recklessness language in facts → aligns with s.20
  const recklessnessInFacts =
    /\breckless(ly)?\b.{0,50}\b(as to|whether|if).{0,40}\b(injury|harm|some injury)\b/i.test(t) ||
    /\bdid not (care|intend).{0,40}(serious|whether).{0,30}injur/i.test(t);

  if (onePunchGbhPattern || (recklessnessInFacts && (injuryGbh || punchFallMechanism))) {
    return { code: "s20_oapa", label: S20_GBH_DETECTED_LABEL };
  }

  // Charge says s.18 but narrative is classic one-off assault + serious injury, no repeated blows / weapon
  if (
    injuryGbh &&
    /\b(punch|struck|hit|push)\b/.test(t) &&
    !/\b(knife|blade|weapon|repeatedly|several|multiple punches|second punch)\b/.test(t) &&
    /\bonce\b|\bone\b.{0,25}\b(punch|blow)\b|fell.{0,80}kerb|head.{0,40}(ground|pavement|kerb)/.test(t)
  ) {
    const cpsGbhBoilerplate =
      /\bintentionally\s+(inflicted|caused)\s+(gbh|grievous)/i.test(t) ||
      /\bunlawfully\s+(inflicted|did\s+inflict)\b.{0,40}\b(gbh|grievous)/i.test(t);
    if (cpsGbhBoilerplate || singleBlow || punchFallMechanism) {
      return { code: "s20_oapa", label: S20_GBH_DETECTED_LABEL };
    }
  }

  return { code: input.offenceCode, label: input.offenceLabel };
}

export type Phase1DetectionResult = {
  offenceCode: string;
  offenceLabel: string;
  stance: string;
  stage: string;
};

type ChargeLike = { offence?: string; section?: string | null; [k: string]: unknown };

/**
 * Detect offence from charges and extracted data. Uses existing offence-elements so we
 * acknowledge every offence type (s18, s20, s47, theft, arson, drugs, fraud, etc.).
 * When detection returns "unknown", we still store the raw charge text as label.
 */
export function detectOffenceFromBundle(
  charges: ChargeLike[] | null | undefined,
  extracted: unknown
): { code: string; label: string } {
  const def = detectOffence(charges ?? undefined, extracted);
  const code = def.code === "unknown" ? "unknown" : def.code;
  const rawCharge =
    Array.isArray(charges) && charges.length > 0
      ? String((charges[0] as ChargeLike).offence ?? (charges[0] as ChargeLike).section ?? "").trim()
      : "";
  const label =
    code !== "unknown"
      ? def.label
      : rawCharge.length > 0
        ? rawCharge.slice(0, 200)
        : "Unknown – add charge sheet for offence-specific strategy";
  return { code, label };
}

/**
 * Infer defence stance from MG5/key facts and interview.
 * One punch + fall -> Intent Denial + Causation; no comment -> Put to Proof; etc.
 */
export function detectStanceFromBundle(input: {
  keyFactsText?: string;
  mg5Snippet?: string;
  interviewStance?: string | null;
  hasWeapon?: boolean;
  hasSelfDefenceLanguage?: boolean;
  hasIntoxication?: boolean;
}): string {
  const combined = [input.keyFactsText ?? "", input.mg5Snippet ?? ""].join(" ").toLowerCase();
  const noComment =
    /no comment|no_comment|nothing to say|refused to answer|declined to answer/i.test(combined) ||
    (input.interviewStance ?? "").toLowerCase().includes("no_comment");
  if (noComment) return "Put to proof";

  if (input.hasSelfDefenceLanguage ?? /self[- ]?defen[cs]e|lawful force|acted in defence|defending myself/i.test(combined))
    return "Lawful force";
  if (input.hasWeapon ?? /weapon|knife|blade|implement|used a .* to/i.test(combined)) return "Act denial";
  if (input.hasIntoxication ?? /intoxicated|drunk|under the influence|alcohol|drugs at the time/i.test(combined))
    return "Recklessness challenge";

  // One punch + fall / mechanism -> intent denial + causation (e.g. single-punch GBH)
  const onePunch =
    /one punch|single punch|punched once|struck once|fell.*(head|kerb|ground)|hit.*head.*(kerb|ground)|laceration|fracture/i.test(
      combined
    );
  if (onePunch) return "Intent denial + Causation";

  return "Put to proof";
}

/** Primary strategy type used by strategy-commitment and strategy-analysis. */
export type PrimaryStrategyType = "fight_charge" | "charge_reduction" | "outcome_management";

/**
 * Map Phase 1 stance_detected string to PrimaryStrategyType.
 * Used by Strategy UI (pre-fill) and strategy-analysis (selectedRoute/artifacts when no commitment).
 */
export function mapStanceDetectedToPrimary(stance: string | null): PrimaryStrategyType | null {
  if (!stance || typeof stance !== "string") return null;
  const s = stance.trim();
  if (s === "Recklessness challenge") return "charge_reduction";
  if (["Intent denial + Causation", "Put to proof", "Act denial", "Lawful force"].includes(s)) return "fight_charge";
  return null;
}

/**
 * Infer procedural stage from disclosure state. If any critical or high item is missing,
 * we are not ready for plea. Uses same disclosure state as Safety.
 */
export function detectStageFromBundle(disclosureState: DisclosureState | null): string {
  if (!disclosureState?.missing_items?.length) return "Ready for plea";
  const hasCriticalOrHigh = disclosureState.missing_items.some(
    (m) => m.severity === "critical" || m.severity === "high"
  );
  return hasCriticalOrHigh ? "Disclosure outstanding – not ready for plea" : "Ready for plea";
}

/**
 * Run full Phase 1 detection. Call after extraction; persist result to criminal_cases.
 */
export function runPhase1Detection(input: {
  charges: ChargeLike[] | null | undefined;
  extracted?: unknown;
  keyFactsText?: string;
  mg5Snippet?: string;
  /** Extra bundle text (e.g. full MG5) so s.18 vs s.20 refinement sees punch/fall/kerb facts. */
  bundleTextForOffenceRefinement?: string;
  interviewStance?: string | null;
  disclosureState: DisclosureState | null;
  hasWeapon?: boolean;
  hasSelfDefenceLanguage?: boolean;
  hasIntoxication?: boolean;
}): Phase1DetectionResult {
  let { code, label } = detectOffenceFromBundle(input.charges, input.extracted);
  const factualForRefine = [
    input.keyFactsText ?? "",
    input.mg5Snippet ?? "",
    input.bundleTextForOffenceRefinement ?? "",
  ].join("\n\n");
  const refined = refineS18ToS20FromBundleFacts({
    offenceCode: code,
    offenceLabel: label,
    factualText: factualForRefine,
  });
  code = refined.code;
  label = refined.label;

  const stance = detectStanceFromBundle({
    keyFactsText: input.keyFactsText,
    mg5Snippet: input.mg5Snippet,
    interviewStance: input.interviewStance,
    hasWeapon: input.hasWeapon,
    hasSelfDefenceLanguage: input.hasSelfDefenceLanguage,
    hasIntoxication: input.hasIntoxication,
  });
  const stage = detectStageFromBundle(input.disclosureState);

  return {
    offenceCode: code,
    offenceLabel: label,
    stance,
    stage,
  };
}
