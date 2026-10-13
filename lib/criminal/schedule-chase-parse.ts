/**
 * Pure schedule-row parser (no Node fs/python). Safe for shared server/client imports.
 * Column PDF reading stays in schedule-chase-column-reader (server-only).
 */
const STATUS_WORD =
  "not yet served|not yet available|listed not served|listed not enclosed|listed - outstanding|not served|outstanding|requested|awaited|to follow|served";
const STATUS_RE = new RegExp(`^(${STATUS_WORD})\\b\\s*(.*)$`, "i");
const EMBEDDED_STATUS_RE = new RegExp(`^(.*?)\\s+(${STATUS_WORD})\\b\\s*(.*)$`, "i");
const NOT_IN_COPY_RE = /document not in this copy|not in this copy|not in this bundle/i;
const REF_ITEM_RE = /^(MG6C?\/\d+|[SO]\d+|U\d+)\s+(.+)$/i;
const REF_ONLY_RE = /^(M\d+)$/i;
const UPDATE_RE =
  /\b(now served|since served|subsequently served|supersedes|this replaces|amended schedule|updated to served|now outstanding)\b/i;
const SERVED_CONTRADICTION_RE =
  /\b(no exhibit page|not attached|not present|not included|not in (?:the |this )?bundle)\b/i;

type Side = "served" | "missing";

type ParsedRow = {
  page: number;
  reference: string;
  item: string;
  statusWord: string;
  side: Side;
  line: string;
  selfConflict: string | null;
  absentFromCopy: string | null;
};

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parts(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = compact(phrase);
  if (needle.length < 3) return false;
  return compact(haystack).includes(needle);
}

function tokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function tightestExtra(page: string, phrase: string): number | null {
  const pageTokens = tokens(page);
  const need = tokens(phrase);
  if (need.length < 2) return null;
  let best: number | null = null;
  for (let start = 0; start < pageTokens.length; start += 1) {
    if (pageTokens[start] !== need[0]) continue;
    let cursor = 1;
    let end = start;
    for (let index = start + 1; index < pageTokens.length && cursor < need.length; index += 1) {
      if (index - start > need.length + 8) break;
      if (pageTokens[index] === need[cursor]) {
        cursor += 1;
        end = index;
      }
    }
    if (cursor !== need.length) continue;
    const extra = end - start + 1 - need.length;
    if (best === null || extra < best) best = extra;
    if (best === 0) return 0;
  }
  return best;
}

function sideFor(statusWord: string): Side {
  return statusWord.toLowerCase() === "served" ? "served" : "missing";
}

function absentFromCopyNote(note: string): string | null {
  return NOT_IN_COPY_RE.test(note) ? note.trim() : null;
}

function factsForStatus(statusWord: string, note: string): Pick<ParsedRow, "statusWord" | "side" | "selfConflict" | "absentFromCopy"> {
  const word = statusWord.toLowerCase();
  const served = sideFor(word) === "served";
  const absentFromCopy = served ? absentFromCopyNote(note) : null;
  const selfConflict = served && absentFromCopy === null && SERVED_CONTRADICTION_RE.test(note) ? note.trim() : null;
  return { statusWord: word, side: served ? "served" : "missing", selfConflict, absentFromCopy };
}

function factsForYesNo(answer: string, note: string): Pick<ParsedRow, "statusWord" | "side" | "selfConflict" | "absentFromCopy"> {
  const served = answer.toLowerCase() === "yes";
  const absentFromCopy = served ? absentFromCopyNote(note) : null;
  const selfConflict = served && absentFromCopy === null && SERVED_CONTRADICTION_RE.test(note) ? note.trim() : null;
  return {
    statusWord: served ? "served" : "outstanding",
    side: served ? "served" : "missing",
    selfConflict,
    absentFromCopy,
  };
}

/** Material | Status cells such as `Yes - served` or `Yes - not in this copy`. */
function factsForYesDash(note: string): Pick<ParsedRow, "statusWord" | "side" | "selfConflict" | "absentFromCopy"> {
  const trimmed = note.trim();
  const absentFromCopy = absentFromCopyNote(trimmed);
  if (absentFromCopy) {
    return { statusWord: "served", side: "served", selfConflict: null, absentFromCopy };
  }
  return { statusWord: "served", side: "served", selfConflict: null, absentFromCopy: null };
}

const LONGER_COPY = /^(complete|full|final|corrected|signed|master)$/;

function chasedTheServedItem(label: string, servedPart: string): boolean {
  const missing = compact(label);
  const servedName = compact(servedPart);
  if (missing.length >= servedName.length && missing.includes(servedName)) {
    const leftover = missing.replace(servedName, "");
    if (LONGER_COPY.test(leftover)) return false;
  }
  return containsPhrase(label, servedPart) || containsPhrase(servedPart, label);
}

