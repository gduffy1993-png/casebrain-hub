/**
 * Hearing-notice lifecycle.
 *
 * A bundle often contains several listing notices for the same matter. The latest
 * notice governs, but the earlier one is never deleted: where the two give different
 * hearing dates that disagreement is itself a finding, and the same lifecycle must be
 * reported identically by Control Room, War Room, API and exports.
 */

export type HearingNoticeInput = {
  documentId: string;
  documentTitle: string;
  documentType?: string | null;
  /** Higher = later upload. Used only as a last-resort tie-break. */
  uploadOrder: number;
  text: string;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
};

export type HearingNotice = {
  documentId: string;
  documentTitle: string;
  /** ISO date of the hearing when a date could be read. */
  hearingDateIso: string | null;
  hearingDateRaw: string | null;
  hearingType: string | null;
  /** ISO date the notice itself was issued, when stated. */
  noticeIssuedIso: string | null;
  uploadOrder: number;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
};

export type HearingLifecycle = {
  latest: HearingNotice | null;
  superseded: HearingNotice[];
  /** True when notices disagree about the hearing date. */
  conflict: boolean;
  conflictDescription: string | null;
  /** How "latest" was chosen — never silently by array position. */
  basis: "issue_date" | "hearing_date" | "upload_order" | "single_notice" | "none";
};

const HEARING_NOTICE_MARKERS =
  /\b(notice of hearing|hearing notice|listing notice|notice of listing|listed for hearing|re-?listed)\b/i;

const HEARING_TYPE_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: "trial", re: /\btrial\b/i },
  { type: "plea_and_trial_preparation", re: /\b(ptph|plea and trial preparation)\b/i },
  { type: "case_management", re: /\bcase management\b/i },
  { type: "sentence", re: /\bsentenc(?:e|ing)\b/i },
  { type: "mention", re: /\bmention\b/i },
  { type: "bail_application", re: /\bbail application\b/i },
];

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2200) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

/** Read a date near a keyword. Returns both ISO and the wording actually printed. */
function readDateNear(
  text: string,
  keyword: RegExp,
): { iso: string | null; raw: string | null } {
  const m = text.match(keyword);
  if (!m || m.index == null) return { iso: null, raw: null };
  const window = text.slice(m.index, m.index + 200);

  const named = window.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/,
  );
  if (named) {
    const month = MONTHS[named[2]!.toLowerCase()];
    if (month) {
      const iso = toIso(parseInt(named[3]!, 10), month, parseInt(named[1]!, 10));
      if (iso) return { iso, raw: named[0] };
    }
  }

  const numeric = window.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numeric) {
    const yearRaw = parseInt(numeric[3]!, 10);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const iso = toIso(year, parseInt(numeric[2]!, 10), parseInt(numeric[1]!, 10));
    if (iso) return { iso, raw: numeric[0] };
  }

  const isoDirect = window.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDirect) {
    return { iso: isoDirect[0]!, raw: isoDirect[0]! };
  }

  return { iso: null, raw: null };
}

export function isHearingNoticeText(text: string, title = ""): boolean {
  return HEARING_NOTICE_MARKERS.test(`${title}\n${text}`);
}

export function extractHearingNotices(inputs: HearingNoticeInput[]): HearingNotice[] {
  const notices: HearingNotice[] = [];
  for (const input of inputs) {
    const hay = `${input.documentTitle}\n${input.text}`;
    if (!isHearingNoticeText(input.text, input.documentTitle)) continue;

    const hearing = readDateNear(
      hay,
      /\b(?:listed for|hearing (?:date|on)|will be heard on|date of hearing|re-?listed (?:to|for))\b/i,
    );
    const issued = readDateNear(hay, /\b(?:date of (?:notice|issue)|issued|dated)\b/i);
    const hearingType =
      HEARING_TYPE_PATTERNS.find(({ re }) => re.test(hay))?.type ?? null;

    notices.push({
      documentId: input.documentId,
      documentTitle: input.documentTitle,
      hearingDateIso: hearing.iso,
      hearingDateRaw: hearing.raw,
      hearingType,
      noticeIssuedIso: issued.iso,
      uploadOrder: input.uploadOrder,
      sourcePage: input.sourcePage,
      compiledPage: input.compiledPage,
      pageIdentityKnown: input.pageIdentityKnown,
    });
  }
  return notices;
}

/**
 * Choose the operative notice and preserve the others.
 * Precedence: stated issue date, then hearing date, then upload order — with a stable
 * document-id tie-break so the result never depends on input ordering.
 */
export function resolveHearingLifecycle(notices: HearingNotice[]): HearingLifecycle {
  if (!notices.length) {
    return {
      latest: null,
      superseded: [],
      conflict: false,
      conflictDescription: null,
      basis: "none",
    };
  }
  if (notices.length === 1) {
    return {
      latest: notices[0]!,
      superseded: [],
      conflict: false,
      conflictDescription: null,
      basis: "single_notice",
    };
  }

  const allHaveIssue = notices.every((n) => n.noticeIssuedIso);
  const allHaveHearing = notices.every((n) => n.hearingDateIso);
  const basis: HearingLifecycle["basis"] = allHaveIssue
    ? "issue_date"
    : allHaveHearing
      ? "hearing_date"
      : "upload_order";

  const sorted = [...notices].sort((a, b) => {
    if (basis === "issue_date") {
      const cmp = (a.noticeIssuedIso ?? "").localeCompare(b.noticeIssuedIso ?? "");
      if (cmp !== 0) return cmp;
    }
    if (basis === "hearing_date") {
      const cmp = (a.hearingDateIso ?? "").localeCompare(b.hearingDateIso ?? "");
      if (cmp !== 0) return cmp;
    }
    if (a.uploadOrder !== b.uploadOrder) return a.uploadOrder - b.uploadOrder;
    return a.documentId.localeCompare(b.documentId);
  });

  const latest = sorted[sorted.length - 1]!;
  const superseded = sorted.slice(0, -1);

  const distinctHearingDates = Array.from(
    new Set(notices.map((n) => n.hearingDateIso).filter((d): d is string => Boolean(d))),
  );
  const conflict = distinctHearingDates.length > 1;

  return {
    latest,
    superseded,
    conflict,
    conflictDescription: conflict
      ? `Hearing notices give different hearing dates (${distinctHearingDates.join(" and ")}); the later notice governs but the earlier notice remains on file and the conflict is unresolved`
      : null,
    basis,
  };
}
