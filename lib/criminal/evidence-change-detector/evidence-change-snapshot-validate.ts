import {
  lintEvidenceChangeOutput,
  sanitizeEvidenceChangeLabel,
  snapshotBlobContainsForbiddenContent,
} from "./evidence-change-sanitize";
import type {
  EvidenceChangeSnapshot,
  EvidenceChangeSourceState,
} from "./evidence-change-types";
import type { PreHearingReadinessLevel } from "@/lib/criminal/pre-hearing-readiness/readiness-types";

const READINESS_LEVELS = new Set<PreHearingReadinessLevel>(["green", "amber", "red"]);
const MAX_LABELS = 12;

export type EvidenceChangeSnapshotPostBody = {
  routeLabel?: unknown;
  readinessLevel?: unknown;
  humanReviewRequired?: unknown;
  missingMaterialLabels?: unknown;
  contradictionLabels?: unknown;
  proofPressureLabels?: unknown;
  disclosureChaseLabels?: unknown;
  doNotConcedeLabels?: unknown;
  clientInstructionLabels?: unknown;
  safeNextAction?: unknown;
  warRoomHearingLine?: unknown;
  timestamp?: unknown;
  sourceState?: unknown;
  appVersion?: unknown;
};

function sanitizeLabelArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const label = sanitizeEvidenceChangeLabel(item);
    if (label) out.push(label);
    if (out.length >= MAX_LABELS) break;
  }
  return out;
}

function rawLabelArrayRejected(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some(
    (item) => typeof item === "string" && item.trim() && !sanitizeEvidenceChangeLabel(item),
  );
}

function rawTextFieldRejected(raw: unknown): boolean {
  return typeof raw === "string" && raw.trim() !== "" && !sanitizeEvidenceChangeLabel(raw);
}

function parseSourceState(raw: unknown): EvidenceChangeSourceState | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const reason =
    typeof s.bundleAvailabilityReason === "string"
      ? sanitizeEvidenceChangeLabel(s.bundleAvailabilityReason)
      : "";
  if (!reason) return undefined;

  const marker =
    typeof s.matterUpdatedMarker === "string" && s.matterUpdatedMarker.trim()
      ? s.matterUpdatedMarker.trim()
      : null;

  return {
    documentCount: Math.max(0, Number(s.documentCount) || 0),
    combinedTextLength: Math.max(0, Number(s.combinedTextLength) || 0),
    sourceSnippetCount: Math.max(0, Number(s.sourceSnippetCount) || 0),
    bundleAvailabilityReason: reason.slice(0, 80),
    matterUpdatedMarker: marker,
  };
}

export function validateEvidenceChangeSnapshotPostBody(
  body: EvidenceChangeSnapshotPostBody,
  caseId: string,
): { ok: true; snapshot: EvidenceChangeSnapshot } | { ok: false; error: string } {
  const trimmedCaseId = caseId.trim();
  if (!trimmedCaseId) return { ok: false, error: "caseId required" };

  const routeLabel = sanitizeEvidenceChangeLabel(
    typeof body.routeLabel === "string" ? body.routeLabel : "",
  );
  if (!routeLabel) return { ok: false, error: "Invalid route label" };

  const readinessLevel = body.readinessLevel;
  if (
    typeof readinessLevel !== "string" ||
    !READINESS_LEVELS.has(readinessLevel as PreHearingReadinessLevel)
  ) {
    return { ok: false, error: "Invalid readiness level" };
  }

  const labelFields: Array<{ key: keyof EvidenceChangeSnapshotPostBody; name: string }> = [
    { key: "missingMaterialLabels", name: "missingMaterialLabels" },
    { key: "contradictionLabels", name: "contradictionLabels" },
    { key: "proofPressureLabels", name: "proofPressureLabels" },
    { key: "disclosureChaseLabels", name: "disclosureChaseLabels" },
    { key: "doNotConcedeLabels", name: "doNotConcedeLabels" },
    { key: "clientInstructionLabels", name: "clientInstructionLabels" },
  ];
  for (const { key, name } of labelFields) {
    if (rawLabelArrayRejected(body[key])) {
      return { ok: false, error: `${name} rejected — disallowed content` };
    }
  }

  if (rawTextFieldRejected(body.safeNextAction)) {
    return { ok: false, error: "safeNextAction rejected — disallowed content" };
  }
  if (rawTextFieldRejected(body.warRoomHearingLine)) {
    return { ok: false, error: "warRoomHearingLine rejected — disallowed content" };
  }

  if (body.sourceState !== undefined && body.sourceState !== null) {
    const rawBlob = JSON.stringify(body.sourceState);
    if (snapshotBlobContainsForbiddenContent(rawBlob)) {
      return { ok: false, error: "sourceState rejected — forbidden content pattern" };
    }
  }

  const snapshot: EvidenceChangeSnapshot = {
    routeLabel,
    readinessLevel: readinessLevel as PreHearingReadinessLevel,
    humanReviewRequired: Boolean(body.humanReviewRequired),
    missingMaterialLabels: sanitizeLabelArray(body.missingMaterialLabels),
    contradictionLabels: sanitizeLabelArray(body.contradictionLabels),
    proofPressureLabels: sanitizeLabelArray(body.proofPressureLabels),
    disclosureChaseLabels: sanitizeLabelArray(body.disclosureChaseLabels),
    doNotConcedeLabels: sanitizeLabelArray(body.doNotConcedeLabels),
    clientInstructionLabels: sanitizeLabelArray(body.clientInstructionLabels),
    safeNextAction: sanitizeEvidenceChangeLabel(
      typeof body.safeNextAction === "string" ? body.safeNextAction : "",
    ),
    warRoomHearingLine: sanitizeEvidenceChangeLabel(
      typeof body.warRoomHearingLine === "string" ? body.warRoomHearingLine : "",
    ),
    timestamp:
      typeof body.timestamp === "string" && body.timestamp.trim()
        ? body.timestamp.trim()
        : new Date().toISOString(),
    sourceState: parseSourceState(body.sourceState),
  };

  const blob = JSON.stringify(snapshot);
  if (snapshotBlobContainsForbiddenContent(blob) || lintEvidenceChangeOutput(blob).length) {
    return { ok: false, error: "Snapshot rejected — forbidden content pattern" };
  }

  return { ok: true, snapshot };
}

