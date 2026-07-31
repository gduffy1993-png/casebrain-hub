/**
 * Batch-10 source-capability census — per-lane denominators; truth hashed not opened.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ESA_REQUIRED_FILES } from "../../../esa-adapter";
import { BATCH10_CORPUS_LANES, type Batch10CorpusLane } from "./corpus-lanes";
import {
  BATCH10_EXIT_IDS,
  type Batch10CaseCapability,
  type Batch10CorpusLaneId,
  type Batch10ExitId,
} from "./schemas";

function sha256File(abs: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

function listDirs(abs: string): string[] {
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function resolveLaneCases(lane: Batch10CorpusLane, rootAbs: string): Array<{ caseId: string; dir: string }> {
  if (!fs.existsSync(rootAbs)) return [];
  if (lane.enumeration === "file_inventory" || lane.enumeration === "run_manifest_only") {
    return [];
  }
  if (lane.enumeration === "gold_case_dirs") {
    const casesRoot = path.join(rootAbs, "cases");
    if (!fs.existsSync(casesRoot)) return [];
    return listDirs(casesRoot)
      .filter((n) => /^CASE-\d+$/i.test(n))
      .map((n) => ({ caseId: n, dir: path.join(casesRoot, n) }));
  }
  // flat / esa
  let names = listDirs(rootAbs);
  if (lane.laneId === "esa_valid_499") {
    names = names.filter((n) =>
      ESA_REQUIRED_FILES.every((f) => fs.existsSync(path.join(rootAbs, n, f))),
    );
  } else if (lane.laneId === "esa_demo_audit_pdf_backed") {
    names = names.filter((n) => {
      const d = path.join(rootAbs, n);
      return (
        n.startsWith("demo-audit") &&
        fs.existsSync(path.join(d, "bundle.pdf")) &&
        fs.existsSync(path.join(d, "pdf-extraction-meta.json"))
      );
    });
  } else if (
    lane.laneId === "demo_audit_thirty_surfaces" ||
    lane.laneId === "demo_audit_five_surfaces"
  ) {
    names = names.filter((n) => n.startsWith("demo-audit"));
  }
  return names.map((n) => ({ caseId: n, dir: path.join(rootAbs, n) }));
}

function probeCase(laneId: Batch10CorpusLaneId, caseId: string, dir: string): Batch10CaseCapability {
  const has = (f: string) => fs.existsSync(path.join(dir, f));
  const notes: string[] = [];
  const bundlePdf = has("bundle.pdf");
  const metaPath = path.join(dir, "pdf-extraction-meta.json");
  const hasMeta = fs.existsSync(metaPath);
  let pageUnits = false;
  let pageIdentity = false;
  if (hasMeta) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
        pageCount?: number;
        pages?: Array<{ pageNumber?: number }>;
      };
      pageUnits = Array.isArray(meta.pages) && meta.pages.length > 0;
      pageIdentity = pageUnits && typeof meta.pageCount === "number" && meta.pageCount > 0;
    } catch {
      notes.push("pdf-extraction-meta.json unreadable");
    }
  }
  const canonical = has("canonical-bundle.md");
  const hasChargeSection =
    canonical &&
    /===\s*SECTION:\s*CHARGE\s*===/i.test(fs.readFileSync(path.join(dir, "canonical-bundle.md"), "utf8"));
  const hasIndex =
    canonical &&
    /===\s*SECTION:\s*COVER_INDEX\s*===/i.test(fs.readFileSync(path.join(dir, "canonical-bundle.md"), "utf8"));

  // Output structured bags — observe presence only (no invention).
  let outputHasCharge = false;
  let outputHasChrono = false;
  let outputHasChase = false;
  let outputHasEvidenceIds = false;
  const exits: Partial<Record<Batch10ExitId, boolean>> = {};
  for (const id of BATCH10_EXIT_IDS) exits[id] = false;
  const outputPath = path.join(dir, "casebrain-output.json");
  let outputSha: string | null = null;
  if (fs.existsSync(outputPath)) {
    outputSha = sha256File(outputPath);
    try {
      const output = JSON.parse(fs.readFileSync(outputPath, "utf8")) as Record<string, unknown>;
      outputHasCharge = Array.isArray(output.chargeInstruments) && output.chargeInstruments.length > 0;
      outputHasChrono = Array.isArray(output.chronologyEvents) && output.chronologyEvents.length > 0;
      const gaps = (output.warningsAndGaps ?? {}) as Record<string, unknown>;
      outputHasChase = Array.isArray(gaps.chaseItems) && gaps.chaseItems.length > 0;
      const rows = Array.isArray(output.fiveAnswersEvidenceRows) ? output.fiveAnswersEvidenceRows : [];
      outputHasEvidenceIds = rows.some(
        (r) => r && typeof r === "object" && typeof (r as { evidenceUnitId?: unknown }).evidenceUnitId === "string",
      );
      const bag = output.exitPayloadReceipts;
      if (bag && typeof bag === "object") {
        for (const id of BATCH10_EXIT_IDS) {
          const raw = (bag as Record<string, unknown>)[id];
          if (
            raw &&
            typeof raw === "object" &&
            typeof (raw as { payloadIdentity?: unknown }).payloadIdentity === "string" &&
            String((raw as { payloadIdentity: string }).payloadIdentity).trim()
          ) {
            exits[id] = true;
          }
        }
      }
    } catch {
      notes.push("casebrain-output.json unreadable");
    }
  }

  const truthPath = path.join(dir, "truth-key.json");
  const truthPresent = fs.existsSync(truthPath);
  // Hash only — never parse/open truth contents for census.
  const truthSha = truthPresent ? sha256File(truthPath) : null;

  return {
    caseId,
    laneId,
    relativePath: path.relative(process.cwd(), dir).replace(/\\/g, "/"),
    hasSourceDocuments: bundlePdf || canonical || has("bundle-text.md"),
    hasDocumentHashes: bundlePdf || hasMeta,
    hasDocumentPageUnits: pageUnits || hasIndex,
    hasCompiledAndSourcePageIdentity: pageIdentity,
    hasChargeInstruments: outputHasCharge || hasChargeSection,
    hasDefendantCountAllocation: false, // never invent from prose; only explicit structured fields
    hasEvidenceUnitIdentities: outputHasEvidenceIds,
    hasChronologyEventsTimezone: outputHasChrono,
    hasChaseRequestRelationships: outputHasChase,
    hasRealExitOutputs: exits,
    truthKeyPresent: truthPresent,
    truthKeySha256: truthSha,
    truthKeyContentsOpened: false,
    casebrainOutputPresent: !!outputSha,
    casebrainOutputSha256: outputSha,
    notes,
  };
}

export type Batch10LaneCensus = {
  laneId: Batch10CorpusLaneId;
  rootRelative: string;
  blueprintOnly: boolean;
  rootExists: boolean;
  caseDirectoryCount: number;
  cases: Batch10CaseCapability[];
  capabilityTotals: Record<string, number>;
  note: string;
  inventoryNote?: string;
};

export type Batch10CensusReport = {
  schemaVersion: "batch10-source-capability-census@1.0.0";
  baselineCommit: string;
  generatedAt: string;
  truthContentsOpened: false;
  lanes: Batch10LaneCensus[];
};

function emptyTotals(): Record<string, number> {
  return {
    hasSourceDocuments: 0,
    hasDocumentHashes: 0,
    hasDocumentPageUnits: 0,
    hasCompiledAndSourcePageIdentity: 0,
    hasChargeInstruments: 0,
    hasDefendantCountAllocation: 0,
    hasEvidenceUnitIdentities: 0,
    hasChronologyEventsTimezone: 0,
    hasChaseRequestRelationships: 0,
    hasAnyRealExit: 0,
    truthKeyPresent: 0,
    casebrainOutputPresent: 0,
  };
}

export function runBatch10Census(baselineCommit: string): Batch10CensusReport {
  const lanes: Batch10LaneCensus[] = [];
  for (const lane of BATCH10_CORPUS_LANES) {
    const rootAbs = path.join(process.cwd(), lane.rootRelative);
    const rootExists = fs.existsSync(rootAbs);
    const cases = rootExists ? listResolveAndProbe(lane, rootAbs) : [];
    const totals = emptyTotals();
    for (const c of cases) {
      if (c.hasSourceDocuments) totals.hasSourceDocuments += 1;
      if (c.hasDocumentHashes) totals.hasDocumentHashes += 1;
      if (c.hasDocumentPageUnits) totals.hasDocumentPageUnits += 1;
      if (c.hasCompiledAndSourcePageIdentity) totals.hasCompiledAndSourcePageIdentity += 1;
      if (c.hasChargeInstruments) totals.hasChargeInstruments += 1;
      if (c.hasDefendantCountAllocation) totals.hasDefendantCountAllocation += 1;
      if (c.hasEvidenceUnitIdentities) totals.hasEvidenceUnitIdentities += 1;
      if (c.hasChronologyEventsTimezone) totals.hasChronologyEventsTimezone += 1;
      if (c.hasChaseRequestRelationships) totals.hasChaseRequestRelationships += 1;
      if (Object.values(c.hasRealExitOutputs).some(Boolean)) totals.hasAnyRealExit += 1;
      if (c.truthKeyPresent) totals.truthKeyPresent += 1;
      if (c.casebrainOutputPresent) totals.casebrainOutputPresent += 1;
    }
    let inventoryNote: string | undefined;
    if (lane.enumeration === "file_inventory" || lane.enumeration === "run_manifest_only") {
      inventoryNote = rootExists
        ? `Lane is ${lane.blueprintOnly ? "blueprint/receipt" : "inventory"} — case packet dirs not enumerated as materialised cases.`
        : "Root missing.";
    }
    lanes.push({
      laneId: lane.laneId,
      rootRelative: lane.rootRelative.replace(/\\/g, "/"),
      blueprintOnly: lane.blueprintOnly,
      rootExists,
      caseDirectoryCount: cases.length,
      cases,
      capabilityTotals: totals,
      note: lane.note,
      inventoryNote,
    });
  }
  return {
    schemaVersion: "batch10-source-capability-census@1.0.0",
    baselineCommit,
    generatedAt: new Date().toISOString(),
    truthContentsOpened: false,
    lanes,
  };
}

function listResolveAndProbe(lane: Batch10CorpusLane, rootAbs: string): Batch10CaseCapability[] {
  return resolveLaneCases(lane, rootAbs).map(({ caseId, dir }) => probeCase(lane.laneId, caseId, dir));
}
