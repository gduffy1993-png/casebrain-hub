/**
 * Stage-300 essential-43 — per-case input loader.
 *
 * NEVER opens truth-key.json. NEVER merges specialty-bags-harness.json (or any harness/receipt
 * file) into the CaseBrain output object — every input is returned on its own labelled key so
 * downstream evaluators can tell production apart from harness-expectation / capture-receipt.
 *
 * This environment does not always have the original heavy `sources/` tree materialised on disk
 * (it is gitignored and regenerable — see .gitignore). The loader tries every known candidate
 * location for each filename and honestly records what it found vs what is missing; it never
 * fabricates a substitute file and never widens a search into unrelated cases.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ESSENTIAL_INPUT_FILENAMES,
  NEVER_OPENED_FILENAME,
  NEW150_ARTIFACT_ROOT,
  NEW150_V1_CURRENT_WORK_ROOT,
  NEW150_V1_HISTORICAL_WORK_ROOT,
  type EssentialBacking,
} from "../constants";

export type EssentialLineage = "stage150_frozen" | "stage300_new150";

export type LoadedInput<T> = {
  value: T | null;
  provenance: EssentialBacking | null;
  absolutePathUsed: string | null;
  triedPaths: string[];
};

export type EssentialCaseInputs = {
  caseId: string;
  cohort: "A" | "B";
  lineage: EssentialLineage;
  /** True only for Stage-150 Cohort-A rows — never has genuine CaseBrain output. */
  projectionOnly: boolean;

  casebrainOutput: LoadedInput<Record<string, unknown>>;
  casebrainOutputSha256: string | null;

  specialtyBagsHarness: LoadedInput<Record<string, unknown>>;
  vdrRunReceipt: LoadedInput<Record<string, unknown>>;
  audiencePacks: LoadedInput<Record<string, unknown>>;
  eldVersionPair: LoadedInput<Record<string, unknown>>;
  ocrPageUnitReceipts: LoadedInput<Record<string, unknown>>;
  structuredCasePacket: LoadedInput<Record<string, unknown>>;
  structuredCasePacketSha256: string | null;

  /** Absolute dirs that were probed, in probe order, across every filename. */
  candidateSourceDirsProbed: string[];
  /** Filenames that were not found in any candidate dir for this case. */
  missing: string[];
  neverOpenedTruthKey: true;
  loadedAt: string;
};

