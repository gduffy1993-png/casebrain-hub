/**
 * Battleboard Sweep — Phase 1 harness (separate from Golden Sweep).
 * Scores Strategy Battleboard API output only; does not call defence-plan-chat.
 */

import type { BattleboardOutput, BattleboardRoute, BattleboardRouteType } from "@/lib/criminal/strategy-battleboard";
import { EVAL_PACK_IDS, type EvalPackId } from "@/lib/eval-packs";

export type BattleboardSweepQuality = "pass" | "weak" | "fail";

export type BattleboardSweepRow = {
  case_id: string;
  case_title: string;
  eval_pack_id: string | null;
  eval_pack_name: string | null;
  eval_case_no: number | null;
  primary_route_title: string | null;
  primary_route_type: string | null;
  primary_route_status: string | null;
  route_count: number;
  has_primary_route: boolean;
  has_evidence_anchors: boolean;
  has_why_it_helps: boolean;
  has_what_hurts_us: boolean;
  has_collapse_risk: boolean;
  has_next_move: boolean;
  has_safe_hearing_line: boolean;
  forbidden_wording_detected: boolean;
  boilerplate_detected: boolean;
  default_position_overtrusted: boolean;
  invented_anchor_risk: boolean;
  provisional_warning_present: boolean;
  thin_bundle_handled: boolean;
  quality: BattleboardSweepQuality;
  issue: string;
  duration_ms: number;
};

export type BattleboardSweepSummary = {
  total: number;
  pass: number;
  weak: number;
  fail: number;
  avg_duration_ms: number;
  by_pack: Record<string, { total: number; pass: number; weak: number; fail: number }>;
  issue_groups: Array<{ issue: string; count: number }>;
  rows: BattleboardSweepRow[];
};

export type BattleboardPackSweepResult = {
  pack_id: EvalPackId;
  pack_name: string;
  summary: BattleboardSweepSummary;
  rows: BattleboardSweepRow[];
};

export type BattleboardPerPackSummaryExport = {
  pack_id: string;
  pack_name: string | null;
  total: number;
  pass: number;
  weak: number;
  fail: number;
  avg_duration_ms: number;
  issue_groups: Array<{ issue: string; count: number }>;
};

export type BattleboardSweepFullExport = {
  generated_at: string;
  selected_packs: string[];
  run_mode: "combined" | "by_pack";
  partial: boolean;
  total_cases: number;
  total_pass: number;
  total_weak: number;
  total_fail: number;
  avg_duration_ms: number;
  per_pack_summary: BattleboardPerPackSummaryExport[];
  rows: BattleboardSweepRow[];
};

export type BattleboardPerPackResultsExport = {
  generated_at: string;
  selected_packs: string[];
  partial: boolean;
  per_pack_results: Array<{
    pack_id: string;
    pack_name: string | null;
    summary: BattleboardPerPackSummaryExport;
    rows: BattleboardSweepRow[];
  }>;
};

const FORBIDDEN_WORDING_RES: RegExp[] = [
  /\bthis\s+wins\b/i,
  /\bCrown\s+will\s+lose\b/i,
  /\bproves\s+innocence\b/i,
  /\bguaranteed\b/i,
  /\bdefinitely\s+defeats\b/i,
  /\bwill\s+be\s+acquitted\b/i,
  /\bcase\s+collapses\s+completely\b/i,
  /\bwins\s+the\s+case\b/i,
  /\bacquittal\s+is\s+certain\b/i,
];

const BOILERPLATE_RES: RegExp[] = [
  /fictional\s+training\s+data/i,
  /\btest\s+data\b/i,
  /not\s+a\s+real\s+disclosure\s+bundle/i,
  /generated\s+test\s+bundle/i,
  /controlled\s+fictional/i,
  /fictional\s+extract/i,
  /not\s+legal\s+advice\s+disclaimer\s+from\s+source\s+PDF/i,
  /not\s+legal\s+advice/i,
  /for\s+training\s+(?:and\s+evaluation|purposes?)\s+only/i,
];

const CONDITIONAL_MARKERS =
  /\b(outstanding|not\s+served|awaiting|missing|provisional|conditional|if\s+proved|may\s+assist|needs?\s+solicitor\s+review|do\s+not\s+overstate|source\s+material|record\s+instructions|not\s+safely\s+recorded)\b/i;

