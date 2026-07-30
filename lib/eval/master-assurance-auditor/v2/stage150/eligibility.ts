/**
 * Exact per-control Stage-150 eligibility + receipts.
 * Empty hit arrays never silently imply a clean PASS.
 * No truth opening; no audit verdict programme PASS.
 */

import fs from "node:fs";
import path from "node:path";
import {
  inventoryOutputLeaves,
  type SourceLeaf,
} from "../every-word/independent-leaf-inventory";
import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  type Stage150HandlerDef,
} from "./detector-registry";
import {
  buildEvalContext,
  evaluateControl,
  includedWordingLeaves,
  reconcileInventory,
  type Stage150Hit,
} from "./detectors";

export type ReceiptStatus = "evaluated" | "unresolved" | "not_exercised";

export type ControlReceipt = {
  caseId: string;
  controlId: string;
  status: ReceiptStatus;
  missingInputReason: string | null;
  hitCount: number;
  findingCodes: string[];
  candidateClasses: string[];
  /** Hard rule: empty hits ≠ pass. */
  emptyHitsDoNotImplyPass: true;
  note: string;
  absenceIsFinding: boolean;
};

export type CaseEligibility = {
  caseId: string;
  packetPath: string;
  hasCasebrainOutput: boolean;
  truthKeyFilePresent: boolean;
  truthOpened: false;
  inventoryReconciliation: ReturnType<typeof reconcileInventory> | null;
  includedSolicitorVisibleWordingCount: number;
  receipts: ControlReceipt[];
  eligibleControlIds: string[];
  notExercisedControlIds: string[];
  unresolvedControlIds: string[];
  evaluatedControlIds: string[];
};

function nonemptyArray(output: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return Array.isArray(cur) && cur.length > 0;
}

function arrayPresent(output: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return Array.isArray(cur);
}

