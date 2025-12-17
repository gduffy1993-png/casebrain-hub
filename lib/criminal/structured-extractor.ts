/**
 * Criminal Structured Extractor (deterministic)
 *
 * Runs after document text extraction (PDF/DOCX/TXT) and before strategy.
 * Regex/rules only. Never throws for bad/empty input.
 *
 * Output is then persisted into existing criminal tables:
 * - criminal_cases (bail + next hearing + plea + defendant name when possible)
 * - criminal_charges
 * - criminal_hearings
 * - pace_compliance
 * - disclosure_tracker
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CriminalChargeExtract = {
  count: number;
  offence: string;
  statute: string | null;
  plea: "not_guilty" | "guilty" | "no_plea" | null;
  dateOfOffence: string | null; // YYYY-MM-DD
  chargeDate: string | null; // YYYY-MM-DD
  location?: string | null;
  status?: string | null;
  confidence: number; // 0-1 deterministic heuristic
  source: string;
};

export type CriminalHearingExtract = {
  court: string | null;
  date: string; // ISO
  type: "First Hearing" | "Plea Hearing" | "Case Management" | "Trial" | "Sentencing" | "Appeal" | "Bail Review";
  outcome: string | null;
  status: "UPCOMING" | "PAST";
  source: string;
};

export type CriminalBailExtract = {
  status: "bailed" | "remanded" | "police_bail" | null;
  conditions: string[];
  nextBailReview: string | null; // ISO
  remandTimeHours: number | null;
};

export type CriminalPACEExtract = {
  custodyRecord: "present" | "missing" | "unclear";
  interviewRecording: "present" | "missing" | "unclear";
  legalAdviceLog: "present" | "missing" | "unclear";
  status: "ok" | "issues_detected" | "unable_to_assess";
  breachesDetected: string[];
  breachSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
};

export type CriminalDisclosureExtract = {
  mg6a: "served" | "not_served" | "unclear";
  mg6c: "served" | "not_served" | "unclear";
  timetable: "confirmed" | "not_confirmed" | "unclear";
  status: "ok" | "outstanding" | "issues_detected";
  missingItems: string[];
  issues: string[];
  deadline: string | null; // ISO
};

export type CriminalCaseMeta = {
  defendantName: string | null;
  charges: CriminalChargeExtract[];
  hearings: CriminalHearingExtract[];
  nextHearing: string | null; // ISO
  bail: CriminalBailExtract;
  pace: CriminalPACEExtract;
  disclosure: CriminalDisclosureExtract;
  keyFacts: string[];
};

type ExtractInput = {
  text: string;
  documentName: string;
  now?: Date;
};

function safeLower(s: string): string {
  return (s ?? "").toLowerCase();
}

function toIsoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthToIndex(mon: string): number {
  const m = safeLower(mon);
  const map: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  return typeof map[m] === "number" ? map[m] : -1;
}

function parseDMY(ddRaw: string, mmRaw: string, yyyyRaw: string): Date | null {
  try {
    const dd = Number(ddRaw);
    const mm = Number(mmRaw);
    const yyyy = Number(yyyyRaw.length === 2 ? `20${yyyyRaw}` : yyyyRaw);
    if (!dd || !mm || !yyyy) return null;
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

function parseDMonY(ddRaw: string, monRaw: string, yyyyRaw: string): Date | null {
  try {
    const dd = Number(ddRaw);
    const yyyy = Number(yyyyRaw);
    const m = monthToIndex(monRaw);
    if (!dd || !yyyy || m < 0) return null;
    const dt = new Date(Date.UTC(yyyy, m, dd, 0, 0, 0));
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

function findDates(text: string): Date[] {
  const dates: Date[] = [];
  const re1 = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;
  const re2 =
    /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/gi;

  for (const m of text.matchAll(re1)) {
    const d = parseDMY(m[1], m[2], m[3]);
    if (d) dates.push(d);
  }
  for (const m of text.matchAll(re2)) {
    const d = parseDMonY(m[1], m[2], m[3]);
    if (d) dates.push(d);
  }
  return dates;
}

function pickFirstLineValue(text: string, label: RegExp): string | null {
  const lines = text.split(/\r?\n/).slice(0, 2000);
  for (const line of lines) {
    const m = line.match(label);
    if (m && m[1]) {
      const v = String(m[1]).trim();
      if (v.length >= 2) return v.slice(0, 120);
    }
  }
  return null;
}

function normalisePlea(raw: string | null): CriminalChargeExtract["plea"] {
  const t = safeLower(raw ?? "");
  if (!t) return null;
  if (t.includes("not guilty") || t.includes("not_guilty")) return "not_guilty";
  if (t.includes("guilty")) return "guilty";
  if (t.includes("no plea") || t.includes("no_plea")) return "no_plea";
  return null;
}

function normaliseHearingType(raw: string): CriminalHearingExtract["type"] {
  const t = safeLower(raw);
  if (t.includes("ptr") || t.includes("plea") || t.includes("plea and trial")) return "Plea Hearing";
  if (t.includes("first") || t.includes("first appearance")) return "First Hearing";
  if (t.includes("sentenc")) return "Sentencing";
  if (t.includes("appeal")) return "Appeal";
  if (t.includes("bail")) return "Bail Review";
  if (t.includes("trial")) return "Trial";
  if (t.includes("case management") || t.includes("cmh")) return "Case Management";
  return "Case Management";
}

function extractChargesFromText(input: ExtractInput): { charges: CriminalChargeExtract[]; plea: CriminalChargeExtract["plea"] } {
  const { text, documentName } = input;
  const t = text ?? "";
  const charges: CriminalChargeExtract[] = [];

  const plea = normalisePlea(
    pickFirstLineValue(t, /\bplea\b\s*[:\-]?\s*(not guilty|guilty|no plea|not_guilty|no_plea)\b/i) ??
      (t.match(/\bentered a plea of\s+(not guilty|guilty)\b/i)?.[1] ?? null)
  );

  // Offence lines
  const offenceLine = /(?:^|\n)\s*(?:offence|offences?|charge|charged with)\s*[:\-]\s*([^\n]{3,180})/gi;
  for (const m of t.matchAll(offenceLine)) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    const statute =
      raw.match(/\bs\.?\s*\d{1,3}[A-Za-z]*\b[^\n]{0,30}\b(?:OAPA|Offences Against the Person Act|Theft Act|CJA|Criminal Justice Act|Public Order Act)\b[^\n]{0,20}\b\d{4}\b/i)?.[0] ??
      raw.match(/\bOAPA\s*1861\b/i)?.[0] ??
      raw.match(/\bTheft Act\s*1968\b/i)?.[0] ??
      null;

    // Attempt to pull a clean "s18" etc
    const section = raw.match(/\bs\.?\s*\d{1,3}[A-Za-z]*\b/i)?.[0] ?? null;
    const statuteNorm = statute ? statute.replace(/\s+/g, " ").trim() : section ? section : null;

    charges.push({
      count: 1,
      offence: raw.replace(/\s+/g, " ").trim(),
      statute: statuteNorm,
      plea,
      dateOfOffence: null,
      chargeDate: null,
      location: null,
      status: null,
      confidence: 0.65,
      source: documentName,
    });
  }

  // "Count X" / "Statement of offence" patterns common on charge sheets
  const countLine = /(?:^|\n)\s*(?:count\s*\d+|statement of offence)\s*[:\-]?\s*([^\n]{3,200})/gi;
  for (const m of t.matchAll(countLine)) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    // Avoid swallowing generic headings
    if (/^(date|time|place|defendant|court)\b/i.test(raw)) continue;

    const section = raw.match(/\b(?:s\.?|section)\s*\d{1,3}[A-Za-z]*\b/i)?.[0] ?? null;
    const act =
      raw.match(/\b(?:OAPA|Offences Against the Person Act|Theft Act|Public Order Act|Criminal Justice Act)\b[^\n]{0,20}\b\d{4}\b/i)?.[0] ??
      raw.match(/\bOAPA\s*1861\b/i)?.[0] ??
      raw.match(/\bTheft Act\s*1968\b/i)?.[0] ??
      null;
    const statuteNorm = act ? act.replace(/\s+/g, " ").trim() : section ? section.replace(/\s+/g, " ").trim() : null;

    charges.push({
      count: 1,
      offence: raw.replace(/\s+/g, " ").trim(),
      statute: statuteNorm,
      plea,
      dateOfOffence: null,
      chargeDate: null,
      location: null,
      status: null,
      confidence: 0.6,
      source: documentName,
    });
  }

  // Charge date line (used as a weak hint only)
  const chargeDateStr =
    pickFirstLineValue(t, /\bdate of charge\b\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ??
    pickFirstLineValue(t, /\bcharged on\b\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ??
    pickFirstLineValue(t, /\bcharge\s*date\b\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i) ??
    null;
  const parsedChargeDate = (() => {
    if (!chargeDateStr) return null;
    if (/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(chargeDateStr)) {
      const parts = chargeDateStr.split(/[\/\-.]/);
      return parts.length >= 3 ? parseDMY(parts[0], parts[1], parts[2]) : null;
    }
    const m = chargeDateStr.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
    return m ? parseDMonY(m[1], m[2], m[3]) : null;
  })();
  if (parsedChargeDate) {
    for (const c of charges) {
      if (!c.chargeDate) c.chargeDate = toIsoDateOnly(parsedChargeDate);
    }
  }

  // Section line (common: "Section: s.18 OAPA 1861" separate from offence line)
  const sectionLineVal =
    pickFirstLineValue(
      t,
      /\bsection\b\s*[:\-]?\s*((?:s\.?\s*\d{1,3}[A-Za-z]*\b[^\n]{0,40}(?:OAPA|Offences Against the Person Act|Theft Act|Public Order Act)[^\n]{0,20}\d{4})|(?:s\.?\s*\d{1,3}[A-Za-z]*\b))/i,
    ) ?? null;
  if (sectionLineVal) {
    const cleaned = sectionLineVal.split(";")[0]?.replace(/\s+/g, " ").trim();
    for (const c of charges) {
      if (!c.statute) c.statute = cleaned;
    }
  }

  // Location / status lines (sometimes semi-colon separated)
  const locationVal =
    pickFirstLineValue(t, /\blocation\b\s*[:\-]?\s*([^;\n]{3,120})/i) ??
    (t.match(/\blocation\b\s*[:\-]?\s*([^;\n]{3,120})/i)?.[1]?.trim() ?? null);
  const statusVal =
    pickFirstLineValue(t, /\bstatus\b\s*[:\-]?\s*([^;\n]{3,40})/i) ??
    (t.match(/\bstatus\b\s*[:\-]?\s*([^;\n]{3,40})/i)?.[1]?.trim() ?? null);
  if (locationVal || statusVal) {
    for (const c of charges) {
      if (locationVal && !c.location) c.location = locationVal.trim();
      if (statusVal && !c.status) c.status = statusVal.trim();
    }
  }

  // Section-only candidates (s18/s20/s47 etc)
  const sectionOnly = /\b(?:section|s\.?)\s*(18|20|47)\b[^\n]{0,60}\b(?:OAPA|Offences Against the Person Act|1861)\b/gi;
  for (const m of t.matchAll(sectionOnly)) {
    const sec = m[1] ? `s${m[1]}` : null;
    if (!sec) continue;
    const label =
      sec === "s18"
        ? "Wounding / causing GBH with intent"
        : sec === "s20"
          ? "Wounding / inflicting GBH (s.20)"
          : sec === "s47"
            ? "Assault occasioning actual bodily harm (ABH)"
            : `Offence ${sec}`;
    charges.push({
      count: 1,
      offence: label,
      statute: `${sec} OAPA 1861`,
      plea,
      dateOfOffence: null,
      chargeDate: null,
      location: locationVal ?? null,
      status: statusVal ?? null,
      confidence: 0.55,
      source: documentName,
    });
  }

  // De-dupe by offence+statute
  const seen = new Set<string>();
  const deduped: CriminalChargeExtract[] = [];
  for (const c of charges) {
    const k = `${safeLower(c.offence)}|${safeLower(c.statute ?? "")}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(c);
  }

  return { charges: deduped.slice(0, 10), plea };
}

function extractHearingsFromText(input: ExtractInput): CriminalHearingExtract[] {
  const { text, documentName, now = new Date() } = input;
  const t = text ?? "";
  const dates = findDates(t);
  if (dates.length === 0) return [];

  const hearings: CriminalHearingExtract[] = [];
  const lines = t.split(/\r?\n/).slice(0, 3000);

  const courtHint =
    pickFirstLineValue(t, /(.*?(?:Crown Court|Magistrates'? Court|Magistrates Court)[^\n]{0,80})/i) ??
    null;

  for (const line of lines) {
    const hasCourt = /crown court|magistrates'? court|magistrates court/i.test(line);
    const hasHearingWord = /\b(ptr|plea|trial|sentenc|first appearance|first hearing|case management|cmh|bail review|appeal)\b/i.test(line);
    const hasAppearedBefore = /appeared before/i.test(line);
    if (!(hasCourt || hasHearingWord || hasAppearedBefore)) continue;

    const dMatch =
      line.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/) ??
      line.match(/(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);

    if (!dMatch) continue;
    const dt = dMatch[3] && dMatch[2] && dMatch[1]
      ? (/\d{2,4}$/.test(dMatch[3]) && /\d{1,2}/.test(dMatch[2]) ? parseDMY(dMatch[1], dMatch[2], dMatch[3]) : parseDMonY(dMatch[1], dMatch[2], dMatch[3]))
      : null;
    if (!dt) continue;

    const type = normaliseHearingType(line);
    const court =
      (line.match(/([A-Za-z][A-Za-z\s&\-']{2,80}(?:Crown Court|Magistrates'? Court|Magistrates Court))/i)?.[1] ?? courtHint)?.trim() ?? null;

    const outcome =
      line.match(/\boutcome\b\s*[:\-]\s*(.+)$/i)?.[1]?.trim() ??
      (/(adjourned|remanded|listed|vacated|dismissed)/i.test(line) ? line.trim().slice(0, 140) : null);

    const status = dt.getTime() >= now.getTime() ? "UPCOMING" : "PAST";

    hearings.push({
      court,
      date: dt.toISOString(),
      type,
      outcome,
      status,
      source: documentName,
    });
  }

  // De-dupe by type+date+court
  const seen = new Set<string>();
  const out: CriminalHearingExtract[] = [];
  for (const h of hearings) {
    const k = `${h.type}|${h.date}|${safeLower(h.court ?? "")}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
  }

  return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 20);
}

function extractBailFromText(input: ExtractInput): CriminalBailExtract {
  const t = safeLower(input.text ?? "");
  const conditions: string[] = [];

  const status: CriminalBailExtract["status"] =
    t.includes("remanded in custody") || t.includes("remanded") ? "remanded" :
    t.includes("police bail") ? "police_bail" :
    t.includes("conditional bail") || t.includes("bailed") || t.includes("granted bail") ? "bailed" :
    null;

  const condKeywords: Array<{ k: string; label: string }> = [
    { k: "curfew", label: "Curfew" },
    { k: "reporting", label: "Reporting condition" },
    { k: "no contact", label: "No contact condition" },
    { k: "exclusion", label: "Exclusion zone" },
    { k: "surrender passport", label: "Surrender passport" },
    { k: "reside", label: "Residence requirement" },
  ];
  for (const c of condKeywords) {
    if (t.includes(c.k)) conditions.push(c.label);
  }

  const nextReviewDate =
    input.text.match(/bail review(?:\s+on|\s*[:\-])\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i) ??
    input.text.match(/bail review(?:\s+on|\s*[:\-])\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  const nextBailReview = nextReviewDate
    ? (nextReviewDate[3] && nextReviewDate[2] && nextReviewDate[1]
      ? (/\d{2,4}$/.test(nextReviewDate[3]) && /\d{1,2}/.test(nextReviewDate[2]) ? parseDMY(nextReviewDate[1], nextReviewDate[2], nextReviewDate[3]) : parseDMonY(nextReviewDate[1], nextReviewDate[2], nextReviewDate[3]))?.toISOString() ?? null
      : null)
    : null;

  const remandHoursMatch = input.text.match(/(\d{1,3})\s*hours?\s*(?:detention|detained)/i);
  const remandTimeHours = remandHoursMatch ? Number(remandHoursMatch[1]) : null;

  return { status, conditions: Array.from(new Set(conditions)).slice(0, 8), nextBailReview, remandTimeHours };
}

function extractPACEFromText(input: ExtractInput): CriminalPACEExtract {
  const t = safeLower(input.text ?? "");

  const custodyMissing = /custody record (?:not served|missing|not provided)|no custody record/i.test(t);
  const interviewMissing = /interview recording (?:not served|missing|not provided)|no interview recording/i.test(t);
  const legalAdviceMissing = /legal advice (?:log )?(?:missing|not served|not provided)|no legal advice/i.test(t);

  const custodyRecord = custodyMissing ? "missing" : /custody record/i.test(t) ? "present" : "unclear";
  const interviewRecording = interviewMissing ? "missing" : /(interview recording|tape|audio interview|video interview)/i.test(t) ? "present" : "unclear";
  const legalAdviceLog = legalAdviceMissing ? "missing" : /legal advice/i.test(t) ? "present" : "unclear";

  const breaches: string[] = [];
  if (custodyMissing) breaches.push("Custody record not served / missing");
  if (interviewMissing) breaches.push("Interview recording missing / not served");
  if (legalAdviceMissing) breaches.push("Legal advice log missing / unclear");

  const status: CriminalPACEExtract["status"] =
    breaches.length > 0 ? "issues_detected" :
    custodyRecord === "unclear" && interviewRecording === "unclear" && legalAdviceLog === "unclear" ? "unable_to_assess" :
    "ok";

  const breachSeverity: CriminalPACEExtract["breachSeverity"] =
    breaches.length >= 3 ? "CRITICAL" : breaches.length === 2 ? "HIGH" : breaches.length === 1 ? "MEDIUM" : null;

  return {
    custodyRecord,
    interviewRecording,
    legalAdviceLog,
    status,
    breachesDetected: breaches,
    breachSeverity,
  };
}

function extractDisclosureFromText(input: ExtractInput): CriminalDisclosureExtract {
  const t = safeLower(input.text ?? "");
  const mg6aMention = /mg6a|mg 6a/i.test(t);
  const mg6cMention = /mg6c|mg 6c/i.test(t);

  const mg6aNotServed = /mg6a[^\n]{0,40}(?:not served|missing|outstanding)|disclosure (?:not served|not provided)/i.test(input.text);
  const mg6cNotServed = /mg6c[^\n]{0,40}(?:not served|missing|outstanding)|unused material/i.test(input.text) && /not served|missing|outstanding/i.test(input.text);

  const mg6a: CriminalDisclosureExtract["mg6a"] = mg6aNotServed ? "not_served" : mg6aMention ? "served" : "unclear";
  const mg6c: CriminalDisclosureExtract["mg6c"] = mg6cNotServed ? "not_served" : mg6cMention ? "served" : "unclear";

  const timetableMention = /timetable|served by|to be served by|deadline/i.test(t);
  const timetableNotConfirmed = /timetable (?:not confirmed|unknown|unclear)/i.test(t);
  const timetable: CriminalDisclosureExtract["timetable"] =
    timetableNotConfirmed ? "not_confirmed" : timetableMention ? "confirmed" : "unclear";

  const deadlineMatch =
    input.text.match(/(?:served by|deadline)\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i) ??
    input.text.match(/(?:served by|deadline)\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  const deadline = deadlineMatch
    ? (deadlineMatch[3] && deadlineMatch[2] && deadlineMatch[1]
      ? (/\d{2,4}$/.test(deadlineMatch[3]) && /\d{1,2}/.test(deadlineMatch[2]) ? parseDMY(deadlineMatch[1], deadlineMatch[2], deadlineMatch[3]) : parseDMonY(deadlineMatch[1], deadlineMatch[2], deadlineMatch[3]))?.toISOString() ?? null
      : null)
    : null;

  const missingItems: string[] = [];
  if (mg6a === "not_served") missingItems.push("MG6A disclosure schedule");
  if (mg6c === "not_served") missingItems.push("MG6C unused material schedule");
  if (/cctv/i.test(t) && /not served|missing|clip only/i.test(t)) missingItems.push("CCTV (full window + native export + continuity)");
  if (/bwv|body worn/i.test(t) && /not served|missing/i.test(t)) missingItems.push("BWV (full)");
  if (/999/i.test(t) && /not served|missing/i.test(t)) missingItems.push("999 audio + CAD log");
  if (/custody record/i.test(t) && /not served|missing/i.test(t)) missingItems.push("Custody record");
  if (/interview/i.test(t) && /recording/i.test(t) && /not served|missing/i.test(t)) missingItems.push("Interview recording + transcript/log");

  const issues: string[] = [];
  if (missingItems.length > 0) issues.push("Disclosure appears incomplete (key items not evidenced as served)");
  if (/late disclosure|served late|overdue/i.test(t)) issues.push("Late disclosure indicators in bundle");

  const status: CriminalDisclosureExtract["status"] =
    missingItems.length > 0 ? "outstanding" : issues.length > 0 ? "issues_detected" : "ok";

  return {
    mg6a,
    mg6c,
    timetable,
    status,
    missingItems: Array.from(new Set(missingItems)).slice(0, 12),
    issues: issues.slice(0, 6),
    deadline,
  };
}

export function extractCriminalCaseMeta(input: ExtractInput): CriminalCaseMeta {
  const now = input.now ?? new Date();
  const text = input.text ?? "";

  const defendantName =
    pickFirstLineValue(text, /\bdefendant\b\s*[:\-]\s*([A-Za-z][A-Za-z\s'\-]{2,80})/i) ??
    null;

  const { charges, plea } = extractChargesFromText(input);
  const hearings = extractHearingsFromText({ ...input, now });

  const nextHearing =
    hearings.filter((h) => h.status === "UPCOMING").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date ??
    null;

  const bail = extractBailFromText(input);
  const pace = extractPACEFromText(input);
  const disclosure = extractDisclosureFromText(input);

  const keyFacts: string[] = [];
  if (defendantName) keyFacts.push(`Defendant: ${defendantName}`);
  if (charges[0]?.offence) keyFacts.push(`Offence: ${charges[0].offence}`);
  if (plea) keyFacts.push(`Plea: ${plea.replace(/_/g, " ")}`);
  if (nextHearing) keyFacts.push(`Next hearing: ${new Date(nextHearing).toISOString().slice(0, 10)}`);

  // Ensure never-empty, never-throw
  if (keyFacts.length === 0) {
    keyFacts.push("Criminal key facts not yet evidenced in bundle (upload MG forms / court listing / custody record).");
  }

  return {
    defendantName,
    charges,
    hearings,
    nextHearing,
    bail,
    pace,
    disclosure,
    keyFacts,
  };
}

export async function persistCriminalCaseMeta(params: {
  supabase: SupabaseClient;
  caseId: string;
  orgId: string;
  meta: CriminalCaseMeta;
  sourceDocumentId?: string;
  sourceDocumentName?: string;
}): Promise<void> {
  const { supabase, caseId, orgId, meta } = params;

  // 1) Ensure criminal_cases row exists
  await supabase.from("criminal_cases").upsert(
    {
      id: caseId,
      org_id: orgId,
      defendant_name: meta.defendantName,
      bail_status: meta.bail.status,
      bail_conditions: meta.bail.conditions,
      next_bail_review: meta.bail.nextBailReview,
      remand_time_hours: meta.bail.remandTimeHours,
      next_hearing_date: meta.nextHearing,
      next_hearing_type: meta.hearings.find((h) => h.date === meta.nextHearing)?.type ?? null,
      plea: meta.charges[0]?.plea ?? null,
    },
    { onConflict: "id" },
  );

  // 2) Insert new charges (no schema unique constraint, so de-dupe manually)
  const { data: existingCharges } = await supabase
    .from("criminal_charges")
    .select("id, offence, section, charge_date, location, status")
    .eq("case_id", caseId)
    .eq("org_id", orgId);

  const existing = existingCharges ?? [];
  const findMatch = (ch: CriminalChargeExtract): any | null => {
    const offence = safeLower(ch.offence);
    const section = safeLower(ch.statute ?? "");
    const date = String(ch.chargeDate ?? "");
    // Prefer strict match including date; fall back to offence+section if date missing
    return (
      existing.find(
        (c: any) =>
          safeLower(c.offence) === offence &&
          safeLower(c.section ?? "") === section &&
          String(c.charge_date ?? "") === date,
      ) ??
      (date ? null : existing.find((c: any) => safeLower(c.offence) === offence && safeLower(c.section ?? "") === section)) ??
      null
    );
  };

  for (const ch of meta.charges) {
    const match = findMatch(ch);

    const nextStatus = (ch.status ?? null) ? String(ch.status).toLowerCase().replace(/\s+/g, "_") : null;
    const nextLocation = ch.location ? String(ch.location).trim() : null;

    if (match?.id) {
      const { error: updateErr } = await supabase
        .from("criminal_charges")
        .update({
          offence: ch.offence,
          section: ch.statute,
          charge_date: ch.chargeDate,
          location: nextLocation ?? match.location ?? null,
          status: nextStatus ?? match.status ?? null,
          details: `[AUTO_EXTRACTED] source=${ch.source}; confidence=${ch.confidence}`,
        })
        .eq("id", match.id)
        .eq("case_id", caseId);

      if (updateErr) {
        console.error("[criminal] Failed to update charge (non-fatal):", updateErr);
      }
      continue;
    }

    const { error: insertErr } = await supabase.from("criminal_charges").insert({
      case_id: caseId,
      org_id: orgId,
      offence: ch.offence,
      section: ch.statute,
      charge_date: ch.chargeDate,
      location: nextLocation,
      details: `[AUTO_EXTRACTED] source=${ch.source}; confidence=${ch.confidence}`,
      status: nextStatus ?? "proceeding",
    });
    if (insertErr) {
      console.error("[criminal] Failed to insert charge (non-fatal):", insertErr);
    }
  }

  // 3) Insert new hearings
  const { data: existingHearings } = await supabase
    .from("criminal_hearings")
    .select("id, hearing_type, hearing_date, court_name")
    .eq("case_id", caseId)
    .eq("org_id", orgId);

  const existingHearingKey = new Set(
    (existingHearings ?? []).map((h: any) => `${String(h.hearing_type)}|${String(h.hearing_date)}|${safeLower(h.court_name ?? "")}`),
  );

  for (const h of meta.hearings) {
    const key = `${h.type}|${h.date}|${safeLower(h.court ?? "")}`;
    if (existingHearingKey.has(key)) continue;
    await supabase.from("criminal_hearings").insert({
      case_id: caseId,
      org_id: orgId,
      hearing_type: h.type,
      hearing_date: h.date,
      court_name: h.court,
      outcome: h.outcome,
      notes: `[AUTO_EXTRACTED] source=${h.source}`,
    });
  }

  // 4) PACE compliance (single row)
  const breaches = meta.pace.breachesDetected;
  const breachSeverity = meta.pace.breachSeverity;
  await supabase.from("pace_compliance").upsert(
    {
      case_id: caseId,
      org_id: orgId,
      interview_recorded: meta.pace.interviewRecording === "missing" ? false : meta.pace.interviewRecording === "present" ? true : null,
      right_to_solicitor: meta.pace.legalAdviceLog === "missing" ? null : null,
      breaches_detected: breaches,
      breach_severity: breachSeverity,
      notes: `[AUTO_EXTRACTED] custodyRecord=${meta.pace.custodyRecord}; legalAdviceLog=${meta.pace.legalAdviceLog}`,
    },
    { onConflict: "case_id" },
  );

  // 5) Disclosure tracker (single row)
  await supabase.from("disclosure_tracker").upsert(
    {
      case_id: caseId,
      org_id: orgId,
      initial_disclosure_received: meta.disclosure.status === "ok",
      initial_disclosure_date: null,
      full_disclosure_received: meta.disclosure.status === "ok",
      full_disclosure_date: null,
      missing_items: meta.disclosure.missingItems,
      disclosure_requested: /requested|chased/i.test(params.sourceDocumentName ?? "") ? true : false,
      disclosure_request_date: null,
      disclosure_deadline: meta.disclosure.deadline ? toIsoDateOnly(new Date(meta.disclosure.deadline)) : null,
      late_disclosure: meta.disclosure.issues.some((i) => safeLower(i).includes("late")),
      incomplete_disclosure: meta.disclosure.missingItems.length > 0,
      disclosure_issues: meta.disclosure.issues,
      notes: `[AUTO_EXTRACTED] mg6a=${meta.disclosure.mg6a}; mg6c=${meta.disclosure.mg6c}; timetable=${meta.disclosure.timetable}`,
    },
    { onConflict: "case_id" },
  );

  // 6) Update next hearing on criminal_cases from DB (authoritative across all hearings)
  const { data: allHearings } = await supabase
    .from("criminal_hearings")
    .select("hearing_date, hearing_type")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("hearing_date", { ascending: true });

  const now = new Date();
  const next = (allHearings ?? []).find((h: any) => new Date(h.hearing_date).getTime() >= now.getTime());

  if (next) {
    await supabase
      .from("criminal_cases")
      .update({ next_hearing_date: next.hearing_date, next_hearing_type: next.hearing_type })
      .eq("id", caseId)
      .eq("org_id", orgId);
  }
}


