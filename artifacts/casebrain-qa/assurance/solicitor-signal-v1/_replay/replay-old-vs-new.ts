/**
 * Replay the material normaliser as it was before the status-truth fix against the
 * version shipped now, over the exact text CaseBrain analyses for each case.
 *
 * Every disagreement is reported with the PDF page and cell values behind it, so an
 * old output can be read next to what the paper actually says.
 *
 * Run: npx tsx artifacts/casebrain-qa/assurance/solicitor-signal-v1/_replay/replay-old-vs-new.ts
 */
import fs from "node:fs";
import path from "node:path";
import { normaliseBundleMaterials as normaliseNew } from "../../../../../lib/criminal/bundle-material-normalizer";
import { normaliseBundleMaterials as normaliseOld } from "./old-normalizer-2619fc740";
import type { MaterialStatus, NormalisedMaterialRow } from "../../../../../lib/criminal/bundle-truth-types";

const ROOT = process.cwd();
const APP_SOURCE = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/solicitor-signal-v1/_replay/app-source",
);
const PDF_EXTRACTS = path.join(ROOT, "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts");
const PR101 = path.join(ROOT, "artifacts/casebrain-qa/pr101-live-20-visual-pdf-review");

type CaseSpec = { caseId: string; name: string; pdfExtract: string | null };

const CASES: CaseSpec[] = [
  {
    caseId: "687cf5a6-6898-4257-baef-33e33ace08df",
    name: "Layla Davies",
    pdfExtract: path.join(PDF_EXTRACTS, "RP-15-DAVIES.full.txt"),
  },
  {
    caseId: "7e763777-94a8-4958-a190-a35ef6ddb259",
    name: "Isaac Patel",
    pdfExtract: path.join(PDF_EXTRACTS, "ISAAC-PATEL-TB-546.full.txt"),
  },
  {
    caseId: "a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27",
    name: "Imani Tobin",
    pdfExtract: path.join(PDF_EXTRACTS, "RP-03-TOBIN.full.txt"),
  },
  {
    caseId: "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
    name: "Ellis Dunn",
    pdfExtract: path.join(PDF_EXTRACTS, "RP-13-DUNN.full.txt"),
  },
  {
    caseId: "99090c69-5d78-41e3-946d-119b4bc335ba",
    name: "Arden (robbery)",
    pdfExtract: path.join(PDF_EXTRACTS, "ARDEN-MONSTER-0001.full.txt"),
  },
  {
    caseId: "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
    name: "Taylor Brookes",
    pdfExtract: path.join(PDF_EXTRACTS, "RP-17-FRESH-BROOKES.full.txt"),
  },
  {
    caseId: "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
    name: "Leon Hale (murder)",
    pdfExtract: path.join(PR101, "case-03-live-03-jordan-hale-bwv-reco/source-extract.txt"),
  },
];

