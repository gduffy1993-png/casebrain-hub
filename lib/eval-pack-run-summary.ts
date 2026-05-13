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
import { GOLDEN_SWEEP_QUESTIONS } from "@/lib/eval-golden-sweep";
import { EVAL_PACK_LABELS, type EvalPackId } from "@/lib/eval-packs";

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
  /** Set after a successful `/api/eval-sweeps` save from Eval Pack Runner. */
  sweep_run_id?: string | null;
  sweep_saved_at?: string | null;
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

/** Same row shape as `POST /api/eval-sweeps` (Eval Pack Runner). */
export function buildGoldenEvalSweepSavePayload(
  packId: EvalPackId,
  caseCount: number,
  rows: GoldenSweepEvalRow[]
): {
  source: "golden";
  questions: string[];
  summary_stats: Record<string, unknown>;
  rows: Array<{
    case_id: string;
    case_title: string;
    question_no: number;
    question: string;
    answer: string;
    error: string | null;
    duration_ms: number | undefined;
    weak: boolean;
    http_status: number | undefined;
    route_tag: string | null;
    row_meta: Record<string, unknown>;
  }>;
} {
  const bulkRows = goldenSweepRowsToBulkInput(rows);
  const { rows_augmented } = bulkEvalBuildAugmentedRows(bulkRows, "golden_10");
  const summary_stats = {
    ...buildPackRunSummaryStatsForSave(rows),
    eval_pack_id: packId,
    eval_pack_name: EVAL_PACK_LABELS[packId],
    eval_pack_runner: true,
    eval_pack_case_count: caseCount,
  };
  const apiRows = rows_augmented.map((r) => ({
    case_id: r.caseId,
    case_title: r.caseTitle,
    question_no: r.questionNo,
    question: r.question,
    answer: r.answer,
    error: r.ok ? null : (r.error ?? r.answer),
    duration_ms: r.duration_ms,
    weak: r.weak,
    http_status: r.http_status,
    route_tag: r.route_tag,
    row_meta:
      r.eval_meta && typeof r.eval_meta === "object"
        ? {
            ...(r.eval_meta as Record<string, unknown>),
            ui_final_quality: r.final_quality,
            ui_final_issue: r.final_issue,
            ui_final_collapse_rule: r.final_collapse_rule,
          }
        : {
            ui_final_quality: r.final_quality,
            ui_final_issue: r.final_issue,
            ui_final_collapse_rule: r.final_collapse_rule,
          },
  }));
  return {
    source: "golden",
    questions: [...GOLDEN_SWEEP_QUESTIONS],
    summary_stats,
    rows: apiRows,
  };
}

/** ChatGPT / debug-style single-run export (matches save payload + run id). */
export function buildSingleSweepExportDocument(m: PackGoldenMatrixRow): Record<string, unknown> {
  const payload = buildGoldenEvalSweepSavePayload(m.pack_id as EvalPackId, m.case_count, m.rows);
  return {
    run_id: m.sweep_run_id ?? null,
    generated_at: m.sweep_saved_at ?? new Date().toISOString(),
    source: payload.source,
    row_count: m.row_count,
    summary_stats: payload.summary_stats,
    questions: payload.questions,
    rows: payload.rows,
  };
}

export function buildCombinedEvalPackSweepsExport(
  packs: PackGoldenMatrixRow[],
  exportedAt: string
): Record<string, unknown> {
  return {
    kind: "casebrain_eval_pack_export",
    exported_at: exportedAt,
    pack_count: packs.length,
    runs: packs.map((m) => buildSingleSweepExportDocument(m)),
  };
}

type AugmentedGoldenRow = ReturnType<typeof goldenSweepRowsToBulkInput>[number] & {
  final_quality: string;
  final_issue: string;
  final_collapse_rule: string;
};

function getAugmentedGoldenRows(rows: GoldenSweepEvalRow[]): AugmentedGoldenRow[] {
  const bulk = goldenSweepRowsToBulkInput(rows);
  const { rows_augmented } = bulkEvalBuildAugmentedRows(bulk, "golden_10");
  return rows_augmented as AugmentedGoldenRow[];
}

