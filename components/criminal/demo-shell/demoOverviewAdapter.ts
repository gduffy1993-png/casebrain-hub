/**
 * Presentation adapter only — maps frozen chase primaryItems into demo-shell props.
 * No invent / demote / phone collapse here — buildDisclosureChaseBrief owns the shortlist.
 */

import type { DisclosureChaseItem } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildVisibleOutputReceipt,
  receiptFromChaseItem,
  type VisibleOutputReceipt,
} from "@/lib/criminal/visible-output-receipt";

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
  receipt: VisibleOutputReceipt;
};

export type DemoKeyDefenceIssue = {
  id: string;
  issue: string;
  why: string;
  nextAction: string;
  sourceLine: string;
  receipt: VisibleOutputReceipt;
  priority: number;
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

function sourceSnippet(text: string, pattern: RegExp): string | null {
  const normalized = (text ?? "").replace(/\r/g, "\n");
  for (const rawLine of normalized.split(/\n+/)) {
    const line = cleanOneLine(rawLine);
    if (line.length >= 8 && pattern.test(line)) return line;
  }
  const compact = cleanOneLine(normalized);
  const match = compact.match(pattern);
  if (!match || match.index === undefined) return null;
  const start = Math.max(0, match.index - 90);
  const end = Math.min(compact.length, match.index + match[0].length + 140);
  return compact.slice(start, end).trim();
}

function linesMatching(text: string, pattern: RegExp): string[] {
  return (text ?? "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map(cleanOneLine)
    .filter((line) => line.length >= 8 && pattern.test(line));
}

function distinctDatesFrom(lines: string[]): string[] {
  const dates = new Set<string>();
  for (const line of lines) {
    for (const hit of line.matchAll(/\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|June|Jul|July|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi)) {
      dates.add(hit[0].toLowerCase().replace(/\s+/g, " "));
    }
  }
  return [...dates];
}

function issueReceipt(issue: string, sourceLine: string, status = "Not safely confirmed"): VisibleOutputReceipt {
  return buildVisibleOutputReceipt({
    output: issue,
    surface: "overview",
    outputType: "key_defence_issue",
    status,
    sourceLabel: "File extract",
    excerpt: sourceLine,
    evidenceAnchor: sourceLine,
  });
}

function pushKeyIssue(
  out: DemoKeyDefenceIssue[],
  seen: Set<string>,
  input: Omit<DemoKeyDefenceIssue, "id" | "receipt">,
) {
  const key = input.issue.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!key || seen.has(key) || !input.sourceLine) return;
  seen.add(key);
  out.push({
    ...input,
    id: `key-${out.length + 1}-${key.slice(0, 28).replace(/\s+/g, "-")}`,
    receipt: issueReceipt(input.issue, input.sourceLine),
  });
}

/**
 * High-value solicitor issues only — separate from the disclosure chase list.
 * Every issue must be tied to a File/PDF line, otherwise it is not shown.
 */
export function buildDemoKeyDefenceIssues(
  bundleText: string,
  chaseItems: DisclosureChaseItem[] = [],
): DemoKeyDefenceIssue[] {
  const text = bundleText ?? "";
  const out: DemoKeyDefenceIssue[] = [];
  const seen = new Set<string>();

  const witnessOwnership = sourceSnippet(
    text,
    /\b(?:cannot|can't|could not|unable)\b[^.\n]{0,120}\b(?:own|owned|ownership|identify|say who)\b[^.\n]{0,100}\b(?:handset|phone|bag|device)\b|\b(?:handset|phone|bag|device)\b[^.\n]{0,100}\b(?:cannot|can't|could not|unable)\b[^.\n]{0,120}\b(?:own|owned|ownership|identify|say who)\b/i,
  );
  const attribution = sourceSnippet(
    text,
    /\b(?:handset|phone|device|bag)\b[^.\n]{0,140}\b(?:ownership|attribution|subscriber|recovered near|near a sofa|not finally proved|not proved|not established|unclear|partial)\b|\b(?:ownership|attribution|subscriber)\b[^.\n]{0,140}\b(?:handset|phone|device|bag|not finally proved|not proved|not established|unclear|partial)\b/i,
  );
  if (witnessOwnership && attribution) {
    pushKeyIssue(out, seen, {
      issue: "Witness cannot identify ownership and phone attribution needs review",
      why: "This matters because possession or attribution may be disputed if ownership is not proved and a witness cannot identify who owned the item.",
      nextAction: "Take instructions on ownership, test the witness limitation, and chase any missing attribution material.",
      sourceLine: `${attribution} | ${witnessOwnership}`,
      priority: 100,
    });
  } else if (witnessOwnership) {
    pushKeyIssue(out, seen, {
      issue: "Witness cannot safely identify handset or bag ownership",
      why: "This matters because possession or attribution may be disputed if the witness cannot say who owned the item.",
      nextAction: "Take instructions on ownership and test any Crown attribution before relying on a possession route.",
      sourceLine: witnessOwnership,
      priority: 100,
    });
  } else if (attribution) {
    pushKeyIssue(out, seen, {
      issue: "Phone or item attribution is not safely proved",
      why: "This matters because the Crown may need to connect the client to the handset, bag or account before the inference is safe.",
      nextAction: "Check the attribution evidence, take instructions, and chase any missing subscriber or extraction material.",
      sourceLine: attribution,
      priority: 95,
    });
  }

  const phoneGap = sourceSnippet(
    text,
    /\b(?:full\s+)?(?:handset|phone|device)\b[^.\n]{0,80}\b(?:download|extraction|report)\b[^.\n]{0,100}\b(?:not served|outstanding|missing|absent|not attached|not enclosed|requested)\b|\b(?:logical download summary|subscriber return is only partial|subscriber check[^.\n]{0,80}(?:not served|partial|requested|not enclosed))\b/i,
  );
  if (phoneGap) {
    pushKeyIssue(out, seen, {
      issue: "Full phone extraction or subscriber material is not complete",
      why: "This matters because a summary or partial subscriber return may not prove the full attribution picture.",
      nextAction: "Chase the full extraction/report or subscriber material and avoid treating the phone evidence as complete.",
      sourceLine: phoneGap,
      priority: 90,
    });
  }

  const chargeDateLines = linesMatching(text, /\b(?:charge|particulars|statement of offence)\b/i);
  const incidentDateLines = linesMatching(text, /\b(?:mg5|incident|offence date|alleges?|occurred)\b/i);
  const chargeDates = distinctDatesFrom(chargeDateLines);
  const incidentDates = distinctDatesFrom(incidentDateLines);
  const differentDate = chargeDates.find((date) => !incidentDates.includes(date));
  if (differentDate && incidentDates.length) {
    const sourceLine = cleanOneLine(
      [chargeDateLines.find((l) => l.toLowerCase().includes(differentDate)), incidentDateLines[0]]
        .filter(Boolean)
        .join(" | "),
    );
    if (sourceLine) {
      pushKeyIssue(out, seen, {
        issue: "Charge date and case narrative date need reconciliation",
        why: "This matters because the solicitor should not let the offence date and narrative date drift into one clean timeline.",
        nextAction: "Check the charge sheet against the MG5/case summary and ask the Crown to confirm the correct date.",
        sourceLine,
        priority: 85,
      });
    }
  }

  const urnLines = linesMatching(text, /\b(?:URN|case ref|case reference|[A-Z]{2,5}\d{2}\/\d{3,})\b/i);
  const urns = new Set<string>();
  for (const line of urnLines) {
    for (const hit of line.matchAll(/\b(?:[A-Z]{2,5}\d{2}\/\d{3,}|URN\s*[:#-]?\s*[A-Z0-9/-]+)\b/gi)) {
      urns.add(cleanOneLine(hit[0]).toUpperCase());
    }
  }
  if (urns.size > 1) {
    pushKeyIssue(out, seen, {
      issue: "Case identifiers or URNs conflict across the papers",
      why: "This matters because mixed identifiers can mean the bundle is stitched from inconsistent source documents.",
      nextAction: "Check whether the references relate to the same matter before relying on a single clean case identity.",
      sourceLine: urnLines.slice(0, 3).join(" | "),
      priority: 80,
    });
  }

  const interviewServed = sourceSnippet(text, /\b(?:interview|transcript|ROTI)\b[^.\n]{0,100}\b(?:served|enclosed|on file)\b/i);
  const interviewMissing = sourceSnippet(text, /\b(?:full\s+)?(?:interview|transcript|ROTI|recording)\b[^.\n]{0,120}\b(?:outstanding|not served|missing|not attached|summary only)\b/i);
  if (interviewServed && interviewMissing && interviewServed !== interviewMissing) {
    pushKeyIssue(out, seen, {
      issue: "Interview service status conflicts on the papers",
      why: "This matters because an interview summary is not the same as a full transcript or recording.",
      nextAction: "Confirm exactly what interview material is served before advising on admissions or interview fairness.",
      sourceLine: `${interviewServed} | ${interviewMissing}`,
      priority: 78,
    });
  }

  const bwvGap =
    sourceSnippet(text, /\bM\d{1,3}\b[^.\n]{0,80}\b(?:BWV|body[-\s]?worn|body worn video)\b[^.\n]{0,120}\b(?:requested|not served|not enclosed|outstanding|missing)\b/i) ||
    sourceSnippet(text, /\b(?:BWV|body[-\s]?worn|body worn video)\b[^.\n]{0,120}\b(?:requested|not served|not enclosed|outstanding|missing)\b/i);
  const alreadyHasBwv = chaseItems.some((item) => /\b(?:bwv|body[-\s]?worn)\b/i.test(`${item.label} ${item.evidenceAnchor ?? ""}`));
  if (bwvGap && !alreadyHasBwv) {
    pushKeyIssue(out, seen, {
      issue: "BWV appears requested but not served",
      why: "This matters because body-worn video may affect identification, continuity or officer account reliability.",
      nextAction: "Add BWV to the disclosure chase and avoid fixing the hearing position until its status is confirmed.",
      sourceLine: bwvGap,
      priority: 76,
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 5);
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
    return "CAD / 999 audio remains outstanding on the current papers.";
  }
  if (/phone|device|download|extraction|source export/.test(hay)) {
    return "Phone or source-extraction material remains outstanding on the current papers.";
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
    const pageKnown =
      !("pageIdentityKnown" in prov) || (prov as { pageIdentityKnown?: boolean }).pageIdentityKnown !== false;
    const rawPage = "sourcePage" in prov ? (prov as { sourcePage?: unknown }).sourcePage : null;
    const page =
      pageKnown && (typeof rawPage === "string" || typeof rawPage === "number")
        ? String(rawPage)
        : null;
    if (title) lines.push(page ? `${title} p.${page}` : title);
  }
  if (!lines.length) lines.push("Check uploaded papers for the source reference.");
  return [...new Set(lines)].slice(0, 4);
}

/** Pure map from frozen shortlist — membership owned by buildDisclosureChaseBrief. */
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
      receipt: receiptFromChaseItem(item, "overview"),
    });
  }
  return out;
}

export function buildDemoStatCounts(
  attention: DemoAttentionItem[],
  _evidenceCounts: {
    missing: number;
    incomplete: number;
    referred?: number;
    notSafelyConfirmed?: number;
  },
): DemoStatCounts {
  void _evidenceCounts;
  // Chips must match frozen shortlist attention 1:1.
  const attentionMissing = attention.filter((a) => a.status === "MISSING").length;
  const attentionIncomplete = attention.filter(
    (a) => a.status === "UNCLEAR" || a.status === "INCOMPLETE",
  ).length;
  const activeChases = attention.filter((a) => a.status === "ACTIVE").length;
  return {
    missing: attentionMissing,
    incomplete: attentionIncomplete,
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
