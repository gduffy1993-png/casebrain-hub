#!/usr/bin/env npx tsx
/**
 * H3 scale confidence gate — golden 102 trust/copy rules (not Taylor/Jordan).
 *
 * Run: npx tsx scripts/h3-golden-trust-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger, guardBattleboardOutput } from "../lib/criminal/bundle-truth-ledger";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildMatterConfidence } from "../lib/criminal/matter-confidence/build-matter-confidence";
import { buildCopySafeResult, inferChaseItemSourceState } from "../lib/criminal/trust/copy-safe";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h3-confidence");
const LINT_REPORT = path.join(process.cwd(), "artifacts", "casebrain-qa", "bundle-fidelity-corpus-lint", "report.json");

type LintReport = {
  generatedAt?: string;
  cases?: number;
  dangerousWeirdnessCritical?: number;
  worst50?: Array<{ weirdnessCritical?: number; criticalSurvivors?: number }>;
};

type CaseResult = {
  bundleId: string;
  label: string;
  skipped: boolean;
  blocking: string[];
  confusing: string[];
  chaseItems: number;
  sendability: Record<string, number>;
  sourceStates: Record<string, number>;
  matterLevel: string;
  chaseSendability: string;
};

function bundleHealthTier(docCount: number, textLen: number): "ready" | "thin" | "unknown" {
  if (docCount === 0 || textLen === 0) return "unknown";
  if (textLen < 12_000 || docCount < 2) return "thin";
  return "ready";
}

function runCase(entry: (ReturnType<typeof loadGoldPack>[number])): CaseResult {
  const truth = entry.truthKey;
  if (!entry.bundleTextPaths.length) {
    return {
      bundleId: truth.bundleId,
      label: truth.label ?? truth.bundleId,
      skipped: true,
      blocking: [],
      confusing: [],
      chaseItems: 0,
      sendability: {},
      sourceStates: {},
      matterLevel: "skip",
      chaseSendability: "skip",
    };
  }

  const bundleText = readBundleText(entry.bundleTextPaths);
  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: truth.missingMaterialExpected ?? [],
    allegation: header.allegation,
  });
  const battleboard = guardBattleboardOutput(
    buildStrategyBattleboard({
      case_id: truth.bundleId,
      bundle_text: bundleText,
      offence_label: header.allegation,
    }),
    { ledger, bundleText },
  );
  const chase = buildDisclosureChaseBrief({
    caseId: truth.bundleId,
    caseTitle: truth.label ?? truth.bundleId,
    clientLabel: header.clientLabel?.trim() || truth.defendant,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: header.nextHearing,
    bundleHealth: "Golden pack",
    positionStatus: "Provisional",
    hearingDateIso: ledger.hearing.dateIso,
    battleboard,
    snapshotMissing: (truth.missingMaterialExpected ?? []).map((label) => ({
      label,
      status: "outstanding",
    })),
    bundleText,
    briefPlan,
  });

  const docCount = entry.bundleTextPaths.length;
  const textLen = bundleText.length;
  const matterConfidence = buildMatterConfidence({
    documentCount: Math.max(docCount, 1),
    combinedTextLength: textLen,
    bundleHealth: bundleHealthTier(docCount, textLen),
    missingMaterialCount: truth.missingMaterialExpected?.length ?? chase.items.length,
    genericProvisional: /provisional|generic/i.test(String(truth.expectedWorkflowProfile ?? "")),
    hasSafeCourtLine: Boolean(chase.safeCourtLine?.trim()),
  });

  const blocking: string[] = [];
  const confusing: string[] = [];
  const sendability: Record<string, number> = {};
  const sourceStates: Record<string, number> = {};

  for (const item of chase.items) {
    const sourceState = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    sourceStates[sourceState] = (sourceStates[sourceState] ?? 0) + 1;

    const cps = buildCopySafeResult({
      text: item.draftChaseWording,
      kind: "cps_chase",
      sourceState,
      sourceLabel: item.source,
    });
    sendability[cps.sendability] = (sendability[cps.sendability] ?? 0) + 1;

    if (cps.sendability === "safe_to_send") {
      blocking.push(`h3.unsafe_safe_to_send:${item.label.slice(0, 40)}`);
    }
    if (!cps.canCopy && cps.blockedReason?.includes("Court wording")) {
      blocking.push(`h3.court_in_cps:${item.label.slice(0, 40)}`);
    }
    if (sourceState === "served" && cps.sendability !== "needs_solicitor_review") {
      confusing.push(`h3.served_not_needs_review:${item.label.slice(0, 40)}`);
    }
    if (sourceState === "missing" && cps.sendability === "safe_to_send") {
      blocking.push(`h3.missing_marked_safe:${item.label.slice(0, 40)}`);
    }
  }

  const badgeCount = matterConfidence.sourceBadgesVisible.length;
  if (badgeCount > 3) {
    confusing.push(`h3.header_badge_noise:${badgeCount}_visible_badges`);
  }
  if (
    matterConfidence.sourceBadges.length > 3 &&
    matterConfidence.sourceBadgesOverflow.length === 0
  ) {
    confusing.push(`h3.header_badge_uncapped:${matterConfidence.sourceBadges.length}_badges`);
  }
  if (matterConfidence.level === "safe" && matterConfidence.sourceBadges.includes("missing")) {
    confusing.push("h3.safe_with_missing_badge");
  }
  if (
    matterConfidence.chaseSendability === "provisional_check_source" &&
    sendability["blocked"] === chase.items.length &&
    chase.items.length > 0
  ) {
    confusing.push("h3.all_chase_copy_blocked");
  }

  return {
    bundleId: truth.bundleId,
    label: truth.label ?? truth.bundleId,
    skipped: false,
    blocking,
    confusing,
    chaseItems: chase.items.length,
    sendability,
    sourceStates,
    matterLevel: matterConfidence.level,
    chaseSendability: matterConfidence.chaseSendability,
  };
}

function main(): void {
  const entries = loadGoldPack();
  const results = entries.map(runCase);
  const runnable = results.filter((r) => !r.skipped);
  const withBlocking = runnable.filter((r) => r.blocking.length > 0);
  const withConfusing = runnable.filter((r) => r.confusing.length > 0);

  let lint: LintReport | null = null;
  if (fs.existsSync(LINT_REPORT)) {
    lint = JSON.parse(fs.readFileSync(LINT_REPORT, "utf8")) as LintReport;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H3 Golden Trust Gate",
    note: "Scale gate on golden 102 — Taylor/Jordan are fresh-user smoke only.",
    golden: {
      total: results.length,
      runnable: runnable.length,
      blockingFail: withBlocking.length,
      confusingOnly: withConfusing.filter((r) => !r.blocking.length).length,
    },
    level1: lint
      ? {
          generatedAt: lint.generatedAt ?? "unknown",
          cases: lint.cases,
          dangerousWeirdnessCritical: lint.dangerousWeirdnessCritical,
          worst50Dangerous: Array.isArray(lint.worst50)
            ? lint.worst50.filter(
                (c) => (c.weirdnessCritical ?? 0) > 0 || (c.criticalSurvivors ?? 0) > 0,
              ).length
            : null,
        }
      : null,
    sendabilityTotals: runnable.reduce<Record<string, number>>((acc, r) => {
      for (const [k, v] of Object.entries(r.sendability)) {
        acc[k] = (acc[k] ?? 0) + v;
      }
      return acc;
    }, {}),
    sourceStateTotals: runnable.reduce<Record<string, number>>((acc, r) => {
      for (const [k, v] of Object.entries(r.sourceStates)) {
        acc[k] = (acc[k] ?? 0) + v;
      }
      return acc;
    }, {}),
    status:
      withBlocking.length > 0 ? "blocked" : withConfusing.length > 0 ? "warning" : "pass",
    blockingCases: withBlocking.slice(0, 20).map((r) => ({
      bundleId: r.bundleId,
      label: r.label,
      issues: r.blocking,
    })),
    confusingCases: withConfusing
      .sort((a, b) => b.confusing.length - a.confusing.length)
      .slice(0, 25)
      .map((r) => ({
        bundleId: r.bundleId,
        label: r.label,
        issues: r.confusing,
        matterLevel: r.matterLevel,
        chaseSendability: r.chaseSendability,
      })),
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "golden-trust-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    "# H3 Scale Confidence Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `## Status: **${report.status.toUpperCase()}**`,
    "",
    "### Golden 102 H3 trust gate",
    `- Runnable: ${report.golden.runnable}`,
    `- Blocking fail cases: ${report.golden.blockingFail}`,
    `- Confusing (non-blocking): ${report.golden.confusingOnly}`,
    "",
    "### Level 1 (2,200) — last scan",
    lint
      ? `- Cases: ${lint.cases}\n- Dangerous critical: ${lint.dangerousWeirdnessCritical}\n- Worst50 dangerous: ${report.level1?.worst50Dangerous ?? "—"}`
      : "- Run `npx tsx scripts/bundle-fidelity-corpus-lint.ts --count 2200 --split all`",
    "",
    "### Sendability totals (all chase items)",
    ...Object.entries(report.sendabilityTotals).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "### Source-state totals (all chase items)",
    ...Object.entries(report.sourceStateTotals).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "### Most confusing cases (sample)",
    ...report.confusingCases.slice(0, 10).map(
      (c) => `- **${c.bundleId}** — ${c.issues.join("; ")}`,
    ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, "REPORT.md"), `${md.join("\n")}\n`);

  console.log(`H3 golden trust gate: ${report.status.toUpperCase()}`);
  console.log(`  Golden runnable: ${report.golden.runnable}, blocking: ${report.golden.blockingFail}, confusing: ${report.golden.confusingOnly}`);
  console.log(`  Level 1 dangerous: ${report.level1?.dangerousWeirdnessCritical ?? "—"}, worst50 dangerous: ${report.level1?.worst50Dangerous ?? "—"}`);
  console.log(`  Report: ${path.join(OUT_DIR, "golden-trust-report.json")}`);
}

main();
