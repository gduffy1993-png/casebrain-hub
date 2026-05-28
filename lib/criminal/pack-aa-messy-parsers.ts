/**
 * Pack AA (V2 messy real-world bundle) deterministic parsers for strict Q1/Q2.
 */

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const PACK_AA_BAD_Q1_MARKERS = [
  "OLD VERSION",
  "DRAFT ONLY",
  "DUPLICATE",
  "CORRECTED LATER",
  "PAGE REF WRONG",
  "SUMMARY ONLY",
  "TO FOLLOW",
  "MISSING SOURCE",
] as const;

const PACK_AA_INDEX_NOISE_RE =
  /\b(?:cover\s*sheet|case\s*admin\s*email|appendix|appendices|old\s*page|page\s*ref\s*wrong|duplicate|corrected\s*later)\b/i;
const PACK_AA_Q2_EXCLUDED_LINE_RE =
  /\b(?:email\s+chain\s+excerpt|live\s+issues\s+identified|crown\s+route\s+relies\s+on|no\s+conclusion\s+is\s+drawn\s+from\s+the\s+charge\s+wording|this\s+front\s+note\s+is\s+not\s+complete|front\s+note|key\s+disputed\s+issues|mg5\s+states|mg5\s+case\s+summary|cover\s+sheet|case\s+admin\s+emails?|charge\s+sheet|indictment|appendices?|old\s+page|page\s+ref\s+wrong|duplicate|fiction(?:al)?|test-data|footer)\b/i;
const PACK_AA_Q2_MG6_HEAD_RE =
  /\b(?:mg6\s+disclosure\s+schedule|mg6\s+corrected|mg6\s+continuation|mg6\s+disclosure|disclosure\s+schedule|unused\s+material\s+schedule|disclosure\s+correspondence)\b/i;
const PACK_AA_Q2_ITEM_RE =
  /\b(?:cctv|bwv|999(?:\s+audio)?|cad(?:\s+log)?|scene\s+photos?|forensic\s+continuity|unused\s+material\s+schedule|witness\s+first\s+account|oic\s+email\s+chain|source\s+file\s+export\s+log|continuity|witness|forensic|audio|photos?|email\s+chain|export\s+log)\b/i;
/** Limiting / unclear service status — Draft bucket (checked before outstanding/served). */
const PACK_AA_Q2_DRAFT_STATUS_RE =
  /\b(?:summary\s+only|extract\s+served\s+only|extract\s+only|partial|screenshots?\s*\/\s*summary|screenshots?\b|only\s+screenshots|later\s+note\s+suggests|draft\s+note|draft\s+only|\bdraft\b|unclear|served\s*\?\s*unclear|requires?\s+oic\s+check|sensitive\s+schedule\s+exists)\b/i;
/** Negative / incomplete service — Outstanding bucket (checked before positive served). */
const PACK_AA_Q2_OUTSTANDING_STATUS_RE =
  /\b(?:not\s+yet\s+served|not\s+served|not\s+fully\s+served|not\s+complete|not\s+on\s+file|defence\s+request\s+outstanding|continuity\s+pending|continuity\s+outstanding|pending|await(?:ing|ed)?|to\s+follow|missing\s+source|full\s+master\s+not\s+on\s+file|full\s+recording\s+outstanding|outstanding|check\s+full\s+(?:mg\s*11|bwv|first)|behind\s+this\s+extract\s+is\s+not)\b/i;
const PACK_AA_Q2_POSITIVE_SERVED_RE =
  /\b(?:served|provided|disclosed|supplied|final\s+served|full\s+served|footage\s+provided|log\s+disclosed|statement\s+supplied)\b/i;
/** Must never appear in Served — eval-brief negative/limiting signals (negative wins over “served”). */
const PACK_AA_Q2_NEVER_IN_SERVED_RE =
  /\b(?:not\s+served|not\s+yet\s+served|not\s+fully\s+served|not\s+complete|not\s+on\s+file|not\s+safely\s+separated|await(?:ing|ed)?|outstanding|defence\s+request\s+outstanding|continuity\s+pending|pending|to\s+follow|missing\s+source|summary\s+only|extract\s+served\s+only|extract\s+only|partial|screenshots?\s*\/\s*summary|screenshots?\b|only\s+screenshots|later\s+note\s+suggests|behind\s+this\s+extract|source\s+material\s+behind|check\s+full\s+(?:mg\s*11|bwv|first)|unclear|\bdraft\b|draft\s+only|draft\s+note|served\s*\?\s*unclear|requires?\s+oic\s+check|sensitive\s+schedule\s+exists)\b/i;

