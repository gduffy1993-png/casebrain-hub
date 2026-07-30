/**
 * ESA multi-exit capability map — DERIVED from multi-exit-adapters + real packet receipts.
 * Do not maintain a second independent capability algorithm here.
 * Representative synthetic packets are test fixtures only — never programme evidence.
 */

import {
  EXIT_ADAPTER_SCHEMAS,
  checkAllExitCapabilities,
  type ExitCapabilityCheck,
  type ExitCapabilityStatus,
  type MultiExitId,
} from "../multi-exit-adapters";

export type ExitCapability = {
  exit: MultiExitId;
  status: ExitCapabilityStatus;
  evidenceObserved: string[];
  evidenceRequired: string[];
  evidenceMissing: string[];
  missingAdapter: string | null;
  note: string;
};

export type CaseExitCapabilityReceipt = {
  schemaVersion: "esa-case-exit-capability-receipt@1.0.0";
  caseId: string;
  exits: ExitCapabilityCheck[];
};

export type ExitCapabilityAggregateRow = {
  exit: MultiExitId;
  populationDenominator: number;
  exercisableCount: number;
  partialCount: number;
  notExercisedCount: number;
  evidenceObservedUnion: string[];
  evidenceRequired: string[];
  evidenceMissingUnion: string[];
  missingAdapterCounts: Record<string, number>;
  /** Never claims absent API/PDF/browser artefacts as evidenceOnEsa. */
  note: string;
};

/** Stable first-occurrence dedupe (preserves order; no sort). */
export function uniqueFirstOccurrence(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Test fixture only — must not drive programme capability maps. */
export function representativeEsaPacketForTests(): Record<string, unknown> {
  return {
    courtNote: {
      text: "Representative solicitor-visible court note.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
    },
    fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "ok", note: "served" }],
    evidenceStates: [
      {
        inferredSourceState: "served",
        label: "CCTV",
        existenceLabel: "served",
        evidenceAnchor: "MG11 p.4",
      },
    ],
    warningsAndGaps: {
      chaseItems: [{ label: "Master", copySuggestion: "Please serve the master." }],
      doNotOverstate: ["Do not overstate identification."],
    },
    exportVersion: {
      reviewFooter: "Solicitor review required before any external use.",
      sendability: "needs_solicitor_review",
      blockedReason: null,
    },
  };
}

export function buildCaseExitCapabilityReceipt(
  caseId: string,
  output: Record<string, unknown>,
): CaseExitCapabilityReceipt {
  return {
    schemaVersion: "esa-case-exit-capability-receipt@1.0.0",
    caseId,
    exits: checkAllExitCapabilities(output),
  };
}

/**
 * Aggregate 499 packet-local receipts into programme exit capability evidence.
 */
