import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acquireRunLock,
  atomicPublish,
  atomicWriteJson,
  readRunLock,
  releaseRunLockAfterReceipt,
  type RunLock,
} from "./v2.1.2-run-authority";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v212-run-authority-"));
const lockPath = path.join(tempRoot, "run.lock");
const receiptPath = path.join(tempRoot, "STOP.json");
const finalPath = path.join(tempRoot, "ledger.jsonl");
const tempPath = path.join(tempRoot, "ledger.jsonl.tmp");
const first: RunLock = {
  schemaVersion: "stage3000-v2.1.2-run-authority@1.0.0",
  pid: process.pid,
  runId: "contract-first",
  head: "0326cc44a724c01aeab162eed8b8806dd8a44345",
  membership: "membership",
  startedAt: new Date().toISOString(),
  childRoot: "contract",
};

let secondRefused = false;
let lockRemovalWithoutReceiptRefused = false;
let atomicOverwriteRefused = false;
try {
  acquireRunLock(lockPath, first);
  assert.equal(readRunLock(lockPath)?.runId, first.runId);
  try {
    acquireRunLock(lockPath, { ...first, runId: "contract-second" });
  } catch (error) {
    secondRefused = /LIVE_RUN_LOCK_REFUSED/.test(String(error));
  }
  try {
    releaseRunLockAfterReceipt({ lockPath, receiptPath, runId: first.runId });
  } catch (error) {
    lockRemovalWithoutReceiptRefused = /REFUSE_LOCK_REMOVAL_WITHOUT/.test(String(error));
  }

  fs.writeFileSync(tempPath, "one\n", "utf8");
  atomicPublish(tempPath, finalPath);
  fs.writeFileSync(tempPath, "two\n", "utf8");
  try {
    atomicPublish(tempPath, finalPath);
  } catch (error) {
    atomicOverwriteRefused = /REFUSE_OVERWRITE_FINAL_EVIDENCE/.test(String(error));
  }

  atomicWriteJson(receiptPath, { ok: true });
  releaseRunLockAfterReceipt({ lockPath, receiptPath, runId: first.runId });
  assert.equal(fs.existsSync(lockPath), false);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const result = {
  ok: secondRefused && lockRemovalWithoutReceiptRefused && atomicOverwriteRefused,
  secondRunnerRefused: secondRefused,
  lockRemovalWithoutReceiptRefused,
  atomicFinalOverwriteRefused: atomicOverwriteRefused,
};
assert.equal(result.ok, true, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