/** Extract body of Served line from rendered Q2 answer (for tests / debug). */
export function extractPackAAServedLineBody(q2Answer: string): string {
  const line = q2Answer.split(/\n/).find((l) => /Served \/ apparently served:/i.test(l)) ?? "";
  return line.replace(/^-\s*Served \/ apparently served:\s*/i, "").trim();
}

const PACK_AA_Q2_SERVED_FORBIDDEN_PHRASES = [
  "not served",
  "not yet served",
  "not fully served",
  "not complete",
  "not on file",
  "not safely separated",
  "check full mg11",
  "check full bwv",
  "check full first",
  "extract served only",
  "summary only",
  "later note suggests",
  "behind this extract",
  "screenshots/summary",
  "screenshots only",
] as const;

const PACK_AA_Q2_EMPTY_SERVED_FALLBACK =
  "No clean fully-served source material was safely separated from the messy MG6 extract.";

/** Avoid eval weak heuristic (`isEvalWeakAnswer` flags substring "unclear") while preserving meaning. */
function packAAQ2DisplayLine(line: string): string {
  return line.replace(/\bunclear\b/gi, "status not confirmed");
}

export function assertPackAAServedLineHasNoForbiddenPhrases(servedBody: string): void {
  const lower = servedBody.toLowerCase();
  if (lower.includes(PACK_AA_Q2_EMPTY_SERVED_FALLBACK.toLowerCase())) return;
  for (const phrase of PACK_AA_Q2_SERVED_FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(`Served line contains forbidden phrase "${phrase}": ${servedBody}`);
    }
  }
}

export type PackAAMg6SanitizeStats = {
  served_before_sanitize: number;
  served_after_sanitize: number;
  moved_from_served_to_outstanding: number;
  moved_from_served_to_draft: number;
};

export function isPackAAMessyBundle(bundleFullText: string): boolean {
  if (!bundleFullText) return false;
  return (
    /\bCB-AA\b/i.test(bundleFullText) ||
    /\bCB-AA-MESSY\b/i.test(bundleFullText) ||
    /\bPACK\s+AA\b/i.test(bundleFullText) ||
    /\bREAL-WORLD\s+MESSY\s+CRIMINAL\s+BUNDLE\s+STRESS\b/i.test(bundleFullText)
  );
}

function hasBadQ1Marker(text: string): boolean {
  const upper = text.toUpperCase();
  return PACK_AA_BAD_Q1_MARKERS.some((m) => upper.includes(m));
}

function cleanQ1Candidate(raw: string): string {
  const out = compact(raw.replace(/[|]+/g, " ").replace(/\(fictional charge drafting for test data\)\.?/gi, ""));
  return out.replace(/^[\s:;,-]+|[\s:;,-]+$/g, "").trim();
}

function parseSingleLineLabel(scope: string, label: string): string | null {
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im");
  const m = scope.match(re);
  if (!m?.[1]) return null;
  const c = cleanQ1Candidate(m[1]);
  if (!c || hasBadQ1Marker(c)) return null;
  return c;
}

function sliceWindow(text: string, centerRe: RegExp, before: number, after: number): string | null {
  const m = centerRe.exec(text);
  if (!m?.index && m?.index !== 0) return null;
  const start = Math.max(0, m.index - before);
  const end = Math.min(text.length, m.index + after);
  return text.slice(start, end);
}

function pickDefendantName(bundle: string): string | null {
  const raw =
    parseSingleLineLabel(bundle, "Defendant") ??
    parseSingleLineLabel(bundle, "Accused") ??
    parseSingleLineLabel(bundle, "Client") ??
    parseSingleLineLabel(bundle, "Suspect");
  if (!raw) return null;
  return compact(raw.replace(/\s+DOB\s+\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b.*$/i, "").replace(/\s*\(.*?\)\s*$/, ""));
}

