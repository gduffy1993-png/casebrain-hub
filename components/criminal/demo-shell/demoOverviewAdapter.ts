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
  openReviewItems: number;
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

function normaliseIssueTitle(value: string): string {
  return cleanOneLine(value)
    .replace(/\bCCTV\s+Continuity\b/g, "CCTV continuity")
    .replace(/\bCCTV\s+Full\b/g, "CCTV full")
    .replace(/\bFull\s+CCTV\b/g, "Full CCTV")
    .replace(/\bMG6\s*\/\s*Unused\b/g, "MG6 / unused")
    .replace(/\bPhone\s+download\s+outstanding\b/gi, "Phone extraction/download status")
    .replace(/\bFull\s+phone\s+download\b/gi, "Phone extraction/download status")
    .replace(/^Full\s+Phone extraction\/download status$/i, "Phone extraction/download status")
    .replace(/\bsource\s+export\b/gi, "source export")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericSourceReview(value: string): boolean {
  return /review the cited source before relying on this item;?\s*record whether the material is served, incomplete, unclear or still awaited/i.test(
    value,
  );
}

function clampAtWordBoundary(value: string, max = 150): string {
  const clean = cleanOneLine(value);
  if (clean.length <= max) return clean;
  const boundary = clean.lastIndexOf(" ", max - 1);
  const cutAt = boundary >= Math.floor(max * 0.65) ? boundary : max;
  return `${clean.slice(0, cutAt).replace(/[,\s;:.-]+$/g, "")}…`;
}

function isPhoneOrSourceExportUnresolved(item: DisclosureChaseItem): boolean {
  const hay = [
    item.label,
    item.familyId,
    item.whyItMatters,
    item.deadlineLabel,
    item.source,
    item.evidenceAnchor,
    ...(item.mergedFrom ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return (
    /\b(phone|device|download|extraction|source export|logical download)\b/i.test(hay) &&
    /\b(unresolved|not established|not safely confirmed|confirm on file|needs? checking)\b/i.test(hay)
  );
}

function issueBlurbForItem(item: DisclosureChaseItem, title: string): string {
  const raw = cleanOneLine(item.whyItMatters || item.deadlineLabel || "");
  if (raw && !isGenericSourceReview(raw)) return clampAtWordBoundary(raw);
  const hay = `${title} ${item.familyId}`.toLowerCase();
  if (/cctv/.test(hay) && /continuity|provenance/.test(hay)) {
    return "Continuity source needs checking before any CCTV point is relied on.";
  }
  if (/cctv/.test(hay) && /master|window|footage/.test(hay)) {
    return "Full CCTV or master media status needs confirming before the hearing position is fixed.";
  }
  if (/\b(cad|999)\b/.test(hay)) {
    return "CAD / 999 material is not safely confirmed on the current papers.";
  }
  if (/phone|device|download|extraction|source export/.test(hay)) {
    return "Phone or source-extraction material is not established on the current papers.";
  }
  return "Source status needs confirming before this item is relied on.";
}

function recommendedActionForItem(item: DisclosureChaseItem): string {
  const draft = cleanOneLine(item.draftChaseWording);
  if (isPhoneOrSourceExportUnresolved(item)) {
    return "Confirm whether any phone extraction, download or source-export material exists before treating it as a disclosure chase.";
  }
  const labelHay = normaliseIssueTitle(`${item.label} ${draft}`).toLowerCase();
  if (/cctv continuity\s*\/\s*provenance/.test(labelHay)) {
    return "Please provide the CCTV continuity record, provenance material, or confirm in writing why it is not available.";
  }
  if (/cctv full window|cctv master|master footage/.test(labelHay)) {
    return "Please provide the full CCTV window, master footage or export log, or confirm in writing why it is not available.";
  }
  if (draft) {
    return normaliseIssueTitle(draft)
      .replace(/^Please provide\s+(?!the\b)/i, "Please provide the ")
      .replace(/\bCCTV\s+continuity\b/g, "CCTV continuity")
      .replace(/\s+/g, " ")
      .trim();
  }
  const label = normaliseIssueTitle(item.label) || "the material";
  if (/not established|unresolved/i.test(`${item.whyItMatters} ${item.deadlineLabel}`)) {
    return `Confirm whether ${label} exists before treating it as a disclosure chase.`;
  }
  return `Chase ${label} and confirm the source position before fixing the hearing line.`;
}

function statusFromChase(item: DisclosureChaseItem): DemoAttentionStatus | null {
  if (isPhoneOrSourceExportUnresolved(item)) return "UNCLEAR";
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
    const title = normaliseIssueTitle(item.label);
    const blurb = issueBlurbForItem(item, title);
    out.push({
      id: item.id,
      title,
      blurb,
      status,
      impactTags: impactFromFamily(item.familyId),
      why: blurb || "Source status needs confirming before this item is relied on.",
      sources: sourceLines(item),
      recommendedAction: recommendedActionForItem(item),
      chaseWording: recommendedActionForItem(item),
      courtWording:
        normaliseIssueTitle(cleanOneLine(item.courtLine)) ||
        "Position remains provisional pending source-material review.",
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
  // Prefer canonical evidence counts so Overview Missing/Incomplete match File/Papers.
  // Attention list only fills gaps when evidence counts are empty, and always drives
  // active-chase / open-review chips.
  const attentionMissing = attention.filter((a) => a.status === "MISSING").length;
  const attentionIncomplete = attention.filter(
    (a) => a.status === "UNCLEAR" || a.status === "INCOMPLETE",
  ).length;
  const evidenceIncomplete =
    (evidenceCounts.incomplete || 0) + (evidenceCounts.notSafelyConfirmed || 0);
  const missing =
    evidenceCounts.missing > 0 ? evidenceCounts.missing : attentionMissing;
  const incomplete = evidenceIncomplete > 0 ? evidenceIncomplete : attentionIncomplete;
  const activeChases = attention.filter((a) => a.status === "ACTIVE").length;
  return {
    missing,
    incomplete,
    activeChases,
    openReviewItems: attention.length,
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
  const toBeChasedPct = Math.min(
    100,
    Math.round((stats.openReviewItems / Math.max(1, stats.openReviewItems + evidenceCounts.served)) * 100),
  );
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
