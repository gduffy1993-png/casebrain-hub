/**
 * Batch-7 honesty disposition — ATR-01 returned to partial; EVS-01 conditional on domain registry.
 */

export const BATCH7_ATR01_RETURN_REASONS = [
  "Cases with zero other_defendant_only units are not_exercised, not partially_exercised.",
  "Generic MG labels are not reliable evidence-unit identity.",
  "Current logic checks only courtNote + doNotOverstate, not all applicable surfaces.",
  "Full defendant separation requires explicit subjectDefendantId/personId and evidenceUnitId/sourceEvidenceId relationships, plus cross-surface receipts.",
] as const;

export const BATCH7_ATR01_MISSING_ADAPTERS = [
  "subjectDefendantId / personId on evidence units",
  "evidenceUnitId / sourceEvidenceId relationships",
  "cross-surface defendant-separation receipts (court/client/chase/export/API/PDF)",
] as const;

export function buildBatch7HonestyDisposition(args: {
  domainsDisjoint: boolean;
  evs01Promoted: boolean;
}) {
  return {
    schemaVersion: "batch7-honesty-disposition@1.1.0",
    atr01: {
      controlId: "MAA2-ATR-01-DEFENDANT-SEPARATION",
      implementationStatus: "partially_implemented" as const,
      returnedFromPromotion: true,
      reasons: [...BATCH7_ATR01_RETURN_REASONS],
      missingAdapters: [...BATCH7_ATR01_MISSING_ADAPTERS],
    },
    evs01: {
      controlId: "MAA2-EVS-01-DIMENSION-SEPARATION",
      domainsDisjoint: args.domainsDisjoint,
      implementationStatus: args.evs01Promoted
        ? ("implemented" as const)
        : ("partially_implemented" as const),
      note: args.evs01Promoted
        ? "Promoted after versioned evidence-dimension domain registry established disjoint existence/reliability domains with bidirectional detector + contracts."
        : "Kept partially_implemented — domain registry ambiguous or acceptance bar not cleared.",
    },
    expectedTotals: args.evs01Promoted
      ? { implemented: 8, partially_implemented: 98, specified_not_implemented: 55 }
      : { implemented: 7, partially_implemented: 99, specified_not_implemented: 55 },
  };
}
