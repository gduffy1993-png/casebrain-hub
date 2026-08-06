/**
 * Coverage-gap register schema — drives later fictional/anonymised case creation.
 * No private real-case data; no universal coverage claim.
 */

export const COVERAGE_GAP_DIMENSIONS = [
  "offenceFamily",
  "procedure",
  "evidenceState",
  "documentFormat",
  "audience",
  "exit",
] as const;

export type CoverageGapCell = {
  offenceFamily: string;
  procedure: string;
  evidenceState: string;
  documentFormat: string;
  audience: string;
  exit: string;
  eligibleCaseCount: number;
  status: "untested" | "thin" | "covered";
  proposedAction: "create_fictional_case" | "expand_anonymised_fixture" | "none";
};

export function buildCoverageGapRegister(args: {
  observedEvidenceStates: string[];
  observedExits: string[];
  eligibleByControl: Record<string, number>;
}): {
  schemaVersion: string;
  claimUniversalCoverage: false;
  privateRealCaseDataIncluded: false;
  dimensions: typeof COVERAGE_GAP_DIMENSIONS;
  cells: CoverageGapCell[];
  summary: { untested: number; thin: number; covered: number };
} {
  const offenceFamilies = ["violence", "dishonesty", "drugs", "sexual", "motoring", "public_order", "other"];
  const procedures = ["investigation", "charge", "ptph", "trial", "sentence", "appeal"];
  const formats = ["pdf_text", "scan_ocr", "audio_transcript", "still_image", "video_index", "unknown"];
  const audiences = ["solicitor", "client", "court", "cps", "supervisor"];
  const exits = args.observedExits.length ? args.observedExits : ["view", "copy"];
  const states = args.observedEvidenceStates.length
    ? args.observedEvidenceStates
    : ["served", "referred_only", "missing", "incomplete", "quarantined", "disputed"];

  const cells: CoverageGapCell[] = [];
  // Sparse register: mark combinations with zero eligibility support as untested (sample grid, not full cartesian dump)
  for (const offenceFamily of offenceFamilies) {
    for (const evidenceState of states.slice(0, 6)) {
      for (const exit of exits) {
        const eligibleCaseCount = 0; // filled by emitter from population tags when available
        const status: CoverageGapCell["status"] =
          eligibleCaseCount === 0 ? "untested" : eligibleCaseCount < 3 ? "thin" : "covered";
        cells.push({
          offenceFamily,
          procedure: "charge",
          evidenceState,
          documentFormat: "unknown",
          audience: "solicitor",
          exit,
          eligibleCaseCount,
          status,
          proposedAction: status === "untested" ? "create_fictional_case" : status === "thin" ? "expand_anonymised_fixture" : "none",
        });
      }
    }
  }

  // Annotate that control eligibility counts exist separately
  void args.eligibleByControl;

  const summary = {
    untested: cells.filter((c) => c.status === "untested").length,
    thin: cells.filter((c) => c.status === "thin").length,
    covered: cells.filter((c) => c.status === "covered").length,
  };

  return {
    schemaVersion: "coverage-gap-register@1.0.0",
    claimUniversalCoverage: false,
    privateRealCaseDataIncluded: false,
    dimensions: COVERAGE_GAP_DIMENSIONS,
    cells,
    summary,
  };
}