const STRONG_ANCHOR_RE =
  /\b(MG6|MG11|MG5|CCTV|CAD|999|BWV|EX-[\w\d-]+|interview|PACE|disclosure|continuity|witness|unused\s+material)\b/i;

const GENERIC_MOVE_RE =
  /\b(review\s+(the\s+)?(file|bundle|disclosure)|check\s+disclosure|consider\s+position)\b/i;

const ROUTE_TYPE_KEYWORDS: Record<
  BattleboardRouteType,
  { patterns: RegExp[]; label: string }
> = {
  disclosure: {
    label: "disclosure/source material",
    patterns: [/disclosure|outstanding|missing|source\s+material|mg6|chase|not\s+served/i],
  },
  timeline: {
    label: "timing/CCTV/CAD/999",
    patterns: [/timing|sequence|cctv|cad|999|dispatch|footage|time\s+line/i],
  },
  interview: {
    label: "interview/account",
    patterns: [/interview|no\s+comment|account|pace|caution|prepared\s+statement/i],
  },
  identity: {
    label: "ID/CCTV/witness",
    patterns: [/identification|identity|witness|cctv|id\s+parade|recognition/i],
  },
  continuity: {
    label: "continuity/provenance",
    patterns: [/continuity|provenance|chain|master\s+file|source\s+file/i],
  },
  intent: {
    label: "intent/mens rea",
    patterns: [/intent|mens\s+rea|reckless|deliberate/i],
  },
  causation: {
    label: "causation/mechanism",
    patterns: [/causation|mechanism|injury|medical|forensic/i],
  },
  mitigation: {
    label: "mitigation/sentencing",
    patterns: [/mitigat|sentenc|plea|credit|remorse|reduced/i],
  },
  unknown: { label: "route basis", patterns: [/./] },
};

const MITIGATION_OK_SIGNAL =
  /\b(admission|guilty\s+plea|sentenc|mitigat|bad\s+facts|weak\s+fight|credit|basis\s+of\s+plea|accepts?\s+elements)\b/i;

export type BattleboardSweepScoreInput = {
  case_id: string;
  case_title: string;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  eval_case_no?: number | null;
  battleboard: BattleboardOutput | null;
  duration_ms: number;
  fetch_error?: string | null;
};

function packSortIndex(packId: string | null): number {
  if (!packId) return EVAL_PACK_IDS.length + 1;
  const idx = EVAL_PACK_IDS.indexOf(packId as EvalPackId);
  return idx >= 0 ? idx : EVAL_PACK_IDS.length;
}

/** Stable export order: pack A→X, eval_case_no ascending, then title. */
export function sortBattleboardSweepRows(rows: BattleboardSweepRow[]): BattleboardSweepRow[] {
  return [...rows].sort((a, b) => {
    const pi = packSortIndex(a.eval_pack_id) - packSortIndex(b.eval_pack_id);
    if (pi !== 0) return pi;
    const na =
      typeof a.eval_case_no === "number" && Number.isFinite(a.eval_case_no) ? a.eval_case_no : 99999;
    const nb =
      typeof b.eval_case_no === "number" && Number.isFinite(b.eval_case_no) ? b.eval_case_no : 99999;
    if (na !== nb) return na - nb;
    const t = a.case_title.localeCompare(b.case_title, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    return t !== 0 ? t : a.case_id.localeCompare(b.case_id);
  });
}

function compact(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function collectBattleboardText(board: BattleboardOutput): string {
  const parts: string[] = [
    board.solicitor_safe_summary ?? "",
    board.position_notice ?? "",
    ...(board.global_collapse_risks ?? []),
    ...(board.urgent_next_moves ?? []),
  ];
  for (const r of board.routes ?? []) {
    parts.push(
      r.title,
      r.hearing_line,
      r.safety_note,
      ...(r.why_it_helps ?? []),
      ...(r.what_hurts_us ?? []),
      ...(r.evidence_anchors ?? []),
      ...(r.collapse_risks ?? []),
      ...(r.next_moves ?? []),
    );
  }
  return parts.filter(Boolean).join("\n");
}

function collectAnchorCorpus(board: BattleboardOutput): string {
  const parts: string[] = [];
  for (const r of board.routes ?? []) {
    parts.push(...(r.evidence_anchors ?? []));
  }
  return parts.join(" ").toUpperCase();
}

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

function detectForbiddenWording(text: string): boolean {
  return matchAny(text, FORBIDDEN_WORDING_RES);
}

function detectBoilerplate(text: string): boolean {
  return matchAny(text, BOILERPLATE_RES);
}

function extractExRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const m of text.matchAll(/\b(EX-[\w\d-]+)\b/gi)) {
    refs.add(m[1]!.toUpperCase());
  }
  return [...refs];
}

