/**
 * Pack-level golden sweep aggregates (orchestration / reporting only).
 */

import { bulkEvalBuildAugmentedRows } from "@/lib/bulk-eval-result-present";
import { buildGoldenSweepRegressionMeta, summarizeEvalRowsByQuestion } from "@/lib/eval-golden-sweep";
import { buildEvalSummaryStats } from "@/lib/eval-run-metadata";
import { sweepSemanticHints } from "@/lib/eval-observability";
import {
  GOLDEN_FALLBACK_ROUTE_TAGS,
  goldenSweepRouteDriftWarnings,
  normalizeSweepRow,
} from "@/lib/eval-sweep-review";
import { goldenSweepRowsToBulkInput, GOLDEN_QUESTIONS, type GoldenSweepEvalRow } from "@/lib/eval/golden-sweep-client";

export type PackGoldenMatrixRow = {
  pack_id: string;
  pack_name: string;
  case_count: number;
  row_count: number;
  pass: number;
  weak: number;
  fail: number;
  timeout: number;
  main_issue: string;
  fallback_count: number;
  collapse_warning_count: number;
  avg_duration_ms: number;
  route_counts: Record<string, number>;
  /** Full row set for drill-down (same shape as GoldenEvalRunner). */
  rows: GoldenSweepEvalRow[];
  drift_warnings: string[];
};

export function summarizePackGoldenRun(
  packId: string,
  packName: string,
  caseCount: number,
  rows: GoldenSweepEvalRow[]
): PackGoldenMatrixRow {
  const bulk = goldenSweepRowsToBulkInput(rows);
  const { final_summary } = bulkEvalBuildAugmentedRows(bulk, "golden_10");
  const sweepRowsForStats = rows.map((r) => ({
    questionNo: r.question_no,
    ok: r.ok,
    weak: r.weak,
    answer: r.answer,
    duration_ms: r.duration_ms,
    route_tag: r.route_tag,
  }));
  const stats = buildEvalSummaryStats(
    sweepRowsForStats.map((r) => ({
      ok: r.ok,
      weak: r.weak,
      answer: r.answer,
      duration_ms: r.duration_ms,
      route_tag: r.route_tag,
    })),
    [...GOLDEN_QUESTIONS]
  );

  let fallback_count = 0;
  for (const r of rows) {
    const tag = (r.route_tag ?? "").trim();
    if (tag && GOLDEN_FALLBACK_ROUTE_TAGS.has(tag)) fallback_count += 1;
  }

  const forSemantic = rows.map((r) => ({
    question_no: r.question_no,
    answer: r.answer,
    eval_meta: r.eval_meta ?? null,
  }));
  const collapse_warning_count = sweepSemanticHints(forSemantic).filter((x) => x.collapse_warning).length;

  const normalized = rows.map((r) =>
    normalizeSweepRow({
      case_id: r.case_id,
      case_title: r.case_title,
      question_no: r.question_no,
      question: r.question,
      answer: r.answer,
      weak: r.weak,
      http_status: r.status,
      duration_ms: r.duration_ms,
      route_tag: r.route_tag,
      ok: r.ok,
      eval_meta: r.eval_meta ?? null,
    })
  );
  const drift_warnings = goldenSweepRouteDriftWarnings(normalized);

  return {
    pack_id: packId,
    pack_name: packName,
    case_count: caseCount,
    row_count: rows.length,
    pass: final_summary.final_pass_count,
    weak: final_summary.final_weak_count,
    fail: final_summary.final_fail_count,
    timeout: final_summary.final_timeout_error_count,
    main_issue: final_summary.mainIssue,
    fallback_count,
    collapse_warning_count,
    avg_duration_ms: stats.avg_duration_ms,
    route_counts: stats.route_counts,
    rows,
    drift_warnings,
  };
}

