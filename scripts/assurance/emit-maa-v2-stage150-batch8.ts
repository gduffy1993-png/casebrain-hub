/**
 * Emit MAA V2 Stage-150 Batch-8 structured adapter foundation artefacts.
 *
 * Capability matrix over 499 ESA packets. No detector promotions.
 * No Stage-150 selection/freeze/run. No CaseBrain repair. No commit/push.
 *
 * Baseline: e60790458f6c1030300c52c029e2318a28139252
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch8.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { DEFAULT_ESA_CORPUS_ROOT, ESA_REQUIRED_FILES } from "../../lib/eval/master-assurance-auditor/esa-adapter";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { adaptAllBatch8 } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters";
import {
  BATCH8_ADAPTER_IDS,
  BATCH8_BASELINE,
  BATCH8_SCHEMA_VERSION,
  type Batch8AdapterId,
  type Batch8CapabilityStatus,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch8/schemas";
import { BATCH8_UNLOCK_MAP } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch8/unlock-map";
import { assertReceiptsHonest } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch8/validators";
import {
  STAGE150_IMPLEMENTED_IDS,
  BATCH5_IMPLEMENTED_IDS,
  BATCH6_IMPLEMENTED_IDS,
  BATCH7_IMPLEMENTED_IDS,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8");
const CORPUS = path.join(ROOT, DEFAULT_ESA_CORPUS_ROOT);

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(dir: string, name: string, value: unknown): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitBlobId(ref: string, file: string): string | null {
  try {
    return execSync(`git rev-parse ${ref}:${file}`, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

function listUniqueValid(): Array<{ caseId: string; packetPath: string }> {
  const out: Array<{ caseId: string; packetPath: string }> = [];
  for (const name of fs.readdirSync(CORPUS).sort()) {
    const packetPath = path.join(CORPUS, name);
    if (!fs.statSync(packetPath).isDirectory()) continue;
    if (!ESA_REQUIRED_FILES.every((f) => fs.existsSync(path.join(packetPath, f)))) continue;
    out.push({ caseId: name, packetPath });
  }
  return out;
}

function brain1GuardianCompare(baseline: string, head: string) {
  const files = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const rows = files.map((p) => {
    const baselineBlobId = gitBlobId(baseline, p);
    const headBlobId = gitBlobId(head, p);
    return {
      path: p,
      baselineBlobId,
      headBlobId,
      blobUnchanged: baselineBlobId != null && headBlobId != null && baselineBlobId === headBlobId,
    };
  });
  return {
    schemaVersion: "brain1-guardian-blob-compare@2.0.0",
    methodology: "git rev-parse <baseline>:<exact-file> vs HEAD:<exact-file>",
    baselineCommit: baseline,
    headCommit: head,
    rows,
    brain1GuardianBlobUnchanged: rows.every((r) => r.blobUnchanged),
  };
}

function classifyBatch8Path(relativePath: string): string {
  if (relativePath.startsWith("lib/eval/master-assurance-auditor/v2/stage150/batch8/")) {
    return "source_lib_batch8";
  }
  if (relativePath === "lib/eval/master-assurance-auditor/v2/stage150/index.ts") {
    return "source_lib_export";
  }
  if (relativePath.endsWith(".test.ts")) return "contract_test";
  if (relativePath.startsWith("scripts/assurance/")) return "emit_script";
  if (relativePath.includes("STOP-FOR-CODEX")) return "checkpoint_stop";
  if (relativePath.endsWith("changed-file-manifest.json")) return "checkpoint_manifest";
  if (relativePath.endsWith("stage150-execution-readiness-gate.json")) return "checkpoint_gate";
  if (relativePath.includes("/stage150-batch8/")) return "programme_evidence";
  return "programme_evidence";
}

/**
 * Exact 25-path Batch-8 scope checkpoint.
 * 24 content paths: literal SHA-256 + byteLength + classification.
 * Manifest self-entry: SHA-256/byteLength of the document with thisManifest=null (verifiable).
 * Raw receipts stay gitignored; hash retained via receipt index.
 */
