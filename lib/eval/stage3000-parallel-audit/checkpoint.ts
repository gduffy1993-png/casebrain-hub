/**
 * Checkpoint / resume — append-only ledger with idempotent keys.
 * Resume never duplicates ledger entries for the same key.
 */

import fs from "node:fs";
import path from "node:path";

import { S3000_CHECKPOINT_SCHEMA } from "./constants";
import { ledgerKey, sha256Hex } from "./hashes";
import { appendJsonl, iterateJsonl } from "./jsonl-stream";
import type { CheckpointRecord } from "./types";
import type { RunnerPhase } from "./constants";

export type CheckpointStore = {
  ledgerAbsPath: string;
  knownKeys: Set<string>;
  recordsWritten: number;
  duplicatesSkipped: number;
};

export async function openCheckpointStore(
  ledgerAbsPath: string,
  resume: boolean,
): Promise<CheckpointStore> {
  const knownKeys = new Set<string>();
  if (resume && fs.existsSync(ledgerAbsPath)) {
    for await (const row of iterateJsonl<CheckpointRecord>(ledgerAbsPath)) {
      if (row.ledgerKey) knownKeys.add(row.ledgerKey);
    }
  } else if (!resume && fs.existsSync(ledgerAbsPath)) {
    // Fresh run — truncate ledger
    fs.writeFileSync(ledgerAbsPath, "");
  }
  fs.mkdirSync(path.dirname(ledgerAbsPath), { recursive: true });
  return {
    ledgerAbsPath,
    knownKeys,
    recordsWritten: 0,
    duplicatesSkipped: 0,
  };
}

export function appendCheckpoint(
  store: CheckpointStore,
  input: {
    runId: string;
    phase: RunnerPhase;
    caseId: string | null;
    controlId: string | null;
    content: unknown;
    payloadRelPath?: string | null;
    recordedAt?: string;
  },
): CheckpointRecord | null {
  const contentSha256 = sha256Hex(JSON.stringify(input.content));
  const key = ledgerKey({
    runId: input.runId,
    phase: input.phase,
    caseId: input.caseId,
    controlId: input.controlId,
    contentSha256,
  });
  if (store.knownKeys.has(key)) {
    store.duplicatesSkipped += 1;
    return null;
  }
  const record: CheckpointRecord = {
    schemaVersion: S3000_CHECKPOINT_SCHEMA,
    ledgerKey: key,
    runId: input.runId,
    phase: input.phase,
    caseId: input.caseId,
    controlId: input.controlId,
    contentSha256,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    payloadRelPath: input.payloadRelPath ?? null,
  };
  appendJsonl(store.ledgerAbsPath, [record]);
  store.knownKeys.add(key);
  store.recordsWritten += 1;
  return record;
}

export function hasCheckpoint(
  store: CheckpointStore,
  input: {
    runId: string;
    phase: RunnerPhase;
    caseId: string | null;
    controlId: string | null;
    content: unknown;
  },
): boolean {
  const contentSha256 = sha256Hex(JSON.stringify(input.content));
  const key = ledgerKey({
    runId: input.runId,
    phase: input.phase,
    caseId: input.caseId,
    controlId: input.controlId,
    contentSha256,
  });
  return store.knownKeys.has(key);
}
