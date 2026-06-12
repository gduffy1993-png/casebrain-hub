import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import type { BattleboardOutput, BattleboardRouteType } from "@/lib/criminal/strategy-battleboard";
import {
  filterWorkflowItems,
  normalizeWorkflowPilotLabel,
  prioritizeWorkflowItems,
  resolveWorkflowProfile,
  formatPilotCourtLine,
  formatPilotDraftChaseWording,
  isMalformedPilotEvidenceAnchor,
  pilotCleanupVisibleText,
  sanitizePilotVisibleLine,
  workflowDisclosureCaseWideLine,
  workflowDisclosureChaseLabels,
  workflowDisclosureWhyItMatters,
} from "@/lib/criminal/pilot-workflow";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import {
  buildBundleTruthLedger,
  formatDisplayLabelCasing,
  guardSolicitorLine,
  isAdminGuidanceLine,
  ledgerAnchorForChaseFamily,
  ledgerMaterialsNeedingChase,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger } from "@/lib/criminal/bundle-truth-types";
import {
  confirmNoneLine,
  familiesInText,
  familyDisplayName,
  familySupport,
  gateProseAgainstSource,
  type ChaseGateFamily,
} from "@/lib/criminal/chase-source-gate";

const FORBIDDEN_RE =
  /\b(this wins|case collapses|crowns?\s+will\s+lose|crown\s+case\s+collapses|guaranteed|will\s+be\s+acquitted)\b/i;

const COURT_RECORD_PREFIX = "The defence asks the court to record";

export const DISCLOSURE_CHASE_PRIMARY_CAP = 8;

export type ChaseItemStatus =
  | "Outstanding"
  | "Chased"
  | "Received"
  | "Overdue"
  | "Due soon"
  | "Not safely confirmed";

export type ChaseFamilyId =
  | "cctv_master"
  | "cctv_continuity"
  | "cad_999"
  | "bwv"
  | "interview"
  | "mg6_unused"
  | "medical_expert"
  | "exhibit_provenance"
  | "other";

type FamilyDef = {
  id: ChaseFamilyId;
  label: string;
  source: string;
  priority: number;
  match: (text: string) => boolean;
};

const CHASE_FAMILIES: FamilyDef[] = [
  {
    id: "cctv_continuity",
    label: "CCTV continuity / provenance",
    source: "Police / CCTV unit",
    priority: 1,
    match: (t) =>
      /\b(cctv|video)\b/.test(t) &&
      /\b(continuity|provenance|chain\s+of\s+custody|integrity)\b/.test(t),
  },
  {
    id: "cctv_master",
    label: "CCTV full window / master footage",
    source: "Police / CCTV unit",
    priority: 2,
    match: (t) =>
      /\b(cctv|master|full\s*window|footage|video)\b/.test(t) &&
      !/\b(continuity|provenance|chain\s+of\s+custody)\b/.test(t),
  },
  {
    id: "cad_999",
    label: "CAD / 999 audio / control-room material",
    source: "Police control room",
    priority: 3,
    match: (t) => /\b(999|cad|control\s*room|dispatch)\b/.test(t),
  },
  {
    id: "bwv",
    label: "Body-worn video (BWV)",
    source: "Police / officer body-worn video",
    priority: 4,
    match: (t) => /\b(bwv|body\s*worn|body-worn)\b/.test(t),
  },
  {
    id: "interview",
    label: "Interview recording / transcript",
    source: "Custody / police interview unit",
    priority: 5,
    match: (t) => /\b(interview|transcript|custody\s*record|pace)\b/.test(t) && !/\bmg6\b/.test(t),
  },
  {
    id: "mg6_unused",
    label: "MG6 / unused / schedule clarification",
    source: "CPS / disclosure officer",
    priority: 6,
    match: (t) => /\b(mg6|unused|disclosure\s*schedule|cpi(a)?|material\s*not\s*used)\b/.test(t),
  },
  {
    id: "medical_expert",
    label: "Medical / expert source report",
    source: "CPS / expert source (confirm on file)",
    priority: 7,
    match: (t) => /\b(medical|gp|hospital|pathology|expert|autopsy|fme)\b/.test(t),
  },
  {
    id: "exhibit_provenance",
    label: "Exhibit mapping / provenance",
    source: "Crown / disclosure officer",
    priority: 8,
    match: (t) =>
      /\b(exhibit|provenance|mapping|continuity)\b/.test(t) &&
      !/\b(cctv|video|999|cad)\b/.test(t),
  },
];

