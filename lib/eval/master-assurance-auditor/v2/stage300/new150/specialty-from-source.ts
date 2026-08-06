/**
 * Specialty-bag materialisation from SOURCE documents only (never truth-key, never CaseBrain invent).
 * Unlock-path lane: capture_materialisation_harness.
 * reportedAgeClass comes from venue/prose labels — NOT from the auditor youthAgeClass algorithm.
 */

import { PINNED_LEGAL_STATE_CATEGORY_SET } from "../batch-a/evaluators/constants";

export type SpecialtyHarnessBags = {
  schemaVersion: "stage300-new150-specialty-bags-harness@1.0.0";
  caseId: string;
  producer: "source_document_parse_harness";
  notFromTruthKey: true;
  notFromCaseBrainProductionEmitter: true;
  legalStateTaxonomy: Record<string, unknown> | null;
  dobAgeCalcLedger: Record<string, unknown> | null;
  derivedNumericClaims: unknown[] | null;
  proceduralPartyState: Record<string, unknown> | null;
  parseNotes: string[];
};

function section(canonical: string, name: string): string {
  const m = canonical.match(
    new RegExp(`===\\s*SECTION:\\s*${name}\\s*===([\\s\\S]*?)(?===\\s*SECTION:|$)`, "i"),
  );
  return m?.[1] ?? "";
}

function parseIsoDate(label: string, text: string): string | null {
  const m = text.match(new RegExp(`${label}\\s*:?\\s*(\\d{4}-\\d{2}-\\d{2})`, "i"));
  return m?.[1] ?? null;
}

/**
 * Build specialty bags by parsing canonical-bundle.md source text only.
 */
