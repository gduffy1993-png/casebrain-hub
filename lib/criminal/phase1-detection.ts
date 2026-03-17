/**
 * Phase 1 detection: evidence-driven offence, stance, and procedural stage from the bundle.
 * Acknowledges every case (uses charge text when offence is unknown). No manual pickers.
 */

import { detectOffence } from "./offence-elements";
import type { DisclosureState } from "./disclosure-state";

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
  interviewStance?: string | null;
  disclosureState: DisclosureState | null;
  hasWeapon?: boolean;
  hasSelfDefenceLanguage?: boolean;
  hasIntoxication?: boolean;
}): Phase1DetectionResult {
  const { code, label } = detectOffenceFromBundle(input.charges, input.extracted);
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
