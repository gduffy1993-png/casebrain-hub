/**
 * Timestamp / chronology analysis for custody and interview events.
 * Different event times are NOT automatically contradictory.
 * Conflicts require: (a) competing timestamps for the SAME event, or
 * (b) impossible chronology (e.g. interview begins before custody arrival).
 */

export type TimestampEventKind =
  | "custody_arrival"
  | "interview_start"
  | "same_event"
  | "other";

export type TimestampObservation = {
  eventKind: TimestampEventKind;
  /** Free-text event identity for same-event competition (normalized). */
  eventIdentity: string;
  rawTime: string;
  minutes: number | null;
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
};

export type ClockAnalysisResult = {
  /** Competing timestamps for the same event identity/kind. */
  sameEventConflicts: Array<{
    eventIdentity: string;
    eventKind: TimestampEventKind;
    observations: TimestampObservation[];
  }>;
  /** Impossible chronology pairs (e.g. interview before custody arrival). */
  impossibleChronology: Array<{
    earlier: TimestampObservation;
    laterExpected: TimestampObservation;
    reason: string;
  }>;
  /** True only when same-event conflict or impossible chronology exists. */
  conflict: boolean;
  custodyArrival: TimestampObservation | null;
  interviewStart: TimestampObservation | null;
};

const TIME_TOKEN_RE =
  /\b(?:(?:[01]?\d|2[0-3])[:.][0-5]\d(?:\s*[ap]\.?m\.?)?|\d{1,2}\s*[ap]\.?m\.?)\b/gi;

export function extractTimeTokens(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(TIME_TOKEN_RE.source, TIME_TOKEN_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0].replace(/\s+/g, " ").trim();
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

export function normalizeClockMinutes(raw: string): number | null {
  const t = raw.toLowerCase().replace(/\./g, "").trim();
  const ampm = t.match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm)$/);
  if (ampm) {
    let h = parseInt(ampm[1]!, 10);
    const min = ampm[2] ? parseInt(ampm[2], 10) : 0;
    if (ampm[3] === "pm" && h < 12) h += 12;
    if (ampm[3] === "am" && h === 12) h = 0;
    return h * 60 + min;
  }
  const hhmm = t.match(/^(\d{1,2})[:.](\d{2})$/);
  if (hhmm) {
    return parseInt(hhmm[1]!, 10) * 60 + parseInt(hhmm[2]!, 10);
  }
  return null;
}