function detectInventedAnchorRisk(board: BattleboardOutput): boolean {
  const full = collectBattleboardText(board);
  const corpus = collectAnchorCorpus(board).toUpperCase();
  const refs = extractExRefs(full);
  if (!refs.length) return false;
  return refs.some((ref) => !corpus.includes(ref));
}

function detectProvisionalWarning(board: BattleboardOutput): boolean {
  const trust = board.position_trust;
  if (trust === "recorded" || trust === "interview_from_file") return true;
  const notice = board.position_notice ?? "";
  const summary = board.solicitor_safe_summary ?? "";
  const combined = `${notice}\n${summary}`;
  return CONDITIONAL_MARKERS.test(combined) || /not\s+safely\s+recorded|record\s+instructions/i.test(combined);
}

function detectDefaultPositionOvertrusted(board: BattleboardOutput): boolean {
  const trust = board.position_trust;
  if (trust === "recorded" || trust === "interview_from_file") return false;

  const text = collectBattleboardText(board);
  const hasDenial =
    /\b(act\s+denial|denies?\s+(the\s+)?(act|offence|allegation|involvement))\b/i.test(text);
  if (!hasDenial) return false;

  if (CONDITIONAL_MARKERS.test(text) && detectProvisionalWarning(board)) return false;
  return true;
}

function detectThinBundleHandled(board: BattleboardOutput): boolean {
  if (board.overall_status !== "thin_bundle") return true;
  const text = collectBattleboardText(board);
  return (
    /\b(thin|provisional|solicitor\s+review|do\s+not\s+overstate|source\s+material)\b/i.test(text) ||
    (board.routes?.length ?? 0) > 0
  );
}

function routeTypeQualityWeak(board: BattleboardOutput, primary: BattleboardRoute): string | null {
  const routeText = [
    primary.title,
    ...primary.why_it_helps,
    ...primary.evidence_anchors,
    ...primary.next_moves,
    primary.hearing_line,
  ].join(" ");

  const spec = ROUTE_TYPE_KEYWORDS[primary.route_type];
  if (spec && primary.route_type !== "unknown" && !matchAny(routeText, spec.patterns)) {
    return `Primary ${primary.route_type} route missing ${spec.label} wording`;
  }

  if (primary.route_type === "mitigation") {
    const corpus = collectBattleboardText(board);
    if (!MITIGATION_OK_SIGNAL.test(corpus)) {
      return "Mitigation primary without admission/sentencing/weak-fight signals";
    }
  }

  return null;
}

function isGenericRoute(primary: BattleboardRoute): boolean {
  const anchors = primary.evidence_anchors ?? [];
  const strongAnchors = anchors.filter((a) => STRONG_ANCHOR_RE.test(a));
  if (anchors.length > 0 && strongAnchors.length === 0) return true;

  const helps = primary.why_it_helps ?? [];
  if (helps.length > 0 && helps.every((h) => compact(h).length < 36)) return true;

  const moves = [...(primary.next_moves ?? [])];
  if (moves.length >= 2 && moves.filter((m) => GENERIC_MOVE_RE.test(m)).length >= 2) return true;

  return false;
}

function collapseDetailWeak(board: BattleboardOutput, primary: BattleboardRoute): boolean {
  const risks = [...(primary.collapse_risks ?? []), ...(board.global_collapse_risks ?? [])].filter(
    Boolean,
  );
  if (risks.length === 0) return true;
  if (risks.length === 1 && compact(risks[0]!).length < 28) return true;
  const unique = new Set(risks.map((r) => compact(r).toLowerCase()));
  return unique.size < risks.length && risks.length <= 2;
}

