/**
 * Attribution model: who a count, an exhibit, a device, an account or a message
 * belongs to.
 *
 * Fail-closed rules:
 * - The defendant roster comes ONLY from supported charge/indictment/defendant
 *   metadata — never from complainants, witnesses, officers, custody staff,
 *   organisations or surrounding prose.
 * - Evidence rows receive defendant scope only from an explicit same-document /
 *   same-span relationship; otherwise scope is unallocated / not_established.
 * - Never broadcast a case-level person list onto every evidence row.
 * - Device ownership, account association and message authorship are independently
 *   sourced; authorship is NEVER inferred from possession or account association.
 */

export type AttributionBasis =
  | "explicit_statement"
  | "document_heading"
  | "charge_instrument"
  | "not_established";

export type AttributionRecord = {
  subject: string;
  person: string | null;
  basis: AttributionBasis;
  sourceDocumentTitle: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  limitation: string | null;
};

export type CountAllocation = {
  countNumber: number;
  defendants: string[];
  sourceDocumentTitle: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  unallocated: boolean;
};

export type CoDefendantContamination = {
  subject: string;
  defendant: string;
  otherDefendants: string[];
  warning: string;
  sourceDocumentTitle: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
};

export type AttributionModel = {
  /** Roster from charge/indictment instruments only. */
  defendants: string[];
  countAllocations: CountAllocation[];
  deviceOwnership: AttributionRecord[];
  accountAssociation: AttributionRecord[];
  messageAuthorship: AttributionRecord[];
  contamination: CoDefendantContamination[];
};

export type AttributionPageInput = {
  text: string;
  sourceDocumentTitle: string | null;
  sourceDocumentType?: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
};

export const AUTHORSHIP_NOT_ESTABLISHED_LIMITATION =
  "Device possession or account association does not establish who wrote an individual message — authorship is not established on current material";

export const CO_DEFENDANT_CONTAMINATION_WARNING =
  "Material names more than one defendant — do not carry this across to another defendant without separate evidence";

export const UNALLOCATED_EVIDENCE_SCOPE = "unallocated";

const NAME = "[A-Z][a-z]+(?:\\s+[A-Z][a-z'’\\-]+){1,2}";

/** Roles that are NEVER defendants, even when a capitalised name appears nearby. */
const NON_DEFENDANT_ROLE_PATTERNS: RegExp[] = [
  /\b(complainant|victim|injured\s+party|witness|civilian\s+witness)\b/i,
  /\b(officer|constable|pc\b|dc\b|ds\b|di\b|sgt|sergeant|inspector|custody\s+(?:sgt|sergeant|officer|staff))\b/i,
  /\b(prosecutor|cps|crown\s+prosecutor|defence\s+solicitor|counsel)\b/i,
  /\b(doctor|nurse|clinician|paramedic|hospital|trust|constabulary|police|force|unit|court|service)\b/i,
];

const ORGANISATION_PATTERNS: RegExp[] = [
  /\b(constabulary|police|force|nhs|hospital|trust|cps|hmcts|courts?\s*&\s*tribunals|university|council|limited|ltd|plc)\b/i,
];

const DEVICE_OWNERSHIP_PATTERNS: RegExp[] = [
  new RegExp(
    `\\b(?:handset|phone|mobile|device|telephone)\\b[^.\\n]{0,40}?\\b(?:attributed to|belonging to|owned by|recovered from|seized from|in the possession of)\\s+(${NAME})`,
    "g",
  ),
  new RegExp(`\\b(${NAME})['’]s\\s+(?:handset|phone|mobile|device|telephone)\\b`, "g"),
];

const ACCOUNT_PATTERNS: RegExp[] = [
  new RegExp(
    `\\b(?:subscriber|account|sim|number)\\b[^.\\n]{0,40}?\\b(?:registered to|in the name of|held by|subscribed to)\\s+(${NAME})`,
    "g",
  ),
];

const AUTHORSHIP_PATTERNS: RegExp[] = [
  new RegExp(
    `\\b(?:message|text|sms|whatsapp|email)\\b[^.\\n]{0,40}?\\b(?:sent by|written by|authored by|composed by)\\s+(${NAME})`,
    "g",
  ),
  new RegExp(`^\\s*From:\\s*(${NAME})\\s*$`, "gm"),
];

const AUTHORSHIP_DISCLAIMED =
  /\b(?:author(?:ship)?|sender|who\s+sent)\b[^.\n]{0,60}\b(?:cannot be|could not be|not|unable to be)\s+(?:established|determined|attributed|identified)\b/i;

