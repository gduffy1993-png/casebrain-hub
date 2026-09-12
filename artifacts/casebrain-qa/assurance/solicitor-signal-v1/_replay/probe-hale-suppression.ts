/**
 * Why Hale's stated-outstanding CCTV, CAD and custody rows never reach the board.
 *
 * The papers say two things about the same exhibit: the index says the master footage, original audio
 * and full custody record are outstanding, and the exhibit list says a summary of each was served.
 * This asks each stage in turn which of the two it believes.
 */
import fs from "node:fs";
import path from "node:path";

import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";
import {
  inferEvidenceModality,
  shouldSuppressChaseAsAlreadyOnFile,
  evidenceMaySatisfyRequest,
} from "../../../../../lib/criminal/evidence-state-reconcile";
import {
  isCctvMasterEstablished,
  familySupport,
} from "../../../../../lib/criminal/chase-source-gate";

const caseId = "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4";
const captured = JSON.parse(
  fs.readFileSync(path.join(__dirname, "builder-inputs", `${caseId}.builder-inputs.json`), "utf8"),
);
const text: string = captured.bundleSource?.data?.frontMatterScan ?? "";
const canonical = captured.bundleSource?.data?.canonical ?? null;

const rows = normaliseBundleMaterials(text);
const stated = rows.filter(
  (r) => r.status === "outstanding" && /EX-MUR-0(09|12|22)/.test(r.scheduleRef ?? ""),
);

console.log("-- what the gates say about the family --");
console.log(`cctv familySupport: ${familySupport("cctv", text)}`);
console.log(`isCctvMasterEstablished: ${isCctvMasterEstablished(text)}`);

const evidenceRows = (canonical?.evidenceRows ?? []).map((r: any) => ({
  label: r.label,
  state: r.existence,
  status: r.existence,
  modality: undefined,
  aliases: r.aliases ?? [],
}));
console.log(`\ncanonical evidence rows: ${evidenceRows.length}`);

console.log("\n-- each stated-outstanding row, and whether it is treated as already on file --");
for (const row of stated) {
  const label = row.label;
  const suppression = shouldSuppressChaseAsAlreadyOnFile(label, evidenceRows as never);
  console.log(`\n${row.scheduleRef}  "${label}"`);
  console.log(`  modality: ${inferEvidenceModality(label)}`);
  console.log(`  suppressed: ${suppression.suppress}  reason: ${suppression.reason ?? "—"}`);
  if (suppression.suppress) {
    for (const er of evidenceRows) {
      const { match, basis } = evidenceMaySatisfyRequest(label, er as never);
      if (match) {
        console.log(
          `    satisfied by: "${er.label}" [${er.state}] modality=${inferEvidenceModality(er.label)} basis=${basis}`,
        );
      }
    }
  }
}