function scoreRoutePresence(board: BattleboardOutput | null) {
  const primary = board?.primary_route;
  const routes = board?.routes ?? [];
  return {
    has_primary_route: Boolean(primary),
    has_evidence_anchors: Boolean(primary?.evidence_anchors?.some((a) => compact(a).length > 0)),
    has_why_it_helps: Boolean(primary?.why_it_helps?.some((a) => compact(a).length > 0)),
    has_what_hurts_us: Boolean(primary?.what_hurts_us?.some((a) => compact(a).length > 0)),
    has_collapse_risk: Boolean(
      primary?.collapse_risks?.some((a) => compact(a).length > 0) ||
        board?.global_collapse_risks?.some((a) => compact(a).length > 0),
    ),
    has_next_move: Boolean(
      primary?.next_moves?.some((a) => compact(a).length > 0) ||
        board?.urgent_next_moves?.some((a) => compact(a).length > 0),
    ),
    has_safe_hearing_line: Boolean(primary?.hearing_line && compact(primary.hearing_line).length >= 12),
    route_count: routes.length,
    primary_route_title: primary?.title ?? null,
    primary_route_type: primary?.route_type ?? null,
    primary_route_status: primary?.status ?? null,
  };
}

/** Score one Battleboard API payload for sweep reporting. */
export function scoreBattleboardOutput(input: BattleboardSweepScoreInput): BattleboardSweepRow {
  const {
    case_id,
    case_title,
    eval_pack_id = null,
    eval_pack_name = null,
    eval_case_no = null,
    battleboard,
    duration_ms,
    fetch_error,
  } = input;

  const caseNo =
    typeof eval_case_no === "number" && Number.isFinite(eval_case_no) ? eval_case_no : null;

  const presence = scoreRoutePresence(battleboard);

  if (fetch_error || !battleboard) {
    return {
      case_id,
      case_title,
      eval_pack_id: eval_pack_id ?? null,
      eval_pack_name: eval_pack_name ?? null,
      eval_case_no: caseNo,
      ...presence,
      forbidden_wording_detected: false,
      boilerplate_detected: false,
      default_position_overtrusted: false,
      invented_anchor_risk: false,
      provisional_warning_present: false,
      thin_bundle_handled: false,
      quality: "fail",
      issue: fetch_error ?? "No battleboard returned",
      duration_ms,
    };
  }

  const text = collectBattleboardText(battleboard);
  const forbidden_wording_detected = detectForbiddenWording(text);
  const boilerplate_detected = detectBoilerplate(text);
  const default_position_overtrusted = detectDefaultPositionOvertrusted(battleboard);
  const invented_anchor_risk = detectInventedAnchorRisk(battleboard);
  const provisional_warning_present = detectProvisionalWarning(battleboard);
  const thin_bundle_handled = detectThinBundleHandled(battleboard);

  const failIssues: string[] = [];
  const weakIssues: string[] = [];

  if (forbidden_wording_detected) failIssues.push("Forbidden outcome wording");
  if (boilerplate_detected) failIssues.push("Fictional/test boilerplate");
  if (default_position_overtrusted) failIssues.push("Default Act denial overtrusted");
  if (invented_anchor_risk) failIssues.push("Invented EX-* anchor risk");

  const usableMaterial =
    battleboard.overall_status === "usable" ||
    battleboard.overall_status === "needs_review" ||
    (battleboard.routes?.length ?? 0) > 0;

  if (!presence.has_primary_route && usableMaterial) {
    failIssues.push("No primary route despite usable file material");
  }

  if (!presence.has_primary_route && battleboard.overall_status === "thin_bundle" && !thin_bundle_handled) {
    failIssues.push("Thin bundle not handled safely");
  }

  if (!presence.has_evidence_anchors && presence.has_primary_route) {
    weakIssues.push("Missing evidence anchors on primary route");
  }
  if (!presence.has_why_it_helps) weakIssues.push("Missing why_it_helps");
  if (!presence.has_what_hurts_us) weakIssues.push("Missing what_hurts_us");
  if (!presence.has_collapse_risk) weakIssues.push("Missing collapse risks");
  if (!presence.has_next_move) weakIssues.push("Missing next moves");
  if (!presence.has_safe_hearing_line) weakIssues.push("Missing safe hearing line");

  if (
    (battleboard.position_trust === "provisional" || battleboard.position_trust === "not_recorded") &&
    !provisional_warning_present
  ) {
    weakIssues.push("No clear position warning where position is unknown");
  }

  if (battleboard.overall_status === "thin_bundle" && !thin_bundle_handled) {
    weakIssues.push("Thin bundle wording could be clearer");
  }

  const primary = battleboard.primary_route;
  if (primary) {
    const routeWeak = routeTypeQualityWeak(battleboard, primary);
    if (routeWeak) weakIssues.push(routeWeak);
    if (isGenericRoute(primary)) weakIssues.push("Primary route too generic");
    if (collapseDetailWeak(battleboard, primary)) {
      weakIssues.push("Insufficient collapse risk detail");
    }
  }

  if (!CONDITIONAL_MARKERS.test(text) && battleboard.position_trust !== "recorded") {
    weakIssues.push("Route wording may not be conditional enough");
  }

  let quality: BattleboardSweepQuality = "pass";
  let issue = "";

  if (failIssues.length > 0) {
    quality = "fail";
    issue = failIssues.join("; ");
  } else if (weakIssues.length > 0) {
    quality = "weak";
    issue = weakIssues.join("; ");
  } else {
    issue = "OK";
  }

  return {
    case_id,
    case_title,
    eval_pack_id: eval_pack_id ?? null,
    eval_pack_name: eval_pack_name ?? null,
    eval_case_no: caseNo,
    ...presence,
    forbidden_wording_detected,
    boilerplate_detected,
    default_position_overtrusted,
    invented_anchor_risk,
    provisional_warning_present,
    thin_bundle_handled,
    quality,
    issue,
    duration_ms,
  };
}

