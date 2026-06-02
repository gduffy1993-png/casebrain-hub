import fs from "node:fs";
import path from "node:path";
import { attachCorrectFixToGroup } from "./correct-fix";
import type { AuditorIssue, AuditorRunResult, GroupedFailure } from "./types";
import { redactForTraining, isFictionalEvalPack } from "./redaction";

export type TrainingUse =
  | "profile_rule"
  | "source_grounding"
  | "strategy_ranking"
  | "safe_court_wording"
  | "disclosure_chase"
  | "documents_navigation"
  | "ui_safety"
  | "wording_polish"
  | "manifest_review";

export type TrainingDataRow = {
  runId: string;
  pack: string;
  caseId: string;
  caseFamily: string;
  screen: string;
  fingerprint: string;
  issueFamily: string;
  severity: string;
  badOutputSnippet: string;
  whyItIsWrong: string;
  correctFixPrinciple: string;
  suggestedBetterOutput: string;
  fixType: string;
  confidence: string;
  sourceGroundingStatus: "manifest_backed" | "pattern_only" | "unknown";
  redactionStatus: string;
  approvedForTraining: boolean;
  needsHumanReview: boolean;
  trainingUse: TrainingUse;
};

function trainingUseFor(fingerprint: string, fixType: string): TrainingUse {
  if (fingerprint.startsWith("manifest.")) return "manifest_review";
  if (fixType === "ui_permission_fix") return "ui_safety";
  if (fixType === "documents_navigation_fix") return "documents_navigation";
  if (fixType === "court_today_date_fix") return "safe_court_wording";
  if (fingerprint.startsWith("source.")) return "source_grounding";
  if (fingerprint.startsWith("strategy.")) return "strategy_ranking";
  if (fingerprint.startsWith("profile_leakage")) return "profile_rule";
  if (fingerprint.startsWith("wording.") || fingerprint.startsWith("anchor.")) return "wording_polish";
  if (fingerprint.includes("disclosure")) return "disclosure_chase";
  return "profile_rule";
}

function sourceGroundingStatus(issue: AuditorIssue, fixType: string): TrainingDataRow["sourceGroundingStatus"] {
  if (fixType === "exact_truth_fix") return "manifest_backed";
  if (fixType === "source_grounded_fix") return "pattern_only";
  if (issue.manifestConfirmed) return "manifest_backed";
  return "unknown";
}

function approvedDefault(
  pack: AuditorRunResult["summary"]["pack"],
  issue: AuditorIssue,
  fixType: string,
  redactionStatus: string,
): boolean {
  if (!isFictionalEvalPack(pack)) return false;
  if (!issue.manifestConfirmed) return false;
  if (fixType === "uncertain_needs_review") return false;
  if (redactionStatus === "needs_review") return false;
  if (fixType === "exact_truth_fix" || fixType === "source_grounded_fix") return false;
  return false;
}

export function buildTrainingDataRows(result: AuditorRunResult): TrainingDataRow[] {
  const { summary, issues, groups, cases } = result;
  const groupByFp = new Map(groups.map((g) => [g.fingerprint, g]));
  const rows: TrainingDataRow[] = [];

  for (const issue of issues) {
    if (issue.status === "pass") continue;
    let group = groupByFp.get(issue.fingerprint);
    if (!group) {
      group = attachCorrectFixToGroup(
        {
          fingerprint: issue.fingerprint,
          issueFamily: issue.issueFamily,
          severity: issue.severity,
          demoBlocker: issue.demoBlocker,
          affectedCount: 1,
          affectedCases: [`${issue.caseTitle} (${issue.caseId})`],
          affectedScreens: [`${issue.caseTitle} / ${issue.screen}`],
          examples: issue.badText
            ? [{ caseTitle: issue.caseTitle, screen: issue.screen, badText: issue.badText.slice(0, 200) }]
            : [],
          expectedBehaviour: issue.expected,
          likelySharedCause: issue.suggestedSharedFix,
          suggestedCursorFix: issue.suggestedSharedFix,
          releaseBlocking: issue.releaseBlocking,
        },
        { pack: summary.pack, cases },
      );
    }
    if (!group.badOutputSnippet && !issue.badText) continue;

    const caseRow = cases.find((c) => c.caseId === issue.caseId);
    const badRawSource = issue.badText ?? group.badOutputSnippet ?? "";
    const badRaw = badRawSource.slice(0, 300);
    const redacted = redactForTraining(badRaw, summary.pack);
    const suggestedRedacted = redactForTraining(
      (group.suggestedBetterOutput ?? group.correctFixPrinciple ?? "").slice(0, 300),
      summary.pack,
    );

    const fixType = group.fixType ?? "uncertain_needs_review";
    const row: TrainingDataRow = {
      runId: summary.runId,
      pack: summary.pack,
      caseId: issue.caseId,
      caseFamily: caseRow?.auditorFamily ?? caseRow?.profile ?? "unknown",
      screen: issue.screen,
      fingerprint: issue.fingerprint,
      issueFamily: issue.issueFamily,
      severity: issue.severity,
      badOutputSnippet: redacted.text,
      whyItIsWrong: group.whyItIsWrong ?? issue.message,
      correctFixPrinciple: group.correctFixPrinciple ?? group.suggestedCursorFix,
      suggestedBetterOutput: suggestedRedacted.text,
      fixType,
      confidence: group.confidence ?? "medium",
      sourceGroundingStatus: sourceGroundingStatus(issue, fixType),
      redactionStatus: redacted.redactionStatus,
      approvedForTraining: approvedDefault(summary.pack, issue, fixType, redacted.redactionStatus),
      needsHumanReview: group.needsHumanReview ?? true,
      trainingUse: trainingUseFor(issue.fingerprint, fixType),
    };
    rows.push(row);
  }

  return rows;
}

export function writeTrainingDataJsonl(outDir: string, result: AuditorRunResult): number {
  const rows = buildTrainingDataRows(result);
  const filePath = path.join(outDir, "training-data.jsonl");
  fs.mkdirSync(outDir, { recursive: true });
  const lines = rows.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  return rows.length;
}