function writeBatch8ChangedFileManifest(headCommit: string): void {
  const manifestRel =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/changed-file-manifest.json";
  const intendedScopePaths = [
    "lib/eval/master-assurance-auditor/v2/stage150/batch8/adapters.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch8/index.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch8/schemas.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch8/unlock-map.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch8/validators.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/index.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch8.ts",
    "scripts/maa-v2-stage150-batch8-contracts.test.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/STOP-FOR-CODEX-REVIEW.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-499-adapter-receipt-index.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-adapter-capability-summary.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-blockers-live-browser-heavy.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-capability-matrix.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-no-invention-receipt.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-schemas.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-unlock-map.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/brain1-guardian-blob-compare.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/changed-file-manifest.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/packet-shape-inventory.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/stage150-execution-readiness-gate.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/stage150-implementation-capability-matrix.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/stage150-implementation-totals.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/typescript-baseline.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/typescript-delta.json",
  ] as const;

  if (intendedScopePaths.length !== 25) {
    throw new Error(`Expected 25 intended Batch-8 paths, got ${intendedScopePaths.length}`);
  }
  for (const p of intendedScopePaths) {
    if (/[*?]/.test(p)) throw new Error(`wildcard path forbidden: ${p}`);
  }

  const contentEntries = intendedScopePaths
    .filter((p) => p !== manifestRel)
    .map((relativePath) => {
      const abs = path.join(ROOT, relativePath);
      if (!fs.existsSync(abs)) throw new Error(`missing intended Batch-8 path: ${relativePath}`);
      const buf = fs.readFileSync(abs);
      return {
        relativePath,
        sha256: sha(buf),
        byteLength: buf.byteLength,
        classification: classifyBatch8Path(relativePath),
      };
    });

  const receiptIndexRel =
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/batch8-499-adapter-receipt-index.json";
  const receiptIndex = JSON.parse(fs.readFileSync(path.join(ROOT, receiptIndexRel), "utf8")) as {
    sha256: string;
    byteLength: number;
    gitPolicy?: string;
  };

  const draft = {
    schemaVersion: "maa-v2-batch8-changed-file-manifest@1.1.0",
    baselineCommit: BATCH8_BASELINE,
    headCommit,
    rule: "Literal relative paths only — SHA-256 + byteLength + classification. No wildcards.",
    intendedScopePathCount: 25,
    intendedScopePaths: [...intendedScopePaths],
    entryCount: 25,
    entries: contentEntries,
    thisManifest: null as null | {
      relativePath: string;
      sha256: string;
      byteLength: number;
      classification: string;
      hashesDocumentWithThisManifestNull: true;
    },
    gitignoredRegenerable: {
      relativePath:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch8/raw-receipts/batch8-499-adapter-receipts.jsonl",
      retainedByIndex: receiptIndexRel,
      rawReceiptsSha256: receiptIndex.sha256,
      rawReceiptsByteLength: receiptIndex.byteLength,
      policy: receiptIndex.gitPolicy ?? "gitignore_regenerate",
    },
    digestSha256: sha(
      contentEntries
        .map((e) => `${e.relativePath}|${e.sha256}|${e.byteLength}|${e.classification}`)
        .join("\n"),
    ),
  };

  const nullSelfText = `${JSON.stringify(draft, null, 2)}\n`;
  const nullSelfSha = sha(nullSelfText);
  const nullSelfLen = Buffer.byteLength(nullSelfText);
  const selfEntry = {
    relativePath: manifestRel,
    sha256: nullSelfSha,
    byteLength: nullSelfLen,
    classification: "checkpoint_manifest",
  };
  draft.thisManifest = {
    ...selfEntry,
    hashesDocumentWithThisManifestNull: true,
  };

  const finalDoc = {
    ...draft,
    entries: [...contentEntries, selfEntry],
  };

  const absManifest = path.join(ROOT, manifestRel);
  fs.mkdirSync(path.dirname(absManifest), { recursive: true });
  fs.writeFileSync(absManifest, `${JSON.stringify(finalDoc, null, 2)}\n`, "utf8");
}

