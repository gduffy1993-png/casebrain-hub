#!/usr/bin/env npx tsx
/**
 * H4 step 6 — run simulator pack v1 gate (30 fake bundles).
 * Run: npx tsx scripts/h4-simulator-pack-v1-generate.ts
 *      npx tsx scripts/h4-simulator-pack-v1-gate.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger, formatHearingDisplayFromLedger, guardBattleboardOutput } from "../lib/criminal/bundle-truth-ledger";
import { lintExportOutput } from "../lib/criminal/disclosure-export/export-sanitize";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { buildCopySafeResult, inferChaseItemSourceState } from "../lib/criminal/trust/copy-safe";
import { loadSimulatorPackV1, type SimulatorPackEntry } from "../lib/eval/h4-simulator/load-simulator-pack";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h4-simulator-pack-v1");

const GLOBAL_BLOCKING_RES = [
  /\bwe win\b/i,
  /\bcase collapses\b/i,
  /\bask the court to record\b[\s\S]{0,120}\bplease provide\b/i,
] as const;

type CaseResult = {
  caseId: string;
  title: string;
  blocking: string[];
  warnings: string[];
  outputsChecked: number;
  chaseItemCount: number;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function patternHits(text: string, patterns: string[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    try {
      if (new RegExp(p, "i").test(text)) hits.push(p);
    } catch {
      if (norm(text).includes(norm(p))) hits.push(p);
    }
  }
  return hits;
}

function collectOutputSections(
  chase: ReturnType<typeof buildDisclosureChaseBrief>,
  war: ReturnType<typeof buildHearingWarRoomBrief>,
  matter: ReturnType<typeof buildMatterBrief>,
): { cpsAndClient: string; factual: string; courtOnly: string } {
  const cpsAndClient = [
    chase.disclosureSummary,
    ...chase.items.map((i) => i.draftChaseWording),
    ...matter.sections
      .filter((s) => s.id === "client" || s.id === "chase")
      .flatMap((s) => [s.paragraph, ...(s.bullets ?? [])]),
  ]
    .filter(Boolean)
    .join("\n\n");

  const courtOnly = [
    chase.safeCourtLine,
    ...chase.items.map((i) => i.courtLine),
    ...war.askCourtToRecord,
  ]
    .filter(Boolean)
    .join("\n\n");

  const factual = [
    cpsAndClient,
    war.safePositionToday,
    ...war.sayThis,
    ...war.doNotOverstate,
    ...war.collapseRisks,
    ...matter.sections.flatMap((s) => [s.paragraph, ...(s.bullets ?? [])]),
  ]
    .filter(Boolean)
    .join("\n\n");

  return { cpsAndClient, factual, courtOnly };
}

function runCase(entry: SimulatorPackEntry): CaseResult {
  const m = entry.manifest;
  const bundleText = entry.bundleText;
  const blocking: string[] = [];
  const warnings: string[] = [];
  let outputsChecked = 0;

  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: m.missingEvidence,
    allegation: header.allegation,
  });
  const battleboard = guardBattleboardOutput(
    buildStrategyBattleboard({
      case_id: m.caseId,
      bundle_text: bundleText,
      offence_label: header.allegation,
    }),
    { ledger, bundleText },
  );
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const common = {
    caseId: m.caseId,
    caseTitle: m.title,
    clientLabel: header.clientLabel?.trim() || m.fakeDefendant,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Simulator pack",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    briefPlan,
  };

  const chase = buildDisclosureChaseBrief({
    ...common,
    hearingDateIso: ledger.hearing.dateIso,
    snapshotMissing: m.missingEvidence.map((label) => ({ label, status: "outstanding" as const })),
    proceduralOutstanding: m.missingEvidence,
  });
  const war = buildHearingWarRoomBrief({
    ...common,
    readiness: chase.disclosureSummary,
    hasSavedPosition: false,
    chaseItems: m.missingEvidence.length ? m.missingEvidence : m.expectedChaseItems,
  });
  const matter = buildMatterBrief({ warRoom: war, chase, briefPlan });

  for (const item of chase.items) {
    const sourceState = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const cps = buildCopySafeResult({
      text: item.draftChaseWording,
      kind: "cps_chase",
      sourceState,
      sourceLabel: item.source,
    });
    outputsChecked += 1;
    for (const issue of lintExportOutput(cps.textForClipboard)) {
      blocking.push(`export.lint.${issue}:${item.label.slice(0, 32)}`);
    }
    if (cps.sendability === "safe_to_send" && sourceState !== "served") {
      blocking.push(`simulator.false_safe_to_send:${item.label.slice(0, 32)}`);
    }
    if (!cps.canCopy && cps.blockedReason?.includes("Court wording")) {
      blocking.push(`simulator.court_in_cps:${item.label.slice(0, 32)}`);
    }
  }

  const sections = collectOutputSections(chase, war, matter);
  outputsChecked += chase.items.length + matter.sections.length;

  for (const re of GLOBAL_BLOCKING_RES) {
    if (re.test(sections.cpsAndClient)) {
      blocking.push(`simulator.global_block:${re.source.slice(0, 40)}`);
    }
  }

  for (const p of m.blockingFailPatterns) {
    const target =
      /ask the court/i.test(p) || /please provide/i.test(p)
        ? sections.cpsAndClient
        : sections.factual;
    if (patternHits(target, [p]).length) {
      blocking.push(`simulator.blocking_pattern:${p.slice(0, 48)}`);
    }
  }

  for (const p of m.mustNotSay) {
    if (patternHits(sections.factual, [p]).length) {
      blocking.push(`simulator.must_not_say:${p.slice(0, 48)}`);
    }
  }

  if (m.expectedChaseItems.length && chase.items.length === 0) {
    warnings.push("simulator.no_chase_items");
  } else {
    for (const expected of m.expectedChaseItems.slice(0, 4)) {
      const hit = chase.items.some((i) => norm(i.label).includes(norm(expected).slice(0, 12)));
      if (!hit) warnings.push(`simulator.chase_item_missing:${expected.slice(0, 32)}`);
    }
  }

  const todayBlob = [war.safePositionToday, ...war.collapseRisks, chase.disclosureSummary].join("\n");
  if (m.expectedTodayIssue && !norm(todayBlob).includes(norm(m.expectedTodayIssue).slice(0, 16))) {
    warnings.push("simulator.today_issue_drift");
  }

  if (m.offenceFamily === "motoring" && /\bfraud account-control\b/i.test(sections.factual)) {
    blocking.push("simulator.family_bleed:fraud_on_motoring");
  }
  if (m.offenceFamily === "harassment" && /\bpwits\b/i.test(sections.factual) && !/harassment/i.test(sections.factual)) {
    blocking.push("simulator.family_bleed:pwits_on_harassment");
  }

  return {
    caseId: m.caseId,
    title: m.title,
    blocking,
    warnings,
    outputsChecked,
    chaseItemCount: chase.items.length,
  };
}

function main(): void {
  const results = loadSimulatorPackV1().map(runCase);
  const withBlocking = results.filter((r) => r.blocking.length > 0);
  const withWarnings = results.filter((r) => r.warnings.length > 0);

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H4 Simulator Pack v1 Gate",
    pack: {
      total: results.length,
      blockingFail: withBlocking.length,
      warningOnly: withWarnings.filter((r) => !r.blocking.length).length,
      outputsChecked: results.reduce((n, r) => n + r.outputsChecked, 0),
    },
    status: withBlocking.length > 0 ? "blocked" : withWarnings.length > 0 ? "warning" : "pass",
    blockingCases: withBlocking.slice(0, 20).map((r) => ({
      caseId: r.caseId,
      title: r.title,
      issues: r.blocking,
    })),
    warningCases: withWarnings
      .sort((a, b) => b.warnings.length - a.warnings.length)
      .slice(0, 15)
      .map((r) => ({
        caseId: r.caseId,
        title: r.title,
        issues: r.warnings,
      })),
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "simulator-pack-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`H4 simulator pack v1 gate: ${report.status.toUpperCase()}`);
  console.log(`  Cases: ${report.pack.total}, blocking: ${report.pack.blockingFail}, warnings: ${report.pack.warningOnly}`);
  console.log(`  Outputs checked: ${report.pack.outputsChecked}`);
  console.log(`  Report: ${path.join(OUT_DIR, "simulator-pack-report.json")}`);

  if (withBlocking.length > 0) process.exit(1);
}

main();
