import {
  GENERIC_PROVISIONAL_COURT_LINE,
  GENERIC_PROVISIONAL_PRIMARY_ROUTE_TITLE,
  isProvisionalWorkflowProfile,
  MOTORING_DISCLOSURE_ITEMS,
  MOTORING_PRIMARY_ROUTE_TITLE,
  MOTORING_PROVISIONAL_COURT_LINE,
  resolveProvisionalWorkflowFromOffence,
  SERIOUS_VIOLENCE_PRIMARY_ROUTE_TITLE,
  SERIOUS_VIOLENCE_PROVISIONAL_COURT_LINE,
} from "@/lib/eval/casebrain-auditor/provisional-offence-policy";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import type { BattleboardOutput, BattleboardRoute } from "@/lib/criminal/strategy-battleboard";

/** Shared workflow profile ids for pilot case workflow surfaces. */
export type WorkflowProfile =
  | "fraud_account_control"
  | "pwits_phone_attribution"
  | "robbery_identification"
  | "violence_domestic_assault"
  | "generic_motoring_provisional"
  | "generic_serious_violence_provisional"
  | "generic_provisional"
  | "generic";

/** Standard family profiles with full disclosure packs. */
export type StandardWorkflowProfile = Exclude<
  WorkflowProfile,
  "generic" | "generic_motoring_provisional" | "generic_serious_violence_provisional" | "generic_provisional"
>;

/** @deprecated Use {@link WorkflowProfile}. */
export type PilotWorkflowProfile = WorkflowProfile;

export type WorkflowProfileContext = {
  caseTitle?: string | null;
  allegation?: string | null;
  routeTitle?: string | null;
  /** Optional bundle/front-matter text for signal scoring. */
  bundleText?: string | null;
  /** Client / defendant label for demo-name detection. */
  clientLabel?: string | null;
  /** Explicit profile override from header resolution. */
  profileHint?: WorkflowProfile | null;
};

export const WORKFLOW_DISCLOSURE_VISIBLE_CAP = 8;

type ProfilePack = {
  primaryRouteTitle: string;
  disclosureItems: string[];
  nextActions: string[];
  courtRecordAsks: string[];
  suppressGeneric: RegExp;
  rankUp: RegExp[];
  rankDown: RegExp[];
};

const PROFILE_PACKS: Record<StandardWorkflowProfile, ProfilePack> = {
  fraud_account_control: {
    primaryRouteTitle: "Fraud / account-control / dishonesty pressure",
    disclosureItems: [
      "Full bank export / source bank statements",
      "Bank schedule source data",
      "Device/login audit material",
      "IP / access logs",
      "Account ownership / control material",
      "Full mailbox export / email source material",
      "Accountant / bookkeeper / witness material",
      "POCA / source-of-funds material",
    ],
    nextActions: [
      "Chase full bank export/source schedules.",
      "Chase device/login/IP attribution material.",
      "Take instructions on account access, accountant/bookkeeper involvement and POCA/source-of-funds exposure.",
    ],
    courtRecordAsks: [
      "Ask the court to record that full bank export / source bank statements appear outstanding on the current papers.",
      "Ask the court to record that device/login/IP attribution material appears outstanding pending service.",
      "Ask the court to record that full mailbox export / email source material appears outstanding.",
      "Ask the court to record that account ownership/control material appears outstanding.",
      "Ask the court to record that POCA/source-of-funds material appears outstanding.",
    ],
    suppressGeneric: /\b(cctv|bwv|999|cad|custody|body.worn)\b/i,
    rankUp: [
      /\b(bank|banking|account|schedule|ledger|transaction|source\s+data)\b/i,
      /\b(device|login|ip|access\s+log|attribution)\b/i,
      /\b(mailbox|email|bookkeeper|accountant|ownership|control|poca|source.of.funds)\b/i,
    ],
    rankDown: [/\b(cctv|bwv|999|cad|custody)\b/i],
  },
  pwits_phone_attribution: {
    primaryRouteTitle: "Possession / knowledge / phone-attribution pressure",
    disclosureItems: [
      "Full phone extraction",
      "Phone attribution / ownership material",
      "SIM / IMEI / subscriber material",
      "Search BWV export",
      "Search/seizure continuity",
      "Drug item continuity / lab continuity note",
      "Cash seizure / counting note",
      "Co-occupier / shared premises material",
    ],
    nextActions: [
      "Chase full phone extraction and attribution/SIM/IMEI material.",
      "Chase search BWV and search/drug/cash continuity.",
      "Take instructions on phone ownership, shared premises, co-occupiers and knowledge/control.",
    ],
    courtRecordAsks: [
      "Ask the court to record that full phone extraction appears outstanding on the current papers.",
      "Ask the court to record that phone attribution/SIM/IMEI/subscriber material appears outstanding.",
      "Ask the court to record that search BWV appears outstanding.",
      "Ask the court to record that drugs/cash continuity material appears outstanding.",
      "Ask the court to record that co-occupier/shared premises issues remain live pending served material.",
    ],
    suppressGeneric: /\b(cctv full|cctv continuity|999|cad|medical|expert report|pathology)\b/i,
    rankUp: [
      /\b(phone|handset|extraction|download|attribution)\b/i,
      /\b(sim|imei|subscriber|ownership)\b/i,
      /\b(search\s+bwv|search|continuity|drug|cash|forensic|dna|fingerprint|shared premises|co-occupier)\b/i,
    ],
    rankDown: [/\b(cctv|999|cad|medical|expert)\b/i],
  },
  robbery_identification: {
    primaryRouteTitle: "Identification / participation / attribution pressure",
    disclosureItems: [
      "Full CCTV master footage",
      "CCTV continuity / export log",
      "ID procedure material",
      "999 / CAD timing material",
      "Complainant first account",
      "Co-defendant / unknown male attribution",
      "Clothing / description material",
      "Final signed complainant statement",
    ],
    nextActions: [
      "Chase full CCTV master/export log and continuity.",
      "Chase ID procedure material and complainant first account.",
      "Take instructions on presence, clothing, co-defendant/unknown male and served CCTV/ID material.",
    ],
    courtRecordAsks: [
      "Ask the court to record that full CCTV master/export log appears outstanding on the current papers.",
      "Ask the court to record that ID procedure material appears outstanding.",
      "Ask the court to record that 999/CAD timing material appears outstanding.",
      "Ask the court to record that complainant first account material appears outstanding.",
      "Ask the court to record that co-defendant/unknown male attribution remains live pending served material.",
    ],
    suppressGeneric: /\b(medical|pathology|hospital|autopsy|custody record|custody cctv)\b/i,
    rankUp: [
      /\b(cctv|master|export|continuity)\b/i,
      /\b(id procedure|identification|viper|parade|first account|complainant)\b/i,
      /\b(999|cad|timing|co-defendant|unknown male|attribution|witness|phone|clothing|description)\b/i,
    ],
    rankDown: [/\b(medical|pathology|hospital)\b/i],
  },
  violence_domestic_assault: {
    primaryRouteTitle: "Violence / complainant account / injury and participation pressure",
    disclosureItems: [
      "Complainant first account / MG11",
      "BWV / incident footage",
      "Medical report / injury photos",
      "999 / CAD material",
      "Retraction or further complainant statement",
      "Third-party witness statements",
      "Domestic context / safeguarding material",
      "Final signed complainant statement",
    ],
    nextActions: [
      "Chase complainant first account and BWV/incident footage.",
      "Chase medical/injury material and any retraction or further statement.",
      "Take instructions on self-defence, causation, domestic context and complainant account.",
    ],
    courtRecordAsks: [
      "Ask the court to record that complainant first account / MG11 appears outstanding on the current papers.",
      "Ask the court to record that BWV/incident footage appears outstanding.",
      "Ask the court to record that medical/injury material appears outstanding.",
      "Ask the court to record that 999/CAD material appears outstanding.",
      "Ask the court to record that any retraction or further complainant statement appears outstanding.",
    ],
    suppressGeneric: /\b(bank|device\/login|phone extraction|intent to supply|poca|account-control)\b/i,
    rankUp: [
      /\b(assault|gbh|abh|oapa|s\.18|s\.20|s\.47|violence|domestic|affray)\b/i,
      /\b(complainant|mg11|injury|medical|bwv|body.worn)\b/i,
      /\b(999|cad|retraction|self.defence|causation)\b/i,
    ],
    rankDown: [/\b(bank|pwits|intent to supply|phone extraction|robbery identification)\b/i],
  },
};

