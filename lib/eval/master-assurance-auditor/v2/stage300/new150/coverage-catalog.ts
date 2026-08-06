/**
 * Stratified 150-case catalog targeting the 43-control unlock path.
 * Parametric only — no case-ID production logic inside builders.
 */

import {
  NEW150_CORE_FAMILIES,
  NEW150_COVERAGE_TAGS,
  NEW150_TARGET,
  type New150CoreFamily,
  type New150CoverageTag,
} from "./constants";

const GIVEN = [
  "Avery", "Blair", "Casey", "Devon", "Ellis", "Finley", "Harper", "Indigo", "Jordan", "Kai",
  "Logan", "Morgan", "Noa", "Oakley", "Parker", "Quinn", "Reese", "Sawyer", "Tatum", "Valentine",
  "Winter", "Xander", "Yael", "Zion", "Arden", "Brook", "Cameron", "Dallas", "Emery", "Frankie",
];
const SURNAME = [
  "Ashcroft", "Bellamy", "Carrick", "Dunne", "Ellison", "Farrell", "Gresham", "Hadley", "Ingram", "Jowett",
  "Keane", "Larkin", "Merton", "Naylor", "Ormond", "Pritchard", "Quill", "Ralston", "Sutton", "Torrance",
  "Underwood", "Vickers", "Whitfield", "Yorke", "Alden", "Bristow", "Colton", "Drayton", "Everett", "Fenwick",
];

const FAMILY_OFFENCE: Record<
  New150CoreFamily,
  { offenceLine: string; theme: string; court: string }
> = {
  homicide_causation: {
    offenceLine: "Murder, contrary to common law",
    theme: "homicide and causation",
    court: "Crown Court at Northbridge",
  },
  violence_robbery_weapons: {
    offenceLine: "Robbery, contrary to section 8(1) of the Theft Act 1968",
    theme: "violence, robbery and weapons",
    court: "Crown Court at Westbridge",
  },
  firearms: {
    offenceLine:
      "Possession of a firearm with intent to endanger life, contrary to section 16 of the Firearms Act 1968",
    theme: "firearms",
    court: "Crown Court at Riverside",
  },
  sexual_abe: {
    offenceLine: "Rape, contrary to section 1 of the Sexual Offences Act 2003",
    theme: "sexual offences and ABE",
    court: "Crown Court at Silver Birch",
  },
  domestic_abuse: {
    offenceLine: "Controlling or coercive behaviour, contrary to section 76 of the Serious Crime Act 2015",
    theme: "domestic abuse",
    court: "Northgate Magistrates' Court",
  },
  youth_participation: {
    offenceLine: "Robbery, contrary to section 8(1) of the Theft Act 1968",
    theme: "youth procedure and effective participation",
    court: "Youth Court at Bryn Glas",
  },
  county_lines_nrm: {
    offenceLine:
      "Being concerned in the supply of a controlled drug of Class A, contrary to section 4(3)(b) of the Misuse of Drugs Act 1971",
    theme: "county lines, NRM and exploitation",
    court: "Crown Court at Ashgrove",
  },
  fraud_poca: {
    offenceLine: "Fraud by false representation, contrary to section 2 of the Fraud Act 2006",
    theme: "fraud and POCA",
    court: "Crown Court at Meridian",
  },
  digital_attribution: {
    offenceLine:
      "Sending a message that is grossly offensive, contrary to section 127(1) of the Communications Act 2003",
    theme: "digital/device/account/user attribution",
    court: "Northbridge Magistrates' Court",
  },
  identification_code_d: {
    offenceLine: "Robbery, contrary to section 8(1) of the Theft Act 1968",
    theme: "identification and Code D",
    court: "Crown Court at Canal Steps",
  },
  mental_health_fitness: {
    offenceLine: "Assault occasioning actual bodily harm, contrary to section 47 of the Offences Against the Person Act 1861",
    theme: "mental health and fitness to plead",
    court: "Crown Court at Orchard Quay",
  },
  disclosure_pii: {
    offenceLine: "Theft, contrary to section 1 of the Theft Act 1968",
    theme: "disclosure and PII boundaries",
    court: "Copper Lane Magistrates' Court",
  },
  road_traffic_fatal: {
    offenceLine: "Causing death by dangerous driving, contrary to section 1 of the Road Traffic Act 1988",
    theme: "fatal road traffic",
    court: "Crown Court at Ember Junction",
  },
  magistrates_procedure: {
    offenceLine: "Assault by beating, contrary to section 39 of the Criminal Justice Act 1988",
    theme: "magistrates' trial procedure",
    court: "Market House Magistrates' Court",
  },
  bail_remand: {
    offenceLine: "Burglary, contrary to section 9(1)(b) of the Theft Act 1968",
    theme: "bail and remand",
    court: "Crescent Wharf Magistrates' Court",
  },
  sentencing_newton: {
    offenceLine: "Possession with intent to supply a controlled drug of Class B, contrary to section 5(3) of the Misuse of Drugs Act 1971",
    theme: "sentencing and Newton hearing",
    court: "Crown Court at Hawthorn House",
  },
  appeals: {
    offenceLine: "Conviction appeal against sentence and conviction",
    theme: "appeals",
    court: "Court of Appeal (Criminal Division)",
  },
  multi_defendant_attribution: {
    offenceLine: "Conspiracy to rob, contrary to section 1 of the Criminal Law Act 1977",
    theme: "multi-defendant attribution",
    court: "Crown Court at Harbour Yard",
  },
};

