import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import { loadLocalPack } from "./bundle-fidelity-local";
import type {
  ExplanationFidelityCaseResult,
  ExplanationFidelitySection,
  ExplanationFidelitySummary,
} from "./explanation-fidelity-types";

const SCAFFOLD_NOTE =
  "Phase 3.5a scaffold: report paths and block schema only; generator and gold expectations in 3.5b.";

function emptySections(): ExplanationFidelitySection[] {
  return [
    { key: "missing-material", title: "Missing material explanations", blocks: [], contradictions: [] },
    { key: "contradictions", title: "Contradiction / inconsistency map", blocks: [], contradictions: [] },
    { key: "custody-interview", title: "Police station / interview caution", blocks: [], contradictions: [] },
    {
      key: "disclosure-dependencies",
      title: "Disclosure dependency explanations",
      blocks: [],
      contradictions: [],
    },
  ];
}

function runScaffoldCase(entry: BundleFidelityGoldEntry): ExplanationFidelityCaseResult {
  const truth = entry.truthKey;
  const label = truth.label ?? truth.bundleId;
  const linkStatus = truth.linkStatus ?? "runnable";

  if (linkStatus === "linked-only" || entry.bundleTextPaths.length === 0) {
    const reason =
      linkStatus === "linked-only"
        ? "Linked-only bundle — explanation fidelity runs when bundle text is exported."
        : "No bundle text paths — cannot explain without source text.";
    return {
      bundleId: truth.bundleId,
      label,
      linkStatus,
      skipped: true,
      skipReason: reason,
      overall: "skipped",
      bundleTextChars: 0,
      sections: emptySections(),
    };
  }

  const text = readBundleText(entry.bundleTextPaths);
  return {
    bundleId: truth.bundleId,
    label,
    linkStatus: "runnable",
    skipped: false,
    overall: "scaffold",
    scaffoldNote: SCAFFOLD_NOTE,
    bundleTextChars: text.length,
    sections: emptySections(),
  };
}

function summarizePack(pack: "gold" | "local", entries: BundleFidelityGoldEntry[]): ExplanationFidelitySummary {
  const results = entries.map(runScaffoldCase);
  const runnable = results.filter((r) => !r.skipped);

  return {
    generatedAt: new Date().toISOString(),
    pack,
    phase: "3.5a-scaffold",
    total: results.length,
    runnable: runnable.length,
    scaffolded: runnable.filter((r) => r.overall === "scaffold").length,
    passed: runnable.filter((r) => r.overall === "pass").length,
    failed: runnable.filter((r) => r.overall === "fail").length,
    needsReview: runnable.filter((r) => r.overall === "needs_review").length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}

export function runExplanationGoldPack(): ExplanationFidelitySummary {
  return summarizePack("gold", loadGoldPack());
}

export function runExplanationLocalPack(): {
  summary: ExplanationFidelitySummary;
  warnings: string[];
} {
  const { entries, warnings } = loadLocalPack();
  return { summary: summarizePack("local", entries), warnings };
}
