/**
 * Executable evidence retention writer — streaming deterministic JSONL with
 * interrupt checkpoint / resume. Never rewrites frozen evidence corpora.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const RETENTION_WRITER_SCHEMA = "maa-v2-evidence-retention-writer@1.0.0" as const;

/** Stable field order for every receipt line (exactly one object per line). */
export const RECEIPT_FIELD_ORDER = [
  "schemaVersion",
  "receiptId",
  "ordinal",
  "controlId",
  "caseId",
  "probeStatus",
  "namedControlExerciseStatus",
  "sha256Payload",
  "emittedAtEpochMs",
] as const;

export type RetentionReceipt = {
  schemaVersion: typeof RETENTION_WRITER_SCHEMA;
  receiptId: string;
  ordinal: number;
  controlId: string;
  caseId: string;
  probeStatus: string;
  namedControlExerciseStatus: string;
  sha256Payload: string;
  emittedAtEpochMs: number;
};

export type RetentionCheckpoint = {
  schemaVersion: "maa-v2-retention-checkpoint@1.0.0";
  jsonlPath: string;
  nextOrdinal: number;
  writtenReceiptIds: string[];
  byteLengthSoFar: number;
  lineCountSoFar: number;
};

export type RetentionFinalizeResult = {
  jsonlPath: string;
  sha256: string;
  byteLength: number;
  lineCount: number;
  gzipPath?: string;
  gzipSha256?: string;
  gzipByteLength?: number;
  indexEntry: {
    relativePath: string;
    sha256: string;
    byteLength: number;
    lineCount: number;
    regenerable: true;
    gitPolicy: "gitignore_regenerate";
  };
};

/** Serialize one receipt with stable key order → single JSONL line (no trailing spaces). */
export function serializeReceiptLine(receipt: RetentionReceipt): string {
  const ordered: Record<string, unknown> = {};
  for (const k of RECEIPT_FIELD_ORDER) {
    ordered[k] = receipt[k];
  }
  return `${JSON.stringify(ordered)}\n`;
}

export function buildRetentionReceipt(
  partial: Omit<RetentionReceipt, "schemaVersion"> & { schemaVersion?: string },
): RetentionReceipt {
  return {
    schemaVersion: RETENTION_WRITER_SCHEMA,
    receiptId: partial.receiptId,
    ordinal: partial.ordinal,
    controlId: partial.controlId,
    caseId: partial.caseId,
    probeStatus: partial.probeStatus,
    namedControlExerciseStatus: partial.namedControlExerciseStatus,
    sha256Payload: partial.sha256Payload,
    emittedAtEpochMs: partial.emittedAtEpochMs,
  };
}

/**
 * Deterministic gzip: force mtime=0 and OS=255 so bytes are stable across platforms.
 */
export function gzipDeterministic(buf: Buffer): Buffer {
  return gzipDeterministicFixed(buf);
}

/** Produce deterministic gzip by forcing mtime and OS in the gzip header. */
export function gzipDeterministicFixed(buf: Buffer): Buffer {
  const raw = zlib.gzipSync(buf, { level: 9 });
  const out = Buffer.from(raw);
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[9] = 255;
  return out;
}

export class StreamingReceiptWriter {
  private readonly jsonlPath: string;
  private readonly checkpointPath: string;
  private fd: number | null = null;
  private nextOrdinal = 0;
  private writtenIds = new Set<string>();
  private byteLength = 0;
  private lineCount = 0;
  private closed = false;

  constructor(jsonlPath: string, checkpointPath?: string) {
    this.jsonlPath = jsonlPath;
    this.checkpointPath =
      checkpointPath ?? `${jsonlPath}.checkpoint.json`;
  }

  /** Start a clean run (truncates prior regenerable output — never call on frozen evidence). */
  openClean(): void {
    fs.mkdirSync(path.dirname(this.jsonlPath), { recursive: true });
    this.fd = fs.openSync(this.jsonlPath, "w");
    this.nextOrdinal = 0;
    this.writtenIds = new Set();
    this.byteLength = 0;
    this.lineCount = 0;
    this.closed = false;
    this.writeCheckpoint();
  }

  /** Resume after interruption: reopen append, skip already-written receiptIds. */
  openResume(): void {
    fs.mkdirSync(path.dirname(this.jsonlPath), { recursive: true });
    if (!fs.existsSync(this.checkpointPath) || !fs.existsSync(this.jsonlPath)) {
      this.openClean();
      return;
    }
    const cp = JSON.parse(fs.readFileSync(this.checkpointPath, "utf8")) as RetentionCheckpoint;
    this.nextOrdinal = cp.nextOrdinal;
    this.writtenIds = new Set(cp.writtenReceiptIds);
    this.byteLength = cp.byteLengthSoFar;
    this.lineCount = cp.lineCountSoFar;
    this.fd = fs.openSync(this.jsonlPath, "a");
    this.closed = false;
  }

  getNextOrdinal(): number {
    return this.nextOrdinal;
  }

  hasReceiptId(id: string): boolean {
    return this.writtenIds.has(id);
  }