/** Exact control IDs each coverage tag is designed to feed. */
export const TAG_CONTROL_TARGETS: Record<New150CoverageTag, string[]> = {
  ocr_binary_heavy: [
    "MAA2-SRC-07-REDACTION-DETECT",
    "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
    "MAA2-SRC-13-PASSWORD-CORRUPT",
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
  ],
  specialty_youth_dob: [
    "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
    "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
    "MAA2-PRC-03-YOUTH-STATE",
  ],
  specialty_fitness: ["MAA2-PRC-04-FITNESS-PARTICIPATION"],
  specialty_disclosure_pii: ["MAA2-PRC-07-DISCLOSURE-PII-STATE"],
  specialty_legal_taxonomy: ["MAA2-LSL-05-CATEGORY-SET-COVERAGE"],
  native_email_json_csv: [
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
  ],
  version_draft_pair: [
    "MAA2-VDR-01-SOURCE-CASE-HASHES",
    "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
    "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
    "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
    "MAA2-VDR-05-MODEL-PROMPT-VERSION",
    "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
    "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
    "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
    "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
    "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
    "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
    "MAA2-ELD-03-STALE-DRAFT-MARKING",
    "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
    "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
    "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
    "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
    "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
    "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
    "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
    "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
    "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
    "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
    "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
  ],
  audience_multi_pack_attempt: [
    "MAA2-AUD-02-CLIENT-PLAIN",
    "MAA2-AUD-03-COURT-PRECISE",
    "MAA2-AUD-04-CPS-SPECIFIC",
    "MAA2-AUD-05-SUPERVISOR-RISK",
    "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
    "MAA2-XPP-02-PROSECUTION-CHALLENGE",
    "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
    "MAA2-XPP-04-CLIENT-COMPREHENSION",
    "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
  ],
  multi_defendant: [],
  later_disclosure: [],
  amended_instrument: ["MAA2-LSL-05-CATEGORY-SET-COVERAGE"],
  chase_mixed_linkage: [],
  dense_bundle: [],
  recording_transcript_clip: [],
  conflicting_source: [],
};

export type New150CaseSpec = {
  sequence: number;
  caseId: string;
  family: New150CoreFamily;
  coverageTag: New150CoverageTag;
  targetedControlIds: string[];
  defendant: string;
  coDefendants: string[];
  urn: string;
  offenceLine: string;
  theme: string;
  court: string;
  hearingLine: string;
  timezone: string;
  instrumentStatus: "operative" | "amended" | "superseded";
  instrumentVersion: string;
  replacesPrior: boolean;
  /** Structured source facts intended for corpus design (not written into CaseBrain from truth). */
  sourceFacts: {
    dateOfBirth: string | null;
    offenceDate: string;
    hearingDate: string;
    youthCourt: boolean;
    fitnessAllegationPresent: boolean;
    fitnessDecisionPresent: boolean;
    disclosurePiiBoundaryPresent: boolean;
    legalCategoryLabelsPresent: boolean;
    ocrHeavy: boolean;
    passwordCorruptFlag: boolean;
    redactionMaskPresent: boolean;
    paginationDiscontinuity: boolean;
    attachmentAbsentRef: boolean;
    nativeFormats: boolean;
    versionDraftPair: boolean;
    audiencePackAttempt: boolean;
    chaseLinkedServed: boolean;
    chaseOutstanding: boolean;
  };
};

function pad(n: number): string {
  return n.toString().padStart(3, "0");
}

function assignTag(sequence: number): New150CoverageTag {
  // Weighted toward P0 specialty + OCR first, then P1 audiences/version, then remainder.
  const weighted: New150CoverageTag[] = [
    ...Array(30).fill("ocr_binary_heavy"),
    ...Array(15).fill("specialty_youth_dob"),
    ...Array(10).fill("specialty_fitness"),
    ...Array(10).fill("specialty_disclosure_pii"),
    ...Array(10).fill("specialty_legal_taxonomy"),
    ...Array(15).fill("version_draft_pair"),
    ...Array(12).fill("audience_multi_pack_attempt"),
    ...Array(8).fill("native_email_json_csv"),
    ...Array(8).fill("multi_defendant"),
    ...Array(8).fill("later_disclosure"),
    ...Array(8).fill("amended_instrument"),
    ...Array(6).fill("chase_mixed_linkage"),
    ...Array(5).fill("dense_bundle"),
    ...Array(3).fill("recording_transcript_clip"),
    ...Array(2).fill("conflicting_source"),
  ] as New150CoverageTag[];
  return weighted[(sequence - 1) % weighted.length]!;
}

