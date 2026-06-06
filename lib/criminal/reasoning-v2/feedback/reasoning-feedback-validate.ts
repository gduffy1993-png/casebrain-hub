import { buildReasoningFeedbackRecord } from "./build-reasoning-feedback-record";
import {
  feedbackRecordContainsForbiddenContent,
  sanitizeReasoningFeedbackNote,
} from "./reasoning-feedback-sanitize";
import type {
  BuildReasoningFeedbackInput,
  ReasoningFeedbackOption,
  ReasoningFeedbackRecord,
  ReasoningFeedbackSurface,
} from "./reasoning-feedback-types";
import { REASONING_FEEDBACK_OPTIONS } from "./reasoning-feedback-types";

const SURFACES: ReadonlySet<ReasoningFeedbackSurface> = new Set([
  "control-room-reasoning",
  "war-room-reasoning",
]);

const OPTIONS: ReadonlySet<ReasoningFeedbackOption> = new Set(
  REASONING_FEEDBACK_OPTIONS.map((o) => o.value),
);

const ROUTE_LABEL_FORBIDDEN = [
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json|docx?)/i,
  /\bpp-[a-z0-9-]+\b/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
] as const;

export type ReasoningFeedbackPostBody = {
  surface?: unknown;
  feedbackOption?: unknown;
  note?: unknown;
  routeLabel?: unknown;
  humanReviewRequired?: unknown;
  timestamp?: unknown;
  appVersion?: unknown;
};

export function sanitizeReasoningFeedbackRouteLabel(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const label = trimmed.slice(0, 240);
  for (const re of ROUTE_LABEL_FORBIDDEN) {
    if (re.test(label)) return null;
  }
  return label;
}

export function validateReasoningFeedbackPostBody(
  body: ReasoningFeedbackPostBody,
  caseId: string,
): { ok: true; input: BuildReasoningFeedbackInput } | { ok: false; error: string } {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) {
    return { ok: false, error: "caseId required" };
  }

  const surface = body.surface;
  if (typeof surface !== "string" || !SURFACES.has(surface as ReasoningFeedbackSurface)) {
    return { ok: false, error: "Invalid surface" };
  }

  const feedbackOption = body.feedbackOption;
  if (
    typeof feedbackOption !== "string" ||
    !OPTIONS.has(feedbackOption as ReasoningFeedbackOption)
  ) {
    return { ok: false, error: "Invalid feedback option" };
  }

  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return { ok: false, error: "note must be a string" };
  }

  if (body.routeLabel !== undefined && body.routeLabel !== null && typeof body.routeLabel !== "string") {
    return { ok: false, error: "routeLabel must be a string" };
  }

  const note = sanitizeReasoningFeedbackNote(
    typeof body.note === "string" ? body.note : null,
  );
  const routeLabel = sanitizeReasoningFeedbackRouteLabel(
    typeof body.routeLabel === "string" ? body.routeLabel : null,
  );

  if (typeof body.note === "string" && body.note.trim() && note === null) {
    return { ok: false, error: "Note rejected — disallowed content" };
  }

  if (typeof body.routeLabel === "string" && body.routeLabel.trim() && routeLabel === null) {
    return { ok: false, error: "Route label rejected — disallowed content" };
  }

  const input: BuildReasoningFeedbackInput = {
    caseId: trimmedCaseId,
    surface: surface as ReasoningFeedbackSurface,
    feedbackOption: feedbackOption as ReasoningFeedbackOption,
    note,
    routeLabel,
    humanReviewRequired: Boolean(body.humanReviewRequired),
    timestamp: typeof body.timestamp === "string" ? body.timestamp : undefined,
    appVersion: typeof body.appVersion === "string" ? body.appVersion.slice(0, 64) : undefined,
  };

  const record = buildReasoningFeedbackRecord(input);
  if (feedbackRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    return { ok: false, error: "Feedback rejected — forbidden content pattern" };
  }

  return { ok: true, input };
}

export type ReasoningFeedbackRow = {
  id: string;
  case_id: string;
  org_id: string;
  user_id: string;
  surface: ReasoningFeedbackSurface;
  feedback_option: ReasoningFeedbackOption;
  note: string | null;
  route_label: string | null;
  human_review_required: boolean;
  app_version: string | null;
  created_at: string;
};

export function mapReasoningFeedbackRowToRecord(row: ReasoningFeedbackRow): ReasoningFeedbackRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    surface: row.surface,
    feedbackOption: row.feedback_option,
    note: row.note,
    routeLabel: row.route_label,
    humanReviewRequired: row.human_review_required,
    timestamp: row.created_at,
    appVersion: row.app_version ?? "unknown",
  };
}
