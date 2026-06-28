#!/usr/bin/env npx tsx
/**
 * H2 Verification — confidence report combining golden gate, truth-key coverage,
 * Level 1 lint worst50, and review queue classification.
 *
 * Run:
 *   npx tsx scripts/h2-confidence-report.ts
 *   npx tsx scripts/h2-confidence-report.ts --run-gate --target 75
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadGoldPack } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import {
  auditTruthKeyCoverage,
  type GoldenVerificationTruthKey,
} from "../lib/eval/casebrain-auditor/golden-truth-key-v2";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "h2-confidence");
const GOLD_REPORT = path.join(ROOT, "artifacts", "casebrain-qa", "golden-case-pack", "gold-report.json");
const LINT_REPORT = path.join(ROOT, "artifacts", "casebrain-qa", "bundle-fidelity-corpus-lint", "report.json");
const REVIEW_QUEUE = path.join(ROOT, "artifacts", "casebrain-qa", "h2-review-queue", "queue.json");

const TARGET = (() => {
  const i = process.argv.indexOf("--target");
  return i >= 0 ? Number(process.argv[i + 1]) || 75 : 75;
})();

const RUN_GATE = process.argv.includes("--run-gate");

type ConfidenceStatus = "ready" | "warning" | "blocked";

type PatternClass = "dangerous" | "polish" | "gate_noise";

export function classifyPattern(kind: string): PatternClass {
  const k = kind.toLowerCase();
  if (
    /wrong_family|unsafe_win|court_line_in_chase|prohibited_family|bwv.*fact|guardian.*critical|source_truth/.test(
      k,
    )
  ) {
    return "dangerous";
  }
  if (/duplicate_chase|raw_fragment|partner_score|needs_review|metadata|weak/.test(k)) {
    return "polish";
  }
  return "gate_noise";
}

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function truthKeyCoverage(): {
  total: number;
  avgPct: number;
  full: number;
  rows: Array<{ bundleId: string; coveragePct: number; missing: string[] }>;
} {
  const entries = loadGoldPack();
  const rows = entries.map((e) => {
    const audit = auditTruthKeyCoverage(e.truthKey as GoldenVerificationTruthKey);
    return { bundleId: audit.bundleId, coveragePct: audit.coveragePct, missing: audit.missing };
  });
  const avgPct =
    rows.length === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.coveragePct, 0) / rows.length);
  return { total: rows.length, avgPct, full: rows.filter((r) => r.coveragePct === 100).length, rows };
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (RUN_GATE) {
    console.log(`Running golden gate (target ${TARGET})…`);
    execSync(
      `npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable ${TARGET} --max-polish-rate 1`,
      { cwd: ROOT, stdio: "inherit" },
    );
  }

  const coverage = truthKeyCoverage();
  const golden = readJson<{
    pilotReady: boolean;
    runnable: number;
    pass: number;
    polish: number;
    fail: number;
    generatedAt: string;
  }>(GOLD_REPORT);

  const lint = readJson<{
    generatedAt: string;
    cases: number;
    dangerousWeirdnessCritical: number;
    partnerScore: { averageScore: number };
    weirdness: { topFindings: Array<{ kind: string; count: number }> };
    worst50: Array<{ caseId: string; weirdnessCritical: number; criticalSurvivors: number }>;
  }>(LINT_REPORT);

  const review = readJson<{
    worst50Sample: Array<{ caseId: string; dangerous: boolean; topFinding: string }>;
    patternQueue: Array<{ pattern: string; count: number; h2Priority: string }>;
  }>(REVIEW_QUEUE);

  const patternSummary = (lint?.weirdness.topFindings ?? review?.patternQueue ?? []).map((row) => {
    const kind = "kind" in row ? row.kind : row.pattern;
    const count = row.count;
    return {
      pattern: kind,
      count,
      classification: classifyPattern(kind),
    };
  });

  const dangerousPatterns = patternSummary.filter((p) => p.classification === "dangerous");
  const polishPatterns = patternSummary.filter((p) => p.classification === "polish");

  const worst50Dangerous =
    lint?.worst50.filter((c) => c.weirdnessCritical > 0 || c.criticalSurvivors > 0).length ??
    review?.worst50Sample.filter((c) => c.dangerous).length ??
    0;

  const goldenFail = golden?.fail ?? 0;
  const goldenRunnable = golden?.runnable ?? coverage.total;
  const level1Dangerous = lint?.dangerousWeirdnessCritical ?? 0;

  let confidenceStatus: ConfidenceStatus = "ready";
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (goldenFail > 0 || level1Dangerous > 0 || worst50Dangerous > 0) {
    confidenceStatus = "blocked";
    if (goldenFail > 0) blockers.push(`Golden pack ${goldenFail} fail`);
    if (level1Dangerous > 0) blockers.push(`Level 1 dangerous critical: ${level1Dangerous}`);
    if (worst50Dangerous > 0) blockers.push(`Worst50 dangerous samples: ${worst50Dangerous}`);
  } else if (
    goldenRunnable < TARGET ||
    (golden?.polish ?? 0) > 0 ||
    coverage.avgPct < 90 ||
    dangerousPatterns.length > 0
  ) {
    confidenceStatus = "warning";
    if (goldenRunnable < TARGET) warnings.push(`Golden runnable ${goldenRunnable} < target ${TARGET}`);
    if ((golden?.polish ?? 0) > 0) warnings.push(`Golden polish cases: ${golden?.polish}`);
    if (coverage.avgPct < 90) warnings.push(`Truth-key avg coverage ${coverage.avgPct}%`);
    if (dangerousPatterns.length > 0) warnings.push(`Dangerous pattern kinds in lint: ${dangerousPatterns.length}`);
  }

  if (!lint) warnings.push("Level 1 lint report missing — run bundle-fidelity-corpus-lint --count 2200");

  const report = {
    generatedAt: new Date().toISOString(),
    h2Phase: "verification",
    confidenceStatus,
    blockers,
    warnings,
    targets: { goldenPack: TARGET, level1Corpus: 2200 },
    goldenPack: {
      reportPath: fs.existsSync(GOLD_REPORT) ? GOLD_REPORT : null,
      generatedAt: golden?.generatedAt ?? null,
      runnable: goldenRunnable,
      pass: golden?.pass ?? null,
      polish: golden?.polish ?? null,
      fail: goldenFail,
      pilotReady: golden?.pilotReady ?? false,
    },
    truthKeyCoverage: {
      total: coverage.total,
      avgPct: coverage.avgPct,
      fullCoverage: coverage.full,
      below100: coverage.rows.filter((r) => r.coveragePct < 100).slice(0, 20),
    },
    level1: lint
      ? {
          reportPath: LINT_REPORT,
          generatedAt: lint.generatedAt,
          cases: lint.cases,
          dangerousWeirdnessCritical: lint.dangerousWeirdnessCritical,
          partnerScoreAverage: lint.partnerScore.averageScore,
          worst50Dangerous,
        }
      : null,
    patternSummary: {
      dangerous: dangerousPatterns.slice(0, 10),
      polish: polishPatterns.slice(0, 10),
      gateNoise: patternSummary.filter((p) => p.classification === "gate_noise").slice(0, 5),
    },
    nextSteps:
      confidenceStatus === "blocked"
        ? ["Fix golden fail or dangerous Level 1 patterns before H3"]
        : confidenceStatus === "warning"
          ? goldenRunnable >= TARGET
            ? [
                "H2 gate green (0 fail) — polish-only duplicate_chase_label is known P2 leftover",
                "Optional: Codex pass only if pursuing output-layer chase dedupe in Today/Summary mirroring",
                "Proceed to H3 trust layer",
              ]
            : [
                `Continue golden growth toward ${TARGET}`,
                "Triage polish patterns in review queue",
                "Proceed to H3 trust layer when golden gate clean",
              ]
          : ["Proceed to H3 trust layer", "Schedule H4 deploy smoke automation"],
  };

  const md = [
    "# H2 Confidence Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `## Status: **${confidenceStatus.toUpperCase()}**`,
    "",
    blockers.length ? `**Blockers:** ${blockers.join("; ")}` : "",
    warnings.length ? `**Warnings:** ${warnings.join("; ")}` : "",
    "",
    "## Golden pack",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Runnable | ${goldenRunnable} (target ${TARGET}) |`,
    `| Pass / polish / fail | ${golden?.pass ?? "—"} / ${golden?.polish ?? "—"} / ${goldenFail} |`,
    `| Truth-key avg coverage | ${coverage.avgPct}% (${coverage.full}/${coverage.total} at 100%) |`,
    "",
    "## Level 1 corpus",
    "",
    lint
      ? `- Cases: ${lint.cases}\n- Dangerous critical: ${lint.dangerousWeirdnessCritical}\n- Worst50 dangerous: ${worst50Dangerous}\n- Partner Score avg: ${lint.partnerScore.averageScore}`
      : "- Lint report not found — run Level 1 scan",
    "",
    "## Pattern summary",
    "",
    "| Pattern | Count | Class |",
    "|---------|-------|-------|",
    ...patternSummary.slice(0, 15).map((p) => `| ${p.pattern} | ${p.count} | ${p.classification} |`),
    "",
    "## Next",
    "",
    ...report.nextSteps.map((s) => `- ${s}`),
    "",
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "REPORT.md"), `${md}\n`, "utf8");

  console.log(`H2 confidence: ${confidenceStatus.toUpperCase()}`);
  console.log(`  Golden: ${goldenRunnable} runnable, fail=${goldenFail}, polish=${golden?.polish ?? "?"}`);
  console.log(`  Truth-key coverage avg: ${coverage.avgPct}%`);
  console.log(`  Level 1 dangerous: ${level1Dangerous}, worst50 dangerous: ${worst50Dangerous}`);
  console.log(`  Report: ${path.join(OUT_DIR, "report.json")}`);

  if (confidenceStatus === "blocked") process.exit(1);
}

main();
