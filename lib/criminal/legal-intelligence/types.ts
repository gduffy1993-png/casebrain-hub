/**
 * Legal Intelligence / Case Moves advisory types.
 *
 * Architecture:
 *   SOURCE → OBSERVATIONS → RECONCILIATION → CANONICAL TRUTH 🔒
 *     → LEGAL INTELLIGENCE / CASE MOVES 🧠 → solicitor considerations
 *
 * Advisory outputs may reason about canonical facts. They must NEVER rewrite
 * evidence existence/served/missing/modality/identity/roles/charge/dates/
 * provenance/totals, nor increment readiness or chase counters.
 */

import type { SolicitorClaimSupportClass } from "@/lib/eval/master3000-quality/solicitor-visible-claim-audit";
import type { SolicitorClaimSurface } from "@/lib/eval/master3000-quality/solicitor-visible-claim-audit";

export type AdvisoryEpistemicKind =
  | "SOURCE_FACT"
  | "SAFE_DERIVATION"
  | "PRACTITIONER_CONSIDERATION";

export type AdvisoryScope = "source_specific" | "general_professional";

export type AdvisoryConsideration = {
  id: string;
  /** What should be considered (never asserted as case fact). */
  what: string;
  /** Why it matters tactically / legally. */
  why: string;
  /** Canonical / source triggers that activated this consideration. */
  canonicalTriggers: string[];
  /** Provenance notes (document titles, signal ids, offence family). */
  provenance: string[];
  scope: AdvisoryScope;
  /** What must be confirmed before factual / chase / court language is used. */
  mustConfirmBeforeFactualLanguage: string[];
  supportClass: Extract<
    SolicitorClaimSupportClass,
    "PRACTITIONER_CONSIDERATION" | "SAFE_DERIVATION" | "SOURCE_FACT"
  >;
  /** Surfaces where this may appear (never auto-promotes into cps_chase facts). */
  allowedSurfaces: SolicitorClaimSurface[];
  category?: string;
  confidence?: "low" | "medium" | "high";
  /** True when generated from offence-shape knowledge alone (never evidence state). */
  offenceShapeOnly?: boolean;
  /** Historical recovery source tag for regression inventory. */
  recoverySource:
    | "case_moves_engine_6de1c4c24"
    | "offence_family_knowledge"
    | "strategy_fight_engine_advisory"
    | "real_life_strategies_pack"
    | "playbooks_by_offence";
};

export type EstablishedFact = {
  id: string;
  label: string;
  value: string;
  supportClass: "SOURCE_FACT" | "SAFE_DERIVATION";
  sourceRefs: string[];
};

export type NotEstablishedClaim = {
  id: string;
  label: string;
  /** Why it is not established from papers. */
  reason: string;
  /** Optional related advisory consideration id. */
  relatedConsiderationId?: string;
};

export type LegalIntelligenceResult = {
  caseId: string;
  epistemicBanner: "Advisory reasoning — not case facts.";
  established: EstablishedFact[];
  notEstablished: NotEstablishedClaim[];
  considerations: AdvisoryConsideration[];
  caseMovesSummary: string | null;
  /** Explicit firewall: advisory never mutates these. */
  firewall: {
    mayIncrementMissingCounters: false;
    mayIncrementServedCounters: false;
    mayAlterReadiness: false;
    mayAutoCreateChaseItems: false;
    mayBecomeClientFact: false;
    mayBecomeCourtAssertion: false;
    mayChangeCanonicalEvidenceState: false;
  };
};

export type SafePromotionRequest = {
  considerationId: string;
  sourceText: string;
  /** Candidate factual claim the solicitor wants to promote. */
  proposedFactLabel: string;
};

export type SafePromotionResult =
  | {
      promoted: true;
      supportClass: "SOURCE_FACT" | "SAFE_DERIVATION";
      reason: string;
    }
  | {
      promoted: false;
      supportClass: "PRACTITIONER_CONSIDERATION";
      reason: string;
    };
