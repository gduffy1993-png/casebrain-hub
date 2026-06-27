#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import { runStrategyCorpus } from "@/lib/eval/casebrain-auditor/strategy-corpus-run";
import type { StrategyCorpusSplit } from "@/lib/eval/casebrain-auditor/strategy-corpus-types";
import { renderCorpusBundleText } from "@/lib/eval/casebrain-auditor/strategy-corpus-render";
import { lintSourceTruthSurfaceText } from "@/lib/criminal/source-truth-guardian";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { lintPartnerScore, type PartnerScoreViolationKind } from "@/lib/criminal/partner-score-lint";
import type { GuardianFlag } from "@/lib/criminal/source-truth-guardian/types";
import type { SourceTruthCaseProfile } from "@/lib/criminal/source-truth-guardian/types";
import {
  lintWeirdness,
  weirdnessRiskScore,
  type WeirdnessFinding,
  type WeirdnessKind,
} from "@/lib/criminal/weirdness-detector";

function parseArgs(): { count: number; split: StrategyCorpusSplit | "all"; canary: boolean } {
  const argv = process.argv.slice(2);
  let count = 2200;
  let split: StrategyCorpusSplit | "all" = "all";
  let canary = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count" && argv[i + 1]) count = parseInt(argv[++i]!, 10);
    if (argv[i] === "--split" && argv[i + 1]) split = argv[++i] as StrategyCorpusSplit | "all";
    if (argv[i] === "--canary") canary = true;
  }
  return { count, split, canary };
}

function allText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(allText).join("\n");
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key !== "sourceTruthGuardian")
    .map(([, v]) => allText(v))
    .join("\n");
}

function bump(map: Record<string, number>, key: string, by = 1): void {
  map[key] = (map[key] ?? 0) + by;
}

function solicitorSurfaceText(war: unknown, chase: unknown, matter: unknown): string {
  const w = war as Record<string, unknown>;
  const c = chase as Record<string, unknown>;
  const m = matter as Record<string, unknown>;
  const chaseItems = Array.isArray(c.items) ? c.items : [];
  return allText({
    safePositionToday: w.safePositionToday,
    sayThis: w.sayThis,
    doNotOverstate: w.doNotOverstate,
    askCourtToRecord: w.askCourtToRecord,
    instructionsNeeded: w.instructionsNeeded,
    nextHearingMoves: w.nextHearingMoves,
    evidenceAnchors: w.evidenceAnchors,
    collapseRisks: w.collapseRisks,
    draftWording: w.draftWording,
    safeCourtLine: c.safeCourtLine,
    disclosureSummary: c.disclosureSummary,
    chaseCourtLines: chaseItems.map((item) => (item as { courtLine?: string }).courtLine),
    chaseDraftWording: chaseItems.map((item) => (item as { draftChaseWording?: string }).draftChaseWording),
    matterSections: m.sections,
    courtDayNote: m.courtDayNote,
    plainText: m.plainText,
  });
}