/** Weighted signal rules — higher weight wins when multiple profiles match. */
const PROFILE_SIGNAL_RULES: Array<{
  profile: Exclude<WorkflowProfile, "generic">;
  patterns: Array<{ re: RegExp; weight: number }>;
}> = [
  {
    profile: "fraud_account_control",
    patterns: [
      { re: /\b(fraud|false representation|financial crime|account[-\s]?control|dishonesty)\b/i, weight: 12 },
      { re: /\b(bank|banking|ledger|transaction schedule|source of funds|poca)\b/i, weight: 8 },
      { re: /\b(device|login|ip address|access log)\b/i, weight: 6 },
    ],
  },
  {
    profile: "pwits_phone_attribution",
    patterns: [
      { re: /\b(pwits|possession with intent|class\s*a|controlled drug)\b/i, weight: 12 },
      { re: /\b(phone attribution|handset|sim|imei|subscriber|phone extraction)\b/i, weight: 10 },
      { re: /\b(premises search|search bwv|drug continuity|co-occupier|shared premises)\b/i, weight: 6 },
    ],
  },
  {
    profile: "robbery_identification",
    patterns: [
      { re: /\b(robbery|mugging|snatch|street robbery)\b/i, weight: 14 },
      { re: /\b(poor identification|identification issue|viper|id parade)\b/i, weight: 10 },
      { re: /\b(complainant first account|unknown male|co-defendant)\b/i, weight: 6 },
    ],
  },
  {
    profile: "violence_domestic_assault",
    patterns: [
      { re: /\b(assault|gbh|abh|oapa|s\.18|s\.20|s\.47|affray|violence|domestic|arson|reckless)\b/i, weight: 14 },
      { re: /\b(complainant|mg11|injury|medical|hospital|retraction)\b/i, weight: 10 },
      { re: /\b(bwv|body.worn|999|cad|self.defence)\b/i, weight: 6 },
    ],
  },
];

const DEMO_TITLE_FALLBACK: Array<{
  profile: Exclude<WorkflowProfile, "generic">;
  titleRe: RegExp;
  title: string;
  allegation: string;
}> = [
  {
    profile: "fraud_account_control",
    titleRe: /\b(Marcus\s+Vale|R\s*v\.?\s*Marcus\s+Vale)\b/i,
    title: "R v Marcus Vale",
    allegation: "Fraud by false representation",
  },
  {
    profile: "pwits_phone_attribution",
    titleRe: /\b(Kian\s+Doyle|R\s*v\.?\s*Kian\s+Doyle)\b/i,
    title: "R v Kian Doyle",
    allegation: "Possession with intent to supply Class A controlled drugs",
  },
  {
    profile: "robbery_identification",
    titleRe: /\b(Leon\s+Marsh|R\s*v\.?\s*Leon\s+Marsh)\b/i,
    title: "R v Leon Marsh",
    allegation: "Robbery, Theft Act 1968 s.8",
  },
];

function contextScan(context: WorkflowProfileContext): string {
  return [context.caseTitle, context.allegation, context.routeTitle, context.bundleText, context.clientLabel]
    .filter(Boolean)
    .join(" ");
}

/** Demo matter name match anywhere in case signals — forces profile for Marcus/Kian/Leon. */
export function resolveDemoProfileFromContext(
  context: WorkflowProfileContext,
): Exclude<WorkflowProfile, "generic"> | null {
  const scan = contextScan(context);
  for (const demo of DEMO_TITLE_FALLBACK) {
    if (demo.titleRe.test(scan)) return demo.profile;
  }
  return null;
}

function resolveProfileFromContext(context: WorkflowProfileContext): WorkflowProfile {
  if (context.profileHint && context.profileHint !== "generic") {
    return context.profileHint;
  }
  const demo = resolveDemoProfileFromContext(context);
  if (demo) return demo;
  return "generic";
}

function scoreProfile(context: WorkflowProfileContext): Map<WorkflowProfile, number> {
  const scores = new Map<WorkflowProfile, number>([
    ["fraud_account_control", 0],
    ["pwits_phone_attribution", 0],
    ["robbery_identification", 0],
    ["violence_domestic_assault", 0],
    ["generic", 0],
  ]);

  const scan = contextScan(context);
  for (const demo of DEMO_TITLE_FALLBACK) {
    if (demo.titleRe.test(scan)) {
      scores.set(demo.profile, (scores.get(demo.profile) ?? 0) + 100);
    }
  }

  const weightedFields: Array<{ text: string; weight: number }> = [
    { text: context.allegation ?? "", weight: 4 },
    { text: context.routeTitle ?? "", weight: 3 },
    { text: context.caseTitle ?? "", weight: 3 },
    { text: context.bundleText ?? "", weight: 2 },
  ];

  for (const { profile, patterns } of PROFILE_SIGNAL_RULES) {
    let total = scores.get(profile) ?? 0;
    for (const { text, weight: fieldWeight } of weightedFields) {
      if (!text.trim()) continue;
      for (const { re, weight } of patterns) {
        if (re.test(text)) total += weight * fieldWeight;
      }
    }
    scores.set(profile, total);
  }

  return scores;
}

/** Profile from offence/title signals — used by auditor collector (not gated on pilot UI mode). */
export function resolveWorkflowProfileFromSignals(context: WorkflowProfileContext): WorkflowProfile {
  const forced = resolveProfileFromContext(context);
  if (forced !== "generic") return forced;

  const allegationText = [context.allegation, context.caseTitle].filter(Boolean).join("; ");
  const provisional = resolveProvisionalWorkflowFromOffence(allegationText);
  if (provisional) return provisional;

  const scores = scoreProfile(context);
  let best: WorkflowProfile = "generic";
  let bestScore = 0;

  for (const profile of [
    "fraud_account_control",
    "pwits_phone_attribution",
    "robbery_identification",
    "violence_domestic_assault",
  ] as const) {
    const s = scores.get(profile) ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = profile;
    }
  }

  if (bestScore < 12) return "generic";
  return best;
}

/** Resolve workflow profile from case signals. Non-pilot mode always returns generic. */
export function resolveWorkflowProfile(context: WorkflowProfileContext): WorkflowProfile {
  if (!isCriminalPilotMode()) return "generic";
  return resolveWorkflowProfileFromSignals(context);
}

/** @deprecated Alias for {@link resolveWorkflowProfile}. */
export function resolvePilotWorkflowProfile(context: WorkflowProfileContext): WorkflowProfile {
  return resolveWorkflowProfile(context);
}

export function isWorkflowDemoProfile(context: WorkflowProfileContext): boolean {
  const p = resolveWorkflowProfile(context);
  return p !== "generic";
}

export function workflowDisclosureChaseLabels(context: WorkflowProfileContext): string[] | null {
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic") return null;
  if (profile === "generic_motoring_provisional") return [...MOTORING_DISCLOSURE_ITEMS];
  if (isProvisionalWorkflowProfile(profile)) return null;
  return PROFILE_PACKS[profile].disclosureItems;
}

export function workflowCourtRecordAsks(context: WorkflowProfileContext): string[] | null {
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic" || isProvisionalWorkflowProfile(profile)) return null;
  return PROFILE_PACKS[profile].courtRecordAsks.map(normalizeWorkflowPilotLabel).slice(0, 5);
}

export function workflowTopNextActions(context: WorkflowProfileContext): string[] | null {
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic" || isProvisionalWorkflowProfile(profile)) return null;
  return PROFILE_PACKS[profile].nextActions;
}

