/**
 * Presentation adapter only — maps existing chase / evidence counts into demo-shell props.
 * No new case facts; no invent / gate / hearing logic.
 */

import type { DisclosureChaseItem } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

export type DemoAttentionStatus = "MISSING" | "UNCLEAR" | "INCOMPLETE" | "ACTIVE";

export type DemoAttentionItem = {
  id: string;
  title: string;
  blurb: string;
  status: DemoAttentionStatus;
  impactTags: string[];
  why: string;
  sources: string[];
  recommendedAction: string;
  chaseWording: string;
  courtWording: string;
  familyId: string;
};

export type DemoStatCounts = {
  missing: number;
  incomplete: number;
  activeChases: number;
};

export type DemoReadiness = {
  overallPct: number;
  evidenceGatheredPct: number;
  issuesResolvedPct: number;
  toBeChasedPct: number;
  softLabel: true;
};

function impactFromFamily(familyId: string): string[] {
  const f = familyId.toLowerCase();
  if (/cctv|bwv|video|visual/.test(f)) return ["Identification", "Reliability"];
  if (/phone|digital|download|device/.test(f)) return ["Reliability", "Completeness"];
  if (/interview|roti|recording/.test(f)) return ["Reliability", "Fairness"];
  if (/custody|pace|disclosure/.test(f)) return ["Completeness"];
  if (/witness|mg11|statement/.test(f)) return ["Identification"];
  return ["Completeness"];
}

function statusFromChase(item: DisclosureChaseItem): DemoAttentionStatus | null {
  switch (item.baseStatus) {
    case "Received":
      return null;
    case "Chased":
      return "ACTIVE";
    case "Due soon":
      return "UNCLEAR";
    case "Overdue":
      return item.urgency === "high" ? "MISSING" : "INCOMPLETE";
    case "Not safely confirmed":
      return "UNCLEAR";
    case "Outstanding":
    default:
      return item.urgency === "low" ? "INCOMPLETE" : "MISSING";
  }
}

function sourceLines(item: DisclosureChaseItem): string[] {
  const lines: string[] = [];
  if (item.source?.trim()) lines.push(item.source.trim());
  if (item.evidenceAnchor?.trim() && item.evidenceAnchor !== item.source) {
    lines.push(item.evidenceAnchor.trim());
  }
  const prov = item.provenance;
  if (prov && typeof prov === "object") {
    const title =
      "sourceDocumentTitle" in prov && typeof prov.sourceDocumentTitle === "string"
        ? prov.sourceDocumentTitle
        : null;
    const page =
      "sourcePage" in prov && typeof prov.sourcePage === "string" ? prov.sourcePage : null;
    if (title) lines.push(page ? `${title} p.${page}` : title);
  }
  if (!lines.length) lines.push("Check uploaded papers for the source reference.");
  return [...new Set(lines)].slice(0, 4);
}

export function buildDemoAttentionItems(items: DisclosureChaseItem[]): DemoAttentionItem[] {
  const out: DemoAttentionItem[] = [];
  for (const item of items) {
    const status = statusFromChase(item);
    if (!status) continue;
    out.push({
      id: item.id,
      title: item.label.replace(/\s+/g, " ").trim(),
      blurb: (item.whyItMatters || item.deadlineLabel || "").replace(/\s+/g, " ").trim().slice(0, 140),
      status,
      impactTags: impactFromFamily(item.familyId),
      why: item.whyItMatters?.trim() || "Material is outstanding or not safely confirmed on the papers.",
      sources: sourceLines(item),
      recommendedAction:
        item.deadlineLabel?.trim() ||
        "Chase the outstanding material and check the source before fixing the hearing position.",
      chaseWording: item.draftChaseWording?.trim() || item.label,
      courtWording: item.courtLine?.trim() || "Position remains provisional pending outstanding disclosure.",
      familyId: item.familyId,
    });
  }
  return out;
}

export function buildDemoStatCounts(
  attention: DemoAttentionItem[],
  evidenceCounts: {
    missing: number;
    incomplete: number;
    referred?: number;
    notSafelyConfirmed?: number;
  },
): DemoStatCounts {
  const missing =
    attention.filter((a) => a.status === "MISSING").length || evidenceCounts.missing || 0;
  const incomplete =
    attention.filter((a) => a.status === "UNCLEAR" || a.status === "INCOMPLETE").length ||
    evidenceCounts.incomplete ||
    0;
  const activeChases = attention.filter((a) => a.status === "ACTIVE").length;
  return {
    missing,
    incomplete,
    activeChases: activeChases || Math.max(0, attention.length - missing),
  };
}

/** Soft provisional readiness from existing counts — not a new AI score. */
export function buildDemoReadiness(
  evidenceCounts: {
    served: number;
    missing: number;
    incomplete: number;
    referred: number;
    notSafelyConfirmed: number;
  },
  stats: DemoStatCounts,
): DemoReadiness {
  const denom =
    evidenceCounts.served +
    evidenceCounts.missing +
    evidenceCounts.incomplete +
    evidenceCounts.referred +
    evidenceCounts.notSafelyConfirmed;
  const evidenceGatheredPct =
    denom > 0 ? Math.round((evidenceCounts.served / denom) * 100) : 0;
  const openIssues = stats.missing + stats.incomplete + stats.activeChases;
  const issuesResolvedPct =
    openIssues + evidenceCounts.served > 0
      ? Math.round((evidenceCounts.served / (openIssues + evidenceCounts.served)) * 100)
      : 0;
  const toBeChasedPct = Math.min(100, Math.round(((stats.missing + stats.activeChases) / Math.max(1, openIssues || 1)) * 100));
  const overallPct = Math.max(
    0,
    Math.min(
      95,
      Math.round(evidenceGatheredPct * 0.45 + issuesResolvedPct * 0.35 + (100 - Math.min(toBeChasedPct, 80)) * 0.2),
    ),
  );
  return {
    overallPct,
    evidenceGatheredPct,
    issuesResolvedPct,
    toBeChasedPct,
    softLabel: true,
  };
}