function main(): void {
  const { count, split, canary } = parseArgs();
  const { manifests } = runStrategyCorpus({
    count,
    split,
    canary,
    materialisationMode: "text-rendered",
    writeCache: false,
  });

  let criticalSurvivors = 0;
  let criticalBlocked = 0;
  let rewritten = 0;
  const flagCounts: Record<string, number> = {};
  const profileBlocked: Record<string, number> = {};
  const profileCases: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  const survivorSamples: Array<{ caseId: string; flags: string[]; reason: string }> = [];
  let partnerScoreTotal = 0;
  const partnerGradeCounts: Record<string, number> = {};
  const partnerViolationCounts: Record<string, number> = {};
  const partnerViolationByProfile: Record<string, Record<string, number>> = {};
  const partnerViolationByOffence: Record<string, Record<string, number>> = {};
  const partnerViolationByFailureMode: Record<string, Record<string, number>> = {};
  let weirdnessCritical = 0;
  let weirdnessPolish = 0;
  let dangerousWeirdnessCritical = 0;
  const weirdnessCounts: Record<string, number> = {};
  const weirdnessByProfile: Record<string, Record<string, number>> = {};
  const weirdnessByOffence: Record<string, Record<string, number>> = {};
  const weirdnessBySuggestedArea: Record<string, number> = {};
  const worstCases: Array<{
    caseId: string;
    profile: string;
    offenceFamily: string;
    riskScore: number;
    partnerScore: number;
    criticalSurvivors: number;
    weirdnessCritical: number;
    weirdnessPolish: number;
    topFindings: Pick<WeirdnessFinding, "kind" | "severity" | "message" | "suggestedArea">[];
  }> = [];
  const partnerFailureSamples: Array<{
    caseId: string;
    profile: string;
    offenceFamily: string;
    score: number;
    grade: string;
    violations: { kind: PartnerScoreViolationKind; message: string; detail?: string }[];
  }> = [];

  for (const manifest of manifests) {
    const bundleText = renderCorpusBundleText(manifest);
    const briefPlan = buildCriminalBriefPlan({
      bundleText,
      missingMaterial: manifest.missingMaterial,
      allegation: manifest.chargeWording,
    });
    const common = {
      caseId: manifest.caseId,
      caseTitle: manifest.caseId,
      clientLabel: manifest.defendantName,
      allegation: manifest.chargeWording,
      stage: manifest.stage,
      hearingStatus: "Listed",
      bundleHealth: "Corpus bundle — provisional",
      positionStatus: "Not recorded",
      battleboard: null,
      bundleText,
      briefPlan,
    };
    const war = buildHearingWarRoomBrief({
      ...common,
      readiness: "",
      hasSavedPosition: false,
      chaseItems: manifest.missingMaterial,
    });
    const chase = buildDisclosureChaseBrief({
      ...common,
      hearingDateIso: null,
      snapshotMissing: manifest.missingMaterial.map((label) => ({ label, status: "outstanding" })),
      proceduralOutstanding: manifest.missingMaterial,
    });
    const matter = buildMatterBrief({ warRoom: war, chase, briefPlan });
    const partner = lintPartnerScore({
      profile: briefPlan.profile,
      missingMaterial: manifest.missingMaterial,
      contradictionLabels: manifest.contradictions.map((c) => c.label),
      bundleText,
      war,
      chase,
      matter,
    });
    partnerScoreTotal += partner.score;
    bump(partnerGradeCounts, partner.grade);
    for (const violation of partner.violations) {
      bump(partnerViolationCounts, violation.kind);
      partnerViolationByProfile[briefPlan.profile] ??= {};
      bump(partnerViolationByProfile[briefPlan.profile]!, violation.kind);
      partnerViolationByOffence[manifest.offenceFamily] ??= {};
      bump(partnerViolationByOffence[manifest.offenceFamily]!, violation.kind);
      for (const tag of manifest.failureModeTags) {
        partnerViolationByFailureMode[tag] ??= {};
        bump(partnerViolationByFailureMode[tag]!, violation.kind);
      }
    }
    if (partner.grade !== "pass" && partnerFailureSamples.length < 50) {
      partnerFailureSamples.push({
        caseId: manifest.caseId,
        profile: briefPlan.profile,
        offenceFamily: manifest.offenceFamily,
        score: partner.score,
        grade: partner.grade,
        violations: partner.violations.slice(0, 5).map((v) => ({
          kind: v.kind,
          message: v.message,
          detail: v.detail,
        })),
      });
    }
    const surfaceText = solicitorSurfaceText(war, chase, matter);
    const survivors = lintSourceTruthSurfaceText({ text: surfaceText, bundleText });
    const chaseItems = chase.items ?? [];
    const weirdness = lintWeirdness({
      caseId: manifest.caseId,
      profile: briefPlan.profile,
      offenceFamily: manifest.offenceFamily,
      allegation: manifest.chargeWording,
      bundleText,
      outputText: surfaceText,
      chaseLabels: chaseItems.map((item) => item.label),
      chaseDrafts: chaseItems.map((item) => item.draftChaseWording),
    });
    const caseWeirdnessCritical = weirdness.filter((w) => w.severity === "critical").length;
    const caseDangerousWeirdnessCritical = weirdness.filter(
      (w) => w.severity === "critical" && isDangerousWeirdnessKind(w.kind),
    ).length;
    const caseWeirdnessPolish = weirdness.filter((w) => w.severity === "polish").length;
    weirdnessCritical += caseWeirdnessCritical;
    dangerousWeirdnessCritical += caseDangerousWeirdnessCritical;
    weirdnessPolish += caseWeirdnessPolish;
    for (const finding of weirdness) {
      bump(weirdnessCounts, finding.kind);
      bump(weirdnessBySuggestedArea, finding.suggestedArea);
      weirdnessByProfile[briefPlan.profile] ??= {};
      bump(weirdnessByProfile[briefPlan.profile]!, finding.kind);
      weirdnessByOffence[manifest.offenceFamily] ??= {};
      bump(weirdnessByOffence[manifest.offenceFamily]!, finding.kind);
    }
    criticalSurvivors += survivors.length;
    const reports = [war.sourceTruthGuardian, chase.sourceTruthGuardian, matter.sourceTruthGuardian].filter(Boolean);
    const profile =
      war.sourceTruthGuardian?.fingerprint.profile ??
      chase.sourceTruthGuardian?.fingerprint.profile ??
      matter.sourceTruthGuardian?.fingerprint.profile ??
      "unknown";
    bump(profileCases, profile);

    for (const report of reports) {
      if (!report) continue;
      for (const flag of report.flags) bump(flagCounts, flag);
      for (const d of report.decisions) {
        if (d.final === null) bump(reasonCounts, d.reason);
        for (const flag of d.flags) bump(flagCounts, flag);
      }
    }

    const blocked =
      (war.sourceTruthGuardian?.blockedCount ?? 0) +
      (chase.sourceTruthGuardian?.blockedCount ?? 0) +
      (matter.sourceTruthGuardian?.blockedCount ?? 0);
    criticalBlocked += blocked;
    if (blocked > 0) bump(profileBlocked, profile, blocked);

    rewritten +=
      (war.sourceTruthGuardian?.rewrittenCount ?? 0) +
      (chase.sourceTruthGuardian?.rewrittenCount ?? 0) +
      (matter.sourceTruthGuardian?.rewrittenCount ?? 0);

    if (survivors.length) {
      console.error(`[${manifest.caseId}] critical source-truth survivor(s):`);
      for (const s of survivors.slice(0, 5)) {
        console.error(`  - ${s.flags.join(", ")}: ${s.reason}`);
        survivorSamples.push({ caseId: manifest.caseId, flags: s.flags, reason: s.reason });
      }
    }

    const riskScore =
      weirdnessRiskScore(weirdness) +
      survivors.length * 15 +
      Math.max(0, 100 - partner.score) +
      partner.violations.filter((v) => v.severity === "major").length * 4;
    if (riskScore > 0) {
      worstCases.push({
        caseId: manifest.caseId,
        profile: briefPlan.profile,
        offenceFamily: manifest.offenceFamily,
        riskScore,
        partnerScore: partner.score,
        criticalSurvivors: survivors.length,
        weirdnessCritical: caseWeirdnessCritical,
        weirdnessPolish: caseWeirdnessPolish,
        topFindings: weirdness.slice(0, 5).map((w) => ({
          kind: w.kind,
          severity: w.severity,
          message: w.message,
          suggestedArea: w.suggestedArea,
        })),
      });
    }
  }

  const topFlags = Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([flag, count]) => ({ flag: flag as GuardianFlag, count }));
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([reason, count]) => ({ reason, count }));
  const profiles = Object.keys({ ...profileCases, ...profileBlocked }).sort().map((profile) => ({
    profile: profile as SourceTruthCaseProfile,
    cases: profileCases[profile] ?? 0,
    blockedLines: profileBlocked[profile] ?? 0,
  }));
  const clusteredPartnerViolations = {
    topViolations: Object.entries(partnerViolationCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([kind, count]) => ({ kind: kind as PartnerScoreViolationKind, count })),
    byProfile: Object.entries(partnerViolationByProfile)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([profile, counts]) => ({ profile, counts })),
    byOffenceFamily: Object.entries(partnerViolationByOffence)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([offenceFamily, counts]) => ({ offenceFamily, counts })),
    byFailureMode: Object.entries(partnerViolationByFailureMode)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, counts]) => ({ tag, counts })),
  };
  const clusteredWeirdness = {
    topFindings: Object.entries(weirdnessCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([kind, count]) => ({ kind: kind as WeirdnessKind, count })),
    byProfile: Object.entries(weirdnessByProfile)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([profile, counts]) => ({ profile, counts })),
    byOffenceFamily: Object.entries(weirdnessByOffence)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([offenceFamily, counts]) => ({ offenceFamily, counts })),
    suggestedAreas: Object.entries(weirdnessBySuggestedArea)
      .sort((a, b) => b[1] - a[1])
      .map(([area, count]) => ({ area, count })),
  };

  const reportDir = join(process.cwd(), "artifacts", "casebrain-qa", "bundle-fidelity-corpus-lint");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "report.json");
  const report = {
    generatedAt: new Date().toISOString(),
    cases: manifests.length,
    criticalSurvivors,
    weirdnessCritical,
    weirdnessPolish,
    dangerousWeirdnessCritical,
    criticalBlocked,
    rewritten,
    topFlags,
    topReasons,
    profiles,
    survivorSamples: survivorSamples.slice(0, 50),
    partnerScore: {
      averageScore: manifests.length > 0 ? Math.round((partnerScoreTotal / manifests.length) * 10) / 10 : 0,
      grades: {
        pass: partnerGradeCounts.pass ?? 0,
        weak: partnerGradeCounts.weak ?? 0,
        fail: partnerGradeCounts.fail ?? 0,
      },
      clusteredViolations: clusteredPartnerViolations,
      samples: partnerFailureSamples,
    },
    weirdness: clusteredWeirdness,
    worst50: worstCases.sort((a, b) => b.riskScore - a.riskScore).slice(0, 50),
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Bundle fidelity corpus lint:");
  console.log(`  Cases: ${manifests.length}`);
  console.log(`  Critical survivors: ${criticalSurvivors}`);
  console.log(`  Weirdness: ${weirdnessCritical} critical / ${weirdnessPolish} polish`);
  console.log(`  Dangerous weirdness critical: ${dangerousWeirdnessCritical}`);
  console.log(`  Critical blocked by guardian: ${criticalBlocked}`);
  console.log(`  Rewritten/softened: ${rewritten}`);
  console.log(
    `  Partner Score avg: ${report.partnerScore.averageScore} (${report.partnerScore.grades.pass} pass / ${report.partnerScore.grades.weak} weak / ${report.partnerScore.grades.fail} fail)`,
  );
  console.log(`  Report: ${reportPath}`);
  if (topFlags.length) {
    console.log("  Top flags:");
    for (const row of topFlags.slice(0, 5)) console.log(`    - ${row.flag}: ${row.count}`);
  }

  if (criticalSurvivors > 0 || dangerousWeirdnessCritical > 0) process.exit(1);
}

function isDangerousWeirdnessKind(kind: WeirdnessKind): boolean {
  return (
    kind === "wrong_family_bleed" ||
    kind === "unsafe_win_language" ||
    kind === "court_line_in_chase_draft" ||
    kind === "referred_only_as_served"
  );
}

main();