/** @deprecated Use {@link workflowTopNextActions}. */
export function pilotTopNextActions(context: WorkflowProfileContext): string[] | null {
  return workflowTopNextActions(context);
}

export function workflowPrimaryRouteTitle(context: WorkflowProfileContext): string | null {
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic") return null;
  if (profile === "generic_motoring_provisional") return MOTORING_PRIMARY_ROUTE_TITLE;
  if (profile === "generic_serious_violence_provisional") return SERIOUS_VIOLENCE_PRIMARY_ROUTE_TITLE;
  if (profile === "generic_provisional") return GENERIC_PROVISIONAL_PRIMARY_ROUTE_TITLE;
  return PROFILE_PACKS[profile].primaryRouteTitle;
}

function profilePackRouteId(profile: StandardWorkflowProfile): string | null {
  switch (profile) {
    case "fraud_account_control":
      return "pack_y_fraud";
    case "pwits_phone_attribution":
      return "pack_y_pwits";
    case "robbery_identification":
      return "pack_y_robbery";
    case "violence_domestic_assault":
      return "pack_y_affray";
    default:
      return null;
  }
}

const META_ROUTE_TYPES = new Set<BattleboardRoute["route_type"]>(["multiparty", "safeguards", "disclosure"]);
const META_ROUTE_IDS = new Set(["cps_pressure", "readiness", "hearing_court"]);

/** Prefer family-aligned pack_y / substantive route over multiparty/hearing meta routes in pilot mode. */
export function pickWorkflowPrimaryRoute(
  routes: BattleboardRoute[],
  context: WorkflowProfileContext,
): BattleboardRoute | null {
  if (!routes.length) return null;
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic" || isProvisionalWorkflowProfile(profile)) return routes[0] ?? null;

  if (profile === "violence_domestic_assault") {
    const violenceRoute = routes.find((r) =>
      /\b(violence|complainant|gbh|abh|assault|injury|domestic|oapa)\b/i.test(r.title),
    );
    if (violenceRoute) return violenceRoute;
  }

  const packId = profilePackRouteId(profile);
  const packRoute = packId ? routes.find((r) => r.id === packId) : undefined;
  if (packRoute) return packRoute;

  const core = PROFILE_PACKS[profile].primaryRouteTitle
    .toLowerCase()
    .replace(/\s+pressure$/, "")
    .trim();
  const byTitle = routes.find((r) => {
    const t = r.title.toLowerCase();
    return t.includes(core) || core.split("/").some((part) => part.trim() && t.includes(part.trim()));
  });
  if (byTitle) return byTitle;

  const substantive = routes.find(
    (r) => !META_ROUTE_TYPES.has(r.route_type) && !META_ROUTE_IDS.has(r.id),
  );
  return substantive ?? routes[0] ?? null;
}

export function workflowSafeCourtLine(context: WorkflowProfileContext): string | null {
  const profile = resolveWorkflowProfile(context);
  switch (profile) {
    case "fraud_account_control":
      return "Account-control and dishonesty issues remain conditional on served bank/device material. The defence asks the court to record outstanding source material on a timetable — position remains provisional pending instructions.";
    case "pwits_phone_attribution":
      return "Possession and phone-attribution issues remain conditional on served extraction and search material. The defence asks the court to record outstanding source material on a timetable — position remains provisional pending instructions.";
    case "robbery_identification":
      return "Identification and participation remain conditional on full CCTV, ID procedure material, 999/CAD timing, complainant statement, second-male attribution and interview material. The defence asks the court to record outstanding source material on a timetable — position remains provisional pending instructions.";
    case "generic_motoring_provisional":
      return MOTORING_PROVISIONAL_COURT_LINE;
    case "generic_serious_violence_provisional":
      return SERIOUS_VIOLENCE_PROVISIONAL_COURT_LINE;
    case "generic_provisional":
      return GENERIC_PROVISIONAL_COURT_LINE;
    default:
      return null;
  }
}

const ROBBERY_DISCLOSURE_CASE_WIDE =
  "Identification, participation and attribution remain conditional on full CCTV, ID procedure material, 999/CAD timing, complainant statement, second-male attribution and interview material.";

const ROBBERY_SOURCE_MATERIAL_PHRASE =
  "full CCTV, ID procedure material, 999/CAD timing, complainant statement, second-male attribution and interview material";

/** Pilot disclosure “case-wide court line” — profile-specific, no generic forensic wording. */
export function workflowDisclosureCaseWideLine(context: WorkflowProfileContext): string | null {
  const profile = resolveWorkflowProfile(context);
  if (profile === "fraud_account_control") {
    return "Account-control and dishonesty issues remain conditional on served bank/export, device/login, mailbox and POCA/source-of-funds material.";
  }
  if (profile === "pwits_phone_attribution") {
    return "Possession, knowledge, intent to supply and phone attribution remain conditional on full phone extraction, search BWV, drug/cash continuity and co-occupier material.";
  }
  if (profile === "robbery_identification") {
    return ROBBERY_DISCLOSURE_CASE_WIDE;
  }
  if (profile === "generic_motoring_provisional") {
    return "Standard of driving, driver attribution, collision sequence, dashcam/CCTV/BWV, CAD/999, expert/collision material, medical/injury evidence where relevant, and served interview/account remain conditional on service.";
  }
  if (profile === "generic_serious_violence_provisional") {
    return "Serious violence strategy remains provisional pending served material and solicitor review.";
  }
  if (profile === "generic_provisional") {
    return "Route and disclosure priorities remain provisional pending human review of offence family and served material.";
  }
  return null;
}

/** Route-status badge in pilot Control Room — avoids duplicate “conditional on served material”. */
export function pilotRouteStatusBadgeLabel(status: string | null | undefined): string | null {
  if (!status?.trim()) return null;
  if (!isCriminalPilotMode()) return status.trim();
  const s = pilotCleanupVisibleText(status.trim());
  if (/conditional\s+on\s+served\s+material/i.test(s)) return s;
  if (/^conditional\b/i.test(s) && !/on\s+served\s+material/i.test(s)) {
    return "conditional on served material";
  }
  return `${s} — conditional on served material`;
}

/** HWR / cockpit readiness when no saved position (pilot read-only demo). */
export function pilotReadinessWithoutSavedPosition(pilotDemoReadOnly: boolean): string {
  if (pilotDemoReadOnly && isCriminalPilotMode()) {
    return "Conditional — confirm instructions";
  }
  return "Conditional — record position";
}

export type WorkflowHeaderOverride = {
  title: string;
  allegation: string;
  displayTitle: string;
  profile: WorkflowProfile;
};

export function workflowHeaderOverrides(
  caseTitle: string,
  context?: Omit<WorkflowProfileContext, "caseTitle">,
): WorkflowHeaderOverride | null {
  if (!isCriminalPilotMode()) return null;
  const t = caseTitle.trim();
  const fullContext: WorkflowProfileContext = { caseTitle: t, ...context };
  const scan = contextScan(fullContext);

  for (const demo of DEMO_TITLE_FALLBACK) {
    if (demo.titleRe.test(scan)) {
      return {
        title: demo.title,
        allegation: demo.allegation,
        displayTitle: `${demo.title} — ${demo.allegation}`,
        profile: demo.profile,
      };
    }
  }

  const profile = resolveWorkflowProfile(fullContext);
  if (profile === "generic") return null;

  const title = t.startsWith("R v") ? t : t;
  const allegationFromContext = fullContext.allegation?.trim();
  const defaultAllegation =
    profile === "generic_motoring_provisional"
      ? MOTORING_PRIMARY_ROUTE_TITLE.split(" pressure")[0]
      : profile === "generic_serious_violence_provisional"
        ? SERIOUS_VIOLENCE_PRIMARY_ROUTE_TITLE
        : profile === "generic_provisional"
          ? GENERIC_PROVISIONAL_PRIMARY_ROUTE_TITLE
          : PROFILE_PACKS[profile].primaryRouteTitle.split(" pressure")[0] ?? profile;
  const cleanAllegation =
    allegationFromContext &&
    !/\b(offence wording not safely extracted|unknown|add charge sheet)\b/i.test(allegationFromContext)
      ? allegationFromContext
      : defaultAllegation;

  return {
    title,
    allegation: cleanAllegation,
    displayTitle: `${title} — ${cleanAllegation}`,
    profile,
  };
}