/** Pairing key: identical once whitespace and punctuation are removed. */
function pairKey(row: NormalisedMaterialRow): string {
  return `${row.label} ${row.detail ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type PdfPage = { page: number; lines: string[] };

function loadPdfPages(file: string | null): PdfPage[] {
  if (!file || !fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const parts = text.split(/=+\s*PAGE\s+(\d+)\s*=+/i);
  const pages: PdfPage[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    pages.push({
      page: Number(parts[i]),
      lines: (parts[i + 1] ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
    });
  }
  if (!pages.length) {
    pages.push({ page: 0, lines: text.split("\n").map((l) => l.trim()).filter(Boolean) });
  }
  return pages;
}

/**
 * Find the schedule entry in the PDF for a row, using its schedule reference.
 * Cells sit on their own lines in the extract, so the reference line plus the
 * following few lines are the row as printed on the page.
 */
function pdfEvidenceFor(row: NormalisedMaterialRow, pages: PdfPage[]): string | null {
  const ref = row.scheduleRef;
  const probes: string[] = [];
  if (ref) probes.push(ref);
  const refInLabel = row.label.match(/\b((?:MG\d{1,2}[A-Z]?\/|[A-Z]{1,4}\/)\d{1,4}|[A-Z]{1,3}\d{2,3})\b/);
  if (refInLabel?.[1]) probes.push(refInLabel[1]);

  for (const probe of probes) {
    for (const { page, lines } of pages) {
      const i = lines.findIndex((l) => l.replace(/\s+/g, "") === probe.replace(/\s+/g, ""));
      if (i >= 0) {
        const cells = lines.slice(i, i + 4).filter((l) => !/^=+/.test(l));
        return `p.${page}  ${cells.join(" | ")}`;
      }
    }
  }

  // No reference: fall back to the longest word run from the label.
  const words = row.label.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  if (words.length >= 2) {
    const needle = words.slice(0, 3);
    for (const { page, lines } of pages) {
      for (const line of lines) {
        const l = line.toLowerCase();
        if (needle.every((w) => l.includes(w))) return `p.${page}  ${line.slice(0, 120)}`;
      }
    }
  }
  return null;
}

const SEVERITY: Record<string, string> = {
  "outstanding->served": "P0 gap shown as on file",
  "absent->served": "P0 gap shown as on file",
  "partial->served": "P1 incomplete shown as on file",
  "draft->served": "P1 draft shown as on file",
  "unsigned->served": "P1 unsigned shown as on file",
  "referred_only->served": "P1 referred-only shown as on file",
  "unclear->served": "P1 unconfirmed shown as on file",
};

function verdict(oldStatus: MaterialStatus | "MISSING", newStatus: MaterialStatus | "MISSING"): string {
  if (oldStatus === "MISSING") return "P1 row was dropped entirely";
  if (newStatus === "MISSING") return "row no longer produced";
  const key = `${oldStatus}->${newStatus}`;
  if (SEVERITY[key]) return SEVERITY[key];
  if (newStatus === "served") return "P1 promoted to served";
  if (oldStatus === "served") return "P0 was claimed served, is not";
  if (oldStatus === "unclear") return "P2 vague reading sharpened to the stated status";
  return "P2 status corrected";
}

let totalRows = 0;
let totalDiff = 0;
let totalFalseServed = 0;
let totalHiddenServed = 0;
let totalDropped = 0;
const clusters = new Map<string, number>();

for (const spec of CASES) {
  const sourceFile = path.join(APP_SOURCE, `${spec.caseId}.app-source.txt`);
  if (!fs.existsSync(sourceFile)) {
    console.log(`\n### ${spec.name} — no app source captured, skipped`);
    continue;
  }
  const bundleText = fs.readFileSync(sourceFile, "utf8");
  const pages = loadPdfPages(spec.pdfExtract);

  const oldRows = normaliseOld(bundleText);
  const newRows = normaliseNew(bundleText);

  const oldByKey = new Map(oldRows.map((r) => [pairKey(r), r]));
  const newByKey = new Map(newRows.map((r) => [pairKey(r), r]));

  const keys = new Set([...oldByKey.keys(), ...newByKey.keys()]);
  const diffs: string[] = [];

  for (const key of keys) {
    const before = oldByKey.get(key);
    const after = newByKey.get(key);
    const oldStatus: MaterialStatus | "MISSING" = before?.status ?? "MISSING";
    const newStatus: MaterialStatus | "MISSING" = after?.status ?? "MISSING";
    if (oldStatus === newStatus) continue;

    const row = after ?? before!;
    const evidence = pdfEvidenceFor(row, pages);
    const v = verdict(oldStatus, newStatus);
    clusters.set(v, (clusters.get(v) ?? 0) + 1);
    if (oldStatus === "served" && newStatus !== "served") totalFalseServed += 1;
    if (newStatus === "served" && oldStatus === "MISSING") totalHiddenServed += 1;
    if (oldStatus === "MISSING") totalDropped += 1;

    diffs.push(
      [
        `  ROW   ${row.displayLine.slice(0, 96)}`,
        `  OLD   ${oldStatus}`,
        `  NOW   ${newStatus}`,
        `  PDF   ${evidence ?? "not located in extract (SOURCE_NOT_AVAILABLE)"}`,
        `  WHY   ${v}`,
      ].join("\n"),
    );
  }

  totalRows += newRows.length;
  totalDiff += diffs.length;

  console.log(`\n### ${spec.name}`);
  console.log(
    `    rows old ${oldRows.length} / new ${newRows.length}` +
      `   served old ${oldRows.filter((r) => r.status === "served").length}` +
      ` / new ${newRows.filter((r) => r.status === "served").length}` +
      `   changed ${diffs.length}`,
  );
  if (!pages.length) console.log("    (no PDF extract available for this case)");
  if (diffs.length) console.log(diffs.join("\n\n"));
}

console.log("\n================ TOTALS ================");
console.log(`cases replayed          ${CASES.length}`);
console.log(`rows after fix          ${totalRows}`);
console.log(`rows whose status moved ${totalDiff}`);
console.log(`falsely marked served   ${totalFalseServed}`);
console.log(`served but hidden       ${totalHiddenServed}`);
console.log(`rows dropped entirely   ${totalDropped}`);
console.log("\nclusters:");
for (const [k, v] of [...clusters.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`);
}
