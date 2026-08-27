/**
 * Where does a stated schedule gap die on its way to the chase list?
 *
 * Runs the real ledger and the real chase builder over the exact text the app receives, then
 * reports, per case: the rows the ledger says need chasing, and which of them survive as chase
 * items. Anything present in the first list and absent from the second has been dropped by the
 * chase pipeline rather than missed by extraction.
 *
 * Usage: npx tsx chase-funnel.ts
 */
import fs from "node:fs";
import path from "node:path";

import { buildBundleTruthLedger, ledgerMaterialsNeedingChase } from "@/lib/criminal/bundle-truth-ledger";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const appSourceDir = path.join(__dirname, "app-source");
const index = JSON.parse(fs.readFileSync(path.join(appSourceDir, "APP-SOURCE-INDEX.json"), "utf8")) as Array<{
  caseId: string;
  slug?: string;
  caseTitle?: string;
}>;

/**
 * A row is a *stated* gap when the schedule names it — a reference plus a gap status the source
 * asserts. Everything else is prose the extractor could not classify, and is rightly filtered.
 */
const REF_RE = /\b(?:MG\d{1,2}[A-Z]?\/\d{1,4}|[A-Z]{2,4}\/\d{1,4}|O\d{2}|EX[-/][A-Z]*\d{1,4})\b/;
const HARD_GAP = new Set(["outstanding", "absent", "referred_only", "unsigned"]);

let totalNeeding = 0;
let totalStated = 0;
let totalStatedReaching = 0;
let totalSurviving = 0;
let totalDropped = 0;
const statedDropped: string[] = [];

for (const entry of index) {
  const file = path.join(appSourceDir, `${entry.caseId}.app-source.txt`);
  if (!fs.existsSync(file)) continue;
  const bundleText = fs.readFileSync(file, "utf8");

  const ledger = buildBundleTruthLedger({ bundleText });
  const needing = ledgerMaterialsNeedingChase(ledger);

  const brief = buildDisclosureChaseBrief({
    caseId: entry.caseId,
    caseTitle: entry.caseTitle ?? entry.slug ?? entry.caseId,
    clientLabel: entry.caseTitle ?? "Client",
    allegation: "",
    stage: "Crown Court",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "ok",
    positionStatus: "provisional",
    battleboard: null,
    bundleText,
  });

  const itemLabels = brief.items.map((i) => i.label.toLowerCase());
  const itemMerged = new Set(
    brief.items.flatMap((i) => (i.mergedFrom ?? []).map((m) => m.toLowerCase().trim())),
  );

  const survived: string[] = [];
  const dropped: string[] = [];
  let stated = 0;
  let statedReaching = 0;
  for (const m of needing) {
    const isStated = REF_RE.test(m.displayLine) && HARD_GAP.has(m.status);
    const line = m.displayLine.toLowerCase().trim();
    const words = line.match(/[a-z]{5,}/g) ?? [];
    const distinctive = words.filter(
      (w) => !["outstanding", "papers", "supplied", "served", "requested", "attached", "awaiting"].includes(w),
    );
    const inItem =
      itemMerged.has(line) ||
      itemLabels.some((l) => distinctive.length > 0 && distinctive.every((w) => l.includes(w))) ||
      itemLabels.some((l) => l.includes(line.slice(0, 28)));
    (inItem ? survived : dropped).push(
      `${isStated ? "STATED " : "prose  "}${m.status.padEnd(14)} ${m.displayLine.slice(0, 78)}`,
    );
    if (isStated) {
      stated += 1;
      if (inItem) statedReaching += 1;
      else statedDropped.push(`${entry.slug ?? entry.caseId}  ${m.status.padEnd(14)} ${m.displayLine.slice(0, 74)}`);
    }
  }

  totalNeeding += needing.length;
  totalStated += stated;
  totalStatedReaching += statedReaching;
  totalSurviving += survived.length;
  totalDropped += dropped.length;

  console.log(`\n### ${entry.slug ?? entry.caseId}`);
  console.log(`    ledger rows needing chase : ${needing.length} (stated by the schedule: ${stated})`);
  console.log(`    chase items produced      : ${brief.items.length} (primary ${brief.primaryItems.length})`);
  console.log(`    ledger rows reaching list : ${survived.length}`);
  if (brief.items.length) {
    console.log("    chase items:");
    for (const i of brief.items) console.log(`      - [${i.familyId}] ${i.label.slice(0, 84)}`);
  }
  if (dropped.length) {
    console.log("    ledger rows dropped by the chase pipeline:");
    for (const d of dropped) console.log(`      ! ${d}`);
  }
}

console.log("\n================ TOTALS ================");
console.log(`ledger rows needing chase   : ${totalNeeding}`);
console.log(`reached the chase list      : ${totalSurviving}`);
console.log(`dropped in the pipeline     : ${totalDropped}`);
console.log(`\nof those, gaps the schedule states (reference + asserted gap status):`);
console.log(`  stated gaps               : ${totalStated}`);
console.log(`  reaching the chase list   : ${totalStatedReaching}`);
console.log(`  dropped                   : ${totalStated - totalStatedReaching}`);

if (statedDropped.length) {
  console.log("\nStated gaps the chase pipeline drops:");
  for (const s of statedDropped) console.log(`  ! ${s}`);
}
