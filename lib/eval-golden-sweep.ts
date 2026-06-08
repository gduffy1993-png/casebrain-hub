import { buildEvalSummaryStats } from "@/lib/eval-run-metadata";

/**
 * Canonical 10-question “golden sweep” for bulk eval (Defence Plan runner).
 * Order matches intended regression passes; keep wording stable for strict routes.
 */
export const GOLDEN_SWEEP_QUESTIONS = [
  "What is the primary allegation in one sentence using only charge/bundle wording as printed in these papers (charge sheet extract, offence tag, offence as charged, or count line) — no generic offence label, synopsis heading, or law-summary paraphrase?",
  "What does MG6 say is served and outstanding?",
  "What evidence appears missing or incomplete right now?",
  "What was said in interview?",
  "List every exhibit code exactly as printed and the bundle reference ID.",
  "Are there any inconsistencies or conflicts in the evidence?",
  "What must the prosecution still prove in this case?",
  "What is the single biggest weakness in the prosecution case?",
  "What is the single biggest weakness in the defence case?",
  "What should be done in the next 24 hours?",
] as const;

export type EvalSweepRowForStats = {
  questionNo: number;
  ok: boolean;
  weak: boolean;
  answer: string;
  error?: string;
  duration_ms: number;
  route_tag: string | null;
};

/** Per-question aggregates for summary_stats.per_question (regression / dashboards). */
export function summarizeEvalRowsByQuestion(rows: EvalSweepRowForStats[], questions: string[]) {
  return questions.map((q, i) => {
    const question_no = i + 1;
    const subset = rows.filter((r) => r.questionNo === question_no);
    const stats = buildEvalSummaryStats(
      subset.map((r) => ({
        ok: r.ok,
        weak: r.weak,
        answer: r.answer || r.error || "",
        duration_ms: r.duration_ms,
        route_tag: r.route_tag,
      })),
      [q]
    );
    return {
      question_no,
      question_preview: q.length > 140 ? `${q.slice(0, 137)}…` : q,
      ...stats,
    };
  });
}

/** Optional regression metadata (extend env at build/deploy time). */
export function buildGoldenSweepRegressionMeta(): Record<string, unknown> {
  return {
    analysis_version:
      typeof process.env.NEXT_PUBLIC_EVAL_ANALYSIS_VERSION === "string"
        ? process.env.NEXT_PUBLIC_EVAL_ANALYSIS_VERSION.trim()
        : "1",
    prompt_version: "1",
    git_commit:
      typeof process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA === "string"
        ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.trim()
        : typeof process.env.NEXT_PUBLIC_GIT_COMMIT === "string"
          ? process.env.NEXT_PUBLIC_GIT_COMMIT.trim()
          : null,
  };
}