export function buildPackRunSummaryStatsForSave(rows: GoldenSweepEvalRow[]): Record<string, unknown> {
  const sweepRowsForStats = rows.map((r) => ({
    questionNo: r.question_no,
    ok: r.ok,
    weak: r.weak,
    answer: r.answer,
    duration_ms: r.duration_ms,
    route_tag: r.route_tag,
  }));
  const bulk = goldenSweepRowsToBulkInput(rows);
  const { final_summary } = bulkEvalBuildAugmentedRows(bulk, "golden_10");
  return {
    ...buildEvalSummaryStats(
      sweepRowsForStats.map((r) => ({
        ok: r.ok,
        weak: r.weak,
        answer: r.answer,
        duration_ms: r.duration_ms,
        route_tag: r.route_tag,
      })),
      [...GOLDEN_QUESTIONS]
    ),
    per_question: summarizeEvalRowsByQuestion(sweepRowsForStats, [...GOLDEN_QUESTIONS]),
    final_quality_summary: { ...final_summary, main_issue: final_summary.mainIssue },
    ...buildGoldenSweepRegressionMeta(),
  };
}

export function buildCursorEvalFixBrief(matrix: PackGoldenMatrixRow[]): string {
  const lines: string[] = [];
  lines.push("# CaseBrain — Cursor eval fix brief (auto-generated)");
  lines.push("");
  lines.push("Use this to plan code changes. Do not loosen hallucination protection or grounding.");
  lines.push("");
  for (const m of matrix) {
    const bulk = goldenSweepRowsToBulkInput(m.rows);
    const { rows_augmented } = bulkEvalBuildAugmentedRows(bulk, "golden_10");
    const weakAug = rows_augmented.filter((r) => r.final_quality !== "pass");
    const byIssue = new Map<
      string,
      { count: number; examples: string[]; routes: Set<string>; questions: Set<number> }
    >();
    for (const r of weakAug) {
      const iss = r.final_issue || "unknown";
      const cur =
        byIssue.get(iss) ?? { count: 0, examples: [] as string[], routes: new Set<string>(), questions: new Set<number>() };
      cur.count += 1;
      cur.questions.add(r.questionNo);
      if (r.route_tag) cur.routes.add(r.route_tag);
      if (cur.examples.length < 2 && (r.answer || r.error)) {
        const ex = (r.answer || r.error || "").replace(/\s+/g, " ").trim().slice(0, 220);
        if (ex) cur.examples.push(ex);
      }
      byIssue.set(iss, cur);
    }
    lines.push(`## Pack ${m.pack_id} — ${m.pack_name}`);
    lines.push(`- Cases: ${m.case_count}, rows: ${m.row_count}, main_issue: ${m.main_issue}`);
    lines.push(`- Pass/weak/fail/timeout: ${m.pass}/${m.weak}/${m.fail}/${m.timeout}`);
    lines.push(`- Fallback rows: ${m.fallback_count}, semantic collapse warnings (questions): ${m.collapse_warning_count}`);
    if (m.drift_warnings.length) {
      lines.push("- Route drift:");
      for (const w of m.drift_warnings.slice(0, 12)) lines.push(`  - ${w}`);
    }
    lines.push("");
    for (const [issue, v] of [...byIssue.entries()].sort((a, b) => b[1].count - a[1].count)) {
      lines.push(`### ${issue} (${v.count})`);
      lines.push(`- question_no: ${[...v.questions].sort((a, b) => a - b).join(", ")}`);
      lines.push(`- route_tags: ${[...v.routes].join(", ") || "—"}`);
      lines.push("- example_bad_answers:");
      for (const ex of v.examples) lines.push(`  - ${ex}`);
      lines.push(
        "- expected_behaviour: tighten client scoring or server routing only if agreed; preserve strict routes for golden."
      );
      lines.push(
        "- likely_files_involved: `lib/bulk-eval-result-present.ts`, `lib/eval-sweep-review.ts`, `app/api/criminal/[caseId]/defence-plan-chat/route.ts` (do not change unless fixing routing bugs)."
      );
      lines.push("- regression: rerun Pack " + m.pack_id + " golden 10 via Eval Pack Runner; then full A–J if touching shared code.");
      lines.push("");
    }
  }
  return lines.join("\n");
}
