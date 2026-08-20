/**
 * Re-home valuable orphaned strategy-fight-engine templates as labelled
 * PRACTITIONER_CONSIDERATION hypotheses — filtered by source families.
 * Does not replace canonical chase.
 */

import type { AdvisoryConsideration } from "./types";

const SURFACES = [
  "overview",
  "court",
  "papers",
  "file",
  "hearing_mode",
  "export",
] as const;

function n(s: string | undefined | null): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type FightEngineAdvisoryInput = {
  allegation?: string;
  bundleText?: string;
  establishedFamilies?: string[];
};

/**
 * Emit a small set of high-value fight-map considerations when source/canonical
 * families support them. Stock CCTV/VIPER/MG6C templates are never emitted as
 * outstanding facts from offence shape alone.
 */
export function buildFightEngineAdvisoryConsiderations(
  input: FightEngineAdvisoryInput,
): AdvisoryConsideration[] {
  const bundle = n(input.bundleText);
  const charge = n(input.allegation);
  const families = new Set((input.establishedFamilies ?? []).map((f) => n(f)));
  const out: AdvisoryConsideration[] = [];

  const hasIdIssue =
    /\bidentif|turnbull|viper|wrong person|recognition\b/.test(bundle) ||
    families.has("identification");
  if (hasIdIssue) {
    out.push({
      id: "fight:identification-attack-path",
      what: "Consider an identification attack path (Turnbull / procedure / recognition conditions) keyed to served ID material.",
      why: "Historical fight-engine templates treat identification as a primary collapse route when ID is in issue — restored as hypothesis, not evidence inventing.",
      canonicalTriggers: ["source:identification_or_procedure"],
      provenance: ["strategy_fight_engine_advisory", "historical:attack_path_identification"],
      scope: "source_specific",
      mustConfirmBeforeFactualLanguage: [
        "Served ID procedure / VIPER / recognition evidence",
      ],
      supportClass: "PRACTITIONER_CONSIDERATION",
      allowedSurfaces: [...SURFACES],
      category: "identification",
      confidence: "medium",
      recoverySource: "strategy_fight_engine_advisory",
    });
  }

  const hasPace =
    /\bpace\b|\bcustody\b|\bcaution\b|\bappropriate adult\b/.test(bundle) ||
    families.has("custody") ||
    families.has("pace");
  if (hasPace) {
    out.push({
      id: "fight:pace-safeguards-path",
      what: "Consider PACE / custody safeguard attack paths where custody or interview process material is in the papers.",
      why: "Orphaned fight-engine PACE templates remain useful when custody/interview process is source-backed — never invent interview recording from custody alone.",
      canonicalTriggers: ["source:custody_or_pace"],
      provenance: ["strategy_fight_engine_advisory", "historical:attack_path_pace"],
      scope: "source_specific",
      mustConfirmBeforeFactualLanguage: [
        "Which PACE/custody products are served vs outstanding",
        "Do not treat custody extract as interview recording",
      ],
      supportClass: "PRACTITIONER_CONSIDERATION",
      allowedSurfaces: [...SURFACES],
      category: "interview",
      confidence: "medium",
      recoverySource: "strategy_fight_engine_advisory",
    });
  }

  const hasMedical =
    /\bmedical\b|\binjury\b|\bcausation\b|\bhospital\b/.test(bundle) ||
    families.has("medical");
  if (hasMedical) {
    out.push({
      id: "fight:medical-causation-path",
      what: "Consider medical / causation attack paths where injury or medical material is source-backed.",
      why: "Fight-engine medical templates are restored only when papers engage injury/medical — not from offence shape alone.",
      canonicalTriggers: ["source:medical_or_injury"],
      provenance: ["strategy_fight_engine_advisory", "historical:attack_path_medical"],
      scope: "source_specific",
      mustConfirmBeforeFactualLanguage: ["Served medical / injury product status"],
      supportClass: "PRACTITIONER_CONSIDERATION",
      allowedSurfaces: [...SURFACES],
      category: "medical",
      confidence: "medium",
      recoverySource: "strategy_fight_engine_advisory",
    });
  }

  // Disclosure request pack as advisory (never auto-chase)
  if (/\bmg6|unused|schedule|disclosure\b/.test(bundle) || /\bdisclosure\b/.test(charge)) {
    out.push({
      id: "fight:disclosure-request-pack",
      what: "Consider a structured disclosure request pack for unused / scheduled material that is source-referenced but not yet served.",
      why: "Historical disclosure-pack generators are useful as solicitor planning tools; they must not auto-create CPS chase rows.",
      canonicalTriggers: ["source:disclosure_or_schedule"],
      provenance: ["strategy_fight_engine_advisory", "historical:disclosure_request_pack"],
      scope: "source_specific",
      mustConfirmBeforeFactualLanguage: [
        "Each chase line must pass chase-source-gate against bundle text",
      ],
      supportClass: "PRACTITIONER_CONSIDERATION",
      allowedSurfaces: [...SURFACES],
      category: "disclosure",
      confidence: "medium",
      recoverySource: "strategy_fight_engine_advisory",
    });
  }

  return out;
}
