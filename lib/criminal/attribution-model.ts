/**
 * Attribution model: who a count, an exhibit, a device, an account or a message
 * belongs to.
 *
 * The controlling rule is separation. Owning a handset is not the same as holding the
 * account, and neither establishes who wrote an individual message. Each link is only
 * asserted when the papers say so, and authorship is NEVER inferred from possession or
 * from account association — that inference is the classic route to attributing a
 * co-defendant's messages to the wrong person.
 */

export type AttributionBasis =
  | "explicit_statement"
  | "document_heading"
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
  /** True when the instrument does not say who the count is against. */
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

/** Limitation attached whenever possession/account is known but authorship is not. */
export const AUTHORSHIP_NOT_ESTABLISHED_LIMITATION =
  "Device possession or account association does not establish who wrote an individual message — authorship is not established on current material";

export const CO_DEFENDANT_CONTAMINATION_WARNING =
  "Material names more than one defendant — do not carry this across to another defendant without separate evidence";

const NAME = "[A-Z][a-z]+(?:\\s+[A-Z][a-z'’\\-]+){1,2}";

const DEVICE_OWNERSHIP_PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:handset|phone|mobile|device|telephone)\\b[^.\\n]{0,40}?\\b(?:attributed to|belonging to|owned by|recovered from|seized from|in the possession of)\\s+(${NAME})`, "g"),
  new RegExp(`\\b(${NAME})['’]s\\s+(?:handset|phone|mobile|device|telephone)\\b`, "g"),
];

const ACCOUNT_PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:subscriber|account|sim|number)\\b[^.\\n]{0,40}?\\b(?:registered to|in the name of|held by|subscribed to)\\s+(${NAME})`, "g"),
];

const AUTHORSHIP_PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:message|text|sms|whatsapp|email)\\b[^.\\n]{0,40}?\\b(?:sent by|written by|authored by|composed by)\\s+(${NAME})`, "g"),
  new RegExp(`^\\s*From:\\s*(${NAME})\\s*$`, "gm"),
];

/** Statements that expressly decline to attribute authorship. */
const AUTHORSHIP_DISCLAIMED = /\b(?:author(?:ship)?|sender|who\s+sent)\b[^.\n]{0,60}\b(?:cannot be|could not be|not|unable to be)\s+(?:established|determined|attributed|identified)\b/i;

const COUNT_DEFENDANT_PATTERNS: RegExp[] = [
  new RegExp(`\\bcount\\s+(\\d{1,3})\\b[^.\\n]{0,80}?\\b(${NAME})\\b`, "gi"),
  new RegExp(`\\b(${NAME})\\b[^.\\n]{0,40}?\\bis charged\\b[^.\\n]{0,40}?\\bcount\\s+(\\d{1,3})\\b`, "gi"),
];

const COUNT_HEADING = /\bcount\s+(\d{1,3})\b/gi;

/**
 * Capitalised legal boilerplate reads exactly like a name to a pattern matcher.
 * Rejecting these keeps offence wording and court furniture out of the defendant list.
 */
const NON_NAME_TOKENS = new Set(
  [
    "contrary", "act", "section", "count", "counts", "crown", "court", "police", "station",
    "exhibit", "exhibits", "statement", "notice", "hearing", "trial", "indictment", "charge",
    "particulars", "offence", "robbery", "assault", "theft", "burglary", "fraud", "possession",
    "occasioning", "bodily", "harm", "grievous", "actual", "criminal", "damage", "public",
    "order", "magistrates", "prosecution", "defence", "defendant", "witness", "custody",
    "interview", "disclosure", "schedule", "bundle", "report", "record", "download",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
  ].map((t) => t.toLowerCase()),
);

