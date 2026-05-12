import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import {
  GOLDEN_SWEEP_QUESTIONS,
  buildGoldenSweepRegressionMeta,
  summarizeEvalRowsByQuestion,
} from "@/lib/eval-golden-sweep";
import { bulkEvalBuildAugmentedRows } from "@/lib/bulk-eval-result-present";
import { buildSystemicCollapseWarnings, sweepSemanticHints, type EvalMetaV1 } from "@/lib/eval-observability";
import { buildEvalSummaryStats, isEvalWeakAnswer } from "@/lib/eval-run-metadata";
import { goldenSweepRouteDriftWarnings, normalizeSweepRow } from "@/lib/eval-sweep-review";

/** Bump when you add/remove top-level bundle sections. */
export const DEBUG_BUNDLE_SCHEMA_VERSION = 3;

const MAX_PLAN_JSON_CHARS = 120_000;
const MAX_CONTEXT_CHARS = 24_000;
const MAX_CHAT_MESSAGE_CHARS = 32_000;

function truncate(str: string, max: number): { text: string; truncated: boolean } {
  if (str.length <= max) return { text: str, truncated: false };
  return { text: `${str.slice(0, max)}\n… [truncated ${str.length - max} chars]`, truncated: true };
}

function safeJsonParse(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "parse error" };
  }
}

/** Never ship auth/session tokens; only CaseBrain + benign keys get values. */
function storageKeyPolicy(key: string): "include_full" | "include_meta_only" | "omit" {
  const lower = key.toLowerCase();
  if (lower.startsWith("sb-")) return "omit";
  if (lower.includes("__clerk")) return "omit";
  if (lower.includes("clerk")) return "omit";
  if (/(^|[^a-z])session([^a-z]|$)/i.test(key) && !key.startsWith("casebrain:")) return "omit";
  if (/(token|secret|password|auth)/i.test(key) && !key.startsWith("casebrain:")) return "omit";
  if (key.startsWith("casebrain:")) return "include_full";
  if (key === "sidebar_selected_roles") return "include_full";
  return "include_meta_only";
}

/**
 * Snapshot of localStorage: CaseBrain keys with parsed or raw values;
 * other keys as names + lengths only (no secrets).
 */
export function collectLocalStorageForDebugBundle(maxCharsPerValue = 48_000): {
  keys_total: number;
  entries: Array<{
    key: string;
    policy: "full" | "meta_only" | "omit";
    char_length?: number;
    value?: unknown;
    raw_truncated?: string;
    parse_error?: string;
  }>;
} {
  if (typeof window === "undefined" || !window.localStorage) {
    return { keys_total: 0, entries: [] };
  }
  const entries: Array<{
    key: string;
    policy: "full" | "meta_only" | "omit";
    char_length?: number;
    value?: unknown;
    raw_truncated?: string;
    parse_error?: string;
  }> = [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k) keys.push(k);
  }
  keys.sort();
  for (const key of keys) {
    const policy = storageKeyPolicy(key);
    if (policy === "omit") {
      entries.push({ key, policy: "omit" });
      continue;
    }
    const raw = window.localStorage.getItem(key) ?? "";
    if (policy === "include_meta_only") {
      entries.push({ key, policy: "meta_only", char_length: raw.length });
      continue;
    }
    const parsed = safeJsonParse(raw);
    if (parsed.ok) {
      const ser = JSON.stringify(parsed.value);
      if (ser.length > maxCharsPerValue) {
        entries.push({
          key,
          policy: "full",
          char_length: raw.length,
          parse_error: undefined,
          raw_truncated: truncate(ser, maxCharsPerValue).text,
        });
      } else {
        entries.push({ key, policy: "full", char_length: raw.length, value: parsed.value });
      }
    } else {
      const t = truncate(raw, maxCharsPerValue);
      entries.push({
        key,
        policy: "full",
        char_length: raw.length,
        parse_error: parsed.error,
        raw_truncated: t.text,
      });
    }
  }
  return { keys_total: keys.length, entries };
}

