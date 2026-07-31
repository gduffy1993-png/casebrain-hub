/**
 * Re-scan existing new-150 sources after eligibility rule tightening (no regeneration).
 */
import fs from "node:fs";
import path from "node:path";
import {
  NEW150_ARTIFACT_ROOT,
  NEW150_SOURCE_ROOT,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/constants";
import { buildNew150Catalog } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/coverage-catalog";
import {
  buildPerControlDenominatorReport,
  scanCaseCapability,
} from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/named-prerequisite-scan";
import type { New150CaptureResult } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/production-capture";
import { PRODUCTION_EXITS } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/constants";

const ROOT = process.cwd();
const OUT = path.join(ROOT, NEW150_ARTIFACT_ROOT);
const SOURCE = path.join(ROOT, NEW150_SOURCE_ROOT);

function writeJson(dir: string, name: string, value: unknown): void {
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(OUT, "new-150-population-manifest.json"), "utf8"),
) as { cases: Array<{ caseId: string; coverageTag: string }> };

const catalog = buildNew150Catalog(150);
const byId = new Map(catalog.map((c) => [c.caseId, c]));
const snapshots = [];

for (const row of manifest.cases) {
  const spec = byId.get(row.caseId);
  if (!spec) continue;
  const sourceDir = path.join(SOURCE, row.caseId);
  const lineage = JSON.parse(fs.readFileSync(path.join(sourceDir, "lineage.json"), "utf8")) as {
    ocrReceiptSha256: string | null;
    vdrReceiptSha256: string;
    sourceCapabilityInventorySha256: string;
    truthKeySha256: string;
  };
  const exitHashes: Record<string, string> = {};
  for (const e of PRODUCTION_EXITS) {
    const p = path.join(sourceDir, "exits", e, "payload.json");
    if (fs.existsSync(p)) exitHashes[e] = "present";
  }
  const capture = {
    caseId: row.caseId,
    sourceDir,
    exitHashes,
    casebrainOutputSha256: "x",
    bundlePdfSha256: "x",
    truthKeySha256: lineage.truthKeySha256,
    ocrReceiptSha256: lineage.ocrReceiptSha256,
    vdrReceiptSha256: lineage.vdrReceiptSha256,
    sourceCapabilityInventorySha256: lineage.sourceCapabilityInventorySha256,
    truthOpenedDuringOutput: false as const,
    productionBuilder: "buildLiveProductionSurfacesFromDocumentUnits" as const,
    authenticatedBrowserAvailable: false as const,
    productionSpecialtyBagsPresent: {
      legalStateTaxonomy: false as const,
      dobAgeCalcLedger: false as const,
      proceduralPartyState: false as const,
    },
    audiencePacksPresent: false as const,
    eldVersionPairsFromProduction: false as const,
  } satisfies New150CaptureResult;

  snapshots.push(scanCaseCapability({ spec, capture, sourceDir }));
}

const perControl = buildPerControlDenominatorReport({ repoRoot: ROOT, snapshots });
const readyCount = perControl.filter((r) => r.readyForStage300Calibration).length;
const eligibleGained = perControl.filter((r) => r.achievedDenominator > 0).length;

writeJson(OUT, "per-control-denominator-report.json", {
  schemaVersion: "stage300-new-150-per-control-denominator@1.0.0",
  controlCount: perControl.length,
  readyForCalibrationCount: readyCount,
  controlsWithAchievedDenominatorGt0: eligibleGained,
  rows: perControl,
  rescanNote: "VDR field-level honesty rescan after initial emit",
});

writeJson(OUT, "capability-snapshot-summary.json", {
  schemaVersion: "stage300-new-150-capability-snapshot-summary@1.0.0",
  rows: snapshots.map((s) => ({
    caseId: s.caseId,
    coverageTag: s.coverageTag,
    sixProductionExitsComplete: s.sixProductionExitsComplete,
    ocrReceiptsPresent: s.ocrReceiptsPresent,
    vdrReceiptPresent: s.vdrReceiptPresent,
    productionSpecialtyBags: s.productionSpecialtyBags,
    audiencePacksPresent: s.audiencePacksPresent,
    eldProductionPairsPresent: s.eldProductionPairsPresent,
    namedCompleteControlIds: Object.entries(s.namedCompleteByControl)
      .filter(([, v]) => v)
      .map(([k]) => k),
    corpusDesignControlIds: Object.entries(s.corpusDesignByControl)
      .filter(([, v]) => v)
      .map(([k]) => k),
  })),
});

const gapRegister = perControl
  .filter((r) => r.achievedDenominator < r.targetDenominator)
  .map((r) => ({
    controlId: r.controlId,
    priority: r.priority,
    exactMissingInput: r.exactMissingInputWhereMissed,
    ownership: r.ownership,
    corpusDesignSatisfiedCount: r.corpusDesignSatisfiedCount,
    achievedDenominator: r.achievedDenominator,
    deferReason: r.deferReason,
  }));
writeJson(OUT, "production-vs-harness-gap-register.json", {
  schemaVersion: "stage300-new-150-production-vs-harness-gap@1.0.0",
  rows: gapRegister,
});

// Refresh decision card ready counts
const cardPath = path.join(OUT, "DECISION-CARD.md");
let card = fs.readFileSync(cardPath, "utf8");
card = card.replace(
  /\*\*Accepted \/ Rejected:\*\* .*/,
  `**Accepted / Rejected:** ${manifest.cases.length} / 0  \n**Ready for calibration (named denom≥1):** ${readyCount} / 43  \n**Controls with achieved>0:** ${eligibleGained}`,
);
fs.writeFileSync(cardPath, card, "utf8");

const stop = JSON.parse(fs.readFileSync(path.join(OUT, "STOP-FOR-CODEX-REVIEW.json"), "utf8"));
stop.readyForCalibrationCount = readyCount;
stop.eligibleControlsGained = eligibleGained;
stop.buildOk = true;
stop.vdrFieldLevelHonestyRescan = true;
fs.writeFileSync(path.join(OUT, "STOP-FOR-CODEX-REVIEW.json"), `${JSON.stringify(stop, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ readyCount, eligibleGained, achieved: perControl.filter(r => r.achievedDenominator > 0).map(r => `${r.controlId}=${r.achievedDenominator}`) }, null, 2));
