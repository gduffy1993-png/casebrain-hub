/**
 * Replay the chase board offline with the inputs the live tab actually passes.
 *
 * The point is parity. An offline result that disagrees with the screen is not evidence of
 * anything, and until this agrees case by case, no number produced offline can be trusted.
 * Mirrors the `buildDisclosureChaseBrief` call in `components/criminal/disclosure-chase/DisclosureChase.tsx`.
 */
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "../../../../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { canonicalRowsForBuilder } from "../../../../../lib/criminal/canonical-evidence-status-bridge";
import { formatCaseBundleHealthLabel } from "../../../../../lib/criminal/format-case-bundle-health";

const inputsDir = path.join(__dirname, "builder-inputs");

type Captured = {
  bundleSource?: { status: number; data: any } | null;
  battleboard?: { status: number; data: any } | null;
  matter?: { status: number; data: any } | null;
  position?: { status: number; data: any } | null;
};

function briefForCase(caseId: string) {
  const captured: Captured = JSON.parse(
    fs.readFileSync(path.join(inputsDir, `${caseId}.builder-inputs.json`), "utf8"),
  );
  const bundleSource = captured.bundleSource?.data ?? null;
  const battleboard = captured.battleboard?.data ?? null;
  const matter = captured.matter?.data ?? null;

  const canonicalRows = canonicalRowsForBuilder(bundleSource?.canonical ?? null);

  const bundleHealth = formatCaseBundleHealthLabel({
    documentCount: bundleSource?.documentCount ?? 0,
    combinedTextLength: bundleSource?.combinedTextLength ?? 0,
    battleboard,
    documentRows: bundleSource?.documentRows,
  });

  return buildDisclosureChaseBrief({
    caseId,
    caseTitle: matter?.caseTitle ?? bundleSource?.caseMetadata?.caseTitle ?? "Case",
    clientLabel: matter?.clientName ?? null,
    allegation: matter?.offence ?? bundleSource?.canonical?.charges?.[0]?.label ?? null,
    stage: matter?.stage ?? null,
    hearingStatus: null,
    hearingDateIso: matter?.nextHearingDate ?? null,
    bundleHealth,
    positionStatus: null,
    battleboard,
    snapshotMissing: canonicalRows,
    proceduralOutstanding: undefined,
    bundleText: bundleSource?.frontMatterScan ?? null,
    profileHint: null,
    canonicalFindings: bundleSource?.canonical?.findingSummaries ?? [],
    canonicalEvidenceRows: (bundleSource?.canonical?.evidenceRows ?? []).map((r: any) => ({
      label: r.label,
      state: r.existence,
    })),
  } as any);
}

const caseIds = fs
  .readdirSync(inputsDir)
  .filter((f) => f.endsWith(".builder-inputs.json"))
  .map((f) => f.replace(".builder-inputs.json", ""));

const report: Record<string, unknown> = {};
for (const caseId of caseIds) {
  const brief = briefForCase(caseId);
  const primary = (brief.primaryItems ?? []).map((i: any) => ({
    ref: i.sourceScheduleRef ?? null,
    label: i.label,
    family: i.familyId,
    status: i.baseStatus,
  }));
  report[caseId] = primary;
  console.log(`\n=== ${caseId} — ${primary.length} primary items ===`);
  for (const p of primary) {
    console.log(`  ${(p.ref ?? "—").padEnd(12)} ${p.label} [${p.family}/${p.status}]`);
  }
}

fs.writeFileSync(
  path.join(__dirname, "OFFLINE-CHASE-PARITY.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);
