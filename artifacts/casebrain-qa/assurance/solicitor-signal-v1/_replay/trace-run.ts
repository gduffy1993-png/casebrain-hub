/** Stage trace for one case: which pipeline stage drops the schedule-referenced rows. */
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const dir = path.join(__dirname, "app-source");
for (const [name, id] of [
  ["Davies", "687cf5a6-6898-4257-baef-33e33ace08df"],
  ["Dunn", "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01"],
] as const) {
  const bundleText = fs.readFileSync(path.join(dir, `${id}.app-source.txt`), "utf8");
  console.log(`\n### ${name}`);
  const brief = buildDisclosureChaseBrief({
    caseId: id,
    caseTitle: name,
    clientLabel: name,
    allegation: "",
    stage: "Crown Court",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "ok",
    positionStatus: "provisional",
    battleboard: null,
    bundleText,
  });
  console.log(`  final items: ${brief.items.map((i) => i.label).join(" | ")}`);
}