/** @deprecated Use {@link workflowHeaderOverrides}. */
export function pilotHeaderOverrides(
  caseTitle: string,
): { title?: string; allegation?: string; displayTitle?: string } | null {
  const o = workflowHeaderOverrides(caseTitle);
  if (!o) return null;
  return { title: o.title, allegation: o.allegation, displayTitle: o.displayTitle };
}

export function cleanPilotHeaderClient(raw: string): string {
  return raw
    .replace(/\bPrimary allegation\b.*$/i, "")
    .replace(/\bPrimary\b.*$/i, "")
    .replace(/\b(sheet\s*\/\s*indictment|indictment|extract)\b.*$/i, "")
    .trim();
}

export function pilotStrategyBasisDisplay(label: string | null | undefined): string | null {
  if (!isCriminalPilotMode() || !label?.trim()) return label ?? null;
  if (/summaries\s*only|add key documents/i.test(label)) {
    return "Based on uploaded bundle text — solicitor review required.";
  }
  return label;
}

/** True when pilot basis label was rewritten — suppress trailing reason in UI. */
export function shouldSuppressPilotStrategyBasisReason(
  originalLabel: string | null | undefined,
): boolean {
  if (!isCriminalPilotMode() || !originalLabel?.trim()) return false;
  return /summaries\s*only|add key documents/i.test(originalLabel);
}

/** Hide internal metadata-source footers in criminal pilot mode. */
export function pilotDisplayMetadataNote(note: string | undefined | null): string | undefined {
  if (!isCriminalPilotMode() || !note?.trim()) return note?.trim() || undefined;
  return undefined;
}

/** Court name only — strip hearing/defendant fragments from merged header fields. */
export function cleanPilotCourtHeaderCell(raw: string | null | undefined): string {
  let t = (raw ?? "").trim();
  if (!t) return "Court not safely extracted";
  t = t
    .replace(/\.\s*Next hearing\b[\s\S]*/i, "")
    .replace(/\s+Next hearing:\s*[\s\S]*/i, "")
    .replace(/\.\s*Defendant:\s*[\s\S]*/i, "")
    .replace(/\s+Defendant:\s*[\s\S]*/i, "")
    .replace(/\s+at\s+\d{1,2}:\d{2}\s+for\s+PTPH\b[\s\S]*/i, "")
    .trim();
  return t || "Court not safely extracted";
}

/** Hearing date/time for header tiles — not mixed into court cell. */
export function cleanPilotHearingHeaderCell(
  nextHearing: string | null | undefined,
  hearingDateIso?: string | null,
): string {
  const raw = (nextHearing ?? "").trim();
  if (hearingDateIso) {
    try {
      const d = new Date(hearingDateIso);
      if (!Number.isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        if (d.getHours() !== 0 || d.getMinutes() !== 0) return `${datePart} · ${timePart}`;
        return datePart;
      }
    } catch {
      /* fall through */
    }
  }
  if (!raw || /not safely extracted|no hearing/i.test(raw)) return "No hearing date safely extracted";
  const hearingOnly = raw
    .replace(/^.*?\bNext hearing:\s*/i, "")
    .replace(/^.*?\bCourt:\s*[^.]+?\.\s*/i, "")
    .trim();
  return hearingOnly || raw;
}

/** Optional bundle note — provisional, not a recorded CaseBrain position. */
export function pilotBundlePositionNote(context: WorkflowProfileContext): string | null {
  if (!isCriminalPilotMode()) return null;
  const profile = resolveWorkflowProfile(context);
  switch (profile) {
    case "fraud_account_control":
      return "Bundle note: position not fully finalised pending disclosure.";
    case "pwits_phone_attribution":
      return "Bundle note (provisional): position conditional pending digital/BWV material.";
    case "robbery_identification":
      return "Bundle note (provisional): not guilty in principle, subject to confirmation after full CCTV/ID material.";
    default:
      return null;
  }
}

/** CaseBrain position tile when nothing recorded in the app. */
export function pilotCaseBrainPositionStatus(hasRecordedPosition: boolean): string {
  if (hasRecordedPosition) return "";
  return "CaseBrain position: not recorded";
}

/** Position status / bundle defence line for Control Room tiles (pilot display only). */
export function pilotPositionDisplayLabel(
  label: string,
  context: WorkflowProfileContext,
): string {
  if (!isCriminalPilotMode()) return label;
  const trimmed = label.trim();
  if (!trimmed) return pilotCaseBrainPositionStatus(false);
  const sanitized = sanitizePilotVisibleLine(trimmed, context);
  if (sanitized) return sanitized;
  if (/Position (served|reserved) pending (full )?disclosure/i.test(trimmed)) {
    return "Position: provisional pending disclosure.";
  }
  return trimmed;
}

/** Priority disclosure labels for Court Today counts (8 per demo profile). */
export function pilotCourtChaseLabels(context: WorkflowProfileContext): string[] {
  const labels = workflowDisclosureChaseLabels(context);
  if (!labels?.length) return [];
  return labels.slice(0, WORKFLOW_DISCLOSURE_VISIBLE_CAP);
}

/** Malformed battleboard anchor snippets (joined index text, summary-only stubs). */
export function isMalformedPilotEvidenceAnchor(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 6) return true;
  const compact = t.replace(/\s+/g, "");
  if (/^\d{1,3}[A-Za-z]{3,}/.test(compact)) return true;
  if (/\d{1,3}(?:MG[0-9]{1,2}|BWV|CAD)\b/i.test(compact)) return true;
  if (/schedule\d{1,3}[A-Za-z]{3,}/i.test(compact)) return true;
  if (/[a-z]\d{1,3}[A-Z][a-z]/.test(compact)) return true;
  if (/\b\d{1,2}[A-Za-z]{4,}/.test(t) && !/\s{2,}/.test(t)) return true;
  if (/\b\d{1,2}[A-Za-z]{4,}/.test(t) && /\bServed summary only\b/i.test(t)) return true;
  if (/\bMG6 disclosure schedule\d/i.test(t)) return true;
  if (/\dMG6\b/i.test(t)) return true;
  if (/\bSearch BWV\d/i.test(t)) return true;
  if (/\bDevice login attribution\b/i.test(t) && /\bServed summary only\b/i.test(t)) return true;
  if (/\bnote\d{1,3}[A-Z]/i.test(compact)) return true;
  if (/against extract/i.test(t)) return true;
  if (/^\s*with a second male\b/i.test(t)) return true;
  if (/CCTV footage itself is not included in full/i.test(t) && t.length < 240) return true;
  if (/\bpoor lighting and\s*$/i.test(t)) return true;
  if (/\bstills are described as poor lighting\b/i.test(t) && !/[.!?]\s*$/.test(t.trim())) return true;
  return false;
}

/** Leon / robbery pilot display — phone-free wording and clean CCTV fragments. */
function normalizeRobberyPilotVisibleLine(line: string): string {
  let s = line.trim();
  if (!s) return s;

  if (/Phone or witness material may undermine participation\/attribution dispute if consistent/i.test(s)) {
    return "Witness, ID or association material may undermine the participation/attribution dispute if consistent.";
  }

  if (
    /Identification, participation and attribution remain conditional/i.test(s) &&
    /phone evidence/i.test(s)
  ) {
    return ROBBERY_DISCLOSURE_CASE_WIDE;
  }

  if (/phone evidence and witness source material/i.test(s)) {
    s = s.replace(
      /phone evidence and witness source material/gi,
      ROBBERY_SOURCE_MATERIAL_PHRASE,
    );
  }

  if (
    /with a second male.*(?:CCTV footage itself is not included|not included in full)/i.test(s) ||
    (/CCTV footage itself is not included in full/i.test(s) && /second male/i.test(s)) ||
    /\bstills are described as poor lighting\b/i.test(s)
  ) {
    return "CCTV footage is not served in full; second-male attribution remains unresolved.";
  }

  return s;
}

