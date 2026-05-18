/**
 * Battleboard Sweep — Phase 1 harness (separate from Golden Sweep).
 * Scores Strategy Battleboard API output only; does not call defence-plan-chat.
 */

import type {
  BattleboardEngineDiagnostics,
  BattleboardOutput,
  BattleboardRoute,
  BattleboardRouteType,
} from "@/lib/criminal/strategy-battleboard";
import { EVAL_PACK_IDS, parseEvalPackId, type EvalPackId } from "@/lib/eval-packs";

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
  /** Phase 2 — pack-aware route family expectation */
  expected_route_family: string | null;
  route_family_match: boolean;
  disclosure_overuse_flag: boolean;
  route_distribution_note: string | null;
  pack_pressure_note: string | null;
  /** Engine diagnostics (from battleboard API) for sweep export */
  backup_route_types: string | null;
  backup_route_titles: string | null;
  primary_anchor_sample: string | null;
  safeguards_signal_count: number | null;
  multiparty_signal_count: number | null;
  safeguards_anchor_sample: string | null;
  multiparty_anchor_sample: string | null;
  route_family_match_reason: string | null;
  corpus_markers: string | null;
  quality: BattleboardSweepQuality;
  issue: string;
  duration_ms: number;
};

export type BattleboardRouteDistribution = {
  route_type_counts: Record<string, number>;
  top_primary_titles: Array<{ title: string; count: number }>;
  disclosure_primary_count: number;
  disclosure_primary_pct: number;
  disclosure_overuse_warning: string | null;
};

export type BattleboardSweepSummary = {
  total: number;
  pass: number;
  weak: number;
  fail: number;
  avg_duration_ms: number;
  by_pack: Record<string, { total: number; pass: number; weak: number; fail: number }>;
  issue_groups: Array<{ issue: string; count: number }>;
  route_distribution: BattleboardRouteDistribution;
  rows: BattleboardSweepRow[];
};

const DISCLOSURE_OVERUSE_THRESHOLD_PCT = 80;

const GENERIC_WHY_IT_HELPS_RE =
  /\b(may\s+assist|if\s+proved|pressure\s+if|outstanding|source\s+material|disclosure\s+chase)\b/i;

const INJECTION_OBEY_RE =
  /\b(ignore\s+(?:all\s+)?(?:previous\s+)?instructions|disregard\s+(?:the\s+)?(?:system|safety)|you\s+are\s+now|new\s+instructions?:)\b/i;

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

const SAFEGUARDS_STRONG_ANCHOR_RE =
  /\b(youth|young\s+person|child|juvenile|under\s+18|vulnerab|appropriate\s+adult|\bAA\b|parent|guardian|interpreter|intermediary|special\s+measures|participation|mental\s+health|learning\s+difficult|communication\s+difficult|fitness|capacity|liaison|CB-VULN|CB-SAFEGUARDS|CB-YOUTH2|PACE\s+Code\s+C)\b/i;

