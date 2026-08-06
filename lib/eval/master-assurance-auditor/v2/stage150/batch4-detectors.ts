/**
 * Batch-4 packet-local detectors for Stage-150-essential former SNI controls.
 * Adapter-gated: missing structured bags → no candidate hits (eligibility marks not_exercised).
 */

import type { SharedEngineId } from "../every-word/types";
import type { Stage150EvalContext, Stage150Hit } from "./detectors";
import {
  readDobAgeCalcLedger,
  readEldSourceChangeDrafting,
  readMultiAudiencePerspective,
  readPinnedLegalAuthorityRegistry,
  readStructuredProceduralPartyState,
  readVersionedDeterministicReceipts,
} from "./batch4-adapters";
import {
  assessReceiptPreservation,
  calculateAffectedWording,
  classifyWordingOutcomes,
  detectStaleDrafting,
  staleLeaksAcrossExits,
} from "../eld";
import { BATCH4_SELECTED } from "./batch4-disposition";

export type Batch4FindingMeta = {
  findingCode: string;
  handlerId: string;
  engineId: SharedEngineId;
};

const ENGINE: Record<string, SharedEngineId> = {
  ELD: "version_reproducibility",
  VDR: "version_reproducibility",
  LEG: "charge_legal_state",
  LSL: "charge_legal_state",
  XEX: "cross_output_completeness",
  AUD: "audience_context",
  XPP: "contradiction_perspective",
  CHR: "chronology_procedure",
  PRC: "chronology_procedure",
};

function meta(controlId: string): Batch4FindingMeta {
  const family = controlId.split("-")[1] ?? "ELD";
  const short = controlId.replace(/^MAA2-/, "").toLowerCase().replace(/-/g, "_");
  return {
    findingCode: `B4_${short}`.toUpperCase().slice(0, 64),
    handlerId: short.slice(0, 48),
    engineId: ENGINE[family] ?? "professional_wording",
  };
}

export const BATCH4_FINDING_BY_CONTROL: Record<string, Batch4FindingMeta> = Object.fromEntries(
  BATCH4_SELECTED.map((s) => [s.controlId, meta(s.controlId)]),
);

function hit(
  controlId: string,
  plainEnglish: string,
  path: string,
  exactWording = "",
): Stage150Hit {
  const m = BATCH4_FINDING_BY_CONTROL[controlId]!;
  return {
    controlId,
    findingCode: m.findingCode,
    handlerId: m.handlerId,
    engineId: m.engineId,
    candidateClass: "candidate_defect",
    plainEnglish,
    evidenceRefs: [path],
    occurrenceRef: path,
    exactWording,
  };
}

