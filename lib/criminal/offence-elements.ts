/**
 * Offence Elements Library
 * 
 * Deterministic offence detection and element mapping.
 * No predictions, no invented strategies - only canonical element definitions.
 */

export type OffenceCode =
  | "s18_oapa"
  | "s20_oapa"
  | "s47_oapa"
  | "common_assault"
  | "criminal_damage_arson"
  | "theft"
  | "burglary"
  | "robbery"
  | "fraud"
  | "unknown";

export type OffenceElement = {
  id: string;
  label: string;
};

export type OffenceDef = {
  code: OffenceCode;
  label: string;
  elements: OffenceElement[];
};

/**
 * Detect offence from charges and extracted data
 */
export function detectOffence(
  charges?: any,
  extracted?: any
): OffenceDef {
  // Check charges first
  if (charges && Array.isArray(charges) && charges.length > 0) {
    const firstCharge = charges[0];
    const section = (firstCharge.section || "").toLowerCase();
    const offence = (firstCharge.offence || "").toLowerCase();

    // s18 OAPA
    if (
      section.includes("s18") ||
      section.includes("section 18") ||
      offence.includes("wounding with intent") ||
      offence.includes("grievous bodily harm with intent") ||
      offence.includes("gbh with intent")
    ) {
      return getS18Def();
    }

    // s20 OAPA
    if (
      section.includes("s20") ||
      section.includes("section 20") ||
      offence.includes("unlawful wounding") ||
      offence.includes("inflicting gbh") ||
      offence.includes("inflicting grievous bodily harm")
    ) {
      return getS20Def();
    }

    // Robbery (Theft Act s.8) — check before theft
    if (
      section.includes("s8") ||
      section.includes("section 8") ||
      offence.includes("robbery")
    ) {
      return getRobberyDef();
    }

    // Burglary (Theft Act s.9)
    if (
      section.includes("s9") ||
      section.includes("section 9") ||
      offence.includes("burglary")
    ) {
      return getBurglaryDef();
    }

    // Theft (Theft Act 1968 s.1)
    if (offence.includes("theft")) {
      return getTheftDef();
    }

    // Fraud (Fraud Act 2006)
    if (
      section.includes("fraud") ||
      section.includes("s1") && offence.includes("fraud") ||
      section.includes("s2") ||
      section.includes("s3") ||
      section.includes("s4") ||
      offence.includes("fraud by") ||
      offence.includes("fraudulent")
    ) {
      return getFraudDef();
    }

    // Criminal damage / arson (s.1(1) or s.1(3) CDA 1971)
    if (
      section.includes("cda") ||
      section.includes("criminal damage") ||
      section.includes("1(1)") ||
      section.includes("1(3)") ||
      offence.includes("arson") ||
      offence.includes("criminal damage") ||
      offence.includes("damage by fire")
    ) {
      return getCriminalDamageArsonDef();
    }

    // s47 OAPA - ABH (assault occasioning actual bodily harm)
    if (
      section.includes("s47") ||
      section.includes("section 47") ||
      offence.includes("actual bodily harm") ||
      offence.includes("abh") && !offence.includes("gbh")
    ) {
      return getS47Def();
    }

    // Common assault / battery (s.39 CJA 1988 or common law)
    if (
      section.includes("s39") ||
      section.includes("section 39") ||
      offence.includes("common assault") ||
      offence.includes("assault by beating") ||
      (offence.includes("assault") && !offence.includes("actual") && !offence.includes("bodily") && !offence.includes("gbh") && !offence.includes("wound"))
    ) {
      return getCommonAssaultDef();
    }
  }

  // Check extracted data as fallback
  if (extracted) {
    const extractedStr = JSON.stringify(extracted).toLowerCase();
    
    if (
      extractedStr.includes("s18") ||
      extractedStr.includes("section 18") ||
      extractedStr.includes("wounding with intent") ||
      extractedStr.includes("gbh with intent")
    ) {
      return getS18Def();
    }

    if (
      extractedStr.includes("s20") ||
      extractedStr.includes("section 20") ||
      extractedStr.includes("unlawful wounding") ||
      extractedStr.includes("inflicting gbh")
    ) {
      return getS20Def();
    }

    if (
      extractedStr.includes("arson") ||
      extractedStr.includes("criminal damage") ||
      extractedStr.includes("cda") ||
      extractedStr.includes("damage by fire") ||
      extractedStr.includes("s.1(1)") ||
      extractedStr.includes("s.1(3)")
    ) {
      return getCriminalDamageArsonDef();
    }

    if (extractedStr.includes("robbery")) return getRobberyDef();
    if (extractedStr.includes("burglary")) return getBurglaryDef();
    if (extractedStr.includes("theft")) return getTheftDef();
    if (extractedStr.includes("fraud")) return getFraudDef();
    if (extractedStr.includes("actual bodily harm") || extractedStr.includes("abh")) return getS47Def();
    if (extractedStr.includes("common assault") || extractedStr.includes("assault by beating")) return getCommonAssaultDef();
  }

  return getUnknownDef(charges?.[0]?.offence);
}

/**
 * s18 OAPA - Wounding with Intent / GBH with Intent
 * 
 * Elements:
 * - injury_threshold (wound/GBH)
 * - causation
 * - unlawfulness
 * - identification
 * - specific_intent
 */
