/**
 * Fixture bags for Batch-A six-evaluator contracts.
 * Prove behaviour only — never counted as corpus calibration.
 */

import { PINNED_LEGAL_STATE_CATEGORY_SET } from "./constants";

export function fixtureLsl05Positive(): Record<string, unknown> {
  return {
    legalStateTaxonomy: {
      taxonomyVersion: "pinned-lsl05-v1",
      usedCategories: [
        "source_fact",
        "allegation",
        "prosecution_position",
        "defence_position",
        "unresolved_question",
      ],
      surfaceRefs: ["/chargeInstruments/0"],
    },
  };
}

export function fixtureLsl05NegativeTruncated(): Record<string, unknown> {
  return {
    legalStateTaxonomy: {
      taxonomyVersion: "pinned-lsl05-v1",
      usedCategories: ["fact", "opinion"],
      surfaceRefs: ["/courtNote/text"],
    },
  };
}

export function fixtureLsl05NegativeSourceFactInferenceOnly(): Record<string, unknown> {
  return {
    legalStateTaxonomy: {
      taxonomyVersion: "pinned-lsl05-v1",
      usedCategories: ["source_fact", "inference"],
      surfaceRefs: ["/composed_prose"],
    },
  };
}

export function fixtureLsl05AmbiguousUnknownLabel(): Record<string, unknown> {
  return {
    legalStateTaxonomy: {
      taxonomyVersion: "pinned-lsl05-v1",
      usedCategories: ["source_fact", "made_up_category"],
      surfaceRefs: ["/x"],
    },
  };
}

export function fixtureLsl05UnavailableCourtProse(): Record<string, unknown> {
  return {
    courtNote: { text: "This is an allegation of theft.", sendabilityLabel: "x", canCopy: true },
    chargeInstruments: [
      {
        instrumentId: "i1",
        instrumentType: "MG5",
        exactWording: "Theft",
        count: 1,
        defendantAllocation: "D1",
        sourceDocument: "mg5.pdf",
        sourcePage: "1",
        pageIdentityKnown: true,
        status: "operative",
        version: "1",
      },
    ],
  };
}

export function fixtureChr06Positive(): Record<string, unknown> {
  return {
    dobAgeCalcLedger: {
      dateOfBirth: "2010-06-01",
      offenceDate: "2026-01-15",
      hearingDate: "2026-08-18",
      reportedAgeClass: "youth",
      calcInputs: ["dateOfBirth", "offenceDate"],
    },
  };
}

export function fixtureChr06NegativeWrongClass(): Record<string, unknown> {
  return {
    dobAgeCalcLedger: {
      dateOfBirth: "2010-06-01",
      offenceDate: "2026-01-15",
      hearingDate: "2026-08-18",
      reportedAgeClass: "adult",
      calcInputs: ["dateOfBirth", "offenceDate"],
    },
  };
}

export function fixtureChr06NegativeAdultAsYouth(): Record<string, unknown> {
  return {
    dobAgeCalcLedger: {
      dateOfBirth: "1990-01-01",
      offenceDate: "2026-01-15",
      reportedAgeClass: "youth",
      calcInputs: ["dateOfBirth", "offenceDate"],
    },
  };
}

export function fixtureChr06UnresolvedNoDob(): Record<string, unknown> {
  return {
    dobAgeCalcLedger: {
      dateOfBirth: null,
      offenceDate: "2026-01-15",
      reportedAgeClass: "adult",
    },
  };
}

export function fixtureChr06UnavailableChronologyOnly(): Record<string, unknown> {
  return {
    chronologyEvents: [
      {
        eventId: "ev-1",
        eventType: "hearing",
        timestamp: "2026-08-18T10:00:00Z",
        timezone: "Europe/London",
        source: "listing",
        confidence: "high",
      },
    ],
    courtNote: { text: "DOB 1 June 2010", sendabilityLabel: "x", canCopy: true },
  };
}

export function fixtureChr12Positive(): Record<string, unknown> {
  return {
    derivedNumericClaims: [
      {
        label: "days_since_offence",
        value: 214,
        calcInputs: ["offenceDate=2026-01-15", "asOf=2026-08-18"],
      },
    ],
  };
}

