import assert from "node:assert/strict";
import crypto from "node:crypto";

type Phase =
  | "blind_inputs_loaded"
  | "evaluated"
  | "ledger_persisted"
  | "ledger_hashed"
  | "metadata_hashed"
  | "pre_truth_receipt"
  | "truth_opened"
  | "ledger_reverified"
  | "triaged"
  | "stopped";

const required: Phase[] = [
  "blind_inputs_loaded",
  "evaluated",
  "ledger_persisted",
  "ledger_hashed",
  "metadata_hashed",
  "pre_truth_receipt",
  "truth_opened",
  "ledger_reverified",
  "triaged",
  "stopped",
];

function sha(body: Buffer): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function runSequence(mutateAfterTruth = false): {
  phases: Phase[];
  ledgerHashBefore: string;
  ledgerHashAfter: string;
} {
  const phases: Phase[] = [];
  let ledger = Buffer.from("");
  let before = "";
  let after = "";
  const advance = (phase: Phase) => {
    const expected = required[phases.length];
    if (phase !== expected) throw new Error(`OUT_OF_ORDER:${phase}:expected=${expected}`);
    phases.push(phase);
  };
  advance("blind_inputs_loaded");
  advance("evaluated");
  advance("ledger_persisted");
  before = sha(ledger);
  advance("ledger_hashed");
  advance("metadata_hashed");
  advance("pre_truth_receipt");
  advance("truth_opened");
  if (mutateAfterTruth) ledger = Buffer.from("mutated\n");
  after = sha(ledger);
  if (before !== after) throw new Error("LEDGER_CHANGED_AFTER_TRUTH_OPEN");
  advance("ledger_reverified");
  advance("triaged");
  advance("stopped");
  return { phases, ledgerHashBefore: before, ledgerHashAfter: after };
}

let earlyTruthRefused = false;
try {
  const phases: Phase[] = ["blind_inputs_loaded", "evaluated"];
  const expected = required[phases.length];
  if (expected !== "truth_opened") throw new Error(`OUT_OF_ORDER:truth_opened:expected=${expected}`);
} catch {
  earlyTruthRefused = true;
}

let mutationRefused = false;
try {
  runSequence(true);
} catch (error) {
  mutationRefused = /LEDGER_CHANGED_AFTER_TRUTH_OPEN/.test(String(error));
}

const positive = runSequence(false);
const result = {
  ok:
    positive.phases.length === required.length &&
    positive.ledgerHashBefore === positive.ledgerHashAfter &&
    earlyTruthRefused &&
    mutationRefused,
  positiveOrder: positive.phases,
  earlyTruthRefused,
  postTruthLedgerMutationRefused: mutationRefused,
};
assert.equal(result.ok, true, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
