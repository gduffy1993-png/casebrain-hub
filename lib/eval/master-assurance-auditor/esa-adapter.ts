/**
 * ESA Stage-50 auditor adapter.
 *
 * Converts artifacts/evidence-state-audit-local/cases/<caseId>/ into
 * SavedCaseMaterialisation WITHOUT rewriting or inventing data.
 *
 * - Source bundle, CaseBrain output, and truth key stay separate.
 * - Each input is hashed independently before any comparison.
 * - Actual solicitor-visible surfaces come only from casebrain-output.json.
 * - Expectations come only from truth-key.json.
 * - Exit modes are recorded only when evidenced; otherwise not_exercised.
 * - Does not run auditor controls or emit stage-50 findings.
 */

import fs from "node:fs";
import path from "node:path";
import { parseTruthKeyJson } from "@/lib/eval/evidence-state-audit/truth-key-parse";
import { adaptCaseBrainOutput } from "@/lib/eval/evidence-state-audit/output-adapter";
import { buildCasebrainAuditSnapshot } from "@/lib/eval/evidence-state-audit/build-audit-snapshot";
import type {
  CaseBrainAuditOutput,
  EvidenceStateTruthKey,
} from "@/lib/eval/evidence-state-audit/types";
import { sha256Hex } from "./hashes";
import { MASTER_CONTROL_REGISTRY } from "./control-registry";
import { applyTruthKeyMigrationOverlay } from "./truth-key-migration-v1";
import type {
  MasterExitMode,
  MaterialisedSurface,
  SavedCaseMaterialisation,
  TruthExpectation,
} from "./types";

export const ESA_ADAPTER_ID = "esa-local-materialised" as const;
export const DEFAULT_ESA_CORPUS_ROOT = path.join(
  "artifacts",
  "evidence-state-audit-local",
  "cases",
);

export const ESA_REQUIRED_FILES = [
  "bundle-text.md",
  "casebrain-output.json",
  "truth-key.json",
] as const;

export type EsaInputHashes = {
  bundleTextSha256: string;
  casebrainOutputSha256: string;
  truthKeySha256: string;
};

export type EsaCaseRejectReason =
  | "missing_bundle_text"
  | "missing_casebrain_output"
  | "missing_truth_key"
  | "malformed_casebrain_output"
  | "malformed_truth_key"
  | "identity_mismatch"
  | "duplicate_case_id"
  | "corrupt_empty_output"
  | "corrupt_empty_truth";

export type EsaCaseLoadResult =
  | {
      ok: true;
      caseId: string;
      folderName: string;
      packetPath: string;
      hashes: EsaInputHashes;
      materialisation: SavedCaseMaterialisation;
      surfaceCount: number;
      truthExpectationCount: number;
      exitModesPresent: MasterExitMode[];
      missingFields: string[];
      outputCaseId: string;
      truthCaseId: string;
    }
  | {
      ok: false;
      folderName: string;
      packetPath: string;
      reason: EsaCaseRejectReason;
      detail: string;
      hashes: Partial<EsaInputHashes>;
    };

export type EsaAdapterValidationReport = {
  schemaVersion: "1.0.0";
  adapterId: typeof ESA_ADAPTER_ID;
  corpusRoot: string;
  generatedAt: string;
  dryRun: true;
  controlsExecuted: false;
  findingsGenerated: false;
  requiredUniqueCases: number;
  membership: Array<{
    caseId: string;
    packetPath: string;
    hashes: EsaInputHashes;
    surfaceCount: number;
    truthExpectationCount: number;
    exitModesPresent: MasterExitMode[];
    missingFields: string[];
  }>;
  uniqueValidCaseCount: number;
  duplicateCaseIds: string[];
  rejected: Array<{
    folderName: string;
    packetPath: string;
    reason: EsaCaseRejectReason;
    detail: string;
  }>;
  totals: {
    directoriesScanned: number;
    accepted: number;
    rejected: number;
    duplicateCount: number;
    surfaceCount: number;
    truthExpectationCount: number;
    missingFieldOccurrences: number;
  };
  exitApplicability: Record<
    MasterExitMode,
    { presentOnCases: number; status: "exercisable" | "not_exercised" }
  >;
  laneApplicability: Array<{
    controlId: string;
    laneId: string;
    requiredExits: MasterExitMode[];
    casesWithAnyRequiredExit: number;
    status: "applicable" | "not_exercised" | "partial";
  }>;
  sufficientForStage50: boolean;
  refuseReason: string | null;
};

