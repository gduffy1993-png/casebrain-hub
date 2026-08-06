/**
 * Real-PDF Live Pilot v1 — freeze membership.
 *
 * Independently verifies SHA-256 + byte length + page count (via pdf-parse numpages)
 * for every one of the 20 frozen source PDFs, and records extraction status. Writes:
 *   - ordered-membership-20.json      (ordered rows, RP-01..RP-20)
 *   - membership-freeze-receipt.json  (summary, mismatches, membership hash)
 *   - source-hash-before.json         (id -> sha256/byteLength, for later before/after)
 *
 * This step freezes input selection only. It does not open, upload, or interpret any
 * PDF beyond what is needed to confirm identity (hash/size/page count).
 *
 *   node --import tsx scripts/assurance/real-pdf-live-pilot/freeze-membership.ts
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ARTEFACT_ROOT, PILOT_20, type PilotEntry } from "./pilot-20-definition";
import { hashSource, sha256Buffer, type SourceHashRow } from "./pdf-materialise";

const REPO_ROOT = process.cwd();
const ARTEFACTS_DIR = path.join(REPO_ROOT, ARTEFACT_ROOT);

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export type MembershipRow = {
  id: string;
  fileName: string;
  absolutePath: string;
  expectedSha256: string;
  actualSha256: string;
  sha256Matches: boolean;
  byteLength: number;
  expectedPageCount: number;
  actualPageCount: number | null;
  pageCountMatches: boolean | null;
  extractionStatus: "ok" | "error";
  extractionError: string | null;
  strata: string[];
};

/**
 * Stable (key-sorted) JSON stringify so the membership hash is reproducible
 * independent of object key insertion order.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function membershipHashOf(rows: MembershipRow[]): string {
  const stableRows = rows.map((r) => ({
    id: r.id,
    absolutePath: r.absolutePath,
    sha256: r.actualSha256,
    byteLength: r.byteLength,
    pageCount: r.actualPageCount,
  }));
  return sha256Buffer(Buffer.from(stableStringify(stableRows), "utf8"));
}

async function verifyOne(entry: PilotEntry): Promise<MembershipRow> {
  const { sha256, byteLength } = hashSource(entry);
  let actualPageCount: number | null = null;
  let extractionStatus: "ok" | "error" = "ok";
  let extractionError: string | null = null;
  try {
    const buffer = fs.readFileSync(entry.absoluteSourcePath);
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer, { max: 0 });
    actualPageCount = typeof parsed.numpages === "number" ? parsed.numpages : null;
  } catch (error) {
    extractionStatus = "error";
    extractionError = error instanceof Error ? error.message : String(error);
  }
  return {
    id: entry.id,
    fileName: entry.fileName,
    absolutePath: entry.absoluteSourcePath,
    expectedSha256: entry.expectedSha256,
    actualSha256: sha256,
    sha256Matches: sha256 === entry.expectedSha256,
    byteLength,
    expectedPageCount: entry.pageCount,
    actualPageCount,
    pageCountMatches: actualPageCount === null ? null : actualPageCount === entry.pageCount,
    extractionStatus,
    extractionError,
    strata: entry.strata,
  };
}

export type MembershipFreezeReceipt = {
  schemaVersion: "real-pdf-live-pilot-membership-freeze-receipt@1.0.0";
  frozenAt: string;
  totalEntries: number;
  sha256MismatchCount: number;
  pageCountMismatchCount: number;
  extractionErrorCount: number;
  mismatches: Array<{ id: string; reason: string }>;
  membershipSha256: string;
  frozen: boolean;
};

export function loadFrozenMembership(): { rows: MembershipRow[]; receipt: MembershipFreezeReceipt } | null {
  const membershipPath = path.join(ARTEFACTS_DIR, "ordered-membership-20.json");
  const receiptPath = path.join(ARTEFACTS_DIR, "membership-freeze-receipt.json");
  if (!fs.existsSync(membershipPath) || !fs.existsSync(receiptPath)) return null;
  try {
    const rows = JSON.parse(fs.readFileSync(membershipPath, "utf8")) as MembershipRow[];
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8")) as MembershipFreezeReceipt;
    return { rows, receipt };
  } catch {
    return null;
  }
}

export async function freezeMembership(): Promise<{ rows: MembershipRow[]; receipt: MembershipFreezeReceipt }> {
  const rows: MembershipRow[] = [];
  for (const entry of PILOT_20) {
    rows.push(await verifyOne(entry));
  }

  const mismatches: Array<{ id: string; reason: string }> = [];
  for (const row of rows) {
    if (!row.sha256Matches) mismatches.push({ id: row.id, reason: "sha256_mismatch" });
    if (row.pageCountMatches === false) mismatches.push({ id: row.id, reason: "page_count_mismatch" });
    if (row.extractionStatus === "error") mismatches.push({ id: row.id, reason: "extraction_error" });
  }

  const membershipSha256 = membershipHashOf(rows);
  const receipt: MembershipFreezeReceipt = {
    schemaVersion: "real-pdf-live-pilot-membership-freeze-receipt@1.0.0",
    frozenAt: new Date().toISOString(),
    totalEntries: rows.length,
    sha256MismatchCount: rows.filter((r) => !r.sha256Matches).length,
    pageCountMismatchCount: rows.filter((r) => r.pageCountMatches === false).length,
    extractionErrorCount: rows.filter((r) => r.extractionStatus === "error").length,
    mismatches,
    membershipSha256,
    frozen: mismatches.length === 0,
  };

  writeJson(path.join(ARTEFACTS_DIR, "ordered-membership-20.json"), rows);
  writeJson(path.join(ARTEFACTS_DIR, "membership-freeze-receipt.json"), receipt);

  const sourceHashBefore: SourceHashRow[] = rows.map((r) => ({
    id: r.id,
    absolutePath: r.absolutePath,
    sha256: r.actualSha256,
    byteLength: r.byteLength,
    readAt: receipt.frozenAt,
  }));
  writeJson(path.join(ARTEFACTS_DIR, "source-hash-before.json"), sourceHashBefore);

  return { rows, receipt };
}

async function main(): Promise<void> {
  const { rows, receipt } = await freezeMembership();
  console.log(
    JSON.stringify(
      {
        ok: receipt.frozen,
        totalEntries: receipt.totalEntries,
        membershipSha256: receipt.membershipSha256,
        sha256MismatchCount: receipt.sha256MismatchCount,
        pageCountMismatchCount: receipt.pageCountMismatchCount,
        extractionErrorCount: receipt.extractionErrorCount,
        mismatches: receipt.mismatches,
        rowIds: rows.map((r) => r.id),
      },
      null,
      2,
    ),
  );
  if (!receipt.frozen) process.exitCode = 1;
}

const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