function itemKey(value: string): string {
  return compact(value).replace(/outstanding|requested|served|missing|awaited/g, "");
}

function sameItem(left: string, right: string): boolean {
  const a = itemKey(left);
  const b = itemKey(right);
  if (a.length < 6 || b.length < 6) return false;
  return a.includes(b) || b.includes(a);
}

export function parseSchedule(pages: string[]): { rows: ParsedRow[]; later: Array<Record<string, unknown>>; updates: Array<Record<string, unknown>>; scheduleHeadingSeen: boolean } {
  const rows: ParsedRow[] = [];
  const updateRows: ParsedRow[] = [];
  const candidates: Array<{ page: number; item: string; statusWord: string; line: string }> = [];
  let numberedSchedule: "" | "schedule" | "update" = "";
  let yesNoTable = false;
  let materialStatusTable = false;
  let scheduleHeadingSeen = false;
  pages.forEach((page, index) => {
    for (const line of page.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^MG6 DISCLOSURE SCHEDULE$/i.test(trimmed)) {
        numberedSchedule = "schedule";
        scheduleHeadingSeen = true;
        materialStatusTable = false;
        continue;
      }
      if (/^DISCLOSURE\s+SCHEDULE\b/i.test(trimmed) || /^DISCLOSURE\s*\|\s*SCHEDULE\b/i.test(trimmed)) {
        scheduleHeadingSeen = true;
        materialStatusTable = false;
        continue;
      }
      if (/^MG6C\s*\/\s*DISCLOSURE\s*\|\s*UPDATE$/i.test(trimmed)) {
        numberedSchedule = "update";
        materialStatusTable = false;
        continue;
      }
      if (/^item description\s+\|\s+served notes$/i.test(trimmed)) {
        yesNoTable = true;
        continue;
      }
      if (/^material\s*\|\s*status$/i.test(trimmed) || /^material\s+status$/i.test(trimmed)) {
        materialStatusTable = true;
        continue;
      }
      if (yesNoTable) {
        const yesNoRow = trimmed.match(/^(\d+)\s+\S.*\s+\|\s+(yes|no)\b/i);
        if (!yesNoRow) yesNoTable = false;
      }
      if (numberedSchedule) {
        const table = trimmed.match(/^(.+?)\s+\|\s+(.+)$/);
        const tableLeft = table?.[1]?.trim() ?? "";
        const tableRight = table?.[2]?.trim() ?? "";
        const header = /^item description$/i.test(tableLeft) && /^status note$/i.test(tableRight);
        const statusRow = /^\d+\s+\S/.test(tableLeft) && STATUS_RE.test(tableRight);
        if (!header && !statusRow) numberedSchedule = "";
      }
      const pipe = line.match(/^(.+?)\s+\|\s+(.+)$/);
      if (!pipe) {
        if (materialStatusTable && !/^material\s+status$/i.test(trimmed)) materialStatusTable = false;
        continue;
      }
      const left = pipe[1].trim();
      const right = pipe[2].trim();
      if (materialStatusTable) {
        if (/^test bundle\b/i.test(left) || /^page\b/i.test(left)) {
          materialStatusTable = false;
          continue;
        }
        const yesDash = right.match(/^yes\s*[-–—:]\s*(.+)$/i);
        if (yesDash) {
          rows.push({
            page: index + 1,
            reference: "",
            item: left,
            line,
            ...factsForYesDash(yesDash[1]),
          });
          continue;
        }
        const status = right.match(STATUS_RE);
        if (status) {
          rows.push({
            page: index + 1,
            reference: "",
            item: left,
            line,
            ...factsForStatus(status[1], status[2] ?? ""),
          });
          continue;
        }
        materialStatusTable = false;
      }
      const refItem = left.match(REF_ITEM_RE);
      const refOnly = left.match(REF_ONLY_RE);
      if (refItem) {
        const status = right.match(STATUS_RE);
        if (!status) continue;
        const note = status[2] ?? "";
        rows.push({
          page: index + 1,
          reference: refItem[1].toUpperCase(),
          item: refItem[2].trim(),
          line,
          ...factsForStatus(status[1], note),
        });
        continue;
      }
      if (refOnly) {
        const embedded = right.match(EMBEDDED_STATUS_RE);
        if (!embedded || !embedded[1].trim()) continue;
        const note = embedded[3] ?? "";
        rows.push({
          page: index + 1,
          reference: refOnly[1].toUpperCase(),
          item: embedded[1].trim(),
          line,
          ...factsForStatus(embedded[2], note),
        });
        continue;
      }
      const numbered = left.match(/^(\d+)\s+(.+)$/);
      const yesNo = right.match(/^(yes|no)\b\s*(.*)$/i);
      if (numbered && yesNo && yesNoTable && !/^(item description|served notes)$/i.test(left)) {
        const note = yesNo[2] ?? "";
        rows.push({
          page: index + 1,
          reference: numbered[1],
          item: numbered[2].trim(),
          line,
          ...factsForYesNo(yesNo[1], note),
        });
        continue;
      }
      const statusNote = right.match(STATUS_RE);
      if (numbered && statusNote && !/^(item description|status note|served notes)$/i.test(left)) {
        const note = statusNote[2] ?? "";
        const facts = factsForStatus(statusNote[1], note);
        const entry = {
          page: index + 1,
          reference: numbered[1],
          item: numbered[2].trim(),
          line,
          ...facts,
        };
        if (numberedSchedule === "schedule") {
          rows.push(entry);
          continue;
        }
        if (numberedSchedule === "update") {
          updateRows.push(entry);
          continue;
        }
      }
      const dRef = left.match(/^(D\d+)\s+(.+)$/i);
      const dStatus = right.match(STATUS_RE);
      if (dRef && dStatus) {
        const note = dStatus[2] ?? "";
        rows.push({
          page: index + 1,
          reference: dRef[1].toUpperCase(),
          item: dRef[2].trim(),
          line,
          ...factsForStatus(dStatus[1], note),
        });
        continue;
      }
      const mRef = left.match(/^(M\d+)\s+(.+)$/i);
      const mStatus = right.match(STATUS_RE);
      if (mRef && mStatus && !/^(item description|status notes?)$/i.test(left)) {
        const note = mStatus[2] ?? "";
        rows.push({
          page: index + 1,
          reference: mRef[1].toUpperCase(),
          item: mRef[2].trim(),
          line,
          ...factsForStatus(mStatus[1], note),
        });
        continue;
      }
      const dGlue = left.match(/^(D\d+)\s+(.+)\s+(not yet served|not served|outstanding|served)$/i);
      if (dGlue && !STATUS_RE.test(right)) {
        const statusWord = dGlue[3].toLowerCase();
        const served = statusWord === "served";
        rows.push({
          page: index + 1,
          reference: dGlue[1].toUpperCase(),
          item: dGlue[2].trim(),
          statusWord,
          side: served ? "served" : "missing",
          line,
          selfConflict: null,
          absentFromCopy: null,
        });
        continue;
      }
      const exhibit = left.match(/^(?:[A-Z]{1,5}\/\d+)\s+(.+)$/i);
      const exhibitStatus = right.match(/^(.+?)\s+(not yet served|not served|outstanding|served)$/i);
      if (exhibit && exhibitStatus) {
        const statusWord = exhibitStatus[2].toLowerCase() === "served" ? "served" : "outstanding";
        candidates.push({ page: index + 1, item: exhibit[1].trim(), statusWord, line });
        continue;
      }
      const status = right.match(STATUS_RE);
      if (!status) continue;
      if (/^(ref item|served material checked|the outstanding|outstanding|directions)/i.test(left)) continue;
      if (left.length > 80) continue;
      candidates.push({ page: index + 1, item: left, statusWord: status[1].toLowerCase(), line });
    }
  });

  for (const update of updateRows) {
    const hit = rows.find((row) => sameItem(row.item, update.item));
    if (!hit) {
      rows.push(update);
      continue;
    }
    candidates.push({ page: update.page, item: update.item, statusWord: update.statusWord, line: update.line });
  }

  const later: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  for (const candidate of candidates) {
    const hit = rows.find((row) => sameItem(row.item, candidate.item));
    if (!hit) {
      later.push({ ...candidate, relation: "different-item" });
      continue;
    }
    const update = UPDATE_RE.test(candidate.line);
    const changed = sideFor(candidate.statusWord) !== (hit.selfConflict ? "conflict" : hit.side);
    if (update && changed) {
      updates.push({ schedule: hit.line, later: candidate.line, page: candidate.page });
      hit.statusWord = candidate.statusWord;
      hit.side = sideFor(candidate.statusWord);
      hit.selfConflict = null;
      continue;
    }
    if (changed) {
      later.push({
        ...candidate,
        relation: "same-item-conflict",
        scheduleReference: hit.reference,
        scheduleStatus: hit.statusWord,
        scheduleLine: hit.line,
      });
      continue;
    }
    later.push({ ...candidate, relation: "same-item-confirms", scheduleReference: hit.reference });
  }
  return { rows, later, updates, scheduleHeadingSeen };
}
