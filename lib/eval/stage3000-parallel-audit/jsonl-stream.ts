/**
 * Streaming JSONL helpers — never load entire corpora into memory.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { sha256Hex } from "./hashes";

export type JsonlAppendResult = {
  relativePath: string;
  linesAppended: number;
  bytesWritten: number;
};

/**
 * Append objects as JSONL, creating parent dirs. Streams write; does not
 * buffer the whole file in memory.
 */
export function appendJsonl(
  absPath: string,
  rows: ReadonlyArray<unknown>,
): JsonlAppendResult {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  let bytes = 0;
  const fd = fs.openSync(absPath, "a");
  try {
    for (const row of rows) {
      const line = `${JSON.stringify(row)}\n`;
      const buf = Buffer.from(line, "utf8");
      fs.writeSync(fd, buf);
      bytes += buf.byteLength;
    }
  } finally {
    fs.closeSync(fd);
  }
  return {
    relativePath: absPath,
    linesAppended: rows.length,
    bytesWritten: bytes,
  };
}

/**
 * Iterate JSONL line-by-line without loading the file into memory.
 */
export async function* iterateJsonl<T = unknown>(
  absPath: string,
): AsyncGenerator<T, void, unknown> {
  if (!fs.existsSync(absPath)) return;
  const stream = fs.createReadStream(absPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      yield JSON.parse(trimmed) as T;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

/** Collect a field set from JSONL without retaining full row payloads. */
export async function collectJsonlFieldSet(
  absPath: string,
  field: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  for await (const row of iterateJsonl<Record<string, unknown>>(absPath)) {
    const v = row[field];
    if (typeof v === "string") out.add(v);
  }
  return out;
}

/** Streaming SHA-256 of a JSONL file (content as on disk). */
export function sha256JsonlFile(absPath: string): string {
  if (!fs.existsSync(absPath)) return sha256Hex("");
  return sha256Hex(fs.readFileSync(absPath));
}

/**
 * Write a fresh JSONL file (overwrite). Prefer appendJsonl for ledgers.
 */
export function writeJsonlFresh(absPath: string, rows: ReadonlyArray<unknown>): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const fd = fs.openSync(absPath, "w");
  try {
    for (const row of rows) {
      fs.writeSync(fd, Buffer.from(`${JSON.stringify(row)}\n`, "utf8"));
    }
  } finally {
    fs.closeSync(fd);
  }
}
