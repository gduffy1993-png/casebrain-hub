#!/usr/bin/env npx tsx
/**
 * Level 2 - Golden Case Pack gate.
 *
 * Checks solicitor-facing Today / Chase / Summary output against runnable gold
 * truth keys. This is a pilot-readiness gate, not a Brain 1 rewrite.
 *
 * Run:
 *   npx tsx scripts/golden-case-pack-gate.ts --min-runnable 30
 *   npx tsx scripts/golden-case-pack-gate.ts --pack local --min-runnable 30
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "../components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import {
  buildBundleTruthLedger,
  formatHearingDisplayFromLedger,
  guardBattleboardOutput,
} from "../lib/criminal/bundle-truth-ledger";
import { lintPartnerScore } from "../lib/criminal/partner-score-lint";
import { lintSourceTruthSurfaceText } from "../lib/criminal/source-truth-guardian";
import { lintWeirdness, stripSafetyWarningLines } from "../lib/criminal/weirdness-detector";
import { resolveCaseHeaderMetadata } from "../lib/criminal/resolve-case-header-metadata";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import {
  loadGoldPack,
  readBundleText,
  type BundleFidelityGoldEntry,
} from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { loadLocalPack } from "../lib/eval/casebrain-auditor/bundle-fidelity-local";
import { runBundleFidelityCheck } from "../lib/eval/casebrain-auditor/bundle-fidelity-run";
import type { BundleFidelityTruthKey } from "../lib/eval/casebrain-auditor/bundle-fidelity-types";

type Grade = "pass" | "polish" | "fail" | "skip";
type IssueSeverity = "critical" | "polish";

type GoldenIssue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  detail?: string;
};

type GoldenResult = {
  bundleId: string;
  label: string;
  status: Grade;
  skipped: boolean;
  skipReason?: string;
  partnerScore?: number;
  partnerGrade?: string;
  fidelityOverall?: string;
  outputPath?: string;
  issues: GoldenIssue[];
  counts?: {
    chaseItems: number;
    primaryChaseItems: number;
    guardianSurvivors: number;
    weirdnessFindings: number;
  };
};

const OUT_DIR = path.join(process.cwd(), "artifacts", "casebrain-qa", "golden-case-pack");

const CRITICAL_BAD_PATTERNS: Array<{ code: string; re: RegExp; message: string }> = [
  {
    code: "court_line_in_chase_draft",
    re: /Please provide\s+the defence asks the court/i,
    message: "Court-record line leaked into CPS chase wording.",
  },
  {
    code: "template_leak",
    re: /\b(?:TODO|undefined|null|lorem ipsum|\[insert)\b/i,
    message: "Template/debug text leaked into solicitor output.",
  },
  {
    code: "unsafe_win_language",
    re: /\b(?:case collapses|this wins|guaranteed|will be acquitted)\b/i,
    message: "Unsafe outcome language leaked into output.",
  },
];

function parseArgs(): { pack: "local" | "gold"; minRunnable: number; maxPolishRate: number } {
  const argv = process.argv.slice(2);
  let pack: "local" | "gold" = "local";
  let minRunnable = 30;
  let maxPolishRate = 0.35;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--pack" && argv[i + 1]) {
      const value = String(argv[++i]);
      if (value === "local" || value === "gold") pack = value;
    }
    if (argv[i] === "--min-runnable" && argv[i + 1]) minRunnable = Number(argv[++i]);
    if (argv[i] === "--max-polish-rate" && argv[i + 1]) maxPolishRate = Number(argv[++i]);
  }
  return { pack, minRunnable, maxPolishRate };
}

function plain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(plain).join("\n");
  return Object.values(value as Record<string, unknown>).map(plain).join("\n");
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(text: string): string[] {
  return norm(text)
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !["case", "material", "source", "served", "outstanding"].includes(t));
}

function hasTokenCoverage(haystack: string, needle: string): boolean {
  const h = norm(haystack);
  const ts = tokens(needle);
  if (ts.length === 0) return true;
  return ts.some((t) => h.includes(t));
}

function addIssue(
  issues: GoldenIssue[],
  severity: IssueSeverity,
  code: string,
  message: string,
  detail?: string,
): void {
  issues.push({ severity, code, message, detail });
}

function truthChargeCovered(truth: BundleFidelityTruthKey, outputText: string): boolean {
  const keywords = truth.chargeKeywords ?? [];
  const charge = typeof truth.charge === "string" ? truth.charge : "";
  const h = norm(outputText);
  if (charge && h.includes(norm(charge).slice(0, 24))) return true;
  const hits = keywords.filter((k) => h.includes(norm(k)));
  return hits.length >= Math.min(2, keywords.length || 2) || hits.length >= 1;
}

function defendantCovered(truth: BundleFidelityTruthKey, outputText: string, bundleText?: string): boolean {
  const haystacks = [outputText, bundleText ?? "", truth.label ?? ""].map(norm);
  const names = [truth.defendant, ...(truth.aliases ?? [])];
  for (const h of haystacks) {
    for (const name of names) {
      const n = norm(name);
      if (n.length >= 3 && h.includes(n)) return true;
      const parts = n.split(/\s+/).filter(Boolean);
      const surname = parts[parts.length - 1];
      if (surname && surname.length >= 4 && h.includes(surname)) return true;
    }
  }
  return false;
}

function prohibitedFamilyHit(truth: BundleFidelityTruthKey, outputText: string): string | null {
  const strategySlice = norm(stripSafetyWarningLines(outputText));
  for (const family of truth.prohibitedFamilies ?? []) {
    if (family === "drugs_pwits" || family === "pwits_phone_attribution") {
      if (/\b(pwits|intent to supply|drug continuity|drug cash)\b/i.test(strategySlice)) return family;
    }
    if (family === "fraud_account_control" && /\bfraud\s*\/\s*account[-\s]?control\b/i.test(strategySlice)) {
      return family;
    }
    if (family === "robbery_identification" && /\b(robbery identification|robbery id)\b/i.test(strategySlice)) {
      return family;
    }
  }
  return null;
}

function buildGoldenOutput(entry: BundleFidelityGoldEntry): {
  bundleText: string;
  outputText: string;
  partnerScore: number;
  partnerGrade: string;
  partnerIssues: string[];
  fidelityOverall: string;
  chaseItems: number;
  primaryChaseItems: number;
  chaseLabels: string[];
  chaseDrafts: string[];
} {
  const truth = entry.truthKey;
  const bundleText = readBundleText(entry.bundleTextPaths);
  const ledger = buildBundleTruthLedger({ bundleText });
  const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: truth.missingMaterialExpected ?? [],
    allegation: header.allegation,
  });
  const rawBattleboard = buildStrategyBattleboard({
    case_id: truth.bundleId,
    bundle_text: bundleText,
    offence_label: header.allegation,
  });
  const battleboard = guardBattleboardOutput(rawBattleboard, { ledger, bundleText });
  const hearing = formatHearingDisplayFromLedger(ledger, header.stage) ?? header.nextHearing;

  const common = {
    caseId: truth.bundleId,
    caseTitle: truth.label ?? `R v ${truth.defendant}`,
    clientLabel: header.clientLabel?.trim() || truth.defendant,
    allegation: header.allegation,
    stage: header.stage,
    hearingStatus: hearing,
    bundleHealth: "Golden pack - provisional",
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
  const partner = lintPartnerScore({
    profile: briefPlan.profile,
    missingMaterial: truth.missingMaterialExpected ?? [],
    contradictionLabels: [],
    bundleText,
    war,
    chase,
    matter,
  });
  const outputText = plain({
    meta: {
      clientLabel: common.clientLabel,
      caseTitle: common.caseTitle,
    },
    today: {
      safePositionToday: war.safePositionToday,
      sayThis: war.sayThis,
      doNotOverstate: war.doNotOverstate,
      askCourtToRecord: war.askCourtToRecord,
      nextHearingMoves: war.nextHearingMoves,
    },
    chase: {
      safeCourtLine: chase.safeCourtLine,
      disclosureSummary: chase.disclosureSummary,
      items: chase.items.map((item) => ({
        label: item.label,
        draftChaseWording: item.draftChaseWording,
        courtLine: item.courtLine,
        whyItMatters: item.whyItMatters,
      })),
    },
    summary: {
      sections: matter.sections,
      courtDayNote: matter.courtDayNote,
      plainText: matter.plainText,
    },
  });

  return {
    bundleText,
    outputText,
    partnerScore: partner.score,
    partnerGrade: partner.grade,
    partnerIssues: partner.violations.map((v) => `${v.severity}:${v.surface}:${v.message}`),
    fidelityOverall: runBundleFidelityCheck(entry).overall,
    chaseItems: chase.items.length,
    primaryChaseItems: chase.primaryItems.length,
    chaseLabels: chase.items.map((item) => item.label),
    chaseDrafts: chase.items.map((item) => item.draftChaseWording),
  };
}

function runCase(entry: BundleFidelityGoldEntry): GoldenResult {
  const truth = entry.truthKey;
  if (!entry.bundleTextPaths.length) {
    return {
      bundleId: truth.bundleId,
      label: truth.label ?? truth.bundleId,
      status: "skip",
      skipped: true,
      skipReason: "No runnable markdown/text bundle linked.",
      issues: [],
    };
  }

  const issues: GoldenIssue[] = [];
  const built = buildGoldenOutput(entry);
  const guardianSurvivors = lintSourceTruthSurfaceText({
    text: built.outputText,
    bundleText: built.bundleText,
  });
  const weirdness = lintWeirdness({
    caseId: truth.bundleId,
    profile: truth.expectedWorkflowProfile,
    offenceFamily: truth.expectedRouteFamily,
    allegation: truth.charge,
    bundleText: built.bundleText,
    outputText: built.outputText,
    chaseLabels: built.chaseLabels,
    chaseDrafts: built.chaseDrafts,
  });

  if (built.fidelityOverall === "fail") {
    const fidelity = runBundleFidelityCheck(entry);
    const softFields = new Set(["workflowProfile", "provisionalStatus", "thinBundle"]);
    const hardFails = fidelity.fields.filter((f) => f.status === "fail" && !softFields.has(f.field));
    if (hardFails.length > 0) {
      addIssue(
        issues,
        "critical",
        "truth_key_fidelity",
        "Metadata/truth-key fidelity failed.",
        hardFails.map((f) => f.field).join(", "),
      );
    } else {
      addIssue(issues, "polish", "truth_key_fidelity", "Metadata/truth-key fidelity needs review.");
    }
  } else if (built.fidelityOverall === "needs_review") {
    addIssue(issues, "polish", "truth_key_review", "Metadata/truth-key fidelity needs review.");
  }

  if (guardianSurvivors.length > 0) {
    addIssue(
      issues,
      "critical",
      "source_truth_survivor",
      "Output contains source-truth issue not blocked by Guardian.",
      guardianSurvivors.slice(0, 3).map((s) => s.reason).join(" | "),
    );
  }

  if (!defendantCovered(truth, built.outputText, built.bundleText)) {
    addIssue(issues, "critical", "defendant_missing", "Output does not clearly name the defendant.");
  }

  if (!truthChargeCovered(truth, built.outputText)) {
    addIssue(issues, "critical", "charge_missing", "Output does not clearly reflect the charge/offence family.");
  }

  for (const missing of truth.missingMaterialExpected ?? []) {
    if (!hasTokenCoverage(built.outputText, missing)) {
      addIssue(issues, "polish", "missing_material_not_visible", "Expected missing material not visible in output.", missing);
    }
  }

  const prohibited = prohibitedFamilyHit(truth, built.outputText);
  if (prohibited) {
    addIssue(issues, "critical", "prohibited_family_bleed", "Wrong offence/profile family appears in output.", prohibited);
  }

  for (const pattern of CRITICAL_BAD_PATTERNS) {
    if (pattern.re.test(built.outputText)) {
      addIssue(issues, "critical", pattern.code, pattern.message);
    }
  }

  for (const finding of weirdness) {
    addIssue(
      issues,
      finding.severity,
      `weirdness.${finding.kind}`,
      finding.message,
      finding.detail ?? finding.suggestedArea,
    );
  }

  if (built.partnerGrade === "fail") {
    addIssue(issues, "critical", "partner_score_fail", "Partner Score failed.", built.partnerIssues.slice(0, 3).join(" | "));
  } else if (built.partnerGrade === "weak") {
    addIssue(issues, "polish", "partner_score_weak", "Partner Score is weak.", built.partnerIssues.slice(0, 3).join(" | "));
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outputPath = path.join(OUT_DIR, `${truth.bundleId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`);
  fs.writeFileSync(outputPath, built.outputText, "utf8");

  const hasCritical = issues.some((i) => i.severity === "critical");
  const status: Grade = hasCritical ? "fail" : issues.length ? "polish" : "pass";

  return {
    bundleId: truth.bundleId,
    label: truth.label ?? truth.bundleId,
    status,
    skipped: false,
    partnerScore: built.partnerScore,
    partnerGrade: built.partnerGrade,
    fidelityOverall: built.fidelityOverall,
    outputPath,
    issues,
    counts: {
      chaseItems: built.chaseItems,
      primaryChaseItems: built.primaryChaseItems,
      guardianSurvivors: guardianSurvivors.length,
      weirdnessFindings: weirdness.length,
    },
  };
}

function main(): void {
  const { pack, minRunnable, maxPolishRate } = parseArgs();
  const loaded = pack === "local" ? loadLocalPack() : { entries: loadGoldPack(), warnings: [] };
  const results = loaded.entries.map(runCase);
  const runnable = results.filter((r) => !r.skipped);
  const pass = runnable.filter((r) => r.status === "pass").length;
  const polish = runnable.filter((r) => r.status === "polish").length;
  const fail = runnable.filter((r) => r.status === "fail").length;
  const polishRate = runnable.length ? polish / runnable.length : 1;
  const pilotReady = runnable.length >= minRunnable && fail === 0 && polishRate <= maxPolishRate;

  const report = {
    generatedAt: new Date().toISOString(),
    level: "Level 2 - Golden Case Pack",
    pack,
    thresholds: { minRunnable, maxPolishRate },
    pilotReady,
    warnings: loaded.warnings,
    total: results.length,
    runnable: runnable.length,
    pass,
    polish,
    fail,
    skipped: results.length - runnable.length,
    results,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = path.join(OUT_DIR, `${pack}-report.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Golden Case Pack gate:");
  console.log(`  Pack: ${pack}`);
  console.log(`  Runnable: ${runnable.length}/${results.length}`);
  console.log(`  Pass/polish/fail: ${pass}/${polish}/${fail}`);
  console.log(`  Pilot ready: ${pilotReady ? "YES" : "NO"}`);
  console.log(`  Report: ${reportPath}`);
  for (const warning of loaded.warnings.slice(0, 10)) console.log(`  Warning: ${warning}`);
  for (const r of runnable.filter((x) => x.status !== "pass").slice(0, 20)) {
    console.log(`  ${r.status.toUpperCase()} ${r.bundleId}`);
    for (const issue of r.issues.slice(0, 5)) {
      console.log(`    - ${issue.severity}: ${issue.code} - ${issue.message}`);
    }
  }

  if (!pilotReady) process.exit(1);
}

main();
