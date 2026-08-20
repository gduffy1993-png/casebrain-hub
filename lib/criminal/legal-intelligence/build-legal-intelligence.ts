/**
 * Legal Intelligence orchestrator — sits ABOVE canonical truth.
 * Builds established / not-established / practitioner considerations.
 */

import { familySupport } from "@/lib/criminal/chase-source-gate";
import { buildCaseMovesAdvisory } from "./case-moves-advisory";
import { buildOffenceFamilyConsiderations } from "./offence-family-considerations";
import { buildFightEngineAdvisoryConsiderations } from "./fight-engine-advisory";
import { buildRealLifeStrategyConsiderations } from "./real-life-strategies-advisory";
import { buildOrderBreachConsiderations } from "./order-breach-considerations";
import { buildMotoringConsiderations } from "./motoring-considerations";
import { rankAndDedupeConsiderations } from "./rank-dedupe-considerations";
import type {
  AdvisoryConsideration,
  EstablishedFact,
  LegalIntelligenceResult,
  NotEstablishedClaim,
} from "./types";

export type BuildLegalIntelligenceInput = {
  caseId?: string;
  allegation?: string;
  offenceType?: string;
  currentStage?: string;
  bundleText?: string;
  /** Explicit structured lists — never invent from offence playbooks. */
  servedEvidence?: string[];
  outstandingEvidence?: string[];
  missingEvidence?: string[];
  interviewSummary?: string;
  mg6Summary?: string;
  strategySummary?: string;
  inconsistencies?: string[];
  exhibitCodes?: string[];
  nextActions?: string[];
  /** Optional pre-parsed established facts (e.g. from canonical pipeline). */
  establishedFacts?: EstablishedFact[];
};

const FIREWALL = {
  mayIncrementMissingCounters: false,
  mayIncrementServedCounters: false,
  mayAlterReadiness: false,
  mayAutoCreateChaseItems: false,
  mayBecomeClientFact: false,
  mayBecomeCourtAssertion: false,
  mayChangeCanonicalEvidenceState: false,
} as const;

/**
 * Extract source-backed established facts from bundle text for proof cases.
 * Conservative: only clear charge/court/date/outstanding phrases.
 */
export function extractEstablishedFromBundle(
  bundleText: string,
  caseId: string,
): EstablishedFact[] {
  const facts: EstablishedFact[] = [];
  const lines = bundleText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const charge = line.match(/^Charge:\s*(.+)$/i);
    if (charge) {
      facts.push({
        id: `${caseId}:charge`,
        label: "charge",
        value: charge[1].trim(),
        supportClass: "SOURCE_FACT",
        sourceRefs: [line],
      });
    }
    const court = line.match(/^Court:\s*(.+)$/i);
    if (court) {
      facts.push({
        id: `${caseId}:court`,
        label: "court",
        value: court[1].trim(),
        supportClass: "SOURCE_FACT",
        sourceRefs: [line],
      });
    }
    const hearing =
      line.match(/^(?:First Appearance|Hearing):\s*(.+)$/i) ||
      line.match(/First Appearance:\s*(.+)$/i);
    if (hearing) {
      facts.push({
        id: `${caseId}:hearing`,
        label: "hearing",
        value: hearing[1].trim(),
        supportClass: "SOURCE_FACT",
        sourceRefs: [line],
      });
    }
    if (/\boutstanding\b|\bnot served\b|\bremains outstanding\b/i.test(line)) {
      facts.push({
        id: `${caseId}:outstanding:${facts.length}`,
        label: "outstanding_evidence",
        value: line,
        supportClass: "SOURCE_FACT",
        sourceRefs: [line],
      });
    }
  }

  return facts;
}

/**
 * Claims that must NOT be treated as established from offence shape / weak hints.
 */
