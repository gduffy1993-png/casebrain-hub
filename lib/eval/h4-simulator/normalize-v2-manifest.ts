/**
 * Normalise Codex H4 simulator v2 draft cases for repo ingest.
 */
import type { SimulatorManifestCase } from "./manifest-types";

const BADGE_MAP: Record<string, string> = {
  served: "served",
  "referred only": "referred_only",
  referred_only: "referred_only",
  missing: "missing",
  "not safely confirmed": "not_safely_confirmed",
  not_safely_confirmed: "not_safely_confirmed",
  provisional: "provisional",
  "needs review": "needs_review",
  needs_review: "needs_review",
};

const BLOCKING_OVERRIDES: Record<string, string[]> = {
  "sim-056": ["fingerprints prove entry", "CCTV confirms identification", "forensic links Harvey to scene"],
  "sim-064": ["criminal property is proved", "knew the property was criminal", "proves money laundering"],
  "sim-066": [
    "fraud account-control route",
    "PWITS route on perverting matter",
    "robbery identification route",
    "dishonesty pressure as final",
  ],
  "sim-068": ["imitation firearm proved", "intended to cause fear proved", "firearm report confirms guilt"],
  "sim-072": ["Zara knew", "document was false", "improper intention is proved"],
  "sim-075": [
    "safe to send",
    "case summary confirms",
    "current charges are clear",
    "Arun committed",
  ],
};

const MUST_NOT_SAY_OVERRIDES: Record<string, string[]> = {
  "sim-066": [
    "fraud account-control route as final",
    "PWITS route on perverting matter",
    "robbery identification route",
    "dishonesty pressure as final outcome",
  ],
};

export function normalizeSourceBadge(badge: string): string {
  const key = badge.trim().toLowerCase().replace(/\s+/g, " ");
  return BADGE_MAP[key] ?? key.replace(/\s+/g, "_");
}

export function normalizeSendability(
  raw: string,
  caseId: string,
): SimulatorManifestCase["expectedSendability"] {
  if (raw === "blocked_until_review") {
    return caseId === "sim-075" ? "blocked" : "needs_solicitor_review";
  }
  if (raw === "blocked") return "blocked";
  if (raw === "needs_solicitor_review") return "needs_solicitor_review";
  if (raw === "provisional_check_source") return "provisional_check_source";
  if (raw === "safe_to_send") return "safe_to_send";
  return "provisional_check_source";
}

export function normalizeBlockingPatterns(caseId: string, patterns: string[]): string[] {
  if (BLOCKING_OVERRIDES[caseId]) return BLOCKING_OVERRIDES[caseId];
  return patterns.filter((p) => p.trim().length > 0);
}

export type RawV2Case = Omit<SimulatorManifestCase, "bundleStatus"> & {
  bundleStatus?: string;
};

export function normalizeV2ManifestCase(raw: RawV2Case): SimulatorManifestCase {
  const caseId = raw.caseId;
  const highReviewNonSendable = caseId === "sim-075";

  return {
    caseId,
    title: raw.title,
    fakeDefendant: raw.fakeDefendant,
    fakeCourt: raw.fakeCourt,
    offenceWording: raw.offenceWording,
    offenceFamily: raw.offenceFamily,
    profile: raw.profile,
    mainIssue: raw.mainIssue,
    servedEvidence: raw.servedEvidence ?? [],
    referredOnlyEvidence: raw.referredOnlyEvidence ?? [],
    missingEvidence: raw.missingEvidence ?? [],
    uncertainEvidence: raw.uncertainEvidence ?? [],
    expectedTodayIssue: raw.expectedTodayIssue,
    expectedChaseItems: raw.expectedChaseItems ?? [],
    expectedSummaryRisk: raw.expectedSummaryRisk,
    expectedSourceStateBadges: (raw.expectedSourceStateBadges ?? []).map(normalizeSourceBadge),
    expectedSendability: normalizeSendability(raw.expectedSendability, caseId),
    mustNotSay: MUST_NOT_SAY_OVERRIDES[caseId] ?? raw.mustNotSay ?? [],
    blockingFailPatterns: normalizeBlockingPatterns(caseId, raw.blockingFailPatterns ?? []),
    polishOnlyWarnings: [
      ...(raw.polishOnlyWarnings ?? []),
      ...(highReviewNonSendable ? ["non-sendable messy bundle — blocked until MG5/MG6 and defendant map served"] : []),
    ],
    pdfLayoutType: raw.pdfLayoutType,
    redTeamTrapType: raw.redTeamTrapType,
    bundleStatus: "manifest_only",
  };
}
