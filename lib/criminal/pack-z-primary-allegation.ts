/**
 * Pack Z Q1 — CHARGE SHEET EXTRACT primary allegation parser (strict route only).
 * Used by defence-plan-chat and scripts/pack-z-primary-allegation.test.ts.
 */

function compactOneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function softTruncateChargeWording(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (sentenceEnd >= Math.floor(max * 0.6)) return slice.slice(0, sentenceEnd + 1).trim();
  const wordEnd = slice.lastIndexOf(" ");
  if (wordEnd >= Math.floor(max * 0.5)) return `${slice.slice(0, wordEnd).trim()}…`;
  return `${slice.trim()}…`;
}

export function isPackZLargeBundleStressBundle(bundleFullText: string): boolean {
  if (!bundleFullText) return false;
  return (
    /\bCB-Z-500\b/i.test(bundleFullText) ||
    /\bCB-Z-\d{4}-\d{3,4}\b/i.test(bundleFullText) ||
    /\bCB-Z\b/i.test(bundleFullText) ||
    /\b40\s*[x×]\s*500\b/i.test(bundleFullText) ||
    /\bPACK\s+Z\b/i.test(bundleFullText) ||
    /\bLARGE\s+CRIMINAL\s+BUNDLE\s+STRESS\b/i.test(bundleFullText)
  );
}

const PACK_Z_CHARGE_SHEET_PROSE_END_RE = /\n\s*Prosecution\s+wording\b/i;

const PACK_Z_PARTICULARS_STOP_INLINE_RE =
  /(?:\s*;\s*|\s+)(?:Prosecution\s+wording|Live\s+issues|No\s+expected\s+answers|Working\s+bundle|MG\s*5\b|MG\s*6\b|HEARING\s+NOTE|Route\s+pressure)\b/i;

export type PackZQ1ChargeOnlyReason =
  | "no_particulars_label_seen"
  | "particulars_label_seen_but_empty"
  | "stop_marker_too_early"
  | "block_missing";

export type PackZQ1ParseDebug = {
  chargeOnlyReason: PackZQ1ChargeOnlyReason | null;
  particularsSource: string | null;
  blockSource: "charge_sheet_extract" | "case_reference" | "scrape" | null;
};

function normalizePackZBundleText(bundleFullText: string): string {
  return bundleFullText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function packZBundleSearchHead(bundleFullText: string): string {
  return normalizePackZBundleText(bundleFullText).slice(0, 2_000_000);
}

function slicePackZChargeProseWindow(text: string, startIdx: number, maxLen = 10_000): string {
  const tail = text.slice(startIdx, startIdx + maxLen);
  const end = tail.search(PACK_Z_CHARGE_SHEET_PROSE_END_RE);
  return (end > 100 ? tail.slice(0, end) : tail).trim();
}

function extractPackZChargeSheetBlockA(head: string): string | null {
  const headingIdx = head.search(/\bCHARGE\s+SHEET\s+EXTRACT\b/i);
  if (headingIdx < 0) return null;
  const block = slicePackZChargeProseWindow(head, headingIdx);
  return block.length > 40 ? block : null;
}

function extractPackZChargeSheetBlockB(head: string): string | null {
  const refIdx = head.search(/\bCase\s+reference:\s*CB-Z[-\w\d]+/i);
  if (refIdx < 0) return null;
  const block = slicePackZChargeProseWindow(head, Math.max(0, refIdx - 120));
  return block.length > 40 ? block : null;
}

export function extractPackZChargeSheetExtractBlock(bundleFullText: string): string {
  const head = packZBundleSearchHead(bundleFullText);
  return extractPackZChargeSheetBlockA(head) ?? extractPackZChargeSheetBlockB(head) ?? "";
}

export function hasPackZChargeSheetExtract(bundleFullText: string): boolean {
  if (!isPackZLargeBundleStressBundle(bundleFullText)) return false;
  const block = extractPackZChargeSheetExtractBlock(bundleFullText);
  if (block && /\bDefendant\s*:/i.test(block) && /\bCharge\s*:/i.test(block)) return true;
  const head = packZBundleSearchHead(bundleFullText);
  return (
    /\bCHARGE\s+SHEET\s+EXTRACT\b/i.test(head) &&
    /\bDefendant\s*:/i.test(head) &&
    /\bCharge\s*:/i.test(head)
  );
}

function buildPackZChargeOnlySentence(defendant: string, charge: string): string {
  const chargeCore = charge.trim().endsWith(".") ? charge.trim() : `${charge.trim()}.`;
  return softTruncateChargeWording(`${defendant} is charged with ${chargeCore}`, 560);
}

function parsePackZChargeSheetLabel(block: string, label: string): string | null {
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im");
  const m = block.match(re);
  if (!m?.[1]) return null;
  return compactOneLine(m[1].replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
}

function stripPackZDefendantDob(defendant: string): string {
  return compactOneLine(
    defendant
      .replace(/\s+DOB\s+\d{1,2}[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4}\b.*$/i, "")
      .replace(/\s*\(fictional\)\.?/gi, "")
      .trim()
  );
}

function isPackZParticularsStopLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^\s*Prosecution\s+wording\b/i.test(t) ||
    /^\s*Live\s+issues\b/i.test(t) ||
    /^\s*No\s+expected\s+answers\b/i.test(t) ||
    /^\s*Working\s+bundle\b/i.test(t) ||
    /^\s*MG\s*5\b/i.test(t) ||
    /^\s*MG\s*6\b/i.test(t) ||
    /^\s*HEARING\s+NOTE\b/i.test(t) ||
    /^\s*Route\s+pressure\b/i.test(t) ||
    /^\s*(?:Case\s+reference|Defendant|Charge|Offence)\s*:/i.test(t)
  );
}

