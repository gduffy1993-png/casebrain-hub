import { formatDisplayLabelCasing } from "@/lib/criminal/bundle-truth-ledger";
import type {
  ChaseFamilyId,
  DisclosureChaseItem,
} from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const COURT_RECORD_PREFIX = "The defence asks the court to record";

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Matches weirdness-detector raw_fragment_label heuristic. */
export function isRawChaseFragmentLabel(label: string): boolean {
  return /(^\s*(?:\|?\s*\d+\s*\||#{1,6}\s|mg11\s|mg6c?\/|bundle index|scanned continuation|page\s+\d+)|\|\s*\d+\s*\||\|\s*\*\*|particulars of offence)/i.test(
    label,
  );
}

function stripCourtLinePrefix(raw: string): string {
  const t = raw.trim();
  const courtMatch = t.match(
    /^\s*(?:the\s+defence\s+asks\s+the\s+court\s+to\s+record|ask\s+the\s+court\s+to\s+record)\s+that\s+(.+?)(?:\s+(?:remains?|remain|appears?|appear|should|must|is|are)\b|[.;]|$)/i,
  );
  if (!courtMatch?.[1]) return t;
  return courtMatch[1].replace(/^the\s+/i, "").trim();
}

function stripPagePipeFragments(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, "")
    .replace(/\s*\|\s*\d+(?:\s*-\s*\d+)?\s*\|/gi, " ")
    .replace(/\s*\|\s*\d+\s*\|/gi, " ")
    .replace(/\s*\(draft\)\s*\d+\s*$/i, " (draft)")
    .replace(/\s+/g, " ")
    .trim();
}