function filterWeakAugmentedRows(aug: AugmentedGoldenRow[]): AugmentedGoldenRow[] {
  return aug.filter((r) => r.weak || r.final_quality !== "pass");
}

function augmentedToWeakExportRow(r: AugmentedGoldenRow) {
  return {
    case_id: r.caseId,
    case_title: r.caseTitle,
    question_no: r.questionNo,
    question: r.question,
    answer: r.answer,
    error: r.ok ? null : (r.error ?? r.answer),
    duration_ms: r.duration_ms,
    weak: r.weak,
    http_status: r.http_status,
    route_tag: r.route_tag,
    final_quality: r.final_quality,
    final_issue: r.final_issue,
    final_collapse_rule: r.final_collapse_rule,
    row_meta:
      r.eval_meta && typeof r.eval_meta === "object"
        ? {
            ...(r.eval_meta as Record<string, unknown>),
            ui_final_quality: r.final_quality,
            ui_final_issue: r.final_issue,
            ui_final_collapse_rule: r.final_collapse_rule,
          }
        : {
            ui_final_quality: r.final_quality,
            ui_final_issue: r.final_issue,
            ui_final_collapse_rule: r.final_collapse_rule,
          },
  };
}

export function buildWeakRowsJsonForPack(m: PackGoldenMatrixRow): Record<string, unknown> {
  const aug = filterWeakAugmentedRows(getAugmentedGoldenRows(m.rows));
  return {
    pack_id: m.pack_id,
    pack_name: m.pack_name,
    weak_row_count: aug.length,
    rows: aug.map((r) => augmentedToWeakExportRow(r)),
  };
}