export function buildNotEstablishedClaims(input: {
  caseId: string;
  bundleText: string;
  allegation?: string;
}): NotEstablishedClaim[] {
  const bundle = input.bundleText;
  const out: NotEstablishedClaim[] = [];

  const check = (
    id: string,
    label: string,
    family: Parameters<typeof familySupport>[0],
    relatedConsiderationId?: string,
  ) => {
    const support = familySupport(family, bundle);
    if (support === "absent") {
      out.push({
        id: `${input.caseId}:not:${id}`,
        label,
        reason: `Family '${family}' is absent from source — must not be asserted as outstanding/missing fact.`,
        relatedConsiderationId,
      });
    } else if (support === "negated") {
      out.push({
        id: `${input.caseId}:not:${id}`,
        label,
        reason: `Family '${family}' is explicitly negated in source — must not be asserted as outstanding/missing fact.`,
        relatedConsiderationId,
      });
    }
  };

  // 999 audio is NOT established merely because CAD/listing timing appears.
  if (!/\b999\b.{0,40}(audio|call|recording|outstanding|missing)/i.test(bundle) && !/\b999\s+audio\b/i.test(bundle)) {
    out.push({
      id: `${input.caseId}:not:999-outstanding`,
      label: "999 audio outstanding",
      reason:
        familySupport("cad_999", bundle) === "mentioned" && /\bcad\b/i.test(bundle) && !/\b999\b/i.test(bundle)
          ? "CAD/listing timing does not establish 999 audio as outstanding."
          : "999 audio is not established by the papers.",
      relatedConsiderationId: "consider:cad-related-call-material",
    });
  }
  check("medical-missing", "medical evidence missing", "medical", "consider:medical-may-be-relevant");
  check("bwv-missing", "BWV missing", "bwv", "consider:bwv-may-exist");

  // Continuity not established merely from "to be checked"
  if (/\bto be checked\b/i.test(bundle) && !/\bcontinuity\b.{0,40}(outstanding|missing|not served)/i.test(bundle)) {
    out.push({
      id: `${input.caseId}:not:cctv-continuity`,
      label: "CCTV continuity missing",
      reason: "'To be checked' does not establish CCTV continuity as missing.",
      relatedConsiderationId: "consider:cctv-clip-vs-master",
    });
  }

  // Self-defence not an established live case position from Affray alone
  if (/\baffray\b/i.test(input.allegation ?? bundle) && !/\bself-?defence\b/i.test(bundle)) {
    out.push({
      id: `${input.caseId}:not:self-defence-live`,
      label: "self-defence as established live case position",
      reason: "Offence type Affray does not establish self-defence as a live case theory.",
      relatedConsiderationId: "consider:self-defence-may-arise",
    });
  }

  return out;
}

export function buildLegalIntelligence(
  input: BuildLegalIntelligenceInput,
): LegalIntelligenceResult {
  const caseId = input.caseId ?? "unknown-case";
  const bundleText = input.bundleText ?? "";

  const established =
    input.establishedFacts ??
    (bundleText ? extractEstablishedFromBundle(bundleText, caseId) : []);

  const establishedLabels = [
    ...(input.servedEvidence ?? []),
    ...(input.outstandingEvidence ?? []),
    ...(input.missingEvidence ?? []),
    ...established.map((f) => f.value),
  ];

  // Only positively mentioned families — negated must not count as established.
  const establishedFamilies: string[] = [];
  for (const fam of [
    "cctv",
    "bwv",
    "interview",
    "medical",
    "phone",
    "custody",
    "cad_999",
  ] as const) {
    if (familySupport(fam, bundleText) === "mentioned") establishedFamilies.push(fam);
  }

  const caseMoves = buildCaseMovesAdvisory({
    caseId,
    allegation: input.allegation,
    offenceType: input.offenceType ?? input.allegation,
    currentStage: input.currentStage,
    servedEvidence: input.servedEvidence,
    outstandingEvidence: input.outstandingEvidence,
    missingEvidence: input.missingEvidence,
    interviewSummary: input.interviewSummary,
    mg6Summary: input.mg6Summary,
    strategySummary: input.strategySummary,
    inconsistencies: input.inconsistencies,
    // Pass through only when caller supplied exhibit codes; undefined ≠ blank list.
    exhibitCodes: input.exhibitCodes,
    nextActions: input.nextActions,
    bundleTextPreview: bundleText.slice(0, 4000),
  });

  const considerations = rankAndDedupeConsiderations([
    ...buildOffenceFamilyConsiderations({
      allegation: input.allegation,
      offenceType: input.offenceType,
      bundleText,
      establishedEvidenceLabels: establishedLabels,
    }),
    ...buildOrderBreachConsiderations({
      allegation: input.allegation,
      offenceType: input.offenceType,
      bundleText,
    }),
    ...buildMotoringConsiderations({
      allegation: input.allegation,
      offenceType: input.offenceType,
      bundleText,
    }),
    ...buildFightEngineAdvisoryConsiderations({
      allegation: input.allegation,
      bundleText,
      establishedFamilies,
    }),
    ...buildRealLifeStrategyConsiderations({
      allegation: input.allegation,
      bundleText,
    }),
    ...caseMoves.considerations,
  ]);

  return {
    caseId,
    epistemicBanner: "Advisory reasoning — not case facts.",
    established,
    notEstablished: buildNotEstablishedClaims({
      caseId,
      bundleText,
      allegation: input.allegation,
    }),
    considerations,
    caseMovesSummary: caseMoves.summary,
    firewall: { ...FIREWALL },
  };
}

/**
 * Filter considerations allowed on a surface. CPS chase never receives
 * auto-promoted advisory items as chase facts.
 */
export function considerationsForSurface(
  result: LegalIntelligenceResult,
  surface: AdvisoryConsideration["allowedSurfaces"][number] | "cps_chase",
): AdvisoryConsideration[] {
  if (surface === "cps_chase") {
    return [];
  }
  return result.considerations.filter((c) => c.allowedSurfaces.includes(surface));
}
