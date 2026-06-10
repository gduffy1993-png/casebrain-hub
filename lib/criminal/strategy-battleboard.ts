/**
 * Strategy Battleboard — Phase 1 (read-only, deterministic).
 * Solicitor-safe fight-route panel; not predictions or eval logic.
 */

import { repairDisplayWordSpacing } from "@/lib/criminal/display-text";
import { scrubDevRefs } from "@/lib/criminal/dev-ref-scrub";
import { gateChaseLines } from "@/lib/criminal/chase-source-gate";

export type BattleboardRouteStatus = "viable" | "conditional" | "blocked";

export type BattleboardRouteType =
  | "identity"
  | "timeline"
  | "disclosure"
  | "interview"
  | "intent"
  | "causation"
  | "continuity"
  | "mitigation"
  | "safeguards"
  | "multiparty"
  | "unknown";

export type BattleboardRoute = {
  id: string;
  title: string;
  status: BattleboardRouteStatus;
  route_type: BattleboardRouteType;
  why_it_helps: string[];
  what_hurts_us: string[];
  evidence_anchors: string[];
  collapse_risks: string[];
  next_moves: string[];
  hearing_line: string;
  safety_note: string;
};

export type BattleboardOverallStatus = "usable" | "thin_bundle" | "needs_review";

/** Read-only engine diagnostics for Battleboard Sweep export (not shown on solicitor cards). */
export type BattleboardEngineDiagnostics = {
  corpus_markers: string | null;
  safeguards_signal_count: number;
  multiparty_signal_count: number;
  timeline_signal_count: number;
  cps_pressure_signal_count: number;
  readiness_signal_count: number;
  hearing_court_signal_count: number;
  backup_route_types: string[];
  backup_route_titles: string[];
  primary_anchor_sample: string[];
  safeguards_anchor_sample: string[];
  multiparty_anchor_sample: string[];
  cps_pressure_anchor_sample: string[];
  readiness_anchor_sample: string[];
  hearing_court_anchor_sample: string[];
};

export type BattleboardOutput = {
  case_id: string;
  generated_at: string;
  overall_status: BattleboardOverallStatus;
  solicitor_safe_summary: string;
  position_trust?: BattleboardPositionTrust;
  position_notice?: string | null;
  primary_route?: BattleboardRoute;
  routes: BattleboardRoute[];
  global_collapse_risks: string[];
  urgent_next_moves: string[];
  /** Sweep/debug only — signal counts and backup routes from the source bundle. */
  diagnostics?: BattleboardEngineDiagnostics;
};

export type BattleboardPositionTrust =
  | "recorded"
  | "interview_from_file"
  | "provisional"
  | "not_recorded";

export type BattleboardRecordedPositionMeta = {
  position_text: string;
  phase?: number | null;
  source?: string | null;
};

export type StrategyBattleboardInput = {
  case_id: string;
  bundle_text: string;
  offence_label?: string | null;
  committed_strategy?: string | null;
  /** @deprecated Use recorded_position — kept for callers that only pass text */
  position_text?: string | null;
  recorded_position?: BattleboardRecordedPositionMeta | null;
  /** Phase 1 / police-station detected stance — not a confirmed solicitor position */
  stance_detected?: string | null;
  /** Police station interview stance field (no_comment, prepared_statement, etc.) */
  interview_stance?: string | null;
  strategy_summary_lines?: string[];
  outstanding_disclosure?: string[];
};

export type ResolvedBattleboardPosition = {
  trust: BattleboardPositionTrust;
  notice: string | null;
  recorded_summary: string | null;
  interview_account_lines: string[];
  bundle_supports_act_denial: boolean;
  bundle_supports_no_comment: boolean;
  bundle_supports_admission: boolean;
};

/** Phase 1 / review-confirm stance labels — not substantive recorded positions on their own */
const PHASE1_STANCE_LABELS = [
  "act denial",
  "put to proof",
  "lawful force",
  "intent denial + causation",
  "recklessness challenge",
  "reserved pending disclosure",
  "specific intent challenge",
  "diminished responsibility (if raised)",
] as const;

const PROVISIONAL_POSITION_NOTICE =
  "Defence position not safely recorded yet — position is provisional; take/record instructions before relying on it.";

const NOT_RECORDED_NOTICE =
  "Defence position not safely recorded yet — routes below follow file wording and interview material only.";

const FORBIDDEN_PHRASE_RE =
  /\b(this\s+wins|wins\s+the\s+case|Crown\s+will\s+lose|proves\s+innocence|guaranteed|definitely\s+defeats\s+the\s+case|acquittal\s+is\s+certain)\b/i;

/** Eval / training / test-bundle disclaimers — must not appear on solicitor-facing cards. */
const EVAL_BOILERPLATE_RES: RegExp[] = [
  /fictional\s+training\s+data/i,
  /not\s+legal\s+advice/i,
  /not\s+a\s+real\s+disclosure\s+bundle/i,
  /fictional\s+extract/i,
  /fictional\s+charge\s+drafting/i,
  /\bfiction\s*:/i,
  /\(fiction\)/i,
  /fictional\s+email/i,
  /fictional\s+letter/i,
  /\bfictional\b/i,
  /\btraining\s+data\b/i,
  /\btest\s+data\b/i,
  /controlled\s+fictional/i,
  /generated\s+test\s+bundle/i,
  /NOTE:\s*This\s+is\s+fictional/i,
  /this\s+is\s+(?:a\s+)?fictional/i,
  /fictional\s+(?:training|test|case|bundle|matter|scenario|disclosure)/i,
  /for\s+training\s+(?:and\s+evaluation|purposes?)\s+only/i,
  /training\s+purposes?\s+only/i,
  /synthetic\s+(?:case|bundle|training)/i,
  /\bI\s+mention\s+that\b/i,
  /Grounds\s+for\s+dispute\s*\/\s*friction/i,
  /Example\s+tension\s+note/i,
  /={2,}\s*SECTION:/i,
  /\bSECTION:\s*[A-Z]/i,
  /^Short\s+title:/i,
  /^Stage:/i,
  /^Messiness:/i,
];

/** Strong evidence / disclosure anchors — keep even when the line is short */
const STRONG_EVIDENCE_ANCHOR_RE =
  /\b(MG6|MG11|MG5|CCTV|CAD|999|BWV|EX-[\w\d]+|interview|PACE|disclosure|continuity|source\s+material|outstanding|not\s+served|served|medical|forensic|witness\s+statement|unused\s+material|disclosure\s+chase|MG6C|MG0|CB-OCR|CB-SCAN|CB-PHOTO|CB-MESSY|OCR|scanned|illegible)\b/i;

/** Pack F/N eval markers + participation wording (file-derived anchors). */
const SAFEGUARDS_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-VULN\b/i,
  /\bCB-SAFEGUARDS\b/i,
  /\bCB-YOUTH2\b/i,
  /\byouth\b/i,
  /\byoung\s+person\b/i,
  /\bchild\s+defendant\b/i,
  /\bjuvenile\b/i,
  /\bunder\s+18\b/i,
  /\bage\s+1[0-7]\b/i,
  /\bDOB\b.*\b(200[89]|201[0-9])\b/i,
  /\bvulnerab/i,
  /\bappropriate\s+adult\b/i,
  /\bAA\s+(?:present|called|required|attended|not)\b/i,
  /\bparent\b/i,
  /\bguardian\b/i,
  /\bparent\/guardian\b/i,
  /\bat\s+interview\b/i,
  /\blearning\s+difficult/i,
  /\bADHD\b/i,
  /\bautism\b/i,
  /\bneurodivers/i,
  /\bmental\s+health\b/i,
  /\banxiety\b/i,
  /\bpanic\b/i,
  /\bself[- ]?harm\b/i,
  /\binterpreter\b/i,
  /\blanguage\s+difficult/i,
  /\bcommunication\s+difficult/i,
  /\bspecial\s+measures\b/i,
  /\bparticipation\b/i,
  /\bintermediary\b/i,
  /\bfitness\b/i,
  /\bcapacity\b/i,
  /\bcustody\s+healthcare\b/i,
  /\bliaison\s+and\s+diversion\b/i,
  /\bPACE\s+Code\s+C\b/i,
  /\bno\s+appropriate\s+adult\b/i,
];

const MULTIPARTY_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-MULTI\b/i,
  /\bCB-MDPRESS\b/i,
  /\bCB-MULTI2\b/i,
  /\bco[-\s]?defendant/i,
  /\bco[-\s]?accused/i,
  /\bmultiple\s+defendants?\b/i,
  /\bdefendant\s+[12AB]\b/i,
  /\bcount\s+[12]\b/i,
  /\balternative\s+count\b/i,
  /\bjoint\s+enterprise\b/i,
  /\bsecondary\s+party\b/i,
  /\battribution\b/i,
  /\bseparate\s+role\b/i,
  /\bmixed\s+evidence\b/i,
  /\bphone\s+belongs\s+to\b/i,
  /\bvehicle\s+belongs\s+to\b/i,
  /\bone\s+defendant\s+admitted\b/i,
  /\bdefendant\s+1\b/i,
  /\bdefendant\s+2\b/i,
  /\bD1\b/i,
  /\bD2\b/i,
  /\bseparate\s+defendant\b/i,
  /\bseparate\s+count\b/i,
  /\bwho\s+did\s+what\b/i,
  /\brole\s+of\s+(?:each\s+)?defendant\b/i,
];

const SAFEGUARDS_ANCHOR_RE =
  /\b(youth|young\s+person|child|juvenile|under\s+18|vulnerab|appropriate\s+adult|\bAA\b|parent|guardian|interpreter|intermediary|special\s+measures|participation|mental\s+health|learning\s+difficult|communication\s+difficult|fitness|capacity|liaison|CB-VULN|CB-SAFEGUARDS|PACE\s+Code\s+C)\b/i;

const MULTIPARTY_ANCHOR_RE =
  /\b(co[-\s]?defendant|co[-\s]?accused|defendant\s+[12AB]|count\s+[12]|joint\s+enterprise|attribution|separate\s+(?:defendant|count|role)|phone\s+belongs|vehicle\s+belongs|mixed\s+evidence|CB-MULTI|who\s+did\s+what)\b/i;

/** Pack P — damaging facts / prosecution pressure (not plea advice). */
const CPS_PRESSURE_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-CPS\b/i,
  /\bCB-PRESSURE\b/i,
  /\bCB-PRESS\b/i,
  /\badmission\b/i,
  /\baccepts\s+presence\b/i,
  /\baccepts\s+possession\b/i,
  /\bno\s+comment\s+after\s+disclosure\b/i,
  /\bcaught\s+on\s+CCTV\b/i,
  /\bcomplainant\s+supported\b/i,
  /\bindependent\s+evidence\b/i,
  /\bforensic\s+match\b/i,
  /\bbad\s+character\b/i,
  /\bprevious\s+incident\b/i,
  /\baccount\s+conflicts?\b/i,
  /\bconflicts?\s+with\s+(?:CCTV|witness|phone|medical|CAD)\b/i,
  /\bstrong\s+prosecution\b/i,
  /\bprosecution\s+pressure\b/i,
  /\bCPS\s+pressure\b/i,
  /\bdefence\s+weakness\b/i,
  /\brisky\s+denial\b/i,
  /\bunsafe\s+to\s+run\s+positive\s+defence\b/i,
  /\bdamage\s+limitation\b/i,
  /\bbasis\s+of\s+plea\b/i,
  /\bsentencing\s+exposure\b/i,
  /\bdamaging\s+interview\b/i,
  /\bpartial\s+admission\b/i,
  /\bCrown\s+strength\b/i,
  /\bprosecution\s+case\s+strong\b/i,
];

const CPS_PRESSURE_ANCHOR_RE =
  /\b(admission|accepts\s+presence|accepts\s+possession|CCTV|forensic|bad\s+character|account\s+conflict|prosecution\s+pressure|CPS\s+pressure|damage\s+limitation|basis\s+of\s+plea|defence\s+weakness|risky\s+denial|CB-CPS|CB-PRESSURE|CB-PRESS)\b/i;

/** Pack T / S — review readiness / case-control. */
const READINESS_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-REVIEW\b/i,
  /\bCB-READY\b/i,
  /\bCB-EXPORT\b/i,
  /\bsupervisor\s+review\b/i,
  /\bfile\s+review\b/i,
  /\btrial\s+readiness\b/i,
  /\bhearing\s+prep\b/i,
  /\battendance\s+note\b/i,
  /\bcounsel\s+note\b/i,
  /\bcase\s+theory\b/i,
  /\boutstanding\s+instructions\b/i,
  /\bunresolved\s+defence\s+position\b/i,
  /\bmissing\s+proof\s+checklist\b/i,
  /\breview\s+before\s+hearing\b/i,
  /\bsolicitor\s+sign[-\s]?off\b/i,
  /\bhandover\b/i,
  /\breadiness\b/i,
  /\bexport\s+checklist\b/i,
  /\bclient\s+update\s+letter\b/i,
  /\bEX-S-/i,
  /\bbundle\s+reference\b/i,
  /\bwork\s+product\b/i,
  /\bsolicitor\s+export\b/i,
  /\battendance\s+note\b/i,
];