/**
 * Charge/indictment defendant patterns. Scoped to charge-instrument language so a
 * witness-statement name cannot enter the roster.
 */
const CHARGE_DEFENDANT_PATTERNS: RegExp[] = [
  new RegExp(`\\b(${NAME})\\s+is charged\\b`, "g"),
  new RegExp(`\\bDefendant(?:s)?\\s*:\\s*(${NAME}(?:\\s*(?:and|&|,)\\s*${NAME})*)`, "gi"),
  new RegExp(`\\bR\\s*v\\s+(${NAME}(?:\\s*(?:and|&)\\s*${NAME})?)\\b`, "g"),
  new RegExp(`\\bcount\\s+(\\d{1,3})\\b[^.\\n]{0,80}?\\bagainst\\s+(${NAME})\\b`, "gi"),
  new RegExp(`\\b(${NAME})\\b[^.\\n]{0,40}?\\bis charged\\b[^.\\n]{0,40}?\\bcount\\s+(\\d{1,3})\\b`, "gi"),
  new RegExp(`\\bcount\\s+(\\d{1,3})\\b[^.\\n]{0,80}?\\b(${NAME})\\s+is charged\\b`, "gi"),
];

const COUNT_HEADING = /\bcount\s+(\d{1,3})\b/gi;

const CHARGE_INSTRUMENT_TYPES = new Set([
  "indictment",
  "charge_sheet",
  "charge_instrument",
  "information",
]);

const NON_NAME_TOKENS = new Set(
  [
    "contrary", "act", "section", "count", "counts", "crown", "court", "police", "station",
    "exhibit", "exhibits", "statement", "notice", "hearing", "trial", "indictment", "charge",
    "particulars", "offence", "robbery", "assault", "theft", "burglary", "fraud", "possession",
    "occasioning", "bodily", "harm", "grievous", "actual", "criminal", "damage", "public",
    "order", "magistrates", "prosecution", "defence", "defendant", "witness", "custody",
    "interview", "disclosure", "schedule", "bundle", "report", "record", "download",
    "digital", "case", "file", "official", "compiled", "page", "source",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "sergeant", "constable", "inspector", "officer", "doctor", "nurse",
  ].map((t) => t.toLowerCase()),
);

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

/** Reject OCR-concatenated / role-glued candidates such as "recordedSgt RoweCustody system". */
export function isMalformedPersonCandidate(candidate: string): boolean {
  const t = candidate.trim();
  if (!t) return true;
  if (t.length > 48) return true;
  // camelCase / glued capitals inside a single token (not across spaces).
  for (const token of t.split(/\s+/)) {
    if (/[a-z][A-Z]/.test(token)) return true;
    if (/[0-9_/\\|()]/.test(token)) return true;
  }
  // Role words glued onto a single token.
  if (/\b(sgt|sergeant|custody|recorded|system|officer|pc|dc)\b/i.test(t) && t.split(/\s+/).length === 1) {
    return true;
  }
  if (ORGANISATION_PATTERNS.some((re) => re.test(t))) return true;
  return false;
}

export function looksLikePersonName(candidate: string): boolean {
  if (isMalformedPersonCandidate(candidate)) return false;
  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return tokens.every((t) => {
    const clean = t.toLowerCase().replace(/[^a-z]/g, "");
    return clean.length >= 2 && !NON_NAME_TOKENS.has(clean);
  });
}

function pageHasNonDefendantRole(text: string): boolean {
  // Only the local span around a name matters — checked per candidate below.
  return NON_DEFENDANT_ROLE_PATTERNS.some((re) => re.test(text));
}

/**
 * True when the name appears in a span that labels them as complainant / officer /
 * organisation rather than as a charged defendant.
 */
export function nameHasNonDefendantRole(name: string, text: string): boolean {
  const re = new RegExp(
    `.{0,40}\\b${escapeRegExp(name)}\\b.{0,40}`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const span = m[0];
    if (NON_DEFENDANT_ROLE_PATTERNS.some((r) => r.test(span))) return true;
    if (ORGANISATION_PATTERNS.some((r) => r.test(span))) return true;
  }
  return false;
}

