/**
 * Stratified 120-packet coverage catalog — shared parametric rules only (no case-ID logic).
 */

import {
  BATCH10_CORE_FAMILIES,
  BATCH10_FORMAT_VARIANTS,
  BATCH10_COHORT_B_TARGET,
  type Batch10CoreFamily,
  type Batch10FormatVariant,
} from "./constants";

const GIVEN = [
  "Avery", "Blair", "Casey", "Devon", "Ellis", "Finley", "Harper", "Indigo", "Jordan", "Kai",
  "Logan", "Morgan", "Noa", "Oakley", "Parker", "Quinn", "Reese", "Sawyer", "Tatum", "Valentine",
  "Winter", "Xander", "Yael", "Zion", "Arden", "Brook", "Cameron", "Dallas", "Emery", "Frankie",
];
const FAMILY_NAME = [
  "Ashcroft", "Bellamy", "Carrick", "Dunne", "Ellison", "Farrell", "Gresham", "Hadley", "Ingram", "Jowett",
  "Keane", "Larkin", "Merton", "Naylor", "Ormond", "Pritchard", "Quill", "Ralston", "Sutton", "Torrance",
  "Underwood", "Vickers", "Whitfield", "Yorke", "Alden", "Bristow", "Colton", "Drayton", "Everett", "Fenwick",
];

const FAMILY_OFFENCE: Record<
  Batch10CoreFamily,
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
    offenceLine: "Arson, contrary to section 1(1) and (3) of the Criminal Damage Act 1971",
    theme: "mental health, fitness and disposal",
    court: "Crown Court at Orchard Quay",
  },
  disclosure_pii: {
    offenceLine: "Blackmail, contrary to section 21 of the Theft Act 1968",
    theme: "disclosure, unused material and PII",
    court: "Crown Court at Copper Lane",
  },
  road_traffic_fatal: {
    offenceLine:
      "Causing death by dangerous driving, contrary to section 1 of the Road Traffic Act 1988",
    theme: "road traffic and fatal driving",
    court: "Crown Court at Ember Junction",
  },
  magistrates_procedure: {
    offenceLine: "Common assault, contrary to section 39 of the Criminal Justice Act 1988",
    theme: "Magistrates' Court procedure",
    court: "Market House Magistrates' Court",
  },
  bail_remand: {
    offenceLine: "Burglary, contrary to section 9(1)(b) of the Theft Act 1968",
    theme: "bail and remand",
    court: "Crescent Wharf Magistrates' Court",
  },
  sentencing_newton: {
    offenceLine: "Cruelty to a person under 16, contrary to section 1 of the Children and Young Persons Act 1933",
    theme: "sentencing and Newton hearings",
    court: "Crown Court at Hawthorn House",
  },
  appeals: {
    offenceLine: "Perverting the course of public justice, contrary to common law",
    theme: "appeals",
    court: "Court of Appeal (Criminal Division)",
  },
  multi_defendant_attribution: {
    offenceLine: "Conspiracy to rob, contrary to section 1(1) of the Criminal Law Act 1977",
    theme: "multi-defendant and attribution conflicts",
    court: "Crown Court at Harbour Yard",
  },
};

export type Deficit120CaseSpec = {
  caseId: string;
  sequence: number;
  family: Batch10CoreFamily;
  variant: Batch10FormatVariant;
  defendant: string;
  urn: string;
  court: string;
  offenceLine: string;
  theme: string;
  instrumentStatus: "operative" | "amended" | "superseded" | "unresolved";
  instrumentVersion: string;
  replacesPrior: boolean;
  timezone: string;
  hearingLine: string;
  formatNotes: string[];
  complexity: "low" | "medium" | "high";
  procedureTrack: string;
  evidenceFocus: string;
};

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

/** Build exactly 120 stratified specs — deterministic, no case-ID branching in builders. */
export function buildDeficit120Catalog(): Deficit120CaseSpec[] {
  const out: Deficit120CaseSpec[] = [];
  let seq = 0;
  for (const family of BATCH10_CORE_FAMILIES) {
    for (const variant of BATCH10_FORMAT_VARIANTS) {
      if (out.length >= BATCH10_COHORT_B_TARGET) break;
      seq += 1;
      const fo = FAMILY_OFFENCE[family];
      const defendant = `${GIVEN[(seq - 1) % GIVEN.length]} ${FAMILY_NAME[(seq - 1) % FAMILY_NAME.length]}`;
      const amended = variant === "amended_document";
      const competing = variant === "competing_chrono";
      out.push({
        caseId: `s150-d120-${pad(seq)}-${family.replace(/_/g, "-")}-${variant.replace(/_/g, "-")}`,
        sequence: seq,
        family,
        variant,
        defendant,
        urn: `26/S150/${pad(seq)}`,
        court: fo.court,
        offenceLine: fo.offenceLine,
        theme: fo.theme,
        instrumentStatus: amended ? "amended" : "operative",
        instrumentVersion: amended ? "2" : "1",
        replacesPrior: amended,
        timezone: "Europe/London",
        hearingLine: competing
          ? `PTPH listed — 18 August 2026, 10:00 ${"Europe/London"}; listing clerk note records 18 August 2026, 11:00 Europe/London (competing sources retained)`
          : `PTPH listed — 18 August 2026, 10:00 Europe/London`,
        formatNotes: [
          variant === "messy" ? "index contains OCR-ambiguous annex note" : "",
          variant === "ocr_scan" ? "custody extract marked scanned/OCR" : "",
          variant === "mixed_format" ? "message pack includes native JSON extract reference" : "",
          variant === "later_disclosure" ? "MG6C marks later-disclosure annex outstanding" : "",
          family === "multi_defendant_attribution" ? "co-defendant attribution conflict retained" : "",
        ].filter(Boolean),
        complexity: variant === "clean" ? "low" : variant === "messy" || variant === "ocr_scan" ? "medium" : "high",
        procedureTrack: fo.court.includes("Magistrates") || fo.court.includes("Youth") ? "summary" : "indictable",
        evidenceFocus: fo.theme,
      });
    }
    if (out.length >= BATCH10_COHORT_B_TARGET) break;
  }
  if (out.length !== BATCH10_COHORT_B_TARGET) {
    throw new Error(`Expected ${BATCH10_COHORT_B_TARGET} catalog rows, got ${out.length}`);
  }
  return out;
}

export function coverageMatrixFromCatalog(specs: Deficit120CaseSpec[]) {
  const byFamily: Record<string, number> = {};
  const byVariant: Record<string, number> = {};
  const byProcedure: Record<string, number> = {};
  const byComplexity: Record<string, number> = {};
  for (const s of specs) {
    byFamily[s.family] = (byFamily[s.family] ?? 0) + 1;
    byVariant[s.variant] = (byVariant[s.variant] ?? 0) + 1;
    byProcedure[s.procedureTrack] = (byProcedure[s.procedureTrack] ?? 0) + 1;
    byComplexity[s.complexity] = (byComplexity[s.complexity] ?? 0) + 1;
  }
  return { byFamily, byVariant, byProcedure, byComplexity, total: specs.length };
}
