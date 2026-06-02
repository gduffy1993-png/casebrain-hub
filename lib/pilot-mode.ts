/**
 * Criminal defence solicitor pilot — UI routing and caseload visibility.
 * Enable with NEXT_PUBLIC_CRIMINAL_PILOT_MODE=true (or 1/yes/on).
 */

export const CRIMINAL_PILOT_NAV_HREFS = [
  "/court-today",
  "/cases",
  "/upload",
  "/search",
  "/settings",
] as const;

export function isCriminalPilotMode(): boolean {
  return /^(1|true|yes|on)$/i.test((process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE ?? "").trim());
}

export function getAdminUserIds(): string[] {
  const id = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.trim();
  return id ? [id] : [];
}

export function isInternalAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getAdminUserIds().includes(userId);
}

/** Eval / stress-pack clutter hidden for pilot users; admin retains full nav. */
export function shouldShowInternalDevTools(userId?: string | null): boolean {
  if (!isCriminalPilotMode()) return true;
  return isInternalAdminUser(userId);
}

/** Fixed Court Today diary anchor for non-admin pilot (local calendar: 1 June 2026). */
export const PILOT_COURT_TODAY_ANCHOR = new Date(2026, 5, 1);

/** Non-admin pilot Court Today uses a stable demo “today” instead of the real clock. */
export function shouldUsePilotCourtTodayAnchor(userId?: string | null): boolean {
  return isCriminalPilotMode() && !shouldShowInternalDevTools(userId);
}

export function getPilotCourtTodayNow(userId?: string | null): Date {
  if (shouldUsePilotCourtTodayAnchor(userId)) return PILOT_COURT_TODAY_ANCHOR;
  return new Date();
}

