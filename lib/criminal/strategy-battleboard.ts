/**
 * Strategy Battleboard — Phase 1 (read-only, deterministic).
 * Solicitor-safe fight-route panel; not predictions or eval logic.
 */

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
  backup_route_types: string[];
  backup_route_titles: string[];
  primary_anchor_sample: string[];
  safeguards_anchor_sample: string[];
  multiparty_anchor_sample: string[];
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
  /\b(MG6|MG11|MG5|CCTV|CAD|999|BWV|EX-[\w\d]+|interview|PACE|disclosure|continuity|source\s+material|outstanding|not\s+served|served|medical|forensic|witness\s+statement|unused\s+material|disclosure\s+chase|MG6C|MG0)\b/i;

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

const DISPLAY_PREFIX_RES = /^File\s+wording:\s*/i;

const CONDITIONAL_MARKERS =
  /\b(outstanding|not\s+served|awaiting|missing|provisional|conditional|if\s+proved|may\s+assist|needs?\s+solicitor\s+review|do\s+not\s+overstate|source\s+material\s+needed)\b/i;

function compactOneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function stripDisplayPrefixes(s: string): string {
  return compactOneLine(s).replace(DISPLAY_PREFIX_RES, "");
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
    const c = compactOneLine(raw);
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

function hearingSignalScore(bundleText: string): number {
  const patterns = [
    /\bhearing\b/i,
    /\blisting\b/i,
    /\btimetable\b/i,
    /\badjourn/i,
    /\bPCMH\b/i,
    /\bCMH\b/i,
    /\bcourt\s+move\b/i,
    /\bmention\s+hearing\b/i,
    /\bplea\s+and\s+trial\b/i,
  ];
  let n = 0;
  for (const p of patterns) {
    if (p.test(bundleText)) n += 1;
  }
  return n;
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
): number {
  const saf = safeguardsSignalScore(bundleText);
  const multi = multipartySignalScore(bundleText);
  const time = timelineSignalScore(bundleText);
  const hear = hearingSignalScore(bundleText);
  const discPress = disclosurePressureScore(bundleText, outstandingLabels);

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
      break;
    case "timeline":
      rank += 95 + time * 12 + hear * 8;
      if (saf >= 1) rank -= 55 + saf * 12;
      if (saf >= 3) rank -= 35;
      break;
    case "identity":
      rank += 88;
      break;
    case "interview":
      rank += 82;
      break;
    case "continuity":
      rank += 78;
      break;
    case "causation":
      rank += 72;
      break;
    case "intent":
      rank += 68;
      break;
    case "mitigation":
      rank += 35;
      break;
    case "disclosure":
      rank += 25 + discPress * 12;
      if (saf >= 2) rank -= 70;
      if (multi >= 2) rank -= 70;
      if (time >= 2) rank -= 45;
      if (hear >= 2) rank -= 35;
      if (discPress <= 1 && outstandingLabels.length === 0) rank -= 55;
      break;
    default:
      rank += 40;
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
        : extractLinesMatching(bundleText, spec.signals, 4);
  const interviewExtras =
    spec.route_type === "interview" && position?.interview_account_lines.length
      ? position.interview_account_lines
      : [];
  const evidence_anchors = uniqueSafe([...fileLines, ...interviewExtras, ...extraAnchors], 6);
  const substantiveAnchors = evidence_anchors.filter((a) =>
    isSubstantiveAnchorForRoute(spec.route_type, a),
  );

  let why_it_helps = uniqueSafe(fileLines.length > 0 ? fileLines : spec.defaultWhy, 4);
  if (why_it_helps.length === 0) {
    why_it_helps = uniqueSafe(spec.defaultWhy, 4);
  }
  const what_hurts_us = uniqueSafe(spec.defaultHurts, 3);
  const collapse_risks = uniqueSafe(spec.collapseRisks, 5);
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
    title: spec.title,
    status,
    route_type: spec.route_type,
    why_it_helps,
    what_hurts_us,
    evidence_anchors: displayAnchors,
    collapse_risks,
    next_moves,
    hearing_line: spec.hearingLine,
    safety_note: spec.safetyNote,
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

  for (const spec of ROUTE_SPECS) {
    let extra: string[] = [];
    if (spec.route_type === "disclosure") {
      if (genuineDisclosurePressure || disclosureSignalHits >= 2) {
        extra = disclosureExtras;
      }
    } else if (spec.route_type === "safeguards" && safeguardsSignalScore(bundleText) >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, SAFEGUARDS_ANCHOR_RE, 5);
    } else if (spec.route_type === "multiparty" && multipartySignalScore(bundleText) >= 1) {
      extra = extractFamilyLinesMatching(bundleText, spec.signals, MULTIPARTY_ANCHOR_RE, 5);
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
    const pr = rankRouteForPrimary(b, bundleText, outstandingLabels) - rankRouteForPrimary(a, bundleText, outstandingLabels);
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
    solicitor_safe_summary = positionContext.notice;
  } else if (bundleThin) {
    solicitor_safe_summary =
      "Bundle text is thin on the system record — routes below are provisional and need solicitor review. Do not overstate at hearing until source material is served.";
  } else if (primary_route) {
    solicitor_safe_summary = `Primary pressure route: ${primary_route.title} (${primary_route.status}). ${
      primary_route.status === "viable"
        ? "May assist if proved on served material."
        : "Conditional on served source material and instructions."
    } This is a control panel, not a prediction of outcome.`;
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

  const sanitizedRoutes = routes.map(sanitizeRoute);
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
    return hits.length ? hits.join("+") : null;
  })();

  const safRoute = sanitizedRoutes.find((r) => r.route_type === "safeguards");
  const multiRoute = sanitizedRoutes.find((r) => r.route_type === "multiparty");
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
    urgent_next_moves: sanitizeStringList(urgent_next_moves, 6),
    diagnostics: {
      corpus_markers: corpusMarkers,
      safeguards_signal_count: safScore,
      multiparty_signal_count: multipartySignalScore(bundleText),
      timeline_signal_count: timelineSignalScore(bundleText),
      backup_route_types: backupRoutes.map((r) => r.route_type),
      backup_route_titles: backupRoutes.map((r) => r.title),
      primary_anchor_sample: (sanitizedPrimary?.evidence_anchors ?? []).slice(0, 3),
      safeguards_anchor_sample: (safRoute?.evidence_anchors ?? []).slice(0, 3),
      multiparty_anchor_sample: (multiRoute?.evidence_anchors ?? []).slice(0, 3),
    },
  };
}
