/**
 * Offence Elements Library
 * 
 * Deterministic offence detection and element mapping.
 * No predictions, no invented strategies - only canonical element definitions.
 */

export type OffenceCode = "s18_oapa" | "s20_oapa" | "unknown";

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
  }

  return getUnknownDef();
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
 * Unknown offence fallback
 * 
 * Elements:
 * - identification
 * - actus_reus
 * - injury
 * - mental_state
 * - causation
 */
function getUnknownDef(): OffenceDef {
  return {
    code: "unknown",
    label: "Unknown Offence",
    elements: [
      {
        id: "identification",
        label: "Identification",
      },
      {
        id: "actus_reus",
        label: "Actus Reus",
      },
      {
        id: "injury",
        label: "Injury",
      },
      {
        id: "mental_state",
        label: "Mental State",
      },
      {
        id: "causation",
        label: "Causation",
      },
    ],
  };
}