export function humanizeChaseFragmentLabel(raw: string): string {
  let t = stripCourtLinePrefix(stripPagePipeFragments(raw.trim()));
  if (!t) return "";

  const mg6 = t.match(/\bMG6C?\/\d+\s*[—–-]\s*(.+?)(?:\s*[—–-]\s*.+)?\.?$/i);
  if (mg6?.[1]) {
    const core = mg6[1]
      .replace(/\s+(only|summary|served|outstanding|draft unsigned).*$/i, "")
      .trim();
    if (/phone extraction|extraction summary/i.test(core)) return "Phone extraction source material";
    if (/screenshot|message pack/i.test(core)) return "Screenshot / message pack";
    if (/subscriber/i.test(core)) return "Subscriber / account data";
    return formatDisplayLabelCasing(core);
  }

  if (/^MG11\b/i.test(t) || /\bMG11\s*[—–-]/i.test(t)) {
    if (/complainant/i.test(t)) return "Complainant MG11 statement";
    if (/officer/i.test(t)) return "Officer MG11 statement";
    return "MG11 witness statement";
  }

  if (/screenshot\s+pack/i.test(t)) return "Screenshot / message pack";
  if (/phone extraction|extraction summary/i.test(t)) return "Phone extraction source material";
  if (/subscriber\s+data/i.test(t)) return "Subscriber / account data";
  if (/^MG6\b|mg6\s*\/\s*unused|disclosure schedule/i.test(t)) return "MG6 / unused schedule clarification";

  if (t.includes(";")) {
    const parts = t
      .split(";")
      .map((part) => humanizeChaseFragmentLabel(part))
      .filter(Boolean);
    const unique = dedupeByNorm(parts);
    if (unique.length === 1) return unique[0]!;
    if (unique.length > 1 && unique.every((p) => p.length <= 48)) {
      return unique.slice(0, 3).join("; ");
    }
    return "Additional source-material on file";
  }

  if (t.length > 72 && /outstanding|served|draft|summary/i.test(t)) {
    return "Additional source-material on file";
  }

  if (t.length > 56 && /notes|tension|tests mg5|clock drift|statement notes/i.test(t)) {
    return "Additional source-material on file";
  }

  if (/^["']/.test(raw.trim()) || /"\s*$/.test(raw.trim())) {
    return "Additional source-material on file";
  }

  return formatDisplayLabelCasing(t);
}

function dedupeByNorm(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = norm(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function familyLabelForId(familyId: ChaseFamilyId): string {
  switch (familyId) {
    case "cctv_continuity":
      return "CCTV continuity / provenance";
    case "cctv_master":
      return "CCTV full window / master footage";
    case "cad_999":
      return "CAD / 999 audio / control-room material";
    case "bwv":
      return "Body-worn video (BWV)";
    case "interview":
      return "Interview recording / transcript";
    case "mg6_unused":
      return "MG6 / unused / schedule clarification";
    case "medical_expert":
      return "Medical / expert source report";
    case "exhibit_provenance":
      return "Exhibit mapping / provenance";
    default:
      return "Additional source-material issue";
  }
}

function humanOverflowCardLabel(mergedFrom: string[]): string {
  const humanized = dedupeByNorm(
    mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).filter(
    (h) =>
      h !== "Additional source-material on file" &&
      !/^additional source-material issues/i.test(h),
  );

  if (humanized.length === 0) return "Outstanding source material on disclosure schedule";
  if (humanized.length === 1) return humanized[0]!;
  if (humanized.length === 2) return `${humanized[0]} / ${humanized[1]}`;
  const summary = humanized.slice(0, 4).join(", ");
  if (summary.length <= 72) return `Outstanding source material (${summary})`;
  return "Outstanding source material on disclosure schedule";
}

function buildOverflowDraftWording(mergedFrom: string[]): string {
  const humanized = dedupeByNorm(
    mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).filter(
    (h) =>
      h !== "Additional source-material on file" &&
      !/^additional source-material issues/i.test(h),
  );

  const suffix = " or confirm in writing why it is not available.";

  if (humanized.length === 0) {
    return `Please provide the outstanding source material identified on the disclosure schedule, including any MG6/MG11/source items referred to but not served${suffix}`;
  }

  if (humanized.length <= 5) {
    const list = humanized
      .map((h) => (h.charAt(0).toLowerCase() + h.slice(1)).replace(/\.$/, ""))
      .join(", ");
    return `Please provide the outstanding source material identified on the disclosure schedule, including ${list}${suffix}`;
  }

  return `Please provide the outstanding source material identified on the disclosure schedule, including subscriber/account data, message exports, call logs, and any MG11/source material referred to but not served${suffix}`;
}

function cleanDraftWording(label: string, mergedFrom: string[] = []): string {
  if (
    /^additional source-material issues \(\d+ on file\)$/i.test(label) ||
    /^outstanding source material on disclosure schedule$/i.test(label) ||
    /^outstanding source material \(/i.test(label)
  ) {
    return buildOverflowDraftWording(mergedFrom);
  }

  const provision = humanizeChaseFragmentLabel(label);
  const core = provision || "the outstanding source material";
  return `Please provide ${core.charAt(0).toLowerCase()}${core.slice(1)} or confirm in writing why it is not available.`;
}

function sanitizeWhyItMatters(text: string, mergedCount: number): string {
  if (mergedCount > 2 || text.length > 160 || /forensic report|metadata timeline|additional bwv/i.test(text)) {
    return "Additional source-material appears outstanding on the current file — solicitor to confirm relevance before fixing hearing position.";
  }
  return text;
}

function cleanCourtLine(label: string): string {
  const core = humanizeChaseFragmentLabel(label);
  if (!core || core === "Additional source-material on file") {
    return `${COURT_RECORD_PREFIX} that outstanding source material remains on the disclosure schedule and should be timetabled.`;
  }
  return `${COURT_RECORD_PREFIX} that ${core.charAt(0).toLowerCase()}${core.slice(1)} appears outstanding on the current file and should be disclosed on a timetable.`;
}

function finalizeOneItem(item: DisclosureChaseItem): DisclosureChaseItem {
  const mergedHumanized = dedupeByNorm(
    item.mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).slice(0, 8);

  let label = humanizeChaseFragmentLabel(item.label);
  const needsFamilyLabel =
    !label ||
    isRawChaseFragmentLabel(label) ||
    (label.includes(";") && label.length > 64) ||
    /^please provide/i.test(label) ||
    /^the prosecution relies/i.test(label) ||
    /^the complainant reports/i.test(label) ||
    /^the messages came/i.test(label) ||
    /^"c?ctv/i.test(label) ||
    /clock drift|tests mg5|tension \(footage/i.test(label) ||
    /^disclosure completeness:/i.test(label) ||
    /^the following are not yet exhibited:/i.test(label) ||
    /^legal advice:/i.test(label) ||
    /^interview:/i.test(label) ||
    /^\d+\.\s+on \d+/i.test(label) ||
    /^sleep:/i.test(label);

  if (needsFamilyLabel) {
    label =
      item.familyId !== "other"
        ? familyLabelForId(item.familyId)
        : mergedHumanized.length === 1
          ? mergedHumanized[0]!
          : humanOverflowCardLabel(mergedHumanized.length ? mergedHumanized : item.mergedFrom);
  }

  let evidenceAnchor = item.evidenceAnchor;
  if (evidenceAnchor && isRawChaseFragmentLabel(evidenceAnchor)) {
    evidenceAnchor = humanizeChaseFragmentLabel(evidenceAnchor);
    if (isRawChaseFragmentLabel(evidenceAnchor)) evidenceAnchor = null;
  }

  if (/^additional source-material issues \(\d+ on file\)$/i.test(label)) {
    label = humanOverflowCardLabel(mergedHumanized.length ? mergedHumanized : item.mergedFrom);
  }

  const mergedForDraft = mergedHumanized.length ? mergedHumanized : item.mergedFrom;

  return {
    ...item,
    label,
    mergedFrom: mergedHumanized.length ? mergedHumanized : [label],
    whyItMatters: sanitizeWhyItMatters(item.whyItMatters, mergedHumanized.length),
    draftChaseWording: cleanDraftWording(label, mergedForDraft),
    courtLine: cleanCourtLine(label),
    evidenceAnchor,
  };
}

function itemFinalizeKey(item: DisclosureChaseItem): string {
  return `${item.familyId}:${norm(item.label)}`;
}

function mergeFinalizedItems(a: DisclosureChaseItem, b: DisclosureChaseItem): DisclosureChaseItem {
  const mergedFrom = dedupeByNorm([...a.mergedFrom, ...b.mergedFrom]).slice(0, 12);
  const label =
    a.familyId === "other" || b.familyId === "other"
      ? humanOverflowCardLabel(mergedFrom)
      : a.label.length <= b.label.length
        ? a.label
        : b.label;

  return {
    ...a,
    label,
    mergedFrom,
    whyItMatters: sanitizeWhyItMatters(a.whyItMatters ?? b.whyItMatters ?? "", mergedFrom.length),
    baseStatus: a.baseStatus === "Overdue" || b.baseStatus === "Overdue" ? "Overdue" : a.baseStatus,
    urgency: a.urgency === "high" || b.urgency === "high" ? "high" : a.urgency,
    draftChaseWording: cleanDraftWording(label, mergedFrom),
    courtLine: cleanCourtLine(label),
    evidenceAnchor: a.evidenceAnchor ?? b.evidenceAnchor,
    linkedRoute: a.linkedRoute ?? b.linkedRoute,
  };
}

function collapseOtherFamilyItems(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const core = items.filter((i) => i.familyId !== "other");
  const misc = items.filter((i) => i.familyId === "other");
  if (misc.length <= 1) return items;

  let bucket = misc[0]!;
  for (const item of misc.slice(1)) {
    bucket = mergeFinalizedItems(bucket, item);
  }
  return [...core, bucket];
}

function collapseFinalizedItemsByFamilyId(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const byFamily = new Map<string, DisclosureChaseItem[]>();
  for (const item of items) {
    const list = byFamily.get(item.familyId) ?? [];
    list.push(item);
    byFamily.set(item.familyId, list);
  }

  const out: DisclosureChaseItem[] = [];
  for (const [familyId, group] of byFamily) {
    if (familyId === "other") {
      out.push(...collapseOtherFamilyItems(group));
      continue;
    }
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }
    let merged = group[0]!;
    for (const item of group.slice(1)) {
      merged = mergeFinalizedItems(merged, item);
    }
    const familyLabel = familyLabelForId(familyId as DisclosureChaseItem["familyId"]);
    out.push({
      ...merged,
      label: familyLabel,
      draftChaseWording: cleanDraftWording(familyLabel, merged.mergedFrom),
      courtLine: cleanCourtLine(familyLabel),
    });
  }
  return out;
}

/** H2 P1 — presentation-only cleanup for solicitor-facing Chase cards. */
export function finalizeDisclosureChasePresentation(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const byKey = new Map<string, DisclosureChaseItem>();
  for (const raw of items) {
    const item = finalizeOneItem(raw);
    const key = itemFinalizeKey(item);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeFinalizedItems(existing, item) : item);
  }
  return collapseFinalizedItemsByFamilyId([...byKey.values()]);
}
