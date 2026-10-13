/**
 * Copy-only parser repair. Not a lesson and not a model call.
 * Schedule rows are read from their own reference, item, and explicit status cell.
 * S/O rows stay valid. MG6/nn, S0n, U0n, and M-rows are read the same way.
 * A later page does not replace the schedule. The same item with another status
 * is a conflict unless that later line says the item was updated.
 * The twenty in READER-FAMILY-EXAM.json are regression cases.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const DOWNLOADS = "C:/Users/gduff/Downloads";
const EXAM = path.join(ROOT, "artifacts/casebrain-qa/assurance/pattern-brain-v2/READER-FAMILY-EXAM.json");
const BASELINE = path.join(ROOT, "artifacts/casebrain-qa/assurance/pattern-brain-v2/READER-BASELINE-DISCLOSURE.json");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/pattern-brain-v2/READER-SCHEDULE-PARSER-REPAIR.json");
const FROZEN = [
  "artifacts/casebrain-qa/assurance/pattern-brain-v2/store/pattern-brain-v2-store.json",
  "artifacts/casebrain-qa/assurance/pattern-brain-v1/store/pattern-brain-store.json",
  "artifacts/casebrain-qa/assurance/identity-lesson-v1/store/identity-lesson-store.json",
  "artifacts/casebrain-qa/assurance/pattern-brain-v1/store/locator-candidate-store.json",
];
const SKIP_FOLDERS = new Set([
  "cb-tb-001-050-v3",
  "cb-tb-501-600-v5-extract",
  "cb-tb-901-1100-v5",
  "cb-tb-1101-1400-v5",
  "cb-tb-1401-1500-v5-tmp",
  "cb-tb-1601-1700-v5-chaos",
]);
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

type Tracker = { ref: string; pdf: string; pdfPath: string; offence: string; served: string; missing: string };

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function frozenHashes(): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const relative of FROZEN) hashes[relative] = sha256(path.join(ROOT, relative));
  return hashes;
}

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

export function columnPages(pdfPath: string): string[] {
  const script = path.join(ROOT, "scripts/pattern-brain-reader-pages.py");
  return JSON.parse(
    execFileSync("python", [script, pdfPath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }),
  ) as string[];
}

function locate(refs: Set<string>): Map<string, string> {
  const found = new Map<string, string>();
  for (const folder of fs.readdirSync(DOWNLOADS)) {
    if (!folder.startsWith("cb-tb-") || SKIP_FOLDERS.has(folder)) continue;
    const pdfDir = path.join(DOWNLOADS, folder, "pdfs");
    if (!fs.existsSync(pdfDir)) continue;
    for (const name of fs.readdirSync(pdfDir)) {
      const match = name.match(/^(CB-TB-\d+)/i);
      const ref = match?.[1]?.toUpperCase();
      if (!ref || !refs.has(ref) || found.has(ref)) continue;
      found.set(ref, path.join(pdfDir, name));
    }
  }
  return found;
}

function loadTrackers(refs: Set<string>): Map<string, Tracker> {
  const found = new Map<string, Tracker>();
  for (const folder of fs.readdirSync(DOWNLOADS)) {
    if (!folder.startsWith("cb-tb-") || SKIP_FOLDERS.has(folder)) continue;
    const base = path.join(DOWNLOADS, folder);
    if (!fs.statSync(base).isDirectory()) continue;
    const trackers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/tracker/i.test(entry.name) && entry.name.endsWith(".csv") && !/banned/i.test(entry.name)) trackers.push(full);
      }
    };
    walk(base);
    if (!trackers.length) continue;
    const file = trackers.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const rows: string[][] = [];
    let cell = "";
    let row: string[] = [];
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (quoted && char === '"' && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (!quoted && char === ",") {
        row.push(cell);
        cell = "";
        continue;
      }
      if (!quoted && (char === "\n" || char === "\r")) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value.length)) rows.push(row);
        row = [];
        cell = "";
        continue;
      }
      cell += char;
    }
    if (cell.length || row.length) {
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
    }
    const header = rows[0] ?? [];
    for (const values of rows.slice(1)) {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = values[index] ?? "";
      });
      const ref = record.ref?.trim().toUpperCase();
      const pdfName = record.pdf_filename?.trim();
      if (!ref || !pdfName || !refs.has(ref) || found.has(ref)) continue;
      const pdfPath = path.join(base, "pdfs", pdfName);
      if (!fs.existsSync(pdfPath)) continue;
      found.set(ref, {
        ref,
        pdf: pdfName,
        pdfPath,
        offence: record.correct_offence_wording ?? "",
        served: record.served_material ?? "",
        missing: record.missing_material ?? "",
      });
    }
    if (found.size === refs.size) break;
  }
  return found;
}

function oldSoRows(pages: string[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  pages.forEach((page, index) => {
    for (const line of page.split("\n")) {
      const match = line.match(/^([SO]\d+)\s+(.+?)\s+\|\s+(Served|Outstanding|Requested)\b/i);
      if (!match) continue;
      const reference = match[1].toUpperCase();
      const statusWord = match[3].toLowerCase();
      const served = statusWord === "served";
      if (reference.startsWith("S") && !served) continue;
      if (reference.startsWith("O") && served) continue;
      rows.push({
        page: index + 1,
        reference,
        item: match[2].trim(),
        statusWord,
        side: served ? "served" : "missing",
        line,
        selfConflict: null,
        absentFromCopy: null,
      });
    }
  });
  return rows;
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

function matched(expected: string[], labels: string[]): string[] {
  return expected.filter((part) => labels.some((label) => containsPhrase(label, part) || containsPhrase(part, label)));
}

export function scoreRows(tracker: Tracker, rows: ParsedRow[]) {
  const published = rows.filter((row) => !row.selfConflict);
  const servedLabels = published.filter((row) => row.side === "served").map((row) => row.item);
  const missingLabels = published.filter((row) => row.side === "missing").map((row) => row.item);
  const servedExpected = parts(tracker.served);
  const missingExpected = parts(tracker.missing);
  const servedFound = matched(servedExpected, servedLabels);
  const missingFound = matched(missingExpected, missingLabels);
  const wrongChases = missingLabels.filter((label) => {
    const servedHits = servedExpected.filter((part) => chasedTheServedItem(label, part));
    if (!servedHits.length) return false;
    const labelKey = compact(label);
    const longestServed = servedHits.reduce((max, part) => Math.max(max, compact(part).length), 0);
    const sheetAsksForThis = missingExpected.some((part) => {
      const partKey = compact(part);
      if (partKey.length < 3) return false;
      if (partKey === labelKey) return true;
      return labelKey.includes(partKey) && partKey.length > longestServed;
    });
    return !sheetAsksForThis;
  });
  const missingGaps = missingExpected.filter((part) => !missingFound.includes(part));
  const extraChases = missingLabels.filter(
    (label) =>
      !missingExpected.some((part) => containsPhrase(label, part) || containsPhrase(part, label)) &&
      !servedExpected.some((part) => containsPhrase(label, part) || containsPhrase(part, label)),
  );
  return {
    servedExpected,
    missingExpected,
    servedFound,
    missingFound,
    wrongChases,
    missingGaps,
    extraChases,
    selfConflicts: rows.filter((row) => row.selfConflict).map((row) => ({ reference: row.reference, line: row.line, note: row.selfConflict })),
    sheetMatched: missingGaps.length === 0 && wrongChases.length === 0,
  };
}

export function offenceDiagnosis(
  tracker: Tracker,
  pages: string,
  proposal: { text?: string; quote?: string } | undefined,
) {
  const text = proposal?.text ?? "";
  const quote = proposal?.quote ?? "";
  const textExtra = text ? tightestExtra(pages, text) : null;
  const quoteExtra = quote ? tightestExtra(pages, quote) : null;
  const sheetExtra = tightestExtra(pages, tracker.offence);
  const quoteHasSheet = Boolean(quote) && (containsPhrase(quote, tracker.offence) || containsPhrase(tracker.offence, quote));
  const pageLine =
    pages
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && tightestExtra(line, tracker.offence) !== null) ?? null;
  let diagnosis: string;
  if (!text && !quote) {
    diagnosis = pageLine
      ? "The reader returned no offence and no quote. The sheet offence is on the page."
      : "The reader returned no offence and no quote. The sheet offence was not found as a line on the page.";
  } else if (text === tracker.offence) {
    diagnosis = "The offence text matches the sheet.";
  } else if (quoteHasSheet && quoteExtra !== null) {
    diagnosis =
      "The text field is a short label from the bundle, not the charge. The quote contains the sheet offence and those words are on the page. The scored output was the short label, so it did not count.";
  } else if (quoteHasSheet) {
    diagnosis =
      "The quote contains the sheet offence, but that quote is not a continuous line on the page. The text field is a short label and was the scored output.";
  } else {
    diagnosis =
      "The text field does not match the sheet offence. The quote does not contain the sheet offence either.";
  }
  return {
    trackerOffence: tracker.offence,
    readerText: text,
    readerQuote: quote,
    textOnPage: textExtra !== null,
    quoteOnPage: quoteExtra !== null,
    sheetOffenceOnPage: sheetExtra !== null,
    quoteHasSheet,
    pageLine,
    diagnosis,
  };
}

function main() {
  const beforeHashes = frozenHashes();
  const exam = JSON.parse(fs.readFileSync(EXAM, "utf8")) as {
    summary: { scheduleClean: number; offenceOnPage: number; court: number; hearing: number };
    cases: Array<{
      ref: string;
      proposal?: { offence?: { text?: string; quote?: string } };
      score: { offenceOnPage: boolean; scheduleClean: boolean };
    }>;
  };
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8")) as { cases: Array<{ ref: string }> };
  const regressionRefs = exam.cases.map((row) => row.ref);
  const preservationRefs = baseline.cases.map((row) => row.ref);
  const trackers = loadTrackers(new Set([...regressionRefs, ...preservationRefs]));
  const pdfs = locate(new Set([...regressionRefs, ...preservationRefs]));

  const scoreSet = (refs: string[], kind: "regression" | "preservation") =>
    refs.map((ref) => {
      const tracker = trackers.get(ref);
      const pdfPath = pdfs.get(ref) ?? tracker?.pdfPath;
      if (!tracker || !pdfPath) throw new Error(`Missing tracker or PDF for ${ref}.`);
      const pages = columnPages(pdfPath);
      const pageText = pages.map((page, index) => `\n\n--- page ${index + 1} ---\n${page}`).join("");
      const beforeRows = oldSoRows(pages);
      const parsed = parseSchedule(pages);
      const before = scoreRows(tracker, beforeRows);
      const after = scoreRows(tracker, parsed.rows);
      const examCase = exam.cases.find((row) => row.ref === ref);
      return {
        ref,
        pdf: tracker.pdf,
        kind,
        before: {
          rowCount: beforeRows.length,
          wrongChases: before.wrongChases,
          missingGaps: before.missingGaps,
          extraChases: before.extraChases,
          sheetMatched: before.sheetMatched,
        },
        after: {
          ...after,
          rowCount: parsed.rows.length,
          rows: parsed.rows.map((row) => ({
            page: row.page,
            reference: row.reference,
            item: row.item,
            statusWord: row.statusWord,
            side: row.side,
            quote: row.line,
            selfConflict: row.selfConflict,
            absentFromCopy: row.absentFromCopy,
          })),
        },
        laterPages: parsed.later,
        updatesApplied: parsed.updates,
        offence:
          kind === "regression" && examCase && !examCase.score.offenceOnPage
            ? offenceDiagnosis(tracker, pageText, examCase.proposal?.offence)
            : null,
      };
    });

  const regression = scoreSet(regressionRefs, "regression");
  const preservation = scoreSet(preservationRefs, "preservation");
  const afterHashes = frozenHashes();
  const summarise = (rows: typeof regression) => ({
    cases: rows.length,
    beforeSheetMatched: rows.filter((row) => row.before.sheetMatched).length,
    afterSheetMatched: rows.filter((row) => row.after.sheetMatched).length,
    beforeWrongChases: rows.reduce((sum, row) => sum + row.before.wrongChases.length, 0),
    afterWrongChases: rows.reduce((sum, row) => sum + row.after.wrongChases.length, 0),
    beforeMissingGaps: rows.reduce((sum, row) => sum + row.before.missingGaps.length, 0),
    afterMissingGaps: rows.reduce((sum, row) => sum + row.after.missingGaps.length, 0),
    beforeExtraChases: rows.reduce((sum, row) => sum + row.before.extraChases.length, 0),
    afterExtraChases: rows.reduce((sum, row) => sum + row.after.extraChases.length, 0),
    sameItemConflicts: rows.reduce(
      (sum, row) => sum + row.laterPages.filter((item) => item.relation === "same-item-conflict").length,
      0,
    ),
    updatesApplied: rows.reduce((sum, row) => sum + row.updatesApplied.length, 0),
  });
  const remaining = regression
    .filter((row) => row.after.missingGaps.length || row.after.wrongChases.length || row.after.extraChases.length)
    .map((row) => ({
      ref: row.ref,
      missingGaps: row.after.missingGaps,
      wrongChases: row.after.wrongChases,
      extraChases: row.after.extraChases,
    }));
  const pack = {
    generatedAt: new Date().toISOString(),
    experiment: "parser repair, regression twenty, no model call",
    learning: false,
    modelCalled: false,
    liveWiring: false,
    theseTwentyAre: "regression cases, not unseen proof",
    priorExam: exam.summary,
    regression: summarise(regression),
    preservation: summarise(preservation),
    remaining,
    frozenBefore: beforeHashes,
    frozenAfter: afterHashes,
    storeUntouched: JSON.stringify(beforeHashes) === JSON.stringify(afterHashes),
    cases: regression,
    preservationCases: preservation.map((row) => ({
      ref: row.ref,
      before: row.before,
      afterSheetMatched: row.after.sheetMatched,
      afterWrongChases: row.after.wrongChases,
      afterMissingGaps: row.after.missingGaps,
      afterExtraChases: row.after.extraChases,
      conflicts: row.laterPages.filter((item) => item.relation === "same-item-conflict"),
      updatesApplied: row.updatesApplied,
    })),
    note: "Status comes from the status cell, not from an S or O prefix. A later line about the same item is recorded. It changes the schedule only when that line says the item was updated. No such update was required for a match to be claimed. Tracker sheets were used only to score.",
  };
  fs.writeFileSync(OUT, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ regression: pack.regression, preservation: pack.preservation, storeUntouched: pack.storeUntouched }, null, 2));
  for (const row of regression) {
    if (!row.offence) continue;
    console.log("OFFENCE", row.ref, row.offence.diagnosis);
  }
  for (const row of regression.filter((item) => !item.after.sheetMatched)) {
    console.log(
      "LEFT",
      row.ref,
      "gaps",
      row.after.missingGaps.join(" ; ") || "-",
      "wrong",
      row.after.wrongChases.join(" ; ") || "-",
      "extra",
      row.after.extraChases.length,
    );
  }
  console.log(OUT);
}

const entry = process.argv[1]?.replaceAll("\\", "/");
if (entry?.endsWith("scripts/pattern-brain-schedule-parser-repair.ts")) main();
