import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import type { RealCaseRow } from "./real-case-collector";

export type OffenceCoverageRow = {
  bucket: string;
  count: number;
  genericProfileCount: number;
  sampleCaseIds: string[];
};

function bucketForRow(row: RealCaseRow): string {
  if (row.auditorFamily) return row.auditorFamily;
  if (row.workflowProfile !== "generic") return `workflow:${row.workflowProfile}`;
  if (row.evalPackName) return `eval:${row.evalPackName}`;
  return "unknown/generic";
}

export function buildOffenceCoverage(rows: RealCaseRow[]): OffenceCoverageRow[] {
  const map = new Map<string, { count: number; generic: number; samples: string[] }>();

  for (const row of rows) {
    const bucket = bucketForRow(row);
    let entry = map.get(bucket);
    if (!entry) {
      entry = { count: 0, generic: 0, samples: [] };
      map.set(bucket, entry);
    }
    entry.count += 1;
    if (row.workflowProfile === "generic" && !row.auditorFamily) entry.generic += 1;
    if (entry.samples.length < 3) entry.samples.push(row.caseId);
  }

  return [...map.entries()]
    .map(([bucket, v]) => ({
      bucket,
      count: v.count,
      genericProfileCount: v.generic,
      sampleCaseIds: v.samples,
    }))
    .sort((a, b) => b.count - a.count);
}

export function writeOffenceCoverageReports(outDir: string, rows: RealCaseRow[]): void {
  const coverage = buildOffenceCoverage(rows);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "offence-coverage.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalCases: rows.length, coverage }, null, 2),
    "utf8",
  );

  const byCorpus = { A: 0, B: 0, C: 0 };
  for (const r of rows) {
    byCorpus[r.corpusBucket] += 1;
  }

  const lines = [
    "# CaseBrain Auditor — offence coverage map",
    "",
    `Cases in this run: **${rows.length}**`,
    "",
    `Corpus: **A** real work ${byCorpus.A} · **B** pilot-visible ${byCorpus.B} · **C** lab/eval ${byCorpus.C}`,
    "",
    "| Offence/family bucket | Count | Generic/unknown profile | Sample case IDs |",
    "|-----------------------|------:|------------------------:|-----------------|",
  ];

  for (const c of coverage) {
    lines.push(
      `| ${c.bucket} | ${c.count} | ${c.genericProfileCount} | ${c.sampleCaseIds.join(", ")} |`,
    );
  }

  const productionRows = rows.filter((r) => isProductionScoredBucket(r.corpusBucket));
  if (productionRows.length > 0) {
    lines.push("", "## Production corpus (A+B) only", "");
    lines.push(`Cases: **${productionRows.length}**`, "");
    lines.push(
      "| Offence/family bucket | Count | Generic/unknown profile | Sample case IDs |",
      "|-----------------------|------:|------------------------:|-----------------|",
    );
    for (const c of buildOffenceCoverage(productionRows)) {
      lines.push(
        `| ${c.bucket} | ${c.count} | ${c.genericProfileCount} | ${c.sampleCaseIds.join(", ")} |`,
      );
    }
  }

  lines.push("", "_Discovery-only — promotes manifest work on high-count buckets._", "");
  fs.writeFileSync(path.join(outDir, "offence-coverage.md"), lines.join("\n"), "utf8");
}