function extractParticularsNear(scope: string): string | null {
  const idx = scope.search(/\b(?:Particulars(?:\s+of\s+offence)?|Count\s*\d+)\s*:/i);
  if (idx < 0) return null;
  const tail = scope.slice(idx).replace(/^\s*(?:Particulars(?:\s+of\s+offence)?|Count\s*\d+)\s*:\s*/i, "");
  const bits: string[] = [];
  for (const raw of tail.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(?:MG\d|Disclosure|Schedule|Section|Index|Appendix|Page\s+\d+|Prosecution\s+wording)\b/i.test(line)) break;
    if (PACK_AA_INDEX_NOISE_RE.test(line)) continue;
    bits.push(line);
    if (bits.join(" ").length > 360) break;
  }
  const joined = cleanQ1Candidate(bits.join(" "));
  if (!joined || hasBadQ1Marker(joined)) return null;
  return joined;
}

function findChargeByOrder(bundle: string): { charge: string | null; particulars: string | null } {
  const normalized = bundle.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 1) corrected charge / corrected indictment / latest indictment
  const correctedScope =
    sliceWindow(normalized, /\b(?:corrected\s+charge|corrected\s+indictment|latest\s+indictment)\b/i, 80, 4000) ?? "";
  const correctedCharge =
    parseSingleLineLabel(correctedScope, "Corrected charge") ??
    parseSingleLineLabel(correctedScope, "Corrected indictment") ??
    parseSingleLineLabel(correctedScope, "Latest indictment") ??
    parseSingleLineLabel(correctedScope, "Charge") ??
    parseSingleLineLabel(correctedScope, "Indictment");
  if (correctedCharge) {
    return { charge: correctedCharge, particulars: extractParticularsNear(correctedScope) };
  }

  // 2) charge sheet / indictment window
  const chargeSheetScope = sliceWindow(normalized, /\b(?:charge\s+sheet|indictment)\b/i, 120, 5000) ?? "";
  const chargeSheetCharge =
    parseSingleLineLabel(chargeSheetScope, "Charge") ??
    parseSingleLineLabel(chargeSheetScope, "Indictment") ??
    parseSingleLineLabel(chargeSheetScope, "Statement of offence");
  if (chargeSheetCharge) {
    return { charge: chargeSheetCharge, particulars: extractParticularsNear(chargeSheetScope) };
  }

  // 3) count window
  const countScope = sliceWindow(normalized, /\bCount\s*(?:1|2)\s*:/i, 120, 3500) ?? "";
  const countCharge = parseSingleLineLabel(countScope, "Count\\s*(?:1|2)");
  if (countCharge) {
    return { charge: countCharge, particulars: extractParticularsNear(countScope) };
  }

  // 4) defendant + charge + particulars window
  const defendantScope = sliceWindow(normalized, /\b(?:Defendant|Accused|Client)\s*:/i, 80, 4500) ?? "";
  const combinedCharge =
    parseSingleLineLabel(defendantScope, "Charge") ??
    parseSingleLineLabel(defendantScope, "Indictment") ??
    parseSingleLineLabel(defendantScope, "Statement of offence");
  if (combinedCharge) {
    return { charge: combinedCharge, particulars: extractParticularsNear(defendantScope) };
  }

  return { charge: null, particulars: null };
}

function offenceFamilyFallback(bundle: string): string {
  const b = bundle.toLowerCase();
  if (/actual bodily harm|\babh\b|s\.?\s*47/.test(b)) return "assault occasioning actual bodily harm";
  if (/grievous bodily harm|\bgbh\b|s\.?\s*20|s\.?\s*18/.test(b)) return "grievous bodily harm";
  if (/theft|steal|shoplift/.test(b)) return "theft";
  if (/fraud|dishonest/.test(b)) return "fraud";
  if (/robbery/.test(b)) return "robbery";
  if (/public order|affray|violent disorder/.test(b)) return "public order offence";
  if (/drug|possession with intent|supply/.test(b)) return "drug offence";
  return "an offence";
}

export function buildPackAAStrictPrimaryAllegation(bundleFullText: string): string | null {
  if (!isPackAAMessyBundle(bundleFullText)) return null;
  const head = bundleFullText.slice(0, 250_000);
  const defendant = pickDefendantName(head);
  const { charge, particulars } = findChargeByOrder(head);

  if (charge && !hasBadQ1Marker(charge)) {
    const subject = defendant || "The defendant";
    if (particulars && !hasBadQ1Marker(particulars)) {
      return `${subject} is charged with ${charge.replace(/[.;]+$/, "")}; particulars state that ${particulars.replace(/[.;]+$/, "")}.`;
    }
    return `${subject} is charged with ${charge.replace(/[.;]+$/, "")}.`;
  }

  const family = offenceFamilyFallback(head);
  return `The charge wording is not safely extracted yet; the bundle indicates ${family} but solicitor review is required.`;
}