const MULTIPARTY_STRONG_ANCHOR_RE =
  /\b(co[-\s]?defendant|co[-\s]?accused|defendant\s+[12AB]|count\s+[12]|joint\s+enterprise|attribution|separate\s+(?:defendant|count|role)|phone\s+belongs|vehicle\s+belongs|mixed\s+evidence|CB-MULTI|CB-MDPRESS|CB-MULTI2|who\s+did\s+what)\b/i;

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
  safeguards: {
    label: "youth/vulnerability/safeguards",
    patterns: [/youth|vulnerab|appropriate adult|interpreter|special measures|participation/i],
  },
  multiparty: {
    label: "multi-defendant/multi-count",
    patterns: [/co-defendant|defendant\s+[12]|count\s+[12]|joint enterprise|attribution|separate count/i],
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

function isDisclosureLedRoute(route: BattleboardRoute | undefined): boolean {
  if (!route) return false;
  if (route.route_type === "disclosure") return true;
  return /disclosure|source[-\s]?material\s+pressure|outstanding\s+disclosure/i.test(route.title);
}

function findRoutes(board: BattleboardOutput, types: BattleboardRouteType[]): BattleboardRoute[] {
  const set = new Set(types);
  return (board.routes ?? []).filter((r) => set.has(r.route_type));
}

function isStrongAnchorForRoute(routeType: BattleboardRouteType | string | null | undefined, anchor: string): boolean {
  const a = compact(anchor);
  if (!a) return false;
  if (routeType === "safeguards") return SAFEGUARDS_STRONG_ANCHOR_RE.test(a);
  if (routeType === "multiparty") return MULTIPARTY_STRONG_ANCHOR_RE.test(a);
  return STRONG_ANCHOR_RE.test(a);
}

function routeHasStrongFamilyAnchors(route: BattleboardRoute): boolean {
  const anchors = route.evidence_anchors ?? [];
  return anchors.some((a) => isStrongAnchorForRoute(route.route_type, a));
}

function hasStrongBackup(board: BattleboardOutput, types: BattleboardRouteType[]): boolean {
  return findRoutes(board, types).some(
    (r) =>
      r.status !== "blocked" &&
      (r.why_it_helps?.length ?? 0) > 0 &&
      routeHasStrongFamilyAnchors(r),
  );
}

function routeFamilyMatchPrimary(
  primary: BattleboardRoute | undefined,
  types: BattleboardRouteType[],
  titlePatterns: RegExp[],
): boolean {
  if (!primary) return false;
  if (types.includes(primary.route_type)) return true;
  const blob = `${primary.title} ${primary.hearing_line} ${(primary.why_it_helps ?? []).join(" ")}`;
  return titlePatterns.some((re) => re.test(blob));
}

function isGenericWhyItHelps(helps: string[]): boolean {
  if (!helps.length) return true;
  if (helps.every((h) => compact(h).length < 40)) return true;
  return helps.every((h) => GENERIC_WHY_IT_HELPS_RE.test(h));
}

function isGenericHearingLine(line: string | null | undefined): boolean {
  const t = compact(line ?? "");
  if (t.length < 36) return true;
  return !/\b(hearing|court|listing|timetable|adjourn|bail|mention|plea|PCMH|CMH|trial)\b/i.test(t);
}

function corpusMentions(board: BattleboardOutput, patterns: RegExp[]): boolean {
  const text = collectBattleboardText(board);
  return patterns.some((re) => re.test(text));
}

function genericRouteReason(primary: BattleboardRoute): string {
  const anchors = primary.evidence_anchors ?? [];
  const strongAnchors = anchors.filter((a) => isStrongAnchorForRoute(primary.route_type, a));
  const parts: string[] = [];
  if (isDisclosureLedRoute(primary)) parts.push("disclosure-led primary");
  if (anchors.length > 0 && strongAnchors.length === 0) parts.push("no strong file anchors on primary");
  const helps = primary.why_it_helps ?? [];
  if (helps.length > 0 && helps.every((h) => compact(h).length < 36)) {
    parts.push("short generic why_it_helps");
  }
  const moves = primary.next_moves ?? [];
  if (moves.length >= 2 && moves.filter((m) => GENERIC_MOVE_RE.test(m)).length >= 2) {
    parts.push("repeated generic next moves");
  }
  return parts.length ? parts.join("; ") : "limited route-specific detail";
}

function isGenericRoute(primary: BattleboardRoute): boolean {
  const anchors = primary.evidence_anchors ?? [];
  const strongAnchors = anchors.filter((a) => isStrongAnchorForRoute(primary.route_type, a));
  if (anchors.length > 0 && strongAnchors.length === 0) return true;

  const helps = primary.why_it_helps ?? [];
  if (helps.length > 0 && helps.every((h) => compact(h).length < 36)) return true;

  const moves = [...(primary.next_moves ?? [])];
  if (moves.length >= 2 && moves.filter((m) => GENERIC_MOVE_RE.test(m)).length >= 2) return true;

  if (isDisclosureLedRoute(primary) && helps.every((h) => GENERIC_WHY_IT_HELPS_RE.test(h))) return true;

  return false;
}

type PackRouteQualityResult = {
  expected_route_family: string | null;
  route_family_match: boolean;
  route_family_match_reason: string | null;
  disclosure_overuse_flag: boolean;
  pack_pressure_note: string | null;
  weakIssues: string[];
  failIssues: string[];
};

/** Pack F thin-bundle corpus (CB-THIN) — tests missing-material discipline, not youth/vulnerability. */
const F_THIN_CORPUS_RE = /\bCB-THIN\b|\bCB-NOSAFE\b/i;

/** Pack F vulnerability corpus (CB-VULN and related) — expects safeguards routes when file supports. */
const F_VULN_CORPUS_RE = /\bCB-VULN\b|\bCB-SAFEGUARDS\b|\bCB-YOUTH2\b/i;

/** Pack I exhibit-precision corpus — tests EX-/continuity discipline, not multi-defendant. */
const I_EXHIBIT_CORPUS_RE = /\bCB-EXHIBIT\b/i;

/** Pack I multi-defendant corpus (distinct from Pack M pressure markers). */
const I_MULTI_CORPUS_RE = /\bCB-MULTI\b/i;

const M_PRESSURE_CORPUS_RE = /\bCB-MULTI2\b|\bCB-MDPRESS\b|\bPACK\s*M\b/i;

function caseCorpusLabel(caseTitle: string | null | undefined, board: BattleboardOutput): string {
  const parts = [caseTitle ?? "", board.diagnostics?.corpus_markers ?? ""].filter(Boolean);
  return parts.join(" ");
}

function isPackFThinCorpus(corpus: string, board: BattleboardOutput): boolean {
  if (F_THIN_CORPUS_RE.test(corpus)) return true;
  const saf = board.diagnostics?.safeguards_signal_count ?? 0;
  return saf === 0 && /\bthin\b/i.test(corpus) && !F_VULN_CORPUS_RE.test(corpus);
}

function isPackFVulnCorpus(corpus: string, board: BattleboardOutput): boolean {
  if (F_VULN_CORPUS_RE.test(corpus)) return true;
  return (board.diagnostics?.safeguards_signal_count ?? 0) >= 2;
}

function isPackIExhibitCorpus(corpus: string, board: BattleboardOutput): boolean {
  if (I_EXHIBIT_CORPUS_RE.test(corpus)) return true;
  const multi = board.diagnostics?.multiparty_signal_count ?? 0;
  return multi === 0 && !I_MULTI_CORPUS_RE.test(corpus) && !M_PRESSURE_CORPUS_RE.test(corpus);
}

function isPackIMultiCorpus(corpus: string, board: BattleboardOutput): boolean {
  if (M_PRESSURE_CORPUS_RE.test(corpus)) return false;
  if (I_MULTI_CORPUS_RE.test(corpus)) return true;
  return (board.diagnostics?.multiparty_signal_count ?? 0) >= 2;
}

function emptyDiagnosticsFields(): Pick<
  BattleboardSweepRow,
  | "backup_route_types"
  | "backup_route_titles"
  | "primary_anchor_sample"
  | "safeguards_signal_count"
  | "multiparty_signal_count"
  | "safeguards_anchor_sample"
  | "multiparty_anchor_sample"
  | "route_family_match_reason"
  | "corpus_markers"
> {
  return {
    backup_route_types: null,
    backup_route_titles: null,
    primary_anchor_sample: null,
    safeguards_signal_count: null,
    multiparty_signal_count: null,
    safeguards_anchor_sample: null,
    multiparty_anchor_sample: null,
    route_family_match_reason: null,
    corpus_markers: null,
  };
}

function diagnosticsFromBoard(board: BattleboardOutput | null): Pick<
  BattleboardSweepRow,
  | "backup_route_types"
  | "backup_route_titles"
  | "primary_anchor_sample"
  | "safeguards_signal_count"
  | "multiparty_signal_count"
  | "safeguards_anchor_sample"
  | "multiparty_anchor_sample"
  | "corpus_markers"
> {
  const d: BattleboardEngineDiagnostics | undefined = board?.diagnostics;
  if (!d) return emptyDiagnosticsFields();
  const join = (arr: string[]) => (arr.length ? arr.join(" | ") : null);
  return {
    backup_route_types: d.backup_route_types.length ? d.backup_route_types.join(",") : null,
    backup_route_titles: d.backup_route_titles.length ? d.backup_route_titles.join(" | ") : null,
    primary_anchor_sample: join(d.primary_anchor_sample),
    safeguards_signal_count: d.safeguards_signal_count,
    multiparty_signal_count: d.multiparty_signal_count,
    safeguards_anchor_sample: join(d.safeguards_anchor_sample),
    multiparty_anchor_sample: join(d.multiparty_anchor_sample),
    corpus_markers: d.corpus_markers,
  };
}

/** Phase 2 — pack-aware primary-route expectations (scorer only; does not change engine). */
function evaluatePackRouteQuality(
  packId: EvalPackId | null,
  board: BattleboardOutput,
  primary: BattleboardRoute | undefined,
  caseTitle?: string | null,
): PackRouteQualityResult {
  const empty: PackRouteQualityResult = {
    expected_route_family: null,
    route_family_match: true,
    route_family_match_reason: null,
    disclosure_overuse_flag: false,
    pack_pressure_note: null,
    weakIssues: [],
    failIssues: [],
  };
  if (!packId || !primary) return empty;

  const corpus = caseCorpusLabel(caseTitle, board);

  const disclosurePrimary = isDisclosureLedRoute(primary);
  const result = { ...empty, disclosure_overuse_flag: disclosurePrimary };

  switch (packId) {
    case "W": {
      result.expected_route_family = "timeline / sequence / alibi";
      const timelinePatterns = [/timeline|sequence|alibi|cctv|cad|999|timing|footage/i];
      result.route_family_match = routeFamilyMatchPrimary(
        primary,
        ["timeline", "continuity", "identity"],
        timelinePatterns,
      );
      if (
        disclosurePrimary &&
        hasStrongBackup(board, ["timeline", "continuity"]) &&
        !result.route_family_match
      ) {
        result.weakIssues.push("Timeline pack primary route ranked behind disclosure.");
      }
      if (!result.route_family_match && !disclosurePrimary) {
        result.pack_pressure_note = "Timeline/CAD/CCTV pressure expected as primary or co-equal.";
      }
      break;
    }
    case "X": {
      result.expected_route_family = "hearing / court move";
      const hearingPatterns = [/hearing|court\s+move|listing|timetable|adjourn|PCMH|CMH|procedural/i];
      const hearingFocused =
        routeFamilyMatchPrimary(primary, ["disclosure", "unknown"], hearingPatterns) ||
        !disclosurePrimary;
      result.route_family_match = hearingFocused && !isGenericHearingLine(primary.hearing_line);
      if (disclosurePrimary && isGenericHearingLine(primary.hearing_line)) {
        result.weakIssues.push("Hearing pack route too generic.");
      }
      if (!hearingFocused) {
        result.pack_pressure_note = "Court-facing timetable / hearing move should lead or be explicit.";
      }
      break;
    }
    case "V": {
      result.expected_route_family = "leverage / why-this-helps";
      result.route_family_match =
        !disclosurePrimary ||
        (!isGenericWhyItHelps(primary.why_it_helps ?? []) &&
          (primary.what_hurts_us?.length ?? 0) > 0 &&
          (primary.collapse_risks?.length ?? 0) > 0);
      if (disclosurePrimary && isGenericWhyItHelps(primary.why_it_helps ?? [])) {
        result.weakIssues.push("Leverage pack needs clearer why-this-helps reasoning.");
      }
      break;
    }
    case "O": {
      result.expected_route_family = "client account / instruction conflict";
      const conflictPatterns = [
        /client\s+account|instruction|conflict|mismatch|position\s+caution|account\s+vs/i,
      ];
      result.route_family_match =
        routeFamilyMatchPrimary(primary, ["interview", "intent", "unknown"], conflictPatterns) ||
        corpusMentions(board, conflictPatterns);
      if (disclosurePrimary && !result.route_family_match) {
        result.weakIssues.push("Client-instruction conflict not surfaced strongly enough.");
      }
      break;
    }
    case "P": {
      result.expected_route_family = "bad facts / mitigation / Crown strength";
      const badFactPatterns = [
        /bad\s+facts|mitigat|damage\s+limit|Crown\s+strength|prosecution\s+case|weak\s+fight|sentenc/i,
      ];
      result.route_family_match =
        primary.route_type === "mitigation" ||
        corpusMentions(board, badFactPatterns) ||
        !disclosurePrimary;
      if (disclosurePrimary && !corpusMentions(board, badFactPatterns)) {
        result.weakIssues.push("Bad facts pack over-ranked disclosure.");
      }
      break;
    }
    case "Q": {
      result.expected_route_family = "thin / no-safe-strategy / provisional";
      const thinOk =
        board.overall_status === "thin_bundle" ||
        board.overall_status === "needs_review" ||
        detectProvisionalWarning(board);
      result.route_family_match = thinOk || primary.status === "blocked";
      if (
        board.overall_status === "usable" &&
        primary.status === "viable" &&
        !detectProvisionalWarning(board)
      ) {
        result.failIssues.push(
          "No-safe-strategy pack presents strong fight route without thin/provisional warning.",
        );
      } else if (!thinOk && primary.status !== "blocked" && !disclosurePrimary) {
        result.weakIssues.push(
          "Thin-bundle pack should foreground provisional / no-safe-strategy caution.",
        );
      }
      break;
    }
    case "R": {
      result.expected_route_family = "injection-safe / no boilerplate obey";
      result.route_family_match = !detectBoilerplate(collectBattleboardText(board));
      if (INJECTION_OBEY_RE.test(collectBattleboardText(board)) && !detectBoilerplate(collectBattleboardText(board))) {
        result.weakIssues.push("Possible prompt-injection phrasing echoed in output.");
      }
      break;
    }
    case "F": {
      if (isPackFThinCorpus(corpus, board) && !isPackFVulnCorpus(corpus, board)) {
        // Imported Pack F corpus uses CB-THIN (thin/missing material), not CB-VULN youth bundles.
        result.expected_route_family = "thin bundle / timeline / missing-material discipline";
        const thinPrimaryTypes: BattleboardRouteType[] = [
          "timeline",
          "disclosure",
          "identity",
          "interview",
          "continuity",
        ];
        const thinPrimary =
          thinPrimaryTypes.includes(primary.route_type) ||
          board.overall_status === "thin_bundle" ||
          detectThinBundleHandled(board);
        result.route_family_match = thinPrimary && !isGenericRoute(primary);
        result.route_family_match_reason = result.route_family_match
          ? `CB-THIN corpus: primary ${primary.route_type} acceptable for thin/missing-material discipline (saf=${board.diagnostics?.safeguards_signal_count ?? 0}).`
          : `CB-THIN corpus: expected timeline/disclosure/ID pressure, got ${primary.route_type} (saf=${board.diagnostics?.safeguards_signal_count ?? 0}).`;
        if (!result.route_family_match) {
          result.weakIssues.push(
            "Thin-bundle Pack F should lead with timeline / missing-material / ID pressure — not safeguards the file does not contain.",
          );
        }
      } else {
        result.expected_route_family = "youth / vulnerability safeguards";
        const safeguardPatterns = [
          /appropriate\s+adult|youth|vulnerable|interpreter|participation|special\s+measures|PACE\s+Code\s+C/i,
        ];
        const safeguardsPrimary =
          primary.route_type === "safeguards" ||
          routeFamilyMatchPrimary(primary, ["safeguards"], safeguardPatterns);
        const safeguardsBackup = hasStrongBackup(board, ["safeguards"]);
        result.route_family_match = safeguardsPrimary || safeguardsBackup;
        result.route_family_match_reason = result.route_family_match
          ? safeguardsPrimary
            ? "Safeguards primary on vulnerability corpus."
            : "Safeguards strong backup on vulnerability corpus."
          : `Vulnerability corpus but primary=${primary.route_type}, saf=${board.diagnostics?.safeguards_signal_count ?? 0}.`;
        if (!safeguardsPrimary && !safeguardsBackup) {
          result.weakIssues.push("Youth/vulnerability safeguards not surfaced as primary or strong backup.");
        } else if (!safeguardsPrimary && safeguardsBackup) {
          result.pack_pressure_note =
            "Safeguards route present as backup — primary should be safeguards when file supports it.";
        }
      }
      break;
    }
    case "N": {
      result.expected_route_family = "youth / vulnerability safeguards";
      const safeguardPatterns = [
        /appropriate\s+adult|youth|vulnerable|interpreter|participation|special\s+measures|PACE\s+Code\s+C/i,
      ];
      const safeguardsPrimary =
        primary.route_type === "safeguards" ||
        routeFamilyMatchPrimary(primary, ["safeguards"], safeguardPatterns);
      const safeguardsBackup = hasStrongBackup(board, ["safeguards"]);
      result.route_family_match = safeguardsPrimary || safeguardsBackup;
      result.route_family_match_reason = result.route_family_match
        ? safeguardsPrimary
          ? "Safeguards primary."
          : "Safeguards strong backup."
        : `Safeguards not matched (primary=${primary.route_type}).`;
      if (!safeguardsPrimary && !safeguardsBackup) {
        result.weakIssues.push("Youth/vulnerability safeguards not surfaced as primary or strong backup.");
      } else if (!safeguardsPrimary && safeguardsBackup) {
        result.pack_pressure_note =
          "Safeguards route present as backup — primary should be safeguards when file supports it.";
      }
      break;
    }
    case "I": {
      if (isPackIExhibitCorpus(corpus, board) && !isPackIMultiCorpus(corpus, board)) {
        // Imported Pack I corpus uses CB-EXHIBIT (exhibit-code precision), not CB-MULTI.
        result.expected_route_family = "exhibit / continuity / provenance precision";
        const exhibitPatterns = [
          /exhibit|EX-[\w\d-]+|continuity|provenance|chain\s+of\s+custody|exhibit\s+list|near[-\s]?duplicate/i,
        ];
        const exhibitPrimary =
          primary.route_type === "timeline" ||
          primary.route_type === "continuity" ||
          primary.route_type === "identity" ||
          routeFamilyMatchPrimary(primary, ["continuity", "identity", "timeline"], exhibitPatterns);
        const exhibitBackup =
          hasStrongBackup(board, ["continuity", "identity"]) ||
          findRoutes(board, ["continuity", "identity"]).some((r) => r.status !== "blocked");
        result.route_family_match =
          (exhibitPrimary || exhibitBackup) && !isGenericRoute(primary);
        result.route_family_match_reason = result.route_family_match
          ? `CB-EXHIBIT corpus: ${primary.route_type} primary OK (multi=${board.diagnostics?.multiparty_signal_count ?? 0}).`
          : `CB-EXHIBIT corpus: expected timeline/continuity/ID, got ${primary.route_type} (multi=${board.diagnostics?.multiparty_signal_count ?? 0}).`;
        if (!result.route_family_match) {
          result.weakIssues.push(
            "Exhibit-precision Pack I should lead with timeline / continuity / ID — not multiparty routes the file does not contain.",
          );
        }
      } else {
        result.expected_route_family = "multi-defendant / multi-count caution";
        const multiPatterns = [
          /multi[-\s]?defendant|co[-\s]?defendant|separate\s+defendant|separate\s+count|count\s+\d|defendant\s+[AB]/i,
        ];
        const multipartyPrimary =
          primary.route_type === "multiparty" ||
          routeFamilyMatchPrimary(primary, ["multiparty"], multiPatterns);
        const multipartyBackup = hasStrongBackup(board, ["multiparty"]);
        result.route_family_match = multipartyPrimary || multipartyBackup;
        result.route_family_match_reason = result.route_family_match
          ? multipartyPrimary
            ? "Multiparty primary on CB-MULTI corpus."
            : "Multiparty strong backup on CB-MULTI corpus."
          : `CB-MULTI expected but primary=${primary.route_type}, multi=${board.diagnostics?.multiparty_signal_count ?? 0}.`;
        if (!multipartyPrimary && !multipartyBackup) {
          result.weakIssues.push(
            "Multi-defendant / multi-count caution not surfaced as primary or strong backup.",
          );
        } else if (!multipartyPrimary && multipartyBackup) {
          result.pack_pressure_note =
            "Multiparty route present as backup — primary should reflect separate-defendant / count risk.";
        }
        if (disclosurePrimary && !corpusMentions(board, multiPatterns)) {
          result.weakIssues.push("Multi-party pack ignores separate-defendant / separate-count risk.");
        }
      }
      break;
    }
    case "M": {
      result.expected_route_family = "multi-defendant / multi-count caution";
      const multiPatterns = [
        /multi[-\s]?defendant|co[-\s]?defendant|separate\s+defendant|separate\s+count|count\s+\d|defendant\s+[AB]/i,
      ];
      const multipartyPrimary =
        primary.route_type === "multiparty" ||
        routeFamilyMatchPrimary(primary, ["multiparty"], multiPatterns);
      const multipartyBackup = hasStrongBackup(board, ["multiparty"]);
      result.route_family_match = multipartyPrimary || multipartyBackup;
      result.route_family_match_reason = result.route_family_match
        ? multipartyPrimary
          ? "Multiparty primary (Pack M)."
          : "Multiparty strong backup (Pack M)."
        : `Pack M multiparty not matched (primary=${primary.route_type}).`;
      if (!multipartyPrimary && !multipartyBackup) {
        result.weakIssues.push(
          "Multi-defendant / multi-count caution not surfaced as primary or strong backup.",
        );
      } else if (!multipartyPrimary && multipartyBackup) {
        result.pack_pressure_note =
          "Multiparty route present as backup — primary should reflect separate-defendant / count risk.";
      }
      if (disclosurePrimary && !corpusMentions(board, multiPatterns)) {
        result.weakIssues.push("Multi-party pack ignores separate-defendant / separate-count risk.");
      }
      break;
    }
    case "J": {
      result.expected_route_family = "document-type-specific fight route";
      result.route_family_match = !isGenericRoute(primary);
      if (!result.route_family_match) {
        result.weakIssues.push(
          `Primary route too generic (${genericRouteReason(primary)}).`,
        );
      }
      break;
    }
    default:
      break;
  }

  return result;
}

export function computeRouteDistribution(rows: BattleboardSweepRow[]): BattleboardRouteDistribution {
  const route_type_counts: Record<string, number> = {};
  const titleCounts = new Map<string, number>();
  let disclosure_primary_count = 0;

  for (const row of rows) {
    const rt = row.primary_route_type ?? "none";
    route_type_counts[rt] = (route_type_counts[rt] ?? 0) + 1;
    const title = compact(row.primary_route_title ?? "") || "(no primary)";
    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
    if (row.disclosure_overuse_flag || rt === "disclosure") disclosure_primary_count += 1;
  }

  const total = rows.length;
  const disclosure_primary_pct =
    total > 0 ? Math.round((disclosure_primary_count / total) * 1000) / 10 : 0;

  const top_primary_titles = [...titleCounts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const disclosure_overuse_warning =
    total > 0 && disclosure_primary_pct > DISCLOSURE_OVERUSE_THRESHOLD_PCT
      ? "Disclosure is over-selected as primary route; route ranking may need tuning."
      : null;

  return {
    route_type_counts,
    top_primary_titles,
    disclosure_primary_count,
    disclosure_primary_pct,
    disclosure_overuse_warning,
  };
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

  const phase2Empty = {
    expected_route_family: null as string | null,
    route_family_match: false,
    disclosure_overuse_flag: false,
    route_distribution_note: null as string | null,
    pack_pressure_note: null as string | null,
    route_family_match_reason: null as string | null,
  };

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
      ...phase2Empty,
      ...emptyDiagnosticsFields(),
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
  const packId = parseEvalPackId(eval_pack_id ?? undefined);

  if (primary) {
    const routeWeak = routeTypeQualityWeak(battleboard, primary);
    if (routeWeak) weakIssues.push(routeWeak);
    if (packId !== "J" && isGenericRoute(primary)) {
      weakIssues.push(`Primary route too generic (${genericRouteReason(primary)}).`);
    }
    if (collapseDetailWeak(battleboard, primary)) {
      weakIssues.push("Insufficient collapse risk detail");
    }
  }

  const packQuality = evaluatePackRouteQuality(packId, battleboard, primary, case_title);
  weakIssues.push(...packQuality.weakIssues);
  failIssues.push(...packQuality.failIssues);

  if (
    packQuality.expected_route_family &&
    !packQuality.route_family_match &&
    packQuality.weakIssues.length === 0
  ) {
    weakIssues.push(
      `Expected route family (${packQuality.expected_route_family}) not matched on primary or strong backup.`,
    );
  }

  if (!CONDITIONAL_MARKERS.test(text) && battleboard.position_trust !== "recorded") {
    weakIssues.push("Route wording may not be conditional enough");
  }

  const route_distribution_note = packQuality.disclosure_overuse_flag
    ? "Primary route is disclosure-led."
    : null;

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
    expected_route_family: packQuality.expected_route_family,
    route_family_match: packQuality.route_family_match,
    disclosure_overuse_flag: packQuality.disclosure_overuse_flag,
    route_distribution_note,
    pack_pressure_note: packQuality.pack_pressure_note,
    route_family_match_reason: packQuality.route_family_match_reason,
    ...diagnosticsFromBoard(battleboard),
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

  const route_distribution = computeRouteDistribution(rows);

  return {
    total,
    pass,
    weak,
    fail,
    avg_duration_ms,
    by_pack,
    issue_groups,
    route_distribution,
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
    "expected_route_family",
    "route_family_match",
    "disclosure_overuse_flag",
    "pack_pressure_note",
    "route_family_match_reason",
    "corpus_markers",
    "safeguards_signal_count",
    "multiparty_signal_count",
    "backup_route_types",
    "backup_route_titles",
    "primary_anchor_sample",
    "safeguards_anchor_sample",
    "multiparty_anchor_sample",
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
        r.expected_route_family,
        r.route_family_match,
        r.disclosure_overuse_flag,
        r.pack_pressure_note,
        r.route_family_match_reason,
        r.corpus_markers,
        r.safeguards_signal_count,
        r.multiparty_signal_count,
        r.backup_route_types,
        r.backup_route_titles,
        r.primary_anchor_sample,
        r.safeguards_anchor_sample,
        r.multiparty_anchor_sample,
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
}): BattleboardSweepFullExport & { route_distribution: BattleboardRouteDistribution } {
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
    route_distribution: summary.route_distribution,
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
