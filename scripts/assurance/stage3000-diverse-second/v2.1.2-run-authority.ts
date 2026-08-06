import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const RUN_AUTHORITY_SCHEMA = "stage3000-v2.1.2-run-authority@1.0.0" as const;

export type RunLock = {
  schemaVersion: typeof RUN_AUTHORITY_SCHEMA;
  pid: number;
  runId: string;
  head: string;
  membership: string;
  startedAt: string;
  childRoot: string;
};

function atomicWriteBytes(filePath: string, body: Buffer): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const fd = fs.openSync(tmp, "wx");
  try {
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, filePath);
}

export function atomicWriteJson(filePath: string, data: unknown): void {
  atomicWriteBytes(filePath, Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8"));
}

export function atomicWriteText(filePath: string, text: string): void {
  atomicWriteBytes(filePath, Buffer.from(text, "utf8"));
}

export function atomicPublish(tempPath: string, finalPath: string): void {
  if (!fs.existsSync(tempPath)) {
    atomicWriteText(tempPath, "");
  }
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  if (fs.existsSync(finalPath)) {
    throw new Error(`REFUSE_OVERWRITE_FINAL_EVIDENCE:${finalPath}`);
  }
  fs.renameSync(tempPath, finalPath);
}

export function processIsLive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readRunLock(lockPath: string): RunLock | null {
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8")) as RunLock;
  } catch {
    return null;
  }
}

export function acquireRunLock(lockPath: string, lock: RunLock): void {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const fd = fs.openSync(lockPath, "wx");
    try {
      fs.writeFileSync(fd, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch (error) {
    const existing = readRunLock(lockPath);
    if (existing && processIsLive(existing.pid)) {
      throw new Error(
        `LIVE_RUN_LOCK_REFUSED:pid=${existing.pid}:runId=${existing.runId}:startedAt=${existing.startedAt}`,
      );
    }
    throw new Error(
      `STALE_OR_INVALID_RUN_LOCK_REQUIRES_EXPLICIT_FAILED_RUN_RECEIPT:${lockPath}:${String(error)}`,
    );
  }
}

export function releaseRunLockAfterReceipt(args: {
  lockPath: string;
  receiptPath: string;
  runId: string;
}): void {
  if (!fs.existsSync(args.receiptPath)) {
    throw new Error(`REFUSE_LOCK_REMOVAL_WITHOUT_STOP_OR_FAILED_RECEIPT:${args.receiptPath}`);
  }
  const lock = readRunLock(args.lockPath);
  if (!lock || lock.runId !== args.runId || lock.pid !== process.pid) {
    throw new Error(`REFUSE_FOREIGN_LOCK_REMOVAL:${args.lockPath}`);
  }
  fs.unlinkSync(args.lockPath);
}

export function appendResumeSafeJsonl(tempPath: string, row: unknown): void {
  fs.mkdirSync(path.dirname(tempPath), { recursive: true });
  const fd = fs.openSync(tempPath, "a");
  try {
    fs.writeSync(fd, `${JSON.stringify(row)}\n`, null, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function sha256(body: Buffer | string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${canonicalJson(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
