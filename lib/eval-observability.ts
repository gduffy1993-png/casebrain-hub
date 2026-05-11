/**
 * Eval observability: cheap grounding metrics, answer fingerprints, sweep-level collapse hints.
 * No embeddings — heuristics only. Safe to import from client or server.
 */

const MAX_HAY_FOR_METRICS = 200_000;

const EX_SOURCE = String.raw`\bEX-[A-Z0-9]+(?:-[A-Z0-9]+)+\b`;
const MG_SOURCE = String.raw`\bMG\s*\d+\b`;
const NS_SOURCE = String.raw`\bNS-CPS-\d{4}-\d{4}\b`;

function countPattern(source: string, text: string): number {
  return (text.match(new RegExp(source, "gi")) ?? []).length;
}

function collectBundleTokens(hay: string): Set<string> {
  const tokens = new Set<string>();
  const slice = hay.slice(0, MAX_HAY_FOR_METRICS);
  for (const source of [EX_SOURCE, MG_SOURCE, NS_SOURCE]) {
    const re = new RegExp(source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(slice)) !== null) {
      tokens.add(m[0].toLowerCase());
    }
  }
  return tokens;
}

export type GroundingMetrics = {
  exhibit_ref_count: number;
  mg_ref_count: number;
  ns_cps_count: number;
  bundle_key_overlap: number;
  flag_cctv: boolean;
  flag_cad: boolean;
  flag_999: boolean;
  flag_interview: boolean;
  grounding_density: number;
};

export function computeGroundingMetrics(answer: string, bundleHaystack: string): GroundingMetrics {
  const exhibit_ref_count = countPattern(EX_SOURCE, answer);
  const mg_ref_count = countPattern(MG_SOURCE, answer);
  const ns_cps_count = countPattern(NS_SOURCE, answer);
  const al = answer.toLowerCase();
  const flag_cctv = /\bcctv\b/i.test(answer);
  const flag_cad = /\bcad\b/i.test(answer);
  const flag_999 = /\b999\b/i.test(answer);
  const flag_interview = /interview/i.test(answer);

  const tokens = collectBundleTokens(bundleHaystack);
  let bundle_key_overlap = 0;
  for (const t of tokens) {
    if (t.length >= 5 && al.includes(t)) bundle_key_overlap += 1;
  }

  const density = Math.min(
    1,
    exhibit_ref_count * 0.12 +
      mg_ref_count * 0.08 +
      ns_cps_count * 0.06 +
      bundle_key_overlap * 0.035 +
      (flag_cctv ? 0.05 : 0) +
      (flag_cad ? 0.05 : 0) +
      (flag_999 ? 0.05 : 0) +
      (flag_interview ? 0.05 : 0)
  );

  return {
    exhibit_ref_count,
    mg_ref_count,
    ns_cps_count,
    bundle_key_overlap,
    flag_cctv,
    flag_cad,
    flag_999,
    flag_interview,
    grounding_density: Math.round(density * 1000) / 1000,
  };
}

export function fingerprintAnswer(text: string): string {
  const n = text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 4000);
  let h = 5381;
  for (let i = 0; i < n.length; i++) h = ((h << 5) + h) ^ n.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export type ReplyFinalization =
  | "three_line"
  | "capped_full"
  | "forced_ungrounded_template"
  | "deterministic"
  | "lightweight_fallback_template";

export type EvalMetaV1 = {
  v: 1;
  route_trace: {
    selected_route: string;
    question_mode: string;
    bundle_chars: number;
    bundle_haystack_sample_chars: number;
    grounded_gate_passed: boolean;
    fallback_reason?: string;
    reply_finalization?: ReplyFinalization;
  };
  grounding_metrics: GroundingMetrics;
  answer_fingerprint: string;
};

export function buildEvalMetaV1(opts: {
  selected_route: string;
  question_mode: string;
  reply: string;
  bundle_haystack: string;
  bundle_chars_full: number;
  grounded_gate_passed: boolean;
  fallback_reason?: string;
  reply_finalization?: ReplyFinalization;
}): EvalMetaV1 {
  const gm = computeGroundingMetrics(opts.reply, opts.bundle_haystack);
  return {
    v: 1,
    route_trace: {
      selected_route: opts.selected_route,
      question_mode: opts.question_mode,
      bundle_chars: opts.bundle_chars_full,
      bundle_haystack_sample_chars: Math.min(opts.bundle_haystack.length, MAX_HAY_FOR_METRICS),
      grounded_gate_passed: opts.grounded_gate_passed,
      fallback_reason: opts.fallback_reason,
      reply_finalization: opts.reply_finalization,
    },
    grounding_metrics: gm,
    answer_fingerprint: fingerprintAnswer(opts.reply),
  };
}

export type SemanticCollapseRow = {
  question_no: number;
  unique_fingerprints: number;
  max_cluster_size: number;
  collapse_warning: boolean;
};

/** Per-question duplicate answer clusters from fingerprints (no embeddings). */
export function semanticCollapseByQuestion(
  rows: { question_no: number; answer_fingerprint: string }[]
): SemanticCollapseRow[] {
  const byQ = new Map<number, Map<string, number>>();
  for (const r of rows) {
    const m = byQ.get(r.question_no) ?? new Map();
    const fp = r.answer_fingerprint;
    m.set(fp, (m.get(fp) ?? 0) + 1);
    byQ.set(r.question_no, m);
  }
  const out: SemanticCollapseRow[] = [];
  for (const [question_no, map] of byQ) {
    let maxClusterSize = 0;
    for (const v of map.values()) maxClusterSize = Math.max(maxClusterSize, v);
    const unique = map.size;
    out.push({
      question_no,
      unique_fingerprints: unique,
      max_cluster_size: maxClusterSize,
      collapse_warning: maxClusterSize >= 3 && unique <= 2,
    });
  }
  return out.sort((a, b) => a.question_no - b.question_no);
}

export function sweepSemanticHints(
  rows: { question_no: number; answer: string; eval_meta?: EvalMetaV1 | null }[]
): SemanticCollapseRow[] {
  const prepared = rows.map((r) => ({
    question_no: r.question_no,
    answer_fingerprint: r.eval_meta?.answer_fingerprint ?? fingerprintAnswer(r.answer),
  }));
  return semanticCollapseByQuestion(prepared);
}

export type SystemicWarning = { code: string; detail: string };

/**
 * If many cases share the same fallback fingerprint for the same question, flag possible pipeline collapse.
 */
export function buildSystemicCollapseWarnings(
  rows: { question_no: number; answer: string; route_tag?: string | null; eval_meta?: EvalMetaV1 | null }[]
): SystemicWarning[] {
  const warnings: SystemicWarning[] = [];
  const byQ = new Map<number, Map<string, number>>();
  for (const r of rows) {
    const fp = r.eval_meta?.answer_fingerprint ?? fingerprintAnswer(r.answer);
    const m = byQ.get(r.question_no) ?? new Map();
    m.set(fp, (m.get(fp) ?? 0) + 1);
    byQ.set(r.question_no, m);
  }
  for (const [qn, map] of byQ) {
    let bestFp = "";
    let bestN = 0;
    for (const [fp, n] of map) {
      if (n > bestN) {
        bestN = n;
        bestFp = fp;
      }
    }
    if (bestN >= 4 && map.size <= 2) {
      warnings.push({
        code: "semantic_collapse",
        detail: `Q${qn}: ${bestN} rows share answer fingerprint ${bestFp.slice(0, 12)}… (${map.size} distinct answers)`,
      });
    }
  }
  return warnings;
}