function escapeCsvCell(v: string | number | boolean | null | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildWeakRowsCsvForPack(m: PackGoldenMatrixRow): string {
  const aug = filterWeakAugmentedRows(getAugmentedGoldenRows(m.rows));
  const headers = [
    "pack_id",
    "case_id",
    "case_title",
    "question_no",
    "question",
    "weak",
    "final_quality",
    "final_issue",
    "final_collapse_rule",
    "route_tag",
    "duration_ms",
    "answer_excerpt",
  ];
  const lines = [headers.join(",")];
  for (const r of aug) {
    const excerpt = (r.answer || r.error || "").replace(/\s+/g, " ").trim().slice(0, 2000);
    lines.push(
      [
        m.pack_id,
        r.caseId,
        r.caseTitle,
        r.questionNo,
        r.question,
        r.weak,
        r.final_quality,
        r.final_issue,
        r.final_collapse_rule,
        r.route_tag ?? "",
        r.duration_ms ?? "",
        excerpt,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

export function buildWeakRowsCsvForPacks(packs: PackGoldenMatrixRow[]): string {
  const headers = [
    "pack_id",
    "case_id",
    "case_title",
    "question_no",
    "question",
    "weak",
    "final_quality",
    "final_issue",
    "final_collapse_rule",
    "route_tag",
    "duration_ms",
    "answer_excerpt",
  ];
  const lines = [headers.join(",")];
  for (const m of packs) {
    const aug = filterWeakAugmentedRows(getAugmentedGoldenRows(m.rows));
    for (const r of aug) {
      const excerpt = (r.answer || r.error || "").replace(/\s+/g, " ").trim().slice(0, 2000);
      lines.push(
        [
          m.pack_id,
          r.caseId,
          r.caseTitle,
          r.questionNo,
          r.question,
          r.weak,
          r.final_quality,
          r.final_issue,
          r.final_collapse_rule,
          r.route_tag ?? "",
          r.duration_ms ?? "",
          excerpt,
        ]
          .map(escapeCsvCell)
          .join(",")
      );
    }
  }
  return lines.join("\r\n");
}

/**
 * Static guardrails the model / human reviewer must respect when acting on a
 * Cursor fix brief. Kept inline so the exported `.txt` is self-contained for
 * paste into Cursor.
 */
function pushTuningConstraintsBlock(lines: string[], packs: PackGoldenMatrixRow[]): void {
  const packIds = new Set(packs.map((p) => p.pack_id));
  const includesA = packIds.has("A");
  const includesB = packIds.has("B");
  const includesC = packIds.has("C");
  const includesD = packIds.has("D");

  lines.push("## Tuning constraints (read first)");
  lines.push("");
  lines.push("**Pack tag verification status (current run):**");
  lines.push("- Pack A — verified (Northshire regression / stability).");
  lines.push("- Pack B — verified (CB-TEST bundle wording / generalisation).");
  lines.push("- Pack C — **verified** as `CB-TRAP` hallucination traps.");
  lines.push("- Pack D — **verified** as `CB-GOLD` gold-answer truth.");
  lines.push("");
  lines.push(
    "All four packs are now valid tuning signals. Do **not** loosen hallucination protection. Do **not** invent missing evidence. Instead, make the deterministic / eval routes answer from explicit negative or limited-source wording that the file actually publishes."
  );
  lines.push("");

  if (includesA) {
    lines.push("### Pack A — Q1 guardrail");
    lines.push(
      "Q1 must return only the **printed allegation / charge wording** from the bundle. Do not let Q1 include any of:"
    );
    lines.push("- defence friction / grounds for dispute");
    lines.push("- primary eval hook commentary");
    lines.push("- MG6 weakness language");
    lines.push("- strategy framing");
    lines.push(
      "Fix Q1 output shaping (post-processing or prompt scoping) — do **not** weaken the `strict_primary_allegation` route to make the scorer happy."
    );
    lines.push(
      "Also: if the allegation answer truncates mid-sentence (raw `slice(0, N)`), use `softTruncate` (defence-plan-chat route) to cut at the nearest sentence/clause/word boundary."
    );
    lines.push("");
  }

  if (includesB) {
    lines.push("### Pack B — Q1 guardrail");
    lines.push(
      "Some Pack B Q1 answers already look like valid charge wording (e.g. starting `On [date] at [time] …`). If the scorer marks these as `missing offence wording`, that is a **scoring heuristic bug**, not a route bug."
    );
    lines.push("- Fix the heuristic in `lib/bulk-eval-result-present.ts` / `lib/eval-sweep-review.ts`.");
    lines.push("- Do not change `strict_primary_allegation`.");
    lines.push("- Do not change the charge-wording prompt.");
    lines.push("");
    lines.push("### Pack B — Q7 guardrail");
    lines.push(
      "Repeat-source / stem-collapse warnings on Q7 can be style noise: legal proof answers naturally share structure (elements, exhibits, witnesses). Before changing generation:"
    );
    lines.push("- confirm answers are case-specific by **offence label** and **charge wording**;");
    lines.push("- only then consider scoring/heuristic tweaks;");
    lines.push("- do not touch the Q7 generation route or grounding unless answers are factually wrong.");
    lines.push("");
  }

  if (includesC) {
    lines.push("### Pack C — CB-TRAP expected behaviour");
    lines.push(
      "Pack C cases publish explicit negative / limited-source wording. The deterministic / eval routes must answer from that wording instead of falling back with `\"The bundle does not safely support a final answer\"`."
    );
    lines.push("If the file says, for example:");
    lines.push("- `CCTV not identified`");
    lines.push("- `no 999 referenced`");
    lines.push("- `no other exhibit codes listed`");
    lines.push("- `interview not served` / `no comment only`");
    lines.push("- MG6 / disclosure note `outstanding` / `not identified`");
    lines.push(
      "…then answer that **directly** (Q3, Q8, Q9, Q10). See `buildEvalFile*Answer` helpers in `app/api/criminal/[caseId]/defence-plan-chat/route.ts` — they read `CB-TRAP` absence wording verbatim and emit a grounded three-line answer."
    );
    lines.push(
      "Do not loosen hallucination protection. Do not invent missing evidence. The fix is to recognise the negative wording, not to fabricate items."
    );
    lines.push(
      "Also: if Pack C reports a `Case not found` error, the case_id was deleted/archived between the case-list snapshot and the run. The golden sweep client now skips remaining questions on the case with `route_tag = case_not_found_skipped` — confirm the case list is fresh before rerunning."
    );
    lines.push("");
  }

  if (includesD) {
    lines.push("### Pack D — CB-GOLD expected behaviour");
    lines.push("Pack D files are gold-answer truth files. The supplied `CB-GOLD` text contains:");
    lines.push("- charge wording");
    lines.push("- MG5 summary");
    lines.push("- MG6 / disclosure position");
    lines.push("- interview note");
    lines.push("- exhibit list");
    lines.push("- defence position");
    lines.push("- prosecution route");
    lines.push("- missing / outstanding evidence");
    lines.push("- conflicts");
    lines.push("- next 24h action");
    lines.push("Use those sections directly. Section-specific routing:");
    lines.push(
      "- **Q3 (missing / incomplete evidence):** read `MATERIAL NOT PROVIDED`, `DISCLOSURE GAPS`, `MISSING / OUTSTANDING EVIDENCE`, `WHAT IS NOT YET SERVED`, or the `MG6 disclosure note`."
    );
    lines.push(
      "- **Q8 (single biggest weakness in the prosecution case):** read `PROSECUTION WEAKNESS PRESSURE`, `PROSECUTION ROUTE`, `MG5 TENSION`, served/outstanding evidence, and `FILE CONFLICT`."
    );
    lines.push(
      "- **Q9 (single biggest weakness in the defence case):** read `DEFENCE WEAKNESS PRESSURE`, `DEFENCE POSITION`, `INTERVIEW ACCOUNT`, and `CROWN ROUTE`."
    );
    lines.push(
      "- **Q10 (next 24 hours):** read `NEXT 24 HOURS`, `NEXT LISTING`, `PROCEDURAL NEXT STEP`, and `COURT TIMETABLE` text."
    );
    lines.push(
      "See `buildEvalFile*Answer` helpers in `app/api/criminal/[caseId]/defence-plan-chat/route.ts` — they read these CB-GOLD sections and emit a grounded answer that quotes the gold file."
    );
    lines.push("");
  }

  lines.push("### Do not change");
  lines.push("- Pack A source files");
  lines.push("- Pack B source files");
  lines.push("- normal upload flow");
  lines.push("- hallucination protection");
  lines.push("- exhibit extraction (unless a routing bug is clearly proven)");
  lines.push("- strict routes that already pass Pack A and Pack B");
  lines.push("- MG6 parser");
  lines.push("- interview parser");
  lines.push("- grounding gate");
  lines.push("");

  lines.push("### Regression");
  lines.push("1. Run `npx tsc --noEmit`.");
  lines.push("2. Rerun Pack A (Golden 10).");
  lines.push("3. Rerun Pack B (Golden 10).");
  lines.push("4. Rerun Pack C (Golden 10).");
  lines.push("5. Rerun Pack D (Golden 10).");
  lines.push("After changes to shared code (`lib/bulk-eval-result-present.ts`, `lib/eval-sweep-review.ts`, defence-plan-chat route), rerun the full A–J set.");
  lines.push("");
  lines.push("---");
  lines.push("");
}

/** Per-pack/per-issue inline hints appended inside each `Issue group` block. */
function expectedBehaviourForIssue(packId: string, questionNos: number[]): string[] {
  const out: string[] = [];
  const hasQ = (n: number) => questionNos.includes(n);
  if (packId === "A" && hasQ(1)) {
    out.push(
      "- pack_a_q1_note: Q1 must be the printed allegation only. Trim any 'grounds for dispute', primary eval hook, MG6 weakness, or strategy language from the Q1 output — do not soften `strict_primary_allegation`."
    );
  }
  if (packId === "B" && hasQ(1)) {
    out.push(
      "- pack_b_q1_note: If the answer already looks like real charge wording (e.g. starts `On [date] at [time]…`), this is a **scoring** problem. Fix the heuristic in `lib/bulk-eval-result-present.ts` / `lib/eval-sweep-review.ts`. Do not weaken `strict_primary_allegation`."
    );
  }
  if (packId === "B" && hasQ(7)) {
    out.push(
      "- pack_b_q7_note: Repeat-source / stem warnings may be benign because proof answers share structure. Before changing generation, verify answers are case-specific by offence label and charge wording. Prefer scoring relaxation over route changes."
    );
  }
  if (packId === "C") {
    if (hasQ(3)) {
      out.push(
        "- pack_c_q3_note: Pack C is CB-TRAP (hallucination traps). If the file publishes explicit negative wording (`CCTV not identified`, `no 999 referenced`, `interview not served`, MG6 `outstanding`), Q3 must answer that **directly** rather than falling back. Wire `buildEvalFileMissingEvidenceAnswer` into the deterministic Q3 path."
      );
    }
    if (hasQ(1) || hasQ(7)) {
      out.push(
        "- pack_c_q1_q7_note: Trap files still need printed charge wording (Q1) and grounded proof framing (Q7). Do not soften strict routes; instead make them recognise trap-style absence wording."
      );
    }
    if (hasQ(8) || hasQ(9) || hasQ(10)) {
      out.push(
        "- pack_c_q8_q9_q10_note: Use `buildEvalFile{ProsecutionWeakness|DefenceWeakness|Next24}Answer` to read trap absence wording verbatim. Do not invent missing items; answer 'CCTV not identified', 'interview not served', 'MG6 outstanding' as stated."
      );
    }
  }
  if (packId === "D") {
    if (hasQ(3)) {
      out.push(
        "- pack_d_q3_note: Pack D is CB-GOLD. Q3 must read `MATERIAL NOT PROVIDED` / `DISCLOSURE GAPS` / `MISSING / OUTSTANDING EVIDENCE` / `WHAT IS NOT YET SERVED` / `MG6 disclosure note` from the gold file directly."
      );
    }
    if (hasQ(8)) {
      out.push(
        "- pack_d_q8_note: Q8 must read `PROSECUTION WEAKNESS PRESSURE`, `PROSECUTION ROUTE`, `MG5 TENSION`, served/outstanding evidence rows, and any `FILE CONFLICT` block from the CB-GOLD file."
      );
    }
    if (hasQ(9)) {
      out.push(
        "- pack_d_q9_note: Q9 must read `DEFENCE WEAKNESS PRESSURE`, `DEFENCE POSITION`, `INTERVIEW ACCOUNT`, and `CROWN ROUTE` from the CB-GOLD file."
      );
    }
    if (hasQ(10)) {
      out.push(
        "- pack_d_q10_note: Q10 must read `NEXT 24 HOURS`, `NEXT LISTING`, `PROCEDURAL NEXT STEP`, and `COURT TIMETABLE` from the CB-GOLD file."
      );
    }
  }
  return out;
}

export function buildCombinedCursorEvalFixBrief(packs: PackGoldenMatrixRow[]): string {
  const lines: string[] = [];
  lines.push("# CaseBrain — Cursor eval fix brief");
  lines.push("");
  lines.push("Use this to plan code changes. Do not loosen hallucination protection or grounding.");
  lines.push("");

  pushTuningConstraintsBlock(lines, packs);

  lines.push("## Summary");
  const packList = packs.map((p) => `${p.pack_id} (${p.pack_name})`).join(", ");
  const totalCases = packs.reduce((s, p) => s + p.case_count, 0);
  const totalRows = packs.reduce((s, p) => s + p.row_count, 0);
  const pass = packs.reduce((s, p) => s + p.pass, 0);
  const weak = packs.reduce((s, p) => s + p.weak, 0);
  const fail = packs.reduce((s, p) => s + p.fail, 0);
  const timeout = packs.reduce((s, p) => s + p.timeout, 0);
  lines.push(`- Packs included: ${packList}`);
  lines.push(`- Total cases: ${totalCases}`);
  lines.push(`- Total rows: ${totalRows}`);
  lines.push(`- Total pass/weak/fail/timeout: ${pass}/${weak}/${fail}/${timeout}`);
  lines.push("- Main issues by pack:");
  for (const m of packs) {
    lines.push(`  - Pack ${m.pack_id}: ${m.main_issue}`);
  }
  lines.push("");

  for (const m of packs) {
    lines.push(`## Pack ${m.pack_id} — ${m.pack_name}`);
    if (m.pack_id === "C") {
      lines.push(
        "> Pack C tag verified: `CB-TRAP` hallucination traps. Make deterministic / eval routes answer from explicit negative or limited-source wording — do **not** loosen hallucination protection or invent missing evidence."
      );
    } else if (m.pack_id === "D") {
      lines.push(
        "> Pack D tag verified: `CB-GOLD` gold-answer truth. Use the supplied CB-GOLD section text (charge, MG5, MG6, interview, exhibits, defence, prosecution, missing/outstanding, conflicts, next 24h) directly."
      );
    }
    lines.push(`- Cases: ${m.case_count}`);
    lines.push(`- Rows: ${m.row_count}`);
    lines.push(`- Pass/weak/fail/timeout: ${m.pass}/${m.weak}/${m.fail}/${m.timeout}`);
    lines.push(`- Main issue: ${m.main_issue}`);
    lines.push(`- Fallback rows: ${m.fallback_count}`);
    lines.push(`- Semantic collapse warnings (questions): ${m.collapse_warning_count}`);
    if (m.drift_warnings.length) {
      lines.push("- Route drift warnings:");
      for (const w of m.drift_warnings.slice(0, 24)) lines.push(`  - ${w}`);
    } else {
      lines.push("- Route drift warnings: none");
    }
    lines.push("");

    const aug = filterWeakAugmentedRows(getAugmentedGoldenRows(m.rows));
    type Group = {
      count: number;
      issue: string;
      questionNos: Set<number>;
      routeTags: Set<string>;
      examples: string[];
    };
    const groups = new Map<string, Group>();
    for (const r of aug) {
      const tag = (r.route_tag ?? "").trim() || "—";
      const key = `${r.questionNo}|${r.final_issue}|${tag}`;
      let g = groups.get(key);
      if (!g) {
        g = { count: 0, issue: r.final_issue, questionNos: new Set(), routeTags: new Set(), examples: [] };
        groups.set(key, g);
      }
      g.count += 1;
      g.questionNos.add(r.questionNo);
      if (r.route_tag && r.route_tag.trim()) g.routeTags.add(r.route_tag.trim());
      const ex = (r.answer || r.error || "").replace(/\s+/g, " ").trim().slice(0, 240);
      if (ex && g.examples.length < 3) g.examples.push(ex);
    }

    const sorted = [...groups.entries()].sort((a, b) => b[1].count - a[1].count);
    let gi = 0;
    for (const [, v] of sorted) {
      gi += 1;
      const qs = [...v.questionNos].sort((a, b) => a - b);
      lines.push(`### Issue group ${gi}`);
      lines.push(`- question_no: ${qs.join(", ")}`);
      lines.push(`- issue: ${v.issue}`);
      lines.push(`- count: ${v.count}`);
      lines.push(`- route_tags: ${[...v.routeTags].join(", ") || "—"}`);
      lines.push("- example_bad_answers:");
      for (const ex of v.examples) lines.push(`  - ${ex}`);
      lines.push(
        "- expected_behaviour: tighten client scoring or server routing only if agreed; preserve strict routes for golden. Do not loosen hallucination protection."
      );
      const hints = expectedBehaviourForIssue(m.pack_id, qs);
      for (const h of hints) lines.push(h);
      lines.push(
        "- likely_files_involved: `lib/bulk-eval-result-present.ts`, `lib/eval-sweep-review.ts`, `app/api/criminal/[caseId]/defence-plan-chat/route.ts` (do not change unless fixing routing bugs)."
      );
      lines.push(
        "- do_not_change: Pack A files, Pack B files, normal upload flow, hallucination protection, exhibit extraction (unless clearly needed), strict routes that already pass A/B, MG6 parser, interview parser, grounding gate."
      );
      lines.push(
        `- regression: rerun Pack ${m.pack_id} golden 10 via Eval Pack Runner; rerun A, B, C, D after any change; if touching shared code, rerun full A–J.`
      );
      lines.push("");
    }
    if (sorted.length === 0) {
      lines.push("_No non-pass rows in augmented quality for this pack._");
      lines.push("");
    }
  }

  return lines.join("\n");
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

/** @deprecated Prefer `buildCombinedCursorEvalFixBrief`; kept for callers expecting the same export name. */
export function buildCursorEvalFixBrief(matrix: PackGoldenMatrixRow[]): string {
  return buildCombinedCursorEvalFixBrief(matrix);
}