function getS18Def(): OffenceDef {
  return {
    code: "s18_oapa",
    label: "s.18 OAPA 1861 - Wounding with Intent / GBH with Intent",
    elements: [
      {
        id: "injury_threshold",
        label: "Injury Threshold (Wound/GBH)",
      },
      {
        id: "causation",
        label: "Causation",
      },
      {
        id: "unlawfulness",
        label: "Unlawfulness",
      },
      {
        id: "identification",
        label: "Identification",
      },
      {
        id: "specific_intent",
        label: "Specific Intent (s18)",
      },
    ],
  };
}

/**
 * s20 OAPA - Unlawful Wounding / Inflicting GBH
 * 
 * Elements:
 * - injury_threshold (wound/GBH)
 * - causation
 * - unlawfulness
 * - identification
 * - recklessness
 */
function getS20Def(): OffenceDef {
  return {
    code: "s20_oapa",
    label: "s.20 OAPA 1861 - Unlawful Wounding / Inflicting GBH",
    elements: [
      {
        id: "injury_threshold",
        label: "Injury Threshold (Wound/GBH)",
      },
      {
        id: "causation",
        label: "Causation",
      },
      {
        id: "unlawfulness",
        label: "Unlawfulness",
      },
      {
        id: "identification",
        label: "Identification",
      },
      {
        id: "recklessness",
        label: "Recklessness (s20)",
      },
    ],
  };
}

/**
 * Criminal damage / Arson (s.1(1) and s.1(3) CDA 1971)
 *
 * Elements:
 * - property_belonging_to_another
 * - damage_by_fire (actus reus)
 * - intent_or_recklessness
 * - lawful_excuse (s.5 CDA)
 * - identification
 */
function getCriminalDamageArsonDef(): OffenceDef {
  return {
    code: "criminal_damage_arson",
    label: "Criminal damage / Arson (s.1(1) CDA 1971)",
    elements: [
      { id: "property_belonging_to_another", label: "Property belonging to another" },
      { id: "damage_by_fire", label: "Damage/Destruction by fire" },
      { id: "intent_or_recklessness", label: "Intent or recklessness" },
      { id: "lawful_excuse", label: "Lawful excuse (s.5 CDA)" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * Theft (Theft Act 1968 s.1)
 * Elements: appropriation, property belonging to another, dishonesty, intention to permanently deprive
 */
function getTheftDef(): OffenceDef {
  return {
    code: "theft",
    label: "Theft (s.1 Theft Act 1968)",
    elements: [
      { id: "appropriation", label: "Appropriation" },
      { id: "property_belonging_to_another", label: "Property belonging to another" },
      { id: "dishonesty", label: "Dishonesty" },
      { id: "intention_to_permanently_deprive", label: "Intention to permanently deprive" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * Burglary (Theft Act 1968 s.9(1)(a) or (b))
 * Elements: entry, building/part of building, trespass, intent or ulterior offence
 */
function getBurglaryDef(): OffenceDef {
  return {
    code: "burglary",
    label: "Burglary (s.9 Theft Act 1968)",
    elements: [
      { id: "entry", label: "Entry as trespasser" },
      { id: "building_or_part", label: "Building or part of a building" },
      { id: "intent_or_ulterior", label: "Intent to steal/damage/commit GBH or ulterior offence" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * Robbery (Theft Act 1968 s.8)
 * Elements: theft, force or threat of force, immediately before or at the time of theft
 */
function getRobberyDef(): OffenceDef {
  return {
    code: "robbery",
    label: "Robbery (s.8 Theft Act 1968)",
    elements: [
      { id: "theft", label: "Theft (all elements)" },
      { id: "force_or_threat", label: "Force or threat of force" },
      { id: "timing", label: "Immediately before or at the time of theft" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * Fraud (Fraud Act 2006 – s.1, 2, 3 or 4)
 * Elements: dishonesty, (false representation / failure to disclose / abuse of position), gain/loss
 */
function getFraudDef(): OffenceDef {
  return {
    code: "fraud",
    label: "Fraud (Fraud Act 2006)",
    elements: [
      { id: "dishonesty", label: "Dishonesty" },
      { id: "representation_or_disclosure_or_abuse", label: "False representation / failure to disclose / abuse of position" },
      { id: "gain_or_loss", label: "Gain or loss (or intent)" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * s47 OAPA – Assault occasioning actual bodily harm
 * Elements: assault/battery, ABH, causation
 */
function getS47Def(): OffenceDef {
  return {
    code: "s47_oapa",
    label: "s.47 OAPA 1861 - Assault occasioning ABH",
    elements: [
      { id: "assault_or_battery", label: "Assault or battery" },
      { id: "actual_bodily_harm", label: "Actual bodily harm" },
      { id: "causation", label: "Causation" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * Common assault / battery (s.39 CJA 1988 or common law)
 * Elements: assault or battery, no need for injury
 */
function getCommonAssaultDef(): OffenceDef {
  return {
    code: "common_assault",
    label: "Common assault / Battery (s.39 CJA 1988)",
    elements: [
      { id: "assault_or_battery", label: "Assault or battery" },
      { id: "identification", label: "Identification" },
    ],
  };
}

/**
 * Unknown offence fallback — used when charge does not match any defined type.
 * Label uses charge description when available.
 */
function getUnknownDef(chargeLabel?: string): OffenceDef {
  const label =
    typeof chargeLabel === "string" && chargeLabel.trim().length > 0
      ? chargeLabel.trim()
      : "Unknown Offence";
  return {
    code: "unknown",
    label,
    elements: [
      { id: "identification", label: "Identification" },
      { id: "actus_reus", label: "Actus Reus" },
      { id: "mental_state", label: "Mental State" },
      { id: "causation", label: "Causation" },
    ],
  };
}