export function evaluateBatch4Control(ctx: Stage150EvalContext, controlId: string): Stage150Hit[] {
  const output = ctx.output;
  const family = controlId.split("-")[1] ?? "";

  if (family === "ELD") {
    const eld = readEldSourceChangeDrafting(output);
    if (!eld.present || !eld.versionPair) return [];
    const pair = eld.versionPair;
    if (controlId.includes("ELD-02") || controlId.includes("ELD-10")) {
      const outcomes = classifyWordingOutcomes({ pair });
      const bad = outcomes.filter((o) => !o.affected && o.outcome !== "unchanged");
      if (bad.length) {
        return [
          hit(
            controlId,
            "Unaffected sentence not byte-identical after source change.",
            "/eldVersionPair",
          ),
        ];
      }
      // ensure affected calculation is exercised
      calculateAffectedWording(pair);
      return [];
    }
    if (controlId.includes("ELD-03") || controlId.includes("ELD-04")) {
      const stale = detectStaleDrafting(pair);
      const leaks = staleLeaksAcrossExits(pair);
      if (stale.length && leaks.leakingExits.length) {
        return [
          hit(controlId, "Stale draft wording leaks across an exit surface.", "/eldVersionPair"),
        ];
      }
      return [];
    }
    if (controlId.includes("ELD-05")) {
      const receipt = assessReceiptPreservation(pair);
      if (!receipt.warningReceiptsPreserved || !receipt.approvalReceiptsPreserved) {
        return [hit(controlId, "Silent rewrite/delete detected in ELD receipts.", "/eldVersionPair")];
      }
      return [];
    }
    return [];
  }

  if (family === "LEG" || family === "LSL" || controlId === "MAA2-XEX-04-LEGAL-CURRENCY-WARNING") {
    const auth = readPinnedLegalAuthorityRegistry(output);
    if (!auth.present) return [];
    if (controlId.includes("LEG-08") || controlId.includes("XEX-04")) {
      if (auth.registry.some((r) => r.currencyStatus === "stale")) {
        const court = String((output.courtNote as { text?: string } | undefined)?.text ?? "");
        if (court && !/currency|stale|not\s+current|check\s+authority/i.test(court)) {
          return [
            hit(
              controlId,
              "Pinned authority marked stale without currency warning in solicitor-visible text.",
              "/pinnedAuthorityRegistry",
              court.slice(0, 200),
            ),
          ];
        }
      }
    }
    if (controlId.includes("LEG-10")) {
      const court = String((output.courtNote as { text?: string } | undefined)?.text ?? "");
      if (/\bcontrary\s+to\b/i.test(court) && !auth.registry.some((r) => court.includes(r.authorityId))) {
        return [
          hit(
            controlId,
            "Legal proposition without citation to pinned authorityId.",
            "/pinnedAuthorityRegistry",
            court.slice(0, 200),
          ),
        ];
      }
    }
    return [];
  }

  if (family === "VDR") {
    const vdr = readVersionedDeterministicReceipts(output);
    if (!vdr.present || !vdr.bag) return [];
    if (controlId.includes("VDR-01") && Object.keys(vdr.bag.sourceCaseHashes).length === 0) {
      return [hit(controlId, "VDR bag missing source case hashes.", "/versionedDeterministicReceipts")];
    }
    if (controlId.includes("VDR-02") && vdr.bag.frozenMembershipOrder.length === 0) {
      return [
        hit(controlId, "VDR bag missing frozen membership order.", "/versionedDeterministicReceipts"),
      ];
    }
    return [];
  }

  if (family === "AUD" || family === "XPP") {
    const multi = readMultiAudiencePerspective(output);
    if (!multi.present) return [];
    if (family === "AUD" && controlId.includes("AUD-08") && multi.audiences.length < 2) {
      return [
        hit(
          controlId,
          "Independent audience tests require ≥2 audience surfaces.",
          "/audienceSurfaces",
        ),
      ];
    }
    return [];
  }

  if (controlId.includes("CHR-06") || controlId.includes("CHR-12")) {
    const dob = readDobAgeCalcLedger(output);
    if (!dob.present) return [];
    if (controlId.includes("CHR-12")) {
      const inputs = (dob.ledger as { calcInputs?: unknown })?.calcInputs;
      if (!Array.isArray(inputs) || inputs.length === 0) {
        return [
          hit(controlId, "Age/date calculation without transparent calcInputs.", "/dobAgeCalcLedger"),
        ];
      }
    }
    return [];
  }

  if (family === "PRC") {
    const st = readStructuredProceduralPartyState(output);
    if (!st.present || !st.state) return [];
    if (controlId.includes("PRC-03") && st.state.youthState == null) {
      return [hit(controlId, "Youth control exercised without youthState field.", "/proceduralPartyState")];
    }
    if (controlId.includes("PRC-04") && st.state.fitnessParticipation == null) {
      return [
        hit(controlId, "Fitness control without fitnessParticipation field.", "/proceduralPartyState"),
      ];
    }
    if (controlId.includes("PRC-07") && st.state.disclosurePiiState == null) {
      return [
        hit(controlId, "Disclosure/PII control without disclosurePiiState.", "/proceduralPartyState"),
      ];
    }
    return [];
  }

  return [];
}

export function evaluateAllBatch4(ctx: Stage150EvalContext): Stage150Hit[] {
  const out: Stage150Hit[] = [];
  for (const sel of BATCH4_SELECTED) {
    out.push(...evaluateBatch4Control(ctx, sel.controlId));
  }
  return out;
}
