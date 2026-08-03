/**
 * Evidence layout — regenerable bulk out of git; hashes/indexes retained.
 */

import fs from "node:fs";
import path from "node:path";

import {
  S3000_ARTIFACT_ROOT,
  S3000_BULK_EVIDENCE_REL,
  S3000_EVIDENCE_INDEX_SCHEMA,
  S3000_INDEX_REL,
} from "./constants";
import { sha256File, sha256Hex } from "./hashes";
import type { EvidenceIndex, EvidenceIndexEntry } from "./types";

export type EvidencePaths = {
  artifactRootRel: string;
  bulkRootRel: string;
  indexRootRel: string;
  bulkAbs: string;
  indexAbs: string;
  checkpointLedgerAbs: string;
  receiptsJsonlAbs: string;
  decisionCardsJsonlAbs: string;
  unitsJsonlAbs: string;
  candidateFreezeAbs: string;
  summaryAbs: string;
  evidenceIndexAbs: string;
};

export function buildEvidencePaths(
  repoRoot: string,
  runId: string,
  artifactRootRel: string = S3000_ARTIFACT_ROOT,
): EvidencePaths {
  const bulkRootRel = `${artifactRootRel}/bulk-evidence/${runId}`;
  const indexRootRel = `${artifactRootRel}/indexes/${runId}`;
  const bulkAbs = path.join(repoRoot, bulkRootRel);
  const indexAbs = path.join(repoRoot, indexRootRel);
  return {
    artifactRootRel,
    bulkRootRel,
    indexRootRel,
    bulkAbs,
    indexAbs,
    checkpointLedgerAbs: path.join(bulkAbs, "checkpoint-ledger.jsonl"),
    receiptsJsonlAbs: path.join(bulkAbs, "machine-receipts.jsonl"),
    decisionCardsJsonlAbs: path.join(indexAbs, "decision-cards.jsonl"),
    unitsJsonlAbs: path.join(bulkAbs, "evidence-units.jsonl"),
    candidateFreezeAbs: path.join(bulkAbs, "candidate-freeze.json"),
    summaryAbs: path.join(indexAbs, "runner-summary.json"),
    evidenceIndexAbs: path.join(indexAbs, "evidence-index.json"),
  };
}

export function ensureEvidenceDirs(paths: EvidencePaths): void {
  fs.mkdirSync(paths.bulkAbs, { recursive: true });
  fs.mkdirSync(paths.indexAbs, { recursive: true });
}

function entryFor(
  repoRoot: string,
  absPath: string,
  opts: { regenerable: boolean; retainedInGit: boolean; kind: EvidenceIndexEntry["kind"] },
): EvidenceIndexEntry | null {
  if (!fs.existsSync(absPath)) return null;
  const stat = fs.statSync(absPath);
  const relativePath = path.relative(repoRoot, absPath).replace(/\\/g, "/");
  return {
    relativePath,
    sha256: sha256File(absPath),
    byteLength: stat.size,
    regenerable: opts.regenerable,
    retainedInGit: opts.retainedInGit,
    kind: opts.kind,
  };
}

export function writeEvidenceIndex(
  repoRoot: string,
  runId: string,
  paths: EvidencePaths,
): EvidenceIndex {
  const entries: EvidenceIndexEntry[] = [];
  const bulkFiles: Array<[string, EvidenceIndexEntry["kind"]]> = [
    [paths.checkpointLedgerAbs, "jsonl"],
    [paths.receiptsJsonlAbs, "jsonl"],
    [paths.unitsJsonlAbs, "jsonl"],
    [paths.candidateFreezeAbs, "json"],
  ];
  for (const [abs, kind] of bulkFiles) {
    const e = entryFor(repoRoot, abs, {
      regenerable: true,
      retainedInGit: false,
      kind,
    });
    if (e) entries.push(e);
  }
  const indexFiles: Array<[string, EvidenceIndexEntry["kind"]]> = [
    [paths.decisionCardsJsonlAbs, "jsonl"],
    [paths.summaryAbs, "json"],
  ];
  for (const [abs, kind] of indexFiles) {
    const e = entryFor(repoRoot, abs, {
      regenerable: false,
      retainedInGit: true,
      kind,
    });
    if (e) entries.push(e);
  }

  const index: EvidenceIndex = {
    schemaVersion: S3000_EVIDENCE_INDEX_SCHEMA,
    runId,
    bulkRootRel: paths.bulkRootRel.replace(/\\/g, "/"),
    indexRootRel: paths.indexRootRel.replace(/\\/g, "/"),
    entries,
  };
  fs.mkdirSync(path.dirname(paths.evidenceIndexAbs), { recursive: true });
  // Write index without self-hash; then note path is retained.
  fs.writeFileSync(paths.evidenceIndexAbs, JSON.stringify(index, null, 2) + "\n");
  return index;
}

/** Default gitignore patterns for regenerable bulk evidence. */
export const S3000_BULK_GITIGNORE_PATTERNS = [
  `${S3000_BULK_EVIDENCE_REL}/`,
  `${S3000_ARTIFACT_ROOT}/**/checkpoint-ledger.jsonl`,
  `${S3000_ARTIFACT_ROOT}/**/machine-receipts.jsonl`,
  `${S3000_ARTIFACT_ROOT}/**/evidence-units.jsonl`,
  `${S3000_ARTIFACT_ROOT}/**/candidate-freeze.json`,
  `${S3000_ARTIFACT_ROOT}/**/candidate-freeze.jsonl`,
] as const;

export function indexContentFingerprint(index: EvidenceIndex): string {
  return sha256Hex(JSON.stringify(index.entries));
}

export { S3000_INDEX_REL };