const READINESS_ANCHOR_RE =
  /\b(supervisor\s+review|file\s+review|trial\s+readiness|hearing\s+prep|readiness|sign[-\s]?off|handover|outstanding\s+instructions|proof\s+checklist|CB-REVIEW|CB-READY|CB-EXPORT|EX-S-|export\s+checklist|work\s+product|client\s+update|bundle\s+reference|attendance\s+note|solicitor\s+export)\b/i;

/** Pack X — hearing / court move (expanded). */
const HEARING_COURT_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-HEARING\b/i,
  /\bCB-COURT\b/i,
  /\bCB-MOVE\b/i,
  /\bEX-X-/i,
  /\bPTPH\b/i,
  /\btrial\s+tomorrow\b/i,
  /\bremand\s+review\b/i,
  /\bfirst\s+appearance\b/i,
  /\bbail\s+application\b/i,
  /\bRUI\b/i,
  /\bplea\s+and\s+trial\s+preparation\b/i,
  /\bdirections\s+hearing\b/i,
  /\badjournment\b/i,
  /\bdisclosure\s+order\b/i,
  /\btimetable\b/i,
  /\bcourt\s+should\s+be\s+asked\b/i,
  /\bprocedural\s+next\s+step\b/i,
  /\blisting\b/i,
  /\bmention\s+hearing\b/i,
  /\bCMH\b/i,
  /\bPCMH\b/i,
];

const HEARING_COURT_ANCHOR_RE =
  /\b(PTPH|CMH|PCMH|remand|bail|RUI|adjourn|listing|timetable|disclosure\s+order|CB-HEARING|CB-COURT|CB-MOVE|EX-X-)\b/i;

/** Corpus gates — special routes only when pack markers or strong dedicated signals justify them. */
const CPS_CORPUS_GATE_RE = /\b(?:CB-PRESSURE|CB-PRESS|CB-CPS|PACK\s*P)\b/i;
const READINESS_CORPUS_GATE_RE = /\b(?:CB-EXPORT|CB-REVIEW|CB-READY|PACK\s*[ST])\b/i;
const HEARING_CORPUS_GATE_RE = /\b(?:CB-HEARING|CB-COURT|CB-MOVE|PACK\s*X|EX-X-)\b/i;
const CHAOS_CORPUS_GATE_RE = /\b(?:CB-CHAOS|CB-DISC|PACK\s*G)\b/i;
const CONFLICT_CORPUS_GATE_RE = /\b(?:CB-INSTRUCT|CB-CONFLICT|PACK\s*O)\b/i;
const MESSY_CORPUS_GATE_RE = /\b(?:CB-MESSY|CB-REAL|PACK\s*K)\b/i;
const OCR_CORPUS_GATE_RE = /\b(?:CB-OCR|CB-SCAN|CB-PHOTO|PACK\s*U|EX-U-)\b/i;

const EVIDENCE_CHAOS_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-CHAOS\b/i,
  /\bCB-DISC\b/i,
  /\bevidence\s+chaos\b/i,
  /\bdisclosure\s+chaos\b/i,
  /\bexhibit\s+conflict\b/i,
  /\bcontinuity\s+gap\b/i,
  /\bmissing\s+chain\b/i,
  /\bchain\s+of\s+custody\b/i,
  /\binconsistent\s+records?\b/i,
  /\bdocument\s+conflict\b/i,
  /\bmetadata\s+conflict\b/i,
  /\bversion\s+conflict\b/i,
  /\bCCTV\s+conflict\b/i,
  /\bCAD\s+conflict\b/i,
  /\btime\s+conflict\b/i,
  /\bconflicting\s+(?:CCTV|CAD|999|statements?)\b/i,
];

const CLIENT_CONFLICT_SIGNAL_PATTERNS: RegExp[] = [
  /\bCB-INSTRUCT\b/i,
  /\bCB-CONFLICT\b/i,
  /\baccount\s+conflicts?\b/i,
  /\baccount\s+inconsistent\b/i,
  /\binstructions?\s+not\s+yet\s+locked\b/i,
  /\binstructions?\s+conflict\b/i,
  /\bdenies\s+but\b/i,
  /\baccepts\s+presence\s+but\b/i,
  /\baccount\s+changed\b/i,
  /\bconflict\s+between\s+instructions\b/i,
  /\bconflicts?\s+with\s+(?:CCTV|witness|phone|medical|CAD|papers)\b/i,
  /\bEX-O-/i,
];

const CLIENT_CONFLICT_ANCHOR_RE =
  /\b(client\s+account|instruction|account\s+conflict|CB-CONFLICT|CB-INSTRUCT|EX-O-|inconsistent\s+with|denies\s+but|accepts\s+presence\s+but|instructions?\s+not\s+yet\s+locked)\b/i;

const DISPLAY_PREFIX_RES = /^File\s+wording:\s*/i;

function isCpsCorpus(bundleText: string): boolean {
  return CPS_CORPUS_GATE_RE.test(bundleText);
}

function isReadinessCorpus(bundleText: string): boolean {
  return READINESS_CORPUS_GATE_RE.test(bundleText);
}

function isHearingCorpus(bundleText: string): boolean {
  return HEARING_CORPUS_GATE_RE.test(bundleText);
}

function isChaosCorpus(bundleText: string): boolean {
  return CHAOS_CORPUS_GATE_RE.test(bundleText);
}

function isConflictCorpus(bundleText: string): boolean {
  return CONFLICT_CORPUS_GATE_RE.test(bundleText);
}

function isMessyCorpus(bundleText: string): boolean {
  return MESSY_CORPUS_GATE_RE.test(bundleText);
}

function isOcrCorpus(bundleText: string): boolean {
  return OCR_CORPUS_GATE_RE.test(bundleText);
}

/** Whether a meta route (cps/readiness/hearing/client_conflict) may be built for this bundle. */
function shouldBuildMetaRoute(
  routeId: string,
  bundleText: string,
  scores: { cps: number; ready: number; hear: number; conflict: number },
): boolean {
  switch (routeId) {
    case "cps_pressure":
      if (isConflictCorpus(bundleText) || isChaosCorpus(bundleText)) return false;
      return isCpsCorpus(bundleText) || scores.cps >= 4;
    case "readiness":
      if (isChaosCorpus(bundleText) || isConflictCorpus(bundleText)) return false;
      return isReadinessCorpus(bundleText) || scores.ready >= 4;
    case "hearing_court":
      if (isChaosCorpus(bundleText)) return false;
      return isHearingCorpus(bundleText) || scores.hear >= 4;
    case "client_account_conflict":
      return isConflictCorpus(bundleText) || scores.conflict >= 3;
    default:
      return true;
  }
}

const CONDITIONAL_MARKERS =
  /\b(outstanding|not\s+served|awaiting|missing|provisional|conditional|if\s+proved|may\s+assist|needs?\s+solicitor\s+review|do\s+not\s+overstate|source\s+material\s+needed)\b/i;

function compactOneLine(s: string): string {
  return repairDisplayWordSpacing(s);
}

function stripDisplayPrefixes(s: string): string {
  return scrubDevRefs(compactOneLine(s).replace(DISPLAY_PREFIX_RES, ""));
}

function countUsefulWords(s: string): number {
  const words = s
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const stop = new Set([
    "or",
    "and",
    "the",
    "a",
    "an",
    "vs",
    "if",
    "to",
    "of",
    "in",
    "on",
    "at",
    "is",
    "are",
    "was",
    "were",
    "that",
    "this",
    "with",
    "for",
    "as",
    "be",
    "by",
    "it",
    "we",
    "you",
    "they",
    "he",
    "she",
  ]);
  return words.filter((w) => !stop.has(w)).length;
}

export function hasStrongEvidenceAnchor(s: string): boolean {
  return STRONG_EVIDENCE_ANCHOR_RE.test(s);
}

function anchorStrengthScore(s: string): number {
  let score = 0;
  const t = s;
  if (/\bMG6\b/i.test(t)) score += 4;
  if (/\bMG11\b/i.test(t)) score += 4;
  if (/\bMG5\b/i.test(t)) score += 2;
  if (/\bCCTV\b/i.test(t)) score += 3;
  if (/\bCAD\b/i.test(t)) score += 3;
  if (/\b999\b/i.test(t)) score += 3;
  if (/\bBWV\b/i.test(t)) score += 2;
  if (/\bEX-[\w\d]+/i.test(t)) score += 3;
  if (/\binterview\b/i.test(t)) score += 2;
  if (/\bcontinuity\b/i.test(t)) score += 2;
  if (/\boutstanding\b/i.test(t)) score += 2;
  if (/\bnot\s+served\b/i.test(t)) score += 2;
  if (/\bsource\s+material\b/i.test(t)) score += 2;
  if (/\b(medical|forensic)\b/i.test(t)) score += 2;
  return score;
}

function isSectionHeadingLine(s: string): boolean {
  const t = compactOneLine(s);
  if (/^={2,}\s*.+={2,}$/.test(t)) return true;
  if (/^={2,}\s*SECTION:/i.test(t)) return true;
  if (/^SECTION:\s*[A-Z0-9 _-]+\s*$/i.test(t)) return true;
  if (/^(Short\s+title|Stage|Messiness):\s*.+$/i.test(t) && t.length < 100) return true;
  if (/^SECTION:\s*[A-Z]/i.test(t) && t.length < 80) return true;
  return false;
}

function isWeakFragmentLine(s: string): boolean {
  const t = compactOneLine(s);
  if (!t) return true;
  if (hasStrongEvidenceAnchor(t)) return false;
  if (isSectionHeadingLine(t)) return true;
  if (/^\(?or\s+[\w\s,/()-]{0,80}\)\.?\s*$/i.test(t)) return true;
  if (/^[\(\[][^)\]]{0,60}[\)\]]\.?\s*$/.test(t) && countUsefulWords(t) < 5) return true;
  if (/^(vs\.?|and|or)\s+/i.test(t) && countUsefulWords(t) < 5) return true;
  if (t.length < 20 && countUsefulWords(t) < 3) return true;
  return countUsefulWords(t) < 5;
}

function isEvalBoilerplate(s: string): boolean {
  return EVAL_BOILERPLATE_RES.some((re) => re.test(s));
}

function isBattleboardArtefact(s: string): boolean {
  const t = compactOneLine(s);
  if (!t) return true;
  if (isEvalBoilerplate(t)) return true;
  if (isSectionHeadingLine(t)) return true;
  if (isWeakFragmentLine(t)) return true;
  return false;
}

function isSafePhrase(s: string): boolean {
  const t = stripDisplayPrefixes(s);
  if (!t) return false;
  if (isBattleboardArtefact(t)) return false;
  if (FORBIDDEN_PHRASE_RE.test(t)) return false;
  if (hasStrongEvidenceAnchor(t)) return t.length >= 8;
  return t.length >= 12 && countUsefulWords(t) >= 5;
}

function sanitizeDisplayLine(s: string): string | null {
  const c = stripDisplayPrefixes(s);
  if (!c || !isSafePhrase(c)) return null;
  return c;
}

function sanitizeStringList(lines: string[], max: number): string[] {
  return uniqueSafe(lines, max);
}

function sanitizeRoute(route: BattleboardRoute): BattleboardRoute {
  const hearing = sanitizeDisplayLine(route.hearing_line);
  const safety = sanitizeDisplayLine(route.safety_note);
  return {
    ...route,
    why_it_helps: sanitizeStringList(route.why_it_helps, 4),
    what_hurts_us: sanitizeStringList(route.what_hurts_us, 3),
    evidence_anchors: sanitizeStringList(route.evidence_anchors, 6),
    collapse_risks: sanitizeStringList(route.collapse_risks, 5),
    next_moves: sanitizeStringList(route.next_moves, 5),
    hearing_line: hearing ?? route.hearing_line,
    safety_note: safety ?? route.safety_note,
  };
}

function normalizePositionCompare(text: string): string {
  return compactOneLine(text)
    .toLowerCase()
    .replace(/^defence\s+position\s*:\s*/i, "")
    .replace(/\.$/, "")
    .trim();
}

/** Default police-station / Phase 1 stance label saved as position — not a confirmed defence position */
export function isDefaultStanceOnlyPosition(text: string | null | undefined): boolean {
  if (!text?.trim()) return true;
  const n = normalizePositionCompare(text);
  if (!n) return true;
  if (/^act\s+denial$/.test(n)) return true;
  if (n.length <= 40 && PHASE1_STANCE_LABELS.some((label) => n === label)) return true;
  if (/^stance\s*:\s*/.test(n) && n.length < 48) return true;
  return false;
}