function trimPackZParticularsInlineStop(text: string): string {
  const cut = text.match(/^(.+?)(?:\s*;\s*|\s+)(?:Prosecution\s+wording|Live\s+issues|No\s+expected\s+answers|Working\s+bundle|MG\s*5\b|MG\s*6\b|HEARING\s+NOTE|Route\s+pressure)\b/i);
  return compactOneLine((cut?.[1] ?? text).trim());
}

export function extractPackZParticularsText(rawSlice: string): string | null {
  const idx = rawSlice.search(/\bParticulars(?:\s+of\s+offence)?\s*:/i);
  if (idx < 0) return null;
  const afterLabel = rawSlice.slice(idx).replace(/^\s*Particulars(?:\s+of\s+offence)?\s*:\s*/i, "");

  const lines = afterLabel.split(/\n/);
  const parts: string[] = [];
  const first = lines[0]?.trim() ?? "";
  if (first) parts.push(first);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    if (isPackZParticularsStopLine(line)) break;
    parts.push(line);
  }

  let joined = compactOneLine(parts.join(" "));
  if (PACK_Z_PARTICULARS_STOP_INLINE_RE.test(joined)) {
    joined = trimPackZParticularsInlineStop(joined);
  }
  return joined.length >= 12 ? joined : null;
}

function extractPackZParticularsMultiline(block: string): string | null {
  const m = block.match(
    /\bParticulars(?:\s+of\s+offence)?\s*:\s*([\s\S]*?)(?=(?:\r?\n\s*)?(?:Prosecution\s+wording|Live\s+issues|No\s+expected\s+answers|Working\s+bundle|MG\s*5\b|MG\s*6\b|HEARING\s+NOTE|Route\s+pressure)\b|$)/i
  );
  if (!m?.[1]) return null;
  const joined = trimPackZParticularsInlineStop(
    m[1]
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !isPackZParticularsStopLine(l))
      .join(" ")
  );
  return joined.length >= 12 ? joined : null;
}

function extractPackZParticularsFromBlock(block: string): string | null {
  return extractPackZParticularsText(block) ?? extractPackZParticularsMultiline(block);
}

function extractPackZParticularsWindowC(head: string): string | null {
  const partIdx = head.search(/\bParticulars(?:\s+of\s+offence)?\s*:/i);
  if (partIdx < 0) return null;
  const slice = head.slice(Math.max(0, partIdx - 400), partIdx + 3500);
  return extractPackZParticularsText(slice) ?? extractPackZParticularsMultiline(slice);
}

function packZParticularsLabelNearChargeBlock(head: string): boolean {
  if (!/\bParticulars(?:\s+of\s+offence)?\s*:/i.test(head)) return false;
  const cbzIdx = head.search(/\bCB-Z[-\w\d]+/i);
  const partIdx = head.search(/\bParticulars(?:\s+of\s+offence)?\s*:/i);
  if (cbzIdx < 0) return true;
  if (partIdx < 0) return false;
  if (Math.abs(partIdx - cbzIdx) <= 20_000) return true;
  const lo = Math.min(cbzIdx, partIdx);
  const hi = Math.max(cbzIdx, partIdx);
  return /\bCHARGE\s+SHEET\s+EXTRACT\b/i.test(head.slice(lo, hi + 500));
}

function resolvePackZParticulars(
  head: string,
  blocks: { source: string; text: string }[]
): { text: string | null; source: string | null; reason: PackZQ1ChargeOnlyReason | null } {
  if (!/\bParticulars(?:\s+of\s+offence)?\s*:/i.test(head)) {
    return { text: null, source: null, reason: "no_particulars_label_seen" };
  }

  for (const block of blocks) {
    const fromBlock = extractPackZParticularsFromBlock(block.text);
    if (fromBlock) return { text: fromBlock, source: block.source, reason: null };
  }

  const fromWindow = extractPackZParticularsWindowC(head);
  if (fromWindow) return { text: fromWindow, source: "particulars_window", reason: null };

  const cbzIdx = head.search(/\bCase\s+reference:\s*CB-Z/i);
  if (cbzIdx >= 0) {
    const nearCbz = extractPackZParticularsText(head.slice(cbzIdx, cbzIdx + 12_000));
    if (nearCbz) return { text: nearCbz, source: "case_reference_window", reason: null };
  }

  const fromScan = extractPackZParticularsText(head.slice(0, 500_000));
  if (fromScan) return { text: fromScan, source: "bundle_scan", reason: null };

  return { text: null, source: null, reason: "particulars_label_seen_but_empty" };
}

