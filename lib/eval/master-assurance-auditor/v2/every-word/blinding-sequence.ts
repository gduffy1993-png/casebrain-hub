/**
 * Mechanically verifiable actual-before-truth blinding sequence.
 * Persists exact per-case pre-truth ledger bytes, then hashes those bytes, then opens truth.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type BlindingSequenceEvent =
  | { event: "output_read"; at: string; outputFileHash: string }
  | { event: "leaf_inventory_complete"; at: string; leafCount: number }
  | {
      event: "occurrence_ledger_persisted";
      at: string;
      persistedPath: string;
      occurrenceLedgerHash: string;
      occurrenceCount: number;
      note: string;
    }
  | { event: "truth_open"; at: string; truthPath: string | null; note: string }
  | { event: "truth_hashed"; at: string; truthKeyHash: string | null }
  | { event: "comparison_start"; at: string };

export type BlindingSequenceReceipt = {
  schemaVersion: "actual-before-truth-sequence@1.1.0";
  caseId: string;
  ordering: string[];
  events: BlindingSequenceEvent[];
  outputFileHash: string;
  preTruthOccurrenceLedgerHash: string;
  persistedLedgerPath: string;
  truthKeyHash: string | null;
  proof: {
    truthOpenedAfterCaptureComplete: boolean;
    comparisonStartedAfterTruthHash: boolean;
    hashIsOfPersistedBytes: true;
    booleanAloneInsufficient: true;
  };
};

function sha256(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Capture sequence: parse output → inventory → persist ledger bytes → hash persisted bytes → open truth.
 */
export function runBlindingCaptureSequence(args: {
  caseId: string;
  packetAbsDir: string;
  occurrenceLedgerLines: string[];
  /** Absolute path where exact pre-truth ledger bytes are written before truth open. */
  persistLedgerPath: string;
  leafCount?: number;
}): {
  receipt: BlindingSequenceReceipt;
  output: Record<string, unknown>;
  truth: Record<string, unknown> | null;
} {
  const outputPath = path.join(args.packetAbsDir, "casebrain-output.json");
  const outputRaw = fs.readFileSync(outputPath);
  const outputFileHash = sha256(outputRaw);
  const events: BlindingSequenceEvent[] = [];
  const ordering: string[] = [];

  const push = (e: BlindingSequenceEvent) => {
    events.push(e);
    ordering.push(e.event);
  };

  push({ event: "output_read", at: nowIso(), outputFileHash });

  const output = JSON.parse(outputRaw.toString("utf8")) as Record<string, unknown>;
  push({
    event: "leaf_inventory_complete",
    at: nowIso(),
    leafCount: args.leafCount ?? args.occurrenceLedgerLines.length,
  });

  const ledgerBody =
    args.occurrenceLedgerLines.join("\n") + (args.occurrenceLedgerLines.length ? "\n" : "");
  fs.mkdirSync(path.dirname(args.persistLedgerPath), { recursive: true });
  fs.writeFileSync(args.persistLedgerPath, ledgerBody, "utf8");
  const persistedBytes = fs.readFileSync(args.persistLedgerPath);
  const occurrenceLedgerHash = sha256(persistedBytes);
  push({
    event: "occurrence_ledger_persisted",
    at: nowIso(),
    persistedPath: args.persistLedgerPath,
    occurrenceLedgerHash,
    occurrenceCount: args.occurrenceLedgerLines.length,
    note: "Exact pre-truth ledger bytes written to disk; hash is of those persisted bytes.",
  });

  const truthPath = path.join(args.packetAbsDir, "truth-key.json");
  let truth: Record<string, unknown> | null = null;
  let truthKeyHash: string | null = null;
  if (fs.existsSync(truthPath)) {
    push({
      event: "truth_open",
      at: nowIso(),
      truthPath: "truth-key.json",
      note: "Opened only after occurrence ledger persisted and hashed from disk.",
    });
    const truthRaw = fs.readFileSync(truthPath);
    truthKeyHash = sha256(truthRaw);
    truth = JSON.parse(truthRaw.toString("utf8")) as Record<string, unknown>;
    push({ event: "truth_hashed", at: nowIso(), truthKeyHash });
  } else {
    push({
      event: "truth_open",
      at: nowIso(),
      truthPath: null,
      note: "No truth-key.json on packet; sequence still records post-persist gate.",
    });
    push({ event: "truth_hashed", at: nowIso(), truthKeyHash: null });
  }

  push({ event: "comparison_start", at: nowIso() });

  const truthOpenIdx = ordering.indexOf("truth_open");
  const ledgerIdx = ordering.indexOf("occurrence_ledger_persisted");
  const comparisonIdx = ordering.indexOf("comparison_start");
  const truthHashIdx = ordering.indexOf("truth_hashed");

  return {
    output,
    truth,
    receipt: {
      schemaVersion: "actual-before-truth-sequence@1.1.0",
      caseId: args.caseId,
      ordering,
      events,
      outputFileHash,
      preTruthOccurrenceLedgerHash: occurrenceLedgerHash,
      persistedLedgerPath: args.persistLedgerPath,
      truthKeyHash,
      proof: {
        truthOpenedAfterCaptureComplete: truthOpenIdx > ledgerIdx && ledgerIdx >= 0,
        comparisonStartedAfterTruthHash: comparisonIdx > truthHashIdx && truthHashIdx >= 0,
        hashIsOfPersistedBytes: true,
        booleanAloneInsufficient: true,
      },
    },
  };
}