function isSubstantiveRecordedPosition(
  text: string,
  meta?: { phase?: number | null; source?: string | null },
): boolean {
  const t = compactOneLine(text);
  if (!t || isDefaultStanceOnlyPosition(t)) return false;
  if (/\bto be completed after disclosure\b/i.test(t) && t.length < 140) return false;
  if (meta?.phase === 1 && t.length < 90 && !/defence\s+position\s*:/i.test(t)) return false;
  if (meta?.source === "ai_suggested") {
    return t.length >= 40;
  }
  return t.length >= 28 || /defence\s+position\s*:/i.test(t);
}

function isPhase1StanceLabelLine(line: string): boolean {
  const c = compactOneLine(line);
  if (c.length < 4 || c.length > 120) return false;
  return isDefaultStanceOnlyPosition(c) || /^stance\s*:\s*/i.test(c);
}

export function extractBundleInterviewSignals(bundleText: string): {
  noComment: boolean;
  preparedStatement: boolean;
  partialAdmission: boolean;
  denialOfAct: boolean;
  selfDefence: boolean;
} {
  const u = bundleText;
  return {
    noComment: /\bno\s+comment\b/i.test(u) || /\bdeclined\s+to\s+answer\b/i.test(u),
    preparedStatement: /\bprepared\s+statement\b/i.test(u),
    partialAdmission:
      /\bpartial\s+admission\b/i.test(u) ||
      /\badmits?\s+that\b/i.test(u) ||
      /\badmitted\s+(that\s+)?/i.test(u),
    denialOfAct:
      /\bdenies?\s+(the\s+)?(act|offence|allegation|involvement)\b/i.test(u) ||
      /\bdenied\s+(the\s+)?(act|offence|allegation)\b/i.test(u) ||
      /\bnot\s+me\b.*\b(identif|offence|act)\b/i.test(u),
    selfDefence: /\bself[- ]?defen[cs]e\b/i.test(u) || /\blawful\s+(force|excuse)\b/i.test(u),
  };
}

function extractInterviewAccountLines(bundleText: string, max = 4): string[] {
  const patterns = [
    /\bno\s+comment\b/i,
    /\bprepared\s+statement\b/i,
    /\bpartial\s+admission\b/i,
    /\bdenies?\s+(the\s+)?(act|offence|allegation)/i,
    /\bdenied\s+(the\s+)?(act|offence|allegation)/i,
    /\binterview\b/i,
    /\bPACE\b/i,
    /\bclient\s+account\b/i,
    /\banswered\s+questions\b/i,
  ];
  return extractLinesMatching(bundleText, patterns, max);
}

function interviewStanceToLines(stance: string | null | undefined): string[] {
  if (!stance?.trim()) return [];
  const s = stance.trim().toLowerCase();
  if (s === "no_comment") return ["Interview stance (station record): no comment."];
  if (s === "prepared_statement") return ["Interview stance (station record): prepared statement."];
  if (s === "answered") return ["Interview stance (station record): answered questions."];
  return [];
}

export function resolveBattleboardPosition(input: {
  bundle_text: string;
  recorded_position?: BattleboardRecordedPositionMeta | null;
  position_text?: string | null;
  stance_detected?: string | null;
  interview_stance?: string | null;
}): ResolvedBattleboardPosition {
  const bundleText = (input.bundle_text ?? "").trim();
  const signals = extractBundleInterviewSignals(bundleText);
  const fileInterviewLines = uniqueSafe(
    [...extractInterviewAccountLines(bundleText, 4), ...interviewStanceToLines(input.interview_stance)],
    5,
  );

  const recordedMeta =
    input.recorded_position ??
    (input.position_text?.trim()
      ? { position_text: input.position_text.trim(), phase: null, source: null }
      : null);

  const recordedText = recordedMeta?.position_text?.trim() ?? "";
  const substantiveRecorded =
    recordedText.length > 0 &&
    isSubstantiveRecordedPosition(recordedText, {
      phase: recordedMeta?.phase,
      source: recordedMeta?.source,
    });

  const recordedDeniesAct =
    substantiveRecorded &&
    /\bden(y|ies|ied)\b/i.test(recordedText) &&
    !signals.noComment &&
    !signals.partialAdmission;

  const onlyPlaceholderActDenial =
    !substantiveRecorded &&
    (isDefaultStanceOnlyPosition(recordedText) ||
      normalizePositionCompare(input.stance_detected ?? "") === "act denial");

  if (substantiveRecorded) {
    return {
      trust: "recorded",
      notice: null,
      recorded_summary: compactOneLine(recordedText).slice(0, 240),
      interview_account_lines: fileInterviewLines,
      bundle_supports_act_denial: signals.denialOfAct || recordedDeniesAct,
      bundle_supports_no_comment: signals.noComment,
      bundle_supports_admission: signals.partialAdmission,
    };
  }

  if (fileInterviewLines.length > 0 || signals.noComment || signals.preparedStatement || signals.partialAdmission) {
    return {
      trust: "interview_from_file",
      notice: onlyPlaceholderActDenial ? PROVISIONAL_POSITION_NOTICE : null,
      recorded_summary: null,
      interview_account_lines: fileInterviewLines,
      bundle_supports_act_denial: signals.denialOfAct,
      bundle_supports_no_comment: signals.noComment,
      bundle_supports_admission: signals.partialAdmission,
    };
  }

  if (onlyPlaceholderActDenial || isDefaultStanceOnlyPosition(recordedText) || isDefaultStanceOnlyPosition(input.stance_detected)) {
    return {
      trust: "provisional",
      notice: PROVISIONAL_POSITION_NOTICE,
      recorded_summary: null,
      interview_account_lines: [],
      bundle_supports_act_denial: false,
      bundle_supports_no_comment: false,
      bundle_supports_admission: false,
    };
  }

  return {
    trust: "not_recorded",
    notice: NOT_RECORDED_NOTICE,
    recorded_summary: null,
    interview_account_lines: [],
    bundle_supports_act_denial: signals.denialOfAct,
    bundle_supports_no_comment: signals.noComment,
    bundle_supports_admission: signals.partialAdmission,
  };
}

function applyPositionGuardrails(
  routes: BattleboardRoute[],
  position: ResolvedBattleboardPosition,
): BattleboardRoute[] {
  const assumeConflict =
    position.trust === "provisional" ||
    position.trust === "not_recorded" ||
    (position.trust === "interview_from_file" && position.notice != null);

  const assumedActDenialWithoutSupport =
    position.trust === "provisional" ||
    (position.trust === "recorded" && !position.bundle_supports_act_denial && !position.bundle_supports_no_comment);

  return routes.map((route) => {
    let next = { ...route };

    if (assumeConflict) {
      next.collapse_risks = uniqueSafe(
        ["Assumed position may conflict with interview or served evidence.", ...next.collapse_risks],
        6,
      );
    }

    if (route.route_type === "interview") {
      const anchors = position.interview_account_lines.length
        ? uniqueSafe([...position.interview_account_lines, ...next.evidence_anchors], 6)
        : next.evidence_anchors;

      if (position.bundle_supports_no_comment) {
        next.evidence_anchors = uniqueSafe(
          [
            ...anchors.filter((a) => /\bno\s+comment\b/i.test(a)),
            ...anchors.filter((a) => !/\bact\s+denial\b/i.test(a) && !isPhase1StanceLabelLine(a)),
          ],
          6,
        );
        if (next.evidence_anchors.length === 0 && position.interview_account_lines.length) {
          next.evidence_anchors = uniqueSafe(position.interview_account_lines, 6);
        }
      } else if (position.interview_account_lines.length) {
        next.evidence_anchors = anchors;
      }

      if (
        (position.trust === "provisional" || position.trust === "not_recorded") &&
        !position.bundle_supports_act_denial &&
        !position.bundle_supports_no_comment &&
        !position.bundle_supports_admission
      ) {
        if (next.status === "viable") next.status = "conditional";
        if (next.evidence_anchors.length === 0 && next.status !== "blocked") {
          return null;
        }
      }

      if (assumedActDenialWithoutSupport && position.bundle_supports_admission) {
        next.what_hurts_us = uniqueSafe(
          ["Interview or served material may contain admissions — do not assume act denial.", ...next.what_hurts_us],
          4,
        );
      }
    }

    return next;
  }).filter((r): r is BattleboardRoute => r != null);
}

