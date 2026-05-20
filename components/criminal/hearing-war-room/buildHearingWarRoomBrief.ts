import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";

const FORBIDDEN_RE =
  /\b(this wins|case collapses|crowns?\s+will\s+lose|crown\s+case\s+collapses|guaranteed|will\s+be\s+acquitted|plead\s+guilty|plead\s+not\s+guilty)\b/i;

const COURT_RECORD_PREFIX = "Ask the court to record";

export type HearingWarRoomBrief = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  readiness: string;
  safePositionToday: string;
  sayThis: string[];
  doNotOverstate: string[];
  askCourtToRecord: string[];
  instructionsNeeded: string[];
  nextHearingMoves: string[];
  evidenceAnchors: string[];
  collapseRisks: string[];
  draftWording: {
    disclosureTimetable: string;
    adjournment: string;
    clientExplanation: string;
  };
};

export type BuildHearingWarRoomBriefInput = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  readiness: string;
  battleboard: BattleboardOutput | null;
  hasSavedPosition: boolean;
  chaseItems: string[];
  defencePlan?: DefenceStrategyPlan | null;
  proceduralOutstanding?: string[];
};

function sanitizeLine(text: string): string | null {
  const t = text.trim();
  if (!t || FORBIDDEN_RE.test(t)) return null;
  return t;
}

