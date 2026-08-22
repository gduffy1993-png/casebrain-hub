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

function cleanOneLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clampAtWordBoundary(value: string, max = 150): string {
  const clean = cleanOneLine(value);
  if (clean.length <= max) return clean;
  const boundary = clean.lastIndexOf(" ", max - 1);
  const cutAt = boundary >= Math.floor(max * 0.65) ? boundary : max;
  return `${clean.slice(0, cutAt).replace(/[,\s;:.-]+$/g, "")}…`;
}

function recommendedActionForItem(item: DisclosureChaseItem): string {
  const draft = cleanOneLine(item.draftChaseWording);
  if (draft) return draft;
  const label = cleanOneLine(item.label) || "the outstanding material";
  return `Chase ${label} and confirm the source position before fixing the hearing line.`;
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
  const source = cleanOneLine(item.source);
  const anchor = cleanOneLine(item.evidenceAnchor);
  if (source) lines.push(source);
  if (anchor && anchor !== source) {
    lines.push(anchor);
  }
  const prov = item.provenance;
  if (prov && typeof prov === "object") {
    const title =
      "sourceDocumentTitle" in prov && typeof prov.sourceDocumentTitle === "string"
        ? prov.sourceDocumentTitle
        : null;
    const rawPage = "sourcePage" in prov ? (prov as { sourcePage?: unknown }).sourcePage : null;
    const page =
      typeof rawPage === "string" || typeof rawPage === "number"
        ? String(rawPage)
        : null;
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
      title: cleanOneLine(item.label),
      blurb: clampAtWordBoundary(item.whyItMatters || item.deadlineLabel || ""),
      status,
      impactTags: impactFromFamily(item.familyId),
      why: cleanOneLine(item.whyItMatters) || "Material is outstanding or not safely confirmed on the papers.",
      sources: sourceLines(item),
      recommendedAction: recommendedActionForItem(item),
      chaseWording: cleanOneLine(item.draftChaseWording) || cleanOneLine(item.label),
      courtWording: cleanOneLine(item.courtLine) || "Position remains provisional pending outstanding disclosure.",
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
    activeChases,
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