function sha256(buf: Buffer | string): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readJsonIfExists(abs: string): Record<string, unknown> | null {
  if (!fs.existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
    if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { __nonObjectRoot: parsed } as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Guard: this function must never be pointed at NEVER_OPENED_FILENAME. */
function assertNotTruthKey(filename: string): void {
  if (filename === NEVER_OPENED_FILENAME) {
    throw new Error("load-essential-inputs: refused to open truth-key.json — loader is fail-closed on this filename.");
  }
}

function loadFirstExisting(args: {
  repoRoot: string;
  candidateDirs: string[];
  filename: string;
  provenance: EssentialBacking;
}): LoadedInput<Record<string, unknown>> & { triedAbs: string[] } {
  assertNotTruthKey(args.filename);
  const triedAbs: string[] = [];
  for (const dir of args.candidateDirs) {
    const abs = path.join(args.repoRoot, dir, args.filename);
    triedAbs.push(abs);
    const value = readJsonIfExists(abs);
    if (value != null) {
      return { value, provenance: args.provenance, absolutePathUsed: abs, triedPaths: triedAbs, triedAbs };
    }
  }
  return { value: null, provenance: null, absolutePathUsed: null, triedPaths: triedAbs, triedAbs };
}

export type Stage150ManifestRowHint = {
  caseId: string;
  cohort: "A" | "B";
  sourceCasePath: string | null;
  packetRelativePath: string | null;
  casebrainOutputRelativePath: string | null;
};

export type New150ManifestRowHint = {
  caseId: string;
  relativePath: string; // structured-case-packet.json relative path
};

/**
 * Build the ordered list of candidate source directories (relative to repoRoot) to probe for a
 * given case, honestly reflecting where each lineage's materialised artefacts actually live in
 * this environment. Does not assert any of them exist.
 */
/** Optional shadow tree of post-shared-root-fix rematerialised outputs (never overwrites sources). */
export const STAGE300_POST_FIX_OUTPUT_ROOT_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-shared-root-fix/rematerialised-outputs" as const;

/** Post-fix wording-recalibration rematerialise (complete charge + inventory ownership). Prefer first. */
export const STAGE300_POST_FIX_WORDING_RECAL_OUTPUT_ROOT_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-fix-wording-recalibration/rematerialised-outputs" as const;

/** Final remediation rematerialise (structured charge completeness; never hide recorded source). */
export const STAGE300_FINAL_REMEDIATION_OUTPUT_ROOT_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-final-remediation/rematerialised-outputs" as const;

/** Solicitor-wording correction rematerialise (enums / truncation / Do-not-say / labels). */
export const STAGE300_SOLICITOR_WORDING_CORRECTION_OUTPUT_ROOT_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-wording-correction/rematerialised-outputs" as const;

/** Solicitor-boundary containment rematerialise (fixture IDs + raw supervisor containment). Prefer first. */
export const STAGE300_SOLICITOR_BOUNDARY_CONTAINMENT_OUTPUT_ROOT_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment/rematerialised-outputs" as const;

export function candidateSourceDirs(args: {
  lineage: EssentialLineage;
  caseId: string;
  stage150Hint?: Stage150ManifestRowHint | null;
  new150Hint?: New150ManifestRowHint | null;
  /** When true, prefer post-fix rematerialised outputs ahead of pre-fix sources. */
  preferPostFixOutputs?: boolean;
}): string[] {
  const dirs: string[] = [];
  if (args.lineage === "stage300_new150") {
    if (args.preferPostFixOutputs) {
      dirs.push(`${STAGE300_SOLICITOR_BOUNDARY_CONTAINMENT_OUTPUT_ROOT_REL}/${args.caseId}`);
      dirs.push(`${STAGE300_SOLICITOR_WORDING_CORRECTION_OUTPUT_ROOT_REL}/${args.caseId}`);
      dirs.push(`${STAGE300_FINAL_REMEDIATION_OUTPUT_ROOT_REL}/${args.caseId}`);
      dirs.push(`${STAGE300_POST_FIX_WORDING_RECAL_OUTPUT_ROOT_REL}/${args.caseId}`);
      dirs.push(`${STAGE300_POST_FIX_OUTPUT_ROOT_REL}/${args.caseId}`);
    }
    dirs.push(`${NEW150_ARTIFACT_ROOT}/candidates/${args.caseId}`);
    dirs.push(`${NEW150_ARTIFACT_ROOT}/sources/${args.caseId}`);
    if (args.new150Hint?.relativePath) {
      dirs.push(path.posix.dirname(args.new150Hint.relativePath.replace(/\\/g, "/")));
    }
    dirs.push(`${NEW150_V1_HISTORICAL_WORK_ROOT}/${args.caseId}`);
    dirs.push(`${NEW150_V1_CURRENT_WORK_ROOT}/${args.caseId}`);
    return [...new Set(dirs)];
  }

  // stage150_frozen
  if (args.preferPostFixOutputs) {
    dirs.push(`${STAGE300_SOLICITOR_BOUNDARY_CONTAINMENT_OUTPUT_ROOT_REL}/${args.caseId}`);
    dirs.push(`${STAGE300_SOLICITOR_WORDING_CORRECTION_OUTPUT_ROOT_REL}/${args.caseId}`);
    dirs.push(`${STAGE300_FINAL_REMEDIATION_OUTPUT_ROOT_REL}/${args.caseId}`);
    dirs.push(`${STAGE300_POST_FIX_WORDING_RECAL_OUTPUT_ROOT_REL}/${args.caseId}`);
    dirs.push(`${STAGE300_POST_FIX_OUTPUT_ROOT_REL}/${args.caseId}`);
  }
  if (args.stage150Hint?.sourceCasePath) dirs.push(args.stage150Hint.sourceCasePath);
  if (args.stage150Hint?.packetRelativePath) {
    dirs.push(path.posix.dirname(args.stage150Hint.packetRelativePath.replace(/\\/g, "/")));
  }
  if (args.stage150Hint?.casebrainOutputRelativePath) {
    dirs.push(path.posix.dirname(args.stage150Hint.casebrainOutputRelativePath.replace(/\\/g, "/")));
  }
  return [...new Set(dirs)];
}

export function loadEssentialCaseInputs(args: {
  repoRoot: string;
  caseId: string;
  cohort: "A" | "B";
  lineage: EssentialLineage;
  projectionOnly: boolean;
  stage150Hint?: Stage150ManifestRowHint | null;
  new150Hint?: New150ManifestRowHint | null;
  preferPostFixOutputs?: boolean;
}): EssentialCaseInputs {
  const dirs = candidateSourceDirs({
    lineage: args.lineage,
    caseId: args.caseId,
    stage150Hint: args.stage150Hint,
    new150Hint: args.new150Hint,
    preferPostFixOutputs: args.preferPostFixOutputs === true,
  });

  const structuredCasePacket = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: dirs,
    filename: ESSENTIAL_INPUT_FILENAMES.structuredCasePacket,
    provenance: "capture_receipt",
  });

  // If the packet itself resolves and carries its own sourceCasePath, add it as a further probe
  // dir for the remaining files (packet's sourceCasePath may point at a now-absent heavy tree —
  // trying it is harmless; absence is recorded honestly).
  const packetSourceCasePath =
    typeof structuredCasePacket.value?.sourceCasePath === "string"
      ? (structuredCasePacket.value.sourceCasePath as string)
      : null;
  const allDirs = packetSourceCasePath ? [...dirs, packetSourceCasePath] : dirs;

  const casebrainOutput = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: allDirs,
    filename: ESSENTIAL_INPUT_FILENAMES.casebrainOutput,
    provenance: "production",
  });
  const specialtyBagsHarness = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: allDirs,
    filename: ESSENTIAL_INPUT_FILENAMES.specialtyBagsHarness,
    provenance: "harness_expectation",
  });
  const vdrRunReceipt = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: allDirs,
    filename: ESSENTIAL_INPUT_FILENAMES.vdrRunReceipt,
    provenance: "capture_receipt",
  });
  const audiencePacks = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: allDirs,
    filename: ESSENTIAL_INPUT_FILENAMES.audiencePacks,
    provenance: "capture_receipt",
  });
  const eldVersionPair = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: allDirs,
    filename: ESSENTIAL_INPUT_FILENAMES.eldVersionPair,
    provenance: "capture_receipt",
  });
  const ocrPageUnitReceipts = loadFirstExisting({
    repoRoot: args.repoRoot,
    candidateDirs: allDirs,
    filename: ESSENTIAL_INPUT_FILENAMES.ocrPageUnitReceipts,
    provenance: "capture_receipt",
  });

  const casebrainOutputSha256 = casebrainOutput.absolutePathUsed
    ? sha256(fs.readFileSync(casebrainOutput.absolutePathUsed))
    : null;
  const structuredCasePacketSha256 = structuredCasePacket.absolutePathUsed
    ? sha256(fs.readFileSync(structuredCasePacket.absolutePathUsed))
    : null;

  const missing: string[] = [];
  if (!casebrainOutput.value && !args.projectionOnly) missing.push(ESSENTIAL_INPUT_FILENAMES.casebrainOutput);
  if (!specialtyBagsHarness.value) missing.push(ESSENTIAL_INPUT_FILENAMES.specialtyBagsHarness);
  if (!vdrRunReceipt.value) missing.push(ESSENTIAL_INPUT_FILENAMES.vdrRunReceipt);
  if (!audiencePacks.value) missing.push(ESSENTIAL_INPUT_FILENAMES.audiencePacks);
  if (!eldVersionPair.value) missing.push(ESSENTIAL_INPUT_FILENAMES.eldVersionPair);
  if (!ocrPageUnitReceipts.value) missing.push(ESSENTIAL_INPUT_FILENAMES.ocrPageUnitReceipts);
  if (!structuredCasePacket.value) missing.push(ESSENTIAL_INPUT_FILENAMES.structuredCasePacket);

  return {
    caseId: args.caseId,
    cohort: args.cohort,
    lineage: args.lineage,
    projectionOnly: args.projectionOnly,
    casebrainOutput: {
      value: casebrainOutput.value,
      provenance: casebrainOutput.provenance,
      absolutePathUsed: casebrainOutput.absolutePathUsed,
      triedPaths: casebrainOutput.triedPaths,
    },
    casebrainOutputSha256,
    specialtyBagsHarness: {
      value: specialtyBagsHarness.value,
      provenance: specialtyBagsHarness.provenance,
      absolutePathUsed: specialtyBagsHarness.absolutePathUsed,
      triedPaths: specialtyBagsHarness.triedPaths,
    },
    vdrRunReceipt: {
      value: vdrRunReceipt.value,
      provenance: vdrRunReceipt.provenance,
      absolutePathUsed: vdrRunReceipt.absolutePathUsed,
      triedPaths: vdrRunReceipt.triedPaths,
    },
    audiencePacks: {
      value: audiencePacks.value,
      provenance: audiencePacks.provenance,
      absolutePathUsed: audiencePacks.absolutePathUsed,
      triedPaths: audiencePacks.triedPaths,
    },
    eldVersionPair: {
      value: eldVersionPair.value,
      provenance: eldVersionPair.provenance,
      absolutePathUsed: eldVersionPair.absolutePathUsed,
      triedPaths: eldVersionPair.triedPaths,
    },
    ocrPageUnitReceipts: {
      value: ocrPageUnitReceipts.value,
      provenance: ocrPageUnitReceipts.provenance,
      absolutePathUsed: ocrPageUnitReceipts.absolutePathUsed,
      triedPaths: ocrPageUnitReceipts.triedPaths,
    },
    structuredCasePacket: {
      value: structuredCasePacket.value,
      provenance: structuredCasePacket.provenance,
      absolutePathUsed: structuredCasePacket.absolutePathUsed,
      triedPaths: structuredCasePacket.triedPaths,
    },
    structuredCasePacketSha256,
    candidateSourceDirsProbed: allDirs,
    missing,
    neverOpenedTruthKey: true,
    loadedAt: new Date().toISOString(),
  };
}