export function summarizeBattleboardSweep(rows: BattleboardSweepRow[]): BattleboardSweepSummary {
  const pass = rows.filter((r) => r.quality === "pass").length;
  const weak = rows.filter((r) => r.quality === "weak").length;
  const fail = rows.filter((r) => r.quality === "fail").length;
  const total = rows.length;
  const avg_duration_ms =
    total > 0 ? Math.round(rows.reduce((a, r) => a + r.duration_ms, 0) / total) : 0;

  const by_pack: BattleboardSweepSummary["by_pack"] = {};
  const issueCounts = new Map<string, number>();

  for (const row of rows) {
    const pack = row.eval_pack_id ?? "untagged";
    if (!by_pack[pack]) by_pack[pack] = { total: 0, pass: 0, weak: 0, fail: 0 };
    by_pack[pack].total += 1;
    by_pack[pack][row.quality] += 1;

    if (row.quality !== "pass" && row.issue) {
      for (const part of row.issue.split(";").map((s) => s.trim()).filter(Boolean)) {
        issueCounts.set(part, (issueCounts.get(part) ?? 0) + 1);
      }
    }
  }

  const issue_groups = [...issueCounts.entries()]
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    pass,
    weak,
    fail,
    avg_duration_ms,
    by_pack,
    issue_groups,
    rows,
  };
}