export function buildEsaMultiExitCapabilityMapFromReceipts(args: {
  receipts: CaseExitCapabilityReceipt[];
}): {
  schemaVersion: string;
  baselineCommit: string;
  sourceOfTruth: string;
  rule: string;
  populationDenominator: number;
  exits: ExitCapabilityAggregateRow[];
  futureAdaptersRequired: {
    authenticated_browser: string[];
    heavy_bundle: string[];
  };
  xex08Binding: string;
} {
  const population = args.receipts.length;
  const byId = Object.fromEntries(EXIT_ADAPTER_SCHEMAS.map((s) => [s.exitId, s]));

  const exits: ExitCapabilityAggregateRow[] = EXIT_ADAPTER_SCHEMAS.map((schema) => {
    let exercisableCount = 0;
    let partialCount = 0;
    let notExercisedCount = 0;
    const observed = new Set<string>();
    const missing = new Set<string>();
    const missingAdapterCounts: Record<string, number> = {};

    for (const receipt of args.receipts) {
      const check = receipt.exits.find((e) => e.exitId === schema.exitId);
      if (!check) {
        notExercisedCount += 1;
        continue;
      }
      if (check.status === "exercisable") exercisableCount += 1;
      else if (check.status === "partial_fields_only") partialCount += 1;
      else notExercisedCount += 1;

      for (const p of check.presentEvidencePointers) {
        // Packet pointers only — never invent absent API/PDF/browser artefact names as observed
        if (p.startsWith("/")) observed.add(p);
      }
      for (const p of check.missingEvidencePointers) missing.add(p);
      for (const a of check.missingFullExerciseArtefacts) missing.add(a);
      if (check.missingAdapter) {
        missingAdapterCounts[check.missingAdapter] =
          (missingAdapterCounts[check.missingAdapter] ?? 0) + 1;
      }
    }

    return {
      exit: schema.exitId,
      populationDenominator: population,
      exercisableCount,
      partialCount,
      notExercisedCount,
      evidenceObservedUnion: [...observed].sort(),
      evidenceRequired: uniqueFirstOccurrence([
        ...schema.evidencePointers,
        ...schema.requiredForFullExercise,
      ]),
      evidenceMissingUnion: [...missing].sort(),
      missingAdapterCounts,
      note:
        schema.source === "absent" || schema.exitId === "authenticated_browser"
          ? `${schema.exitId}: absent on ESA packets — not_exercised unless structured receipts supplied; never listed as evidenceObserved.`
          : `${schema.exitId}: aggregated from ${population} packet-local capability receipts.`,
    };
  });

  void byId;

  return {
    schemaVersion: "esa-multi-exit-capability-map@1.2.0",
    baselineCommit: "17361223248b41d719c8de2b98c1eaf2cb4125f6",
    sourceOfTruth: "lib/eval/master-assurance-auditor/v2/multi-exit-adapters + 499 packet receipts",
    rule:
      "Never invent exits. Programme map derived only from packet-local receipts over the ESA unique-valid population. Representative synthetic packets are test fixtures only. Separate evidenceObserved / evidenceRequired / evidenceMissing.",
    populationDenominator: population,
    exits,
    futureAdaptersRequired: {
      authenticated_browser: [
        "browser_session_receipt",
        "authenticated_screenshot_hash",
        "dom_text_extraction_receipt",
        "exit_click_path_receipt",
      ],
      heavy_bundle: [
        "original_source_pdf_binary",
        "ocr_visual_metadata",
        "page_unit_segmentation",
        "security_tool_scan_receipt",
      ],
    },
    xex08Binding:
      "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED must emit not_exercised / defect-if-claimed for api/pdf/composed_prose until structured adapters exist.",
  };
}

/**
 * @deprecated Do not use for programme evidence. Prefer buildEsaMultiExitCapabilityMapFromReceipts.
 * Kept for test convenience wrapping the test fixture packet.
 */
export function buildEsaMultiExitCapabilityMap(args?: {
  sampleOutput?: Record<string, unknown>;
}): ReturnType<typeof buildEsaMultiExitCapabilityMapFromReceipts> {
  const output = args?.sampleOutput ?? representativeEsaPacketForTests();
  const receipt = buildCaseExitCapabilityReceipt("test-fixture-only", output);
  return buildEsaMultiExitCapabilityMapFromReceipts({ receipts: [receipt] });
}

/** @deprecated Empty placeholder — programme emit must overwrite from 499 receipts. */
export const ESA_MULTI_EXIT_CAPABILITY_MAP = {
  schemaVersion: "esa-multi-exit-capability-map@1.2.0",
  baselineCommit: "17361223248b41d719c8de2b98c1eaf2cb4125f6",
  sourceOfTruth: "pending_499_receipt_aggregation",
  rule: "Must be regenerated from 499 packet-local receipts before programme use.",
  populationDenominator: 0,
  exits: [] as ExitCapabilityAggregateRow[],
  futureAdaptersRequired: {
    authenticated_browser: [] as string[],
    heavy_bundle: [] as string[],
  },
  xex08Binding: "",
};