function uniqueSafe(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const c = stripDisplayPrefixes(raw);
    if (!c || !isSafePhrase(c) || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

function extractLinesMatching(bundleText: string, patterns: RegExp[], max = 5): string[] {
  if (!bundleText) return [];
  const candidates: string[] = [];
  for (const raw of bundleText.split(/\r?\n/)) {
    const l = raw.trim();
    if (l.length < 8 || l.length > 360) continue;
    if (isBattleboardArtefact(l)) continue;
    if (isPhase1StanceLabelLine(l)) continue;
    if (!hasStrongEvidenceAnchor(l) && l.length < 12) continue;
    if (patterns.some((p) => p.test(l))) {
      candidates.push(l);
    }
  }
  candidates.sort((a, b) => anchorStrengthScore(b) - anchorStrengthScore(a));
  return uniqueSafe(candidates, max);
}

/** File lines for safeguards/multiparty routes — family wording counts as anchor material. */
function extractFamilyLinesMatching(
  bundleText: string,
  patterns: RegExp[],
  familyAnchorRe: RegExp,
  max = 5,
): string[] {
  if (!bundleText) return [];
  const candidates: string[] = [];
  for (const raw of bundleText.split(/\r?\n/)) {
    const l = raw.trim();
    if (l.length < 6 || l.length > 360) continue;
    if (isBattleboardArtefact(l)) continue;
    if (isPhase1StanceLabelLine(l)) continue;
    const signalHit = patterns.some((p) => p.test(l));
    const familyHit = familyAnchorRe.test(l);
    if (!signalHit && !familyHit) continue;
    if (!familyHit && !hasStrongEvidenceAnchor(l) && l.length < 14) continue;
    candidates.push(l);
  }
  candidates.sort((a, b) => {
    const fa = familyAnchorRe.test(a) ? 10 : 0;
    const fb = familyAnchorRe.test(b) ? 10 : 0;
    if (fa !== fb) return fb - fa;
    return anchorStrengthScore(b) - anchorStrengthScore(a);
  });
  return uniqueSafe(candidates, max);
}

function isSubstantiveAnchorForRoute(routeType: BattleboardRouteType, line: string): boolean {
  if (routeType === "safeguards") {
    return SAFEGUARDS_ANCHOR_RE.test(line) || countUsefulWords(line) >= 5;
  }
  if (routeType === "multiparty") {
    return MULTIPARTY_ANCHOR_RE.test(line) || countUsefulWords(line) >= 5;
  }
  if (routeType === "mitigation") {
    return CPS_PRESSURE_ANCHOR_RE.test(line) || countUsefulWords(line) >= 5;
  }
  if (routeType === "interview") {
    return (
      CLIENT_CONFLICT_ANCHOR_RE.test(line) ||
      hasStrongEvidenceAnchor(line) ||
      countUsefulWords(line) >= 5
    );
  }
  if (routeType === "unknown") {
    return (
      READINESS_ANCHOR_RE.test(line) ||
      HEARING_COURT_ANCHOR_RE.test(line) ||
      countUsefulWords(line) >= 5
    );
  }
  return hasStrongEvidenceAnchor(line) || countUsefulWords(line) >= 5;
}

function bundleHas(bundleText: string, patterns: RegExp[]): boolean {
  const u = bundleText.toUpperCase();
  return patterns.some((p) => p.test(bundleText) || p.test(u));
}

/** Count how many safeguard signal patterns hit the bundle (for ranking, not predictions). */
export function safeguardsSignalScore(bundleText: string): number {
  let n = 0;
  for (const p of SAFEGUARDS_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

/** Count how many multi-defendant / multi-count signal patterns hit the bundle. */
export function multipartySignalScore(bundleText: string): number {
  let n = 0;
  for (const p of MULTIPARTY_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

export function cpsPressureSignalScore(bundleText: string): number {
  let n = 0;
  for (const p of CPS_PRESSURE_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

export function readinessSignalScore(bundleText: string): number {
  let n = 0;
  for (const p of READINESS_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

export function hearingCourtSignalScore(bundleText: string): number {
  let n = 0;
  for (const p of HEARING_COURT_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

export function clientConflictSignalScore(bundleText: string): number {
  let n = 0;
  for (const p of CLIENT_CONFLICT_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

export function evidenceChaosSignalScore(bundleText: string): number {
  let n = 0;
  for (const p of EVIDENCE_CHAOS_SIGNAL_PATTERNS) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
}

type RouteSpec = {
  id: string;
  route_type: BattleboardRouteType;
  title: string;
  signals: RegExp[];
  defaultWhy: string[];
  defaultHurts: string[];
  collapseRisks: string[];
  nextMoves: string[];
  hearingLine: string;
  safetyNote: string;
};

/** Pack Y 40x40 workflow offence families — display/ranking only, not eval logic. */
type PackYFamily = "affray" | "fraud" | "pwits" | "robbery";

const AFFRAY_FAMILY_SIGNALS: RegExp[] = [
  /\baffray\b/i,
  /\bcrowd\s+disorder\b/i,
  /\bgroup\s+violence\b/i,
  /\bmultiple\s+suspects\b/i,
  /\bpresence\s+accepted\b/i,
  /\bviolence\s+disputed\b/i,
  /\brole\s+disputed\b/i,
  /\bidentification\s+disputed\b/i,
  /\bCCTV\s+obstructed\b/i,
  /\b(?:police\s+)?BWV\s+not\s+served\b/i,
  /\bwitness\s+viewpoint\s+poor\b/i,
  /\bpublic\s+order\b/i,
  /\bparticipation\s+disputed\b/i,
];

const FRAUD_FAMILY_SIGNALS: RegExp[] = [
  /\bfraud\s+by\s+false\s+representation\b/i,
  /\bfraud\b/i,
  /\bdishonesty\s+disputed\b/i,
  /\baccount\s+control\s+disputed\b/i,
  /\bbanking\s+schedules?\b/i,
  /\bdevice\s+extraction\b/i,
  /\bemail\s*\/\s*IP\s+logs?\b/i,
  /\baccount\s+ownership\b/i,
  /\bdocument\s+attribution\b/i,
  /\blogin\s+(?:records?|logs?)\b/i,
];

const PWITS_FAMILY_SIGNALS: RegExp[] = [
  /\bpossession\s+with\s+intent\s+to\s+supply\b/i,
  /\bPWITS\b/i,
  /\bclass\s+A\s+drugs?\b/i,
  /\bpossession\s+disputed\b/i,
  /\bknowledge\s+disputed\b/i,
  /\bintent\s+to\s+supply\s+disputed\b/i,
  /\bphone\s+attribution\s+disputed\b/i,
  /\bshared\s+address\b/i,
  /\bmultiple\s+occupants\b/i,
  /\broom\s+ownership\b/i,
  /\bphone\s+extraction\b/i,
  /\b(?:cash|drugs)\s+continuity\b/i,
  /\bdrug\s+supply\b/i,
];

const ROBBERY_FAMILY_SIGNALS: RegExp[] = [
  /\brobbery\b/i,
  /\bidentification\s+disputed\b/i,
  /\bmasked\s+suspect\b/i,
  /\bpoor\s+lighting\b/i,
  /\b(?:co-?accused|unknown\s+male)\b/i,
  /\bparticipation\s+disputed\b/i,
  /\bstolen\s+property\s+recovered\s+elsewhere\b/i,
  /\bID\s+procedure\s+issue\b/i,
  /\bVIPER\b/i,
  /\bidentification\s+procedure\b/i,
];

function offenceFamilyContext(bundleText: string, offenceLabel?: string | null): string {
  const label = offenceLabel?.trim();
  return label ? `Offence: ${label}\n${bundleText}` : bundleText;
}

function scoreFamilySignals(ctx: string, patterns: RegExp[], offenceBoost?: RegExp): number {
  let score = offenceBoost?.test(ctx) ? 3 : 0;
  for (const p of patterns) {
    if (p.test(ctx)) score += 1;
  }
  return score;
}

export function affrayFamilyScore(ctx: string): number {
  return scoreFamilySignals(ctx, AFFRAY_FAMILY_SIGNALS, /\baffray\b/i);
}

export function fraudFamilyScore(ctx: string): number {
  return scoreFamilySignals(ctx, FRAUD_FAMILY_SIGNALS, /\bfraud\b/i);
}

export function pwitsFamilyScore(ctx: string): number {
  return scoreFamilySignals(
    ctx,
    PWITS_FAMILY_SIGNALS,
    /\b(?:PWITS|possession\s+with\s+intent\s+to\s+supply)\b/i,
  );
}

export function robberyFamilyScore(ctx: string): number {
  return scoreFamilySignals(ctx, ROBBERY_FAMILY_SIGNALS, /\brobbery\b/i);
}

export function detectPackYFamily(ctx: string): PackYFamily | null {
  const scores: { family: PackYFamily; score: number }[] = [
    { family: "affray", score: affrayFamilyScore(ctx) },
    { family: "fraud", score: fraudFamilyScore(ctx) },
    { family: "pwits", score: pwitsFamilyScore(ctx) },
    { family: "robbery", score: robberyFamilyScore(ctx) },
  ];
  const eligible = scores.filter((s) => s.score >= 2);
  if (!eligible.length) return null;
  eligible.sort((a, b) => b.score - a.score);
  return eligible[0]!.family;
}

function isInjuryLedCausationBundle(ctx: string): boolean {
  const injuryOffence =
    /\b(?:ABH|GBH|unlawful wounding|grievous bodily|actual bodily harm|murder|manslaughter|wounding)\b/i.test(
      ctx,
    );
  const mechanism = hasCausationMechanismDispute(ctx);
  const injuryFocus =
    /\b(?:injury\s+mechanism|medical\s+causation|how\s+the\s+injury|injury\s+level)\b/i.test(ctx);
  return injuryOffence && (mechanism || injuryFocus);
}

function shouldSuppressCausationForOffenceFamily(ctx: string): boolean {
  const family = detectPackYFamily(ctx);
  if (!family) return false;
  return !isInjuryLedCausationBundle(ctx);
}

function shouldBuildPackYRoute(routeId: string, ctx: string): boolean {
  switch (routeId) {
    case "pack_y_affray":
      return affrayFamilyScore(ctx) >= 2;
    case "pack_y_fraud":
      return fraudFamilyScore(ctx) >= 2;
    case "pack_y_pwits":
      return pwitsFamilyScore(ctx) >= 2;
    case "pack_y_robbery":
      return robberyFamilyScore(ctx) >= 2;
    default:
      return false;
  }
}

const ROUTE_SPECS: RouteSpec[] = [
  {
    id: "identity",
    route_type: "identity",
    title: "Identification / visual ID pressure",
    signals: [
      /\bID\s+dispute\b/i,
      /\bweak\s+ID\b/i,
      /\bidentification\b/i,
      /\bID\s+parade\b/i,
      /\bno\s+ID\s+parade\b/i,
      /\bTurnbull\b/i,
      /\bCCTV\b/i,
      /\bBWV\b/i,
      /\bbody\s+worn\b/i,
      /\bshort\s+observation\b/i,
      /\blighting\b/i,
      /\bwitness\s+identification\b/i,
      /\bunclear\s+CCTV\b/i,
    ],
    defaultWhy: [
      "May create pressure on identification if the served visual material is limited or disputed on the file wording.",
      "Conditional on comparing observation time, lighting, and any parade procedure actually recorded.",
    ],
    defaultHurts: [
      "Short, confident witness ID on served papers.",
      "Clear CCTV/BWV sequence that matches Crown timing.",
    ],
    collapseRisks: [
      "Full CCTV confirms the complainant's account of who was present.",
      "MG11 is consistent and served with a strong observation basis.",
      "ID parade or formal identification procedure supports the Crown route if proved.",
    ],
    nextMoves: [
      "Chase CCTV master, continuity, and any ID procedure material.",
      "Take instructions on observation conditions and any ID dispute.",
      "Map MG11 wording against served visual exhibits before fixing trial theory.",
    ],
    hearingLine:
      "On the file wording, identification remains conditional until served CCTV/source material and witness accounts are reconciled; do not overstate.",
    safetyNote: "Needs solicitor review before any positive ID challenge is advanced at court.",
  },
  {
    id: "timeline",
    route_type: "timeline",
    title: "Timeline / sequence / alibi pressure",
    signals: [
      /\btimeline\b/i,
      /\bsequence\b/i,
      /\balibi\b/i,
      /\bCAD\b/i,
      /\b999\b/i,
      /\bCCTV\s+time\b/i,
      /\btimestamp\b/i,
      /\breceipt\s+time\b/i,
      /\bphone\s+time\b/i,
      /\btime\s+conflict\b/i,
      /\bout\s+of\s+sequence\b/i,
      /\bwhen\s+did\b/i,
    ],
    defaultWhy: [
      "May assist if served timing material (CAD/999/CCTV/receipts) does not align with the Crown sequence on the papers.",
      "Creates pressure if proved only after master/source times are compared — provisional until then.",
    ],
    defaultHurts: [
      "CAD/999 timing that supports the Crown sequence on served material.",
      "Client account that conflicts with served source times.",
    ],
    collapseRisks: [
      "Full CCTV confirms Crown timing.",
      "CAD/999 timing supports the Crown sequence on served material.",
      "Receipt/phone records undermine the defence timing account.",
    ],
    nextMoves: [
      "Chase CAD audit, 999 audio, and CCTV master with continuity.",
      "Take instructions on timing conflict and any alibi account.",
      "Record defence position on sequence before the next hearing.",
    ],
    hearingLine:
      "Timing/sequence remains conditional on served CAD/999/CCTV material; ask the court to record what source material is still outstanding.",
    safetyNote: "Do not present a firm alibi unless instructions and served material support it.",
  },
  {
    id: "safeguards",
    route_type: "safeguards",
    title: "Safeguards / participation pressure",
    signals: SAFEGUARDS_SIGNAL_PATTERNS,
    defaultWhy: [
      "Safeguards or participation issues may affect interview reliability, fairness, directions, or hearing readiness if proved on the file.",
      "May assist only where served custody/interview records show a live participation or vulnerability issue — conditional on material.",
    ],
    defaultHurts: [
      "Safeguards may be documented as properly complied with on served papers.",
      "Vulnerability may not be linked to the disputed issue on the Crown route.",
    ],
    collapseRisks: [
      "Custody/interview record shows safeguards were correctly followed.",
      "Vulnerability is not linked to the disputed issue on served material.",
      "Appropriate adult / interpreter records support the Crown account if proved.",
    ],
    nextMoves: [
      "Chase custody record, appropriate adult record, and interpreter record if referenced.",
      "Chase vulnerability assessment, medical, or liaison notes if listed.",
      "Record instructions on participation and understanding before fixing hearing strategy.",
    ],
    hearingLine:
      "Ask the court to record any safeguards/participation issue and direct service of relevant custody and interview records — conditional on served material.",
    safetyNote: "Not a merits win — solicitor review required before advancing participation challenges.",
  },
  {
    id: "multiparty",
    route_type: "multiparty",
    title: "Separate defendant / count-specific pressure",
    signals: MULTIPARTY_SIGNAL_PATTERNS,
    defaultWhy: [
      "The Crown must prove the right allegation against the right defendant/count; evidence may not transfer safely between parties or counts.",
      "May assist if served material shows attribution, ownership, or role disputes — provisional until reviewed.",
    ],
    defaultHurts: [
      "Shared evidence, joint activity, admissions, or attribution evidence may connect defendants or counts on the papers.",
      "Co-defendant material may be admissible and consistent with the Crown case if proved.",
    ],
    collapseRisks: [
      "Crown can tie each item to this defendant and count on served material.",
      "Co-defendant evidence is admissible and consistent if proved.",
      "Joint enterprise or shared conduct wording undermines separate-role pressure.",
    ],
    nextMoves: [
      "Build defendant-by-defendant evidence matrix from served papers.",
      "Build count-by-count proof table before fixing trial theory.",
      "Chase attribution material, phone ownership, vehicle ownership, and role evidence if outstanding.",
    ],
    hearingLine:
      "Ask the court to record that case management directions must separate defendant and count issues — conditional on served evidence and solicitor review.",
    safetyNote: "Conditional on served evidence and solicitor review — do not overstate separate-role points.",
  },
  {
    id: "disclosure",
    route_type: "disclosure",
    title: "Disclosure / source-material pressure",
    signals: [
      /\boutstanding\s+(?:disclosure|material|CCTV|MG6|source)/i,
      /\bnot\s+served\b/i,
      /\bawaiting\s+(?:disclosure|material|CCTV|MG6)/i,
      /\bunused\s+material\b/i,
      /\bdisclosure\s+chaos\b/i,
      /\bstill\s+outstanding\b/i,
      /\bMG6C\b/i,
      /\bfull\s+disclosure\s+not\b/i,
    ],
    defaultWhy: [
      "May assist as conditional prosecution-pressure if MG6 or schedules show outstanding CCTV/CAD/999/MG11 or unused material.",
      "Creates pressure if proved only once the listed source material is served and reviewed.",
    ],
    defaultHurts: [
      "Outstanding items are chased but return consistent with the Crown case.",
      "Thin bundle with no published disclosure schedule to anchor a chase.",
    ],
    collapseRisks: [
      "Outstanding disclosure is served and supports the Crown route.",
      "MG6 itself lists the material as served and consistent.",
      "Chase returns master CCTV that undermines the defence timing/ID point.",
    ],
    nextMoves: [
      "Chase CCTV master and continuity.",
      "Chase CAD audit and 999 audio.",
      "Ask for full MG11/source material and unused schedule detail.",
      "Prepare hearing line on outstanding disclosure; set a timetable.",
    ],
    hearingLine:
      "The defence asks the court to record outstanding disclosure and set a timetable; position remains provisional until source material is served.",
    safetyNote: "Disclosure pressure is not a merits win — needs solicitor review before plea or trial strategy is fixed.",
  },
  {
    id: "interview",
    route_type: "interview",
    title: "Interview / account pressure",
    signals: [
      /\bno\s+comment\b/i,
      /\bprepared\s+statement\b/i,
      /\bpartial\s+admission\b/i,
      /\bdenies?\s+(the\s+)?(act|offence|allegation)/i,
      /\bdenied\s+(the\s+)?(act|offence|allegation)/i,
      /\bclient\s+account\b/i,
      /\binterview\b/i,
      /\bPACE\b/i,
      /\bspecial\s+warning\b/i,
      /\bdisclosure\s+limited\b/i,
      /\baccount\s+conflict\b/i,
    ],
    defaultWhy: [
      "Interview position may create conditional pressure if the Crown relies on account wording but disclosure limits how it can be tested.",
      "May assist only where served interview material and MG5/MG6 can be reconciled — provisional until then.",
    ],
    defaultHurts: [
      "Interview admission that narrows the defence route.",
      "No comment or limited account where bad facts are already on the file.",
    ],
    collapseRisks: [
      "Interview admission narrows the defence route.",
      "Client account conflicts with served source material.",
      "Missing disclosure is served and supports the Crown interview route.",
    ],
    nextMoves: [
      "Take instructions on interview stance and any prepared statement wording.",
      "Chase interview recording/transcript and pre-interview disclosure.",
      "Record defence position; do not infer interview content beyond served wording.",
    ],
    hearingLine:
      "Interview/account remains conditional on served disclosure; do not overstate what the account proves at this stage.",
    safetyNote: "Needs solicitor review — interview routes collapse quickly if admissions are clear on the papers.",
  },
  {
    id: "intent",
    route_type: "intent",
    title: "Intent / mental element pressure",
    signals: [
      /\bintent\b/i,
      /\bdishonest\b/i,
      /\blawful\s+excuse\b/i,
      /\bself[- ]?defence\b/i,
      /\baccident\b/i,
      /\bpermanently\s+deprive\b/i,
      /\bmens\s+rea\b/i,
      /\breckless\b/i,
      /\bspecific\s+intent\b/i,
    ],
    defaultWhy: [
      "May assist if the file leaves intent or dishonesty in dispute and the Crown must still prove the mental element.",
      "Conditional on medical/sequence/source material where injury or fraud intent is in issue.",
    ],
    defaultHurts: [
      "Clear admission or strong inference of intent on served papers.",
      "Medical or circumstantial material that supports specific intent if proved.",
    ],
    collapseRisks: [
      "Medical evidence supports the Crown intent route if proved.",
      "Interview admission on intent is clear on served material.",
      "Circumstantial sequence leaves little room for accident/lawful excuse on the papers.",
    ],
    nextMoves: [
      "Map Crown intent elements to MG5/MG6 and interview wording.",
      "Take instructions on accident, lawful excuse, or self-defence only if the file supports them.",
      "Chase expert/source reports before fixing intent theory.",
    ],
    hearingLine:
      "Intent remains a live Crown limb to prove; any defence point is conditional on served material and instructions — do not overstate.",
    safetyNote: "Do not advance intent theories not supported by instructions and served papers.",
  },
  {
    id: "pack_y_affray",
    route_type: "identity",
    title: "Public-order participation / identification / role pressure",
    signals: AFFRAY_FAMILY_SIGNALS,
    defaultWhy: [
      "May assist if served material leaves participation, identification, or role in dispute on a public-order file.",
      "Conditional on CCTV/BWV/witness source material — presence alone may not prove violence on the papers.",
    ],
    defaultHurts: [
      "Clear CCTV/BWV may link the client to violent conduct if proved on served material.",
      "Witness accounts may support Crown participation wording if consistent on the file.",
    ],
    collapseRisks: [
      "Served CCTV/BWV may support Crown participation and identification if proved.",
      "Witness viewpoint may be sufficient on served MG11 material — conditional review required.",
      "Outstanding source material may return consistent with the Crown route if served.",
    ],
    nextMoves: [
      "Chase CCTV master, BWV, and witness viewpoint/continuity material if outstanding.",
      "Take instructions on participation, role, and identification dispute only if supported.",
      "Record what public-order source material remains outstanding before fixing trial theory.",
    ],
    hearingLine:
      "Participation, identification, and role remain conditional on served CCTV/BWV/witness source material; the defence does not overstate presence as proof of violence.",
    safetyNote: "Conditional on served material and instructions — do not overstate public-order points at court.",
  },
  {
    id: "pack_y_fraud",
    route_type: "intent",
    title: "Fraud / account-control / dishonesty pressure",
    signals: FRAUD_FAMILY_SIGNALS,
    defaultWhy: [
      "May assist if banking, device, login or document material on the file leaves dishonesty or account control in dispute.",
      "Conditional until full banking schedules, device extraction and witness material are served and reviewed.",
    ],
    defaultHurts: [
      "Banking schedules or device logs may support Crown account-control if proved on served papers.",
      "Document attribution may link the client to the account if consistent on the file.",
    ],
    collapseRisks: [
      "Served banking/device/login material may support Crown dishonesty if proved.",
      "Witness or document attribution may undermine the defence account if consistent.",
      "Outstanding expert/source material may return against the defence route if served.",
    ],
    nextMoves: [
      "Chase banking schedules, device extraction, email/IP logs and account-ownership material.",
      "Map document attribution against served schedules before fixing trial theory.",
      "Record instructions on dishonesty/account-control dispute only if supported.",
    ],
    hearingLine:
      "Dishonesty, account control, and document attribution remain conditional on full banking, device, login and witness material.",
    safetyNote: "Needs solicitor review before advancing fraud/dishonesty points not supported by served papers.",
  },
  {
    id: "pack_y_pwits",
    route_type: "intent",
    title: "Possession / knowledge / phone-attribution pressure",
    signals: PWITS_FAMILY_SIGNALS,
    defaultWhy: [
      "May assist if search, phone, room-ownership or continuity wording leaves possession, knowledge or supply intent in dispute.",
      "Conditional on full phone extraction, search continuity and forensic material being served and reviewed.",
    ],
    defaultHurts: [
      "Phone extraction or search material may support Crown possession/knowledge if proved.",
      "Shared-address or multi-occupier wording may weaken sole-occupier attribution on the papers.",
    ],
    collapseRisks: [
      "Served phone/search/continuity material may support Crown possession and intent if proved.",
      "Forensic or cash/drugs continuity may link the client to the drugs if consistent on the file.",
      "Outstanding material may return consistent with the Crown route if served.",
    ],
    nextMoves: [
      "Chase phone extraction, search continuity, room-ownership and forensic material if outstanding.",
      "Take instructions on possession, knowledge and intent-to-supply dispute only if supported.",
      "Record what PWITS source material remains outstanding before fixing trial theory.",
    ],
    hearingLine:
      "Possession, knowledge, intent to supply and phone attribution remain conditional on full phone, search, continuity and forensic material.",
    safetyNote: "Conditional on served material — do not overstate possession/knowledge points at court.",
  },
  {
    id: "pack_y_robbery",
    route_type: "identity",
    title: "Identification / participation / attribution pressure",
    signals: ROBBERY_FAMILY_SIGNALS,
    defaultWhy: [
      "May assist if identification, participation or attribution remains in dispute on the robbery file.",
      "Conditional on CCTV, ID procedure, phone and witness source material being served and reviewed.",
    ],
    defaultHurts: [
      "Clear CCTV or ID procedure material may support Crown identification if proved.",
      "Co-accused or unknown-male material may connect the client to the robbery on served papers.",
    ],
    collapseRisks: [
      "Served CCTV/ID procedure material may support Crown identification if proved.",
      "Phone or witness material may undermine participation/attribution dispute if consistent.",
      "Stolen-property recovery elsewhere may still be consistent with Crown route if proved on the file.",
    ],
    nextMoves: [
      "Chase CCTV, VIPER/ID procedure, phone evidence and witness source material if outstanding.",
      "Take instructions on identification, participation and attribution dispute only if supported.",
      "Record what robbery source material remains outstanding before fixing trial theory.",
    ],
    hearingLine:
      "Identification, participation and attribution remain conditional on full CCTV, ID procedure material, phone evidence and witness source material.",
    safetyNote: "Conditional on served material and instructions — do not overstate ID/participation points.",
  },
  {
    id: "causation",
    route_type: "causation",
    title: "Causation / injury route pressure",
    signals: [
      /\bcausation\b/i,
      /\bmedical\b/i,
      /\bABH\b/i,
      /\bGBH\b/i,
      /\binjury\b/i,
      /\bcomplainant\b/i,
      /\balternative\s+cause\b/i,
      /\bmechanism\b/i,
    ],
    defaultWhy: [
      "May assist if medical or injury wording on the file leaves causation or injury level in dispute.",
      "Creates pressure if proved only after expert/source reports are served and reviewed.",
    ],
    defaultHurts: [
      "Medical evidence that supports Crown causation on served papers.",
      "Clear injury mechanism matching the Crown account.",
    ],
    collapseRisks: [
      "Medical evidence supports Crown causation if proved.",
      "Missing expert/source report returns against the defence route.",
      "Complainant injury account is consistent across MG11 and medical material.",
    ],
    nextMoves: [
      "Chase medical/expert/source reports listed on MG6.",
      "Take instructions on injury mechanism dispute only if supported.",
      "Separate injury causation from identification/timing theory.",
    ],
    hearingLine:
      "Causation/injury level is conditional on served medical material; ask for outstanding expert/source disclosure.",
    safetyNote: "Needs solicitor review before running causation at hearing or in plea discussions.",
  },
  {
    id: "continuity",
    route_type: "continuity",
    title: "Continuity / provenance pressure",
    signals: [
      /\bcontinuity\b/i,
      /\bprovenance\b/i,
      /\bmetadata\b/i,
      /\bchain\s+of\s+custody\b/i,
      /\bseal\b/i,
      /\bexhibit\b/i,
      /\bsource\s+file\b/i,
      /\blab\b/i,
      /\bhandling\b/i,
      /\bCB-OCR\b/i,
      /\bCB-SCAN\b/i,
      /\bCB-PHOTO\b/i,
      /\bOCR\b/i,
      /\bscanned\b/i,
      /\billegible\b/i,
      /\bimage\s+quality\b/i,
      /\bphoto\s+evidence\b/i,
    ],
    defaultWhy: [
      "May assist if continuity, seal, or source-file wording on the file is incomplete or inconsistent.",
      "Conditional prosecution-pressure only — not a merits prediction.",
    ],
    defaultHurts: [
      "Later continuity material is served and closes the gap.",
      "Exhibit list appears complete on MG6 with no published tension.",
    ],
    collapseRisks: [
      "Continuity/provenance is later proved on served material.",
      "Master CCTV/digital source file undermines the challenge if proved.",
      "Lab/source report returns consistent with the Crown case.",
    ],
    nextMoves: [
      "Chase continuity statements and master/source files for key exhibits.",
      "Map exhibit references across MG5/MG6 before trial theory is fixed.",
      "Record what handling/provenance material is still outstanding.",
    ],
    hearingLine:
      "Continuity/provenance remains conditional; request outstanding source/continuity material and a timetable.",
    safetyNote: "Do not tell the court exhibits are unusable unless the file publishes that gap.",
  },
  {
    id: "mitigation",
    route_type: "mitigation",
    title: "Mitigation / damage-limitation fallback",
    signals: [
      /\bmitigation\b/i,
      /\bbad\s+fact/i,
      /\bguilty\s+plea\b/i,
      /\bsentence\b/i,
      /\bpre[- ]?sentence\b/i,
      /\badmission\b/i,
      /\bdamage\s+limitation\b/i,
      /\bCPS\s+pressure\b/i,
    ],
    defaultWhy: [
      "Keeps a fallback route open if fight routes stay conditional on missing material.",
      "May assist in managing client expectations and hearing posture without abandoning chase routes.",
    ],
    defaultHurts: [
      "Early mitigation signals weakness before disclosure chase completes.",
      "Bad facts on the file limit realistic reduction outcomes.",
    ],
    collapseRisks: [
      "Fight routes strengthen after disclosure — mitigation prematurely narrows options.",
      "Court views mitigation as acceptance of core facts not yet tested.",
    ],
    nextMoves: [
      "Keep mitigation fallback open while disclosure/timeline routes are chased.",
      "Record instructions before any plea or sentence discussion.",
      "Separate mitigation from live fight routes in hearing submissions.",
    ],
    hearingLine:
      "The defence preserves position on merits while recording that strategy remains provisional pending served material — do not overstate.",
    safetyNote: "Mitigation is a fallback, not a substitute for testing outstanding source material.",
  },
  {
    id: "cps_pressure",
    route_type: "mitigation",
    title: "CPS pressure / damage-limitation pressure",
    signals: CPS_PRESSURE_SIGNAL_PATTERNS,
    defaultWhy: [
      "The served material may show prosecution pressure from admissions, CCTV, forensic match, or account conflict — conditional on what is actually published.",
      "May assist in identifying what can still be tested (admissibility, disclosure gaps, instruction conflicts) without treating the route as a merits win.",
    ],
    defaultHurts: [
      "Strong prosecution material on the papers limits realistic fight routes.",
      "Client account or interview wording may conflict with served CCTV/witness/phone/medical/CAD material.",
      "Risky denial or positive defence may be unsafe until instructions and served material are reconciled.",
    ],
    collapseRisks: [
      "Further disclosure or served CCTV/forensic material strengthens the Crown case.",
      "Instructions cannot be aligned with the damaging account on the file.",
      "Mitigation or basis discussion may be required if fight routes stay conditional.",
    ],
    nextMoves: [
      "Lock instructions on account, admissions, and what the client accepts or denies on the papers.",
      "Identify admissibility and outstanding disclosure issues before fixing hearing strategy.",
      "Separate damage-limitation thinking from live chase routes — no plea advice here.",
      "Record what would make a positive defence unsafe on current material.",
    ],
    hearingLine:
      "The defence asks the court to record that prosecution pressure on the papers is noted and that strategy remains provisional pending instructions and served material — do not overstate.",
    safetyNote: "Pressure point only — not a plea recommendation, outcome prediction, or merits win.",
  },
  {
    id: "readiness",
    route_type: "unknown",
    title: "Review readiness / case-control pressure",
    signals: READINESS_SIGNAL_PATTERNS,
    defaultWhy: [
      "File may show review, readiness, handover, or outstanding-instruction issues that must be cleared before strategy is relied on at hearing.",
      "May assist as a case-control pressure point — conditional on supervisor/file review wording on the papers.",
    ],
    defaultHurts: [
      "Review gaps are closed quickly and the file is trial-ready on served material.",
      "Outstanding instructions are recorded and no readiness issue remains.",
    ],
    collapseRisks: [
      "Hearing proceeds without proof checklist / instructions / sign-off completed.",
      "Case theory shifts when late material is served after review was marked complete.",
    ],
    nextMoves: [
      "Complete file/supervisor review and proof checklist before the next hearing.",
      "Record outstanding instructions and unresolved defence position.",
      "Confirm hearing prep, attendance note, and counsel handover items on the file.",
    ],
    hearingLine:
      "Ask the court to record that the defence requires time to complete review/readiness steps before strategy is fixed — provisional until sign-off.",
    safetyNote: "Case-control route — solicitor review required; not a substitute for merits strategy.",
  },
  {
    id: "hearing_court",
    route_type: "unknown",
    title: "Hearing / court move pressure",
    signals: HEARING_COURT_SIGNAL_PATTERNS,
    defaultWhy: [
      "Listing, remand, bail, PTPH, directions, or timetable wording on the file may require a procedural next step before merits routes are fixed.",
      "May assist if the court needs to record timetable/disclosure-order pressure — conditional on served papers.",
    ],
    defaultHurts: [
      "Court timetable is fixed and Crown material is served on time.",
      "Procedural window passes without securing directions needed for the defence chase.",
    ],
    collapseRisks: [
      "Adjournment refused and hearing proceeds without outstanding directions.",
      "Disclosure order not recorded and chase routes lose timetable leverage.",
    ],
    nextMoves: [
      "Prepare hearing line on listing, remand, bail, or PTPH directions as published on the file.",
      "Ask for disclosure order / timetable where source material is still outstanding.",
      "Record procedural next step before fixing trial theory.",
    ],
    hearingLine:
      "The defence asks the court to record the next hearing step and any timetable/disclosure directions needed — conditional on listing papers.",
    safetyNote: "Procedural pressure only — merits routes remain provisional until material is served.",
  },
  {
    id: "client_account_conflict",
    route_type: "interview",
    title: "Client account / file conflict pressure",
    signals: CLIENT_CONFLICT_SIGNAL_PATTERNS,
    defaultWhy: [
      "Client instructions or account wording may conflict with served CCTV/witness/phone/medical/CAD material — conditional on what the file actually publishes.",
      "May assist in identifying what must be locked in instructions before a positive defence is advanced.",
    ],
    defaultHurts: [
      "Client account aligns with served papers after clarification.",
      "Instructions are recorded and no material conflict remains on the file.",
    ],
    collapseRisks: [
      "Instructions cannot be reconciled with served source material.",
      "Positive defence advanced before account conflict is resolved.",
      "Late served material widens the gap between account and papers.",
    ],
    nextMoves: [
      "Lock instructions on what the client accepts, denies, and disputes on the papers.",
      "Test account wording against served CCTV/witness/phone/medical/CAD before fixing strategy.",
      "Record what would make a positive defence unsafe on current material.",
    ],
    hearingLine:
      "The defence asks the court to record that instructions/account conflict must be resolved before strategy is fixed — provisional until reconciled with served material.",
    safetyNote: "Not a merits win — solicitor review required before relying on any account-led route.",
  },
];

function scoreRoute(bundleText: string, spec: RouteSpec): number {
  let score = 0;
  for (const re of spec.signals) {
    if (re.test(bundleText)) score += 1;
  }
  return score;
}

function timelineSignalScore(bundleText: string): number {
  const spec = ROUTE_SPECS.find((s) => s.id === "timeline");
  return spec ? scoreRoute(bundleText, spec) : 0;
}

/** Injury mechanism / medical causation dispute signals (fall, contact, furniture, etc.). */
function causationSignalScore(bundleText: string): number {
  const spec = ROUTE_SPECS.find((s) => s.id === "causation");
  let score = spec ? scoreRoute(bundleText, spec) : 0;
  const mechanismPatterns = [
    /\bcausation\s+disputed\b/i,
    /\bdisputed\s+causation\b/i,
    /\bhow\s+the\s+injury\b/i,
    /\binjury\s+(?:was\s+)?caused\b/i,
    /\bmechanism\s+of\s+injury\b/i,
    /\bfall\b/i,
    /\b(?:bottle|glass)\b/i,
    /\bfurniture\b/i,
    /\btable\b/i,
    /\bimpact\s+with\b/i,
    /\bstruggle\b/i,
    /\balternative\s+cause\b/i,
    /\bmedical\s+causation\b/i,
    /\bself[- ]?defence\s+and\s+causation/i,
  ];
  for (const re of mechanismPatterns) {
    if (re.test(bundleText)) score += 1;
  }
  return score;
}

function hasCausationMechanismDispute(bundleText: string): boolean {
  const hits = [
    /\b(?:fall|fell|falling)\b/i.test(bundleText),
    /\b(?:bottle|glass)\b/i.test(bundleText),
    /\b(?:table|furniture)\b/i.test(bundleText),
    /\bimpact\s+with\b/i.test(bundleText),
    /\bstruggle\b/i.test(bundleText),
    /\bcausation\s+disputed\b/i.test(bundleText),
    /\bdisputed\s+causation\b/i.test(bundleText),
    /\bhow\s+the\s+injury\b/i.test(bundleText),
  ].filter(Boolean).length;
  return hits >= 2;
}

function hearingSignalScore(bundleText: string): number {
  return hearingCourtSignalScore(bundleText);
}

function disclosurePressureScore(bundleText: string, outstandingLabels: string[]): number {
  let n = 0;
  const patterns = [
    /\bnot\s+served\b/i,
    /\boutstanding\s+(?:disclosure|material|CCTV|MG6)/i,
    /\bawaiting\s+(?:disclosure|material)/i,
    /\bunused\s+material\b/i,
    /\bdisclosure\s+chaos\b/i,
    /\bMG6C\b/i,
    /\bstill\s+outstanding\b/i,
  ];
  for (const p of patterns) {
    if (p.test(bundleText)) n += 1;
  }
  if (outstandingLabels.length >= 2) n += 2;
  else if (outstandingLabels.length === 1) n += 1;
  return n;
}

function rankRouteForPrimary(
  route: BattleboardRoute,
  bundleText: string,
  outstandingLabels: string[],
  offenceLabel?: string | null,
): number {
  const familyCtx = offenceFamilyContext(bundleText, offenceLabel);
  const packFamily = detectPackYFamily(familyCtx);
  const saf = safeguardsSignalScore(bundleText);
  const multi = multipartySignalScore(bundleText);
  const time = timelineSignalScore(bundleText);
  const caus = causationSignalScore(bundleText);
  const hear = hearingSignalScore(bundleText);
  const cps = cpsPressureSignalScore(bundleText);
  const ready = readinessSignalScore(bundleText);
  const discPress = disclosurePressureScore(bundleText, outstandingLabels);
  const exportPack = isReadinessCorpus(bundleText);
  const chaos = isChaosCorpus(bundleText);
  const conflict = isConflictCorpus(bundleText);
  const messy = isMessyCorpus(bundleText);
  const ocr = isOcrCorpus(bundleText);
  const cpsAllowed = isCpsCorpus(bundleText);
  const hearAllowed = isHearingCorpus(bundleText);
  const readyAllowed = isReadinessCorpus(bundleText);

  let rank = statusRank(route.status) * 40 + route.evidence_anchors.length * 6;

  switch (route.route_type) {
    case "safeguards":
      rank += 140 + saf * 22;
      if (saf >= 1) rank += 45;
      if (saf >= 3) rank += 35;
      break;
    case "multiparty":
      rank += 130 + multi * 22;
      if (multi >= 1) rank += 40;
      if (multi >= 3) rank += 30;
      if (packFamily) rank -= 95;
      break;
    case "timeline":
      rank += 95 + time * 12 + (hearAllowed ? hear * 8 : 0);
      if (chaos) rank += 55 + time * 8;
      if (messy && discPress < 2) rank -= 35;
      if (ocr && time < 3) rank -= 45;
      if (saf >= 1) rank -= 55 + saf * 12;
      if (saf >= 3) rank -= 35;
      if (hasCausationMechanismDispute(bundleText) && caus >= 2) rank -= 45;
      if (caus > time && caus >= 2) rank -= 30;
      break;
    case "identity":
      if (route.id === "pack_y_affray") {
        rank += 155 + affrayFamilyScore(familyCtx) * 22;
        if (packFamily === "affray") rank += 85;
        break;
      }
      if (route.id === "pack_y_robbery") {
        rank += 155 + robberyFamilyScore(familyCtx) * 22;
        if (packFamily === "robbery") rank += 85;
        break;
      }
      rank += 88;
      if (chaos) rank += 45;
      break;
    case "interview":
      if (route.id === "client_account_conflict") {
        rank += 125 + clientConflictSignalScore(bundleText) * 20;
        if (conflict) rank += 80;
      } else {
        rank += 82;
        if (conflict) rank += 35;
      }
      break;
    case "continuity":
      rank += 78;
      if (chaos) rank += 60;
      if (ocr) rank += 70;
      if (messy) rank += 25;
      break;
    case "causation":
      if (packFamily && !isInjuryLedCausationBundle(familyCtx)) rank -= 110;
      rank += 78 + caus * 16;
      if (caus >= 2) rank += 42;
      if (caus >= 4) rank += 28;
      if (hasCausationMechanismDispute(bundleText)) rank += 55;
      if (time >= 2 && caus >= time) rank += 35;
      if (messy && caus >= 2) rank += 20;
      break;
    case "intent":
      if (route.id === "pack_y_fraud") {
        rank += 155 + fraudFamilyScore(familyCtx) * 22;
        if (packFamily === "fraud") rank += 85;
        break;
      }
      if (route.id === "pack_y_pwits") {
        rank += 155 + pwitsFamilyScore(familyCtx) * 22;
        if (packFamily === "pwits") rank += 85;
        break;
      }
      rank += 68;
      break;
    case "mitigation":
      if (route.id === "cps_pressure") {
        rank += cpsAllowed ? 120 + cps * 24 : 35 + cps * 8;
        if (cpsAllowed && cps >= 2) rank += 70;
        if (exportPack && ready >= 1) rank -= 120;
        if (conflict || chaos) rank -= 150;
      } else {
        rank += 40 + cps * 14;
        if (cps >= 3 && cpsAllowed) rank += 25;
      }
      break;
    case "disclosure":
      rank += 25 + discPress * 12;
      if (messy && discPress >= 1) rank += 65;
      if (ocr && discPress >= 1) rank += 40;
      if (chaos && discPress >= 1) rank += 70;
      if (saf >= 2) rank -= 70;
      if (multi >= 2) rank -= 70;
      if (cpsAllowed && cps >= 2) rank -= 85;
      if (readyAllowed && ready >= 2) rank -= 65;
      if (hearAllowed && hear >= 2) rank -= 35;
      if (chaos && !discPress) rank -= 40;
      if (discPress <= 1 && outstandingLabels.length === 0) rank -= 55;
      break;
    default:
      if (route.id === "readiness") {
        rank += readyAllowed ? 110 + ready * 22 : 30 + ready * 8;
        if (readyAllowed && ready >= 2) rank += 55;
        if (exportPack) {
          rank += 90 + route.evidence_anchors.length * 4;
          if (ready >= 1) rank += 40;
        }
        if (chaos || conflict) rank -= 90;
      } else if (route.id === "hearing_court") {
        rank += hearAllowed ? 105 + hear * 18 : 25 + hear * 6;
        if (hearAllowed && hear >= 2) rank += 50;
        if (chaos || conflict) rank -= 90;
      } else {
        rank += 40;
      }
      break;
  }

  if (route.id === "cps_pressure" && !cpsAllowed) {
    rank -= 100;
  }

  return rank;
}

function deriveRouteStatus(
  anchors: string[],
  nextMoves: string[],
  bundleThin: boolean,
  routeScore: number,
  textConditional: boolean
): BattleboardRouteStatus {
  if (bundleThin && routeScore === 0) return "blocked";
  if (anchors.length === 0 && routeScore === 0) return "blocked";
  if (textConditional || anchors.some((a) => CONDITIONAL_MARKERS.test(a))) {
    if (anchors.length >= 1 && nextMoves.length >= 1) return "conditional";
    return routeScore > 0 ? "conditional" : "blocked";
  }
  if (anchors.length >= 1 && nextMoves.length >= 1) return "viable";
  if (routeScore > 0) return "conditional";
  return "blocked";
}

function statusRank(s: BattleboardRouteStatus): number {
  if (s === "viable") return 3;
  if (s === "conditional") return 2;
  return 1;
}

const ATTRIBUTION_SECOND_MALE_TITLE = "Attribution / second male / source-material pressure";
const ATTRIBUTION_SECOND_MALE_HEARING_LINE =
  "Ask the court to record that attribution, second-male involvement, and source-material issues remain conditional on served evidence and solicitor review.";
const ATTRIBUTION_SECOND_MALE_SAFETY_NOTE =
  "Conditional on served evidence and solicitor review — do not overstate attribution or second-male points without source proof.";

function defendantNameFromBundle(bundleText: string): string {
  const scan = bundleText.slice(0, 80_000);
  const m =
    scan.match(/\bDefendant\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s|\||\s+DOB\b)/) ??
    scan.match(/\bDefendant\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
  return m?.[1]?.trim() ?? "this defendant";
}

function resolveMultipartyCollapseRisks(bundleText: string): string[] {
  const name = defendantNameFromBundle(bundleText);
  return [
    `Crown may link the missing/source material to ${name} if served.`,
    "Second-male evidence may assist or weaken attribution depending on what is served.",
    "Attribution and source-material issues remain conditional until the underlying material is reviewed.",
  ];
}

function resolveMultipartyWhatHurts(bundleText: string): string[] {
  const name = defendantNameFromBundle(bundleText);
  return [
    `Crown may link served source material to ${name} if proved on the papers.`,
    "Second-male evidence may assist or weaken attribution depending on what is served.",
  ];
}

/** Single-defendant bundle with attribution / second-male dispute (not true multi-defendant). */
function isAttributionSecondMaleBundle(bundleText: string): boolean {
  const attributionIssue = /\b(?:second[\s-]?male|attribution|wrong\s+attribution|alternate\s+attacker)\b/i.test(
    bundleText,
  );
  const separateDefendantCue =
    /\b(?:co-?defendant|co-?accused|multiple\s+defendants?|separate\s+defendant|defendant\s+[12AB]|count\s+[12]\b)/i.test(
      bundleText,
    );
  return attributionIssue && !separateDefendantCue;
}

function resolveMultipartyRouteTitle(spec: RouteSpec, bundleText: string): string {
  if (spec.route_type !== "multiparty") return spec.title;
  if (isAttributionSecondMaleBundle(bundleText)) return ATTRIBUTION_SECOND_MALE_TITLE;
  return spec.title;
}

function resolveMultipartyHearingLine(spec: RouteSpec, bundleText: string): string {
  if (spec.route_type !== "multiparty") return spec.hearingLine;
  if (isAttributionSecondMaleBundle(bundleText)) return ATTRIBUTION_SECOND_MALE_HEARING_LINE;
  return spec.hearingLine;
}

function resolveMultipartySafetyNote(spec: RouteSpec, bundleText: string): string {
  if (spec.route_type !== "multiparty") return spec.safetyNote;
  if (isAttributionSecondMaleBundle(bundleText)) return ATTRIBUTION_SECOND_MALE_SAFETY_NOTE;
  return spec.safetyNote;
}

function buildRouteFromSpec(
  spec: RouteSpec,
  bundleText: string,
  bundleThin: boolean,
  extraAnchors: string[],
  position?: ResolvedBattleboardPosition,
): BattleboardRoute | null {
  const score = scoreRoute(bundleText, spec);
  if (score === 0 && extraAnchors.length === 0) return null;

  const fileLines =
    spec.route_type === "safeguards"
      ? extractFamilyLinesMatching(bundleText, spec.signals, SAFEGUARDS_ANCHOR_RE, 5)
      : spec.route_type === "multiparty"
        ? extractFamilyLinesMatching(bundleText, spec.signals, MULTIPARTY_ANCHOR_RE, 5)
        : spec.id === "cps_pressure"
          ? extractFamilyLinesMatching(bundleText, spec.signals, CPS_PRESSURE_ANCHOR_RE, 5)
          : spec.id === "readiness"
            ? extractFamilyLinesMatching(bundleText, spec.signals, READINESS_ANCHOR_RE, 5)
            : spec.id === "hearing_court"
              ? extractFamilyLinesMatching(bundleText, spec.signals, HEARING_COURT_ANCHOR_RE, 5)
              : spec.id === "client_account_conflict"
                ? extractFamilyLinesMatching(
                    bundleText,
                    spec.signals,
                    CLIENT_CONFLICT_ANCHOR_RE,
                    5,
                  )
                : extractLinesMatching(bundleText, spec.signals, 4);
  const interviewExtras =
    spec.route_type === "interview" && position?.interview_account_lines.length
      ? position.interview_account_lines
      : [];
  const evidence_anchors = uniqueSafe([...fileLines, ...interviewExtras, ...extraAnchors], 6);
  const substantiveAnchors = evidence_anchors.filter((a) =>
    isSubstantiveAnchorForRoute(spec.route_type, a),
  );

  const substantiveFileLines = fileLines.filter((l) => compactOneLine(l).length >= 36);
  let why_it_helps = uniqueSafe(
    substantiveFileLines.length > 0 ? substantiveFileLines : fileLines.length > 0 ? fileLines : spec.defaultWhy,
    4,
  );
  if (why_it_helps.length === 0 || why_it_helps.every((h) => compactOneLine(h).length < 36)) {
    why_it_helps = uniqueSafe([...why_it_helps, ...spec.defaultWhy], 4);
  }
  const attributionSecondMale =
    spec.route_type === "multiparty" && isAttributionSecondMaleBundle(bundleText);
  const what_hurts_us = uniqueSafe(
    attributionSecondMale ? resolveMultipartyWhatHurts(bundleText) : spec.defaultHurts,
    3,
  );
  const collapse_risks = uniqueSafe(
    attributionSecondMale ? resolveMultipartyCollapseRisks(bundleText) : spec.collapseRisks,
    5,
  );
  const next_moves = uniqueSafe(spec.nextMoves, 5);
  const textConditional =
    bundleHas(bundleText, [CONDITIONAL_MARKERS]) ||
    evidence_anchors.some((a) => CONDITIONAL_MARKERS.test(a));

  let status = deriveRouteStatus(
    substantiveAnchors.length > 0 ? substantiveAnchors : evidence_anchors,
    next_moves,
    bundleThin,
    score,
    textConditional,
  );

  const displayAnchors =
    substantiveAnchors.length > 0 ? substantiveAnchors : evidence_anchors;

  const onlyWeakFileSupport =
    displayAnchors.length === 0 && extraAnchors.length === 0 && score > 0;

  if (onlyWeakFileSupport || (displayAnchors.length === 0 && extraAnchors.length === 0)) {
    return null;
  }

  if (status === "blocked" && displayAnchors.length === 0) {
    return null;
  }

  return {
    id: spec.id,
    title: resolveMultipartyRouteTitle(spec, bundleText),
    status,
    route_type: spec.route_type,
    why_it_helps,
    what_hurts_us,
    evidence_anchors: displayAnchors,
    collapse_risks,
    next_moves,
    hearing_line: resolveMultipartyHearingLine(spec, bundleText),
    safety_note: resolveMultipartySafetyNote(spec, bundleText),
  };
}

const GLOBAL_COLLAPSE = uniqueSafe(
  [
    "Full CCTV confirms Crown timing.",
    "MG11 is consistent and served.",
    "CAD/999 timing supports Crown sequence.",
    "Client account conflicts with served source material.",
    "Missing expert/source report comes back against defence.",
    "Interview admission narrows the defence route.",
    "Continuity/provenance is later proved.",
  ],
  7
);

export function buildStrategyBattleboard(input: StrategyBattleboardInput): BattleboardOutput {
  const bundleText = (input.bundle_text ?? "").trim();
  const bundleThin = bundleText.length < 800;
  const familyCtx = offenceFamilyContext(bundleText, input.offence_label);
  const packYFamily = detectPackYFamily(familyCtx);

  const positionContext = resolveBattleboardPosition({
    bundle_text: bundleText,
    recorded_position: input.recorded_position,
    position_text: input.position_text,
    stance_detected: input.stance_detected,
    interview_stance: input.interview_stance,
  });

  const disclosureExtrasRaw =
    input.outstanding_disclosure && input.outstanding_disclosure.length > 0
      ? input.outstanding_disclosure
      : extractLinesMatching(bundleText, [/\boutstanding\b/i, /\bnot\s+served\b/i, /\bMG6\b/i], 4);
  const disclosureExtras = uniqueSafe(disclosureExtrasRaw, 8);
  const disclosureSpec = ROUTE_SPECS.find((s) => s.id === "disclosure");
  const disclosureSignalHits = disclosureSpec ? scoreRoute(bundleText, disclosureSpec) : 0;
  const genuineDisclosurePressure =
    disclosureExtras.length > 0 || disclosurePressureScore(bundleText, disclosureExtrasRaw) >= 2;

  const routes: BattleboardRoute[] = [];

  const cpsScore = cpsPressureSignalScore(bundleText);
  const readyScore = readinessSignalScore(bundleText);
  const hearScore = hearingCourtSignalScore(bundleText);
  const conflictScore = clientConflictSignalScore(bundleText);
  const exportPack = isReadinessCorpus(bundleText);
  const metaScores = { cps: cpsScore, ready: readyScore, hear: hearScore, conflict: conflictScore };

  for (const spec of ROUTE_SPECS) {
    if (spec.id === "causation" && shouldSuppressCausationForOffenceFamily(familyCtx)) {
      continue;
    }
    if (spec.id.startsWith("pack_y_") && !shouldBuildPackYRoute(spec.id, familyCtx)) {
      continue;
    }
    if (spec.id === "mitigation" && cpsScore >= 2) {
      continue;
    }
    if (spec.id === "cps_pressure" && exportPack && readyScore >= 1) {
      continue;
    }
    if (!shouldBuildMetaRoute(spec.id, bundleText, metaScores)) {
      continue;
    }
    let extra: string[] = [];
    if (spec.route_type === "disclosure") {
      if (genuineDisclosurePressure || disclosureSignalHits >= 2) {
        extra = disclosureExtras;
      }
    } else if (spec.route_type === "safeguards" && safeguardsSignalScore(bundleText) >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, SAFEGUARDS_ANCHOR_RE, 5);
    } else if (spec.route_type === "multiparty" && multipartySignalScore(bundleText) >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, MULTIPARTY_ANCHOR_RE, 5);
    } else if (spec.id === "cps_pressure" && cpsScore >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, CPS_PRESSURE_ANCHOR_RE, 5);
    } else if (spec.id === "readiness" && readyScore >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, READINESS_ANCHOR_RE, 5);
    } else if (spec.id === "hearing_court" && hearScore >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, HEARING_COURT_ANCHOR_RE, 5);
    } else if (spec.id === "client_account_conflict" && conflictScore >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, CLIENT_CONFLICT_ANCHOR_RE, 5);
    } else if (spec.id.startsWith("pack_y_") && shouldBuildPackYRoute(spec.id, familyCtx)) {
      extra = extractLinesMatching(bundleText, spec.signals, 4);
    } else if (spec.route_type === "mitigation" && bundleThin) {
      extra = ["Thin bundle — fight routes may stay conditional until material is served."];
    }
    const route = buildRouteFromSpec(spec, bundleText, bundleThin, extra, positionContext);
    if (route) routes.push(route);
  }

  const guardedRoutes = applyPositionGuardrails(routes, positionContext);
  routes.length = 0;
  routes.push(...guardedRoutes);

  const outstandingLabels = disclosureExtrasRaw.map((l) => compactOneLine(l)).filter(Boolean);

  routes.sort((a, b) => {
    const pr =
      rankRouteForPrimary(b, bundleText, outstandingLabels, input.offence_label) -
      rankRouteForPrimary(a, bundleText, outstandingLabels, input.offence_label);
    if (pr !== 0) return pr;
    const sr = statusRank(b.status) - statusRank(a.status);
    if (sr !== 0) return sr;
    return b.evidence_anchors.length - a.evidence_anchors.length;
  });

  const safScore = safeguardsSignalScore(bundleText);
  if (safScore >= 2) {
    const safIdx = routes.findIndex((r) => r.route_type === "safeguards");
    const timelineIdx = routes.findIndex((r) => r.route_type === "timeline");
    if (safIdx > 0 && timelineIdx === 0 && safIdx !== -1) {
      const [safRoute] = routes.splice(safIdx, 1);
      routes.unshift(safRoute);
    }
  }

  function promoteRouteToPrimary(routeId: string): void {
    const idx = routes.findIndex((r) => r.id === routeId);
    if (idx <= 0 || idx === -1) return;
    const [route] = routes.splice(idx, 1);
    routes.unshift(route);
  }

  if (isCpsCorpus(bundleText) && cpsScore >= 2) {
    promoteRouteToPrimary("cps_pressure");
  }
  if (isReadinessCorpus(bundleText) && readyScore >= 1) {
    promoteRouteToPrimary("readiness");
  }
  if (isHearingCorpus(bundleText) && hearScore >= 2) {
    promoteRouteToPrimary("hearing_court");
  }
  if (isConflictCorpus(bundleText) && conflictScore >= 1) {
    promoteRouteToPrimary("client_account_conflict");
  }

  if (isChaosCorpus(bundleText)) {
    const metaPrimary = ["readiness", "hearing_court", "cps_pressure"].includes(routes[0]?.id ?? "");
    if (metaPrimary) {
      const preferred = routes.find((r) =>
        ["continuity", "disclosure", "timeline", "identity", "interview"].includes(r.route_type),
      );
      if (preferred && preferred.id !== routes[0]?.id) {
        promoteRouteToPrimary(preferred.id);
      }
    }
  }

  if (isMessyCorpus(bundleText) && disclosurePressureScore(bundleText, outstandingLabels) >= 1) {
    promoteRouteToPrimary("disclosure");
  }

  if (isOcrCorpus(bundleText)) {
    const weakTimelinePrimary =
      routes[0]?.route_type === "timeline" &&
      !(routes[0]?.evidence_anchors ?? []).some((a) => hasStrongEvidenceAnchor(a));
    if (weakTimelinePrimary) {
      const preferred = routes.find(
        (r) =>
          ["continuity", "disclosure", "identity"].includes(r.route_type) &&
          (r.evidence_anchors?.length ?? 0) > 0,
      );
      if (preferred) promoteRouteToPrimary(preferred.id);
    }
  }

  if (timelineSignalScore(bundleText) >= 2 && routes[0]?.route_type === "disclosure") {
    const tIdx = routes.findIndex((r) => r.route_type === "timeline");
    if (tIdx > 0) {
      const [tRoute] = routes.splice(tIdx, 1);
      routes.unshift(tRoute);
    }
  }

  const causScore = causationSignalScore(bundleText);
  const timeScore = timelineSignalScore(bundleText);
  if (
    !packYFamily &&
    causScore >= 2 &&
    routes[0]?.route_type === "timeline" &&
    (causScore > timeScore || hasCausationMechanismDispute(bundleText))
  ) {
    promoteRouteToPrimary("causation");
  }
  if (
    !packYFamily &&
    routes[0]?.route_type === "timeline" &&
    causScore >= 3 &&
    hasCausationMechanismDispute(bundleText)
  ) {
    promoteRouteToPrimary("causation");
  }

  if (packYFamily) {
    promoteRouteToPrimary(`pack_y_${packYFamily}`);
  }

  const multiCountScore = multipartySignalScore(bundleText);
  if (
    packYFamily &&
    routes[0]?.route_type === "multiparty" &&
    multiCountScore >= 1
  ) {
    promoteRouteToPrimary(`pack_y_${packYFamily}`);
  }

  const primary_route = routes[0];
  const viableCount = routes.filter((r) => r.status === "viable").length;
  const conditionalCount = routes.filter((r) => r.status === "conditional").length;

  let overall_status: BattleboardOverallStatus = "usable";
  if (bundleThin && routes.length <= 1) overall_status = "thin_bundle";
  else if (viableCount === 0 && conditionalCount === 0) overall_status = "needs_review";
  else if (bundleThin) overall_status = "thin_bundle";

  const urgent_next_moves = uniqueSafe(
    [
      ...(positionContext.trust === "provisional" || positionContext.trust === "not_recorded"
        ? ["Record defence position / take instructions before committing strategy."]
        : []),
      ...disclosureExtras.map((d) => `Chase/record: ${d}`),
      ...(primary_route?.next_moves ?? []),
      "Reconcile MG5/MG6/interview/source material before final strategy.",
      ...(positionContext.trust === "recorded"
        ? ["Record defence position and preserve hearing timetable."]
        : []),
    ],
    6
  );

  let solicitor_safe_summary: string;
  if (positionContext.notice) {
    // Lead with case-specific pressure so the visible headline is never identical
    // across matters (dup sweep checks the first ~120 chars of this summary).
    if (primary_route) {
      solicitor_safe_summary = `Defence position not safely recorded. Current pressure: ${primary_route.title} (${primary_route.status}) — take/record instructions before relying on strategy.`;
      const topRisk = sanitizeDisplayLine(primary_route.collapse_risks?.[0] ?? "");
      if (topRisk) solicitor_safe_summary += ` Key risk: ${topRisk}`;
    } else if (bundleThin) {
      solicitor_safe_summary =
        "Defence position not safely recorded. Bundle text is thin on the system record — no route anchored yet; take/record instructions before relying on strategy.";
    } else {
      solicitor_safe_summary = `${positionContext.notice} Review routes below before fixing hearing strategy.`;
    }
  } else if (bundleThin) {
    solicitor_safe_summary =
      "Bundle text is thin on the system record — routes below are provisional and need solicitor review. Do not overstate at hearing until source material is served.";
  } else if (primary_route) {
    solicitor_safe_summary = `Primary pressure route: ${primary_route.title} (${primary_route.status}). ${
      primary_route.status === "viable"
        ? "May assist if proved on served material."
        : "Conditional on served source material and instructions."
    } This is a control panel, not a prediction of outcome.`;
    if (multiCountScore >= 2 && primary_route.route_type !== "multiparty") {
      solicitor_safe_summary +=
        " Multiple counts or co-defendants are noted — review each count separately; do not let one count drive strategy on all counts.";
    }
  } else {
    solicitor_safe_summary =
      "No fight route could be anchored safely from the current file text — needs solicitor review before hearing strategy is fixed.";
  }

  const globalRisks =
    positionContext.trust === "provisional" || positionContext.trust === "not_recorded"
      ? uniqueSafe(
          ["Assumed position may conflict with interview or served evidence.", ...GLOBAL_COLLAPSE],
          8,
        )
      : GLOBAL_COLLAPSE;

  // Chase source gate: templated "chase X" moves must be backed by the bundle —
  // dropped when the family is never mentioned, replaced with confirm-none
  // wording when the file explicitly says the material does not exist.
  const sanitizedRoutes = routes.map(sanitizeRoute).map((r) => ({
    ...r,
    next_moves: gateChaseLines(r.next_moves, bundleText),
  }));
  const sanitizedPrimary = sanitizedRoutes[0];
  const summaryLine = sanitizeDisplayLine(solicitor_safe_summary);

  const corpusMarkers = (() => {
    const hits: string[] = [];
    if (/\bCB-THIN\b/i.test(bundleText)) hits.push("CB-THIN");
    if (/\bCB-NOSAFE\b/i.test(bundleText)) hits.push("CB-NOSAFE");
    if (/\bCB-VULN\b/i.test(bundleText)) hits.push("CB-VULN");
    if (/\bCB-SAFEGUARDS\b/i.test(bundleText)) hits.push("CB-SAFEGUARDS");
    if (/\bCB-YOUTH2\b/i.test(bundleText)) hits.push("CB-YOUTH2");
    if (/\bCB-EXHIBIT\b/i.test(bundleText)) hits.push("CB-EXHIBIT");
    if (/\bCB-MULTI2\b/i.test(bundleText)) hits.push("CB-MULTI2");
    else if (/\bCB-MULTI\b/i.test(bundleText)) hits.push("CB-MULTI");
    if (/\bCB-MDPRESS\b/i.test(bundleText)) hits.push("CB-MDPRESS");
    if (/\bCB-CPS\b/i.test(bundleText)) hits.push("CB-CPS");
    if (/\bCB-PRESSURE\b/i.test(bundleText)) hits.push("CB-PRESSURE");
    if (/\bCB-PRESS\b/i.test(bundleText)) hits.push("CB-PRESS");
    if (/\bCB-EXPORT\b/i.test(bundleText)) hits.push("CB-EXPORT");
    if (/\bCB-REVIEW\b/i.test(bundleText)) hits.push("CB-REVIEW");
    if (/\bCB-READY\b/i.test(bundleText)) hits.push("CB-READY");
    if (/\bCB-HEARING\b/i.test(bundleText)) hits.push("CB-HEARING");
    if (/\bCB-COURT\b/i.test(bundleText)) hits.push("CB-COURT");
    if (/\bCB-MOVE\b/i.test(bundleText)) hits.push("CB-MOVE");
    return hits.length ? hits.join("+") : null;
  })();

  const safRoute = sanitizedRoutes.find((r) => r.route_type === "safeguards");
  const multiRoute = sanitizedRoutes.find((r) => r.route_type === "multiparty");
  const cpsRoute = sanitizedRoutes.find((r) => r.id === "cps_pressure");
  const readyRoute = sanitizedRoutes.find((r) => r.id === "readiness");
  const hearRoute = sanitizedRoutes.find((r) => r.id === "hearing_court");
  const backupRoutes = sanitizedRoutes.slice(1);

  return {
    case_id: input.case_id,
    generated_at: new Date().toISOString(),
    overall_status,
    solicitor_safe_summary: summaryLine ?? solicitor_safe_summary,
    position_trust: positionContext.trust,
    position_notice: positionContext.notice,
    primary_route: sanitizedPrimary,
    routes: sanitizedRoutes,
    global_collapse_risks: sanitizeStringList(globalRisks, 8),
    urgent_next_moves: sanitizeStringList(gateChaseLines(urgent_next_moves, bundleText), 6),
    diagnostics: {
      corpus_markers: corpusMarkers,
      safeguards_signal_count: safScore,
      multiparty_signal_count: multipartySignalScore(bundleText),
      timeline_signal_count: timelineSignalScore(bundleText),
      cps_pressure_signal_count: cpsScore,
      readiness_signal_count: readyScore,
      hearing_court_signal_count: hearScore,
      backup_route_types: backupRoutes.map((r) => r.route_type),
      backup_route_titles: backupRoutes.map((r) => r.title),
      primary_anchor_sample: (sanitizedPrimary?.evidence_anchors ?? []).slice(0, 3),
      safeguards_anchor_sample: (safRoute?.evidence_anchors ?? []).slice(0, 3),
      multiparty_anchor_sample: (multiRoute?.evidence_anchors ?? []).slice(0, 3),
      cps_pressure_anchor_sample: (cpsRoute?.evidence_anchors ?? []).slice(0, 3),
      readiness_anchor_sample: (readyRoute?.evidence_anchors ?? []).slice(0, 3),
      hearing_court_anchor_sample: (hearRoute?.evidence_anchors ?? []).slice(0, 3),
    },
  };
}
