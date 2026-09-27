/**
 * One case, one board build, so a CPU profile names the function the time is actually spent in.
 *
 * Run with `node --cpu-prof` to get the profile; CASE and INPUTS select which capture to build from.
 */
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "../../../../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { canonicalRowsForBuilder } from "../../../../../lib/criminal/canonical-evidence-status-bridge";

const caseId = process.env.CASE ?? "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4";
const dir = path.join(__dirname, process.env.INPUTS === "big" ? "big-inputs" : "builder-inputs");
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
console.log(
  `${caseId.slice(0, 8)} chars=${text.length} board=${brief.primaryItems.length} ms=${Date.now() - started}`,
);
