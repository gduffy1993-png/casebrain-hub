import { buildTrustFeedbackRecord } from "./build-trust-feedback-record";
import {
  trustFeedbackRecordContainsForbiddenContent,
  sanitizeTrustFeedbackContextLabel,
  sanitizeTrustFeedbackNote,
  sanitizeTrustFeedbackSnippet,
} from "./trust-feedback-sanitize";
import type {
  BuildTrustFeedbackInput,
  TrustFeedbackKind,
  TrustFeedbackRecord,
  TrustFeedbackSeverity,
  TrustFeedbackTab,
} from "./trust-feedback-types";
import { TRUST_FEEDBACK_KINDS } from "./trust-feedback-types";
import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

const TABS: ReadonlySet<TrustFeedbackTab> = new Set([
  "today",
  "chase",
  "summary",
  "five_answers",
  "hearing_mode",
  "export_pack",
  "evidence_trace",
  "decision_board",
  "advice_change_radar",
]);

const KINDS: ReadonlySet<TrustFeedbackKind> = new Set([
  ...TRUST_FEEDBACK_KINDS.map((k) => k.value),
  "missing_evidence",
  "overstated",
  "needs_rewrite",
  "good_for_court",
  "good_for_cps_chase",
  "good_for_client_explanation",
]);

const SEVERITIES: ReadonlySet<TrustFeedbackSeverity> = new Set(["polish", "warning", "blocking"]);

const SOURCE_STATES: ReadonlySet<SourceStateKind> = new Set([
  "served",
  "referred_only",
  "missing",
  "not_safely_confirmed",
  "provisional",
  "needs_review",
]);

const SENDABILITY: ReadonlySet<SendabilityLevel> = new Set([
  "safe_to_send",
  "needs_solicitor_review",
  "blocked",
  "provisional_check_source",
]);

export type TrustFeedbackPostBody = {
  tab?: unknown;
  feedbackKind?: unknown;
  lineSnippet?: unknown;
  contextLabel?: unknown;
  sourceState?: unknown;
  sendability?: unknown;
  note?: unknown;
  timestamp?: unknown;
  outputVersion?: unknown;
  section?: unknown;
  severity?: unknown;
  exportId?: unknown;
  exportType?: unknown;
};

function parseOptionalSourceState(raw: unknown): SourceStateKind | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !SOURCE_STATES.has(raw as SourceStateKind)) return null;
  return raw as SourceStateKind;
}

function parseOptionalSendability(raw: unknown): SendabilityLevel | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !SENDABILITY.has(raw as SendabilityLevel)) return null;
  return raw as SendabilityLevel;
}

function parseOptionalSeverity(raw: unknown): TrustFeedbackSeverity | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !SEVERITIES.has(raw as TrustFeedbackSeverity)) return null;
  return raw as TrustFeedbackSeverity;
}

export function validateTrustFeedbackPostBody(
  body: TrustFeedbackPostBody,
  caseId: string,
): { ok: true; input: BuildTrustFeedbackInput } | { ok: false; error: string } {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) {
    return { ok: false, error: "caseId required" };
  }

  const tab = body.tab;
  if (typeof tab !== "string" || !TABS.has(tab as TrustFeedbackTab)) {
    return { ok: false, error: "Invalid tab" };
  }

  const feedbackKind = body.feedbackKind;
  if (typeof feedbackKind !== "string" || !KINDS.has(feedbackKind as TrustFeedbackKind)) {
    return { ok: false, error: "Invalid feedback kind" };
  }

  for (const field of ["note", "lineSnippet", "contextLabel", "section", "exportId", "exportType"] as const) {
    const val = body[field];
    if (val !== undefined && val !== null && typeof val !== "string") {
      return { ok: false, error: `${field} must be a string` };
    }
  }

  const note = sanitizeTrustFeedbackNote(typeof body.note === "string" ? body.note : null);
  const lineSnippet = sanitizeTrustFeedbackSnippet(
    typeof body.lineSnippet === "string" ? body.lineSnippet : null,
  );
  const contextLabel = sanitizeTrustFeedbackContextLabel(
    typeof body.contextLabel === "string" ? body.contextLabel : null,
  );
  const section =
    typeof body.section === "string" ? body.section.trim().slice(0, 120) || null : null;
  const exportId =
    typeof body.exportId === "string" ? body.exportId.trim().slice(0, 80) || null : null;
  const exportType =
    typeof body.exportType === "string" ? body.exportType.trim().slice(0, 64) || null : null;

  if (typeof body.note === "string" && body.note.trim() && note === null) {
    return { ok: false, error: "Note rejected — disallowed content" };
  }
  if (typeof body.lineSnippet === "string" && body.lineSnippet.trim() && lineSnippet === null) {
    return { ok: false, error: "Line snippet rejected — disallowed content" };
  }
  if (typeof body.contextLabel === "string" && body.contextLabel.trim() && contextLabel === null) {
    return { ok: false, error: "Context label rejected — disallowed content" };
  }

  const sourceState = parseOptionalSourceState(body.sourceState);
  if (body.sourceState !== undefined && body.sourceState !== null && body.sourceState !== "" && !sourceState) {
    return { ok: false, error: "Invalid source state" };
  }

  const sendability = parseOptionalSendability(body.sendability);
  if (body.sendability !== undefined && body.sendability !== null && body.sendability !== "" && !sendability) {
    return { ok: false, error: "Invalid sendability" };
  }

  const severity = parseOptionalSeverity(body.severity);

  const input: BuildTrustFeedbackInput = {
    caseId: trimmedCaseId,
    tab: tab as TrustFeedbackTab,
    feedbackKind: feedbackKind as TrustFeedbackKind,
    lineSnippet,
    contextLabel,
    sourceState,
    sendability,
    note,
    timestamp: typeof body.timestamp === "string" ? body.timestamp : undefined,
    outputVersion: typeof body.outputVersion === "string" ? body.outputVersion.slice(0, 64) : undefined,
    section,
    severity: severity ?? undefined,
    exportId,
    exportType,
  };

  const record = buildTrustFeedbackRecord(input);
  if (trustFeedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    return { ok: false, error: "Feedback rejected — forbidden content pattern" };
  }

  return { ok: true, input };
}

export type TrustFeedbackRow = {
  id: string;
  case_id: string;
  org_id: string;
  user_id: string;
  tab: TrustFeedbackTab;
  feedback_kind: TrustFeedbackKind;
  line_snippet: string | null;
  context_label: string | null;
  source_state: SourceStateKind | null;
  sendability: SendabilityLevel | null;
  note: string | null;
  output_version: string | null;
  created_at: string;
  severity: TrustFeedbackSeverity | null;
  section: string | null;
  export_id: string | null;
  export_type: string | null;
};

export function mapTrustFeedbackRowToRecord(row: TrustFeedbackRow): TrustFeedbackRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    tab: row.tab,
    feedbackKind: row.feedback_kind,
    lineSnippet: row.line_snippet,
    contextLabel: row.context_label,
    sourceState: row.source_state,
    sendability: row.sendability,
    note: row.note,
    timestamp: row.created_at,
    outputVersion: row.output_version ?? "unknown",
    section: row.section ?? null,
    severity: row.severity ?? null,
    exportId: row.export_id ?? null,
    exportType: row.export_type ?? null,
  };
}