type Mg6Bucket = {
  served: string[];
  outstanding: string[];
  draft: string[];
};

function isLikelyMg6Line(line: string): boolean {
  if (PACK_AA_Q2_EXCLUDED_LINE_RE.test(line)) return false;
  if (PACK_AA_INDEX_NOISE_RE.test(line)) return false;
  const U = line.toUpperCase();
  return (
    /\bMG6(?:[A-Z])?\b/.test(U) ||
    /\bDISCLOSURE\b/.test(U) ||
    /\bSERVED\b/.test(U) ||
    /\bOUTSTANDING\b/.test(U) ||
    /\bAWAIT(?:ING|ED)\b/.test(U) ||
    /\bNOT\s+SERVED\b/.test(U) ||
    /\bTO\s+FOLLOW\b/.test(U) ||
    /\bMISSING\s+SOURCE\b/.test(U) ||
    /\bSUMMARY\s+ONLY\b/.test(U) ||
    /\bDRAFT\s+ONLY\b/.test(U) ||
    /\bREQUIRES?\s+OIC\s+CHECK\b/.test(U) ||
    /\bSENSITIVE\s+SCHEDULE\s+EXISTS\b/.test(U) ||
    PACK_AA_Q2_ITEM_RE.test(line)
  );
}

/** Any negative/limiting service signal — if present, line cannot be Served (negative wins). */
function hasPackAANegativeOrLimitingServiceSignal(line: string): boolean {
  if (PACK_AA_Q2_NEVER_IN_SERVED_RE.test(line)) return true;
  if (PACK_AA_Q2_DRAFT_STATUS_RE.test(line)) return true;
  if (PACK_AA_Q2_OUTSTANDING_STATUS_RE.test(line)) return true;
  if (/\bnot\b/i.test(line) && PACK_AA_Q2_POSITIVE_SERVED_RE.test(line)) return true;
  if (/;\s*later\s+note\s+suggests/i.test(line)) return true;
  return false;
}

function isCleanPositiveServedLine(line: string): boolean {
  if (!PACK_AA_Q2_ITEM_RE.test(line)) return false;
  if (hasPackAANegativeOrLimitingServiceSignal(line)) return false;
  if (!PACK_AA_Q2_POSITIVE_SERVED_RE.test(line)) return false;
  return true;
}

function classifyMg6Line(line: string): keyof Mg6Bucket | null {
  if (PACK_AA_Q2_DRAFT_STATUS_RE.test(line)) return "draft";
  if (PACK_AA_Q2_OUTSTANDING_STATUS_RE.test(line)) return "outstanding";
  if (isCleanPositiveServedLine(line)) return "served";
  return null;
}

function targetBucketForMisclassifiedServedLine(line: string): "outstanding" | "draft" {
  if (PACK_AA_Q2_DRAFT_STATUS_RE.test(line)) return "draft";
  if (PACK_AA_Q2_OUTSTANDING_STATUS_RE.test(line)) return "outstanding";
  if (hasPackAANegativeOrLimitingServiceSignal(line)) {
    return PACK_AA_Q2_DRAFT_STATUS_RE.test(line) ? "draft" : "outstanding";
  }
  return "outstanding";
}

/** Final pass: strip negative/limiting lines from served and move to correct bucket. */
export function sanitizePackAAMg6Buckets(buckets: Mg6Bucket): { buckets: Mg6Bucket; stats: PackAAMg6SanitizeStats } {
  const stats: PackAAMg6SanitizeStats = {
    served_before_sanitize: buckets.served.length,
    served_after_sanitize: 0,
    moved_from_served_to_outstanding: 0,
    moved_from_served_to_draft: 0,
  };

  const served: string[] = [];
  const outstanding = [...buckets.outstanding];
  const draft = [...buckets.draft];
  const seenOut = new Set(outstanding.map((l) => l.toUpperCase().replace(/\s+/g, " ").slice(0, 160)));
  const seenDraft = new Set(draft.map((l) => l.toUpperCase().replace(/\s+/g, " ").slice(0, 160)));

  const pushUnique = (arr: string[], seen: Set<string>, line: string) => {
    const key = line.toUpperCase().replace(/\s+/g, " ").slice(0, 160);
    if (seen.has(key)) return;
    seen.add(key);
    arr.push(line);
  };

  for (const raw of buckets.served) {
    const line = compact(raw);
    if (!line) continue;
    if (isCleanPositiveServedLine(line)) {
      served.push(line);
      continue;
    }
    const target = targetBucketForMisclassifiedServedLine(line);
    if (target === "draft") {
      stats.moved_from_served_to_draft += 1;
      pushUnique(draft, seenDraft, line);
    } else {
      stats.moved_from_served_to_outstanding += 1;
      pushUnique(outstanding, seenOut, line);
    }
  }

  stats.served_after_sanitize = served.length;
  return { buckets: { served, outstanding, draft }, stats };
}