function formatPackZParticularsClause(particulars: string): string {
  const p = particulars.trim().replace(/[.;]+$/, "");
  if (!p) return "";
  if (/^particulars\s+state\s+that\b/i.test(p)) {
    return p.endsWith(".") ? p : `${p}.`;
  }
  if (/^on\b/i.test(p)) {
    return `particulars state that ${p}.`;
  }
  return `particulars state that ${p}.`;
}

function buildPackZSentence(defendant: string, charge: string, particulars: string | null): string {
  if (particulars && particulars.length >= 12) {
    const partClause = formatPackZParticularsClause(particulars);
    const chargeCore = charge.endsWith(".") ? charge.slice(0, -1) : charge;
    return softTruncateChargeWording(
      compactOneLine(`${defendant} is charged with ${chargeCore}; ${partClause}`),
      560
    );
  }
  return buildPackZChargeOnlySentence(defendant, charge);
}

export function buildPackZPrimaryAllegationWithDebug(bundleFullText: string): {
  answer: string | null;
  debug: PackZQ1ParseDebug;
} {
  const emptyDebug: PackZQ1ParseDebug = {
    chargeOnlyReason: "block_missing",
    particularsSource: null,
    blockSource: null,
  };

  if (!isPackZLargeBundleStressBundle(bundleFullText)) {
    return { answer: null, debug: emptyDebug };
  }

  const head = packZBundleSearchHead(bundleFullText);
  const blockA = extractPackZChargeSheetBlockA(head);
  const blockB = extractPackZChargeSheetBlockB(head);
  const blockSource: PackZQ1ParseDebug["blockSource"] = blockA
    ? "charge_sheet_extract"
    : blockB
      ? "case_reference"
      : null;
  const block = blockA ?? blockB;

  const blockCandidates: { source: string; text: string }[] = [];
  if (blockA) blockCandidates.push({ source: "charge_sheet_extract", text: blockA });
  if (blockB && blockB !== blockA) blockCandidates.push({ source: "case_reference", text: blockB });

  const defendantRaw =
    (block && parsePackZChargeSheetLabel(block, "Defendant")) ??
    parsePackZChargeSheetLabel(head, "Defendant") ??
    head.match(/\bDefendant\s*:\s*([^\n]+)/i)?.[1] ??
    null;
  const charge =
    (block && parsePackZChargeSheetLabel(block, "Charge")) ??
    parsePackZChargeSheetLabel(head, "Charge") ??
    head.match(/\bCharge\s*:\s*([^\n]+)/i)?.[1] ??
    null;

  if (!defendantRaw || !charge) {
    return { answer: null, debug: { ...emptyDebug, blockSource } };
  }

  const defendant = stripPackZDefendantDob(compactOneLine(defendantRaw));
  if (!defendant || defendant.length < 3) {
    return { answer: null, debug: { ...emptyDebug, blockSource } };
  }

  const { text: particulars, source: particularsSource, reason } = resolvePackZParticulars(head, blockCandidates);

  if (particulars && particulars.length >= 12) {
    return {
      answer: buildPackZSentence(defendant, compactOneLine(charge), particulars),
      debug: { chargeOnlyReason: null, particularsSource, blockSource },
    };
  }

  if (packZParticularsLabelNearChargeBlock(head)) {
    const emergency =
      extractPackZParticularsWindowC(head) ?? extractPackZParticularsText(head.slice(0, 500_000));
    if (emergency) {
      return {
        answer: buildPackZSentence(defendant, compactOneLine(charge), emergency),
        debug: { chargeOnlyReason: null, particularsSource: "emergency_scan", blockSource },
      };
    }
    return {
      answer: buildPackZChargeOnlySentence(defendant, compactOneLine(charge)),
      debug: {
        chargeOnlyReason: reason ?? "particulars_label_seen_but_empty",
        particularsSource: null,
        blockSource,
      },
    };
  }

  return {
    answer: buildPackZChargeOnlySentence(defendant, compactOneLine(charge)),
    debug: {
      chargeOnlyReason: reason ?? "no_particulars_label_seen",
      particularsSource: null,
      blockSource,
    },
  };
}

export function buildPackZStrictPrimaryAllegation(bundleFullText: string): string | null {
  if (!hasPackZChargeSheetExtract(bundleFullText)) return null;
  return buildPackZPrimaryAllegationWithDebug(bundleFullText).answer;
}

export function packZParsePrimaryAllegationForEval(bundleFullText: string): {
  answer: string | null;
  debug: PackZQ1ParseDebug;
} {
  if (!isPackZLargeBundleStressBundle(bundleFullText)) {
    return {
      answer: null,
      debug: { chargeOnlyReason: "block_missing", particularsSource: null, blockSource: null },
    };
  }
  return buildPackZPrimaryAllegationWithDebug(bundleFullText);
}
