/**
 * Versioned solicitor offence-label / citation registry.
 * Source-cited corrections; never broad silent regex rewrites of charge wording.
 *
 * Where the source allegation disagrees with a verified registry entry, surfaces
 * must fail closed to solicitor verification — they must not silently rewrite.
 */

export const OFFENCE_LABEL_REGISTRY_VERSION = "1.0.0" as const;

export type OffenceLabelRegistryEntry = {
  id: string;
  /** Patterns matching unsafe / incorrect solicitor-visible charge wording. */
  detect: RegExp;
  /** Authoritative short label when verification succeeds (optional display aid). */
  verifiedLabel: string;
  /** Citation that must appear when the offence class is asserted. */
  correctCitation: string;
  /** Authoritative source note (statute). */
  authority: string;
  authorityUrl?: string;
  /** Fail-closed banner when source wording conflicts. */
  verificationRequiredMessage: string;
  disposition: "correct_or_fail_closed" | "qualified_review_required";
};

/**
 * Registry of known unsafe citation patterns found in controlled corpora.
 * Detection is specific (offence class + wrong section), not broad substitution.
 */
export const OFFENCE_LABEL_REGISTRY: OffenceLabelRegistryEntry[] = [
  {
    id: "fraud_false_representation_s2",
    detect: /\bfraud\s+by\s+false\s+representation\b[\s\S]{0,80}\bsection\s*1\b/i,
    verifiedLabel: "Fraud by false representation",
    correctCitation: "section 2 of the Fraud Act 2006",
    authority: "Fraud Act 2006 s.2",
    authorityUrl: "https://www.legislation.gov.uk/ukpga/2006/35/section/2",
    verificationRequiredMessage: "Charge wording requires solicitor verification",
    disposition: "correct_or_fail_closed",
  },
  {
    id: "mda_concerned_in_supply_s4_3_b",
    detect:
      /\b(?:being\s+)?concerned\s+in\s+(?:the\s+)?suppl(?:ying|y)\b[\s\S]{0,160}\bsection\s*4\s*\(\s*2\s*\)\s*\(\s*b\s*\)/i,
    verifiedLabel: "Being concerned in the supply of a controlled drug",
    correctCitation: "section 4(3)(b) of the Misuse of Drugs Act 1971",
    authority: "Misuse of Drugs Act 1971 s.4(3)(b) (production is s.4(2)(b))",
    authorityUrl: "https://www.legislation.gov.uk/ukpga/1971/38/section/4",
    verificationRequiredMessage: "Charge wording requires solicitor verification",
    disposition: "correct_or_fail_closed",
  },
  {
    id: "conspiracy_supply_or_import_not_bare_s4_3",
    detect:
      /\bconspirac(?:y|ies)\s+to\s+(?:supply|import)\b[\s\S]{0,160}\bsection\s*4\s*\(\s*3\s*\)(?:\s*\(\s*b\s*\))?(?![\s\S]{0,100}\bcriminal\s+law\s+act\s+1977\b)/i,
    verifiedLabel: "Conspiracy to supply / import a controlled drug",
    correctCitation:
      "section 1 of the Criminal Law Act 1977 (with the intended substantive drugs offence identified separately)",
    authority: "Criminal Law Act 1977 s.1; Misuse of Drugs Act 1971 for the substantive offence",
    authorityUrl: "https://www.legislation.gov.uk/ukpga/1977/45/section/1",
    verificationRequiredMessage: "Charge wording requires solicitor verification",
    disposition: "correct_or_fail_closed",
  },
  {
    id: "bladed_article_not_cja1988_s1",
    detect: /\bbladed\s+article\b[\s\S]{0,100}\bsection\s*1\b[\s\S]{0,40}\bcriminal\s+justice\s+act\s+1988\b/i,
    verifiedLabel: "Possession of a bladed article in a public place",
    correctCitation: "section 139 of the Criminal Justice Act 1988 (public-place bladed article)",
    authority: "Criminal Justice Act 1988 s.139 (s.1 is not the public-place bladed-article offence)",
    authorityUrl: "https://www.legislation.gov.uk/ukpga/1988/33/section/139",
    verificationRequiredMessage: "Charge wording requires solicitor verification",
    disposition: "correct_or_fail_closed",
  },
  {
    id: "bail_generic_breach_not_s6_3",
    detect:
      /\bbreach\s+of\s+bail\s+conditions?\b[\s\S]{0,120}\bsection\s*6\s*\(\s*3\s*\)(?![\s\S]{0,80}\bfailure\s+to\s+surrender\b)/i,
    verifiedLabel: "Breach of bail conditions",
    correctCitation:
      "Bail Act 1976 — section 6 concerns failure to surrender; generic breach-of-conditions wording must not cite s.6(3) unless the allegation is failure to surrender",
    authority: "Bail Act 1976 s.6",
    authorityUrl: "https://www.legislation.gov.uk/ukpga/1976/63/section/6",
    verificationRequiredMessage: "Charge wording requires solicitor verification",
    disposition: "correct_or_fail_closed",
  },
  {
    id: "dvpn_breach_qualified_review",
    detect: /\b(?:dvpn|domestic\s+violence\s+protection\s+notice|dvpo)\b[\s\S]{0,100}\bsection\s*25\b/i,
    verifiedLabel: "Breach of DVPN / DVPO",
    correctCitation: "Crime and Security Act 2010 (DVPN/DVPO scheme — provision requires solicitor verification)",
    authority: "Crime and Security Act 2010",
    authorityUrl: "https://www.legislation.gov.uk/ukpga/2010/17/contents",
    verificationRequiredMessage: "Charge wording requires solicitor verification",
    disposition: "qualified_review_required",
  },
];

export type OffenceLabelAssessment = {
  ok: boolean;
  /** True when source wording conflicts with a registry entry. */
  conflictsWithRegistry: boolean;
  matchedEntryIds: string[];
  /** Solicitor-facing display for headers — source preserved or fail-closed. */
  displayAllegation: string;
  /** Raw source allegation retained separately. */
  sourceAllegation: string;
  queueQualifiedReview: boolean;
  reason: string | null;
};

/**
 * Assess source allegation against the citation registry.
 * Never silently rewrites charge wording to the registry label.
 */
export function assessOffenceLabelWording(sourceAllegation: string | null | undefined): OffenceLabelAssessment {
  const source = (sourceAllegation ?? "").trim();
  if (!source) {
    return {
      ok: false,
      conflictsWithRegistry: false,
      matchedEntryIds: [],
      displayAllegation: "Charge wording requires solicitor verification",
      sourceAllegation: "",
      queueQualifiedReview: true,
      reason: "empty_allegation",
    };
  }

  const matched = OFFENCE_LABEL_REGISTRY.filter((e) => e.detect.test(source));
  if (!matched.length) {
    return {
      ok: true,
      conflictsWithRegistry: false,
      matchedEntryIds: [],
      displayAllegation: source,
      sourceAllegation: source,
      queueQualifiedReview: false,
      reason: null,
    };
  }

  const needsQualified = matched.some((e) => e.disposition === "qualified_review_required");
  return {
    ok: false,
    conflictsWithRegistry: true,
    matchedEntryIds: matched.map((e) => e.id),
    displayAllegation: "Charge wording requires solicitor verification",
    sourceAllegation: source,
    queueQualifiedReview: needsQualified || true,
    reason: `registry_conflict:${matched.map((e) => e.id).join(",")}`,
  };
}