function fieldPresent(output: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.replace(/^\//, "").split("/");
  let cur: unknown = output;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur !== undefined && cur !== null;
}

/**
 * Exact prerequisite check. Returns null if eligible to evaluate; else missing reason.
 */
export function missingPrerequisite(
  h: Stage150HandlerDef,
  output: Record<string, unknown>,
  leaves: SourceLeaf[],
): string | null {
  const wording = includedWordingLeaves(leaves);

  for (const req of h.requiredInputs) {
    if (req === "casebrain-output.json") continue;

    if (req === "included_solicitor_visible_wording") {
      if (wording.length === 0) return "missing:included_solicitor_visible_wording";
      continue;
    }

    if (req === "nonempty:/evidenceStates") {
      if (!nonemptyArray(output, "/evidenceStates")) return "missing_or_empty:/evidenceStates";
      continue;
    }
    if (req === "nonempty:/fiveAnswersEvidenceRows") {
      if (!nonemptyArray(output, "/fiveAnswersEvidenceRows"))
        return "missing_or_empty:/fiveAnswersEvidenceRows";
      continue;
    }
    if (req === "array:/warningsAndGaps/chaseItems") {
      if (!arrayPresent(output, "/warningsAndGaps/chaseItems"))
        return "missing:/warningsAndGaps/chaseItems";
      continue;
    }
    if (req === "nonempty:/warningsAndGaps/chaseItems") {
      if (!nonemptyArray(output, "/warningsAndGaps/chaseItems"))
        return "missing_or_empty:/warningsAndGaps/chaseItems";
      continue;
    }
    if (req === "array:/warningsAndGaps/doNotOverstate") {
      if (!arrayPresent(output, "/warningsAndGaps/doNotOverstate"))
        return "missing:/warningsAndGaps/doNotOverstate";
      continue;
    }
    if (req === "nonempty:/warningsAndGaps/doNotOverstate") {
      if (!nonemptyArray(output, "/warningsAndGaps/doNotOverstate"))
        return "missing_or_empty:/warningsAndGaps/doNotOverstate";
      continue;
    }
    if (req === "/courtNote/text") {
      const court = (output.courtNote ?? {}) as Record<string, unknown>;
      if (typeof court.text !== "string" || !court.text.trim()) return "missing_or_empty:/courtNote/text";
      continue;
    }
    if (req === "/courtNote/sendabilityLabel") {
      const court = (output.courtNote ?? {}) as Record<string, unknown>;
      if (typeof court.sendabilityLabel !== "string" || !court.sendabilityLabel.trim())
        return "missing_or_empty:/courtNote/sendabilityLabel";
      continue;
    }
    if (req === "/exportVersion/reviewFooter") {
      const exp = (output.exportVersion ?? {}) as Record<string, unknown>;
      if (typeof exp.reviewFooter !== "string" || !exp.reviewFooter.trim())
        return "missing_or_empty:/exportVersion/reviewFooter";
      continue;
    }
    if (req === "array_allow_empty:/fiveAnswersEvidenceRows") {
      // Absence itself may be the finding — require parent output only
      if (!("fiveAnswersEvidenceRows" in output) && !fieldPresent(output, "/courtNote")) {
        return "missing:/fiveAnswersEvidenceRows_and_/courtNote";
      }
      continue;
    }
    if (req === "original_source_binary") {
      return "missing:original_source_binary";
    }
  }
  return null;
}

function receiptFromHits(
  caseId: string,
  h: Stage150HandlerDef,
  hits: Stage150Hit[],
  missing: string | null,
): ControlReceipt {
  if (missing) {
    return {
      caseId,
      controlId: h.controlId,
      status: "not_exercised",
      missingInputReason: missing,
      hitCount: 0,
      findingCodes: [],
      candidateClasses: [],
      emptyHitsDoNotImplyPass: true,
      note: `not_exercised — ${missing}. Never PASS on missing input.`,
      absenceIsFinding: Boolean(h.absenceIsFinding),
    };
  }

  const classes = [...new Set(hits.map((x) => x.candidateClass))];
  const hasUnresolved = classes.includes("unresolved") || classes.includes("human_review_required");
  const status: ReceiptStatus =
    hits.length === 0
      ? "evaluated"
      : hasUnresolved && !classes.includes("candidate_defect")
        ? "unresolved"
        : "evaluated";

  return {
    caseId,
    controlId: h.controlId,
    status,
    missingInputReason: null,
    hitCount: hits.length,
    findingCodes: hits.map((x) => x.findingCode),
    candidateClasses: classes,
    emptyHitsDoNotImplyPass: true,
    note:
      hits.length === 0
        ? "evaluated with zero candidate hits — empty hits do NOT imply PASS / clean result; Stage-150 audit verdicts not issued in eligibility unit."
        : `evaluated with ${hits.length} candidate hit(s); calibration-only — not a programme PASS.`,
    absenceIsFinding: Boolean(h.absenceIsFinding),
  };
}

/**
 * Scan a single packet: exact eligibility + per-control receipts.
 * Reads casebrain-output.json only. Truth file existence via existsSync — never open contents.
 */
export function scanCaseEligibility(
  caseId: string,
  packetAbsDir: string,
  handlers: Stage150HandlerDef[] = STAGE150_PACKET_LOCAL_HANDLERS,
): CaseEligibility {
  const outputPath = path.join(packetAbsDir, "casebrain-output.json");
  const truthPath = path.join(packetAbsDir, "truth-key.json");
  const hasCasebrainOutput = fs.existsSync(outputPath);
  const truthKeyFilePresent = fs.existsSync(truthPath);

  if (!hasCasebrainOutput) {
    const receipts = handlers.map((h) =>
      receiptFromHits(caseId, h, [], "missing:casebrain-output.json"),
    );
    return {
      caseId,
      packetPath: packetAbsDir,
      hasCasebrainOutput,
      truthKeyFilePresent,
      truthOpened: false,
      inventoryReconciliation: null,
      includedSolicitorVisibleWordingCount: 0,
      receipts,
      eligibleControlIds: [],
      notExercisedControlIds: handlers.map((h) => h.controlId),
      unresolvedControlIds: [],
      evaluatedControlIds: [],
    };
  }

  const output = JSON.parse(fs.readFileSync(outputPath, "utf8")) as Record<string, unknown>;
  const leaves = inventoryOutputLeaves(caseId, output);
  const recon = reconcileInventory(leaves);
  const ctx = buildEvalContext(caseId, output);
  // reuse leaves already on ctx
  ctx.leaves = leaves;

  const receipts: ControlReceipt[] = [];
  for (const h of handlers) {
    const missing = missingPrerequisite(h, output, leaves);
    if (missing) {
      receipts.push(receiptFromHits(caseId, h, [], missing));
      continue;
    }
    const hits = evaluateControl(ctx, h.controlId);
    receipts.push(receiptFromHits(caseId, h, hits, null));
  }

  return {
    caseId,
    packetPath: packetAbsDir,
    hasCasebrainOutput,
    truthKeyFilePresent,
    truthOpened: false,
    inventoryReconciliation: recon,
    includedSolicitorVisibleWordingCount: includedWordingLeaves(leaves).length,
    receipts,
    eligibleControlIds: receipts.filter((r) => r.status !== "not_exercised").map((r) => r.controlId),
    notExercisedControlIds: receipts.filter((r) => r.status === "not_exercised").map((r) => r.controlId),
    unresolvedControlIds: receipts.filter((r) => r.status === "unresolved").map((r) => r.controlId),
    evaluatedControlIds: receipts.filter((r) => r.status === "evaluated").map((r) => r.controlId),
  };
}