export function formatPilotCourtTodayHeader(now: Date): string {
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const EVAL_STRESS_CASE_TITLE_RE =
  /\b(CB-AA2?|CB-Z|CB-GOLD|CB-TRAP|CB-MESSY|CB-REAL|CB-K-|NS-CPS(?:-\d+)?|PACK\s*(?:AA|[A-Z]{1,2})\b|GOLDEN\s+SWEEP|EVAL\s+PACK|stress\s+pack|eval\s+case)\b/i;

const GENERIC_DEV_CASE_TITLE_RE = /^case\s*\d+\s*$/i;

/** Real solicitor pilot demo matters — always visible to non-admin pilot users. */
const PILOT_DEMO_MATTER_ALLOWLIST_RES = [
  /\bR\s*v\.?\s*Marcus\s+Vale\b/i,
  /\bR\s*v\.?\s*Kian\s+Doyle\b/i,
  /\bR\s*v\.?\s*Leon\s+Marsh\b/i,
] as const;

export function isPilotDemoAllowlistMatter(title: string | null | undefined): boolean {
  const t = title?.trim() ?? "";
  if (!t) return false;
  return PILOT_DEMO_MATTER_ALLOWLIST_RES.some((re) => re.test(t));
}

/** Internal date-control / QA matters hidden from non-admin pilot users (display-only). */
export function isInternalPilotTestCaseTitle(title: string | null | undefined): boolean {
  if (isPilotDemoAllowlistMatter(title)) return false;
  const t = title?.trim() ?? "";
  if (!t) return false;
  if (/date-control/i.test(t)) return true;
  if (/date control/i.test(t)) return true;
  if (/\btest\b/i.test(t)) return true;
  if (/\binternal\b/i.test(t)) return true;
  return false;
}

export type PilotCaseFilterRow = {
  title?: string | null;
  summary?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  defendant_name?: string | null;
  alleged_offence?: string | null;
  offence_override?: string | null;
  offence_label?: string | null;
  charge_offences?: string[] | null;
  court_name?: string | null;
  court_type?: string | null;
  next_hearing_date?: string | null;
  practice_area?: string | null;
};

export function isEvalOrStressTestCase(row: {
  title?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
}): boolean {
  if (row.eval_pack_id?.trim()) return true;
  if (row.eval_pack_name?.trim()) return true;
  const title = row.title?.trim() ?? "";
  return title.length > 0 && EVAL_STRESS_CASE_TITLE_RE.test(title);
}

export function isGenericDevCaseTitle(title: string | null | undefined): boolean {
  const t = (title ?? "").trim();
  if (!t) return true;
  if (GENERIC_DEV_CASE_TITLE_RE.test(t)) return true;
  if (/^new case\s*\d*$/i.test(t)) return true;
  if (/^untitled\b/i.test(t)) return true;
  return false;
}

function isAwaitingSummaryOnly(summary: string | null | undefined): boolean {
  const s = (summary ?? "").trim();
  return !s || /^awaiting summary\.?$/i.test(s);
}

function resolveOffenceLabel(row: PilotCaseFilterRow): string {
  const override = row.offence_override?.trim();
  if (override) return override;
  const alleged = row.alleged_offence?.trim();
  if (alleged) return alleged;
  const apiLabel = row.offence_label?.trim();
  if (apiLabel && apiLabel !== "—") return apiLabel;
  const charges = (row.charge_offences ?? []).map((o) => o?.trim()).filter(Boolean) as string[];
  return charges[0] ?? "";
}

function hasMeaningfulOffenceLabel(label: string): boolean {
  if (!label || label === "—") return false;
  if (/^unknown/i.test(label)) return false;
  if (/add charge sheet/i.test(label)) return false;
  if (/not safely extracted/i.test(label)) return false;
  return label.length >= 3;
}

function hasMeaningfulDefendant(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  if (n.length < 2) return false;
  if (/^defendant$/i.test(n)) return false;
  if (/not safely extracted/i.test(n)) return false;
  if (/^unknown/i.test(n)) return false;
  return /[A-Za-z]{2,}/.test(n);
}

function hasMeaningfulCourtInfo(row: PilotCaseFilterRow): boolean {
  const court = (row.court_name ?? row.court_type ?? "").trim();
  if (court.length >= 3 && !/not safely extracted/i.test(court)) return true;
  return !!row.next_hearing_date?.trim();
}

function hasDocumentDerivedTitle(title: string): boolean {
  const t = title.trim();
  if (!t || isGenericDevCaseTitle(t)) return false;
  if (/\bR\s*v\.?\s+[A-Za-z]/i.test(t)) return true;
  if (/\b(section\s*)?(?:s\.?\s*)?\d{1,2}\b/i.test(t) && /\b(oapa|gbh|abh|theft|fraud|robbery|burglary|assault)\b/i.test(t)) {
    return true;
  }
  if (/\b(GBH|ABH|OAPA|Crown Court|Magistrates)\b/i.test(t)) return true;
  if (/NS\/\d{4}\/\d+/i.test(t)) return true;
  return t.length >= 12 && !/^case\b/i.test(t);
}

/** Display-only: matter has real criminal metadata suitable for a pilot demo. */
export function isPilotReadyCase(row: PilotCaseFilterRow): boolean {
  if (isEvalOrStressTestCase(row)) return false;
  if (isInternalPilotTestCaseTitle(row.title)) return false;
  if (isGenericDevCaseTitle(row.title)) return false;

  const title = row.title?.trim() ?? "";
  const offence = resolveOffenceLabel(row);

  const hasUsefulMetadata =
    hasMeaningfulDefendant(row.defendant_name) ||
    hasMeaningfulOffenceLabel(offence) ||
    hasMeaningfulCourtInfo(row) ||
    hasDocumentDerivedTitle(title);

  if (!hasUsefulMetadata) return false;

  if (isAwaitingSummaryOnly(row.summary) && isGenericDevCaseTitle(title)) return false;

  return true;
}

/** Court Today / dashboard — hide eval clutter only. */
export function filterPilotVisibleCases<
  T extends { title?: string | null; eval_pack_id?: string | null; eval_pack_name?: string | null },
>(cases: T[]): T[] {
  if (!isCriminalPilotMode()) return cases;
  return cases.filter((c) => !isEvalOrStressTestCase(c));
}

/** Cases page — pilot users see only demo-ready matters; admin retains full list. */
export function filterCasesForPilotUser<T extends PilotCaseFilterRow>(
  cases: T[],
  userId?: string | null,
): T[] {
  if (!isCriminalPilotMode()) return cases;
  if (shouldShowInternalDevTools(userId)) return cases;
  return cases.filter(isPilotReadyCase);
}

/** Court Today / dashboard list — same pilot-ready filter for non-admin users. */
export function filterCourtTodayCasesForPilotUser<
  T extends PilotCaseFilterRow,
>(cases: T[], userId?: string | null): T[] {
  if (!isCriminalPilotMode()) return cases.filter((c) => !isEvalOrStressTestCase(c));
  if (shouldShowInternalDevTools(userId)) return cases.filter((c) => !isEvalOrStressTestCase(c));
  return cases.filter(isPilotReadyCase);
}

export function getPostLoginPath(): string {
  return isCriminalPilotMode() ? "/court-today" : "/dashboard";
}

/** Non-admin pilot demo: uploads hidden in UI only (backend unchanged). */
export function isPilotDemoUploadDisabled(userId?: string | null): boolean {
  return isCriminalPilotMode() && !isInternalAdminUser(userId);
}

/** Non-admin pilot demo: hide Disclosure Chase mark chased/received (local state UI only). */
export function isPilotDemoChaseActionsDisabled(userId?: string | null): boolean {
  return isPilotDemoUploadDisabled(userId);
}

export const PILOT_DEMO_UPLOAD_NOTICE =
  "Pilot demo mode — uploads are disabled for this session.";

const LEGACY_DISCLOSURE_CHASE_PREFIX = "casebrain:disclosure-chase:";

/** Isolated chase status storage for pilot demo (avoids stale dev localStorage). */
export function pilotDisclosureChaseStorageKey(caseId: string): string {
  return `casebrain:pilot-demo-chase:v1:${caseId}`;
}

export function legacyDisclosureChaseStorageKey(caseId: string): string {
  return `${LEGACY_DISCLOSURE_CHASE_PREFIX}${caseId}`;
}

/** Drop old chase keys when starting a pilot demo session. */
export function clearLegacyDisclosureChaseStorage(caseId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(legacyDisclosureChaseStorageKey(caseId));
  } catch {
    /* ignore */
  }
}