/** Normalize or drop ugly pilot-visible lines (anchors, risks, summaries). */
export function sanitizePilotVisibleLine(
  line: string,
  context: WorkflowProfileContext,
): string | null {
  let t = line.trim();
  if (!t) return null;
  const profileEarly = resolveWorkflowProfile(context);
  if (/Interview admission narrows the defence route/i.test(t)) {
    t = softenSolicitorSourceWording(t, profileEarly);
  }
  t = stripInternalEvalMarkers(t);
  if (!t || isInternalEvalMarkerOnlyLine(t)) return null;
  if (!isCriminalPilotMode()) return t;

  const profile = resolveWorkflowProfile(context);
  if (profile === "robbery_identification") {
    t = normalizeRobberyPilotVisibleLine(t);
  }

  if (isMalformedPilotEvidenceAnchor(t)) {
    if (/against extract/i.test(t)) {
      t = t.replace(/\s*\/\s*against extract\b/gi, "").replace(/\bagainst extract\b/gi, "").trim();
      if (!t) return null;
    } else if (profile === "robbery_identification") {
      const recovered = normalizeRobberyPilotVisibleLine(t);
      if (
        recovered === "CCTV footage is not served in full; second-male attribution remains unresolved."
      ) {
        t = recovered;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  if (shouldSuppressWorkflowPilotLine(t, profile)) return null;

  if (/take\/record instructions before relying/i.test(t)) {
    return t.replace(/take\/record instructions/i, "confirm client instructions");
  }
  if (
    /Possession, knowledge, intent to supply and phone attribution remain conditional on full phone, search, continuity and forensic material/i.test(
      t,
    )
  ) {
    return profile === "pwits_phone_attribution"
      ? (workflowDisclosureCaseWideLine(context) ?? t)
      : null;
  }

  if (/Position (served|reserved) pending (full )?disclosure/i.test(t)) {
    return "Position: provisional pending disclosure.";
  }
  if (
    /Missing expert\/source report comes back against defence/i.test(t) ||
    /Outstanding expert\/source material may return against the defence/i.test(t) ||
    /Missing expert\/source report returns against the defence/i.test(t)
  ) {
    return profile === "fraud_account_control"
      ? "Outstanding bank/device/source material may support the Crown if served."
      : null;
  }
  if (/Interview admission narrows the defence route/i.test(t)) {
    return softenSolicitorSourceWording(t, profile);
  }
  if (profile === "pwits_phone_attribution" && /\bcctv\b/i.test(t) && !/\bsearch\s+bwv\b/i.test(t)) {
    return null;
  }

  let s = cleanupPilotVisiblePunctuation(
    softenPilotRiskWording(normalizeWorkflowPilotLabel(t), profile),
  );
  if (
    profile === "robbery_identification" &&
    /Interview denial remains to be tested against bank\/device\/source material/i.test(s)
  ) {
    s =
      "Interview denial remains to be tested against served CCTV/ID and complainant material.";
  }
  if (
    profile === "violence_domestic_assault" &&
    /Interview denial remains to be tested against bank\/device\/source material/i.test(s)
  ) {
    s =
      "Interview denial remains to be tested against served complainant, BWV and medical material.";
  }
  if (
    profile === "pwits_phone_attribution" &&
    /Interview denial remains to be tested against bank\/device\/source material/i.test(s)
  ) {
    s =
      "Interview denial remains to be tested against served phone extraction, search BWV and continuity material.";
  }
  s = s.replace(/\s*\/\s*against extract\b/gi, "").replace(/\bagainst extract\b/gi, "").trim();
  return cleanupPilotVisiblePunctuation(s) || null;
}

/** Fix duplicated punctuation/phrasing in pilot-visible copy. */
export function cleanupPilotVisiblePunctuation(text: string): string {
  if (!text.trim()) return text;
  let s = text.trim();
  s = s.replace(/\bconsistent\.\./gi, "consistent.");
  s = s.replace(/\.{2,}(?=[\s,;:!?)\]]|$)/g, ".");
  s = s.replace(/\bconditional\s*[-–—,]\s*conditional\s+on\b/gi, "conditional on");
  s = s.replace(/\bconditional\s*[-–—,]\s*conditional\b/gi, "conditional");
  s = s.replace(/\bconditional\s+on\s+served\s+material\s*[-–—]\s*conditional\s+on\s+served\s+material\b/gi, "conditional on served material");
  return s.trim();
}

/** Pilot-visible list items (HWR lists, instructions) — punctuation + duplicate phrasing. */
export function pilotFinalizeBriefLines(lines: string[]): string[] {
  if (!isCriminalPilotMode()) return lines;
  return lines.map((line) => pilotCleanupVisibleText(line)).filter((line) => line.length > 0);
}

/** Pilot UI copy pass — punctuation only (Control Room / Case Summary). */
export function pilotCleanupVisibleText(text: string): string {
  if (!isCriminalPilotMode() || !text.trim()) return text;
  let s = text.trim().replace(/\s*\/\s*against extract\b/gi, "").replace(/\bagainst extract\b/gi, "");
  return cleanupPilotVisiblePunctuation(s);
}

/** Pilot case summary opener for demo matters. */
export function pilotCaseSummaryLead(
  clientLabel: string,
  context: WorkflowProfileContext,
): string | null {
  if (!isCriminalPilotMode()) return null;
  const profile = resolveWorkflowProfile(context);
  const client = clientLabel.trim();
  if (!client || notExtractedClient(client)) return null;
  if (profile === "robbery_identification") {
    return `${client} is accused of robbery. Identification and participation remain in issue.`;
  }
  return null;
}

function notExtractedClient(label: string): boolean {
  return /not safely extracted/i.test(label);
}

/** Route detail accordion is never shown in pilot — curated cockpit cards only. */
export function showPilotRouteDetailPanel(): boolean {
  return !isCriminalPilotMode();
}

export function sanitizePilotEvidenceAnchors(
  anchors: string[],
  context: WorkflowProfileContext,
): string[] {
  if (!isCriminalPilotMode()) return anchors;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of anchors) {
    if (isMalformedPilotEvidenceAnchor(raw)) continue;
    const visible = sanitizePilotVisibleLine(raw, context);
    if (!visible) continue;
    const key = visible.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(visible);
  }
  return out;
}

function pilotBackupRouteDisplayTitle(title: string, profile: WorkflowProfile): string {
  const t = title.trim();
  if (!t || profile === "generic") return t;
  if (profile === "fraud_account_control" && /\b(separate defendant|count-specific)\b/i.test(t)) {
    return "Account access / third-party control pressure";
  }
  if (profile === "pwits_phone_attribution" && /\b(identification|visual\s*id)\b/i.test(t)) {
    return "Shared premises / co-occupier attribution pressure";
  }
  if (/\bagainst extract\b/i.test(t)) return t.replace(/\s*\/\s*against extract\b/gi, "").trim();
  return t;
}

const INTERNAL_EVAL_MARKER_RE =
  /\b(?:CB-(?:TRAP|STAGE|INJECT|NOSAFE|GOLD|MESSY|PILOT|AA2?|Z|TEST)(?:-\d{4}-\d+)?|eval\s+pack|date-control)\b/gi;

/** Remove eval/stress harness ids from solicitor-visible copy. */
export function stripInternalEvalMarkers(text: string): string {
  return text
    .replace(INTERNAL_EVAL_MARKER_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|–—-]+|[\s|–—-]+$/g, "")
    .trim();
}

/** True when a line is only an internal eval marker (no substantive copy). */
export function isInternalEvalMarkerOnlyLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return stripInternalEvalMarkers(t).length === 0;
}