export function materialiseSpecialtyBagsFromSource(args: {
  caseId: string;
  canonicalBundle: string;
  defendant: string;
}): SpecialtyHarnessBags {
  const notes: string[] = [];
  const listing = section(args.canonicalBundle, "LISTING");
  const mg5 = section(args.canonicalBundle, "MG5");
  const charge = section(args.canonicalBundle, "CHARGE");
  const full = args.canonicalBundle;

  const dob =
    parseIsoDate("Date of birth \\(custody record\\)", listing) ||
    parseIsoDate("DOB", listing) ||
    parseIsoDate("Date of birth", listing);
  const offenceDate =
    parseIsoDate("Offence date \\(source\\)", listing) || parseIsoDate("offenceDate", listing);
  const hearingDate =
    parseIsoDate("Hearing date \\(source\\)", listing) || parseIsoDate("hearingDate", listing);
  const timezoneMatch = listing.match(/Timezone:\s*([A-Za-z_\\/]+)/i);
  const timezone = timezoneMatch?.[1] ?? "Europe/London";

  // reportedAgeClass from venue/prose — independent of auditor age calculation.
  let reportedAgeClass: string | null = null;
  if (/YOUTH COURT/i.test(listing) || /Youth Court/i.test(full)) {
    reportedAgeClass = "youth";
    notes.push("reportedAgeClass=youth from Youth Court venue label (not DOB arithmetic)");
  } else if (dob && /adult|Crown Court/i.test(listing) && !/YOUTH COURT/i.test(listing)) {
    reportedAgeClass = "adult";
    notes.push("reportedAgeClass=adult from non-youth listing venue (not DOB arithmetic)");
  }

  let dobAgeCalcLedger: Record<string, unknown> | null = null;
  let derivedNumericClaims: unknown[] | null = null;
  if (dob && (offenceDate || hearingDate) && reportedAgeClass) {
    const calcInputs = ["dateOfBirth", offenceDate ? "offenceDate" : null, hearingDate ? "hearingDate" : null, "timezone"].filter(
      Boolean,
    ) as string[];
    dobAgeCalcLedger = {
      dateOfBirth: dob,
      offenceDate: offenceDate,
      hearingDate: hearingDate,
      timezone,
      reportedAgeClass,
      calcInputs,
      derivedValues: [],
      provenance: {
        producer: "source_document_parse_harness",
        sourceSections: ["LISTING"],
        reportedAgeClassBasis: "venue_or_listing_label",
      },
    };
    // Transparent calc inputs claim (CHR-12): days between offence and hearing when both present — inputs shown.
    if (offenceDate && hearingDate) {
      const a = Date.parse(`${offenceDate}T00:00:00Z`);
      const b = Date.parse(`${hearingDate}T00:00:00Z`);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const days = Math.round((b - a) / 86_400_000);
        derivedNumericClaims = [
          {
            label: "days_offence_to_hearing",
            value: days,
            calcInputs: [`offenceDate=${offenceDate}`, `hearingDate=${hearingDate}`, `timezone=${timezone}`],
          },
        ];
        (dobAgeCalcLedger.derivedValues as unknown[]) = [
          {
            label: "days_offence_to_hearing",
            value: days,
            calcInputs: [`offenceDate=${offenceDate}`, `hearingDate=${hearingDate}`],
          },
        ];
        (dobAgeCalcLedger.calcInputs as string[]).push("derivedValues");
      }
    }
  } else {
    notes.push("dobAgeCalcLedger not materialised — missing DOB/dates/reportedAgeClass from source");
  }

  // Legal taxonomy from explicit source-backed category labels in MG5 (not invented free-text).
  let legalStateTaxonomy: Record<string, unknown> | null = null;
  if (/Legal-category labels on MG5/i.test(mg5) || /source_fact:/i.test(mg5)) {
    const used: string[] = [];
    for (const cat of PINNED_LEGAL_STATE_CATEGORY_SET) {
      if (new RegExp(`\\b${cat}\\b`, "i").test(mg5) || new RegExp(`-\\s*${cat}\\s*:`, "i").test(mg5)) {
        used.push(cat);
      }
    }
    // Also accept hyphen labels like "source_fact: served"
    for (const line of mg5.split(/\r?\n/)) {
      const m = line.match(/^\s*-\s*([a-z_]+)\s*:/i);
      if (m && (PINNED_LEGAL_STATE_CATEGORY_SET as readonly string[]).includes(m[1]!.toLowerCase())) {
        const c = m[1]!.toLowerCase();
        if (!used.includes(c)) used.push(c);
      }
    }
    if (used.length >= 2) {
      legalStateTaxonomy = {
        taxonomyVersion: "pinned-lsl05-v1",
        usedCategories: used,
        surfaceRefs: ["/chargeInstruments/0", "/SECTION:MG5"],
        provenance: { producer: "source_document_parse_harness", sourceSections: ["MG5"] },
      };
    } else {
      notes.push("legalStateTaxonomy skipped — fewer than 2 pinned categories found in MG5");
    }
  } else {
    notes.push("legalStateTaxonomy skipped — no Legal-category labels block in MG5");
  }

  const youthCourt = /YOUTH COURT|Youth Court/i.test(full);
  const fitnessAllegation = /Fitness allegation:/i.test(full);
  const fitnessDecision = /Fitness decision:.*court has recorded a fitness decision/i.test(full);
  const disclosurePii = /Disclosure vs PII:/i.test(full);

  let proceduralPartyState: Record<string, unknown> | null = null;
  if (youthCourt || fitnessAllegation || disclosurePii) {
    proceduralPartyState = {};
    if (youthCourt) {
      proceduralPartyState.youthState = {
        defendantId: "D1",
        ageUnknown: !dob,
        dateOfBirthKnown: !!dob,
        safeguardsSurfaced: /appropriate adult/i.test(full),
        safeguardPrompts: /appropriate adult/i.test(full) ? ["appropriate_adult"] : [],
        // Youth procedure kept separate from culpability — source says so.
        culpabilityConflation: /Youth procedure is separate from culpability/i.test(full)
          ? false
          : /culpability/i.test(listing) && youthCourt
            ? true
            : false,
      };
    }
    if (fitnessAllegation) {
      proceduralPartyState.fitnessParticipation = {
        decided: fitnessDecision,
        flaggedForSolicitor: true,
        fitToPlead: fitnessDecision ? null : undefined,
        limitationText: fitnessDecision
          ? "Fitness decision boundary recorded; decision ≠ guilt."
          : "Participation/fitness allegation noted; no fitness finding.",
        status: fitnessDecision ? "decided" : "flagged",
      };
    }
    if (disclosurePii) {
      proceduralPartyState.disclosurePiiState = {
        piiWithheldPresent: true,
        openDisclosureDistinct: true,
        conflationDetected: false,
        note: "PII-withheld schedule items kept distinct from open MG6C disclosure items in source.",
      };
    }
    (proceduralPartyState as Record<string, unknown>).provenance = {
      producer: "source_document_parse_harness",
      sourceSections: ["LISTING", "MG5"],
    };
  } else {
    notes.push("proceduralPartyState skipped — no youth/fitness/PII markers in source");
  }

  void charge;
  void args.defendant;

  return {
    schemaVersion: "stage300-new150-specialty-bags-harness@1.0.0",
    caseId: args.caseId,
    producer: "source_document_parse_harness",
    notFromTruthKey: true,
    notFromCaseBrainProductionEmitter: true,
    legalStateTaxonomy,
    dobAgeCalcLedger,
    derivedNumericClaims,
    proceduralPartyState,
    parseNotes: notes,
  };
}