export type DebugBundleBrowser = {
  href: string;
  origin: string;
  pathname: string;
  search: string;
  referrer: string;
  user_agent: string;
  language: string | null;
  platform: string | null;
  cookie_enabled: boolean | null;
  on_line: boolean | null;
  timezone_offset_minutes: number | null;
  exported_at_iso: string;
  screen: { width: number; height: number; avail_width: number; avail_height: number } | null;
  viewport: { inner_width: number; inner_height: number; device_pixel_ratio: number } | null;
  connection_effective_type: string | null;
};

export function collectBrowserContext(): DebugBundleBrowser | null {
  if (typeof window === "undefined") return null;
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const conn = nav && "connection" in nav ? (nav as Navigator & { connection?: { effectiveType?: string } }).connection : undefined;
  return {
    href: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    user_agent: nav?.userAgent ?? "",
    language: nav?.language ?? null,
    platform: nav?.platform ?? null,
    cookie_enabled: nav?.cookieEnabled ?? null,
    on_line: nav?.onLine ?? null,
    timezone_offset_minutes: typeof new Date().getTimezoneOffset === "function" ? new Date().getTimezoneOffset() : null,
    exported_at_iso: new Date().toISOString(),
    screen:
      typeof window.screen !== "undefined"
        ? {
            width: window.screen.width,
            height: window.screen.height,
            avail_width: window.screen.availWidth,
            avail_height: window.screen.availHeight,
          }
        : null,
    viewport: {
      inner_width: window.innerWidth,
      inner_height: window.innerHeight,
      device_pixel_ratio: typeof window.devicePixelRatio === "number" ? window.devicePixelRatio : 1,
    },
    connection_effective_type: conn?.effectiveType ?? null,
  };
}

function publicBuildFingerprint(): Record<string, string | boolean | null> {
  const supabaseUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
  let supabase_host: string | null = null;
  if (supabaseUrl) {
    try {
      supabase_host = new URL(supabaseUrl).hostname;
    } catch {
      supabase_host = "invalid_url";
    }
  }
  return {
    node_env: typeof process !== "undefined" ? (process.env.NODE_ENV ?? "unknown") : "unknown",
    vercel_git_commit_sha: (typeof process !== "undefined" && process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim()) || null,
    git_commit: (typeof process !== "undefined" && process.env.NEXT_PUBLIC_GIT_COMMIT?.trim()) || null,
    eval_analysis_version: (typeof process !== "undefined" && process.env.NEXT_PUBLIC_EVAL_ANALYSIS_VERSION?.trim()) || null,
    dev_case_picker_env: (typeof process !== "undefined" && /^(1|true|yes|on)$/i.test((process.env.NEXT_PUBLIC_DEV_CASE_PICKER ?? "").trim())) || false,
    supabase_host,
    supabase_url_configured: Boolean(supabaseUrl),
  };
}

function serializePlan(plan: DefenceStrategyPlan | null): {
  plan: DefenceStrategyPlan | null;
  plan_json_truncated: boolean;
  plan_json_overflow?: { approx_chars: number; head_preview: string };
} {
  if (!plan) return { plan: null, plan_json_truncated: false };
  const ser = JSON.stringify(plan);
  if (ser.length <= MAX_PLAN_JSON_CHARS) return { plan, plan_json_truncated: false };
  return {
    plan: null,
    plan_json_truncated: true,
    plan_json_overflow: { approx_chars: ser.length, head_preview: truncate(ser, 12_000).text },
  };
}

export type DefencePlanEvalRowBundle = {
  caseId: string;
  caseTitle: string;
  questionNo: number;
  question: string;
  answer: string;
  error?: string;
  duration_ms: number;
  route_tag: string | null;
  weak: boolean;
  http_status: number;
  ok: boolean;
  eval_meta?: EvalMetaV1 | null;
};

