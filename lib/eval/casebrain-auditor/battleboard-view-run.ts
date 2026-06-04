import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import { evaluateBattleboardViewCase } from "./battleboard-view-expect";
import { generateBattleboardView } from "./battleboard-view-generate";
import { generateProofMap } from "./proof-map-generate";
import type { BattleboardViewCaseResult, BattleboardViewSummary } from "./battleboard-view-types";
import { loadBattleboardViewGoldExpect } from "./battleboard-view-expect";

function runGoldCase(entry: BundleFidelityGoldEntry): BattleboardViewCaseResult {
  const truth = entry.truthKey;
  const label = truth.label ?? truth.bundleId;
  const linkStatus = truth.linkStatus ?? "runnable";

  if (linkStatus === "linked-only" || entry.bundleTextPaths.length === 0) {
    return {
      bundleId: truth.bundleId,
      label,
      charge: "",
      stage: null,
      offenceLens: "unknown",
      primaryRoute: "",
      whyRouteIsLive: "",
      proofPointsAttacked: [],
      evidenceHelpingDefence: [],
      evidenceHurtingDefence: [],
      missingMaterial: [],
      contradictions: [],
      collapseRisks: [],
      routeChangeTriggers: [],
      disclosureChasePriorities: [],
      safeNextAction: "",
      doNotOverstateWarning: "",
      humanReviewRequired: true,
      humanReviewReasons: ["No bundle text"],
      proofMapProofPointIds: [],
      skipped: true,
      skipReason: "No bundle text paths",
      overall: "skipped",
      bundleTextChars: 0,
    };
  }

  const text = readBundleText(entry.bundleTextPaths);
  const expect = loadBattleboardViewGoldExpect(truth.bundleId);

  if (!expect) {
    const map = generateProofMap(truth.bundleId, label, text);
    const view = generateBattleboardView(map, text);
    return {
      ...view,
      skipped: false,
      overall: "needs_review",
      scaffoldNote: "No gold battleboard-view expect — generator only (4b slice 1).",
    };
  }

  const { view, failures } = evaluateBattleboardViewCase(truth.bundleId, label, text);
  return {
    ...view,
    skipped: false,
    overall: failures.length ? "fail" : "pass",
    scaffoldNote: failures.length ? failures.slice(0, 5).join("; ") : undefined,
  };
}

export function runBattleboardViewGoldPack(): BattleboardViewSummary {
  const entries = loadGoldPack();
  const results = entries.map(runGoldCase);
  const runnable = results.filter((r) => !r.skipped);

  return {
    generatedAt: new Date().toISOString(),
    pack: "gold",
    phase: "4b-slice-1",
    total: results.length,
    runnable: runnable.length,
    passed: runnable.filter((r) => r.overall === "pass").length,
    failed: runnable.filter((r) => r.overall === "fail").length,
    needsReview: runnable.filter((r) => r.overall === "needs_review").length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}
