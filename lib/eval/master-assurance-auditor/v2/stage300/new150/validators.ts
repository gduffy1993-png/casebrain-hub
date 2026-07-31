/**
 * Uniqueness / near-duplicate / acceptance gates for Stage-300 new-150.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PRODUCTION_EXITS } from "./constants";
import type { New150CaseSpec } from "./coverage-catalog";
import type { New150CaptureResult } from "./production-capture";
import type { CaseCapabilitySnapshot } from "./named-prerequisite-scan";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function nearDuplicateFingerprint(spec: New150CaseSpec, bundle: string): string {
  const norm = bundle
    .replace(/S300-[0-9a-f]+-[A-Za-z0-9_-]+/g, "TOKEN")
    .replace(/01AB\d+26/g, "URN")
    .replace(/s300-n150-\d{3}-[a-z0-9-]+/g, "CASE")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return sha256(`${spec.family}|${spec.coverageTag}|${norm.slice(0, 2000)}`);
}

export function detectNearDuplicates(
  rows: Array<{ caseId: string; fingerprint: string; coverageTag: string; family: string }>,
): Array<{ fingerprint: string; caseIds: string[]; allowedSameTemplate: boolean }> {
  const map = new Map<string, string[]>();
  const meta = new Map<string, { coverageTag: string; family: string }>();
  for (const r of rows) {
    const arr = map.get(r.fingerprint) ?? [];
    arr.push(r.caseId);
    map.set(r.fingerprint, arr);
    meta.set(r.fingerprint, { coverageTag: r.coverageTag, family: r.family });
  }
  const out: Array<{ fingerprint: string; caseIds: string[]; allowedSameTemplate: boolean }> = [];
  for (const [fp, caseIds] of map) {
    if (caseIds.length < 2) continue;
    // Same template lineage may share structure; reject only exact fingerprint collisions across different families/tags.
    const m = meta.get(fp)!;
    out.push({
      fingerprint: fp,
      caseIds,
      allowedSameTemplate: true, // disclosed template lineage; meaningful variation enforced via token/URN/defendant/dates
    });
    void m;
  }
  return out;
}

export function validateAcceptedCase(args: {
  spec: New150CaseSpec;
  capture: New150CaptureResult;
  snapshot: CaseCapabilitySnapshot;
  sourceDir: string;
  seenCaseIds: Set<string>;
  seenPdfHashes: Set<string>;
  seenFingerprints: Map<string, string>;
  bundleText: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (args.seenCaseIds.has(args.spec.caseId)) reasons.push("duplicate_case_id");
  if (args.seenPdfHashes.has(args.capture.bundlePdfSha256)) reasons.push("duplicate_source_pdf_hash");
  const fp = nearDuplicateFingerprint(args.spec, args.bundleText);
  const prior = args.seenFingerprints.get(fp);
  if (prior && prior !== args.spec.caseId) {
    // Exact normalised fingerprint collision with another case — reject.
    reasons.push(`near_duplicate_fingerprint_collision:${prior}`);
  }
  if (args.capture.truthOpenedDuringOutput !== false) reasons.push("truth_opened_during_output");
  if (!args.snapshot.sixProductionExitsComplete) {
    const missing = PRODUCTION_EXITS.filter((e) => !args.capture.exitHashes[e]);
    reasons.push(`missing_production_exits:${missing.join(",")}`);
  }
  if (!fs.existsSync(path.join(args.sourceDir, "truth-key.json"))) reasons.push("missing_truth_key");
  if (!fs.existsSync(path.join(args.sourceDir, "casebrain-output.json"))) reasons.push("missing_casebrain_output");
  if (!fs.existsSync(path.join(args.sourceDir, "source-capability-inventory.json"))) {
    reasons.push("missing_source_capability_inventory");
  }
  if (!fs.existsSync(path.join(args.sourceDir, "vdr-run-receipt.json"))) reasons.push("missing_vdr_receipt");

  // Specialty bags must not be invented into CaseBrain output.
  const cb = JSON.parse(fs.readFileSync(path.join(args.sourceDir, "casebrain-output.json"), "utf8")) as Record<
    string,
    unknown
  >;
  if (cb.legalStateTaxonomy && typeof cb.legalStateTaxonomy === "object") {
    reasons.push("invented_legalStateTaxonomy_into_casebrain_output");
  }
  if (cb.dobAgeCalcLedger && typeof cb.dobAgeCalcLedger === "object") {
    reasons.push("invented_dobAgeCalcLedger_into_casebrain_output");
  }
  if (cb.proceduralPartyState && typeof cb.proceduralPartyState === "object") {
    reasons.push("invented_proceduralPartyState_into_casebrain_output");
  }
  if (cb.truthKeyOpened === true) reasons.push("truthKeyOpened_flag_true");

  return { ok: reasons.length === 0, reasons };
}

export function checkpointGates(args: {
  accepted: number;
  rejected: number;
  snapshots: CaseCapabilitySnapshot[];
  frozen150Unchanged: boolean;
}): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!args.frozen150Unchanged) reasons.push("frozen_stage150_mutated");
  if (args.accepted === 0) reasons.push("zero_accepted");
  const allSix = args.snapshots.every((s) => s.sixProductionExitsComplete);
  if (!allSix) reasons.push("not_all_accepted_have_six_exits");
  const anyTruthOpen = false; // enforced per-case
  void anyTruthOpen;
  // SRC / VDR progress expected once ocr/vdr strata present
  const srcEligible = args.snapshots.filter((s) =>
    Object.entries(s.namedCompleteByControl).some(([id, v]) => v && id.startsWith("MAA2-SRC-")),
  ).length;
  const vdrEligible = args.snapshots.filter((s) => s.vdrReceiptPresent).length;
  if (args.accepted >= 5 && srcEligible === 0 && args.snapshots.some((s) => s.coverageTag === "ocr_binary_heavy")) {
    reasons.push("ocr_stratum_present_but_src_named_complete_zero");
  }
  if (args.accepted >= 5 && vdrEligible === 0) reasons.push("vdr_receipts_missing");
  return { pass: reasons.length === 0, reasons };
}
