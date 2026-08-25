/**
 * MG6/MG6C normalisation and material status classification for Bundle Truth Ledger.
 */

import type {
  MaterialStatus,
  NormalisedMaterialRow,
  SourceAnchor,
  TruthConfidence,
} from "./bundle-truth-types";

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Status wording welded to a neighbouring word with no capital to mark the join
 * (`Photo stillnot served`, `noteservedavailable in bundle`). Only applied to lines
 * carrying a schedule or exhibit reference, because narrative prose contains ordinary
 * words that end in status wording.
 */
const WELDED_STATUS_RE =
  /([a-z]{2,}?|\d)(not\s+served|served|outstanding|referred\s+only|referenced\s+only|part\s+copy\s+only|partial|unsigned|absent|missing|awaiting|pending|requested)(?=[a-z]|\s|[.,;)]|$)/gi;

/** Ordinary words that end in status wording and must survive intact. */
const WELDED_STATUS_FALSE_POSITIVES =
  /^(?:preserved|conserved|subserved|undeserved|unobserved|observed|reserved|deserved|unserved|misserved|impartial|dismissing|impending|suspending|appending|expending|depending|spending|upending)$/i;

/** `MG6/04`, `CCTV/3`, `TEL/5`, `O02`, `U1` — the marks of an actual schedule row. */
const SCHEDULE_ROW_REF_RE =
  /\b(?:MG\d{1,2}[A-Z]?(?:\/\d{1,4})?|[A-Z]{2,4}\/\d{1,3}|[A-Z]\d{1,3})\b/;

/** Brand and device names whose internal capital is part of the name. */
const PROTECTED_COMPOUND_RE =
  /\b(?:WhatsApp|iPhone|iPad|iCloud|iMessage|iTunes|YouTube|PayPal|eBay|MacBook|BlackBerry|LinkedIn|TikTok|SnapChat|OnlyFans|MoneyGram|PlayStation|McDonald)\b/g;

function splitWeldedStatus(line: string): string {
  if (!SCHEDULE_ROW_REF_RE.test(line)) return line;
  return line.replace(WELDED_STATUS_RE, (match, head: string, status: string, offset: number) => {
    if (WELDED_STATUS_FALSE_POSITIVES.test(`${head}${status}`)) return match;
    const next = line[offset + match.length];
    return next && /[a-z]/.test(next) ? `${head} ${status} ` : `${head} ${status}`;
  });
}

/**
 * Undo the whitespace loss that happens when a PDF schedule is flattened
 * (`bank source statementsOutstandingNot in papers supplied`). Status words only carry
 * meaning to the classifiers while their word boundaries survive, so the join has to be
 * undone before any status decision is taken. Single leading lower-case letters are left
 * alone so names such as `iPhone` are not broken apart.
 */
export function deglueScheduleText(line: string): string {
  const held: string[] = [];
  const masked = splitWeldedStatus(line).replace(PROTECTED_COMPOUND_RE, (name) => {
    held.push(name);
    return `\u0000${held.length - 1}\u0000`;
  });

  return masked
    // `MG6/04bank` / `MG6C/002CCTV` — split the cell that follows a schedule reference.
    .replace(/\b(MG\d{1,2}[A-Z]?\/\d{1,4})(?=[A-Za-z])/g, "$1 ")
    // `MG11witness statement` / `O01full interview transcript` — an exhibit or form
    // reference glued to its description.
    .replace(/\b(MG\d{1,2}[A-Z]?|[A-Z]{1,3}\d{1,3})(?=[a-z]{3,})/g, "$1 ")
    // `statementsOutstanding` — a lower-case word run glued to the next capitalised word.
    .replace(/([a-z]{2,})([A-Z])/g, "$1 $2")
    // `05CCTV` — digits glued to a following word, without breaking `MG6C` / `MG11A` refs.
    .replace(/(?<!\bMG\d{0,3})(\d)([A-Z])/g, "$1 $2")
    .replace(/\u0000(\d+)\u0000/g, (_, index: string) => held[Number(index)] ?? "");
}