/** True when a line is a bundle reference rather than a clean profile route label. */
export function looksLikePilotBundleReferenceLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isInternalEvalMarkerOnlyLine(t)) return true;
  return (
    /\bCB-PILOT-\d+/i.test(t) ||
    /\|\s*pilot bundle\b/i.test(t) ||
    /\bpilot bundle\s*\|/i.test(t) ||
    (/^R v\s+/i.test(t) && /\bCB-PILOT\b/i.test(t))
  );
}

/** Plural subject for disclosure chase court/draft lines (e.g. "statements appear"). */
export function disclosureChaseUsesPluralSubject(label: string): boolean {
  const l = label.toLowerCase();
  if (
    /\b(statements|schedules|logs|materials|records|accounts|witnesses|items|data|exports|mailboxes)\b/.test(l)
  ) {
    return true;
  }
  if (/\//.test(l) && /\b(bank|export|source|schedule|statement|material|log|device)\b/.test(l)) {
    return true;
  }
  if (/\band\b/.test(l) && /\b(bank|statements|material|records|schedules)\b/.test(l)) {
    return true;
  }
  return false;
}

export function pilotOutstandingVerbForLabel(label: string): "appear" | "appears" {
  return disclosureChaseUsesPluralSubject(label) ? "appear" : "appears";
}

/** Source-safe replacements — applies in pilot and non-pilot (API, auditor, solicitor UI). */
export function softenSolicitorSourceWording(
  text: string,
  profile: WorkflowProfile = "generic",
): string {
  if (!text.trim()) return text;
  let s = stripInternalEvalMarkers(text.trim());
  if (!s) return "";
  s = s.replace(
    /\bFull CCTV confirms Crown timing\b\.?/gi,
    "Full CCTV may support Crown timing if served and consistent",
  );
  s = s.replace(/\bFull CCTV confirms\b/gi, "Full CCTV may support Crown account if served and consistent");
  s = s.replace(
    /\b([A-Za-z][\w\s/]*?)\s+confirms\s+(Crown[\w\s]*)/gi,
    (_m, subj: string, crown: string) =>
      `${subj.trim()} may support ${crown.trim()} if served and consistent`,
  );
  s = s.replace(
    /Outstanding expert\/source material may return against the defence route if served\.?/gi,
    "Outstanding bank/device/source material may support the Crown if served.",
  );
  s = s.replace(
    /Missing expert\/source report comes back against defence\.?/gi,
    "Outstanding bank/device/source material may support the Crown if served.",
  );
  s = s.replace(
    /Missing expert\/source report returns against the defence\.?/gi,
    "Outstanding bank/device/source material may support the Crown if served.",
  );
  s = s.replace(/Interview admission narrows the defence route\.?/gi, () => {
    if (profile === "robbery_identification") {
      return "Interview denial remains to be tested against served CCTV/ID and complainant material.";
    }
    if (profile === "pwits_phone_attribution") {
      return "Interview denial remains to be tested against served phone extraction, search BWV and continuity material.";
    }
    if (profile === "violence_domestic_assault") {
      return "Interview denial remains to be tested against served complainant, BWV and medical material.";
    }
    return "Interview denial remains to be tested against bank/device/source material.";
  });
  s = s.replace(
    /\bCAD\/999 timing supports Crown sequence\.?/gi,
    "CAD/999 timing may affect sequence if served and reconciled.",
  );
  s = s.replace(
    /\b999\/CAD timing supports Crown sequence\.?/gi,
    "CAD/999 timing may affect sequence if served and reconciled.",
  );
  s = s.replace(
    /\b999\/CAD timing may support the Crown sequence once served\.?/gi,
    "CAD/999 timing may affect sequence if served and reconciled.",
  );
  s = s.replace(/\bestablishes guilt\b/gi, "may bear on the Crown case if served and consistent");
  s = s.replace(/\bproves participation\b/gi, "may bear on participation if served and consistent");
  s = s.replace(/\bconfirms participation\b/gi, "may bear on participation if served and consistent");
  s = s.replace(/\bproves the (?:offence|case)\b/gi, "may support the Crown case if served and consistent");
  s = s.replace(/\bdefinitely (?:proves|shows|confirms)\b/gi, "may show if served and consistent");
  return cleanupPilotVisiblePunctuation(s);
}

/** Soften absolute collapse-risk wording in pilot mode. */
export function softenPilotRiskWording(
  text: string,
  profile: WorkflowProfile = "generic",
): string {
  if (!isCriminalPilotMode() || !text.trim()) return text;
  return softenSolicitorSourceWording(text, profile);
}

