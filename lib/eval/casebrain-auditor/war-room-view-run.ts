import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import { evaluateWarRoomViewCase, loadWarRoomViewGoldExpect } from "./war-room-view-expect";
import { generateWarRoomView } from "./war-room-view-generate";
import { generateProofMap } from "./proof-map-generate";
import type { WarRoomViewCaseResult, WarRoomViewSummary } from "./war-room-view-types";

function runGoldCase(entry: BundleFidelityGoldEntry): WarRoomViewCaseResult {
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
      safeHearingLine: "",
      courtRecordRequests: [],
      disclosureTimetableRequests: [],
      prosecutionResponsePoints: [],
      doNotConcede: [],
      doNotOverstate: "",
      solicitorReviewRequired: true,
      solicitorReviewReasons: ["No bundle text"],
      hearingRisks: [],
      nextHearingActions: [],
      proofMapProofPointIds: [],
      skipped: true,
      skipReason: "No bundle text paths",
      overall: "skipped",
      bundleTextChars: 0,
    };
  }

  const text = readBundleText(entry.bundleTextPaths);
  const expect = loadWarRoomViewGoldExpect(truth.bundleId);

  if (!expect) {
    const map = generateProofMap(truth.bundleId, label, text);
    const view = generateWarRoomView(map);
    return {
      ...view,
      skipped: false,
      overall: "needs_review",
      scaffoldNote: "No gold war-room-view expect — generator only (4c slice 1).",
    };
  }

  const { view, failures } = evaluateWarRoomViewCase(truth.bundleId, label, text);
  return {
    ...view,
    skipped: false,
    overall: failures.length ? "fail" : "pass",
    scaffoldNote: failures.length ? failures.slice(0, 5).join("; ") : undefined,
  };
}

export function runWarRoomViewGoldPack(): WarRoomViewSummary {
  const entries = loadGoldPack();
  const results = entries.map(runGoldCase);
  const runnable = results.filter((r) => !r.skipped);

  return {
    generatedAt: new Date().toISOString(),
    pack: "gold",
    phase: "4c-slice-1",
    total: results.length,
    runnable: runnable.length,
    passed: runnable.filter((r) => r.overall === "pass").length,
    failed: runnable.filter((r) => r.overall === "fail").length,
    needsReview: runnable.filter((r) => r.overall === "needs_review").length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}