export type BuildDefencePlanDebugBundleInput = {
  caseId: string;
  plan: DefenceStrategyPlan | null;
  offenceType?: string | null;
  currentPhase?: number;
  evidenceSummary?: string | null;
  timelineSummary?: string | null;
  caseNavLabel?: string | null;
  evalCasesCount: number;
  allCasesCount: number;
  chatMessages: Array<{ role: "user" | "assistant"; content: string }>;
  evalRows: DefencePlanEvalRowBundle[];
  evalSweepMode: "manual" | "golden_10" | null;
  evalProgress: {
    done: number;
    total: number;
    questionIndex?: number;
    questionTotal?: number;
    caseIndex?: number;
    caseTotal?: number;
  };
  /** Request headers the bulk runner sends to defence-plan-chat (for parity debugging). */
  bulkEvalRequestHeaders: Record<string, string>;
  bulkEvalFetchTimeoutMs: number;
};

/**
 * One JSON object with everything safe and useful for fixing Defence Plan / golden sweep issues.
 * No API keys, no Clerk/Supabase session payloads.
 */
export function buildDefencePlanDebugBundleV1(input: BuildDefencePlanDebugBundleInput): Record<string, unknown> {
  const browser = collectBrowserContext();
  const localStorage = collectLocalStorageForDebugBundle();
  const { plan, plan_json_truncated, plan_json_overflow } = serializePlan(input.plan);

  const ev = truncate(input.evidenceSummary ?? "", MAX_CONTEXT_CHARS);
  const tl = truncate(input.timelineSummary ?? "", MAX_CONTEXT_CHARS);

  const chat = input.chatMessages.map((m) => {
    const t = truncate(m.content, MAX_CHAT_MESSAGE_CHARS);
    return { role: m.role, content: t.text, content_truncated: t.truncated };
  });

  const questionsOrdered =
    input.evalRows.length > 0
      ? [...new Map(input.evalRows.map((r) => [r.questionNo, r.question] as const)).entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, q]) => q)
      : [];

  const aggregateStats =
    input.evalRows.length > 0
      ? buildEvalSummaryStats(
          input.evalRows.map((r) => ({
            ok: r.ok,
            weak: r.weak,
            answer: r.answer || r.error || "",
            duration_ms: r.duration_ms,
            route_tag: r.route_tag,
          })),
          questionsOrdered
        )
      : null;

  const weak_row_flags = input.evalRows.map((r) => ({
    case_id: r.caseId,
    question_no: r.questionNo,
    weak_flag: r.weak,
    weak_heuristic: isEvalWeakAnswer(r.answer || r.error || "", { route_tag: r.route_tag }),
  }));

  const bulkEvalAugmented =
    input.evalRows.length > 0
      ? bulkEvalBuildAugmentedRows(
          input.evalRows.map((r) => ({
            caseId: r.caseId,
            questionNo: r.questionNo,
            answer: r.answer,
            error: r.error,
            ok: r.ok,
            http_status: r.http_status,
            weak: r.weak,
            route_tag: r.route_tag,
            eval_meta: r.eval_meta ?? null,
          })),
          input.evalSweepMode
        )
      : null;

  const weak_row_flags_ui = bulkEvalAugmented
    ? bulkEvalAugmented.rows_augmented.map((r) => ({
        case_id: r.caseId,
        question_no: r.questionNo,
        weak_flag: r.weak,
        weak_heuristic: isEvalWeakAnswer(r.answer || r.error || "", { route_tag: r.route_tag }),
        final_quality: r.final_quality,
        final_issue: r.final_issue,
        final_is_not_pass: r.final_quality !== "pass",
      }))
    : weak_row_flags;

  const sweepObservability =
    input.evalRows.length > 0
      ? (() => {
          const text = (r: DefencePlanEvalRowBundle) => r.answer || r.error || "";
          const forCollapse = input.evalRows.map((r) => ({
            question_no: r.questionNo,
            answer: text(r),
            route_tag: r.route_tag,
            eval_meta: r.eval_meta ?? null,
          }));
          const normalizedForDrift = input.evalRows.map((r) =>
            normalizeSweepRow({
              case_id: r.caseId,
              case_title: r.caseTitle,
              question_no: r.questionNo,
              question: r.question,
              answer: text(r),
              weak: r.weak,
              http_status: r.http_status,
              duration_ms: r.duration_ms,
              route_tag: r.route_tag,
              ok: r.ok,
              eval_meta: r.eval_meta ?? null,
            })
          );
          return {
            systemic_collapse_warnings: buildSystemicCollapseWarnings(forCollapse),
            semantic_collapse_by_question: sweepSemanticHints(forCollapse),
            golden_route_drift_warnings: goldenSweepRouteDriftWarnings(normalizedForDrift),
          };
        })()
      : null;

  return {
    kind: "casebrain_defence_plan_debug_bundle",
    schema_version: DEBUG_BUNDLE_SCHEMA_VERSION,
    generated_note:
      "Attach this single JSON when reporting bugs. It excludes secrets; auth keys in localStorage are omitted.",

    browser,
    build_fingerprint: publicBuildFingerprint(),

    case: {
      case_id: input.caseId,
      offence_type: input.offenceType ?? null,
      strategy_phase_ui: input.currentPhase ?? null,
      case_nav_label: input.caseNavLabel ?? null,
      eval_cases_list_count: input.evalCasesCount,
      all_cases_list_count: input.allCasesCount,
    },

    context_sent_to_chat: {
      evidence_summary: ev.text,
      evidence_summary_truncated: ev.truncated,
      timeline_summary: tl.text,
      timeline_summary_truncated: tl.truncated,
    },

    committed_strategy_plan: plan,
    committed_strategy_plan_json_truncated: plan_json_truncated,
    ...(plan_json_overflow ? { committed_strategy_plan_json_overflow: plan_json_overflow } : {}),

    defence_plan_chat: {
      message_count: chat.length,
      messages: chat,
    },

    golden_sweep_canonical_questions: [...GOLDEN_SWEEP_QUESTIONS],
    golden_sweep_regression_meta: buildGoldenSweepRegressionMeta(),

    /** Same heuristics as `/eval` Sweep review (fingerprints, no embeddings). Omitted when no eval rows. */
    ...(sweepObservability ? { sweep_observability: sweepObservability } : {}),

    interactive_chat_client: {
      post_path: `/api/criminal/${input.caseId}/defence-plan-chat`,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      /** Keep in sync with `DefencePlanBox` `handleSendChat` body caps. */
      body_field_max_chars: { plan_summary: 1200, evidence_summary: 1200, timeline_summary: 500 },
    },

    bulk_eval_runner: {
      fetch_timeout_ms: input.bulkEvalFetchTimeoutMs,
      request_headers: input.bulkEvalRequestHeaders,
      sweep_mode: input.evalSweepMode,
      progress: input.evalProgress,
      row_count: input.evalRows.length,
      summary_stats:
        aggregateStats && questionsOrdered.length
          ? {
              ...aggregateStats,
              per_question: summarizeEvalRowsByQuestion(input.evalRows, questionsOrdered),
              ...(bulkEvalAugmented
                ? {
                    final_quality_summary: {
                      ...bulkEvalAugmented.final_summary,
                      main_issue: bulkEvalAugmented.final_summary.mainIssue,
                    },
                  }
                : {}),
            }
          : null,
      weak_row_checks: weak_row_flags_ui,
      rows: bulkEvalAugmented ? bulkEvalAugmented.rows_augmented : input.evalRows,
    },

    local_storage: localStorage,
  };
}

export function downloadJsonObject(filenameBase: string, obj: Record<string, unknown>) {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
