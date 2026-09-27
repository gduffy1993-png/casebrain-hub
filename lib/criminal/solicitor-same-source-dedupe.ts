/**
 * Presentation collapse for solicitor chase cards.
 * Same source/ref/family + same practical ask → one card.
 * Distinct named MG6/exhibit rows stay distinct.
 */

export type PracticalChaseCard = {
  id: string;
  label: string;
  sourceScheduleRef?: string | null;
  mergedFrom: string[];
  evidenceAnchor?: string | null;
};

const REF_RE = /\b(MG6C?\/\d+|O\d{1,3}|U\d+|EX[-/][A-Z0-9-]+|TEL\/\d+|M\d{1,3})\b/i;

export function extractChaseNamedRef(item: PracticalChaseCard): string | null {
  const fromField = item.sourceScheduleRef?.trim();
  if (fromField) return fromField.replace(/\s+/g, "").toUpperCase();
  const hit = `${item.label} ${item.evidenceAnchor ?? ""}`.match(REF_RE);
  return hit?.[1] ? hit[1].replace(/\s+/g, "").toUpperCase() : null;
}

export type PracticalChaseAsk =
  | "subscriber"
  | "whatsapp_export"
  | "voice_note"
  | "phone_download"
  | "email_u5"
  | "interview"
  | "chat_device_export"
  | "cctv_continuity"
  | "ocr_visual_source"
  | null;

export function practicalChaseAsk(label: string): PracticalChaseAsk {
  const t = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (/\bu5\b/.test(t) || /\bemail from witness\b/.test(t)) return "email_u5";
  if (/\bwhatsapp\b/.test(t)) return "whatsapp_export";
  if (/\bvoice note\b/.test(t) && !/\boriginal download\b/.test(t)) return "voice_note";
  if (
    (/\bsubscriber\b/.test(t) || /\baccount data\b/.test(t) || /\bphone attribution report\b/.test(t)) &&
    !/\bdownload\b/.test(t) &&
    !/\bwhatsapp\b/.test(t)
  ) {
    return "subscriber";
  }
  if (
    /\bfull phone download\b/.test(t) ||
    /\bsource extraction\b/.test(t) ||
    (/\boriginal download\b/.test(t) && !/\bwhatsapp\b/.test(t))
  ) {
    return "phone_download";
  }
  if (/\binterview\b/.test(t) && /\b(recording|transcript)\b/.test(t)) return "interview";
  if (/\b(full chat export|device extraction|sender attribution)\b/.test(t)) return "chat_device_export";
  if (
    /\b(full[- ]resolution|uncropped)\b/.test(t) ||
    /\bcontinuity\/provenance\b/.test(t) ||
    /\bcontinuity\/provenance not yet\b/.test(t)
  ) {
    return "ocr_visual_source";
  }
  if (
    /\bcontinuity\b/.test(t) &&
    /\b(export log|statement|timing notes|final continuity|forensic continuity|continuity schedule|contamination notes)\b/.test(
      t,
    ) &&
    !/\bmaster footage\b/.test(t) &&
    !/\bstills and timing\b/.test(t)
  ) {
    return "cctv_continuity";
  }
  if (
    /export log and continuity statement/i.test(t) ||
    /^final continuity note$/i.test(t) ||
    /full footage, export logs, continuity statement/i.test(t)
  ) {
    return "cctv_continuity";
  }
  return null;
}

function interviewModality(label: string): "recording" | "transcript" | "both" | null {
  const rec = /\brecording\b/i.test(label);
  const tra = /\btranscript\b/i.test(label);
  if (rec && tra) return "both";
  if (rec) return "recording";
  if (tra) return "transcript";
  return null;
}

function interviewModalitiesCompatible(a: string, b: string): boolean {
  const left = interviewModality(a);
  const right = interviewModality(b);
  if (!left || !right) return true;
  if (left === "both" || right === "both") return left === right;
  return left === right;
}

function preferCard<T extends PracticalChaseCard>(a: T, b: T): T {
  const score = (item: T) => {
    let n = 0;
    if (extractChaseNamedRef(item)) n += 8;
    if (item.sourceScheduleRef?.trim()) n += 4;
    if (item.id.startsWith("ledger-material-")) n += 2;
    if (!/^full phone download\b/i.test(item.label)) n += 2;
    if (!/^further papers on the file$/i.test(item.label)) n += 1;
    if (item.label.length < 96 && !/\.$/.test(item.label.trim())) n += 1;
    return n;
  };
  return score(a) >= score(b) ? a : b;
}

function mergeCards<T extends PracticalChaseCard>(kept: T, dropped: T): T {
  const preferred = preferCard(kept, dropped);
  const other = preferred === kept ? dropped : kept;
  return {
    ...preferred,
    mergedFrom: [...new Set([...(preferred.mergedFrom ?? []), ...(other.mergedFrom ?? []), other.label])],
  };
}

/**
 * Collapse cards that ask for the same practical material from the same
 * unnamed source family. Distinct named MG6/exhibit refs never merge.
 */
export function collapseSamePracticalChaseCards<T extends PracticalChaseCard>(items: T[]): T[] {
  if (items.length <= 1) return items;
  const byKey = new Map<string, T>();

  for (const item of items) {
    const ask = practicalChaseAsk(item.label);
    const ref = extractChaseNamedRef(item);
    if (!ask) continue;
    const key = ref ? `${ask}#${ref}` : `fam:${ask}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeCards(existing, item) : item);
  }

  const redirect = new Map<string, string>();
  for (const [key, unref] of [...byKey.entries()]) {
    if (!key.startsWith("fam:")) continue;
    const ask = key.slice(4);
    const named = [...byKey.entries()].find(([k]) => k.startsWith(`${ask}#`));
    if (!named) continue;
    if (!interviewModalitiesCompatible(named[1].label, unref.label)) continue;
    byKey.set(named[0], mergeCards(named[1], unref));
    byKey.delete(key);
    redirect.set(key, named[0]);
  }

  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const ask = practicalChaseAsk(item.label);
    const ref = extractChaseNamedRef(item);
    if (!ask) {
      out.push(item);
      continue;
    }
    let key = ref ? `${ask}#${ref}` : `fam:${ask}`;
    key = redirect.get(key) ?? key;
    if (!byKey.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(byKey.get(key)!);
  }
  return out;
}