function uniqueLines(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = sanitizeLine(raw);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function toCourtRecordAsk(item: string): string {
  const t = item.trim();
  if (!t) return "";
  if (/^ask the court/i.test(t)) return t;
  const label = t.replace(/^chase[:\s]*/i, "").replace(/^outstanding[:\s]*/i, "");
  return `${COURT_RECORD_PREFIX} that ${label.charAt(0).toLowerCase()}${label.slice(1)} remains outstanding and should be disclosed on a timetable.`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function defaultSayThis(hasChase: boolean): string[] {
  const base = [
    "The defence position remains provisional pending served source material and solicitor instructions.",
    "The court is asked to record outstanding source material and set a disclosure timetable.",
  ];
  if (hasChase) {
    base.push(
      "Timing and sequence remain conditional until served CCTV/CAD/999 and continuity material are reviewed.",
    );
  }
  return base;
}

function defaultDoNotOverstate(): string[] {
  return [
    "Assumed position may conflict with interview or served evidence.",
    "Full CCTV may confirm Crown timing once served.",
    "CAD/999 timing may support the Crown sequence.",
    "Do not commit to final trial strategy until served material and instructions are reviewed.",
  ];
}

/** Strip repeated section prefixes; keep plain risk lines or short imperatives. */
function cleanDoNotBullet(raw: string): string | null {
  let s = sanitizeLine(raw);
  if (!s) return null;
  s = s
    .replace(/^do not overstate:\s*/i, "")
    .replace(/^do not assume:\s*/i, "")
    .replace(/^safety note on file:\s*/i, "")
    .trim();
  if (!s || FORBIDDEN_RE.test(s)) return null;
  if (/^do not /i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isCourtSayable(line: string): boolean {
  const l = line.toLowerCase();
  if (FORBIDDEN_RE.test(line)) return false;
  if (/\b(chase|upload|record position|next 72|commit strategy|mg6 chase)\b/i.test(l)) return false;
  return /\b(provisional|court|record|conditional|position|material|defence asks|timing)\b/i.test(l);
}

function resolveSafePosition(battleboard: BattleboardOutput | null): string {
  const fromRoute = battleboard?.primary_route?.hearing_line?.trim();
  if (fromRoute && !FORBIDDEN_RE.test(fromRoute)) return fromRoute;
  const summary = battleboard?.solicitor_safe_summary?.trim();
  if (summary && !FORBIDDEN_RE.test(summary)) {
    return summary.slice(0, 600);
  }
  return "Timing/sequence remains conditional on served CCTV/CAD/999 material. The defence asks the court to record outstanding source material and set a timetable — position remains provisional pending instructions.";
}

function resolveReadinessLabel(input: BuildHearingWarRoomBriefInput): string {
  if (input.readiness?.trim()) return input.readiness;
  if (!input.hasSavedPosition) return "Conditional — record position before hearing";
  if (input.chaseItems.length >= 2) return "Conditional — disclosure chase outstanding";
  if (input.battleboard?.overall_status === "thin_bundle") return "Thin bundle — provisional routes only";
  if (input.battleboard?.primary_route) return "Routes on file — solicitor review before court";
  return "Review — standard caution";
}

export function buildChaseItemsForHearing(input: {
  snapshotMissing?: { label: string; status: string }[];
  proceduralOutstanding?: string[];
  battleboard?: BattleboardOutput | null;
}): string[] {
  return collectChaseItems(input);
}

export function buildHearingWarRoomBrief(input: BuildHearingWarRoomBriefInput): HearingWarRoomBrief {
  const bb = input.battleboard;
  const route = bb?.primary_route;
  const hasChase = input.chaseItems.length > 0;

  const safePositionToday = resolveSafePosition(bb);

  const sayFromRoute = route?.hearing_line
    ? splitSentences(route.hearing_line).filter(isCourtSayable).slice(0, 2)
    : [];
  const sayThis = uniqueLines([...sayFromRoute, ...defaultSayThis(hasChase)], 5);

  const hurts = route?.what_hurts_us ?? [];
  const collapse = [
    ...(route?.collapse_risks ?? []),
    ...(bb?.global_collapse_risks ?? []),
    ...(input.defencePlan?.risks_if_we_fight ?? []),
    ...(input.defencePlan?.kill_switches?.map((k) => k.if) ?? []),
    ...hurts,
  ];
  const doNotRaw = [...collapse.map((r) => cleanDoNotBullet(r) ?? ""), ...defaultDoNotOverstate()];
  const doNotOverstate = uniqueLines(doNotRaw.filter(Boolean), 5);

  const chaseAsks = input.chaseItems.map(toCourtRecordAsk).filter(Boolean);
  const proceduralAsks = (input.proceduralOutstanding ?? [])
    .filter((p) => /\b(cctv|cad|999|mg6|disclosure|continuity|bwv|interview)\b/i.test(p))
    .map(toCourtRecordAsk);
  const defaultAsks = [
    `${COURT_RECORD_PREFIX} CCTV master/full window and continuity if relied upon by either side.`,
    `${COURT_RECORD_PREFIX} CAD audit and 999 audio if timing is in issue.`,
    `${COURT_RECORD_PREFIX} BWV and interview recording/transcript where referenced in MG5/MG6.`,
    `${COURT_RECORD_PREFIX} MG6/unused material clarification if disclosure is incomplete.`,
  ];
  const askCourtToRecord = uniqueLines([...chaseAsks, ...proceduralAsks, ...defaultAsks], 12);

  const instructionsNeeded = uniqueLines(
    [
      !input.hasSavedPosition
        ? "Record defence position on file before fixing a hearing line."
        : "",
      bb?.position_notice?.trim() ?? "",
      route?.route_type === "interview"
        ? "Take instructions on interview account — check conflict with served MG5/MG6."
        : "",
      "Take instructions on timing/sequence — do not fix facts without source material.",
      "Check whether client account conflicts with served evidence before advancing a positive case.",
      "Confirm whether any positive defence can safely be advanced today.",
      ...(input.defencePlan?.next_72_hours ?? []).filter((n) =>
        /instruction|position|interview|client/i.test(n),
      ),
    ],
    6,
  );

  const nextHearingMoves = uniqueLines(
    [
      "Record position (provisional, source-linked).",
      "Chase outstanding disclosure / source material.",
      "Ask court to record outstanding source material on the order.",
      "Seek timetable / review date — avoid open-ended adjournment without dates.",
      "Avoid committing to final trial strategy until served material is reviewed.",
    ],
    5,
  );

  const evidenceAnchors = uniqueLines(
    [
      ...(route?.evidence_anchors ?? []),
      ...(bb?.routes ?? []).flatMap((r) => r.evidence_anchors ?? []).slice(0, 6),
    ],
    8,
  );

  const collapseRisks = uniqueLines(collapse, 8);

  const chaseSnippet = input.chaseItems.slice(0, 4).join("; ") || "outstanding source material on file";

  const draftWording = {
    disclosureTimetable: `The defence asks the court to record that ${chaseSnippet} remains outstanding. The defence invites the court to order disclosure of that material by [date] with a review hearing on [date]. Position remains provisional pending service and instructions.`,
    adjournment: `The defence position remains provisional pending served source material and instructions. The defence asks the court to adjourn to [date] for disclosure compliance and a further case management hearing — not for final trial strategy to be fixed today.`,
    clientExplanation: `Your position with the court today is conditional: we will ask the court to record what material is still outstanding and for a timetable. We are not saying the case is won or lost — we need the served material and your instructions before anything firm is advanced.`,
  };

  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientLabel: input.clientLabel,
    allegation: input.allegation,
    stage: input.stage,
    hearingStatus: input.hearingStatus,
    bundleHealth: input.bundleHealth,
    positionStatus: input.positionStatus,
    readiness: resolveReadinessLabel(input),
    safePositionToday,
    sayThis,
    doNotOverstate,
    askCourtToRecord,
    instructionsNeeded,
    nextHearingMoves,
    evidenceAnchors,
    collapseRisks,
    draftWording,
  };
}
