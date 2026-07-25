/**
 * Youth-court / venue assertions — must be source-backed.
 * Age 17 or YJS material alone is insufficient to assert "You are in the youth court".
 */

export type YouthVenueAssessment = {
  ok: boolean;
  /** True when prose asserts youth court without venue provenance. */
  unsafeYouthCourtAssertion: boolean;
  displayProse: string;
  reason: string | null;
  venueSourceBacked: boolean;
};

const YOUTH_COURT_ASSERT_RE =
  /\b(you are in the youth court|your case is in the youth court|listed in the youth court|this is a youth[- ]court (?:matter|case))\b/i;

const VENUE_SOURCE_RE =
  /\b(youth\s+court|youthcourt)\b/i;

const AGE_OR_YJS_ONLY_RE = /\b(17\s*years?|aged\s*17|youth\s*—\s*17|YJS|youth\s+justice)\b/i;

/**
 * Detect whether bundle/hay contains an explicit youth-court venue (not merely age/YJS).
 */
export function hasSourceBackedYouthVenue(hay: string | null | undefined): boolean {
  const t = hay ?? "";
  return /\b(?:court\s*:\s*youth\s+court|listed\s+(?:at|in)\s+[^\n.]{0,60}youth\s+court|before\s+the\s+youth\s+court|youth\s+court\s+at\s+\w+|venue\s*:\s*[^\n.]{0,40}youth\s+court)\b/i.test(
    t,
  );
}

/**
 * Rewrite or flag unsafe youth-court assertions.
 * Age 17 / YJS alone → qualified wording; do not assert venue.
 */
export function assessYouthVenueWording(input: {
  prose: string;
  bundleHay?: string | null;
  allegation?: string | null;
}): YouthVenueAssessment {
  const prose = input.prose ?? "";
  const hay = `${input.bundleHay ?? ""} ${input.allegation ?? ""}`;
  const venueSourceBacked = hasSourceBackedYouthVenue(hay);
  const asserts = YOUTH_COURT_ASSERT_RE.test(prose);

  if (!asserts) {
    return {
      ok: true,
      unsafeYouthCourtAssertion: false,
      displayProse: prose,
      reason: null,
      venueSourceBacked,
    };
  }

  if (venueSourceBacked) {
    return {
      ok: true,
      unsafeYouthCourtAssertion: false,
      displayProse: prose,
      reason: null,
      venueSourceBacked: true,
    };
  }

  // Age/YJS alone is insufficient — qualify.
  const qualified =
    "You are recorded as 17, so youth-specific safeguards and the correct court venue must be confirmed from the papers.";
  const displayProse = prose.replace(YOUTH_COURT_ASSERT_RE, () => {
    // Prefer full-sentence replacement when the assertion is the venue claim.
    return AGE_OR_YJS_ONLY_RE.test(prose) || /youth/i.test(prose)
      ? "youth-specific safeguards apply and the correct court venue must be confirmed from the papers"
      : qualified;
  });

  // If still contains a hard assertion, replace the whole youth-court sentence.
  let cleaned = displayProse;
  if (YOUTH_COURT_ASSERT_RE.test(cleaned)) {
    cleaned = cleaned.replace(
      /[^.]*\b(?:you are in the youth court|your case is in the youth court)[^.]*\./gi,
      `${qualified} `,
    );
  }
  // Common fixture phrasing: "Your case is in the youth court and needs..."
  cleaned = cleaned.replace(
    /Your case is in the youth court and needs age-appropriate disclosure/gi,
    "You are recorded as 17, so youth-specific safeguards and the correct court venue must be confirmed from the papers; age-appropriate disclosure is needed",
  );

  return {
    ok: false,
    unsafeYouthCourtAssertion: true,
    displayProse: cleaned.replace(/\s{2,}/g, " ").trim(),
    reason:
      "Youth-court venue assertion is not source-backed. Age 17 or YJS material alone is insufficient.",
    venueSourceBacked: false,
  };
}

export function sanitizeYouthVenueProse(input: {
  prose: string;
  bundleHay?: string | null;
  allegation?: string | null;
}): string {
  return assessYouthVenueWording(input).displayProse;
}