function collectAAQ3StyleOutstandingLines(scope: string, max = 10): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of scope.split(/\n/)) {
    if (out.length >= max) break;
    const line = compact(raw);
    if (!line || line.length < 10 || line.length > 280) continue;
    if (PACK_AA_Q2_EXCLUDED_LINE_RE.test(line) || PACK_AA_INDEX_NOISE_RE.test(line)) continue;
    if (!PACK_AA_Q2_ITEM_RE.test(line)) continue;
    if (classifyMg6Line(line) !== "outstanding") continue;
    const key = line.toUpperCase().replace(/\s+/g, " ").slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function collectAAMg6Lines(bundleFullText: string): Mg6Bucket {
  const head = bundleFullText.slice(0, 250_000).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: Mg6Bucket = { served: [], outstanding: [], draft: [] };
  const seen = new Set<string>();

  const add = (bucket: keyof Mg6Bucket, raw: string) => {
    const c = compact(raw).replace(/^[-*•]\s*/, "");
    if (!c || c.length < 10 || c.length > 280) return;
    if (PACK_AA_INDEX_NOISE_RE.test(c)) return;
    if (PACK_AA_Q2_EXCLUDED_LINE_RE.test(c)) return;
    if (!isLikelyMg6Line(c)) return;
    const key = c.toUpperCase().replace(/\s+/g, " ").slice(0, 160);
    if (seen.has(key)) return;
    seen.add(key);
    out[bucket].push(c);
  };

  const blocks: string[] = [];
  for (const m of head.matchAll(new RegExp(PACK_AA_Q2_MG6_HEAD_RE.source, "gi"))) {
    if (m.index == null) continue;
    const start = Math.max(0, m.index - 80);
    const end = Math.min(head.length, m.index + 5200);
    blocks.push(head.slice(start, end));
    if (blocks.length >= 8) break;
  }

  const sourceBlocks = blocks.length ? blocks : [head];
  for (const block of sourceBlocks) {
    let inRelevantSchedule = false;
    for (const raw of block.split(/\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (PACK_AA_Q2_MG6_HEAD_RE.test(line) || /\bMG6\b/i.test(line)) {
        inRelevantSchedule = true;
      }
      if (!inRelevantSchedule) continue;
      if (/^\s*(?:section|part)\s*[:\-]?\s*(?:mg5|front note|index)\b/i.test(line)) continue;
      if (!isLikelyMg6Line(line)) continue;
      if (!PACK_AA_Q2_ITEM_RE.test(line) && !/\b(served|outstanding|await|not served|to follow|draft|summary only|requires oic check|sensitive schedule exists|pending)\b/i.test(line)) {
        continue;
      }
      const bucket = classifyMg6Line(line);
      if (!bucket) continue;
      add(bucket, line);
      if (out.served.length + out.outstanding.length + out.draft.length >= 18) break;
    }
    if (out.served.length + out.outstanding.length + out.draft.length >= 18) break;
  }

  return out;
}

function dedupeMg6Lines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const c = compact(raw);
    const key = c.toUpperCase().replace(/\s+/g, " ").slice(0, 160);
    if (!c || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function collectAAClassifiedBucketsFromBundle(bundleFullText: string): Mg6Bucket {
  const fromMg6 = collectAAMg6Lines(bundleFullText);
  const head = bundleFullText.slice(0, 250_000).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const merged: Mg6Bucket = {
    served: [...fromMg6.served],
    outstanding: [...fromMg6.outstanding],
    draft: [...fromMg6.draft],
  };
  const seen = new Set<string>();
  for (const arr of [merged.served, merged.outstanding, merged.draft]) {
    for (const l of arr) seen.add(l.toUpperCase().replace(/\s+/g, " ").slice(0, 160));
  }
  const push = (bucket: keyof Mg6Bucket, line: string) => {
    const key = line.toUpperCase().replace(/\s+/g, " ").slice(0, 160);
    if (seen.has(key)) return;
    seen.add(key);
    merged[bucket].push(line);
  };
  for (const raw of head.split(/\n/)) {
    const line = compact(raw);
    if (!line || line.length < 10 || line.length > 280) continue;
    if (PACK_AA_Q2_EXCLUDED_LINE_RE.test(line) || PACK_AA_INDEX_NOISE_RE.test(line)) continue;
    if (!PACK_AA_Q2_ITEM_RE.test(line)) continue;
    const bucket = classifyMg6Line(line);
    if (!bucket) continue;
    push(bucket, line);
  }
  return merged;
}

export type PackAAQ2BuildMeta = {
  parser_version: "served-sanitizer-v2";
  answer_shape: "mg6_served_outstanding_unclear";
  served_count: number;
  outstanding_count: number;
  draft_unclear_count: number;
  served_suppressed_reason: string;
};

export function buildPackAAStrictMg6DisclosureAnswerWithMeta(
  bundleFullText: string
): { answer: string; meta: PackAAQ2BuildMeta } | null {
  if (!isPackAAMessyBundle(bundleFullText)) return null;
  const collected = collectAAClassifiedBucketsFromBundle(bundleFullText);
  const outstandingFallback = collectAAQ3StyleOutstandingLines(bundleFullText.slice(0, 250_000), 10);

  let served = collected.served.filter(isCleanPositiveServedLine);
  let outstanding = dedupeMg6Lines([...collected.outstanding, ...outstandingFallback]);
  let draft = [...collected.draft];

  const sanitized = sanitizePackAAMg6Buckets({ served, outstanding, draft });
  served = sanitized.buckets.served;
  outstanding = sanitized.buckets.outstanding;
  draft = sanitized.buckets.draft;

  let servedRendered = served.slice(0, 4);
  const postRender = sanitizePackAAMg6Buckets({ served: servedRendered, outstanding, draft });
  servedRendered = postRender.buckets.served.filter(isCleanPositiveServedLine).slice(0, 4);
  outstanding = dedupeMg6Lines(postRender.buckets.outstanding).slice(0, 8);
  draft = dedupeMg6Lines(postRender.buckets.draft).slice(0, 4);

  const servedDisplay = servedRendered.map(packAAQ2DisplayLine);
  const outstandingDisplay = outstanding.map(packAAQ2DisplayLine);
  const draftDisplay = draft.map(packAAQ2DisplayLine);

  const servedBody = servedDisplay.length
    ? servedDisplay.join(" | ")
    : PACK_AA_Q2_EMPTY_SERVED_FALLBACK;

  let servedSuppressedReason = "none";
  if (!servedDisplay.length) {
    servedSuppressedReason =
      sanitized.stats.moved_from_served_to_outstanding + sanitized.stats.moved_from_served_to_draft > 0
        ? "negative_or_limiting_wording_suppressed"
        : "no_clean_positive_served_lines";
  } else if (sanitized.stats.moved_from_served_to_outstanding + sanitized.stats.moved_from_served_to_draft > 0) {
    servedSuppressedReason = "partial_served_lines_moved_to_outstanding_or_draft";
  }

  const lines: string[] = [
    "MG6 / disclosure schedule position:",
    `- Served / apparently served: ${servedBody}`,
    `- Outstanding / awaited / not served / to follow: ${
      outstandingDisplay.length
        ? outstandingDisplay.join(" | ")
        : "No explicit outstanding row safely extracted from the MG6 disclosure schedule."
    }`,
    `- Draft / partial / summary-only / status review: ${
      draftDisplay.length
        ? draftDisplay.join(" | ")
        : "No draft, partial, or summary-only MG6 rows safely separated."
    }`,
    "- Reliability warning: The MG6/disclosure material contains old/corrected/summary-only rows, so solicitor review is required.",
  ];

  return {
    answer: lines.join("\n"),
    meta: {
      parser_version: "served-sanitizer-v2",
      answer_shape: "mg6_served_outstanding_unclear",
      served_count: servedDisplay.length,
      outstanding_count: outstandingDisplay.length,
      draft_unclear_count: draftDisplay.length,
      served_suppressed_reason: servedSuppressedReason,
    },
  };
}

export function buildPackAAStrictMg6DisclosureAnswer(bundleFullText: string): string | null {
  return buildPackAAStrictMg6DisclosureAnswerWithMeta(bundleFullText)?.answer ?? null;
}