export type DisclosureChaseItem = {
  id: string;
  familyId: ChaseFamilyId;
  label: string;
  whyItMatters: string;
  source: string;
  baseStatus: ChaseItemStatus;
  urgency: "high" | "medium" | "low";
  deadlineLabel: string;
  evidenceAnchor: string | null;
  linkedRoute: string | null;
  draftChaseWording: string;
  courtLine: string;
  mergedFrom: string[];
};

export type DisclosureChaseCounters = {
  total: number;
  overdue: number;
  dueSoon: number;
  chased: number;
  received: number;
  notStarted: number;
};

export type DisclosureChaseBrief = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  disclosureSummary: string;
  safeCourtLine: string;
  /** All deduped items (for filters/counters). */
  items: DisclosureChaseItem[];
  /** Top priority items shown by default (max {@link DISCLOSURE_CHASE_PRIMARY_CAP}). */
  primaryItems: DisclosureChaseItem[];
  /** Lower-priority / misc grouped items. */
  additionalItems: DisclosureChaseItem[];
  linkedRoutes: string[];
  counters: DisclosureChaseCounters;
  hearingDeadlineNote: string | null;
};

export type BuildDisclosureChaseBriefInput = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  hearingDateIso: string | null;
  bundleHealth: string;
  positionStatus: string;
  battleboard: BattleboardOutput | null;
  snapshotMissing?: { label: string; status: string }[];
  proceduralOutstanding?: string[];
  bundleText?: string | null;
  profileHint?: import("@/lib/criminal/pilot-workflow").WorkflowProfile | null;
};

function normalizeRawLabel(raw: string): string {
  return formatDisplayLabelCasing(
    raw
      .replace(/^chase[:\s]*/i, "")
      .replace(/^outstanding[:\s]*/i, "")
      .trim(),
  );
}

function classifyFamily(text: string): ChaseFamilyId {
  const t = text.toLowerCase();
  for (const fam of CHASE_FAMILIES) {
    if (fam.match(t)) return fam.id;
  }
  return "other";
}

function getFamilyDef(id: ChaseFamilyId): FamilyDef {
  if (id === "other") {
    return {
      id: "other",
      label: "Additional source-material issue",
      source: "Crown / disclosure officer (confirm on file)",
      priority: 99,
      match: () => true,
    };
  }
  return CHASE_FAMILIES.find((f) => f.id === id)!;
}

