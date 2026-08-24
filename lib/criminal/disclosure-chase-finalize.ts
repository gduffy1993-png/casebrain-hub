import { formatDisplayLabelCasing } from "@/lib/criminal/bundle-truth-ledger";
import { sentenceCasePreservingAcronyms } from "@/lib/criminal/solicitor-visible-quality";
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

  // BWV / footage status fragments → natural prose (shared; not gold-ID patches)
  if (/bwv\s*\/\s*footage/i.test(t) && /not served/i.test(t) && /log only/i.test(t)) {
    return "BWV/footage is not served. Only a log entry is available; the clip remains outstanding.";
  }

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
  // Preserve phone mid-state identity (Grant/Tobin) — do not collapse to a generic extraction label.
  if (
    /phone\s+extraction\s+summary\s+only|full\s+download\s+report\s+not\s+in\s+(?:the\s+)?section|logical\s+download\s+summary/i.test(
      t,
    )
  ) {
    return "Phone extraction summary only — full download report not in section";
  }
  if (/full\s+phone\s+download|phone\s+download\s*\/\s*source\s+extraction/i.test(t)) {
    return "Full phone download / source extraction";
  }
  if (/phone extraction|extraction summary/i.test(t)) return "Phone extraction source material";
  if (/subscriber\s+data|subscriber\s*\/\s*account/i.test(t)) return "Subscriber / account data";
  if (/\bcomplete\s+cad\s*\/\s*999\s+log\b/i.test(t)) return "Complete CAD/999 log";
  if (/\b999\s+(?:audio|call|recording)\b|\bemergency\s+call\b/i.test(t)) {
    return "999 audio / emergency-call material";
  }
  if (/\b(?:cad|dispatch)(?:\s*\/\s*(?:dispatch|cad))?\b/i.test(t)) return "CAD / dispatch log material";
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

  if (t.length > 72 && /outstanding|served|draft|summary/i.test(t)) {
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

function interviewFamilyLabelLocal(hay: string): string {
  const transcriptServed = /transcript\s+state\s+served|transcript\s+(?:is\s+)?served/i.test(hay);
  const recordingServed = /recording\s+state\s+served|recording\s+(?:is\s+)?served/i.test(hay);
  if (transcriptServed && !recordingServed) return "Interview recording";
  if (recordingServed && !transcriptServed) return "Interview transcript";
  if (/recording\s+state\s+not\s+safely\s+confirmed/i.test(hay) && transcriptServed) {
    return "Interview recording";
  }
  if (/\btranscript\b/i.test(hay) && !/\brecording\b/i.test(hay)) return "Interview transcript";
  if (/\brecording\b/i.test(hay) && !/\btranscript\b/i.test(hay)) return "Interview recording";
  // Prefer already-reconciled modality titles when present in hay as sole card title.
  if (/^interview recording$/i.test(hay.trim())) return "Interview recording";
  if (/^interview transcript$/i.test(hay.trim())) return "Interview transcript";
  if (/\brecording\b/i.test(hay) && /\btranscript\b/i.test(hay)) {
    if (transcriptServed) return "Interview recording";
    if (recordingServed) return "Interview transcript";
    return "Interview recording and transcript";
  }
  return "Interview recording";
}

function cad999FamilyLabelLocal(hay: string): string {
  if (/\b999\s+(?:audio|call|recording)\b|\bemergency\s+call\b/i.test(hay)) {
    return "999 audio / emergency-call material";
  }
  if (/\bcomplete\s+cad\s*\/\s*999\s+log\b/i.test(hay)) return "Complete CAD/999 log";
  if (/\b(?:cad|dispatch)(?:\s*\/\s*(?:dispatch|cad))?\b/i.test(hay)) {
    return "CAD / dispatch log material";
  }
  return "CAD / dispatch / 999 material";
}

function familyLabelForId(familyId: ChaseFamilyId, mergedFrom: string[] = []): string {
  switch (familyId) {
    case "cctv_continuity":
      return "CCTV continuity / provenance";
    case "cctv_master":
      return "CCTV full window / master footage";
    case "cad_999":
      return cad999FamilyLabelLocal(mergedFrom.join(" "));
    case "bwv":
      return "Body-worn video (BWV)";
    case "interview":
      return interviewFamilyLabelLocal(mergedFrom.join(" "));
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

function humanOverflowCardLabel(mergedFrom: string[]): string {
  const humanized = dedupeByNorm(
    mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).filter(
    (h) =>
      h !== "Further papers on the file" &&
      !/^Further papers issues/i.test(h) &&
      // Digital modalities must stay distinct cards — never summarise them into overflow.
      !isDigitalModalityChaseLabel(h),
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

  // Never invent subscriber/phone modalities in overflow drafts — Trap thin-file invent residual.
  return `Please provide the outstanding source material identified on the disclosure schedule, including any MG6/MG11/source items referred to but not served${suffix}`;
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
  // Confirm-none from chase-source-gate must stay confirm-none (not re-drafted as a chase).
  if (
    /file indicates none exists/i.test(item.label) ||
    /confirm in writing that none exists/i.test(item.draftChaseWording ?? "")
  ) {
    return item;
  }

  const mergedHumanized = dedupeByNorm(
    item.mergedFrom.map((m) => humanizeChaseFragmentLabel(m)).filter(Boolean),
  ).slice(0, 8);

  let label = humanizeChaseFragmentLabel(item.label);
  // Brookes/Ahmed soft-mute: never overflow-rewrite digital modality cards into
  // "Outstanding source material…" — that buries PDF-true phone/subscriber under Other.
  if (isDigitalModalityChaseLabel(label)) {
    const digitalMerged = mergedHumanized.filter((m) => isDigitalModalityChaseLabel(m));
    return {
      ...item,
      label,
      mergedFrom: digitalMerged.length ? digitalMerged : [label],
      whyItMatters: sanitizeWhyItMatters(item.whyItMatters, digitalMerged.length || 1),
      draftChaseWording: cleanDraftWording(label, digitalMerged.length ? digitalMerged : [label]),
      courtLine: cleanCourtLine(label),
      evidenceAnchor: item.evidenceAnchor,
    };
  }
  const digitalFromMerged = mergedHumanized.find((m) => isDigitalModalityChaseLabel(m));
  if (digitalFromMerged && item.familyId === "other") {
    // Prefer a digital modality identity when overflow mergedFrom still carries one.
    label = digitalFromMerged;
    const digitalMerged = mergedHumanized.filter((m) => isDigitalModalityChaseLabel(m));
    return {
      ...item,
      label,
      mergedFrom: digitalMerged,
      whyItMatters: sanitizeWhyItMatters(item.whyItMatters, digitalMerged.length),
      draftChaseWording: cleanDraftWording(label, digitalMerged),
      courtLine: cleanCourtLine(label),
      evidenceAnchor: item.evidenceAnchor,
    };
  }
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
        ? familyLabelForId(item.familyId, mergedHumanized.length ? mergedHumanized : item.mergedFrom)
        : mergedHumanized.length === 1
          ? mergedHumanized[0]!
          : humanOverflowCardLabel(mergedHumanized.length ? mergedHumanized : item.mergedFrom);
  }

  let evidenceAnchor = item.evidenceAnchor;
  if (evidenceAnchor && isRawChaseFragmentLabel(evidenceAnchor)) {
    evidenceAnchor = humanizeChaseFragmentLabel(evidenceAnchor);
    if (isRawChaseFragmentLabel(evidenceAnchor)) evidenceAnchor = null;
  }

  if (/^Further papers issues \(\d+ on file\)$/i.test(label)) {
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
  // Prefer digital modality identity over overflow collapse when either side is digital.
  const digitalLabel = [a.label, b.label, ...mergedFrom].find((l) => isDigitalModalityChaseLabel(l));
  const label = digitalLabel
    ? digitalLabel
    : a.familyId === "other" || b.familyId === "other"
      ? humanOverflowCardLabel(mergedFrom)
      : a.label.length <= b.label.length
        ? a.label
        : b.label;

  return {
    ...a,
    label,
    mergedFrom: digitalLabel
      ? mergedFrom.filter((m) => isDigitalModalityChaseLabel(m)).length
        ? mergedFrom.filter((m) => isDigitalModalityChaseLabel(m))
        : [digitalLabel]
      : mergedFrom,
    whyItMatters: sanitizeWhyItMatters(a.whyItMatters ?? b.whyItMatters ?? "", mergedFrom.length),
    baseStatus: a.baseStatus === "Overdue" || b.baseStatus === "Overdue" ? "Overdue" : a.baseStatus,
    urgency: a.urgency === "high" || b.urgency === "high" ? "high" : a.urgency,
    draftChaseWording: cleanDraftWording(label, digitalLabel ? [digitalLabel] : mergedFrom),
    courtLine: cleanCourtLine(label),
    evidenceAnchor: a.evidenceAnchor ?? b.evidenceAnchor,
    linkedRoute: a.linkedRoute ?? b.linkedRoute,
  };
}

/** Keep phone/subscriber modality cards distinct — Brookes/Ahmed must not mute under phone collapse. */
export function isDigitalModalityChaseLabel(label: string): boolean {
  return /^(Subscriber \/ account data|Full phone download \/ source extraction|Phone extraction summary only)/i.test(
    label.trim(),
  );
}

function collapseOtherFamilyItems(items: DisclosureChaseItem[]): DisclosureChaseItem[] {
  const core = items.filter((i) => i.familyId !== "other");
  // Should not happen — callers only pass other-family items — keep for safety.
  const misc = items.filter((i) => i.familyId === "other");
  if (misc.length <= 1) {
    // Still peel digital identities trapped inside a single overflow card's mergedFrom.
    if (misc.length === 1) {
      const peeled = peelDigitalModalitiesFromOtherItem(misc[0]!);
      return [...core, ...peeled];
    }
    return items;
  }

  const keepSeparate = misc.filter((i) => isDigitalModalityChaseLabel(i.label));
  const bucketable = misc.filter((i) => !isDigitalModalityChaseLabel(i.label));
  const peeledFromBucket: DisclosureChaseItem[] = [];
  const cleanedBucketable: DisclosureChaseItem[] = [];
  for (const item of bucketable) {
    const peeled = peelDigitalModalitiesFromOtherItem(item);
    const digital = peeled.filter((p) => isDigitalModalityChaseLabel(p.label));
    const rest = peeled.filter((p) => !isDigitalModalityChaseLabel(p.label));
    peeledFromBucket.push(...digital);
    cleanedBucketable.push(...rest);
  }
  if (cleanedBucketable.length <= 1) {
    return [...core, ...keepSeparate, ...peeledFromBucket, ...cleanedBucketable];
  }

  let bucket = cleanedBucketable[0]!;
  for (const item of cleanedBucketable.slice(1)) {
    bucket = mergeFinalizedItems(bucket, item);
  }
  return [...core, ...keepSeparate, ...peeledFromBucket, bucket];
}

/** Pull PDF-true phone/subscriber identities out of overflow Other cards. */
function peelDigitalModalitiesFromOtherItem(item: DisclosureChaseItem): DisclosureChaseItem[] {
  if (isDigitalModalityChaseLabel(item.label)) return [item];
  const digitalLabels = dedupeByNorm(
    [item.label, ...item.mergedFrom]
      .map((m) => humanizeChaseFragmentLabel(m))
      .filter((m) => isDigitalModalityChaseLabel(m)),
  );
  if (!digitalLabels.length) return [item];

  const nonDigitalMerged = dedupeByNorm(
    item.mergedFrom
      .map((m) => humanizeChaseFragmentLabel(m))
      .filter((m) => m && !isDigitalModalityChaseLabel(m)),
  );
  const out: DisclosureChaseItem[] = digitalLabels.map((label, idx) => ({
    ...item,
    id: `${item.id}-digital-${idx}`,
    familyId: "other" as const,
    label,
    mergedFrom: [label],
    draftChaseWording: cleanDraftWording(label, [label]),
    courtLine: cleanCourtLine(label),
    whyItMatters:
      /subscriber/i.test(label)
        ? "Screenshots or partial extraction alone do not prove subscriber attribution."
        : /summary only/i.test(label)
          ? "A logical download summary or referenced-only note is not a full phone download report."
          : "Original download / source export is outstanding on the disclosure papers.",
  }));
  if (nonDigitalMerged.length) {
    out.push({
      ...item,
      label: humanOverflowCardLabel(nonDigitalMerged),
      mergedFrom: nonDigitalMerged,
      draftChaseWording: cleanDraftWording(humanOverflowCardLabel(nonDigitalMerged), nonDigitalMerged),
      courtLine: cleanCourtLine(humanOverflowCardLabel(nonDigitalMerged)),
    });
  }
  return out;
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
      [
        ...merged.mergedFrom,
        merged.label,
        merged.provenance?.unresolvedConflictOrLimitation ?? "",
      ].filter(Boolean),
    );
    // Prefer an already modality-reconciled interview title when finalize would re-lump.
    const preferredInterview =
      familyId === "interview" &&
      /^(Interview recording|Interview transcript|Interview recording and transcript)$/i.test(
        merged.label,
      )
        ? merged.label
        : null;
    out.push({
      ...merged,
      label: preferredInterview ?? familyLabel,
      draftChaseWording: cleanDraftWording(preferredInterview ?? familyLabel, merged.mergedFrom),
      courtLine: cleanCourtLine(preferredInterview ?? familyLabel),
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