/** Fix broken chase labels (e.g. cCTV → CCTV). */
export function normalizeWorkflowPilotLabel(line: string): string {
  return line
    .replace(/\bcCTV\b/g, "CCTV")
    .replace(/\bcctv\b/g, "CCTV")
    .replace(/\bbody\s+[Ww]orn\b/g, "body-worn")
    .replace(/\binterview\s+[Rr]ecording\b/g, "Interview recording")
    .replace(/\bbwv\b/gi, "BWV")
    .replace(/\bcad\b/gi, "CAD")
    .replace(/\bmg11\b/gi, "MG11")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse duplicate chase labels after normalisation (case-insensitive). */
export function dedupeWorkflowChaseLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const normalized = normalizeWorkflowPilotLabel(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/** Pilot disclosure chase court-record line with plural-aware grammar. */
export function formatPilotCourtLine(label: string): string {
  const core = normalizeWorkflowPilotLabel(label);
  const verb = pilotOutstandingVerbForLabel(core);
  const provision = core.charAt(0).toLowerCase() + core.slice(1);
  return `The defence asks the court to record that ${provision} ${verb} outstanding on the current file and should be disclosed on a timetable.`;
}

/** Pilot disclosure chase email wording — lowercase prose but keep CCTV/BWV/CAD etc. */
export function formatPilotDraftChaseWording(label: string): string {
  const normalized = normalizeWorkflowPilotLabel(label);
  const provision = normalized
    .toLowerCase()
    .replace(/\bcctv\b/g, "CCTV")
    .replace(/\bbwv\b/g, "BWV")
    .replace(/\bcad\b/g, "CAD")
    .replace(/\bip\b/g, "IP")
    .replace(/\bsim\b/g, "SIM")
    .replace(/\bimei\b/g, "IMEI")
    .replace(/\bpoca\b/g, "POCA")
    .replace(/\bdna\b/g, "DNA");
  const verb = pilotOutstandingVerbForLabel(normalized);
  if (disclosureChaseUsesPluralSubject(normalized)) {
    const subject = provision.charAt(0).toUpperCase() + provision.slice(1);
    return `Please provide ${provision}. ${subject} ${verb} outstanding on the current file and may be relevant to preparation — conditional on what is ultimately served. Kindly confirm expected service date.`;
  }
  return `Please provide ${provision}. This material ${verb} outstanding on the current file and may be relevant to preparation — conditional on what is ultimately served. Kindly confirm expected service date.`;
}

const FRAUD_VISIBLE_SUPPRESS =
  /\b(cctv|bwv|999|cad|custody|body.worn|mg11|call audio|full cctv|timing supports crown|confirms crown timing|crown sequence|crown timing|phone or witness material|participation\/attribution dispute)\b/i;

const PWITS_VISIBLE_SUPPRESS =
  /\b(cctv full|cctv continuity|999|cad|medical|expert report|pathology|mg11\s+is\s+consistent|mg11\s+consistent)\b/i;

const ROBBERY_VISIBLE_SUPPRESS =
  /\b(custody record|custody cctv|mg11|body.worn|bwv\b|body-worn|bank export|bank\/device|device\/login|account[- ]?control|fraud by)\b/i;

const VIOLENCE_VISIBLE_SUPPRESS =
  /\b(bank export|bank\/device|device\/login|phone extraction|intent to supply|poca|account-control|pwits|robbery identification route)\b/i;

/** Suppress generic violence/source-template lines from visible pilot workflow output. */
export function shouldSuppressWorkflowPilotLine(line: string, profile: WorkflowProfile): boolean {
  if (profile === "generic" || !line.trim()) return false;
  const norm = normalizeWorkflowPilotLabel(line);
  if (profile === "fraud_account_control") {
    if (/Missing expert\/source report comes back against defence/i.test(norm)) return false;
    if (/Position (served|reserved) pending (full )?disclosure/i.test(norm)) return false;
    return FRAUD_VISIBLE_SUPPRESS.test(norm);
  }
  if (profile === "pwits_phone_attribution") {
    if (/Count\s*2:\s*Possession of criminal property.*under review/i.test(norm)) return true;
    if (/\bsearch bwv\b/i.test(norm)) return false;
    if (/\bmg11\b/i.test(norm) && /\b(consistent|served)\b/i.test(norm)) return true;
    if (/\b(full cctv|crown timing|confirms crown|cctv confirms)\b/i.test(norm)) return true;
    return PWITS_VISIBLE_SUPPRESS.test(norm);
  }
  if (profile === "robbery_identification") {
    if (/\b(cctv master|cctv continuity|id procedure|999|cad timing|complainant|co-defendant|unknown male)\b/i.test(norm)) {
      return false;
    }
    if (/Phone or witness material may undermine/i.test(norm)) return false;
    if (/\b(stolen.property|recovered elsewhere)\b/i.test(norm)) return true;
    if (/\bphone evidence\b/i.test(norm) && !/\bno phone\b/i.test(norm)) return true;
    if (/\bphone or witness\b/i.test(norm) && !/\bwitness, id or association\b/i.test(norm)) return true;
    if (/\bCount\s*2:\s*Possession of criminal property\b/i.test(norm)) return true;
    if (/\bbank\/device\/source material\b/i.test(norm)) return true;
    if (/\bbank\b/i.test(norm) && !/\bbank\s+(holiday|branch)\b/i.test(norm)) return true;
    return ROBBERY_VISIBLE_SUPPRESS.test(norm) || /\bcctv full window\b/i.test(norm);
  }
  if (profile === "violence_domestic_assault") {
    if (/\b(complainant|mg11|medical|injury|bwv|999|cad|retraction)\b/i.test(norm)) return false;
    return VIOLENCE_VISIBLE_SUPPRESS.test(norm);
  }
  return shouldSuppressGenericChaseLabel(norm, profile);
}

export function workflowProfileFallbackRisks(context: WorkflowProfileContext): string[] {
  const profile = resolveWorkflowProfile(context);
  if (profile === "fraud_account_control") {
    return [
      "Served bank/export schedules may bear on account-control — appears outstanding until reviewed.",
      "Device/login/IP material may affect attribution — solicitor review required before fixing position.",
      "POCA/source-of-funds exposure remains conditional on served financial material.",
    ];
  }
  if (profile === "pwits_phone_attribution") {
    return [
      "Phone extraction and attribution may bear on possession/knowledge — appears outstanding until served.",
      "Search continuity for drugs/cash may affect route viability — solicitor review required.",
      "Shared-premises/co-occupier context may remain live pending served material.",
    ];
  }
  if (profile === "robbery_identification") {
    return [
      "CCTV master/continuity may bear on identification — appears outstanding until served.",
      "ID procedure and complainant first account may affect identification fairness — solicitor review required.",
      "999/CAD timing and co-defendant attribution may remain live pending served material.",
    ];
  }
  if (profile === "violence_domestic_assault") {
    return [
      "Complainant account and BWV may bear on participation/causation — appears outstanding until served.",
      "Medical/injury material may affect the route — solicitor review required before fixing position.",
      "Domestic context and any retraction may remain live pending served material.",
    ];
  }
  return [];
}

function softenWorkflowLineList(
  lines: string[],
  context: WorkflowProfileContext,
  max: number,
): string[] {
  const profile = resolveWorkflowProfile(context);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    let visible = raw.trim();
    if (!visible) continue;
    visible = softenSolicitorSourceWording(visible, profile);
    if (/Interview admission narrows the defence route/i.test(visible)) continue;
    if (isCriminalPilotMode()) {
      const sanitized = sanitizePilotVisibleLine(visible, context);
      if (!sanitized) continue;
      visible = sanitized;
    } else {
      visible = cleanupPilotVisiblePunctuation(visible);
      if (!visible) continue;
    }
    const key = visible.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(visible);
  }
  return unique.slice(0, max);
}

export function filterWorkflowPilotLines(
  lines: string[],
  context: WorkflowProfileContext,
  opts?: { max?: number; useFallbacks?: boolean },
): string[] {
  const profile = resolveWorkflowProfile(context);
  if (!isCriminalPilotMode()) {
    const max = opts?.max ?? lines.length;
    const softened = softenWorkflowLineList(lines, context, max);
    return softened.length > 0 ? softened : lines.slice(0, max);
  }
  if (profile === "generic") return lines.slice(0, opts?.max);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const visible = sanitizePilotVisibleLine(raw, context);
    if (!visible) continue;
    const key = visible.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(visible);
  }

  const max = opts?.max ?? unique.length;
  if (unique.length === 0 && opts?.useFallbacks !== false) {
    return workflowProfileFallbackRisks(context).slice(0, max);
  }
  return unique.slice(0, max);
}

/** Clean profile-specific snippet for Hearing War Room draft wording blocks. */
export function workflowDraftDisclosureSnippet(
  context: WorkflowProfileContext,
  maxItems = 3,
): string {
  const labels = workflowDisclosureChaseLabels(context);
  if (labels?.length) {
    return labels
      .slice(0, maxItems)
      .map(normalizeWorkflowPilotLabel)
      .join("; ");
  }
  return "outstanding source material on the current papers";
}

/** Profile-only ask-court bullets — never merge generic chase labels. */
export function workflowProfileAskCourtOnly(context: WorkflowProfileContext): string[] | null {
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic") return null;
  return workflowCourtRecordAsks(context);
}

function filterRouteLists(
  route: BattleboardRoute,
  context: WorkflowProfileContext,
): BattleboardRoute {
  const profile = resolveWorkflowProfile(context);
  const cap = (items: string[], max: number) =>
    filterWorkflowPilotLines(items, context, { max, useFallbacks: false });
  return {
    ...route,
    title: pilotBackupRouteDisplayTitle(route.title, profile),
    why_it_helps: cap(route.why_it_helps ?? [], 4),
    what_hurts_us: cap(route.what_hurts_us ?? [], 4),
    evidence_anchors: sanitizePilotEvidenceAnchors(cap(route.evidence_anchors ?? [], 4), context),
    collapse_risks: cap(route.collapse_risks ?? [], 4),
    next_moves: cap(route.next_moves ?? [], 4),
  };
}

function filterSolicitorSummary(summary: string | undefined, context: WorkflowProfileContext): string {
  if (!summary?.trim()) return summary ?? "";
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic") return summary;
  const sentences = summary.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const kept = filterWorkflowPilotLines(sentences, context, { max: 2, useFallbacks: false });
  if (kept.length) return kept.join(" ");
  const routeTitle = workflowPrimaryRouteTitle(context);
  return routeTitle
    ? `${routeTitle} — solicitor review required pending served material.`
    : "Provisional route — solicitor review required pending served material.";
}

function softenBattleboardRoutes(
  bb: BattleboardOutput,
  context: WorkflowProfileContext,
): BattleboardOutput {
  const profile = resolveWorkflowProfile(context);
  const softenList = (items: string[]) =>
    items
      .map((l) => softenSolicitorSourceWording(l.trim(), profile))
      .filter((l) => l.length > 0 && !/Interview admission narrows the defence route/i.test(l));
  const softenRoute = (r: BattleboardRoute): BattleboardRoute => ({
    ...r,
    collapse_risks: softenList(r.collapse_risks ?? []),
    what_hurts_us: softenList(r.what_hurts_us ?? []),
    why_it_helps: softenList(r.why_it_helps ?? []),
    evidence_anchors: softenList(r.evidence_anchors ?? []),
    hearing_line: r.hearing_line
      ? softenSolicitorSourceWording(r.hearing_line, profile)
      : r.hearing_line,
  });
  const routes = bb.routes.map(softenRoute);
  const primary = bb.primary_route
    ? routes.find((r) => r.id === bb.primary_route!.id) ?? softenRoute(bb.primary_route)
    : bb.primary_route;
  return {
    ...bb,
    routes,
    primary_route: primary,
    global_collapse_risks: softenList(bb.global_collapse_risks ?? []),
    urgent_next_moves: softenList(bb.urgent_next_moves ?? []),
    solicitor_safe_summary: bb.solicitor_safe_summary
      ? softenSolicitorSourceWording(bb.solicitor_safe_summary, profile)
      : bb.solicitor_safe_summary,
  };
}

