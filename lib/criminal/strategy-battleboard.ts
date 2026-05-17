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

export type BattleboardOutput = {
  case_id: string;
  generated_at: string;
  overall_status: BattleboardOverallStatus;
  solicitor_safe_summary: string;
  primary_route?: BattleboardRoute;
  routes: BattleboardRoute[];
  global_collapse_risks: string[];
  urgent_next_moves: string[];
};

export type StrategyBattleboardInput = {
  case_id: string;
  bundle_text: string;
  offence_label?: string | null;
  committed_strategy?: string | null;
  position_text?: string | null;
  strategy_summary_lines?: string[];
  outstanding_disclosure?: string[];
};

const FORBIDDEN_PHRASE_RE =
  /\b(this\s+wins|wins\s+the\s+case|Crown\s+will\s+lose|proves\s+innocence|guaranteed|definitely\s+defeats\s+the\s+case|acquittal\s+is\s+certain)\b/i;

const CONDITIONAL_MARKERS =
  /\b(outstanding|not\s+served|awaiting|missing|provisional|conditional|if\s+proved|may\s+assist|needs?\s+solicitor\s+review|do\s+not\s+overstate|source\s+material\s+needed)\b/i;

function compactOneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function isSafePhrase(s: string): boolean {
  const t = compactOneLine(s);
  if (t.length < 8) return false;
  return !FORBIDDEN_PHRASE_RE.test(t);
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
  const out: string[] = [];
  for (const raw of bundleText.split(/\r?\n/)) {
    const l = raw.trim();
    if (l.length < 12 || l.length > 360) continue;
    if (patterns.some((p) => p.test(l))) {
      out.push(l);
      if (out.length >= max * 2) break;
    }
  }
  return uniqueSafe(out, max);
}

function bundleHas(bundleText: string, patterns: RegExp[]): boolean {
  const u = bundleText.toUpperCase();
  return patterns.some((p) => p.test(bundleText) || p.test(u));
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
    id: "disclosure",
    route_type: "disclosure",
    title: "Disclosure / source-material pressure",
    signals: [
      /\bMG6\b/i,
      /\boutstanding\b/i,
      /\bnot\s+served\b/i,
      /\bawaiting\b/i,
      /\bdisclosure\b/i,
      /\bunused\s+material\b/i,
      /\bMG11\b/i,
      /\bCCTV\s+master\b/i,
      /\bcontinuity\b/i,
      /\bsource\s+material\b/i,
      /\bdisclosure\s+chaos\b/i,
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
      /\bdenial\b/i,
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
  extraAnchors: string[]
): BattleboardRoute | null {
  const score = scoreRoute(bundleText, spec);
  if (score === 0 && extraAnchors.length === 0) return null;

  const fileLines = extractLinesMatching(bundleText, spec.signals, 4);
  const evidence_anchors = uniqueSafe([...fileLines, ...extraAnchors], 6);
  const why_it_helps = uniqueSafe(
    fileLines.length > 0
      ? fileLines.map((l) => `File wording: ${l}`)
      : spec.defaultWhy,
    4
  );
  const what_hurts_us = uniqueSafe(spec.defaultHurts, 3);
  const collapse_risks = uniqueSafe(spec.collapseRisks, 5);
  const next_moves = uniqueSafe(spec.nextMoves, 5);
  const textConditional =
    bundleHas(bundleText, [CONDITIONAL_MARKERS]) ||
    evidence_anchors.some((a) => CONDITIONAL_MARKERS.test(a));

  const status = deriveRouteStatus(
    evidence_anchors,
    next_moves,
    bundleThin,
    score,
    textConditional
  );

  if (status === "blocked" && evidence_anchors.length === 0) return null;

  return {
    id: spec.id,
    title: spec.title,
    status,
    route_type: spec.route_type,
    why_it_helps,
    what_hurts_us,
    evidence_anchors,
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
  const extraContext = uniqueSafe(
    [
      input.offence_label ? `Offence on file: ${input.offence_label}` : "",
      input.committed_strategy ? `Committed strategy marker: ${input.committed_strategy}` : "",
      input.position_text ? compactOneLine(input.position_text).slice(0, 240) : "",
      ...(input.strategy_summary_lines ?? []),
      ...(input.outstanding_disclosure ?? []).map((d) => `Outstanding disclosure: ${d}`),
    ].filter(Boolean),
    8
  );

  const disclosureExtras =
    input.outstanding_disclosure && input.outstanding_disclosure.length > 0
      ? input.outstanding_disclosure
      : extractLinesMatching(bundleText, [/\boutstanding\b/i, /\bnot\s+served\b/i, /\bMG6\b/i], 4);

  const routes: BattleboardRoute[] = [];

  for (const spec of ROUTE_SPECS) {
    const extra =
      spec.route_type === "disclosure"
        ? disclosureExtras
        : spec.route_type === "mitigation" && bundleThin
          ? ["Thin bundle — fight routes may stay conditional until material is served."]
          : [];
    const route = buildRouteFromSpec(spec, bundleText, bundleThin, extra);
    if (route) routes.push(route);
  }

  routes.sort((a, b) => {
    const sr = statusRank(b.status) - statusRank(a.status);
    if (sr !== 0) return sr;
    return b.evidence_anchors.length - a.evidence_anchors.length;
  });

  const primary_route = routes[0];
  const viableCount = routes.filter((r) => r.status === "viable").length;
  const conditionalCount = routes.filter((r) => r.status === "conditional").length;

  let overall_status: BattleboardOverallStatus = "usable";
  if (bundleThin && routes.length <= 1) overall_status = "thin_bundle";
  else if (viableCount === 0 && conditionalCount === 0) overall_status = "needs_review";
  else if (bundleThin) overall_status = "thin_bundle";

  const urgent_next_moves = uniqueSafe(
    [
      ...disclosureExtras.map((d) => `Chase/record: ${d}`),
      ...(primary_route?.next_moves ?? []),
      "Reconcile MG5/MG6/interview/source material before final strategy.",
      "Record defence position and preserve hearing timetable.",
    ],
    6
  );

  let solicitor_safe_summary: string;
  if (bundleThin) {
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

  return {
    case_id: input.case_id,
    generated_at: new Date().toISOString(),
    overall_status,
    solicitor_safe_summary,
    primary_route,
    routes,
    global_collapse_risks: GLOBAL_COLLAPSE,
    urgent_next_moves,
  };
}
