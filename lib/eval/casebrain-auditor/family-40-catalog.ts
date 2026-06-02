/**
 * Family-40 planning catalog — NS-CPS-2026-0401..0440 (each ref appears once).
 * Source: scripts/generate-fictional-40-sources.cjs + docs/fictional-cases-40/*.txt
 */

import type { AuditorFamilyProfile, ManifestCertainty } from "./types";

export type Family40CatalogEntry = {
  ref: string;
  family: AuditorFamilyProfile;
  certainty: ManifestCertainty;
  offenceTag: string;
  evalHook: string;
  certaintyNote?: string;
};

export const FAMILY_40_CATALOG: Family40CatalogEntry[] = [
  // fraud_account_control ×10 (2 confirmed, 8 uncertain bucket)
  { ref: "NS-CPS-2026-0411", family: "fraud_account_control", certainty: "confirmed", offenceTag: "Fraud by false representation (low)", evalHook: "Bank schedule incomplete" },
  { ref: "NS-CPS-2026-0434", family: "fraud_account_control", certainty: "confirmed", offenceTag: "Fraud retail refund", evalHook: "MG5 £ vs MG11 £" },
  { ref: "NS-CPS-2026-0408", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Criminal damage", evalHook: "Tidy MG6", certaintyNote: "CD-only — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0414", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Harassment / stalking (generic)", evalHook: "Draft MG11", certaintyNote: "Stalking — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0415", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Burglary non-dwelling", evalHook: "Third-party insurer line", certaintyNote: "Burglary — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0419", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Theft of motor vehicle", evalHook: "Metadata optional", certaintyNote: "Theft — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0424", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Theft (pedal cycle)", evalHook: "Metadata optional", certaintyNote: "Theft — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0427", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Aggravated vehicle taking (fictional label)", evalHook: "Legal label mismatch", certaintyNote: "Motor crime — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0429", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Communications Act / malicious comms (generic)", evalHook: "Metadata optional", certaintyNote: "Comms — not fraud; scaffold slot only." },
  { ref: "NS-CPS-2026-0430", family: "fraud_account_control", certainty: "uncertain", offenceTag: "Criminal damage (railway fiction)", evalHook: "CCTV clock fast", certaintyNote: "CD — not fraud; scaffold slot only." },

  // pwits_phone_attribution ×10 (2 confirmed, 8 uncertain)
  { ref: "NS-CPS-2026-0405", family: "pwits_phone_attribution", certainty: "confirmed", offenceTag: "PWITS Class B lite", evalHook: "Stop search vs MG6 bad character tension" },
  { ref: "NS-CPS-2026-0421", family: "pwits_phone_attribution", certainty: "confirmed", offenceTag: "Possession Class A lite", evalHook: "MG6 passenger ID" },
  { ref: "NS-CPS-2026-0416", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Bladed article", evalHook: "ID lighting", certaintyNote: "Weapons — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0417", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Careless driving + assault at scene", evalHook: "Notebook vs CAD", certaintyNote: "RTA/assault mix — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0422", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Criminal damage + s.4A course", evalHook: "Wrong page index", certaintyNote: "CD/POA — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0426", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Dangerous driving", evalHook: "ANPR partial", certaintyNote: "Road traffic — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0428", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "s.20 GBH (glass)", evalHook: "Unused schedule v3", certaintyNote: "Violence — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0433", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Possession offensive weapon (non-blade)", evalHook: "Work tool defence", certaintyNote: "Weapons — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0435", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Public order s.4 + CD", evalHook: "Contradictory officer summaries", certaintyNote: "POA/CD — not PWITS; scaffold slot only." },
  { ref: "NS-CPS-2026-0436", family: "pwits_phone_attribution", certainty: "uncertain", offenceTag: "Drug driving (fictional summary style)", evalHook: "Metadata optional", certaintyNote: "Drug driving — not PWITS supply; scaffold slot only." },

  // robbery_identification ×10 (3 confirmed, 7 uncertain)
  { ref: "NS-CPS-2026-0401", family: "robbery_identification", certainty: "confirmed", offenceTag: "Robbery + s.47", evalHook: "Weak ID; MG5 vs MG6 on 999" },
  { ref: "NS-CPS-2026-0410", family: "robbery_identification", certainty: "confirmed", offenceTag: "Robbery (attempted)", evalHook: "Two MG6 dates contradict" },
  { ref: "NS-CPS-2026-0423", family: "robbery_identification", certainty: "confirmed", offenceTag: "Robbery", evalHook: "ID parade" },
  { ref: "NS-CPS-2026-0404", family: "robbery_identification", certainty: "uncertain", offenceTag: "Burglary dwelling + theft", evalHook: "Bad index; continuity draft", certaintyNote: "Burglary — not robbery; scaffold slot only." },
  { ref: "NS-CPS-2026-0407", family: "robbery_identification", certainty: "uncertain", offenceTag: "Theft from shop + assault security", evalHook: "OCR-style MG11", certaintyNote: "Shop theft — not robbery; scaffold slot only." },
  { ref: "NS-CPS-2026-0425", family: "robbery_identification", certainty: "uncertain", offenceTag: "Common assault (pub)", evalHook: "Stills before ID procedure", certaintyNote: "Assault — not robbery; scaffold slot only." },
  { ref: "NS-CPS-2026-0431", family: "robbery_identification", certainty: "uncertain", offenceTag: "Theft person (snatch)", evalHook: "Victim timeline slip", certaintyNote: "Snatch — robbery ID route uncertain." },
  { ref: "NS-CPS-2026-0437", family: "robbery_identification", certainty: "uncertain", offenceTag: "Burglary dwell + s.47", evalHook: "Multi-victim order muddled", certaintyNote: "Burglary+ABH mix — family uncertain." },
  { ref: "NS-CPS-2026-0438", family: "robbery_identification", certainty: "uncertain", offenceTag: "Handling stolen goods", evalHook: "Third party 'Carl'", certaintyNote: "Handling — not robbery; scaffold slot only." },
  { ref: "NS-CPS-2026-0440", family: "robbery_identification", certainty: "uncertain", offenceTag: "Mixed counts: theft + blade + POA", evalHook: "Late email, forgot attachment", certaintyNote: "Mixed counts — family uncertain." },

  // violence_domestic_assault ×10 — offence tags clear; strict grade deferred (no violence workflow profile in pilot-workflow yet)
  { ref: "NS-CPS-2026-0402", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "s.20 GBH", evalHook: "One-punch vs self-defence; CCTV clock", certaintyNote: "Violence family — discovery/structure only until violence_domestic_assault workflow profile exists." },
  { ref: "NS-CPS-2026-0403", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "Common assault (domestic-flavoured) + CD", evalHook: "BWV vs draft MG11", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0406", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "s.4 POA", evalHook: "Victim drunk; partial CAD", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0409", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "Assault PC + resist", evalHook: "BWV corrupted segment", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0412", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "s.18 GBH", evalHook: "Alternative suspect; wrong index", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0413", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "s.47 ABH", evalHook: "Metadata optional", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0418", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "Affray", evalHook: "Joint enterprise", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0420", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "s.5 POA", evalHook: "999 tape gap", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0432", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "s.47 ABH domestic-flavoured", evalHook: "Medical schedule only", certaintyNote: "Violence family — strict grade deferred." },
  { ref: "NS-CPS-2026-0439", family: "violence_domestic_assault", certainty: "uncertain", offenceTag: "Affray + assault PC", evalHook: "Wrong name OCR on index", certaintyNote: "Violence family — strict grade deferred." },
];

export function listFamily40ByFamily(family?: AuditorFamilyProfile): Family40CatalogEntry[] {
  if (!family) return FAMILY_40_CATALOG;
  return FAMILY_40_CATALOG.filter((e) => e.family === family);
}

export function countFamily40Certainty() {
  const confirmed = FAMILY_40_CATALOG.filter((e) => e.certainty === "confirmed").length;
  const uncertain = FAMILY_40_CATALOG.filter((e) => e.certainty === "uncertain").length;
  return { confirmed, uncertain, total: FAMILY_40_CATALOG.length };
}