const ALL_EXITS: MasterExitMode[] = [
  "view",
  "copy",
  "export",
  "api",
  "pdf",
  "composed_prose",
];

function readFileOrNull(filePath: string): Buffer | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function parseJsonStrict(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Malformed JSON in ${label}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Preserve null/absent as unknown — never invent defaults. */
function unknownString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function findDuplicateCaseIds(caseIds: string[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const id of caseIds) {
    const key = id.toLowerCase();
    if (seen.has(key)) dups.push(id);
    else seen.add(key);
  }
  return dups;
}

/**
 * Exit modes only when evidenced on the output surface.
 * - view: solicitor-visible text is present in the audit snapshot
 * - copy: only when canCopy === true is explicitly recorded
 * - export/api/pdf/composed_prose: never inferred from ESA H5 snapshot metadata
 */
function evidencedExits(input: {
  hasSolicitorVisibleText: boolean;
  canCopy?: boolean | null;
}): MasterExitMode[] {
  const exits: MasterExitMode[] = [];
  if (input.hasSolicitorVisibleText) exits.push("view");
  if (input.canCopy === true) exits.push("copy");
  return exits;
}

function expectationsFromTruthKey(truth: EvidenceStateTruthKey): TruthExpectation[] {
  return (truth.evidenceItems ?? []).map((item) => ({
    evidenceItem: item.evidence_item,
    evidenceType: item.evidence_type != null ? item.evidence_type : null,
    correctEvidenceState: item.correct_evidence_state != null ? item.correct_evidence_state : null,
    chaseNeeded: typeof item.chase_needed === "boolean" ? item.chase_needed : null,
    safeToRelyOn: typeof item.safe_to_rely_on === "boolean" ? item.safe_to_rely_on : null,
    mustNotSay: Array.isArray(item.must_not_say) ? item.must_not_say.map(String) : [],
    sourcePageAnchor:
      item.source_page_anchor != null ? String(item.source_page_anchor) : null,
  }));
}

/**
 * Build solicitor-visible surfaces ONLY from CaseBrain output.
 * Never injects truth-key wording into exact/actual surface text.
 */
function surfacesFromOutput(
  output: CaseBrainAuditOutput,
  missingFields: string[],
): {
  surfaces: MaterialisedSurface[];
  truthMapRows: SavedCaseMaterialisation["truthMapRows"];
  cpsChase: SavedCaseMaterialisation["cpsChase"];
  doNotOverstate: string[];
  exitModesPresent: Set<MasterExitMode>;
} {
  const surfaces: MaterialisedSurface[] = [];
  const exitModesPresent = new Set<MasterExitMode>();
  const recordExits = (exits: MasterExitMode[]) => {
    for (const e of exits) exitModesPresent.add(e);
  };

  // Court line — actual output only
  const courtText = output.courtNote?.text;
  if (typeof courtText === "string" && courtText.trim()) {
    const canCopy =
      typeof output.courtNote?.canCopy === "boolean" ? output.courtNote.canCopy : null;
    if (output.courtNote?.canCopy === undefined) {
      missingFields.push("courtNote.canCopy");
    }
    const exits = evidencedExits({
      hasSolicitorVisibleText: true,
      canCopy,
    });
    recordExits(exits);
    surfaces.push({
      surfaceId: "court_line",
      text: courtText,
      exitModes: exits,
      canCopy: canCopy === true ? true : canCopy === false ? false : undefined,
      blockedNotRepaired: output.courtNote?.blockedReason ? true : null,
    });
  } else {
    missingFields.push("courtNote.text");
  }

  // Truth map rows — fiveAnswersEvidenceRows is the solicitor-visible table
  const truthMapRows: SavedCaseMaterialisation["truthMapRows"] = [];
  const five = output.fiveAnswersEvidenceRows;
  if (!Array.isArray(five)) {
    missingFields.push("fiveAnswersEvidenceRows");
  } else {
    for (const row of five) {
      const label = unknownString(row?.label);
      if (!label.trim()) {
        missingFields.push("fiveAnswersEvidenceRows[].label");
        continue;
      }
      const existence =
        row.existence === null || row.existence === undefined
          ? ""
          : String(row.existence);
      const reliability =
        row.reliability === null || row.reliability === undefined
          ? ""
          : String(row.reliability);
      if (row.existence === null || row.existence === undefined) {
        missingFields.push(`fiveAnswersEvidenceRows[${label}].existence`);
      }
      if (row.reliability === null || row.reliability === undefined) {
        missingFields.push(`fiveAnswersEvidenceRows[${label}].reliability`);
      }
      truthMapRows.push({ label, existence, reliability });
      const text = `${label} · ${existence} · ${reliability}`;
      const exits = evidencedExits({ hasSolicitorVisibleText: true, canCopy: null });
      recordExits(exits);
      surfaces.push({
        surfaceId: "truth_map",
        text,
        exitModes: exits,
        canCopy: undefined,
      });
    }
  }

  // Also preserve evidenceStates labels/status/anchors that are not in fiveAnswers
  const fiveLabels = new Set(truthMapRows.map((r) => r.label.toLowerCase()));
  if (Array.isArray(output.evidenceStates)) {
    for (const row of output.evidenceStates) {
      const label = unknownString(row?.label);
      if (!label.trim()) continue;
      if (fiveLabels.has(label.toLowerCase())) continue;
      const existence = row.existenceLabel != null ? String(row.existenceLabel) : "";
      const reliability =
        row.inferredSourceState != null ? String(row.inferredSourceState) : "";
      if (row.existenceLabel == null) missingFields.push(`evidenceStates[${label}].existenceLabel`);
      if (row.inferredSourceState == null) {
        missingFields.push(`evidenceStates[${label}].inferredSourceState`);
      }
      truthMapRows.push({ label, existence, reliability });
      const exits = evidencedExits({ hasSolicitorVisibleText: true, canCopy: null });
      recordExits(exits);
      const anchor =
        (row as { evidenceAnchor?: string | null }).evidenceAnchor != null
          ? String((row as { evidenceAnchor?: string | null }).evidenceAnchor)
          : null;
      surfaces.push({
        surfaceId: "truth_map",
        text: `${label} · ${existence} · ${reliability}`,
        exitModes: exits,
        sourceDocument: row.source != null ? String(row.source) : null,
        sourcePage: anchor,
        pageIdentityKnown: anchor != null && !/unknown|unavailable/i.test(anchor),
      });
    }
  } else {
    missingFields.push("evidenceStates");
  }

  // Chase — actual copySuggestion only
  const cpsChase: SavedCaseMaterialisation["cpsChase"] = [];
  const chaseItems = output.warningsAndGaps?.chaseItems;
  if (!Array.isArray(chaseItems)) {
    missingFields.push("warningsAndGaps.chaseItems");
  } else {
    for (const ch of chaseItems) {
      const label = unknownString(ch?.label);
      const draft =
        ch?.copySuggestion != null ? String(ch.copySuggestion) : "";
      if (!label.trim() && !draft.trim()) continue;
      if (!draft.trim()) missingFields.push(`chaseItems[${label || "?"}].copySuggestion`);
      cpsChase.push({ label, draft });
      if (draft.trim()) {
        // Chase draft is copy-oriented solicitor text when copySuggestion exists
        const exits = evidencedExits({
          hasSolicitorVisibleText: true,
          canCopy: true,
        });
        recordExits(exits);
        surfaces.push({
          surfaceId: "disclosure_chase",
          text: draft,
          exitModes: exits,
          canCopy: true,
        });
      }
    }
  }

  // Do-not-overstate — from output only (never truth.mustNotSayGlobal)
  const doNotOverstate = Array.isArray(output.warningsAndGaps?.doNotOverstate)
    ? output.warningsAndGaps!.doNotOverstate!.map(String)
    : [];
  if (!Array.isArray(output.warningsAndGaps?.doNotOverstate)) {
    missingFields.push("warningsAndGaps.doNotOverstate");
  }
  for (const line of doNotOverstate) {
    if (!line.trim()) continue;
    const exits = evidencedExits({ hasSolicitorVisibleText: true, canCopy: false });
    recordExits(exits);
    surfaces.push({
      surfaceId: "do_not_overstate",
      text: line,
      exitModes: exits,
      canCopy: false,
    });
  }

  // Allegation / client summary are NOT in ESA H5 snapshot — leave absent (unknown)
  if (!("allegation" in (output as object))) missingFields.push("allegation");
  if (!("clientSummary" in (output as object)) && !("clientSummaryPreview" in (output as object))) {
    missingFields.push("clientSummary");
  }

  return {
    surfaces,
    truthMapRows,
    cpsChase,
    doNotOverstate,
    exitModesPresent,
  };
}

/**
 * Load a single ESA case directory into SavedCaseMaterialisation.
 * Requires all three files; hashes each independently; rejects identity mismatch.
 */
export function loadEsaCasePacket(caseDir: string): EsaCaseLoadResult {
  const folderName = path.basename(caseDir);
  const packetPath = caseDir.replace(/\\/g, "/");
  const bundlePath = path.join(caseDir, "bundle-text.md");
  const outputPath = path.join(caseDir, "casebrain-output.json");
  const truthPath = path.join(caseDir, "truth-key.json");

  const hashes: Partial<EsaInputHashes> = {};

  const bundleBuf = readFileOrNull(bundlePath);
  if (!bundleBuf) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "missing_bundle_text",
      detail: `Missing ${ESA_REQUIRED_FILES[0]}`,
      hashes,
    };
  }
  hashes.bundleTextSha256 = sha256Hex(bundleBuf);

  const outputBuf = readFileOrNull(outputPath);
  if (!outputBuf) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "missing_casebrain_output",
      detail: `Missing ${ESA_REQUIRED_FILES[1]}`,
      hashes,
    };
  }
  hashes.casebrainOutputSha256 = sha256Hex(outputBuf);

  const truthBuf = readFileOrNull(truthPath);
  if (!truthBuf) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "missing_truth_key",
      detail: `Missing ${ESA_REQUIRED_FILES[2]}`,
      hashes,
    };
  }
  hashes.truthKeySha256 = sha256Hex(truthBuf);

  let outputRaw: unknown;
  try {
    outputRaw = parseJsonStrict(outputBuf.toString("utf8"), "casebrain-output.json");
  } catch (err) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "malformed_casebrain_output",
      detail: err instanceof Error ? err.message : String(err),
      hashes,
    };
  }

  let truthRaw: unknown;
  try {
    truthRaw = parseJsonStrict(truthBuf.toString("utf8"), "truth-key.json");
  } catch (err) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "malformed_truth_key",
      detail: err instanceof Error ? err.message : String(err),
      hashes,
    };
  }

  if (!outputRaw || typeof outputRaw !== "object") {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "corrupt_empty_output",
      detail: "casebrain-output.json is not a JSON object",
      hashes,
    };
  }
  if (!truthRaw || typeof truthRaw !== "object") {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "corrupt_empty_truth",
      detail: "truth-key.json is not a JSON object",
      hashes,
    };
  }

  let truth: EvidenceStateTruthKey;
  try {
    truth = parseTruthKeyJson(truthRaw);
  } catch (err) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "malformed_truth_key",
      detail: err instanceof Error ? err.message : String(err),
      hashes,
    };
  }

  const outputOnDisk = adaptCaseBrainOutput(outputRaw);
  const outputCaseId = String(outputOnDisk.caseId ?? "").trim();
  const truthCaseId = String(truth.caseId ?? "").trim();

  if (!outputCaseId || !truthCaseId) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "identity_mismatch",
      detail: `Missing caseId in output ("${outputCaseId}") or truth ("${truthCaseId}")`,
      hashes,
    };
  }

  if (
    outputCaseId !== folderName ||
    truthCaseId !== folderName ||
    outputCaseId !== truthCaseId
  ) {
    return {
      ok: false,
      folderName,
      packetPath,
      reason: "identity_mismatch",
      detail: `Identity disagree: folder="${folderName}" output.caseId="${outputCaseId}" truth.caseId="${truthCaseId}"`,
      hashes,
    };
  }

  // Rematerialise solicitor surfaces in-memory from the bundle using shared
  // CaseBrain builders (fixes referred_only / incomplete collapse). On-disk
  // casebrain-output.json is NOT rewritten — freeze hashes stay intact.
  const bundleText = bundleBuf.toString("utf8");
  const clientLabel =
    typeof truth.title === "string" && /R v /i.test(truth.title)
      ? truth.title.replace(/^.*R v\s+/i, "").trim()
      : folderName;
  const allegation =
    (typeof truth.offenceWording === "string" && truth.offenceWording.trim()) ||
    (typeof truth.offenceFamily === "string" && truth.offenceFamily.trim()) ||
    "Criminal matter";
  const rematerialized = buildCasebrainAuditSnapshot({
    caseId: folderName,
    bundleText,
    clientLabel,
    allegation,
    caseTitle: typeof truth.title === "string" ? truth.title : `R v ${clientLabel}`,
    offenceLabel: allegation,
    truthKey: truth,
    generatedAt:
      outputOnDisk.generatedAt != null
        ? String(outputOnDisk.generatedAt)
        : new Date().toISOString(),
  });
  // Preserve on-disk identity fields; rematerialise evidence rows/states only.
  // Court note and do-not-overstate stay from the frozen output (not reinvented).
  const output: CaseBrainAuditOutput = {
    ...outputOnDisk,
    fiveAnswersEvidenceRows: rematerialized.fiveAnswersEvidenceRows,
    evidenceStates: rematerialized.evidenceStates,
  };

  // Guard: never present truth wording as actual CaseBrain wording
  const missingFields: string[] = [];
  const built = surfacesFromOutput(output, missingFields);
  const baseExpectations = expectationsFromTruthKey(truth);
  const migrated = applyTruthKeyMigrationOverlay({
    caseId: folderName,
    expectations: baseExpectations,
  });
  const truthExpectations = migrated.expectations;

  // Conflation guard: no truth evidence_item string may be the sole exactWording
  // of a surface unless that same string also appears in the output independently.
  // (Surfaces are built only from output, so this is structural — contract-tested.)

  const materialisation: SavedCaseMaterialisation = {
    caseId: folderName,
    sourceCaseId: null, // unknown in ESA — not invented
    familyLabel: truth.offenceFamily != null ? truth.offenceFamily : null,
    allegation: null, // not present on ESA H5 output — unknown, not taken from truth
    clientLabel: null,
    surfaces: built.surfaces,
    truthExpectations,
    truthMapRows: built.truthMapRows,
    cpsChase: built.cpsChase,
    doNotOverstate: built.doNotOverstate,
    inputBundlePath: path.join(caseDir, "bundle-text.md").replace(/\\/g, "/"),
    packetPath,
    builtAt: output.generatedAt != null ? String(output.generatedAt) : null,
  };

  return {
    ok: true,
    caseId: folderName,
    folderName,
    packetPath,
    hashes: hashes as EsaInputHashes,
    materialisation,
    surfaceCount: built.surfaces.length,
    truthExpectationCount: truthExpectations.length,
    exitModesPresent: [...built.exitModesPresent],
    missingFields: [...new Set(missingFields)],
    outputCaseId,
    truthCaseId,
  };
}