export function fixtureChr12NegativeOpaque(): Record<string, unknown> {
  return {
    derivedNumericClaims: [{ label: "risk_score", value: 0.82, calcInputs: [] }],
  };
}

export function fixtureChr12NegativeMissingInputs(): Record<string, unknown> {
  return {
    dobAgeCalcLedger: {
      derivedValues: [{ label: "age_years", value: 15 }],
      calcInputs: [],
    },
  };
}

export function fixtureChr12AmbiguousUnresolvedInputs(): Record<string, unknown> {
  return {
    derivedNumericClaims: [
      {
        label: "age_years",
        value: 15,
        calcInputs: ["dob=unknown"],
        calcInputsUnresolved: true,
      },
    ],
  };
}

export function fixtureChr12Unavailable(): Record<string, unknown> {
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    chronologyEvents: [],
  };
}

export function fixturePrc03Positive(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      youthState: {
        defendantId: "D1",
        ageUnknown: false,
        dateOfBirthKnown: true,
        safeguardsSurfaced: true,
        safeguardPrompts: ["appropriate_adult"],
        culpabilityConflation: false,
      },
    },
  };
}

export function fixturePrc03NegativeConflation(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      youthState: {
        defendantId: "D1",
        ageUnknown: false,
        safeguardsSurfaced: true,
        safeguardPrompts: ["appropriate_adult"],
        culpabilityConflation: true,
      },
    },
  };
}

export function fixturePrc03CrossDefendant(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      youthState: {
        defendantId: "D2",
        ageUnknown: false,
        safeguardsSurfaced: true,
        safeguardPrompts: ["youth_court"],
        culpabilityConflation: true,
      },
    },
  };
}

export function fixturePrc03UnresolvedAgeUnknown(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      youthState: {
        defendantId: "D1",
        ageUnknown: true,
        dateOfBirthKnown: false,
        safeguardsSurfaced: true,
        safeguardPrompts: ["appropriate_adult"],
        culpabilityConflation: false,
      },
    },
  };
}

export function fixturePrc03Unavailable(): Record<string, unknown> {
  return { chargeInstruments: [{ instrumentId: "i1", defendantAllocation: "D1" }] };
}

export function fixturePrc04Positive(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      fitnessParticipation: {
        decided: false,
        flaggedForSolicitor: true,
        limitationText: "Participation cues noted; no fitness finding.",
        status: "flagged",
      },
    },
  };
}

export function fixturePrc04NegativeDecided(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      fitnessParticipation: {
        decided: true,
        fitToPlead: true,
        limitationText: null,
        status: "decided",
      },
    },
  };
}

export function fixturePrc04NegativeFitToPleadBoolean(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      fitnessParticipation: {
        decided: false,
        fitToPlead: false,
        status: "decided",
      },
    },
  };
}

export function fixturePrc04Unresolved(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      fitnessParticipation: {
        decided: false,
        status: "unresolved",
        limitationText: "Cues present",
      },
    },
  };
}

export function fixturePrc04Unavailable(): Record<string, unknown> {
  return { proceduralPartyState: { youthState: { defendantId: "D1", culpabilityConflation: false } } };
}

export function fixturePrc07Positive(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      disclosurePiiState: {
        disclosureState: "partial_served",
        piiState: "redactions_present",
        conflated: false,
      },
    },
  };
}

export function fixturePrc07NegativeConflated(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      disclosurePiiState: {
        disclosureState: "complete",
        piiState: "redactions_present",
        conflated: true,
        piiCountedAsDisclosureServed: true,
      },
    },
  };
}

export function fixturePrc07NegativePiiCountedAsServed(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      disclosurePiiState: {
        disclosureState: "served",
        piiState: "redacted",
        conflated: false,
        piiCountedAsDisclosureServed: true,
      },
    },
  };
}

export function fixturePrc07AmbiguousIncomplete(): Record<string, unknown> {
  return {
    proceduralPartyState: {
      disclosurePiiState: {
        disclosureState: "partial",
        piiState: null,
        conflated: false,
      },
    },
  };
}

export function fixturePrc07Unavailable(): Record<string, unknown> {
  return { warningsAndGaps: { chaseItems: [], doNotOverstate: [] } };
}

export function fixturePinnedCategoryCount(): number {
  return PINNED_LEGAL_STATE_CATEGORY_SET.length;
}