export function buildNew150Catalog(limit: number = NEW150_TARGET): New150CaseSpec[] {
  const out: New150CaseSpec[] = [];
  for (let sequence = 1; sequence <= limit; sequence++) {
    const family = NEW150_CORE_FAMILIES[(sequence - 1) % NEW150_CORE_FAMILIES.length]!;
    const coverageTag = assignTag(sequence);
    const fo = FAMILY_OFFENCE[family];
    const defendant = `${GIVEN[(sequence - 1) % GIVEN.length]} ${SURNAME[(sequence * 3) % SURNAME.length]}`;
    const coDefendants =
      coverageTag === "multi_defendant" || family === "multi_defendant_attribution"
        ? [
            `${GIVEN[sequence % GIVEN.length]} ${SURNAME[(sequence * 5) % SURNAME.length]}`,
            `${GIVEN[(sequence + 7) % GIVEN.length]} ${SURNAME[(sequence * 7) % SURNAME.length]}`,
          ]
        : [];
    const youth = coverageTag === "specialty_youth_dob" || family === "youth_participation";
    const dob = youth
      ? `20${10 + (sequence % 6)}-${((sequence % 12) + 1).toString().padStart(2, "0")}-15`
      : coverageTag === "specialty_fitness"
        ? `19${70 + (sequence % 20)}-03-22`
        : sequence % 5 === 0
          ? `19${85 + (sequence % 10)}-07-01`
          : null;
    const offenceDate = `2026-0${(sequence % 6) + 1}-1${sequence % 9}`;
    const hearingDate = `2026-0${Math.min(9, (sequence % 6) + 4)}-2${sequence % 8}`;
    const amended = coverageTag === "amended_instrument";
    const caseId = `s300-n150-${pad(sequence)}-${family.replace(/_/g, "-")}-${coverageTag.replace(/_/g, "-")}`;

    out.push({
      sequence,
      caseId,
      family,
      coverageTag,
      targetedControlIds: [...TAG_CONTROL_TARGETS[coverageTag]],
      defendant,
      coDefendants,
      urn: `01AB${(1000000 + sequence * 17).toString().slice(0, 7)}26`,
      offenceLine: fo.offenceLine,
      theme: fo.theme,
      court: youth ? "Youth Court at Bryn Glas" : fo.court,
      hearingLine: `Next hearing: ${hearingDate} at ${youth ? "Youth Court at Bryn Glas" : fo.court} (Europe/London).`,
      timezone: "Europe/London",
      instrumentStatus: amended ? "amended" : "operative",
      instrumentVersion: amended ? "2" : "1",
      replacesPrior: amended,
      sourceFacts: {
        dateOfBirth: dob,
        offenceDate,
        hearingDate,
        youthCourt: youth,
        fitnessAllegationPresent: coverageTag === "specialty_fitness" || family === "mental_health_fitness",
        fitnessDecisionPresent: coverageTag === "specialty_fitness",
        disclosurePiiBoundaryPresent:
          coverageTag === "specialty_disclosure_pii" || family === "disclosure_pii",
        legalCategoryLabelsPresent:
          coverageTag === "specialty_legal_taxonomy" || coverageTag === "amended_instrument",
        ocrHeavy: coverageTag === "ocr_binary_heavy" || coverageTag === "native_email_json_csv",
        passwordCorruptFlag: coverageTag === "ocr_binary_heavy" && sequence % 5 === 0,
        redactionMaskPresent: coverageTag === "ocr_binary_heavy" && sequence % 3 === 0,
        paginationDiscontinuity: coverageTag === "ocr_binary_heavy" && sequence % 4 === 0,
        attachmentAbsentRef: coverageTag === "ocr_binary_heavy" || coverageTag === "native_email_json_csv",
        nativeFormats: coverageTag === "native_email_json_csv",
        versionDraftPair: coverageTag === "version_draft_pair",
        audiencePackAttempt: coverageTag === "audience_multi_pack_attempt",
        chaseLinkedServed: coverageTag === "chase_mixed_linkage" || sequence % 2 === 0,
        chaseOutstanding: true, // honest outstanding always present; linked served is additional
      },
    });
  }
  return out;
}

export function coverageMatrixFromCatalog(catalog: New150CaseSpec[]) {
  const byTag: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  const controlDesignHits: Record<string, number> = {};
  for (const c of catalog) {
    byTag[c.coverageTag] = (byTag[c.coverageTag] ?? 0) + 1;
    byFamily[c.family] = (byFamily[c.family] ?? 0) + 1;
    for (const id of c.targetedControlIds) {
      controlDesignHits[id] = (controlDesignHits[id] ?? 0) + 1;
    }
  }
  return {
    total: catalog.length,
    byTag,
    byFamily,
    controlDesignHits,
    tagsPresent: NEW150_COVERAGE_TAGS.filter((t) => (byTag[t] ?? 0) > 0),
    familiesPresent: NEW150_CORE_FAMILIES.filter((f) => (byFamily[f] ?? 0) > 0),
  };
}
