#!/usr/bin/env npx tsx
/**
 * H4 export/copy gate — golden 102 CPS chase, court line, client summary, gap list.
 *
 * Run: npx tsx scripts/h4-export-copy-gate.ts
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
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "h4-export-copy");

const REFERRED_AS_SERVED = [
  /\bbwv\s+(shows|confirms|proves|captures)\b/i,
  /\bcctv\s+(shows|confirms|proves)\b/i,
  /\bmg11\s+(confirms|proves|shows)\b/i,
  /\bsafeguards\s+were\s+followed\b/i,
  /\bphone\s+extraction\s+shows\b/i,
] as const;

const UNSAFE_OUTCOME = [
  /\bwe win\b/i,
  /\bcase collapses\b/i,
  /\bcharge will be dropped\b/i,
  /\bguaranteed\b/i,
  /\bproves innocence\b/i,
  /\bsafe to advise plea\b/i,
] as const;

type CaseResult = {
  bundleId: string;
  label: string;
  skipped: boolean;
  blocking: string[];
  warnings: string[];
  outputsChecked: number;
};

function lintBlob(blob: string, label: string, blocking: string[], warnings: string[]): void {
  for (const issue of lintExportOutput(blob)) {
    blocking.push(`export.lint.${issue}:${label}`);
  }
  for (const re of UNSAFE_OUTCOME) {
    if (re.test(blob)) blocking.push(`export.unsafe_outcome:${label}`);
  }
}

function runCase(entry: ReturnType<typeof loadGoldPack>[number]): CaseResult {
  const truth = entry.truthKey;
  if (!entry.bundleTextPaths.length) {
    return {
      bundleId: truth.bundleId,
      label: truth.label ?? truth.bundleId,
      skipped: true,
      blocking: [],
      warnings: [],
      outputsChecked: 0,
    };
  }

  const blocking: string[] = [];
  const warnings: string[] = [];
  let outputsChecked = 0;

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
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const common = {
    caseId: truth.bundleId,
    caseTitle: truth.label ?? truth.defendant,
    clientLabel: header.clientLabel?.trim() || truth.defendant,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Golden pack",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    briefPlan,
  };

  const chase = buildDisclosureChaseBrief({
    ...common,
    hearingDateIso: ledger.hearing.dateIso,
    snapshotMissing: (truth.missingMaterialExpected ?? []).map((label) => ({ label, status: "outstanding" })),
    proceduralOutstanding: truth.missingMaterialExpected ?? [],
  });
  const war = buildHearingWarRoomBrief({
    ...common,
    readiness: chase.disclosureSummary,
    hasSavedPosition: false,
    chaseItems: truth.missingMaterialExpected ?? [],
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
    lintBlob(cps.textForClipboard, `cps:${item.label.slice(0, 32)}`, blocking, warnings);

    if (cps.sendability === "safe_to_send") {
      blocking.push(`export.false_safe_to_send:cps:${item.label.slice(0, 32)}`);
    }
    if (!cps.canCopy && !cps.blockedReason?.includes("Court wording")) {
      warnings.push(`export.cps_blocked:${item.label.slice(0, 32)}`);
    }
    if (sourceState !== "served") {
      for (const re of REFERRED_AS_SERVED) {
        if (re.test(item.draftChaseWording)) {
          blocking.push(`export.referred_as_served:cps:${item.label.slice(0, 32)}`);
        }
      }
    }
    if (!cps.footer.includes("Solicitor review")) {
      warnings.push(`export.cps_footer_missing:${item.label.slice(0, 32)}`);
    }

    const court = buildCopySafeResult({
      text: item.courtLine,
      kind: "court_line",
      sourceState,
      sourceLabel: item.source,
    });
    outputsChecked += 1;
    lintBlob(court.textForClipboard, `court:${item.label.slice(0, 32)}`, blocking, warnings);
    if (/\bplease provide\b/i.test(court.textForClipboard) && !/\bask the court\b/i.test(court.textForClipboard)) {
      warnings.push(`export.court_reads_like_cps:${item.label.slice(0, 32)}`);
    }
  }

  if (chase.safeCourtLine?.trim()) {
    const courtCase = buildCopySafeResult({
      text: chase.safeCourtLine,
      kind: "court_line",
      sourceState: "needs_review",
    });
    outputsChecked += 1;
    lintBlob(courtCase.textForClipboard, "court:case-wide", blocking, warnings);
  }

  const clientSection = matter.sections.find((s) => s.id === "client");
  const clientText = [clientSection?.paragraph, ...(clientSection?.bullets ?? [])].filter(Boolean).join("\n\n");
  if (clientText) {
    const client = buildCopySafeResult({
      text: clientText,
      kind: "client_summary",
      sourceState: "provisional",
    });
    outputsChecked += 1;
    lintBlob(client.textForClipboard, "client:summary", blocking, warnings);
    if (!client.footer.includes("Not for court or CPS")) {
      warnings.push("export.client_footer_missing");
    }
    for (const re of UNSAFE_OUTCOME) {
      if (re.test(clientText)) blocking.push("export.unsafe_client_summary");
    }
  }

  for (const item of chase.primaryItems.slice(0, 8)) {
    const sourceState = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const gapLine = `${item.label} | ${sourceState.replace(/_/g, " ")} | ${item.whyItMatters}`;
    outputsChecked += 1;
    lintBlob(gapLine, `gap:${item.label.slice(0, 32)}`, blocking, warnings);
    if (!sourceState) blocking.push(`export.gap_missing_source_state:${item.label.slice(0, 32)}`);
  }

  return {
    bundleId: truth.bundleId,
    label: truth.label ?? truth.bundleId,
    skipped: false,
    blocking,
    warnings,
    outputsChecked,
  };
}

function main(): void {
  const results = loadGoldPack().map(runCase);
  const runnable = results.filter((r) => !r.skipped);
  const withBlocking = runnable.filter((r) => r.blocking.length > 0);
  const withWarnings = runnable.filter((r) => r.warnings.length > 0);

  const report = {
    generatedAt: new Date().toISOString(),
    level: "H4 Export/Copy Gate",
    golden: {
      total: results.length,
      runnable: runnable.length,
      blockingFail: withBlocking.length,
      warningOnly: withWarnings.filter((r) => !r.blocking.length).length,
      outputsChecked: runnable.reduce((n, r) => n + r.outputsChecked, 0),
    },
    status: withBlocking.length > 0 ? "blocked" : withWarnings.length > 0 ? "warning" : "pass",
    blockingCases: withBlocking.slice(0, 20).map((r) => ({
      bundleId: r.bundleId,
      label: r.label,
      issues: r.blocking,
    })),
    warningCases: withWarnings
      .sort((a, b) => b.warnings.length - a.warnings.length)
      .slice(0, 15)
      .map((r) => ({
        bundleId: r.bundleId,
        label: r.label,
        issues: r.warnings,
      })),
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "export-copy-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`H4 export/copy gate: ${report.status.toUpperCase()}`);
  console.log(`  Golden runnable: ${report.golden.runnable}, blocking: ${report.golden.blockingFail}, warnings: ${report.golden.warningOnly}`);
  console.log(`  Outputs checked: ${report.golden.outputsChecked}`);
  console.log(`  Report: ${path.join(OUT_DIR, "export-copy-report.json")}`);

  if (withBlocking.length > 0) process.exit(1);
}

main();