function isChargeInstrumentPage(page: AttributionPageInput): boolean {
  const type = (page.sourceDocumentType ?? "").toLowerCase();
  if (CHARGE_INSTRUMENT_TYPES.has(type)) return true;
  const title = (page.sourceDocumentTitle ?? "").toLowerCase();
  if (/\b(indictment|charge\s*sheet)\b/.test(title)) return true;
  // First 400 chars of an indictment-style page.
  const head = page.text.slice(0, 400);
  return /\bindictment\b/i.test(head) || /\bcharge\s*sheet\b/i.test(head);
}

function collect(patterns: RegExp[], text: string, group = 1): string[] {
  const out: string[] = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = m[group]?.trim();
      if (value && looksLikePersonName(value) && !nameHasNonDefendantRole(value, text)) {
        out.push(value);
      }
    }
  }
  return uniq(out);
}

function splitDefendantList(raw: string): string[] {
  return uniq(
    raw
      .split(/\s*(?:and|&|,)\s*/i)
      .map((s) => s.trim())
      .filter((s) => looksLikePersonName(s)),
  );
}

function record(
  subject: string,
  person: string | null,
  basis: AttributionBasis,
  page: AttributionPageInput,
  limitation: string | null,
): AttributionRecord {
  return {
    subject,
    person,
    basis,
    sourceDocumentTitle: page.sourceDocumentTitle,
    sourcePage: page.sourcePage,
    compiledPage: page.compiledPage,
    pageIdentityKnown: page.pageIdentityKnown,
    limitation,
  };
}

/**
 * Build the attribution model from page units.
 * `knownDefendants` may seed the roster only when the caller already extracted them
 * from charge instruments — never from a free-text person list.
 */
export function buildAttributionModel(
  pages: AttributionPageInput[],
  knownDefendants: string[] = [],
): AttributionModel {
  const deviceOwnership: AttributionRecord[] = [];
  const accountAssociation: AttributionRecord[] = [];
  const messageAuthorship: AttributionRecord[] = [];
  const countAllocations: CountAllocation[] = [];
  const contamination: CoDefendantContamination[] = [];
  const defendants = new Set(
    knownDefendants
      .map((d) => d.trim())
      .filter((d) => looksLikePersonName(d)),
  );

  for (const page of pages) {
    const text = page.text;

    // Roster + count allocation: charge instruments ONLY.
    if (isChargeInstrumentPage(page)) {
      for (const re of CHARGE_DEFENDANT_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          // Patterns either capture (name) or (count, name) / (name, count).
          const g1 = m[1]?.trim() ?? "";
          const g2 = m[2]?.trim() ?? "";
          if (/^\d+$/.test(g1) && g2) {
            if (!looksLikePersonName(g2) || nameHasNonDefendantRole(g2, text)) continue;
            defendants.add(g2);
            const count = parseInt(g1, 10);
            countAllocations.push({
              countNumber: count,
              defendants: [g2],
              sourceDocumentTitle: page.sourceDocumentTitle,
              sourcePage: page.sourcePage,
              compiledPage: page.compiledPage,
              pageIdentityKnown: page.pageIdentityKnown,
              unallocated: false,
            });
          } else if (/^\d+$/.test(g2) && g1) {
            if (!looksLikePersonName(g1) || nameHasNonDefendantRole(g1, text)) continue;
            defendants.add(g1);
            countAllocations.push({
              countNumber: parseInt(g2, 10),
              defendants: [g1],
              sourceDocumentTitle: page.sourceDocumentTitle,
              sourcePage: page.sourcePage,
              compiledPage: page.compiledPage,
              pageIdentityKnown: page.pageIdentityKnown,
              unallocated: false,
            });
          } else if (g1) {
            for (const name of splitDefendantList(g1)) {
              if (nameHasNonDefendantRole(name, text)) continue;
              defendants.add(name);
            }
          }
        }
      }

      // Counts with no named defendant stay explicitly unallocated.
      COUNT_HEADING.lastIndex = 0;
      let h: RegExpExecArray | null;
      while ((h = COUNT_HEADING.exec(text)) !== null) {
        const count = parseInt(h[1] ?? "", 10);
        if (!Number.isFinite(count) || count <= 0) continue;
        if (!countAllocations.some((a) => a.countNumber === count)) {
          countAllocations.push({
            countNumber: count,
            defendants: [],
            sourceDocumentTitle: page.sourceDocumentTitle,
            sourcePage: page.sourcePage,
            compiledPage: page.compiledPage,
            pageIdentityKnown: page.pageIdentityKnown,
            unallocated: true,
          });
        }
      }
    }

    // Device / account / authorship are independently sourced and do NOT enter the
    // defendant roster.
    for (const owner of collect(DEVICE_OWNERSHIP_PATTERNS, text)) {
      deviceOwnership.push(record("device", owner, "explicit_statement", page, null));
    }
    for (const holder of collect(ACCOUNT_PATTERNS, text)) {
      accountAssociation.push(record("account", holder, "explicit_statement", page, null));
    }

    const authors = AUTHORSHIP_DISCLAIMED.test(text) ? [] : collect(AUTHORSHIP_PATTERNS, text);
    for (const author of authors) {
      messageAuthorship.push(record("message", author, "explicit_statement", page, null));
    }
    const mentionsMessages = /\b(messages?|texts?|sms|whatsapp|chats?|emails?)\b/i.test(text);
    if (mentionsMessages && authors.length === 0) {
      messageAuthorship.push(
        record("message", null, "not_established", page, AUTHORSHIP_NOT_ESTABLISHED_LIMITATION),
      );
    }
  }

  const roster = Array.from(defendants);

  // Contamination only among roster defendants named on the same page.
  for (const page of pages) {
    const named = uniq(
      roster.filter((d) => new RegExp(`\\b${escapeRegExp(d)}\\b`).test(page.text)),
    );
    if (named.length < 2) continue;
    for (const defendant of named) {
      contamination.push({
        subject: page.sourceDocumentTitle ?? "document",
        defendant,
        otherDefendants: named.filter((n) => n !== defendant),
        warning: CO_DEFENDANT_CONTAMINATION_WARNING,
        sourceDocumentTitle: page.sourceDocumentTitle,
        sourcePage: page.sourcePage,
        compiledPage: page.compiledPage,
        pageIdentityKnown: page.pageIdentityKnown,
      });
    }
  }

  return {
    defendants: roster,
    countAllocations: mergeCountAllocations(countAllocations),
    deviceOwnership,
    accountAssociation,
    messageAuthorship,
    contamination,
  };
}