function daysUntilHearing(iso: string | null): number | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hearing = new Date(d);
  hearing.setHours(0, 0, 0, 0);
  return Math.round((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type DeadlineContext = {
  days: number | null;
  sharedLabel: string;
  hearingDeadlineNote: string | null;
  urgency: "high" | "medium" | "low";
  baseStatus: ChaseItemStatus;
};

function resolveDeadlineContext(days: number | null): DeadlineContext {
  if (days === null) {
    return {
      days: null,
      sharedLabel: "Before next hearing",
      hearingDeadlineNote: "Hearing date not safely extracted — chase deadlines are provisional.",
      urgency: "medium",
      baseStatus: "Not safely confirmed",
    };
  }
  if (days < 0) {
    return {
      days,
      sharedLabel: "Hearing date passed — chase urgently",
      hearingDeadlineNote: null,
      urgency: "high",
      baseStatus: "Overdue",
    };
  }
  if (days === 0) {
    return {
      days,
      sharedLabel: "Hearing today",
      hearingDeadlineNote: null,
      urgency: "high",
      baseStatus: "Due soon",
    };
  }
  if (days <= 3) {
    return {
      days,
      sharedLabel: `Within ${days} day(s) of hearing`,
      hearingDeadlineNote: null,
      urgency: "high",
      baseStatus: "Due soon",
    };
  }
  if (days <= 7) {
    return {
      days,
      sharedLabel: `Within ${days} days of hearing`,
      hearingDeadlineNote: null,
      urgency: "medium",
      baseStatus: "Due soon",
    };
  }
  return {
    days,
    sharedLabel: "Before next hearing",
    hearingDeadlineNote: null,
    urgency: "low",
    baseStatus: "Outstanding",
  };
}

function routeType(bb: BattleboardOutput | null): BattleboardRouteType | null {
  return bb?.primary_route?.route_type ?? null;
}

function inferWhyItMatters(
  familyId: ChaseFamilyId,
  battleboard: BattleboardOutput | null,
  mergedFrom: string[],
): string {
  const rt = routeType(battleboard);
  const primaryTitle = battleboard?.primary_route?.title;
  const routeHint = primaryTitle ? ` (linked to route: ${primaryTitle})` : "";

  switch (familyId) {
    case "cctv_master":
      if (rt === "timeline")
        return `On this file, timing/sequence may turn on served CCTV — full window/master footage appears outstanding${routeHint}.`;
      if (rt === "identity")
        return `Identification issues on this file may depend on served CCTV — master footage not safely confirmed${routeHint}.`;
      return `CCTV full window/master footage appears outstanding — may bear on timing or identification once served${routeHint}.`;
    case "cctv_continuity":
      return `Continuity/provenance for CCTV may need to be established before any account is safely fixed${routeHint}.`;
    case "cad_999":
      if (rt === "timeline")
        return `CAD/999 material may bear on deployment and timing on this file — appears outstanding until served${routeHint}.`;
      return `CAD/999 audio appears outstanding — may assist sequence analysis if timing is in issue${routeHint}.`;
    case "bwv":
      return `Officer BWV may bear on interaction at scene — appears outstanding; do not rely on it until served${routeHint}.`;
    case "interview":
      if (rt === "interview")
        return `Interview recording/transcript needed to check account against MG5/MG6 before fixing hearing line${routeHint}.`;
      return `Interview material appears outstanding — needed to test account against served prosecution material${routeHint}.`;
    case "mg6_unused":
      return `MG6/unused clarification may affect disclosure fairness and route viability — solicitor review required${routeHint}.`;
    case "medical_expert":
      if (rt === "causation")
        return `Medical/expert source may bear on causation on this file — appears outstanding until served${routeHint}.`;
      return `Medical/expert material appears outstanding — relevance depends on charge and served reports${routeHint}.`;
    case "exhibit_provenance":
      return `Exhibit mapping/provenance may need to be confirmed before exhibits are relied upon in court${routeHint}.`;
    case "other": {
      const preview = mergedFrom.slice(0, 2).join("; ");
      return preview
        ? `Additional source-material points appear on file (${preview}) — not safely confirmed until reviewed.`
        : "Additional source-material appears outstanding on the current file — solicitor to confirm relevance.";
    }
  }
}

function toCourtLine(canonicalLabel: string): string {
  const core = canonicalLabel.trim();
  if (!core || FORBIDDEN_RE.test(core)) {
    return `${COURT_RECORD_PREFIX} that outstanding source material remains on the disclosure schedule and should be timetabled.`;
  }
  return `${COURT_RECORD_PREFIX} that ${core.charAt(0).toLowerCase()}${core.slice(1)} appears outstanding on the current file and should be disclosed on a timetable.`;
}

function draftChaseWording(canonicalLabel: string, mergedFrom: string[]): string {
  const detail =
    mergedFrom.length > 1
      ? ` (including items noted on file: ${mergedFrom.slice(0, 3).join("; ")}${mergedFrom.length > 3 ? "…" : ""})`
      : "";
  return `Please provide ${canonicalLabel.toLowerCase()}. This material appears outstanding on the current file and may be relevant to preparation — conditional on what is ultimately served${detail}. Kindly confirm expected service date.`;
}

function findLinkedRoute(
  familyId: ChaseFamilyId,
  battleboard: BattleboardOutput | null,
): string | null {
  if (!battleboard) return null;
  const typeMap: Partial<Record<ChaseFamilyId, BattleboardRouteType[]>> = {
    cctv_master: ["timeline", "identity"],
    cctv_continuity: ["continuity", "timeline"],
    cad_999: ["timeline"],
    interview: ["interview"],
    mg6_unused: ["disclosure"],
    medical_expert: ["causation"],
  };
  const want = typeMap[familyId];
  if (want?.length) {
    for (const route of battleboard.routes) {
      if (want.includes(route.route_type)) return route.title;
    }
  }
  return battleboard.primary_route?.title ?? null;
}

const LEDGER_ANCHOR_FAMILIES = new Set<ChaseFamilyId>([
  "cctv_master",
  "cctv_continuity",
  "cad_999",
  "bwv",
  "interview",
  "mg6_unused",
  "medical_expert",
  "exhibit_provenance",
]);

function findEvidenceAnchor(
  familyId: ChaseFamilyId,
  mergedFrom: string[],
  battleboard: BattleboardOutput | null,
  ledger: BundleTruthLedger | null,
): string | null {
  if (ledger) {
    const fromLedger = ledgerAnchorForChaseFamily(familyId, ledger);
    if (fromLedger && !isAdminGuidanceLine(fromLedger)) return fromLedger;
    if (LEDGER_ANCHOR_FAMILIES.has(familyId)) return null;
  }

  if (!battleboard) return null;
  const needles = mergedFrom.map((m) => m.toLowerCase());
  for (const route of battleboard.routes) {
    for (const a of route.evidence_anchors ?? []) {
      if (isAdminGuidanceLine(a)) continue;
      const al = a.toLowerCase();
      if (needles.some((n) => n.length > 4 && (al.includes(n.slice(0, 12)) || n.includes(al.slice(0, 12))))) {
        return formatDisplayLabelCasing(a);
      }
    }
  }
  const primary = battleboard.primary_route?.evidence_anchors?.[0];
  if (primary && !isAdminGuidanceLine(primary)) return formatDisplayLabelCasing(primary);
  return null;
}

function mergeOtherFamily(rawLabels: string[]): { label: string; mergedFrom: string[] } {
  if (rawLabels.length === 1) {
    const one = normalizeRawLabel(rawLabels[0]!);
    return {
      label: one.length > 60 ? "Additional source-material issue (see detail)" : one,
      mergedFrom: rawLabels,
    };
  }
  return {
    label: `Additional source-material issues (${rawLabels.length} on file)`,
    mergedFrom: rawLabels,
  };
}

function groupAndMergeLabels(
  rawLabels: string[],
  battleboard: BattleboardOutput | null,
  deadline: DeadlineContext,
  ledger: BundleTruthLedger | null,
): DisclosureChaseItem[] {
  const groups = new Map<ChaseFamilyId, string[]>();

  for (const raw of rawLabels) {
    const norm = normalizeRawLabel(raw);
    if (!norm || norm.length < 4) continue;
    const familyId = classifyFamily(norm);
    const list = groups.get(familyId) ?? [];
    if (!list.some((x) => x.toLowerCase() === norm.toLowerCase())) {
      list.push(norm);
    }
    groups.set(familyId, list);
  }

  const items: DisclosureChaseItem[] = [];

  for (const fam of CHASE_FAMILIES) {
    const mergedFrom = groups.get(fam.id);
    if (!mergedFrom?.length) continue;
    groups.delete(fam.id);

    const def = fam;
    const label = def.label;
    const baseStatus: ChaseItemStatus =
      fam.id === "other" || mergedFrom.some((m) => /not safely|unknown|verify/i.test(m))
        ? "Not safely confirmed"
        : deadline.baseStatus;

    items.push({
      id: `chase-family-${fam.id}`,
      familyId: fam.id,
      label,
      whyItMatters: inferWhyItMatters(fam.id, battleboard, mergedFrom),
      source: def.source,
      baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: findEvidenceAnchor(fam.id, mergedFrom, battleboard, ledger),
      linkedRoute: findLinkedRoute(fam.id, battleboard),
      draftChaseWording: draftChaseWording(label, mergedFrom),
      courtLine: toCourtLine(label),
      mergedFrom,
    });
  }

  const otherLabels = groups.get("other") ?? [];
  groups.delete("other");
  if (otherLabels.length) {
    const { label, mergedFrom } = mergeOtherFamily(otherLabels);
    items.push({
      id: "chase-family-other",
      familyId: "other",
      label,
      whyItMatters: inferWhyItMatters("other", battleboard, mergedFrom),
      source: getFamilyDef("other").source,
      baseStatus: "Not safely confirmed",
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: findEvidenceAnchor("other", mergedFrom, battleboard, ledger),
      linkedRoute: battleboard?.primary_route?.title ?? null,
      draftChaseWording: draftChaseWording(label, mergedFrom),
      courtLine: toCourtLine(label),
      mergedFrom,
    });
  }

  for (const [, leftover] of groups) {
    if (!leftover.length) continue;
    const { label, mergedFrom } = mergeOtherFamily(leftover);
    items.push({
      id: `chase-family-misc-${slugFromLabels(mergedFrom)}`,
      familyId: "other",
      label,
      whyItMatters: inferWhyItMatters("other", battleboard, mergedFrom),
      source: getFamilyDef("other").source,
      baseStatus: deadline.baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: findEvidenceAnchor("other", mergedFrom, battleboard, ledger),
      linkedRoute: null,
      draftChaseWording: draftChaseWording(label, mergedFrom),
      courtLine: toCourtLine(label),
      mergedFrom,
    });
  }

  items.sort((a, b) => {
    const pa = CHASE_FAMILIES.find((f) => f.id === a.familyId)?.priority ?? 99;
    const pb = CHASE_FAMILIES.find((f) => f.id === b.familyId)?.priority ?? 99;
    return pa - pb;
  });

  return items;
}

/** Disclosure family → chase-source-gate family. "other"/exhibits can't be gated. */
const GATE_FAMILY_MAP: Partial<Record<ChaseFamilyId, ChaseGateFamily>> = {
  cctv_master: "cctv",
  cctv_continuity: "cctv",
  cad_999: "cad_999",
  bwv: "bwv",
  interview: "interview",
  mg6_unused: "mg6_unused",
  medical_expert: "medical",
};

function confirmNoneDisclosureItem(
  item: DisclosureChaseItem,
  gateFamily: ChaseGateFamily,
): DisclosureChaseItem {
  const name = familyDisplayName(gateFamily);
  return {
    ...item,
    label: `${item.label} — file indicates none exists`,
    baseStatus: "Not safely confirmed",
    whyItMatters: confirmNoneLine(gateFamily),
    draftChaseWording: `The file indicates no ${name} is available. Please confirm in writing that none exists and that no related logs or exports are held.`,
    courtLine: `${COURT_RECORD_PREFIX} that the file indicates no ${name} exists; the defence position is reserved accordingly.`,
  };
}

function gateFamiliesForItem(item: DisclosureChaseItem): ChaseGateFamily[] {
  const mapped = GATE_FAMILY_MAP[item.familyId];
  if (mapped) return [mapped];
  const probe = `${item.label} ${item.draftChaseWording} ${item.whyItMatters}`;
  return familiesInText(probe);
}

/**
 * Chase source gate: drop family items the bundle never mentions; convert
 * explicitly-negated families into confirm-none items instead of chases.
 * Applies to generic merged items AND workflow profile-pack labels.
 * No bundle text available → cannot gate, keep items as-is.
 */
function gateItemsAgainstSource(
  items: DisclosureChaseItem[],
  bundleText: string | null | undefined,
): DisclosureChaseItem[] {
  if (!bundleText?.trim()) return items;
  const out: DisclosureChaseItem[] = [];
  for (const item of items) {
    const families = gateFamiliesForItem(item);
    if (!families.length) {
      out.push(item);
      continue;
    }
    let drop = false;
    let replaced: DisclosureChaseItem | null = null;
    for (const gateFamily of families) {
      const support = familySupport(gateFamily, bundleText);
      if (support === "absent") {
        drop = true;
        break;
      }
      if (support === "negated") {
        replaced = confirmNoneDisclosureItem(item, gateFamily);
        break;
      }
    }
    if (drop) continue;
    const kept = replaced ?? item;
    out.push(finalizeGatedDisclosureItem(kept, bundleText));
  }
  return out;
}

function finalizeGatedDisclosureItem(
  item: DisclosureChaseItem,
  bundleText: string,
): DisclosureChaseItem {
  return {
    ...item,
    whyItMatters: gateProseAgainstSource(item.whyItMatters, bundleText),
    draftChaseWording: gateProseAgainstSource(item.draftChaseWording, bundleText),
    courtLine: gateProseAgainstSource(item.courtLine, bundleText),
  };
}

function slugFromLabels(labels: string[]): string {
  return labels[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24) ?? "misc";
}

function resolveSafeCourtLine(battleboard: BattleboardOutput | null): string {
  const fromRoute = battleboard?.primary_route?.hearing_line?.trim();
  if (fromRoute && !FORBIDDEN_RE.test(fromRoute)) return fromRoute;
  const summary = battleboard?.solicitor_safe_summary?.trim();
  if (summary && !FORBIDDEN_RE.test(summary)) return summary.slice(0, 400);
  return "Position remains provisional — ask the court to record outstanding source material and set a timetable.";
}

function splitPrimaryAdditional(items: DisclosureChaseItem[]): {
  primaryItems: DisclosureChaseItem[];
  additionalItems: DisclosureChaseItem[];
} {
  const core = items.filter((i) => i.familyId !== "other");
  const misc = items.filter((i) => i.familyId === "other");
  const primaryItems = core.slice(0, DISCLOSURE_CHASE_PRIMARY_CAP);
  const overflowCore = core.slice(DISCLOSURE_CHASE_PRIMARY_CAP);
  return {
    primaryItems,
    additionalItems: [...overflowCore, ...misc],
  };
}

function buildWorkflowProfileDisclosureItems(
  labels: string[],
  battleboard: BattleboardOutput | null,
  deadline: DeadlineContext,
  profile: Exclude<ReturnType<typeof resolveWorkflowProfile>, "generic">,
  ledger: BundleTruthLedger | null,
): DisclosureChaseItem[] {
  return labels.map((label, idx) => {
    const normalized = normalizeWorkflowPilotLabel(label);
    const familyId = classifyFamily(normalized);
    return {
      id: `workflow-chase-${profile}-${idx}`,
      familyId,
      label: normalized,
      whyItMatters: workflowDisclosureWhyItMatters(normalized, profile),
      source: "Crown / disclosure officer (confirm on file)",
      baseStatus: deadline.baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: (() => {
        const fromLedger = ledger
          ? findEvidenceAnchor(familyId, [normalized], battleboard, ledger)
          : null;
        if (fromLedger) return fromLedger;
        const raw = battleboard?.primary_route?.evidence_anchors?.[0] ?? null;
        if (!raw || isMalformedPilotEvidenceAnchor(raw) || isAdminGuidanceLine(raw)) return null;
        return formatDisplayLabelCasing(raw);
      })(),
      linkedRoute: battleboard?.primary_route?.title ?? null,
      draftChaseWording: formatPilotDraftChaseWording(normalized),
      courtLine: formatPilotCourtLine(normalized),
      mergedFrom: [normalized],
    };
  });
}

function mergeLedgerDisclosureItems(
  items: DisclosureChaseItem[],
  ledger: BundleTruthLedger,
  deadline: ReturnType<typeof resolveDeadlineContext>,
): DisclosureChaseItem[] {
  const labelSeen = new Set(items.map((i) => i.label.toLowerCase()));
  const merged = [...items];

  for (const m of ledgerMaterialsNeedingChase(ledger)) {
    const key = m.displayLine.toLowerCase();
    if (labelSeen.has(key)) continue;
    labelSeen.add(key);

    const baseStatus: ChaseItemStatus =
      m.status === "outstanding" || m.status === "absent" ? "Outstanding" : "Not safely confirmed";

    merged.push({
      id: `ledger-material-${m.id}`,
      familyId: classifyFamily(m.displayLine),
      label: formatDisplayLabelCasing(m.displayLine),
      whyItMatters: `Papers mark this material as ${m.status} — chase or confirm status before fixing hearing position.`,
      source: "MG6/MG6C disclosure schedule",
      baseStatus,
      urgency: deadline.urgency,
      deadlineLabel: deadline.sharedLabel,
      evidenceAnchor: (() => {
        const display = formatDisplayLabelCasing(m.displayLine);
        if (!isAdminGuidanceLine(display)) return display;
        const excerpt = m.sourceAnchor.excerpt;
        if (!excerpt || isAdminGuidanceLine(excerpt)) return null;
        return formatDisplayLabelCasing(excerpt);
      })(),
      linkedRoute: null,
      draftChaseWording: `Please provide ${m.label} or confirm in writing why it is not available.`,
      courtLine: `${COURT_RECORD_PREFIX} that ${m.label} remains ${m.status} on the current papers.`,
      mergedFrom: [m.displayLine],
    });
  }

  merged.sort((a, b) => {
    const pa = CHASE_FAMILIES.find((f) => f.id === a.familyId)?.priority ?? 99;
    const pb = CHASE_FAMILIES.find((f) => f.id === b.familyId)?.priority ?? 99;
    return pa - pb;
  });

  return merged;
}

export function buildDisclosureChaseBrief(input: BuildDisclosureChaseBriefInput): DisclosureChaseBrief {
  const ledger = input.bundleText?.trim()
    ? buildBundleTruthLedger({ bundleText: input.bundleText })
    : null;

  const workflowContext = {
    caseTitle: input.caseTitle,
    allegation: input.allegation,
    routeTitle: input.battleboard?.primary_route?.title,
    bundleText: input.bundleText,
    clientLabel: input.clientLabel,
    profileHint: input.profileHint,
  };
  const profile = resolveWorkflowProfile(workflowContext);
  const profileLabels = workflowDisclosureChaseLabels(workflowContext);

  const chaseLabelsRaw = collectChaseItems({
    snapshotMissing: input.snapshotMissing,
    proceduralOutstanding: input.proceduralOutstanding,
    battleboard: input.battleboard,
  });
  const chaseLabels = prioritizeWorkflowItems(
    filterWorkflowItems(chaseLabelsRaw, workflowContext),
    workflowContext,
  );

  const days = daysUntilHearing(input.hearingDateIso);
  const deadline = resolveDeadlineContext(days);

  let items: DisclosureChaseItem[];
  let primaryItems: DisclosureChaseItem[];
  let additionalItems: DisclosureChaseItem[];

  if (profileLabels && profile !== "generic") {
    items = gateItemsAgainstSource(
      buildWorkflowProfileDisclosureItems(
        profileLabels,
        input.battleboard,
        deadline,
        profile,
        ledger,
      ),
      input.bundleText,
    );
    ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));
  } else {
    items = gateItemsAgainstSource(
      groupAndMergeLabels(chaseLabels, input.battleboard, deadline, ledger),
      input.bundleText,
    );
    ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));
  }

  if (ledger && ledgerMaterialsNeedingChase(ledger).length > 0) {
    items = mergeLedgerDisclosureItems(items, ledger, deadline);
    ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));
  }

  const guardCtx = { ledger, bundleText: input.bundleText ?? null };
  items = items
    .filter((item) => !isAdminGuidanceLine(item.label) && !isAdminGuidanceLine(item.evidenceAnchor ?? ""))
    .map((item) => ({
      ...item,
      label: formatDisplayLabelCasing(item.label),
      evidenceAnchor: item.evidenceAnchor
        ? guardSolicitorLine(item.evidenceAnchor, guardCtx) ??
          (isAdminGuidanceLine(item.evidenceAnchor) ? null : formatDisplayLabelCasing(item.evidenceAnchor))
        : item.evidenceAnchor,
    }));
  ({ primaryItems, additionalItems } = splitPrimaryAdditional(items));

  const linkedRoutes = [
    ...new Set(items.map((i) => i.linkedRoute).filter((r): r is string => Boolean(r?.trim()))),
  ];
  if (input.battleboard?.primary_route?.title && !linkedRoutes.includes(input.battleboard.primary_route.title)) {
    linkedRoutes.unshift(input.battleboard.primary_route.title);
  }

  const counters: DisclosureChaseCounters = {
    total: items.length,
    overdue: items.filter((i) => i.baseStatus === "Overdue").length,
    dueSoon: items.filter((i) => i.baseStatus === "Due soon").length,
    chased: 0,
    received: 0,
    notStarted: items.filter(
      (i) => i.baseStatus === "Outstanding" || i.baseStatus === "Not safely confirmed",
    ).length,
  };

  const disclosureSummary =
    primaryItems.length > 0
      ? `${primaryItems.length} priority chase item${primaryItems.length === 1 ? "" : "s"} — provisional`
      : items.length === 0
        ? "No source-material chase items safely detected"
        : items.length === 1
          ? "1 grouped chase item — provisional"
          : `${items.length} grouped chase items — provisional`;

  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientLabel: input.clientLabel,
    allegation: input.allegation,
    stage: input.stage,
    hearingStatus: input.hearingStatus,
    bundleHealth: input.bundleHealth,
    positionStatus: input.positionStatus,
    disclosureSummary,
    safeCourtLine: (() => {
      const profileLine =
        isCriminalPilotMode() ? workflowDisclosureCaseWideLine(workflowContext) : null;
      let raw = profileLine ?? resolveSafeCourtLine(input.battleboard);
      if (!isCriminalPilotMode()) {
        return input.bundleText?.trim()
          ? gateProseAgainstSource(raw, input.bundleText)
          : raw;
      }
      raw = pilotCleanupVisibleText(
        sanitizePilotVisibleLine(raw, workflowContext) ?? raw,
      );
      return input.bundleText?.trim()
        ? gateProseAgainstSource(raw, input.bundleText)
        : raw;
    })(),
    items,
    primaryItems,
    additionalItems,
    linkedRoutes,
    counters,
    hearingDeadlineNote: deadline.hearingDeadlineNote,
  };
}