export type EvidenceChangeSnapshotRow = {
  id: string;
  case_id: string;
  org_id: string;
  saved_by: string;
  route_label: string;
  readiness_level: PreHearingReadinessLevel;
  human_review_required: boolean;
  missing_material_labels: string[];
  contradiction_labels: string[];
  proof_pressure_labels: string[];
  disclosure_chase_labels: string[];
  do_not_concede_labels: string[];
  client_instruction_labels: string[];
  safe_next_action: string | null;
  war_room_hearing_line: string | null;
  source_document_count: number | null;
  source_combined_text_length: number | null;
  source_snippet_count: number | null;
  source_bundle_availability_reason: string | null;
  source_matter_updated_marker: string | null;
  app_version: string | null;
  schema_version: string;
  created_at: string;
};

export function mapEvidenceChangeSnapshotRowToSnapshot(
  row: EvidenceChangeSnapshotRow,
): EvidenceChangeSnapshot {
  const sourceState: EvidenceChangeSourceState | undefined =
    row.source_document_count != null ||
    row.source_combined_text_length != null ||
    row.source_snippet_count != null ||
    row.source_bundle_availability_reason
      ? {
          documentCount: row.source_document_count ?? 0,
          combinedTextLength: row.source_combined_text_length ?? 0,
          sourceSnippetCount: row.source_snippet_count ?? 0,
          bundleAvailabilityReason: row.source_bundle_availability_reason ?? "papers_on_file",
          matterUpdatedMarker: row.source_matter_updated_marker,
        }
      : undefined;

  return {
    routeLabel: row.route_label,
    readinessLevel: row.readiness_level,
    humanReviewRequired: row.human_review_required,
    missingMaterialLabels: Array.isArray(row.missing_material_labels)
      ? row.missing_material_labels
      : [],
    contradictionLabels: Array.isArray(row.contradiction_labels) ? row.contradiction_labels : [],
    proofPressureLabels: Array.isArray(row.proof_pressure_labels) ? row.proof_pressure_labels : [],
    disclosureChaseLabels: Array.isArray(row.disclosure_chase_labels)
      ? row.disclosure_chase_labels
      : [],
    doNotConcedeLabels: Array.isArray(row.do_not_concede_labels) ? row.do_not_concede_labels : [],
    clientInstructionLabels: Array.isArray(row.client_instruction_labels)
      ? row.client_instruction_labels
      : [],
    safeNextAction: row.safe_next_action ?? "",
    warRoomHearingLine: row.war_room_hearing_line ?? "",
    timestamp: row.created_at,
    sourceState,
  };
}

export function snapshotToInsertPayload(
  snapshot: EvidenceChangeSnapshot,
  caseId: string,
  orgId: string,
  userId: string,
  appVersion?: string,
) {
  return {
    case_id: caseId,
    org_id: orgId,
    saved_by: userId,
    route_label: snapshot.routeLabel,
    readiness_level: snapshot.readinessLevel,
    human_review_required: snapshot.humanReviewRequired,
    missing_material_labels: snapshot.missingMaterialLabels,
    contradiction_labels: snapshot.contradictionLabels,
    proof_pressure_labels: snapshot.proofPressureLabels,
    disclosure_chase_labels: snapshot.disclosureChaseLabels,
    do_not_concede_labels: snapshot.doNotConcedeLabels,
    client_instruction_labels: snapshot.clientInstructionLabels,
    safe_next_action: snapshot.safeNextAction || null,
    war_room_hearing_line: snapshot.warRoomHearingLine || null,
    source_document_count: snapshot.sourceState?.documentCount ?? null,
    source_combined_text_length: snapshot.sourceState?.combinedTextLength ?? null,
    source_snippet_count: snapshot.sourceState?.sourceSnippetCount ?? null,
    source_bundle_availability_reason: snapshot.sourceState?.bundleAvailabilityReason ?? null,
    source_matter_updated_marker: snapshot.sourceState?.matterUpdatedMarker ?? null,
    app_version: appVersion ?? null,
    schema_version: "evidence-change-v2",
    created_at: snapshot.timestamp,
  };
}