function csvEscape(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Weak/fail rows only, ordered for review. */
export function battleboardSweepWeakFailRowsToCsv(rows: BattleboardSweepRow[]): string {
  const header = [
    "eval_pack_id",
    "eval_case_no",
    "case_title",
    "quality",
    "issue",
    "primary_route_title",
    "primary_route_type",
    "primary_route_status",
    "route_count",
    "has_evidence_anchors",
    "has_collapse_risk",
    "has_next_move",
    "has_safe_hearing_line",
    "forbidden_wording_detected",
    "boilerplate_detected",
    "default_position_overtrusted",
    "invented_anchor_risk",
    "duration_ms",
    "case_id",
  ];
  const sorted = sortBattleboardSweepRows(
    rows.filter((r) => r.quality === "weak" || r.quality === "fail"),
  );
  const lines = [header.join(",")];
  for (const r of sorted) {
    lines.push(
      [
        r.eval_pack_id,
        r.eval_case_no,
        r.case_title,
        r.quality,
        r.issue,
        r.primary_route_title,
        r.primary_route_type,
        r.primary_route_status,
        r.route_count,
        r.has_evidence_anchors,
        r.has_collapse_risk,
        r.has_next_move,
        r.has_safe_hearing_line,
        r.forbidden_wording_detected,
        r.boilerplate_detected,
        r.default_position_overtrusted,
        r.invented_anchor_risk,
        r.duration_ms,
        r.case_id,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

/** @deprecated Use battleboardSweepWeakFailRowsToCsv */
export function battleboardSweepRowsToCsv(rows: BattleboardSweepRow[]): string {
  return battleboardSweepWeakFailRowsToCsv(rows);
}

export function buildPerPackSummariesOrdered(
  rows: BattleboardSweepRow[],
): BattleboardPerPackSummaryExport[] {
  const out: BattleboardPerPackSummaryExport[] = [];
  for (const packId of EVAL_PACK_IDS) {
    const packRows = rows.filter((r) => r.eval_pack_id === packId);
    if (!packRows.length) continue;
    const s = summarizeBattleboardSweep(packRows);
    out.push({
      pack_id: packId,
      pack_name: packRows[0]?.eval_pack_name ?? null,
      total: s.total,
      pass: s.pass,
      weak: s.weak,
      fail: s.fail,
      avg_duration_ms: s.avg_duration_ms,
      issue_groups: s.issue_groups,
    });
  }
  const untagged = rows.filter((r) => !r.eval_pack_id || !EVAL_PACK_IDS.includes(r.eval_pack_id as EvalPackId));
  if (untagged.length) {
    const s = summarizeBattleboardSweep(untagged);
    out.push({
      pack_id: "untagged",
      pack_name: null,
      total: s.total,
      pass: s.pass,
      weak: s.weak,
      fail: s.fail,
      avg_duration_ms: s.avg_duration_ms,
      issue_groups: s.issue_groups,
    });
  }
  return out;
}

export function buildBattleboardSweepFullExport(opts: {
  rows: BattleboardSweepRow[];
  selected_packs: string[];
  run_mode: "combined" | "by_pack";
  partial: boolean;
}): BattleboardSweepFullExport {
  const sorted = sortBattleboardSweepRows(opts.rows);
  const summary = summarizeBattleboardSweep(sorted);
  return {
    generated_at: new Date().toISOString(),
    selected_packs: opts.selected_packs,
    run_mode: opts.run_mode,
    partial: opts.partial,
    total_cases: summary.total,
    total_pass: summary.pass,
    total_weak: summary.weak,
    total_fail: summary.fail,
    avg_duration_ms: summary.avg_duration_ms,
    per_pack_summary: buildPerPackSummariesOrdered(sorted),
    rows: sorted,
  };
}

export function buildBattleboardPerPackResultsExport(opts: {
  packResults: BattleboardPackSweepResult[];
  selected_packs: string[];
  partial: boolean;
}): BattleboardPerPackResultsExport {
  const per_pack_results = opts.packResults.map((p) => ({
    pack_id: p.pack_id,
    pack_name: p.pack_name,
    summary: {
      pack_id: p.pack_id,
      pack_name: p.pack_name,
      total: p.summary.total,
      pass: p.summary.pass,
      weak: p.summary.weak,
      fail: p.summary.fail,
      avg_duration_ms: p.summary.avg_duration_ms,
      issue_groups: p.summary.issue_groups,
    },
    rows: sortBattleboardSweepRows(p.rows),
  }));
  return {
    generated_at: new Date().toISOString(),
    selected_packs: opts.selected_packs,
    partial: opts.partial,
    per_pack_results,
  };
}

export function groupRowsByPackOrdered(
  rows: BattleboardSweepRow[],
): BattleboardPackSweepResult[] {
  const out: BattleboardPackSweepResult[] = [];
  for (const packId of EVAL_PACK_IDS) {
    const packRows = sortBattleboardSweepRows(rows.filter((r) => r.eval_pack_id === packId));
    if (!packRows.length) continue;
    out.push({
      pack_id: packId,
      pack_name: packRows[0]?.eval_pack_name ?? packId,
      summary: summarizeBattleboardSweep(packRows),
      rows: packRows,
    });
  }
  return out;
}