function normalizeIdentity(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Classify a line into an event kind. Prefer specific custody/interview markers.
 */
export function classifyTimestampEventKind(line: string): TimestampEventKind {
  const t = line.toLowerCase();
  if (/\b(custody\s+arrival|arrived\s+(?:in\s+)?custody|booked\s+in|detention\s+commenced|arrival\s+at\s+custody)\b/.test(t)) {
    return "custody_arrival";
  }
  if (/\bcustody\b/.test(t) && /\b(arrival|arrived|booked)\b/.test(t)) {
    return "custody_arrival";
  }
  if (/\b(interview\s+(?:commenced|began|started|start)|commenced\s+interview)\b/.test(t)) {
    return "interview_start";
  }
  if (/\binterview\b/.test(t) && /\b(commenced|began|started|start)\b/.test(t)) {
    return "interview_start";
  }
  return "other";
}

export function observeTimestampsFromPage(input: {
  text: string;
  sourceDocumentTitle?: string | null;
  sourceDocumentType?: string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
}): TimestampObservation[] {
  const out: TimestampObservation[] = [];
  const lines = input.text.split(/\n+/);
  for (const line of lines) {
    const times = extractTimeTokens(line);
    if (!times.length) continue;
    const kind = classifyTimestampEventKind(line);
    for (const rawTime of times) {
      out.push({
        eventKind: kind === "other" ? "same_event" : kind,
        eventIdentity:
          kind === "custody_arrival"
            ? "custody_arrival"
            : kind === "interview_start"
              ? "interview_start"
              : normalizeIdentity(line.slice(0, 80)) || "unspecified_event",
        rawTime,
        minutes: normalizeClockMinutes(rawTime),
        sourceDocumentTitle: input.sourceDocumentTitle ?? null,
        sourceDocumentType: input.sourceDocumentType ?? null,
        sourcePage: input.sourcePage ?? null,
        compiledPage: input.compiledPage ?? null,
      });
    }
  }
  return out;
}

/**
 * Analyse custody/interview clocks.
 * Normal custody-then-interview sequences are NOT flagged.
 */
export function analyseCustodyInterviewClocks(
  observations: TimestampObservation[],
): ClockAnalysisResult {
  const sameEventConflicts: ClockAnalysisResult["sameEventConflicts"] = [];
  const impossibleChronology: ClockAnalysisResult["impossibleChronology"] = [];

  // Group by event identity for same-event competition
  const byIdentity = new Map<string, TimestampObservation[]>();
  for (const obs of observations) {
    if (obs.minutes == null) continue;
    // Only compete within custody_arrival / interview_start / explicit same_event groups
    if (obs.eventKind === "other") continue;
    const key = `${obs.eventKind}::${obs.eventIdentity}`;
    const list = byIdentity.get(key) ?? [];
    list.push(obs);
    byIdentity.set(key, list);
  }

  for (const [, list] of byIdentity) {
    const uniqueMins = [...new Set(list.map((o) => o.minutes).filter((m): m is number => m != null))];
    if (uniqueMins.length >= 2) {
      sameEventConflicts.push({
        eventIdentity: list[0]!.eventIdentity,
        eventKind: list[0]!.eventKind,
        observations: list,
      });
    }
  }

  const custodyArrivals = observations.filter(
    (o) => o.eventKind === "custody_arrival" && o.minutes != null,
  );
  const interviewStarts = observations.filter(
    (o) => o.eventKind === "interview_start" && o.minutes != null,
  );

  // Impossible chronology: any interview_start strictly before the earliest custody_arrival
  if (custodyArrivals.length && interviewStarts.length) {
    const earliestCustody = custodyArrivals.reduce((a, b) =>
      (a.minutes ?? Infinity) <= (b.minutes ?? Infinity) ? a : b,
    );
    for (const interview of interviewStarts) {
      if ((interview.minutes ?? 0) < (earliestCustody.minutes ?? 0)) {
        impossibleChronology.push({
          earlier: interview,
          laterExpected: earliestCustody,
          reason: `Interview start (${interview.rawTime}) is before custody arrival (${earliestCustody.rawTime})`,
        });
      }
    }
  }

  const conflict = sameEventConflicts.length > 0 || impossibleChronology.length > 0;

  return {
    sameEventConflicts,
    impossibleChronology,
    conflict,
    custodyArrival: custodyArrivals[0] ?? null,
    interviewStart: interviewStarts[0] ?? null,
  };
}

/**
 * @deprecated Prefer analyseCustodyInterviewClocks with typed observations.
 * Kept for transitional call sites — treats different event times as non-conflicting
 * unless impossible chronology is detectable from raw lists alone.
 */
export function detectCustodyInterviewClockConflict(input: {
  custodyTimes: string[];
  interviewTimes: string[];
}): { conflict: boolean; custodyTime: string | null; interviewTime: string | null } {
  const observations: TimestampObservation[] = [
    ...input.custodyTimes.map((rawTime) => ({
      eventKind: "custody_arrival" as const,
      eventIdentity: "custody_arrival",
      rawTime,
      minutes: normalizeClockMinutes(rawTime),
      sourceDocumentTitle: null,
      sourceDocumentType: null,
      sourcePage: null,
      compiledPage: null,
    })),
    ...input.interviewTimes.map((rawTime) => ({
      eventKind: "interview_start" as const,
      eventIdentity: "interview_start",
      rawTime,
      minutes: normalizeClockMinutes(rawTime),
      sourceDocumentTitle: null,
      sourceDocumentType: null,
      sourcePage: null,
      compiledPage: null,
    })),
  ];
  const result = analyseCustodyInterviewClocks(observations);
  return {
    conflict: result.conflict,
    custodyTime: result.custodyArrival?.rawTime ?? input.custodyTimes[0] ?? null,
    interviewTime: result.interviewStart?.rawTime ?? input.interviewTimes[0] ?? null,
  };
}

export function detectCustodyInterviewClockFromText(text: string): {
  conflict: boolean;
  custodyTime: string | null;
  interviewTime: string | null;
  analysis: ClockAnalysisResult;
} {
  const observations = observeTimestampsFromPage({ text });
  const analysis = analyseCustodyInterviewClocks(observations);
  return {
    conflict: analysis.conflict,
    custodyTime: analysis.custodyArrival?.rawTime ?? null,
    interviewTime: analysis.interviewStart?.rawTime ?? null,
    analysis,
  };
}