/** Strip generic template leakage from battleboard output in pilot workflow mode. */
export function filterBattleboardForWorkflowPilot(
  bb: BattleboardOutput | null,
  context: WorkflowProfileContext,
): BattleboardOutput | null {
  if (!bb) return bb;
  const softened = softenBattleboardRoutes(bb, context);
  if (!isCriminalPilotMode()) return softened;
  const profile = resolveWorkflowProfile(context);
  if (profile === "generic" || isProvisionalWorkflowProfile(profile)) return softened;

  const routes = softened.routes.map((r) => filterRouteLists(r, context));
  const picked = pickWorkflowPrimaryRoute(routes, context);
  const primary = picked
    ? routes.find((r) => r.id === picked.id) ?? filterRouteLists(picked, context)
    : softened.primary_route
      ? routes.find((r) => r.id === softened.primary_route!.id) ??
        filterRouteLists(softened.primary_route, context)
      : softened.primary_route;

  return {
    ...softened,
    routes,
    primary_route: primary,
    global_collapse_risks: filterWorkflowPilotLines(softened.global_collapse_risks ?? [], context, {
      max: 5,
    }),
    urgent_next_moves: filterWorkflowPilotLines(softened.urgent_next_moves ?? [], context, { max: 5 }),
    solicitor_safe_summary: filterSolicitorSummary(softened.solicitor_safe_summary, context),
  };
}

export function workflowDisclosureWhyItMatters(label: string, profile: WorkflowProfile): string {
  const l = label.toLowerCase();
  if (profile === "fraud_account_control") {
    if (/\bbank|schedule|statement\b/.test(l)) {
      return "Bank export and schedule source data may bear on account movement and dishonesty — appears outstanding until served.";
    }
    if (/\bdevice|login|ip|access\b/.test(l)) {
      return "Device/login/IP material may bear on who controlled accounts — appears outstanding until served.";
    }
    if (/\baccountant|bookkeeper|witness\b/.test(l)) {
      return "Third-party witness/accounting material may assist account-access instructions — appears outstanding.";
    }
    if (/\bmailbox|email\b/.test(l)) {
      return "Mailbox/email export may bear on account-control attribution — appears outstanding until served.";
    }
    if (/\bpoca|source.of.funds\b/.test(l)) {
      return "POCA/source-of-funds material may affect ancillary exposure — appears outstanding until served.";
    }
    return "Financial/source material appears outstanding on the current papers — solicitor review required.";
  }
  if (profile === "pwits_phone_attribution") {
    if (/\bphone|extraction|sim|imei|subscriber|attribution\b/.test(l)) {
      return "Phone extraction and attribution may bear on possession/knowledge — appears outstanding until served.";
    }
    if (/\bsearch|bwv|seizure\b/.test(l)) {
      return "Search BWV export and seizure continuity may bear on how drugs/cash were recovered — appears outstanding.";
    }
    if (/\blab continuity|drug\/cash continuity\b/.test(l)) {
      return "Drug/cash and lab continuity notes may bear on possession/knowledge — appears outstanding until served.";
    }
    if (/\bco-occupier|shared premises\b/.test(l)) {
      return "Shared-premises/co-occupier material may bear on knowledge and control — appears outstanding.";
    }
    return "Possession/source material appears outstanding on the current papers — solicitor review required.";
  }
  if (profile === "robbery_identification") {
    if (/\bcctv|export|continuity\b/.test(l)) {
      return "CCTV master/continuity may bear on identification and participation — appears outstanding.";
    }
    if (/\bid procedure|viper|parade\b/.test(l)) {
      return "ID procedure material may bear on identification fairness — appears outstanding.";
    }
    if (/\b999|cad|timing\b/.test(l)) {
      return "999/CAD timing may bear on sequence and deployment — appears outstanding.";
    }
    if (/\bcomplainant|first account\b/.test(l)) {
      return "Complainant first account may bear on identification and participation — appears outstanding.";
    }
    if (/\bco-defendant|unknown male\b/.test(l)) {
      return "Co-defendant/unknown male attribution may remain live — appears outstanding until served.";
    }
    if (/\bcomplainant statement|signed complainant\b/.test(l)) {
      return "Final signed complainant statement may bear on identification — appears outstanding until served.";
    }
    return "Identification/source material appears outstanding on the current papers — solicitor review required.";
  }
  if (profile === "violence_domestic_assault") {
    if (/\bcomplainant|mg11|first account\b/.test(l)) {
      return "Complainant account may bear on participation and causation — appears outstanding until served.";
    }
    if (/\bbwv|body.worn|incident footage\b/.test(l)) {
      return "BWV/incident footage may bear on what occurred — appears outstanding until served.";
    }
    if (/\bmedical|injury|hospital\b/.test(l)) {
      return "Medical/injury material may bear on harm and causation — appears outstanding.";
    }
    if (/\b999|cad\b/.test(l)) {
      return "999/CAD material may bear on deployment and sequence — appears outstanding.";
    }
    if (/\bretraction|further statement\b/.test(l)) {
      return "Retraction or further complainant material may affect the account — appears outstanding.";
    }
    return "Violence/source material appears outstanding on the current papers — solicitor review required.";
  }
  return "Source material appears outstanding on the current papers — solicitor review required.";
}

export function shouldSuppressGenericChaseLabel(label: string, profile: WorkflowProfile): boolean {
  if (profile === "generic" || isProvisionalWorkflowProfile(profile)) return false;
  return PROFILE_PACKS[profile].suppressGeneric.test(label);
}

function packFor(profile: WorkflowProfile): ProfilePack | null {
  if (profile === "generic" || isProvisionalWorkflowProfile(profile)) return null;
  return PROFILE_PACKS[profile];
}

/** Rank chase labels for generic fallback — profile-specific items float up, noise sinks. */
export function prioritizeWorkflowItems(items: string[], context: WorkflowProfileContext): string[] {
  const profile = resolveWorkflowProfile(context);
  const pack = packFor(profile);
  if (!pack || items.length <= 1) return items;

  const scored = items.map((item, idx) => {
    let score = -idx;
    for (const re of pack.rankUp) if (re.test(item)) score += 10;
    for (const re of pack.rankDown) if (re.test(item)) score -= 8;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

/** @deprecated Use {@link prioritizeWorkflowItems}. */
export function prioritizePilotWorkflowItems(items: string[], context: WorkflowProfileContext): string[] {
  return prioritizeWorkflowItems(items, context);
}

export function filterWorkflowItems(items: string[], context: WorkflowProfileContext): string[] {
  const profile = resolveWorkflowProfile(context);
  const pack = packFor(profile);
  if (!pack) return items;

  const hasPreferred = items.some((i) => pack.rankUp.some((re) => re.test(i)));
  if (!hasPreferred) return items.filter((i) => !pack.suppressGeneric.test(i));
  return items.filter((i) => !pack.suppressGeneric.test(i));
}

/** @deprecated Use {@link filterWorkflowItems}. */
export function filterPilotWorkflowItems(items: string[], context: WorkflowProfileContext): string[] {
  return filterWorkflowItems(items, context);
}

/** Test helper: index of first item matching any pattern (lower = higher rank). */
export function firstMatchIndex(items: string[], patterns: RegExp[]): number {
  for (let i = 0; i < items.length; i++) {
    if (patterns.some((re) => re.test(items[i]!))) return i;
  }
  return items.length;
}