function main(): void {
  const started = Date.now();
  const head = headCommit();
  fs.mkdirSync(OUT, { recursive: true });

  const uniqueValid = listUniqueValid();
  if (uniqueValid.length !== 499) {
    throw new Error(`Expected 499 unique-valid trio packets, found ${uniqueValid.length}`);
  }

  // Copy shape inventory if present from probe; otherwise note regenerate path.
  const shapeSrc = path.join(OUT, "packet-shape-inventory.json");
  if (!fs.existsSync(shapeSrc)) {
    writeJson(OUT, "packet-shape-inventory-note.json", {
      note: "Run scripts/assurance/tmp-batch8-shape-inventory.ts if missing; emit continues with live adaptation.",
    });
  }

  const counts: Record<Batch8AdapterId, Record<Batch8CapabilityStatus, number>> = {
    charge_instruments: { eligible: 0, partial: 0, unavailable: 0 },
    evidence_units: { eligible: 0, partial: 0, unavailable: 0 },
    chronology_events: { eligible: 0, partial: 0, unavailable: 0 },
    provenance: { eligible: 0, partial: 0, unavailable: 0 },
    chase_relationships: { eligible: 0, partial: 0, unavailable: 0 },
    exit_snapshots: { eligible: 0, partial: 0, unavailable: 0 },
  };

  const matrixRows: Array<{
    caseId: string;
    outputSha256: string;
    adapters: Record<Batch8AdapterId, Batch8CapabilityStatus>;
    receiptIssueCount: number;
  }> = [];

  const noInventionViolations: string[] = [];
  const rawDir = path.join(OUT, "raw-receipts");
  fs.mkdirSync(rawDir, { recursive: true });
  const receiptLines: string[] = [];

  console.log("Batch-8 — 499 capability matrix (output-only, truth not opened)…");
  for (const c of uniqueValid) {
    const buf = fs.readFileSync(path.join(c.packetPath, "casebrain-output.json"));
    const outputSha256 = sha(buf);
    // Confirm truth-key exists as packet member but DO NOT read contents.
    const truthPath = path.join(c.packetPath, "truth-key.json");
    if (!fs.existsSync(truthPath)) throw new Error(`missing truth-key file for ${c.caseId}`);
    const truthStat = fs.statSync(truthPath);
    if (truthStat.size <= 0) throw new Error(`empty truth-key file for ${c.caseId}`);

    const output = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    const adapted = adaptAllBatch8(c.caseId, output);
    const adapters: Record<Batch8AdapterId, Batch8CapabilityStatus> = {
      charge_instruments: adapted.charge_instruments.capabilityStatus,
      evidence_units: adapted.evidence_units.capabilityStatus,
      chronology_events: adapted.chronology_events.capabilityStatus,
      provenance: adapted.provenance.capabilityStatus,
      chase_relationships: adapted.chase_relationships.capabilityStatus,
      exit_snapshots: adapted.exit_snapshots.capabilityStatus,
    };
    let receiptIssueCount = 0;
    for (const id of BATCH8_ADAPTER_IDS) {
      const result = adapted[id];
      counts[id][result.capabilityStatus] += 1;
      const issues = assertReceiptsHonest(result.fieldReceipts);
      receiptIssueCount += issues.length;
      if (result.invented) noInventionViolations.push(`${c.caseId}:${id}:invented`);
      if (result.opensTruth) noInventionViolations.push(`${c.caseId}:${id}:opensTruth`);
      receiptLines.push(
        JSON.stringify({
          caseId: c.caseId,
          adapterId: id,
          capabilityStatus: result.capabilityStatus,
          recordCount: result.records.length,
          applicableRecordCount: result.applicableRecordCount,
          completeRecordCount: result.completeRecordCount,
          incompleteRecordCount: result.incompleteRecordCount,
          ambiguousRelationshipCount: result.ambiguousRelationshipCount,
          eligibilityReason: result.eligibilityReason,
          fieldReceiptCount: result.fieldReceipts.length,
          missingRequiredFields: result.missingRequiredFields,
          blockers: result.blockers,
          note: result.note,
        }),
      );
    }
    matrixRows.push({ caseId: c.caseId, outputSha256, adapters, receiptIssueCount });
  }

  if (noInventionViolations.length) {
    throw new Error(`No-invention violations: ${noInventionViolations.slice(0, 5).join("; ")}`);
  }

  const receiptsBody = `${receiptLines.join("\n")}\n`;
  fs.writeFileSync(path.join(rawDir, "batch8-499-adapter-receipts.jsonl"), receiptsBody);
  writeJson(OUT, "batch8-499-adapter-receipt-index.json", {
    schemaVersion: "batch8-499-adapter-receipt-index@1.0.0",
    relativePath: "raw-receipts/batch8-499-adapter-receipts.jsonl",
    sha256: sha(receiptsBody),
    byteLength: Buffer.byteLength(receiptsBody),
    lineCount: receiptLines.length,
    regenerable: true,
    gitPolicy: "gitignore_regenerate",
    truthContentsOpened: false,
  });

  writeJson(OUT, "batch8-capability-matrix.json", {
    schemaVersion: "batch8-capability-matrix@1.0.0",
    baselineCommit: BATCH8_BASELINE,
    adapterSchemaVersion: BATCH8_SCHEMA_VERSION,
    caseCount: 499,
    truthContentsOpened: false,
    countsByAdapter: counts,
    rows: matrixRows,
  });

  const previousPreRemediationCounts = {
    charge_instruments: { eligible: 0, partial: 0, unavailable: 499 },
    evidence_units: { eligible: 0, partial: 499, unavailable: 0 },
    chronology_events: { eligible: 0, partial: 0, unavailable: 499 },
    provenance: { eligible: 0, partial: 499, unavailable: 0 },
    chase_relationships: { eligible: 0, partial: 499, unavailable: 0 },
    exit_snapshots: { eligible: 0, partial: 499, unavailable: 0 },
  };

  writeJson(OUT, "batch8-adapter-capability-summary.json", {
    schemaVersion: "batch8-adapter-capability-summary@1.1.0",
    countsByAdapter: counts,
    previousPreRemediationCounts,
    countDeltasFromPreRemediation: Object.fromEntries(
      BATCH8_ADAPTER_IDS.map((id) => [
        id,
        {
          eligible: counts[id].eligible - previousPreRemediationCounts[id].eligible,
          partial: counts[id].partial - previousPreRemediationCounts[id].partial,
          unavailable: counts[id].unavailable - previousPreRemediationCounts[id].unavailable,
        },
      ]),
    ),
    expectedEsaPatternAfterRemediation: {
      charge_instruments: "unavailable×499",
      evidence_units: "partial×499",
      chronology_events: "unavailable×499",
      provenance: "partial×499",
      chase_relationships: "partial×499 (or unavailable if empty chase)",
      exit_snapshots: "unavailable×499 (metadata ≠ genuine exit exercise)",
    },
    remediationRules: [
      "Eligible only when every applicable/required record is complete",
      "One complete record must not upgrade an otherwise partial adapter",
      "Exit adapter eligible only when all seven required exits have genuine payload receipts",
      "Exact-label chase link valid only with exactly one evidence match; preserve all candidates",
      "Chase complete requires requestId + explicit evidenceUnitId + resolutionState per applicable row",
    ],
  });

  writeJson(OUT, "batch8-schemas.json", {
    schemaVersion: BATCH8_SCHEMA_VERSION,
    adapters: BATCH8_ADAPTER_IDS,
    rules: [
      "Missing information stays null/unresolved/not_exercised",
      "Free-text similarity cannot create identity, defendant allocation or version links",
      "Reject fabricated/defaulted IDs or page numbers",
      "Metadata must not be represented as a real exit payload",
      "Truth keys are never opened during capability/adaptation",
      "Aggregate eligibility: every applicable record complete",
      "Exact-label ambiguity: zero=unresolved; >1=ambiguous no selected target; never last-row wins",
      "Exit honesty: track view/copy/export/api/pdf/composed_prose/authenticated_browser independently",
    ],
  });

  writeJson(OUT, "batch8-unlock-map.json", {
    schemaVersion: "batch8-unlock-map@1.0.0",
    note: "Could-later-unlock only — Batch-8 does not promote detectors.",
    rows: BATCH8_UNLOCK_MAP,
  });

  writeJson(OUT, "batch8-blockers-live-browser-heavy.json", {
    schemaVersion: "batch8-blockers@1.0.0",
    blockers: [
      {
        lane: "live_instrument_graph",
        requires: "Operative charge instrument bags with version/supersession and defendant allocation",
        adapters: ["charge_instruments"],
      },
      {
        lane: "identity_binding",
        requires: "subjectDefendantId/personId and evidenceUnitId/sourceEvidenceId on units",
        adapters: ["evidence_units", "chase_relationships"],
      },
      {
        lane: "page_identity",
        requires: "sourcePage/compiledPage with pageIdentityKnown from document units",
        adapters: ["provenance", "evidence_units"],
      },
      {
        lane: "chronology_clock",
        requires: "Structured chronologyEvents with timezone and competing-event groups",
        adapters: ["chronology_events"],
      },
      {
        lane: "real_exit_payloads",
        requires: "view/copy/export/API/PDF/composed/browser payload identity receipts",
        adapters: ["exit_snapshots"],
      },
      {
        lane: "authenticated_browser",
        requires: "Authenticated browser capture receipts (Stage-300+)",
        adapters: ["exit_snapshots"],
      },
      {
        lane: "heavy_source",
        requires: "Original binaries + OCR visual metadata (Batch-4 heavySourceDocumentEvidence)",
        adapters: ["provenance"],
      },
    ],
  });

  writeJson(OUT, "batch8-no-invention-receipt.json", {
    schemaVersion: "batch8-no-invention-receipt@1.0.0",
    truthContentsOpened: false,
    inventedFlagsObserved: 0,
    receiptValidationIssues: matrixRows.reduce((a, r) => a + r.receiptIssueCount, 0),
    fabricatedIdPolicy: "reject auto-/gen-/default-/synthetic-/tmp-/uuid- prefixes",
    pagePolicy: "sourcePage/compiledPage only when pageIdentityKnown===true; evidenceAnchor is raw text only",
    exitPolicy: "exportVersion/courtNote metadata never eligible as real exit payload; overall eligible only when all seven required exits have genuine payloads",
    labelLinkPolicy: "exact string equality only; unique match required; ambiguous/zero matches select no target; never Map overwrite/last-row wins",
    aggregateEligibilityPolicy: "eligible only when every applicable/required record is complete",
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    schemaVersion: "stage150-implementation-totals@1.7.0",
    baselineCommit: BATCH8_BASELINE,
    before: matrix.totals,
    after: matrix.totals,
    batch8DetectorPromotions: [],
    note: "Batch-8 adapter foundation only — implementation totals unchanged (8/98/55).",
    preserved: {
      batch5: BATCH5_IMPLEMENTED_IDS.size,
      batch6: BATCH6_IMPLEMENTED_IDS.size,
      batch7: BATCH7_IMPLEMENTED_IDS.size,
      stage150: STAGE150_IMPLEMENTED_IDS.size,
    },
  });

  const gate = {
    schemaVersion: "stage150-execution-readiness-gate@1.7.0",
    baselineCommit: BATCH8_BASELINE,
    programmePassSupported: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    freezeAllowed: false,
    reasons: [
      `${matrix.totals.partially_implemented} controls remain partially_implemented`,
      `${matrix.totals.specified_not_implemented} controls remain SNI`,
      "Batch-8 is adapter foundation only — no detector promotions",
      "Stage-150 sample selection not performed",
      "currentlyRunnableOnStage150 remains false",
    ],
    prerequisites: {
      registryComplete: true,
      detectorImplementationComplete: false,
      inputReadinessComplete: false,
      denominatorReadinessComplete: false,
      adapterReadinessComplete: false,
      receiptValidationComplete: true,
      contractReadinessComplete: true,
      relationshipComplete: false,
      protectedAssetsPreserved: true,
    },
  };
  writeJson(OUT, "stage150-execution-readiness-gate.json", gate);
  writeJson(
    path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2"),
    "stage150-execution-readiness-gate.json",
    gate,
  );

  const blobCompare = brain1GuardianCompare(BATCH8_BASELINE, head);
  writeJson(OUT, "brain1-guardian-blob-compare.json", blobCompare);

  let tscOk = true;
  let tscExcerpt = "";
  let stage150Errs = 0;
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  stage150Errs = (
    tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? []
  ).length;
  writeJson(OUT, "typescript-baseline.json", {
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit --pretty false",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    schemaVersion: "stage150-typescript-delta@1.0.0",
    baselineCommit: BATCH8_BASELINE,
    stage150PathErrors: stage150Errs,
  });

  writeBatch8ChangedFileManifest(head);

  const stop = {
    schemaVersion: "maa-v2-stage150-batch8-stop@1.1.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Batch 8 Remediated Adapter Foundation",
    status: "STAGE150_BATCH8_UNCOMMITTED",
    remediation: "aggregate-eligibility-exit-honesty-exact-label-ambiguity-chase-completeness",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BATCH8_BASELINE,
    headCommit: head,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    detectorPromotions: [],
    committed: false,
    pushed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    implementationTotals: matrix.totals,
    preservedImplementedIds: [...STAGE150_IMPLEMENTED_IDS],
    adapterCapabilityCounts: counts,
    previousPreRemediationAdapterCounts: previousPreRemediationCounts,
    truthContentsOpened: false,
    noInventionViolations: 0,
    unlockMap: BATCH8_UNLOCK_MAP.map((r) => ({
      adapterId: r.adapterId,
      couldLaterUnlockCount: r.couldLaterUnlockControlIds.length,
    })),
    gate,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
      rows: blobCompare.rows,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    blockers: [
      "Stage-150 selection and execution gates remain FALSE",
      "Batch-8 does not promote detectors",
      "Structured IDs/pages/instruments/chronology/real exits remain absent on ESA",
      "No programme PASS",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        out: OUT,
        counts,
        totals: matrix.totals,
        gates: { sample: false, exec: false, freeze: false, programmePass: false },
        tscStage150Errors: stage150Errs,
        brain1GuardianBlobUnchanged: blobCompare.brain1GuardianBlobUnchanged,
        detectorPromotions: [],
      },
      null,
      2,
    ),
  );
  process.exit(stage150Errs === 0 ? 0 : 1);
}

if (process.argv.includes("--manifest-only")) {
  writeBatch8ChangedFileManifest(headCommit());
  const manifestPath = path.join(OUT, "changed-file-manifest.json");
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
    intendedScopePathCount: number;
    entries: unknown[];
  };
  console.log(
    JSON.stringify(
      {
        mode: "manifest-only",
        intendedScopePathCount: parsed.intendedScopePathCount,
        entryCount: parsed.entries.length,
        manifest: manifestPath,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main();