/** Repair OCR-glued MG6 status tails: `not servedMay` → `not served — May`. */
export function repairGluedMg6StatusText(line: string): string {
  let s = deglueScheduleText(line.replace(/\r\n/g, " "));
  s = s.replace(/\b(MG6C?\/\d{3,4})([A-Za-z])/gi, "$1 — $2");
  s = s.replace(/\b(not\s+served)\s+([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(not\s+served)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(absent)\s+([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(absent)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(outstanding)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(unsigned)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(draft)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\bCourtHearing(\d{1,2})/gi, "Court hearing $1");
  s = s.replace(/\bnotice of CourtHearing/gi, "notice of court hearing");
  s = s.replace(
    /\bCourtHearing(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    "Court hearing $1",
  );
  return compact(s);
}

const INDEX_NOISE_RE =
  /\b(?:cover\s*sheet|case\s*admin\s*email|appendix|appendices|old\s*page|page\s*ref\s*wrong|duplicate|corrected\s*later|fiction(?:al)?|test-data)\b/i;

const EXCLUDED_LINE_RE =
  /\b(?:email\s+chain\s+excerpt|live\s+issues\s+identified|crown\s+route\s+relies\s+on|no\s+conclusion\s+is\s+drawn\s+from\s+the\s+charge\s+wording|key\s+case\s+facts\s+should\s+come\s+from\s+charge|this\s+front\s+note\s+is\s+not\s+complete|front\s+note|key\s+disputed\s+issues|cover\s+sheet|case\s+admin\s+emails?|appendices?|old\s+page|page\s+ref\s+wrong|duplicate|footer)\b/i;

const MG6_HEAD_RE =
  /\b(?:mg6\s+disclosure\s+schedule|mg6\s+corrected|mg6\s+continuation|mg6\s+disclosure|mg6c|disclosure\s+schedule|unused\s+material\s+schedule)\b/i;

const ITEM_RE =
  /\b(?:cctv|bwv|999(?:\s+audio)?|cad(?:\s+log)?|scene\s+photos?|forensic|witness|medical|interview|transcript|mg11|statement|footage|recording|export\s+log|continuity|indictment|charge\s+sheet|mg5|(?:full\s+)?phone\s+download|phone\s+extraction|source\s+export|handset\s+download|device\s+download|digital\s+extraction|subscriber\s+(?:report|data|return|records?))\b/i;

/** Affirmative phone-download / source-export establishment — not property seizure alone. */
const PHONE_DOWNLOAD_ITEM_RE =
  /\b(?:(?:full\s+)?phone\s+download|phone\s+extraction|source\s+export|handset\s+download|device\s+download|digital\s+extraction)\b/i;

/** Explicit denial / property-only — do not invent a download inventory row. */
function lineDeniesOrIsPropertyOnlyPhone(line: string): boolean {
  const l = compact(line);
  if (/\bno\s+(?:full\s+)?phone\s+download\b/i.test(l)) return true;
  if (/\bno\s+source\s+export\b/i.test(l)) return true;
  if (/\bwithout\s+(?:a\s+)?(?:(?:full\s+)?phone\s+download|source\s+export)\b/i.test(l)) return true;
  if (/\bnot\s+(?:a\s+)?(?:phone\s+download|source\s+export)\b/i.test(l)) return true;
  // Stolen / property phone without download/extraction/export language.
  if (
    /\b(?:stolen|property|seized)\s+phone\b|\bphone\s+(?:from|seized|recovered|stolen)\b/i.test(l) &&
    !PHONE_DOWNLOAD_ITEM_RE.test(l)
  ) {
    return true;
  }
  return false;
}

const DRAFT_STATUS_RE =
  /\b(?:summary\s+only|extract\s+served\s+only|extract\s+only|partial|screenshots?\s*\/\s*summary|screenshots?\b|only\s+screenshots|later\s+note\s+suggests|draft\s+note|draft\s+only|\bdraft\b|unclear|served\s*\?\s*unclear|requires?\s+oic\s+check|sensitive\s+schedule\s+exists)\b/i;

const OUTSTANDING_STATUS_RE =
  /\b(?:not\s+yet\s+served|not\s+served|not\s+fully\s+served|not\s+complete|not\s+on\s+file|not\s+attached|defence\s+request\s+outstanding|continuity\s+pending|continuity\s+outstanding|pending|await(?:ing|ed)?|to\s+follow|missing\s+source|full\s+master\s+not\s+on\s+file|full\s+recording\s+outstanding|\babsent\b|outstanding|check\s+full\s+(?:mg\s*11|bwv|first)|behind\s+this\s+extract\s+is\s+not)\b/i;

const UNSIGNED_RE = /\b(?:unsigned|not\s+signed|awaiting\s+signature|draft\s+witness\s+statement)\b/i;

const POSITIVE_SERVED_RE =
  /\b(?:served|provided|disclosed|supplied|final\s+served|full\s+served|footage\s+provided|log\s+disclosed|statement\s+supplied)\b/i;

const NEVER_IN_SERVED_RE =
  /\b(?:not\s+served|not\s+yet\s+served|not\s+fully\s+served|not\s+complete|not\s+on\s+file|not\s+safely\s+separated|await(?:ing|ed)?|outstanding|defence\s+request\s+outstanding|continuity\s+pending|pending|to\s+follow|missing\s+source|summary\s+only|extract\s+served\s+only|extract\s+only|partial|screenshots?\s*\/\s*summary|screenshots?\b|only\s+screenshots|later\s+note\s+suggests|behind\s+this\s+extract|source\s+material\s+behind|check\s+full\s+(?:mg\s*11|bwv|first)|unclear|\bdraft\b|draft\s+only|draft\s+note|served\s*\?\s*unclear|requires?\s+oic\s+check|sensitive\s+schedule\s+exists|\babsent\b|\bunsigned\b)\b/i;

function isLikelyMaterialLine(line: string): boolean {
  if (EXCLUDED_LINE_RE.test(line) || INDEX_NOISE_RE.test(line)) return false;
  const U = line.toUpperCase();
  return (
    /\bMG6(?:[A-Z])?\b/.test(U) ||
    MG6_HEAD_RE.test(line) ||
    ITEM_RE.test(line) ||
    OUTSTANDING_STATUS_RE.test(line) ||
    DRAFT_STATUS_RE.test(line) ||
    POSITIVE_SERVED_RE.test(line)
  );
}

const ABSENT_ON_PAPERS_RE =
  /\bno\s+full\s+witness\s+pack\b|\bnot\s+contained\s+in\s+the\s+papers\b|\bis\s+not\s+contained\b/i;

/**
 * Service stated as a condition rather than a fact (`where served`, `if served`).
 * These lines describe what would follow once material arrives, so they can never
 * stand as proof that it is on file.
 */
const CONDITIONAL_SERVICE_RE =
  /\b(?:where|if|when|once|unless|until|subject\s+to|pending)\s+(?:it\s+is\s+|they\s+are\s+|material\s+is\s+)?(?:served|provided|disclosed|supplied|service)\b/i;

function hasNegativeOrLimitingSignal(line: string): boolean {
  if (CONDITIONAL_SERVICE_RE.test(line)) return true;
  // Screenshots/summary served on bundle are limited artefacts but still positively served —
  // do not treat the mere word "screenshots" as a negative that blocks served classification.
  const servedOnBundle = /\bserved on bundle\b/i.test(line);
  if (servedOnBundle && !/\bpartial\b|\bincomplete\b|\bnot\s+(?:served|attached|included)\b/i.test(line)) {
    return false;
  }
  if (NEVER_IN_SERVED_RE.test(line)) return true;
  if (DRAFT_STATUS_RE.test(line)) return true;
  if (OUTSTANDING_STATUS_RE.test(line)) return true;
  if (ABSENT_ON_PAPERS_RE.test(line)) return true;
  if (/\bnot\b/i.test(line) && POSITIVE_SERVED_RE.test(line)) return true;
  return false;
}

function isCleanPositiveServedLine(line: string): boolean {
  if (!ITEM_RE.test(line) && !/\bMG6C?\//i.test(line)) return false;
  if (hasNegativeOrLimitingSignal(line)) return false;
  if (!POSITIVE_SERVED_RE.test(line)) return false;
  return true;
}

/**
 * Referred / listed / scheduled but not served-or-attached.
 * Checked before outstanding so "referred on MG6 — export not served" is not
 * collapsed to outstanding/missing.
 */
export function lineIndicatesReferredOnly(line: string): boolean {
  const l = compact(line);
  if (!l) return false;
  // Outstanding (without referred/listed/scheduled) is never referred_only
  if (
    /\boutstanding\b/i.test(l) &&
    !/\breferred\b/i.test(l) &&
    !/\b(?:listed|scheduled)\b/i.test(l)
  ) {
    return false;
  }
  // Uncertainty prose is not referred proof
  if (/^uncertain(?:\s+on\s+papers)?\s*:/i.test(l)) return false;
  if (/^referred\s+only\s*:/i.test(l)) return true;
  // "referenced only" is the same state as "referred only": named in the papers, not attached.
  if (/\breferr?e(?:d|nced)\s+only\b/i.test(l)) return true;
  if (/\breferred\s+on\s+(?:mg6c?|schedule|index|disclosure)\b/i.test(l)) return true;
  if (/\breferred\s+to\b/i.test(l)) return true;
  if (/\b(?:listed|scheduled)\b[^.\n]{0,40}\bnot\s+(?:served|attached)\b/i.test(l)) return true;
  if (
    /\breferred\b/i.test(l) &&
    /\b(?:export\s+not\s+served|not\s+attached|not\s+included|not\s+on\s+bundle)\b/i.test(l)
  ) {
    return true;
  }
  if (/\bmentioned but\b|\bnot\s+included\b|\bnot\s+attached\b|\bsummary\s+only\b/i.test(l)) {
    return true;
  }
  return false;
}

export function classifyMaterialStatus(line: string): MaterialStatus | null {
  // Normalise here as well as at collection time: a glued cell hides the word
  // boundaries the status patterns rely on, which silently reads "Outstanding
  // Not in papers supplied" as served.
  const l = repairGluedMg6StatusText(line);
  if (!l || l.length < 8) return null;
  // Property phone / explicit "no phone download" must not become inventory rows —
  // but do not kill a line that also carries other material (e.g. CCTV master).
  if (lineDeniesOrIsPropertyOnlyPhone(l)) {
    const hasOtherMaterial =
      /\b(?:cctv|bwv|999(?:\s+audio)?|cad(?:\s+log)?|mg11|interview|transcript|export\s+log|continuity|medical|forensic|scene\s+photos?)\b/i.test(
        l,
      );
    if (!hasOtherMaterial) return null;
  }
  if (UNSIGNED_RE.test(l)) return "unsigned";
  // Referred/listed/scheduled-not-served before outstanding — shared F01/F02 root.
  if (lineIndicatesReferredOnly(l)) {
    return "referred_only";
  }
  // Clean served-on-bundle / positive served lines beat draft/screenshot heuristics
  if (isCleanPositiveServedLine(l)) return "served";
  if (DRAFT_STATUS_RE.test(l)) return "draft";
  if (OUTSTANDING_STATUS_RE.test(l)) return "outstanding";
  if (ABSENT_ON_PAPERS_RE.test(l)) return "absent";
  if (/\babsent\b/i.test(l)) return "absent";
  if (/\bpartial\b/i.test(l)) return "partial";
  if (ITEM_RE.test(l) && !hasNegativeOrLimitingSignal(l)) return "unclear";
  return null;
}

/** Case-file and URN numbering identifies the case, not a listed item on a schedule. */
const NON_MATERIAL_REF_PREFIX = /^(?:URN|URNNP|CB)$/i;

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The reference a schedule gives a listed item — how a solicitor asks for it, and how two
 * separately listed items are told apart.
 *
 * Covers the MG6 cell forms (`MG6/04`, `MG6C/002`, `MG6-04`, `MG6 04`) and the exhibit/unit forms
 * these schedules use alongside them (`O02`, `EX/03`, `EX-MUR-005`, `CCTV/2`, `BWV/4`, `TEL/5`).
 * Exhibit-style references must be upper case, so ordinary prose containing a slash and a digit is
 * not mistaken for one.
 */
export function parseScheduleRef(line: string): string | null {
  // Flattening welds the reference to the description it labels (`EX-MUR-001Charge Sheet`), which
  // leaves no word boundary for the patterns below to end on. Restore the boundary first.
  const text = deglueScheduleText(compact(line));

  const mg6 = text.match(/\b(MG6[A-Z]?)\s*[/\-\s]\s*(\d{1,4})\b/i);
  if (mg6?.[1] && mg6[2]) return `${mg6[1].toUpperCase()}/${mg6[2]}`;

  const exhibitChain = text.match(/\b(EX-[A-Z]{2,4}-\d{2,4})\b/);
  if (exhibitChain?.[1]) return exhibitChain[1].toUpperCase();

  const unitCell = text.match(/\b([A-Z]{2,5})\/(\d{1,3})\b/);
  if (
    unitCell?.[1] &&
    unitCell[2] &&
    !NON_MATERIAL_REF_PREFIX.test(unitCell[1]) &&
    // `CAD/999` names two kinds of log; the 999 is the emergency number, not an item number.
    unitCell[2] !== "999"
  ) {
    return `${unitCell[1].toUpperCase()}/${unitCell[2]}`;
  }

  const numberedExhibit = text.match(/\bO(\d{2})\b/);
  if (numberedExhibit?.[1]) return `O${numberedExhibit[1]}`;

  return null;
}

function splitMaterialLabelDetail(line: string): { label: string; detail: string | null } {
  const c = repairGluedMg6StatusText(line.replace(/^[-*•]\s*/, ""));
  const dashParts = c.split(/\s*[—–\-]\s+/);
  if (dashParts.length >= 3) {
    return {
      label: `${dashParts[0]!} — ${dashParts[1]!}`,
      detail: dashParts.slice(2).join(" — ") || null,
    };
  }
  if (dashParts.length === 2) {
    return { label: dashParts[0]!, detail: dashParts[1]! };
  }
  return { label: c, detail: null };
}

/**
 * The status cell of a flattened schedule row, once degluing has restored its boundary
 * (`EX-MUR-002 MG5 Case Summary Served summary/draft`).
 *
 * The description is what a solicitor asks for; the status cell is what the schedule says about it.
 * Left welded together they produce requests that read `MG5 Case Summary Served summary/draft`,
 * which no one can send, and which state the item is served in the middle of asking for it.
 */
const TRAILING_STATUS_CELL_RE =
  /\s+((?:not\s+served|served|outstanding|missing|absent|unsigned|draft|partial|referred\s+only|referenced\s+only|awaiting|pending|requested)\b.*)$/i;

function splitTrailingStatusCell(label: string): { label: string; statusCell: string | null } {
  const match = label.match(TRAILING_STATUS_CELL_RE);
  if (!match?.[1] || match.index === undefined) return { label, statusCell: null };
  const description = label.slice(0, match.index).trim();
  // A row that is only a status cell has no description to keep, and a bare reference is not one.
  if (description.length < 3 || SCHEDULE_ROW_REF_RE.test(description) === false) {
    return description.length >= 3
      ? { label: description, statusCell: match[1].trim() }
      : { label, statusCell: null };
  }
  const withoutRef = description.replace(SCHEDULE_ROW_REF_RE, "").trim();
  if (withoutRef.length < 3) return { label, statusCell: null };
  return { label: description, statusCell: match[1].trim() };
}

/**
 * The tab or row number a schedule table gives an entry (`10CCTV stills and timing note`). It
 * identifies the row's position in the table, not the document, so it has no place in the name of
 * the material a solicitor asks for. `999` is left alone — it names a kind of log, not a row.
 */
function stripLeadingRowNumber(label: string): string {
  const stripped = label.replace(/^(\d{1,2})\s+(?=[A-Za-z])/, (match, digits: string) =>
    digits === "999" ? match : "",
  );
  return stripped.trim().length >= 3 ? stripped.trim() : label;
}

function normaliseDedupeKey(line: string, scheduleRef: string | null): string {
  const base = (scheduleRef ?? line)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/]/g, "")
    .slice(0, 120);
  const kind = ITEM_RE.exec(line)?.[0]?.toLowerCase() ?? "material";
  return `${base}|${kind}`;
}

function rowConfidence(status: MaterialStatus, line: string): TruthConfidence {
  if (status === "unclear" || INDEX_NOISE_RE.test(line)) return "low";
  if (status === "partial" || status === "draft" || status === "unsigned" || status === "referred_only") {
    return "medium";
  }
  return "high";
}

/**
 * A schedule sits wherever the bundle puts it, which on a heavy case is well past a quarter of a
 * million characters. Reading further is cheap here — the ledger handles 1.6 million characters in
 * about a second — so this limit is not what holds the app back; the chase presentation gates are.
 * Raise this alongside `FRONT_MATTER_CHARS`, which currently stops the text arriving at all.
 */
const MATERIAL_SCAN_CHARS = 250_000;

function collectMaterialLines(bundleText: string): string[] {
  const head = bundleText.slice(0, MATERIAL_SCAN_CHARS).replace(/\r\n/g, "\n");
  const lines: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const c = repairGluedMg6StatusText(raw);
    if (c.length < 10 || c.length > 320) return;
    if (!isLikelyMaterialLine(c)) return;
    const status = classifyMaterialStatus(c);
    if (!status) return;
    const key = normaliseDedupeKey(c, parseScheduleRef(c));
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(c);
  };

  let inSchedule = false;
  for (const raw of head.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (MG6_HEAD_RE.test(line) || /\bMG6C?\b/i.test(line)) inSchedule = true;
    if (inSchedule || ITEM_RE.test(line)) add(line);
  }

  return lines;
}

export function normaliseBundleMaterials(bundleText: string): NormalisedMaterialRow[] {
  const rows: NormalisedMaterialRow[] = [];
  const seen = new Set<string>();

  for (const line of collectMaterialLines(bundleText)) {
    const status = classifyMaterialStatus(line);
    if (!status) continue;

    const scheduleRef = parseScheduleRef(line);
    const split = splitMaterialLabelDetail(line);
    const cell = splitTrailingStatusCell(split.label);
    const label = scheduleRef ? stripLeadingRowNumber(cell.label) : cell.label;
    // The status cell leaves the label but must not leave the row: it is what the schedule says
    // about the item, and Papers still has to show it.
    const detail = [cell.statusCell, split.detail].filter(Boolean).join(" — ") || null;
    const id = normaliseDedupeKey(line, scheduleRef);
    if (seen.has(id)) continue;
    seen.add(id);

    const anchor: SourceAnchor = {
      documentPriority: "mg6",
      sectionLabel: scheduleRef ?? "MG6/MG6C",
      excerpt: line.slice(0, 220),
    };

    const displayLine = (() => {
      if (scheduleRef && new RegExp(`^${escapeForRegExp(scheduleRef)}\\b`, "i").test(label)) {
        return detail ? `${label} — ${detail}` : label;
      }
      return [scheduleRef, label, detail].filter(Boolean).join(" — ");
    })();

    rows.push({
      id,
      scheduleRef,
      label,
      detail,
      status,
      displayLine,
      sourceAnchor: anchor,
      confidence: rowConfidence(status, line),
    });
  }

  return rows;
}

export function buildForbiddenClaimsForMaterials(
  materials: NormalisedMaterialRow[],
): Array<{ id: string; phrase: string; reason: string; relatedMaterialIds: string[] }> {
  const out: Array<{ id: string; phrase: string; reason: string; relatedMaterialIds: string[] }> =
    [];

  const add = (id: string, phrase: string, reason: string, ids: string[]) => {
    out.push({ id, phrase, reason, relatedMaterialIds: ids });
  };

  const notFullyServed = (s: MaterialStatus) =>
    s === "absent" ||
    s === "outstanding" ||
    s === "draft" ||
    s === "unsigned" ||
    s === "referred_only" ||
    s === "partial" ||
    s === "unclear";

  const cctvRows = materials.filter(
    (m) => /\bcctv|footage|video\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (cctvRows.length) {
    add("forbid-cctv-confirms", "CCTV confirms", "CCTV is not fully served on papers", cctvRows.map((r) => r.id));
    add("forbid-cctv-proves", "CCTV proves", "CCTV is not fully served on papers", cctvRows.map((r) => r.id));
    add(
      "forbid-full-cctv-confirms",
      "Full CCTV confirms",
      "CCTV is not fully served on papers",
      cctvRows.map((r) => r.id),
    );
  }

  const medicalRows = materials.filter(
    (m) => /\bmedical|hospital|injury|fme\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (medicalRows.length) {
    add("forbid-medical-final", "final medical report", "Medical material is absent, draft, or outstanding", medicalRows.map((r) => r.id));
    add("forbid-medical-proves", "medical report proves", "Medical material is absent, draft, or outstanding", medicalRows.map((r) => r.id));
    add("forbid-medical-consistent", "medical is consistent", "Medical material is absent, draft, or outstanding", medicalRows.map((r) => r.id));
  }

  const interviewRows = materials.filter(
    (m) => /\binterview|transcript|pace\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (interviewRows.length) {
    add("forbid-interview-confirms", "interview confirms", "Interview material is not fully served", interviewRows.map((r) => r.id));
  }

  const witnessRows = materials.filter(
    (m) =>
      /\bmg11|witness\s+statement|complainant\s+statement\b/i.test(`${m.label} ${m.detail ?? ""}`) &&
      (m.status === "draft" || m.status === "unsigned" || m.status === "partial"),
  );
  if (witnessRows.length) {
    add("forbid-witness-final", "witness statement is final", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
    add("forbid-witness-served", "MG11 is consistent and served", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
    add("forbid-mg11-served", "MG11 served", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
    add(
      "forbid-injury-consistent",
      "Complainant injury account is consistent across MG11 and medical material",
      "Medical or witness material is not fully served on papers",
      [...witnessRows, ...medicalRows].map((r) => r.id),
    );
  }

  const bwvRows = materials.filter(
    (m) => /\bbwv|body[-\s]?worn\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (bwvRows.length) {
    add("forbid-bwv-confirms", "BWV confirms", "Body-worn video is not fully served on papers", bwvRows.map((r) => r.id));
  }

  const cadRows = materials.filter(
    (m) => /\bcad\b|\b999\b|dispatch|control\s*room/i.test(`${m.label} ${m.detail ?? ""} ${m.displayLine}`),
  );
  const cadServed = cadRows.filter((m) => m.status === "served");
  if (cadRows.length === 0 || cadServed.length === 0) {
    add(
      "forbid-cad-supports",
      "CAD/999 timing supports",
      "CAD/999 material is not safely on file as served",
      cadRows.map((r) => r.id),
    );
  }

  if (witnessRows.length) {
    add("forbid-mg11-consistent", "MG11 is consistent", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
  }

  return out;
}

export function estimateOcrConfidence(bundleText: string): TruthConfidence {
  const sample = bundleText.slice(0, 40_000);
  if (!sample.trim()) return "low";
  let penalty = 0;
  if (/\w{24,}/.test(sample)) penalty += 1;
  if ((sample.match(/\?\?\?|�|\[\?\]/g) ?? []).length > 3) penalty += 2;
  if ((sample.match(/\b[A-Z]{5,}[a-z]{3,}\b/g) ?? []).length > 5) penalty += 1;
  if (penalty >= 3) return "low";
  if (penalty >= 1) return "medium";
  return "high";
}
