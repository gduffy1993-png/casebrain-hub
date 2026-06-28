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
  TrustFeedbackTab,
} from "./trust-feedback-types";
import { TRUST_FEEDBACK_KINDS } from "./trust-feedback-types";
import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

const TABS: ReadonlySet<TrustFeedbackTab> = new Set(["today", "chase", "summary"]);

const KINDS: ReadonlySet<TrustFeedbackKind> = new Set(TRUST_FEEDBACK_KINDS.map((k) => k.value));

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

  for (const field of ["note", "lineSnippet", "contextLabel"] as const) {
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
  };
}
