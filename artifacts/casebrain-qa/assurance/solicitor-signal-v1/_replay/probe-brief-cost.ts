/**
 * What building the board costs on the biggest bundles, now the whole bundle is read.
 *
 * This runs in the browser on the case with the most papers, so a slow answer here is a hung tab.
 */
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "../../../../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { canonicalRowsForBuilder } from "../../../../../lib/criminal/canonical-evidence-status-bridge";

const dir = path.join(__dirname, "builder-inputs");
const cases = [
  "687cf5a6-6898-4257-baef-33e33ace08df",
  "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
  "f57a2750-d24e-42a2-9f73-92384db565dc",
];

for (const caseId of cases) {
  const captured = JSON.parse(
    fs.readFileSync(path.join(dir, `${caseId}.builder-inputs.json`), "utf8"),
  );
  const bundleSource = captured.bundleSource?.data ?? null;
  const text: string = bundleSource?.frontMatterScan ?? "";
  const started = Date.now();
  const brief: any = buildDisclosureChaseBrief({
    caseId,
    caseTitle: "Case",
    clientLabel: null,
    allegation: null,
    stage: null,
    hearingStatus: null,
    hearingDateIso: null,
    bundleHealth: "partial",
    positionStatus: null,
    battleboard: captured.battleboard?.data ?? null,
    snapshotMissing: canonicalRowsForBuilder(bundleSource?.canonical ?? null),
    bundleText: text,
    profileHint: null,
    canonicalFindings: bundleSource?.canonical?.findingSummaries ?? [],
    canonicalEvidenceRows: (bundleSource?.canonical?.evidenceRows ?? []).map((r: any) => ({
      label: r.label,
      state: r.existence,
    })),
  } as never);
  const ms = Date.now() - started;
  console.log(
    `${caseId.slice(0, 8)}  chars=${String(text.length).padStart(9)}  board=${String(brief.primaryItems.length).padStart(2)}  brief=${String(ms).padStart(7)}ms`,
  );
}
