/**
 * Hale's outstanding rows exist in the ledger. This shows how far they get.
 */
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "../../../../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { canonicalRowsForBuilder } from "../../../../../lib/criminal/canonical-evidence-status-bridge";

const caseId = "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4";
const captured = JSON.parse(
  fs.readFileSync(path.join(__dirname, "builder-inputs", `${caseId}.builder-inputs.json`), "utf8"),
);
const bundleSource = captured.bundleSource?.data ?? null;

const brief: any = buildDisclosureChaseBrief({
  caseId,
  caseTitle: "Hale",
  clientLabel: null,
  allegation: "Murder",
  stage: "Crown Court",
  hearingStatus: null,
  hearingDateIso: null,
  bundleHealth: "partial",
  positionStatus: null,
  battleboard: captured.battleboard?.data ?? null,
  snapshotMissing: canonicalRowsForBuilder(bundleSource?.canonical ?? null),
  bundleText: bundleSource?.frontMatterScan ?? null,
  profileHint: null,
  canonicalFindings: bundleSource?.canonical?.findingSummaries ?? [],
  canonicalEvidenceRows: (bundleSource?.canonical?.evidenceRows ?? []).map((r: any) => ({
    label: r.label,
    state: r.existence,
  })),
} as never);

const hunted = ["EX-MUR-009", "EX-MUR-012", "EX-MUR-021", "EX-MUR-022", "EX-MUR-024"];

console.log(`items: ${brief.items.length}   primary: ${brief.primaryItems.length}   additional: ${brief.additionalItems?.length ?? 0}`);
for (const ref of hunted) {
  const inItems = brief.items.filter(
    (i: any) => i.sourceScheduleRef === ref || i.label.includes(ref),
  );
  const inPrimary = brief.primaryItems.some(
    (i: any) => i.sourceScheduleRef === ref || i.label.includes(ref),
  );
  console.log(
    `${ref}: items=${inItems.length} primary=${inPrimary}` +
      (inItems.length ? `  -> ${inItems.map((i: any) => `${i.label} [${i.familyId}/${i.baseStatus}]`).join(" | ")}` : ""),
  );
}

console.log("\n-- all items, in order --");
for (const i of brief.items) {
  console.log(`  ${(i.sourceScheduleRef ?? "—").padEnd(12)} ${i.label} [${i.familyId}/${i.baseStatus}]`);
}
