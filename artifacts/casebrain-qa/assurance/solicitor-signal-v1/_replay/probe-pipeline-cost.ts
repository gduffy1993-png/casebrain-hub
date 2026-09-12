/**
 * What every other bundle reader costs once the chase board is no longer the bottleneck.
 *
 * The board now builds in about 4 seconds on a 1.6-million-character bundle. Raising the scan cap
 * still hangs a solicitor tab if any of these other readers — contradictions, brief plan, war room,
 * metadata scan — scale with the extra text. This measures them on the same three captures.
 */
import fs from "node:fs";
import path from "node:path";

import { buildDisclosureChaseBrief } from "../../../../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../../../../../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../../../../../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../../../../../lib/criminal/bundle-truth-ledger";
import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";
import { canonicalRowsForBuilder } from "../../../../../lib/criminal/canonical-evidence-status-bridge";
import { buildMetadataScan } from "../../../../../lib/criminal/extract-bundle-case-metadata";
import { extractAllBundleContradictions } from "../../../../../lib/criminal/merge-bundle-contradictions";

const dir = path.join(__dirname, process.env.INPUTS === "big" ? "big-inputs" : "builder-inputs");
const cases = [
  "687cf5a6-6898-4257-baef-33e33ace08df",
  "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
  "f57a2750-d24e-42a2-9f73-92384db565dc",
];

function timed<T>(fn: () => T): { ms: number; value: T } {
  const started = Date.now();
  const value = fn();
  return { ms: Date.now() - started, value };
}

for (const caseId of cases) {
  const captured = JSON.parse(
    fs.readFileSync(path.join(dir, `${caseId}.builder-inputs.json`), "utf8"),
  );
  const bundleSource = captured.bundleSource?.data ?? null;
  const text: string = bundleSource?.frontMatterScan ?? "";
  const battleboard = captured.battleboard?.data ?? null;

  const scan = timed(() => buildMetadataScan(text));
  const materials = timed(() => normaliseBundleMaterials(text));
  const ledger = timed(() => buildBundleTruthLedger({ bundleText: text }));
  const contra = timed(() => extractAllBundleContradictions(text));
  const plan = timed(() =>
    buildCriminalBriefPlan({
      bundleText: text,
      ledger: ledger.value,
      missingMaterial: [],
      allegation: "Murder",
    }),
  );
  const board = timed(() =>
    buildDisclosureChaseBrief({
      caseId,
      caseTitle: "Case",
      clientLabel: null,
      allegation: null,
      stage: null,
      hearingStatus: null,
      hearingDateIso: null,
      bundleHealth: "partial",
      positionStatus: null,
      battleboard,
      snapshotMissing: canonicalRowsForBuilder(bundleSource?.canonical ?? null),
      bundleText: text,
      profileHint: null,
      canonicalFindings: bundleSource?.canonical?.findingSummaries ?? [],
      canonicalEvidenceRows: (bundleSource?.canonical?.evidenceRows ?? []).map((r: any) => ({
        label: r.label,
        state: r.existence,
      })),
    } as never),
  );
  const war = timed(() =>
    buildHearingWarRoomBrief({
      caseId,
      caseTitle: "Case",
      clientLabel: "",
      allegation: "",
      stage: "",
      hearingStatus: "",
      bundleHealth: "partial",
      positionStatus: "",
      readiness: "",
      battleboard,
      hasSavedPosition: false,
      chaseItems: [],
      bundleText: text,
      profileHint: null,
    }),
  );

  const pad = (n: number) => String(n).padStart(6);
  console.log(
    `${caseId.slice(0, 8)} chars=${String(text.length).padStart(8)}  ` +
      `scan=${pad(scan.ms)}  materials=${pad(materials.ms)}  ledger=${pad(ledger.ms)}  ` +
      `contra=${pad(contra.ms)}  plan=${pad(plan.ms)}  board=${pad(board.ms)}  war=${pad(war.ms)}  ` +
      `boardCards=${(board.value as any).primaryItems.length}`,
  );
}
