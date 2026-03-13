/**
 * Witness timeline extractor – charge-agnostic for every criminal case.
 * Parses bundle text for source + event + time to surface timeline conflicts for cross-examination.
 */

export type TimelineEntry = {
  source: string;
  event: string;
  time?: string;
};

/** Match 24h or 12h time: 22:05, 9:30, 21.58, 22.05 */
const TIME_REGEX = /\b(\d{1,2})[.:](\d{2})\b/g;

/** Normalise time string for comparison (HH:MM). */
function normaliseTime(s: string): string {
  const m = s.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (!m) return s;
  const h = m[1].padStart(2, "0");
  const min = m[2];
  return `${h}:${min}`;
}

/**
 * Extract timeline entries from bundle text.
 * Looks for: "SOURCE says/said/states/stated/shows ... EVENT ... TIME" and "CCTV/BWV/999 shows ... TIME".
 * Works on any offence (arson, assault, theft, etc.).
 */
export function extractTimelineEntriesFromText(text: string): TimelineEntry[] {
  if (!text || typeof text !== "string" || text.length < 50) return [];

  const entries: TimelineEntry[] = [];
  const seen = new Set<string>();

  // Normalise: one line per sentence/clause for simpler matching
  const block = text.replace(/\s+/g, " ").trim();
  if (block.length > 50000) {
    // Avoid huge scans; use first portion that often contains key statements
    text = block.slice(0, 50000);
  } else {
    text = block;
  }

  // 1) Pattern: "NAME says/said/states/stated ... at HH:MM" or "... 22:05"
  const sayPattern = /\b([A-Z][A-Za-z\-']{1,24})\s+(?:says?|said|states?|stated|reports?|reported)\s+(?:that\s+)?([^.]*?)(?:\s+at\s+)?(\d{1,2}[.:]\d{2})|(\d{1,2}[.:]\d{2})[^.]*?(?:says?|said|states?|stated)\s+([^.]*?)\b/gi;
  let m: RegExpExecArray | null;
  sayPattern.lastIndex = 0;
  while ((m = sayPattern.exec(text)) !== null) {
    const time = (m[3] || m[4] || "").trim();
    const source = (m[1] || "").trim().toUpperCase();
    const eventPart = (m[2] || m[5] || "").trim();
    const event = eventPart.length > 60 ? eventPart.slice(0, 57) + "…" : eventPart || "stated";
    if (source && (time || event)) {
      const key = `${source}|${event.slice(0, 30)}|${time}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ source, event: event || "stated", time: time || undefined });
      }
    }
  }

  // 2) Pattern: "CCTV shows / BWV shows / 999 log ... TIME" or "CCTV ... defendant left 21:58"
  const cctvPattern = /\b(CCTV|BWV|999|CAD\s*log|body\s*worn)\s+(?:shows?|showed|records?|at)\s+([^.]*?)(\d{1,2}[.:]\d{2})|(\d{1,2}[.:]\d{2})[^.]*?\b(CCTV|BWV|999|CAD)\b/gi;
  cctvPattern.lastIndex = 0;
  while ((m = cctvPattern.exec(text)) !== null) {
    const time = (m[3] || m[4] || "").trim();
    const source = (m[1] || m[5] || "CCTV").trim();
    const srcNorm = source.replace(/\s+/g, " ").toUpperCase();
    const eventPart = (m[2] || "").trim();
    const event = eventPart.length > 50 ? eventPart.slice(0, 47) + "…" : eventPart || "recorded";
    if (time) {
      const key = `${srcNorm}|${event.slice(0, 25)}|${time}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({
          source: srcNorm,
          event: event || "recorded",
          time,
        });
      }
    }
  }

  // 3) Pattern: "fire started at 22:05", "flames visible 22:10", "left at 21:58" with preceding source (same sentence)
  const eventTimePattern = /\b([A-Z][A-Za-z\-']{1,24}|CCTV|BWV)\b[^.]*?(?:fire\s+started|flames?\s+visible|left|arrived|saw|heard)[^.]*?(\d{1,2}[.:]\d{2})/gi;
  eventTimePattern.lastIndex = 0;
  while ((m = eventTimePattern.exec(text)) !== null) {
    const source = (m[1] || "").trim().toUpperCase();
    const time = (m[2] || "").trim();
    const snippet = text.slice(Math.max(0, m.index - 20), m.index + m[0].length);
    let event = "event";
    if (/fire\s+started/i.test(snippet)) event = "fire started";
    else if (/flames?\s+visible/i.test(snippet)) event = "flames visible";
    else if (/\bleft\b/i.test(snippet)) event = "left";
    else if (/\barrived\b/i.test(snippet)) event = "arrived";
    else if (/\bsaw\b/i.test(snippet)) event = "saw";
    else if (/\bheard\b/i.test(snippet)) event = "heard";
    const key = `${source}|${event}|${time}`;
    if (!seen.has(key) && source && time) {
      seen.add(key);
      entries.push({ source, event, time });
    }
  }

  return entries.slice(0, 20);
}

/**
 * Build display lines for witness timeline conflicts: "SOURCE says EVENT TIME" / "CCTV shows EVENT TIME".
 * When 2+ entries relate to the same type of event (e.g. fire / leaving / arrival), show them together for contrast.
 */
export function formatTimelineConflictLines(entries: TimelineEntry[]): string[] {
  if (!entries || entries.length === 0) return [];

  const lines: string[] = [];
  for (const e of entries) {
    const timePart = e.time ? ` ${e.time}` : "";
    const verb = /CCTV|BWV|999|CAD/i.test(e.source) ? "shows" : "says";
    lines.push(`${e.source} ${verb} ${e.event}${timePart}`);
  }
  return lines;
}
