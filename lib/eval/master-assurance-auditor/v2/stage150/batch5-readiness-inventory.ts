/**
 * Batch-5 readiness inventory for all 106 partially_implemented Stage-150 controls.
 * Scores safety, solicitor usefulness, prevalence, input readiness — no forced selection count.
 */

import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  STAGE150_BATCH1_HANDLERS,
  type Stage150HandlerDef,
} from "./detector-registry";
import { BATCH3_CONTROL_CLASSIFICATIONS } from "./batch3-control-classification";
import { STAGE150_BATCH2_HANDLERS } from "./batch2-registry";
import { STAGE150_BATCH3_HANDLERS } from "./batch3-registry";

export type Batch5DetectorClass =
  | "genuine_structured_detector"
  | "genuine_string_quality_detector"
  | "phrase_probe_only"
  | "batch1_packet_local"
  | "batch2_packet_local";

export type Batch5ReadinessRow = {
  controlId: string;
  familyCode: string;
  originBatch: 1 | 2 | 3;
  detectorClassification: Batch5DetectorClass;
  safetyScore: number;
  solicitorUsefulnessScore: number;
  prevalenceScore: number;
  inputReadinessScore: number;
  contractCompletenessScore: number;
  totalScore: number;
  esaWordingSufficient: boolean;
  phraseProbeOnly: boolean;
  promotionBlockedReason: string | null;
  notes: string;
};

const B3 = new Map(BATCH3_CONTROL_CLASSIFICATIONS.map((c) => [c.controlId, c]));

const SAFETY_HIGH = new Set([
  "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
  "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
  "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
  "MAA2-FID-10-QUOTATION-FIDELITY",
  "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
  "MAA2-FID-09-NO-SILENT-CORRECTION",
  "MAA2-WRD-10-NO-PLACEHOLDERS",
  "MAA2-DEF-01-OPPORTUNITY-CHECKLIST",
]);

const USEFUL_HIGH = new Set([
  "MAA2-WRD-10-NO-PLACEHOLDERS",
  "MAA2-WRD-02-NO-MID-TRUNCATION",
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
  "MAA2-WRD-11-NO-GENERIC-FILLER",
  "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
  "MAA2-LSL-02-NO-ALLEGE-TO-FACT",
  "MAA2-FID-10-QUOTATION-FIDELITY",
  "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
  "MAA2-EVS-02-STATE-ENUM",
  "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
  "MAA2-PRI-01-NO-IMPORTANT-OMISSION",
]);

function originBatch(controlId: string): 1 | 2 | 3 {
  if (STAGE150_BATCH1_HANDLERS.some((h) => h.controlId === controlId)) return 1;
  if (STAGE150_BATCH2_HANDLERS.some((h) => h.controlId === controlId)) return 2;
  return 3;
}

function classify(h: Stage150HandlerDef): Batch5DetectorClass {
  if (h.detectorClassification === "phrase_probe_only") return "phrase_probe_only";
  if (h.detectorClassification === "genuine_string_quality_detector") {
    return "genuine_string_quality_detector";
  }
  if (h.detectorClassification === "genuine_structured_detector") {
    return "genuine_structured_detector";
  }
  const b3 = B3.get(h.controlId);
  if (b3?.classification === "phrase_probe_only") return "phrase_probe_only";
  if (b3?.classification === "genuine_string_quality_detector") {
    return "genuine_string_quality_detector";
  }
  if (b3?.classification === "genuine_structured_detector") {
    return "genuine_structured_detector";
  }
  return originBatch(h.controlId) === 1 ? "batch1_packet_local" : "batch2_packet_local";
}

function contractScore(h: Stage150HandlerDef): number {
  let s = 0;
  if (h.positiveContract?.includes("#")) s += 2;
  if (h.negativeContract?.includes("#")) s += 2;
  if (h.receiptValidator) s += 1;
  // Mutation contracts historically absent on most handlers — capped until Batch-5 adds them
  return Math.min(s, 4);
}

export function buildBatch5ReadinessInventory(args?: {
  eligibleCountsPerControl?: Record<string, number>;
}): {
  schemaVersion: string;
  populationAssumed: 499;
  handlerCount: number;
  rows: Batch5ReadinessRow[];
  classificationCounts: Record<string, number>;
} {
  const eligible = args?.eligibleCountsPerControl ?? {};
  const rows: Batch5ReadinessRow[] = STAGE150_PACKET_LOCAL_HANDLERS.map((h) => {
    const familyCode = h.controlId.split("-")[1] ?? "UNK";
    const detectorClassification = classify(h);
    const phraseProbeOnly = detectorClassification === "phrase_probe_only";
    const esaEligible = eligible[h.controlId] ?? 499; // prior Batch-3 shadow: most wording controls 499
    const esaWordingSufficient = h.requiredInputs.includes("included_solicitor_visible_wording") ||
      h.requiredInputs.includes("casebrain-output.json");

    const safetyScore = SAFETY_HIGH.has(h.controlId) ? 5 : familyCode === "WRD" || familyCode === "AUD" ? 3 : 2;
    const solicitorUsefulnessScore = USEFUL_HIGH.has(h.controlId) ? 5 : phraseProbeOnly ? 1 : 3;
    const prevalenceScore = esaEligible >= 400 ? 5 : esaEligible >= 100 ? 3 : 1;
    const inputReadinessScore = phraseProbeOnly
      ? 1
      : esaWordingSufficient
        ? 5
        : 2;
    const contractCompletenessScore = contractScore(h);

    let promotionBlockedReason: string | null = null;
    if (phraseProbeOnly) {
      promotionBlockedReason =
        "phrase_probe_only — must not be represented as full named-control exercise / fully implemented";
    }

    const totalScore =
      safetyScore * 3 +
      solicitorUsefulnessScore * 2 +
      prevalenceScore +
      inputReadinessScore * 2 +
      contractCompletenessScore * 2 -
      (phraseProbeOnly ? 100 : 0);

    return {
      controlId: h.controlId,
      familyCode,
      originBatch: originBatch(h.controlId),
      detectorClassification,
      safetyScore,
      solicitorUsefulnessScore,
      prevalenceScore,
      inputReadinessScore,
      contractCompletenessScore,
      totalScore,
      esaWordingSufficient,
      phraseProbeOnly,
      promotionBlockedReason,
      notes: h.ownershipNote,
    };
  });

  rows.sort((a, b) => b.totalScore - a.totalScore || a.controlId.localeCompare(b.controlId));

  const classificationCounts: Record<string, number> = {};
  for (const r of rows) {
    classificationCounts[r.detectorClassification] =
      (classificationCounts[r.detectorClassification] ?? 0) + 1;
  }

  return {
    schemaVersion: "batch5-readiness-inventory@1.0.0",
    populationAssumed: 499,
    handlerCount: rows.length,
    rows,
    classificationCounts,
  };
}
