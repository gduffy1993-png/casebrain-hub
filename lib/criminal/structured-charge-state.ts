/**
 * Shared structured charge display/status contracts.
 * Generic rules only — no fixture- or matter-specific branches.
 */

export type ChargeDocumentRole = "operative" | "amended" | "superseded" | "unknown";

export type StructuredChargeView = {
  count: number;
  offence: string;
  statute: string | null;
  particulars: string | null;
  location: string | null;
  status: string;
  defendants: string[];
  documentRole: ChargeDocumentRole;
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  /** False when the instrument was supplied as unsplit whole-document text. */
  pageIdentityKnown: boolean;
  confidence: number | null;
  extracted: boolean;
  /** Display confirmation — never CONFIRMED while status remains pending. */
  confirmationLabel: "confirmed" | "unconfirmed" | "pending";
};

const CORRUPT_LOCATION_RE =
  /positions?\s+\w+\s+denies|denies\s+taking|[\uFFFD]|[^\w\s,.\-'/()]{3,}|\b(?:undefined|null|NaN)\b/i;

/** Reject OCR/garbage location strings so they cannot render. */
export function sanitizeChargeLocation(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length < 3 || t.length > 160) return null;
  if (/^[,;:]/.test(t)) return null;
  if (/[,;:]$/.test(t) || /\b(?:the|a|an)$/.test(t)) return null;
  if (CORRUPT_LOCATION_RE.test(t)) return null;
  if (/\b(?:not every element|served papers|bundle text|charge wording|allegation chronology)\b/i.test(t)) return null;
  // Mid-word cuts / glued OCR junk
  if (/\b[a-z]{1,2}[A-Z][a-z]/.test(t) && t.split(/\s+/).length < 3) return null;
  if (!/[A-Za-z]{3,}/.test(t)) return null;
  // Reject status-like values mistaken for place
  if (/^(pending|confirmed|proceeding|draft|operative|superseded)$/i.test(t)) return null;
  return t;
}

export function parseCountNumber(raw: string | null | undefined, fallbackIndex = 0): number {
  if (!raw) return fallbackIndex + 1;
  const m = String(raw).match(/\bcount\s*(\d+)\b/i) ?? String(raw).match(/^(\d+)\b/);
  if (m?.[1]) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }
  return fallbackIndex + 1;
}

export function inferChargeDocumentRole(hay: string): ChargeDocumentRole {
  const t = hay.toLowerCase();
  if (/\bsuperseded\b|\breplaced by\b|\boriginal indictment\b|\bdraft charge\b/.test(t)) {
    return "superseded";
  }
  if (/\bamended (?:indictment|charge|information)\b|\bamending\b/.test(t)) {
    return "amended";
  }
  if (/\boperative charge\b|\bcharge sheet\b|\bindictment\b/.test(t)) {
    return "operative";
  }
  return "unknown";
}

/**
 * Extract defendant name tokens allocated to a count line.
 * Generic: looks for "Name is charged" / "against Name" / leading proper names before offence.
 */
export function allocateDefendantsFromChargeText(
  offenceLine: string,
  knownDefendants: string[] = [],
): string[] {
  const line = offenceLine.replace(/\s+/g, " ").trim();
  if (!line) return [];

  const allocated: string[] = [];
  for (const name of knownDefendants) {
    const n = name.trim();
    if (n.length < 2) continue;
    const re = new RegExp(`\\b${escapeRegExp(n)}\\b`, "i");
    if (re.test(line)) allocated.push(n);
  }
  if (allocated.length) return [...new Set(allocated)];

  const against = line.match(/\bagainst\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);
  if (against?.[1]) return [against[1].trim()];

  const charged = line.match(
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:is\s+)?(?:charged|accused)\b/,
  );
  if (charged?.[1]) return [charged[1].trim()];

  return [];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWordingKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Truncated / incomplete wording must never count as complete. */
export function isTruncatedOrIncompleteWording(raw: string | null | undefined): boolean {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (/\.\.\.$|…$/.test(t)) return true;
  if (/\b(?:truncated|incomplete)\b/i.test(t)) return true;
  // Mid-word cut: ends with a short lowercase fragment after substantial text
  if (t.length >= 24 && /\b[a-z]{1,2}$/.test(t) && !/[.!?)]$/.test(t)) return true;
  // Cut mid-sentence without terminal punctuation when long
  if (t.length >= 40 && /,\s*$/.test(t)) return true;
  return false;
}

/**
 * Particulars must be genuine and distinct — a long offence line is never its own particulars.
 */
export function hasDistinctParticulars(
  offence: string | null | undefined,
  particulars: string | null | undefined,
): boolean {
  const o = (offence ?? "").replace(/\s+/g, " ").trim();
  const p = (particulars ?? "").replace(/\s+/g, " ").trim();
  if (!p || p.length < 12) return false;
  if (isTruncatedOrIncompleteWording(p)) return false;
  const oKey = normalizeWordingKey(o);
  const pKey = normalizeWordingKey(p);
  if (!pKey) return false;
  if (pKey === oKey) return false;
  // Offence line pasted as particulars (subset / identical after strip)
  if (oKey && (pKey === oKey || (oKey.length > 20 && pKey === oKey))) return false;
  return true;
}

/**
 * Genuinely complete charge wording for confirmation:
 * statement of offence, distinct particulars, count, defendant allocation,
 * operative source, and consistent non-pending status.
 */
