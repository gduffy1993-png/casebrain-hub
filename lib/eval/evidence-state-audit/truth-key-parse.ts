import type {
  EvidenceStateTruthKey,
  SimulatorV2TruthKey,
  TruthEvidenceState,
  TruthKeyEvidenceItem,
} from "./types";

function isItemListTruthKey(raw: Record<string, unknown>): boolean {
  return Array.isArray(raw.evidenceItems);
}

function asTruthState(value: string): TruthEvidenceState {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_") as TruthEvidenceState;
  const allowed: TruthEvidenceState[] = [
    "served",
    "referred_only",
    "missing",
    "incomplete",
    "not_safely_confirmed",
    "inferred_only",
    "other_defendant_only",
  ];
  if (!allowed.includes(normalized)) {
    throw new Error(`Unknown truth evidence state: ${value}`);
  }
  return normalized;
}

function itemFromLabel(label: string, state: TruthEvidenceState): TruthKeyEvidenceItem {
  return {
    evidence_item: label,
    correct_evidence_state: state,
    chase_needed: state !== "served",
    safe_to_rely_on: state === "served",
  };
}

export function convertSimulatorV2ToItemList(raw: SimulatorV2TruthKey): EvidenceStateTruthKey {
  const items: TruthKeyEvidenceItem[] = [];
  for (const label of raw.servedEvidence ?? []) {
    items.push(itemFromLabel(label, "served"));
  }
  for (const label of raw.referredOnlyEvidence ?? []) {
    items.push(itemFromLabel(label, "referred_only"));
  }
  for (const label of raw.missingEvidence ?? []) {
    items.push(itemFromLabel(label, "missing"));
  }
  for (const label of raw.uncertainEvidence ?? []) {
    items.push(itemFromLabel(label, "not_safely_confirmed"));
  }

  return {
    caseId: raw.caseId,
    title: raw.title,
    offenceFamily: raw.offenceFamily,
    evidenceItems: items,
    expectedChaseItems: raw.expectedChaseItems,
    mustNotSayGlobal: raw.mustNotSayExpected,
    blockingFailPatterns: raw.blockingFailPatterns,
  };
}

export function parseTruthKeyJson(raw: unknown): EvidenceStateTruthKey {
  if (!raw || typeof raw !== "object") {
    throw new Error("Truth key must be a JSON object");
  }
  const obj = raw as Record<string, unknown>;

  if (isItemListTruthKey(obj)) {
    const evidenceItems = (obj.evidenceItems as unknown[]).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        evidence_item: String(item.evidence_item ?? ""),
        evidence_type: item.evidence_type ? String(item.evidence_type) : undefined,
        correct_evidence_state: asTruthState(String(item.correct_evidence_state ?? "")),
        source_page_anchor: item.source_page_anchor ? String(item.source_page_anchor) : undefined,
        defendant_relevance: item.defendant_relevance ? String(item.defendant_relevance) : undefined,
        chase_needed: typeof item.chase_needed === "boolean" ? item.chase_needed : undefined,
        safe_to_rely_on: typeof item.safe_to_rely_on === "boolean" ? item.safe_to_rely_on : undefined,
        must_not_say: Array.isArray(item.must_not_say)
          ? item.must_not_say.map(String)
          : undefined,
      } satisfies TruthKeyEvidenceItem;
    });

    return {
      caseId: String(obj.caseId ?? obj.bundleId ?? "unknown"),
      title: obj.title ? String(obj.title) : undefined,
      offenceFamily: obj.offenceFamily ? String(obj.offenceFamily) : undefined,
      offenceWording: obj.offenceWording ? String(obj.offenceWording) : undefined,
      profile: obj.profile ? String(obj.profile) : undefined,
      bundleStatus: obj.bundleStatus ? String(obj.bundleStatus) : undefined,
      evidenceItems,
      expectedChaseItems: Array.isArray(obj.expectedChaseItems)
        ? obj.expectedChaseItems.map(String)
        : undefined,
      expectedSendability: obj.expectedSendability ? String(obj.expectedSendability) : undefined,
      mustNotSayGlobal: Array.isArray(obj.mustNotSayGlobal)
        ? obj.mustNotSayGlobal.map(String)
        : Array.isArray(obj.mustNotSayExpected)
          ? (obj.mustNotSayExpected as unknown[]).map(String)
          : undefined,
      blockingFailPatterns: Array.isArray(obj.blockingFailPatterns)
        ? obj.blockingFailPatterns.map(String)
        : undefined,
    };
  }

  return convertSimulatorV2ToItemList(obj as SimulatorV2TruthKey);
}
