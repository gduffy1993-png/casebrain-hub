/** Independent original-PDF benchmark. Tracker answers enter the scorer only. No live writes. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { extractTextAndMetaFromFileBuffer } from "../lib/upload/extract-text-from-file";
import { extractMetadataWithLessons, metadataValue } from "../lib/criminal/controlled-learning/extract";
import { FIELDS, LEARNING_VERSION, RuleSchema, normalizeValue, type ApprovedRule, type LearningField } from "../lib/criminal/controlled-learning/core";
import { parseUkHearingDateTime } from "../lib/criminal/extract-bundle-case-metadata";

function argument(name: string): string | undefined { return process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3); }
function csvRows(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ""; }
    else if (char === '\n' && !quoted) { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
const compare = (field: LearningField, actual: string | null, expected: string) => {
  if (field === "hearing") {
    const left = parseUkHearingDateTime(actual ?? "")?.iso;
    const right = parseUkHearingDateTime(expected)?.iso;
    return !!left && !!right && left === right;
  }
  return normalizeValue(actual ?? "") === normalizeValue(expected);
};

async function main() {
  const pdfRoot = path.resolve(argument("pdf-root") ?? "");
  const tracker = argument("tracker"); const out = argument("out");
  if (!tracker || !out || !argument("pdf-root")) throw new Error("Supply --pdf-root, --tracker and --out.");
  const [headers, ...data] = csvRows(fs.readFileSync(tracker, "utf8").replace(/^\uFEFF/, ""));
  const limit = Number(argument("limit") ?? 24);
  if (!Number.isInteger(limit) || limit < 1 || limit > 3000) throw new Error("Limit must be between 1 and 3000.");
  const allRows = data.filter(r => r.length === headers.length).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  // First cover different recorded layouts, then fill the requested sample. These labels
  // choose tests only; expected field values never reach the processing functions.
  const layouts = new Set<string>(); const selected: typeof allRows = [];
  for (const row of allRows) { if (!layouts.has(row.layout_family)) { layouts.add(row.layout_family); selected.push(row); } if (selected.length >= limit) break; }
  for (const row of allRows) { if (selected.length >= limit) break; if (!selected.includes(row)) selected.push(row); }
  const rules: ApprovedRule[] = [];
  if (argument("rule-label")) {
    const rule = RuleSchema.parse({ field: argument("rule-field"), label: argument("rule-label") });
    rules.push({ ...rule, id: "offline-proposal", status: "approved", pipelineVersion: LEARNING_VERSION });
  }
  const hashes = new Set<string>();
  const results: Array<Record<string, unknown>> = [];
  const totals = { files: 0, uniqueOriginalPdfs: 0, failuresToRead: 0, duplicates: 0,
    comparedFields: 0, baselineCorrect: 0, candidateCorrect: 0, improvements: 0, regressions: 0 };
  const answerKeys: Record<LearningField, string> = { defendant: "primary_defendant", charge: "correct_offence_wording", court: "correct_court", hearing: "correct_hearing" };
  for (const row of selected) {
    const filename = path.resolve(pdfRoot, row.pdf_filename);
    if (!filename.startsWith(pdfRoot + path.sep)) throw new Error("Tracker PDF path escapes the input directory.");
    totals.files++;
    try {
      const bytes = fs.readFileSync(filename);
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hashes.has(hash)) { totals.duplicates++; continue; }
      hashes.add(hash); totals.uniqueOriginalPdfs++;
      const extracted = await extractTextAndMetaFromFileBuffer(path.basename(filename), "application/pdf", bytes);
      if (!extracted.ingestionAssessment.substantiveOutputsAllowed) throw new Error("Substantive extraction withheld.");
      // Processing finishes before the expected answers are accessed.
      const processed = extractMetadataWithLessons(extracted.text, rules);
      const scores: Record<string, unknown> = {};
      for (const field of FIELDS) {
        const expected = row[answerKeys[field]];
        if (!expected) continue;
        const baseline = metadataValue(processed.baseline, field), candidate = metadataValue(processed.metadata, field);
        const baseOK = compare(field, baseline, expected), candidateOK = compare(field, candidate, expected);
        totals.comparedFields++; totals.baselineCorrect += Number(baseOK); totals.candidateCorrect += Number(candidateOK);
        totals.improvements += Number(!baseOK && candidateOK); totals.regressions += Number(baseOK && !candidateOK);
        scores[field] = { baselineCorrect: baseOK, candidateCorrect: candidateOK, appliedRule: processed.applied.some(a => a.field === field) };
      }
      results.push({ ref: row.ref, file: path.basename(filename), sourceHash: hash, recordedLayout: row.layout_family,
        pagesExtracted: extracted.pageUnits.length, fields: scores });
    } catch (error) { totals.failuresToRead++; results.push({ ref: row.ref, error: error instanceof Error ? error.message : "PDF read failed" }); }
    console.log(`Processed ${totals.files}/${selected.length}`);
  }
  const report = { generatedAt: new Date().toISOString(), pipelineVersion: LEARNING_VERSION,
    ruleMode: "Offline candidate simulation only; no rule was approved in a database.",
    scope: "Original PDF bytes through production text extraction and metadata processing. No hosted UI, AI calls or legal-analysis assessment.",
    truthIsolation: "Tracker answers used by scorer only. Tracker itself has not been independently validated.",
    selection: "Different recorded layouts first, then tracker order. Not a claim of a random or representative sample.",
    rules, totals, results };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2)); console.log(JSON.stringify(totals));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
