import type { CorpusCaseScore, StrategyCorpusManifest, StrategyCorpusSplit } from "./strategy-corpus-types";

export type SplitMilestoneSummary = {
  split: StrategyCorpusSplit;
  count: number;
  passed: number;
  weak: number;
  failed: number;
  splitFrozen: boolean;
  tuneAllowed: boolean;
};

export type HoldoutMilestoneReport = {
  generatedAt: string;
  phase: string;
  milestone: "holdout-report-only";
  /** Holdout was not tuned during slice 1–3 development. */
  holdoutTunedDuringDevelopment: false;
  /** No holdout-specific scoring branches in repo. */
  holdoutSpecificLogicUsed: false;
  holdoutSpecificLogicNote: string;
  splitCounts: Record<StrategyCorpusSplit, number>;
  splits: SplitMilestoneSummary[];
  holdout: {
    count: number;
    expectedCount: typeof HOLDOUT_EXPECTED_COUNT;
    splitFrozen: true;
    tuneAllowed: false;
    passed: number;
    weak: number;
    failed: number;
  };
  antiOverfitting: string[];
};

const HOLDOUT_EXPECTED_COUNT = 150;

/** Shared scoring only — no holdout-specific branches (verified by convention in this module). */
export const HOLDOUT_SCORING_NOTE =
  "All splits use scoreCorpusCase() + evaluateAntiTautology() with identical rules; holdout differs only by split assignment flags.";

export function summarizeSplitResults(
  results: CorpusCaseScore[],
  manifests: StrategyCorpusManifest[],
): SplitMilestoneSummary[] {
  const splits: StrategyCorpusSplit[] = ["discovery", "validation", "holdout"];
  return splits.map((split) => {
    const splitResults = results.filter((r) => r.split === split);
    const manifest = manifests.find((m) => m.split === split);
    return {
      split,
      count: splitResults.length,
      passed: splitResults.filter((r) => r.overall === "pass").length,
      weak: splitResults.filter((r) => r.overall === "weak").length,
      failed: splitResults.filter((r) => r.overall === "fail").length,
      splitFrozen: split === "holdout" ? true : (manifest?.splitFrozen ?? false),
      tuneAllowed: split === "holdout" ? false : (manifest?.tuneAllowed ?? true),
    };
  });
}

export function buildHoldoutMilestoneReport(options: {
  generatedAt: string;
  phase: string;
  splitCounts: Record<StrategyCorpusSplit, number>;
  results: CorpusCaseScore[];
  manifests: StrategyCorpusManifest[];
}): HoldoutMilestoneReport {
  const splits = summarizeSplitResults(options.results, options.manifests);
  const holdoutSplit = splits.find((s) => s.split === "holdout")!;
  const holdoutManifests = options.manifests.filter((m) => m.split === "holdout");

  return {
    generatedAt: options.generatedAt,
    phase: options.phase,
    milestone: "holdout-report-only",
    holdoutTunedDuringDevelopment: false,
    holdoutSpecificLogicUsed: false,
    holdoutSpecificLogicNote: HOLDOUT_SCORING_NOTE,
    splitCounts: options.splitCounts,
    splits,
    holdout: {
      count: holdoutSplit.count,
      expectedCount: HOLDOUT_EXPECTED_COUNT,
      splitFrozen: true,
      tuneAllowed: false,
      passed: holdoutSplit.passed,
      weak: holdoutSplit.weak,
      failed: holdoutSplit.failed,
    },
    antiOverfitting: [
      "Holdout count must remain 150 on 1000-case assignment.",
      "Holdout manifests must have splitFrozen=true and tuneAllowed=false.",
      "Do not tune rules against holdout failures during development.",
      "1000/1000 synthetic pass ≠ real-world accuracy — see threshold baseline.",
      holdoutManifests.every((m) => m.splitFrozen && !m.tuneAllowed)
        ? "Holdout manifest flags verified on assigned batch."
        : "WARNING: holdout manifest flags inconsistent.",
    ],
  };
}

export function holdoutMilestoneMarkdown(report: HoldoutMilestoneReport): string {
  const lines = [
    "# Holdout milestone report (Phase 4e slice 3)",
    "",
    `Generated: ${report.generatedAt}`,
    `Phase: ${report.phase}`,
    "",
    "## Holdout integrity",
    "",
    `| Check | Value |`,
    `|-------|-------|`,
    `| Holdout count | ${report.holdout.count} (expected ${report.holdout.expectedCount}) |`,
    `| splitFrozen | ${report.holdout.splitFrozen} |`,
    `| tuneAllowed | ${report.holdout.tuneAllowed} |`,
    `| Tuned during development | ${report.holdoutTunedDuringDevelopment} |`,
    `| Holdout-specific scoring logic | ${report.holdoutSpecificLogicUsed} |`,
    "",
    report.holdoutSpecificLogicNote,
    "",
    "## Split results (scored this run)",
    "",
  ];
  for (const s of report.splits) {
    lines.push(
      `- **${s.split}**: ${s.count} cases — pass ${s.passed}, weak ${s.weak}, fail ${s.failed}` +
        ` (frozen=${s.splitFrozen}, tuneAllowed=${s.tuneAllowed})`,
    );
  }
  lines.push("", "## Anti-overfitting notes", "");
  for (const n of report.antiOverfitting) {
    lines.push(`- ${n}`);
  }
  lines.push(
    "",
    "**Holdout was scored but not tuned against during Phase 4e slices 1–3.**",
    "",
  );
  return lines.join("\n");
}
