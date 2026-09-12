/** Where Hale's stated-outstanding CCTV master row (EX-MUR-009) is lost, now suppression is not it. */
import fs from "node:fs";
import path from "node:path";

import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";
import { shouldChaseRequestAgainstServedAliases } from "../../../../../lib/criminal/canonical-finding-model";
import { shouldSuppressChaseAsAlreadyOnFile } from "../../../../../lib/criminal/evidence-state-reconcile";
import {
  isCctvMasterEstablished,
  isCctvContinuityEstablished,
  isCctvContinuityConfirmationOnly,
  familySupport,
} from "../../../../../lib/criminal/chase-source-gate";

const caseId = "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4";
const captured = JSON.parse(
  fs.readFileSync(path.join(__dirname, "builder-inputs", `${caseId}.builder-inputs.json`), "utf8"),
);
const text: string = captured.bundleSource?.data?.frontMatterScan ?? "";
const canonical = captured.bundleSource?.data?.canonical ?? null;
const rows = (canonical?.evidenceRows ?? []).map((r: any) => ({
  label: r.label,
  state: r.existence,
  aliases: r.aliases ?? [],
}));

const ledgerRow = normaliseBundleMaterials(text).find((r) => r.scheduleRef === "EX-MUR-009");
console.log(`ledger row: ${JSON.stringify(ledgerRow?.label)} [${ledgerRow?.status}]`);

const label = ledgerRow?.label ?? "";
console.log(`\nalias verdict: ${JSON.stringify(shouldChaseRequestAgainstServedAliases(label, rows as never))}`);
console.log(`suppression:   ${JSON.stringify(shouldSuppressChaseAsAlreadyOnFile(label, rows as never))}`);
console.log(`\ncctv familySupport:            ${familySupport("cctv", text)}`);
console.log(`isCctvMasterEstablished:        ${isCctvMasterEstablished(text)}`);
console.log(`isCctvContinuityEstablished:    ${isCctvContinuityEstablished(text)}`);
console.log(`isCctvContinuityConfirmationOnly: ${isCctvContinuityConfirmationOnly(text)}`);

console.log("\n-- canonical rows mentioning CCTV --");
for (const r of rows) {
  if (/cctv/i.test(r.label)) console.log(`  [${r.state.padEnd(10)}] ${JSON.stringify(r.label)}`);
}