export function computeCounters(
  items: DisclosureChaseItem[],
  localStatus: Record<string, "Chased" | "Received">,
): DisclosureChaseCounters {
  let overdue = 0;
  let dueSoon = 0;
  let chased = 0;
  let received = 0;
  let notStarted = 0;

  for (const item of items) {
    const effective = localStatus[item.id] ?? item.baseStatus;
    if (effective === "Received") received++;
    else if (effective === "Chased") chased++;
    else if (effective === "Overdue") overdue++;
    else if (effective === "Due soon") dueSoon++;
    else notStarted++;
  }

  return {
    total: items.length,
    overdue,
    dueSoon,
    chased,
    received,
    notStarted,
  };
}

export type ChaseFilterBucket = "all" | "overdue" | "due-soon" | "chased" | "received";

export function effectiveStatus(
  item: DisclosureChaseItem,
  localStatus: Record<string, "Chased" | "Received">,
): ChaseItemStatus {
  const local = localStatus[item.id];
  if (local === "Received") return "Received";
  if (local === "Chased") return "Chased";
  return item.baseStatus;
}

export function matchesFilter(
  item: DisclosureChaseItem,
  filter: ChaseFilterBucket,
  localStatus: Record<string, "Chased" | "Received">,
): boolean {
  if (filter === "all") return true;
  const s = effectiveStatus(item, localStatus);
  if (filter === "overdue") return s === "Overdue";
  if (filter === "due-soon") return s === "Due soon";
  if (filter === "chased") return s === "Chased";
  if (filter === "received") return s === "Received";
  return true;
}