function mergeCountAllocations(allocations: CountAllocation[]): CountAllocation[] {
  const byCount = new Map<number, CountAllocation>();
  for (const alloc of allocations) {
    const existing = byCount.get(alloc.countNumber);
    if (!existing) {
      byCount.set(alloc.countNumber, { ...alloc });
      continue;
    }
    const defendantsMerged = uniq([...existing.defendants, ...alloc.defendants]);
    const preferred = existing.defendants.length ? existing : alloc;
    byCount.set(alloc.countNumber, {
      ...preferred,
      defendants: defendantsMerged,
      unallocated: defendantsMerged.length === 0,
    });
  }
  return Array.from(byCount.values()).sort((a, b) => a.countNumber - b.countNumber);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function authorshipVerdict(
  model: AttributionModel,
  person: string,
): { attributed: boolean; basis: AttributionBasis; limitation: string | null } {
  const express = model.messageAuthorship.find(
    (m) => m.person === person && m.basis === "explicit_statement",
  );
  if (express) return { attributed: true, basis: "explicit_statement", limitation: null };

  const ownsDevice = model.deviceOwnership.some((d) => d.person === person);
  const holdsAccount = model.accountAssociation.some((a) => a.person === person);
  if (ownsDevice || holdsAccount) {
    return {
      attributed: false,
      basis: "not_established",
      limitation: AUTHORSHIP_NOT_ESTABLISHED_LIMITATION,
    };
  }
  return { attributed: false, basis: "not_established", limitation: null };
}

/**
 * Defendant scope for one evidence row.
 *
 * Fail-closed: only names from the charge roster that also appear in the SAME
 * supporting span (row label + its own source document text) are returned.
 * Passing the whole bundle text is forbidden — that was the Round-1 broadcast bug.
 */
export function defendantScopeForLabel(
  label: string,
  sameDocumentOrSpanText: string,
  defendants: string[],
): string[] {
  if (!defendants.length) return [];
  const hay = `${label}\n${sameDocumentOrSpanText}`;
  return defendants.filter((d) => {
    if (!looksLikePersonName(d)) return false;
    if (nameHasNonDefendantRole(d, hay)) return false;
    return new RegExp(`\\b${escapeRegExp(d)}\\b`).test(hay);
  });
}

/** Explicit empty scope marker for surfaces that must show unallocated rather than invent. */
export function evidenceScopeOrUnallocated(scope: string[]): string[] {
  return scope.length ? scope : [];
}
