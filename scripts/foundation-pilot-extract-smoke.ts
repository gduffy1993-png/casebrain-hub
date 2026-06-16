/**
 * Local smoke: extract foundation pilot PDFs and check header fields vs tracker.
 * Run: npx tsx scripts/foundation-pilot-extract-smoke.ts
 */
import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";

const PDF_DIR = path.join(__dirname, "../docs/bundle-foundation-pack/generated/pdfs");
const TRACKER = path.join(
  __dirname,
  "../docs/bundle-foundation-pack/generated/tracker/cb-foundation-pilot-tracker.csv",
);

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) {
        cells.push(cur);
        cur = "";
      } else cur += c;
    }
    cells.push(cur);
    const o: Record<string, string> = {};
    headers.forEach((h, i) => {
      o[h.trim()] = (cells[i] ?? "").trim();
    });
    return o;
  });
}

async function main() {
  const rows = parseCsv(fs.readFileSync(TRACKER, "utf8"));
  let fail = 0;
  for (const row of rows) {
    const pdfPath = path.join(PDF_DIR, row.pdf_filename);
    if (!fs.existsSync(pdfPath)) {
      console.log("MISSING", row.ref, pdfPath);
      fail++;
      continue;
    }
    const buf = fs.readFileSync(pdfPath);
    const parsed = await pdf(buf);
    const meta = extractBundleCaseMetadata(parsed.text);
    const gotName = meta.defendantName ?? "";
    const defOk = gotName.toLowerCase().includes(row.primary_defendant.split(" ")[0]!.toLowerCase());
    const courtOk = Boolean(meta.court && row.correct_court && meta.court.toLowerCase().includes(row.correct_court.split(" ")[0]!.toLowerCase()));
    console.log(
      row.ref,
      defOk ? "def-ok" : `def-fail got=${gotName}`,
      courtOk ? "court-ok" : `court-fail got=${meta.court}`,
      `hearing=${meta.nextHearingDisplay ?? meta.hearingIso ?? "?"}`,
    );
    if (!defOk) fail++;
  }
  if (fail) {
    console.error("foundation-pilot-extract-smoke: FAIL", fail);
    process.exit(1);
  }
  console.log("foundation-pilot-extract-smoke: ok", rows.length, "PDFs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