export function hasCompleteChargeConfirmationRequirements(input: {
  status: string;
  offence?: string | null;
  particulars?: string | null;
  count?: number | null;
  defendants?: string[] | null;
  documentRole?: ChargeDocumentRole | null;
  hasChargeSheet?: boolean;
}): boolean {
  const status = (input.status || "pending").toLowerCase().replace(/\s+/g, "_");
  const pendingLike = status === "pending" || status === "" || status === "draft";
  if (pendingLike) return false;

  const offence = (input.offence ?? "").replace(/\s+/g, " ").trim();
  if (offence.length < 12 || isTruncatedOrIncompleteWording(offence)) return false;
  if (!hasDistinctParticulars(offence, input.particulars)) return false;

  const count = input.count;
  if (count == null || !Number.isFinite(count) || count < 1) return false;

  const defendants = (input.defendants ?? []).map((d) => d.trim()).filter(Boolean);
  if (!defendants.length) return false;

  const role = input.documentRole ?? "unknown";
  const operativeSource =
    role === "operative" ||
    role === "amended" ||
    Boolean(input.hasChargeSheet && role !== "superseded");
  if (!operativeSource) return false;

  const consistent =
    status === "proceeding" ||
    status === "confirmed" ||
    status === "active" ||
    status === "charged";
  return consistent;
}

/**
 * Confirmation label: never report CONFIRMED when charges are still pending,
 * truncated, missing particulars/defendants/count, or lack an operative source.
 */
export function chargeConfirmationLabel(input: {
  status: string;
  extracted?: boolean;
  confidence?: number | null;
  hasChargeSheet?: boolean;
  offence?: string | null;
  particulars?: string | null;
  count?: number | null;
  defendants?: string[] | null;
  documentRole?: ChargeDocumentRole | null;
}): StructuredChargeView["confirmationLabel"] {
  const status = (input.status || "pending").toLowerCase().replace(/\s+/g, "_");
  const pendingLike = status === "pending" || status === "" || status === "draft";
  const offence = (input.offence ?? "").trim();

  if (pendingLike) {
    // Extracted pending stays pending even with high confidence / charge-sheet filename.
    if (input.extracted) return "pending";
    return offence.length >= 12 ? "unconfirmed" : "pending";
  }

  if (
    hasCompleteChargeConfirmationRequirements({
      status,
      offence: input.offence,
      particulars: input.particulars,
      count: input.count,
      defendants: input.defendants,
      documentRole: input.documentRole,
      hasChargeSheet: input.hasChargeSheet,
    })
  ) {
    // Extracted rows still need confidence + charge-sheet backing when role is only implied by hasChargeSheet.
    if (
      !input.extracted ||
      (input.confidence != null &&
        input.confidence >= 0.75 &&
        (input.documentRole === "operative" ||
          input.documentRole === "amended" ||
          input.hasChargeSheet))
    ) {
      return "confirmed";
    }
  }

  return "unconfirmed";
}

export function summarizeChargeConfirmations(
  charges: Array<{ confirmationLabel: StructuredChargeView["confirmationLabel"] }>,
): { confirmed: number; unconfirmed: number; pending: number } {
  let confirmed = 0;
  let unconfirmed = 0;
  let pending = 0;
  for (const c of charges) {
    if (c.confirmationLabel === "confirmed") confirmed += 1;
    else if (c.confirmationLabel === "pending") pending += 1;
    else unconfirmed += 1;
  }
  return { confirmed, unconfirmed, pending };
}

export function buildStructuredChargeView(input: {
  count?: number | null;
  offence: string;
  statute?: string | null;
  particulars?: string | null;
  location?: string | null;
  status?: string | null;
  defendants?: string[];
  documentRole?: ChargeDocumentRole;
  sourceDocumentTitle?: string | null;
  sourceDocumentType?: string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
  pageIdentityKnown?: boolean;
  confidence?: number | null;
  extracted?: boolean;
  hasChargeSheet?: boolean;
  countFallbackIndex?: number;
}): StructuredChargeView {
  const offence = (input.offence || "").replace(/\s+/g, " ").trim();
  // Never substitute a long offence line as its own particulars.
  const particularsRaw = input.particulars?.replace(/\s+/g, " ").trim() || null;
  const particulars =
    particularsRaw && hasDistinctParticulars(offence, particularsRaw) ? particularsRaw : particularsRaw;
  // If particulars equal the offence, drop them so confirmation cannot treat them as complete.
  const safeParticulars =
    particulars && normalizeWordingKey(particulars) !== normalizeWordingKey(offence)
      ? particulars
      : null;
  const status = (input.status || "pending").toLowerCase().replace(/\s+/g, "_");
  const count =
    input.count != null && input.count > 0
      ? input.count
      : parseCountNumber(offence, input.countFallbackIndex ?? 0);
  const defendants = input.defendants ?? [];
  const documentRole = input.documentRole ?? "unknown";
  const pageIdentityKnown = input.pageIdentityKnown !== false;
  return {
    count,
    offence,
    statute: input.statute ?? null,
    particulars: safeParticulars,
    location: sanitizeChargeLocation(input.location),
    status,
    defendants,
    documentRole,
    sourceDocumentTitle: input.sourceDocumentTitle ?? null,
    sourceDocumentType: input.sourceDocumentType ?? null,
    // Unknown page identity may never carry a page ref on any charge surface.
    sourcePage: pageIdentityKnown ? (input.sourcePage ?? null) : null,
    compiledPage: pageIdentityKnown ? (input.compiledPage ?? null) : null,
    pageIdentityKnown,
    confidence: input.confidence ?? null,
    extracted: Boolean(input.extracted),
    confirmationLabel: chargeConfirmationLabel({
      status,
      extracted: input.extracted,
      confidence: input.confidence,
      hasChargeSheet: input.hasChargeSheet,
      offence,
      particulars: safeParticulars,
      count,
      defendants,
      documentRole,
    }),
  };
}
