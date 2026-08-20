import { formatDisplayLabelCasing } from "@/lib/criminal/bundle-truth-ledger";
import {
  filterPromptInjectionInstructionLines,
  isPromptInjectionInstructionLine,
} from "@/lib/criminal/hostile-source-content";
import { sentenceCasePreservingAcronyms } from "@/lib/criminal/solicitor-visible-quality";
import type {
  ChaseFamilyId,
  DisclosureChaseItem,
} from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { cad999DisplayLabel } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

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

  // BWV / footage status fragments → natural prose (shared; not gold-ID patches)
  if (/bwv\s*\/\s*footage/i.test(t) && /not served/i.test(t) && /log only/i.test(t)) {
    return "BWV/footage is not served. Only a log entry is available; the clip remains outstanding.";
  }

  // MG6C/001 and MG6C/PLA-style schedule codes → concrete material label.
  const mg6 = t.match(/\bMG6C?\/([A-Za-z0-9]+)\s*[—–-]\s*(.+)$/i);
  if (mg6?.[2]) {
    const core = mg6[2]
      .replace(/\s*[—–-]\s*(?:referred on MG6|export not served|outstanding|not on bundle|served on bundle).*$/i, "")
      .replace(/\s+(only|summary|served|outstanding|draft unsigned).*$/i, "")
      .trim();
    if (/\bphone extraction\b|\btelecom download\b/i.test(core)) return "Phone extraction source material";
    if (/\bextraction summary\b/i.test(core) && /\b(phone|handset|mobile)\b/i.test(core)) {
      return "Phone extraction source material";
    }
    if (/\bplatform extraction\b|\bplatform export\b/i.test(core)) return "Platform extraction / export";
    if (/\banpr\b/i.test(core)) return formatDisplayLabelCasing(core.replace(/\s*[—–-].*$/, "").trim() || core);
    if (/screenshot|message pack|message export/i.test(core)) return "Screenshot / message pack";
    if (/subscriber\s+records/i.test(core)) return "Subscriber records";
    if (/subscriber|account data/i.test(core)) return "Subscriber / account data";
    if (/source export/i.test(core)) return "Source export";
    if (/per-?defendant map/i.test(core)) return "Per-defendant attribution map";
    if (/mental health triage|mh triage/i.test(core)) return "Mental health triage";
    if (/risk assessment/i.test(core)) return "Custody / risk assessment";
    if (core) return formatDisplayLabelCasing(core);
  }

  if (/^MG11\b/i.test(t) || /\bMG11\s*[—–-]/i.test(t)) {
    if (/complainant/i.test(t)) return "Complainant MG11 statement";
    if (/officer/i.test(t)) return "Officer MG11 statement";
    return "MG11 witness statement";
  }

  if (/screenshot\s+pack|message export/i.test(t)) return "Screenshot / message pack";
  if (/\bplatform extraction\b|\bplatform export\b/i.test(t)) return "Platform extraction / export";
  if (/\bphone extraction\b|\btelecom download\b/i.test(t)) return "Phone extraction source material";
  if (/subscriber\s+records/i.test(t)) return "Subscriber records";
  if (/subscriber\s+(data|records)|account data/i.test(t)) return "Subscriber / account data";
  if (/\bsource export\b/i.test(t)) return "Source export";
  if (/per-?defendant map/i.test(t)) return "Per-defendant attribution map";
  if (/mental health triage|mh triage/i.test(t)) return "Mental health triage";
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
    return "Further papers on the file";
  }

  // Prefer a short concrete outstanding core over collapsing the whole line to generic chrome.
  if (t.length > 72 && /outstanding|served|draft|summary/i.test(t)) {
    const outstandingCore = t.match(
      /\b((?:full\s+)?(?:source export|account data|subscriber records?|per-?defendant map|mental health triage|risk assessment|phone extraction|message export|platform export)[^—–-]{0,40})/i,
    );
    if (outstandingCore?.[1]) return formatDisplayLabelCasing(outstandingCore[1].trim());
    return "Further papers on the file";
  }

  if (t.length > 56 && /notes|tension|tests mg5|clock drift|statement notes/i.test(t)) {
    return "Further papers on the file";
  }

  if (/^["']/.test(raw.trim()) || /"\s*$/.test(raw.trim())) {
    return "Further papers on the file";
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

function familyLabelForId(familyId: ChaseFamilyId, mergedFrom: string[] = []): string {
  switch (familyId) {
    case "cctv_continuity":
      return "CCTV continuity / provenance";
    case "cctv_master":
      return "CCTV full window / master footage";
    case "cad_999":
      return cad999DisplayLabel(mergedFrom.length ? mergedFrom : ["CAD"]);
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
      return "Further papers issue";
  }
}

function concreteOverflowPriority(label: string): number {
  const n = norm(label);
  if (!n || n === "further papers on the file") return 0;
  if (/^additional source-material issues?\b/.test(n)) return 0;
  if (/\b(source export|account data|subscriber|per defendant|mental health triage|phone extraction|message export|platform export|risk assessment)\b/.test(n)) {
    return 5;
  }
  if (/\b(outstanding|not on bundle|export not served)\b/.test(n)) return 3;
  return 1;
}

function humanOverflowCardLabel(mergedFrom: string[]): string {
  const humanized = dedupeByNorm(
    mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  )
    .filter(
      (h) =>
        h !== "Further papers on the file" &&
        !/^Further papers issues/i.test(h) &&
        !/^Additional source-material issues?\b/i.test(h),
    )
    .sort((a, b) => concreteOverflowPriority(b) - concreteOverflowPriority(a) || a.localeCompare(b));

  if (humanized.length === 0) return "Outstanding source material on disclosure schedule";
  if (humanized.length === 1) return humanized[0]!;
  if (humanized.length === 2) return `${humanized[0]} / ${humanized[1]}`;
  const summary = humanized.slice(0, 4).join(", ");
  if (summary.length <= 72) return `Outstanding source material (${summary})`;
  return `${humanized[0]} + ${humanized.length - 1} more source items`;
}

function buildOverflowDraftWording(mergedFrom: string[]): string {
  const humanized = dedupeByNorm(
    mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).filter(
    (h) =>
      h !== "Further papers on the file" &&
      !/^Further papers issues/i.test(h),
  );

  const suffix = " or confirm in writing why it is not available.";

  if (humanized.length === 0) {
    return `Please provide the outstanding source material identified on the disclosure schedule, including any MG6/MG11/source items referred to but not served${suffix}`;
  }

  if (humanized.length <= 5) {
    const list = humanized
      .map((h) => sentenceCasePreservingAcronyms(h).replace(/\.$/, ""))
      .join(", ");
    return `Please provide the outstanding source material identified on the disclosure schedule, including ${list}${suffix}`;
  }

  return `Please provide the outstanding source material identified on the disclosure schedule, including subscriber/account data, message exports, call logs, and any MG11/source material referred to but not served${suffix}`;
}

function cleanDraftWording(label: string, mergedFrom: string[] = []): string {
  if (
    /^Further papers issues \(\d+ on file\)$/i.test(label) ||
    /^outstanding source material on disclosure schedule$/i.test(label) ||
    /^outstanding source material \(/i.test(label)
  ) {
    return buildOverflowDraftWording(mergedFrom);
  }

  const provision = humanizeChaseFragmentLabel(label);
  const core = provision || "the outstanding source material";
  return `Please provide ${sentenceCasePreservingAcronyms(core)} or confirm in writing why it is not available.`;
}

function sanitizeWhyItMatters(text: string, mergedCount: number): string {
  if (mergedCount > 2 || text.length > 160 || /forensic report|metadata timeline|additional bwv/i.test(text)) {
    return "Review the cited source before relying on this item; record whether the material is served, incomplete, unclear or still awaited.";
  }
  return text;
}

function cleanCourtLine(label: string): string {
  const core = humanizeChaseFragmentLabel(label);
  if (!core || core === "Further papers on the file") {
    return `${COURT_RECORD_PREFIX} that outstanding source material remains on the disclosure schedule and should be timetabled.`;
  }
  return `${COURT_RECORD_PREFIX} that ${sentenceCasePreservingAcronyms(core)} appears outstanding on the current file and should be disclosed on a timetable.`;
}

function finalizeOneItem(item: DisclosureChaseItem): DisclosureChaseItem {
  const safeMergedRaw = filterPromptInjectionInstructionLines(item.mergedFrom);
  if (isPromptInjectionInstructionLine(item.label) && safeMergedRaw.length === 0) {
    // Drop solicitor-visible chase cards that exist only because of hostile instruction text.
    return {
      ...item,
      label: "",
      mergedFrom: [],
      draftChaseWording: "",
      courtLine: "",
      whyItMatters: "",
    };
  }

  const mergedHumanized = dedupeByNorm(
    safeMergedRaw.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).slice(0, 8);

  let label = isPromptInjectionInstructionLine(item.label)
    ? ""
    : humanizeChaseFragmentLabel(item.label);
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
        ? familyLabelForId(item.familyId, safeMergedRaw)
        : mergedHumanized.length === 1
          ? mergedHumanized[0]!
          : humanOverflowCardLabel(mergedHumanized.length ? mergedHumanized : safeMergedRaw);
  }

  let evidenceAnchor = item.evidenceAnchor;
  if (evidenceAnchor && (isRawChaseFragmentLabel(evidenceAnchor) || isPromptInjectionInstructionLine(evidenceAnchor))) {
    evidenceAnchor = isPromptInjectionInstructionLine(evidenceAnchor)
      ? null
      : humanizeChaseFragmentLabel(evidenceAnchor);
    if (evidenceAnchor && isRawChaseFragmentLabel(evidenceAnchor)) evidenceAnchor = null;
  }

  if (/^Further papers issues \(\d+ on file\)$/i.test(label) || /^Additional source-material issues?\b/i.test(label)) {
    label = humanOverflowCardLabel(mergedHumanized.length ? mergedHumanized : safeMergedRaw);
  }

  // MG6 family cards that absorbed concrete outstanding schedule rows should not stay purely generic.
  if (
    item.familyId === "mg6_unused" &&
    /^MG6\b|unused schedule clarification/i.test(label) &&
    mergedHumanized.some((m) => concreteOverflowPriority(m) >= 3)
  ) {
    label = humanOverflowCardLabel(mergedHumanized);
  }

  const mergedForDraft = mergedHumanized.length ? mergedHumanized : safeMergedRaw;

  return {
    ...item,
    label,
    mergedFrom: mergedHumanized.length ? mergedHumanized : label ? [label] : [],
    whyItMatters: sanitizeWhyItMatters(item.whyItMatters, mergedHumanized.length),
    draftChaseWording: label ? cleanDraftWording(label, mergedForDraft) : "",
    courtLine: label ? cleanCourtLine(label) : "",
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
    const familyLabel = familyLabelForId(
      familyId as DisclosureChaseItem["familyId"],
      merged.mergedFrom ?? [],
    );
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
    if (!item.label.trim()) continue;
    const key = itemFinalizeKey(item);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeFinalizedItems(existing, item) : item);
  }
  return collapseFinalizedItemsByFamilyId([...byKey.values()]);
}
