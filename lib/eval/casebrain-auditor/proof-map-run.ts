import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import { generateProofMap } from "./proof-map-generate";
import { evaluateProofMapCase, loadProofMapGoldExpect } from "./proof-map-expect";
import type { ProofMapCaseResult, ProofMapSummary } from "./proof-map-types";

function runGoldCase(entry: BundleFidelityGoldEntry): ProofMapCaseResult {
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
      humanReviewRequired: true,
      humanReviewReasons: ["No bundle text"],
      proofPoints: [],
      links: [],
      skipped: true,
      skipReason: "No bundle text paths",
      overall: "skipped",
      bundleTextChars: 0,
    };
  }

  const text = readBundleText(entry.bundleTextPaths);
  const expect = loadProofMapGoldExpect(truth.bundleId);

  if (!expect) {
    const map = generateProofMap(truth.bundleId, label, text);
    return {
      ...map,
      skipped: false,
      overall: "needs_review",
      scaffoldNote: "No gold proof-map expect — generator only (4a slice 1).",
    };
  }

  const { map, failures } = evaluateProofMapCase(truth.bundleId, label, text);
  return {
    ...map,
    skipped: false,
    overall: failures.length ? "fail" : "pass",
    scaffoldNote: failures.length ? failures.slice(0, 5).join("; ") : undefined,
  };
}

export function runProofMapGoldPack(): ProofMapSummary {
  const entries = loadGoldPack();
  const results = entries.map(runGoldCase);
  const runnable = results.filter((r) => !r.skipped);

  return {
    generatedAt: new Date().toISOString(),
    pack: "gold",
    phase: "4a-slice-1",
    total: results.length,
    runnable: runnable.length,
    passed: runnable.filter((r) => r.overall === "pass").length,
    failed: runnable.filter((r) => r.overall === "fail").length,
    needsReview: runnable.filter((r) => r.overall === "needs_review").length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}