function looksLikePersonName(candidate: string): boolean {
  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  return tokens.every((t) => !NON_NAME_TOKENS.has(t.toLowerCase().replace(/[^a-z]/g, "")));
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function collect(patterns: RegExp[], text: string, group = 1): string[] {
  const out: string[] = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = m[group]?.trim();
      if (value && looksLikePersonName(value)) out.push(value);
    }
  }
  return uniq(out);
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
 * `knownDefendants` seeds contamination checks when the defendant list is already
 * established from charge instruments.
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
  const defendants = new Set(knownDefendants.map((d) => d.trim()).filter(Boolean));

  for (const page of pages) {
    const text = page.text;

    for (const owner of collect(DEVICE_OWNERSHIP_PATTERNS, text)) {
      defendants.add(owner);
      deviceOwnership.push(record("device", owner, "explicit_statement", page, null));
    }

    for (const holder of collect(ACCOUNT_PATTERNS, text)) {
      defendants.add(holder);
      accountAssociation.push(record("account", holder, "explicit_statement", page, null));
    }

    const authors = AUTHORSHIP_DISCLAIMED.test(text) ? [] : collect(AUTHORSHIP_PATTERNS, text);
    for (const author of authors) {
      defendants.add(author);
      messageAuthorship.push(record("message", author, "explicit_statement", page, null));
    }

    // Possession/account without an express author must be recorded as unattributed,
    // otherwise a downstream surface will quietly treat the owner as the sender.
    const mentionsMessages = /\b(message|text|sms|whatsapp|chat|email)\b/i.test(text);
    if (mentionsMessages && authors.length === 0) {
      messageAuthorship.push(
        record("message", null, "not_established", page, AUTHORSHIP_NOT_ESTABLISHED_LIMITATION),
      );
    }

    for (const alloc of readCountAllocations(text, page)) {
      countAllocations.push(alloc);
      // Someone named as charged on a count is a defendant for scoping purposes.
      for (const name of alloc.defendants) defendants.add(name);
    }
  }

  // Contamination: a page that names several defendants alongside attributable material.
  for (const page of pages) {
    const named = uniq(
      Array.from(defendants).filter((d) => new RegExp(`\\b${escapeRegExp(d)}\\b`).test(page.text)),
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
    defendants: Array.from(defendants),
    countAllocations: mergeCountAllocations(countAllocations),
    deviceOwnership,
    accountAssociation,
    messageAuthorship,
    contamination,
  };
}

function readCountAllocations(text: string, page: AttributionPageInput): CountAllocation[] {
  const byCount = new Map<number, string[]>();

  for (const re of COUNT_DEFENDANT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const countRaw = /^\d+$/.test(m[1] ?? "") ? m[1] : m[2];
      const nameRaw = /^\d+$/.test(m[1] ?? "") ? m[2] : m[1];
      const count = parseInt(countRaw ?? "", 10);
      if (!Number.isFinite(count) || count <= 0 || !nameRaw) continue;
      if (!looksLikePersonName(nameRaw.trim())) continue;
      const existing = byCount.get(count) ?? [];
      byCount.set(count, uniq([...existing, nameRaw]));
    }
  }

  // Counts present on the page but with no defendant named stay explicitly unallocated.
  COUNT_HEADING.lastIndex = 0;
  let h: RegExpExecArray | null;
  while ((h = COUNT_HEADING.exec(text)) !== null) {
    const count = parseInt(h[1] ?? "", 10);
    if (!Number.isFinite(count) || count <= 0) continue;
    if (!byCount.has(count)) byCount.set(count, []);
  }

  return Array.from(byCount.entries()).map(([countNumber, names]) => ({
    countNumber,
    defendants: names,
    sourceDocumentTitle: page.sourceDocumentTitle,
    sourcePage: page.sourcePage,
    compiledPage: page.compiledPage,
    pageIdentityKnown: page.pageIdentityKnown,
    unallocated: names.length === 0,
  }));
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
    // Prefer the allocation that actually names a defendant, and keep its provenance.
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

/**
 * Authorship verdict for a device/account holder.
 * Returns `attributed` only where an express authorship record exists for that person.
 */
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

/** Defendant scope for an evidence/chase row, from explicit naming only. */
export function defendantScopeForLabel(
  label: string,
  text: string,
  defendants: string[],
): string[] {
  const hay = `${label} ${text}`;
  return defendants.filter((d) => new RegExp(`\\b${escapeRegExp(d)}\\b`).test(hay));
}
