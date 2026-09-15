/**
 * Which `EX-MUR-*` rows the ledger holds for Hale, and with what status.
 *
 * The bundle index states the CCTV master, original CAD audio, full custody record and full
 * photograph set are outstanding, while the exhibit list on page 53 records the same references as
 * `Served summary/draft`. Only the second set reaches the chase board, and this shows why.
 */
import fs from "node:fs";
import path from "node:path";

import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";

const caseId = "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4";
const captured = JSON.parse(
  fs.readFileSync(path.join(__dirname, "builder-inputs", `${caseId}.builder-inputs.json`), "utf8"),
);
const text: string = captured.bundleSource?.data?.frontMatterScan ?? "";

const rows = normaliseBundleMaterials(text);
console.log(`ledger rows: ${rows.length}`);
for (const r of rows) {
  if (!/EX-MUR/.test(`${r.scheduleRef ?? ""}${r.label}`)) continue;
  console.log(`  ${(r.scheduleRef ?? "—").padEnd(12)} [${r.status.padEnd(14)}] ${r.label}`);
}

console.log("\n-- index rows the collector saw --");
for (const line of text.split(/\n/)) {
  if (/EX-MUR-0(09|12|22|24)/.test(line)) console.log(`  RAW: ${JSON.stringify(line)}`);
}