  /**
   * Append one receipt. Skips duplicates by receiptId (resume-safe).
   * Returns false if skipped as duplicate.
   */
  writeReceipt(receipt: RetentionReceipt): boolean {
    if (this.closed || this.fd == null) {
      throw new Error("StreamingReceiptWriter is closed");
    }
    if (this.writtenIds.has(receipt.receiptId)) {
      return false;
    }
    if (receipt.ordinal !== this.nextOrdinal) {
      throw new Error(
        `Ordinal mismatch: expected ${this.nextOrdinal}, got ${receipt.ordinal} for ${receipt.receiptId}`,
      );
    }
    const line = serializeReceiptLine(receipt);
    const buf = Buffer.from(line, "utf8");
    fs.writeSync(this.fd, buf);
    this.writtenIds.add(receipt.receiptId);
    this.nextOrdinal += 1;
    this.byteLength += buf.length;
    this.lineCount += 1;
    return true;
  }

  /** Persist interrupt checkpoint (call periodically / before simulated crash). */
  writeCheckpoint(): void {
    const cp: RetentionCheckpoint = {
      schemaVersion: "maa-v2-retention-checkpoint@1.0.0",
      jsonlPath: this.jsonlPath,
      nextOrdinal: this.nextOrdinal,
      writtenReceiptIds: [...this.writtenIds],
      byteLengthSoFar: this.byteLength,
      lineCountSoFar: this.lineCount,
    };
    fs.mkdirSync(path.dirname(this.checkpointPath), { recursive: true });
    fs.writeFileSync(this.checkpointPath, `${JSON.stringify(cp, null, 2)}\n`, "utf8");
  }

  /** Simulate crash: flush checkpoint and close FD without finalize. */
  crashClose(): void {
    this.writeCheckpoint();
    if (this.fd != null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
    this.closed = true;
  }

  /**
   * Close stream, hash file, optional deterministic gzip, build index entry.
   * Does not delete checkpoint until caller confirms (caller may remove).
   */
  finalize(opts?: {
    writeGzip?: boolean;
    relativePath?: string;
    removeCheckpoint?: boolean;
  }): RetentionFinalizeResult {
    if (this.fd != null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
    this.closed = true;
    const body = fs.readFileSync(this.jsonlPath);
    const sha256 = crypto.createHash("sha256").update(body).digest("hex");
    const relativePath =
      opts?.relativePath ?? path.basename(this.jsonlPath);
    const result: RetentionFinalizeResult = {
      jsonlPath: this.jsonlPath,
      sha256,
      byteLength: body.length,
      lineCount: this.lineCount,
      indexEntry: {
        relativePath,
        sha256,
        byteLength: body.length,
        lineCount: this.lineCount,
        regenerable: true,
        gitPolicy: "gitignore_regenerate",
      },
    };
    if (opts?.writeGzip) {
      const gz = gzipDeterministicFixed(body);
      const gzipPath = `${this.jsonlPath}.gz`;
      fs.writeFileSync(gzipPath, gz);
      result.gzipPath = gzipPath;
      result.gzipSha256 = crypto.createHash("sha256").update(gz).digest("hex");
      result.gzipByteLength = gz.length;
    }
    if (opts?.removeCheckpoint && fs.existsSync(this.checkpointPath)) {
      fs.unlinkSync(this.checkpointPath);
    }
    return result;
  }
}

/**
 * Reproduce clean-run vs interrupted/resumed write of N receipts.
 * Returns whether outputs are byte-identical.
 */
export function reproduceInterruptedResumeIdentity(args: {
  workDir: string;
  receipts: RetentionReceipt[];
  interruptAfter: number;
}): {
  cleanSha256: string;
  resumedSha256: string;
  byteIdentical: boolean;
  cleanByteLength: number;
  resumedByteLength: number;
  lineCount: number;
} {
  const cleanPath = path.join(args.workDir, "clean-receipts.jsonl");
  const resumePath = path.join(args.workDir, "resume-receipts.jsonl");

  const clean = new StreamingReceiptWriter(cleanPath);
  clean.openClean();
  for (const r of args.receipts) clean.writeReceipt(r);
  const cleanFin = clean.finalize({ removeCheckpoint: true });

  const resume = new StreamingReceiptWriter(resumePath);
  resume.openClean();
  for (let i = 0; i < args.interruptAfter; i++) {
    resume.writeReceipt(args.receipts[i]!);
  }
  resume.crashClose();

  const resume2 = new StreamingReceiptWriter(resumePath);
  resume2.openResume();
  for (const r of args.receipts) {
    resume2.writeReceipt(r); // duplicates skipped
  }
  const resumeFin = resume2.finalize({ removeCheckpoint: true });

  return {
    cleanSha256: cleanFin.sha256,
    resumedSha256: resumeFin.sha256,
    byteIdentical: cleanFin.sha256 === resumeFin.sha256 && cleanFin.byteLength === resumeFin.byteLength,
    cleanByteLength: cleanFin.byteLength,
    resumedByteLength: resumeFin.byteLength,
    lineCount: cleanFin.lineCount,
  };
}