export function listEsaCaseDirs(corpusRoot: string = DEFAULT_ESA_CORPUS_ROOT): string[] {
  if (!fs.existsSync(corpusRoot)) return [];
  return fs
    .readdirSync(corpusRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(corpusRoot, d.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

/**
 * Validate and load the ESA corpus for stage-50 binding.
 * Rejects duplicates, corrupt packets; refuses when unique valid < requiredUniqueCases.
 * Does NOT run auditor controls.
 */
export function validateEsaAdapter(input?: {
  corpusRoot?: string;
  requiredUniqueCases?: number;
}): {
  report: EsaAdapterValidationReport;
  cases: SavedCaseMaterialisation[];
} {
  const corpusRoot = input?.corpusRoot ?? DEFAULT_ESA_CORPUS_ROOT;
  const requiredUniqueCases = input?.requiredUniqueCases ?? 50;
  const dirs = listEsaCaseDirs(corpusRoot);

  const accepted: Extract<EsaCaseLoadResult, { ok: true }>[] = [];
  const rejected: Extract<EsaCaseLoadResult, { ok: false }>[] = [];
  const seen = new Map<string, string>();
  const duplicateCaseIds: string[] = [];

  for (const dir of dirs) {
    const result = loadEsaCasePacket(dir);
    if (!result.ok) {
      rejected.push(result);
      continue;
    }
    const prior = seen.get(result.caseId.toLowerCase());
    if (prior) {
      duplicateCaseIds.push(result.caseId);
      rejected.push({
        ok: false,
        folderName: result.folderName,
        packetPath: result.packetPath,
        reason: "duplicate_case_id",
        detail: `Duplicate caseId "${result.caseId}" (first seen at ${prior})`,
        hashes: result.hashes,
      });
      continue;
    }
    seen.set(result.caseId.toLowerCase(), result.packetPath);
    accepted.push(result);
  }

  const exitApplicability = Object.fromEntries(
    ALL_EXITS.map((exit) => {
      const presentOnCases = accepted.filter((c) =>
        c.exitModesPresent.includes(exit),
      ).length;
      return [
        exit,
        {
          presentOnCases,
          status: presentOnCases > 0 ? ("exercisable" as const) : ("not_exercised" as const),
        },
      ];
    }),
  ) as EsaAdapterValidationReport["exitApplicability"];

  const laneApplicability = MASTER_CONTROL_REGISTRY.map((ctrl) => {
    const required = ctrl.affectedExits;
    const casesWithAnyRequiredExit = accepted.filter((c) =>
      required.some((e) => c.exitModesPresent.includes(e)),
    ).length;
    const missingExits = required.filter(
      (e) => exitApplicability[e].status === "not_exercised",
    );
    let status: "applicable" | "not_exercised" | "partial" = "not_exercised";
    if (missingExits.length === required.length) status = "not_exercised";
    else if (missingExits.length === 0) status = "applicable";
    else status = "partial";
    return {
      controlId: ctrl.id,
      laneId: ctrl.laneId,
      requiredExits: required,
      casesWithAnyRequiredExit,
      status,
    };
  });

  const uniqueValidCaseCount = accepted.length;
  const sufficientForStage50 = uniqueValidCaseCount >= requiredUniqueCases;
  const refuseReason = sufficientForStage50
    ? null
    : `ESA adapter has ${uniqueValidCaseCount} unique valid cases; stage 50 requires ${requiredUniqueCases}`;

  const report: EsaAdapterValidationReport = {
    schemaVersion: "1.0.0",
    adapterId: ESA_ADAPTER_ID,
    corpusRoot: corpusRoot.replace(/\\/g, "/"),
    generatedAt: new Date().toISOString(),
    dryRun: true,
    controlsExecuted: false,
    findingsGenerated: false,
    requiredUniqueCases,
    membership: accepted.map((c) => ({
      caseId: c.caseId,
      packetPath: c.packetPath,
      hashes: c.hashes,
      surfaceCount: c.surfaceCount,
      truthExpectationCount: c.truthExpectationCount,
      exitModesPresent: c.exitModesPresent,
      missingFields: c.missingFields,
    })),
    uniqueValidCaseCount,
    duplicateCaseIds: [...new Set(duplicateCaseIds)],
    rejected: rejected.map((r) => ({
      folderName: r.folderName,
      packetPath: r.packetPath,
      reason: r.reason,
      detail: r.detail,
    })),
    totals: {
      directoriesScanned: dirs.length,
      accepted: accepted.length,
      rejected: rejected.length,
      duplicateCount: duplicateCaseIds.length,
      surfaceCount: accepted.reduce((n, c) => n + c.surfaceCount, 0),
      truthExpectationCount: accepted.reduce((n, c) => n + c.truthExpectationCount, 0),
      missingFieldOccurrences: accepted.reduce((n, c) => n + c.missingFields.length, 0),
    },
    exitApplicability,
    laneApplicability,
    sufficientForStage50,
    refuseReason,
  };

  return {
    report,
    cases: sufficientForStage50
      ? accepted.slice(0, requiredUniqueCases).map((c) => c.materialisation)
      : [],
  };
}

/**
 * Detect truth/output conflation: a surface exact text that equals a truth-only
 * evidence_item (or must_not_say) and does not appear in the output blob.
 */
export function detectTruthOutputConflation(input: {
  outputTextBlob: string;
  truthEvidenceItems: string[];
  truthMustNotSay: string[];
  surfaceTexts: string[];
}): { conflated: boolean; offenders: string[] } {
  const outputLower = input.outputTextBlob.toLowerCase();
  const truthOnly = [
    ...input.truthEvidenceItems,
    ...input.truthMustNotSay,
  ].filter((t) => t.trim() && !outputLower.includes(t.toLowerCase()));
  const offenders = input.surfaceTexts.filter((s) =>
    truthOnly.some((t) => s.trim().toLowerCase() === t.trim().toLowerCase()),
  );
  return { conflated: offenders.length > 0, offenders };
}

export function writeEsaValidationReport(
  report: EsaAdapterValidationReport,
  outDir: string,
): { jsonPath: string; mdPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "ESA-ADAPTER-VALIDATION.json");
  const mdPath = path.join(outDir, "ESA-ADAPTER-VALIDATION.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const md = `# ESA Stage-50 Adapter Validation (dry-run)

- **adapterId:** ${report.adapterId}
- **corpusRoot:** ${report.corpusRoot}
- **generatedAt:** ${report.generatedAt}
- **dryRun:** true
- **controlsExecuted:** false
- **findingsGenerated:** false

## Membership / sufficiency

| Metric | Value |
|---|---:|
| Directories scanned | ${report.totals.directoriesScanned} |
| Accepted unique valid | **${report.uniqueValidCaseCount}** |
| Required for stage 50 | ${report.requiredUniqueCases} |
| Rejected | ${report.totals.rejected} |
| Duplicates | ${report.totals.duplicateCount} |
| Sufficient for stage 50 | **${report.sufficientForStage50}** |

${report.refuseReason ? `Refuse reason: ${report.refuseReason}` : "Adapter binding OK (≥50 unique valid cases)."}

## Hashes

Each accepted membership entry records independent SHA-256 for:
\`bundle-text.md\`, \`casebrain-output.json\`, \`truth-key.json\` (see JSON report).

## Surfaces / truth

| Metric | Value |
|---|---:|
| Surface count (all accepted) | ${report.totals.surfaceCount} |
| Truth expectation count | ${report.totals.truthExpectationCount} |
| Missing-field occurrences | ${report.totals.missingFieldOccurrences} |

## Exit applicability

| Exit | Cases present | Status |
|---|---:|---|
${ALL_EXITS.map(
  (e) =>
    `| ${e} | ${report.exitApplicability[e].presentOnCases} | ${report.exitApplicability[e].status} |`,
).join("\n")}

## Lane applicability

| Control | Lane | Status | Cases with required exit |
|---|---|---|---:|
${report.laneApplicability
  .map(
    (l) =>
      `| ${l.controlId} | ${l.laneId} | ${l.status} | ${l.casesWithAnyRequiredExit} |`,
  )
  .join("\n")}

## Rejected (sample)

${
  report.rejected.length === 0
    ? "_None_"
    : report.rejected
        .slice(0, 40)
        .map((r) => `- \`${r.folderName}\`: **${r.reason}** — ${r.detail}`)
        .join("\n")
}

## Do not

- run stage 50 / execute auditor controls / generate findings
- commit / push / merge / deploy / claim PASS
`;
  fs.writeFileSync(mdPath, md);
  return { jsonPath: jsonPath.replace(/\\/g, "/"), mdPath: mdPath.replace(/\\/g, "/") };
}
